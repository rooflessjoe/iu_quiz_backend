const queries = require ("./queries");
const pool = require ("./pool");
const { verifyToken } = require("./auth");
const { UsersState,
    RoomsState,
    buildMsg,
    activateUser,
    userLeavesApp,
    getUser,
    getUsersInRoom,
    getAllActiveRooms,
    updateRoomAttribute,
    evaluateAnswer,
    getCategories } = require ("./websocketsFunc");

    //Variable for Message Function
    const ADMIN = "Admin";

    pool.connect().then(() => console.log('Datenverbindung erfolgreich!')).catch((err) => console.error('Fehler bei der Verbindung:', err.stack));

    function multiPlayerQuiz(io) {

    io.on('connection', socket => {


        console.log(`User ${socket.id} connected to Quiz App`)


        // Upon connection - only to user
        socket.emit('message', buildMsg(ADMIN, "Welcome to Quiz App!"))

        // sends a list of active Rooms to user
        socket.emit('roomList', {
            rooms: getAllActiveRooms(),
        });

        // sends a list of categories from the Database to frontend
        getCategories().then(categories => {
            socket.emit('listOfCategories', categories);
        }).catch(error => {
            console.log(error);
            socket.emit('listOfCategories', []);
        })

        // when user enters a room
        socket.on('enterRoom', async ({room, token}) => {
            try{
                const user = await addUserToRoom(socket, room, token);

                await userJoinsRoom(socket, user);
            }catch (error) {
                //if token fails emit 'failedToken' and disconnect user from websocket
                console.error('Token verification failed:', error);
                socket.emit('failedToken');
                socket.disconnect();
            }
        });

        // when user creates a room
        socket.on('createRoom', async ({token, questionCount, category, room, timerEnabled, timer}) => {
            try{
                const user = await addUserToRoom(socket, room, token)

                // sets timer to 'null' when timer isn't in use
                if (!timerEnabled){
                    timer = null;
                }

                // activates room with given parameters
                RoomsState.activateRoom(room, 0, questionCount, category, timerEnabled, timer, user.name);

                await userJoinsRoom(socket, user);
            }catch (error) {
                //if token fails emit 'failedToken' and disconnect user from websocket
                console.error('Token verification failed:', error);
                socket.emit('failedToken');
                socket.disconnect();
            }
        })

        //starts quiz
        socket.on('startQuiz', async () => {
            try {
                // sets gameState to active
                const gameState = 'active'

                // find user to find the room
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    new Error('Room not found for the user');
                }

                if (room.gameHost !== user.name) {
                    return
                }

                console.log(`Starting quiz in room: ${room.room}`);

                // gets questions from Database
                const result = await pool.query(queries.question, [room.category])
                const questions = result.rows;

                // increases current question for room
                const currentQuestionThisRound = room.currentQuestion + 1;

                //creates an update object and updates the room with new gameStatus and currentQuestion
                const updates = {
                    currentQuestion: currentQuestionThisRound,
                    gameStatus: gameState,
                };
                updateRoomAttribute(room.room, updates)

                // emits new Room list to all clients
                io.emit('roomList', {
                    rooms: getAllActiveRooms(),
                });

                // checks if question got loaded and sent question with timer to room
                if (questions.length > 0) {
                    console.log('timer:', room.timer, room.timerEnabled);
                    io.to(room.room).emit('question', {
                        currentQuestion: currentQuestionThisRound,
                        questionCount: room.questionCount,
                        timerEnabled: room.timerEnabled,
                        timerDuration: room.timer,
                        question_id: questions[0].question_id,
                        question: questions[0].question,
                        gameHost: room.gameHost
                    });
                } else {
                    console.log('No questions found for the category:', room.category);
                }
            } catch (err) {
                console.error('Fehler:', err.stack);
                throw err;
            }
        });

        socket.on('askForAnswers', async ({question_id}) =>{
            try{
                // find user to find the room
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }
                const room = user.room;
                if (!room) {
                    new Error('Room not found for the user');
                }

                // database request to get the Answers for the Question
                const result = await pool.query(queries.answer_list2, [question_id])
                const answers = result.rows;

                //if Answers found emit to room
                if(answers.length > 0){
                    io.to(room).emit('answers', answers)
                    console.log('Send')
                }else{
                    io.to(room).emit('message', buildMsg(ADMIN, 'Keine Antwort gefunden'))
                }
            }catch(err){
                socket.emit('message', buildMsg(ADMIN, 'Fehler beim Abruf'))
            }

        })

        socket.on('submitAnswer', async ({playerAnswer, question_id})=>{
            try{
                // find user to find the room
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    new Error('Room not found');
                }

                // updates user to set answered true
                UsersState.updateUserStatus(user.id, true)


                // checks the answer of the user
                const {correct, message} = await evaluateAnswer(playerAnswer, question_id);

                //checks if user is in playerAnswersArray and adds user if not
                if (!room.playerAnswersArray[user.name]){
                    room.playerAnswersArray[user.name] = [];
                }
                //adds users Answer to array
                room.playerAnswersArray[user.name].push(correct);

                // adds 10 points to score of user if answer is right
                if(correct){
                    UsersState.updateUserScore(user.id, 10)

                }
                // gets updated user object to get new Score to emit score and validated answer to room
                const updatedUser = getUser(socket.id)
                const score = updatedUser.score
                socket.emit('evaluatedAnswer', {correct, message, score})

            }catch(err){
                console.error('Fehler: ', err.stack)
                socket.emit('message', buildMsg(ADMIN, 'Fehler'))
            }
        })

        socket.on('nextQuestion', async()=>{
            try{
                // finds user to find room
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    new Error('Room not found');
                }

                // checks if all players have answered
                if(UsersState.haveAllUsersAnswered(room.room)){

                    // sets answered status for all players in room to false
                    const usersInRoom = UsersState.getUsersInRoom(room.room);
                    usersInRoom.forEach(u => UsersState.updateUserStatus(u.id, false));

                    //checks if current question is under max questions for room
                    if(room.currentQuestion < room.questionCount){
                        // increases currentQuestion by 1, updates room
                        const currentQuestionThisRound = room.currentQuestion + 1;
                        const updates = {
                            currentQuestion: currentQuestionThisRound
                        };
                        const updatedRoom = updateRoomAttribute(room.room, updates)

                        // gets new question from Database
                        const result = await pool.query(queries.question, [room.category])
                        const questions = result.rows;

                        // emits question to room
                        io.to(updatedRoom.room).emit('question',{
                            currentQuestion: currentQuestionThisRound,
                            questionCount: room.questionCount,
                            timerEnabled: room.timerEnabled,
                            timerDuration: room.timer,
                            question_id: questions[0].question_id,
                            question: questions[0].question
                        })

                    }else{
                        // if max amount of question is reached ends game
                        console.log('Game over')

                        // gets score from all players in room and emits them to room
                        const usersInRoom = getUsersInRoom(room.room)
                        const userScores = usersInRoom.map(u => ({
                            name: u.name,
                            score: u.score
                        }))
                        const gameAnswersArray = room.playerAnswersArray;

                        io.to(room.room).emit('quizOver', userScores, gameAnswersArray);
                    }
                }else {
                    // if not everyone has answered, ends here and waits for last person to answer
                    console.log('Noch nicht alle Nutzer haben geantwortet');
                }
            }catch(err){
                console.error('Fehler', err.stack)
                throw err
            }
        });

        socket.on('skipQuestion', async () => {
            try {
                // finds user to find room
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    new Error('Room not found');
                }
                if (user.name === room.gameHost){
                    // sets answered status for all players in room to false
                    const usersInRoom = UsersState.getUsersInRoom(room.room);
                    usersInRoom.forEach(u => UsersState.updateUserStatus(u.id, false));
                    //checks if current question is under max questions for room
                    if(room.currentQuestion < room.questionCount){
                        // increases currentQuestion by 1, updates room
                        const currentQuestionThisRound = room.currentQuestion + 1;
                        const updates = {
                            currentQuestion: currentQuestionThisRound
                        };
                        const updatedRoom = updateRoomAttribute(room.room, updates)

                        // gets new question from Database
                        const questions = await getQuestions(updatedRoom.category);

                        // emits question to room
                        io.to(updatedRoom.room).emit('question',{
                            currentQuestion: currentQuestionThisRound,
                            questionCount: room.questionCount,
                            timerEnabled: room.timerEnabled,
                            timerDuration: room.timer,
                            question_id: questions[0].question_id,
                            question: questions[0].question,
                        })

                    }else{
                        // if max amount of question is reached ends game
                        console.log('Game over')

                        // gets score from all players in room and emits them to room
                        const usersInRoom = getUsersInRoom(room.room)
                        const userScores = usersInRoom.map(u => ({
                            name: u.name,
                            score: u.score
                        }))
                        const gameAnswersArray = room.playerAnswersArray;

                        io.to(room.room).emit('quizOver', userScores, gameAnswersArray);
                    }
                }
            }catch(err){
                console.error('Fehler', err.stack)}
        });

        socket.on('leaveRoom', async () => {
            try {
                //find user
                const user = getUser(socket.id);
                if (!user) {
                    new Error('User not found');
                }

                await userLeavesRoom(user, socket);

            } catch (err) {
                console.error('Fehler', err.stack);
            }
        });

        socket.on('getQuestionCount', async ({category})=>{
            try {
                console.log(category);
                //const count = await getQuestionCountFromDB(category);
                const result = await pool.query(queries.question_count, [category]);
                socket.emit('questionCountForCategory', {count: result.rows[0].count});
            }catch (err){
                console.error('Fehler', err.stack)
            }
        })



        // When user disconnects - to all others
        socket.on('disconnect', async() => {
            //get user and execute function to leaveApp on disconnect
            const user = getUser(socket.id)
            userLeavesApp(socket.id)

            //if user exists
            if(user){
                await userLeavesRoom(user, socket)
            }
            console.log(`User ${socket.id} disconnected from Chat`)
        })

        // Listening for a message event
        socket.on('message', ({name, text}) => {
            // gets room
            const room = getUser(socket.id)?.room
            //if room exist sends message to room
            if(room){
                io.to(room).emit('message', buildMsg(name, text))
            }

        })

        // Listen for activity
        socket.on('activity', (name) => {
            // gets room
            const room = getUser(socket.id)?.room
            //if room exist sends activity notification to room
            if(room){
                socket.broadcast.to(room).emit('activity', name)
            }
        })
    })

    async function addUserToRoom(socket, room, token) {
        //checks if user is logged in
        const decoded = await verifyToken(token);
        console.log(decoded);
        console.log(`User ${decoded.username} authenticated and entering room: ${room}`);


        // Remove user from previous room
        const prevRoom = getUser(socket.id)?.room;
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${decoded.username} has left the room`));
        }

        // activate user in new room
        const user = activateUser(socket.id, decoded.username, room);

        //emit update list of users in Old room to the old room
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom),
            });
        }

        // Add user to new room
        socket.join(user.room);

        return user;
    }

    async function userJoinsRoom(socket, user){

        const room = RoomsState.getRoom(user.room);

        const host = room.gameHost;

        socket.emit('userJoinedRoom', {roomName: user.room, roomHost: host});

        // Message to user that he joined a room
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        // Message to users in room that user joined
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // updates list of users in new room
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room),
        });

        // updates List of active rooms for all users
        io.emit('roomList', {
            rooms: getAllActiveRooms(),
        });

    }

    async function userLeavesRoom(user, socket){
        // removes user from room
        const prevRoom = user.room;

        if (prevRoom) {
            // leaves room without disconnecting from socket
            socket.leave(prevRoom);

            UsersState.setUsers(
                UsersState.users.filter(u => u.id !== socket.id)
            );

            // emit message to room that user left
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            // update userList in room
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom),
            });

            // inform user he left room
            socket.emit('message', buildMsg(ADMIN, `You have left the room`));
            socket.emit('leftRoom')

            console.log(prevRoom)

            // checks if room is empty after user left
            if(getUsersInRoom(prevRoom)  < 1){
                console.log('Room Empty')
                // removes room from RoomState if empty
                RoomsState.setRooms(RoomsState.rooms.filter(r => r.room !== prevRoom));
            }else{
                // checks if use was host
                const prevRoomObject = RoomsState.getRoom(prevRoom);
                console.log(prevRoomObject);
                if(prevRoomObject.gameHost === user.name){
                    const usersInRoom = getUsersInRoom(prevRoom)
                    console.log('Room:', usersInRoom);
                    const firstUser = usersInRoom[0]
                    console.log(firstUser);
                    const newHost = {
                        gameHost: firstUser.name
                    }
                    const updatedRoom = updateRoomAttribute(prevRoom , newHost);
                    console.log('Udated Room', updatedRoom);
                    io.to(prevRoom).emit('newHost', {
                        gameHost: firstUser.name,
                        gameStatus: prevRoomObject.gameStatus,
                    })
                }
            }
            //emits new activeRoom list
            io.emit('roomList', {
                rooms: getAllActiveRooms(),
            });
        }
    }
}

module.exports = multiPlayerQuiz;