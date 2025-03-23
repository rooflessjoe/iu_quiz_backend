/**
 * Websockets-Modul für Multiplayer
 * @module Websockets
 * @requires module:Authentification-Middleware
 * @requires module:PostgreSQL-Middleware
 * @requires module:Websockets-Functions
*/

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

    /**
     * Function that handles Multiplayer Connections and Actions
     * @param {Object} io 
     * @namespace multiPlayerQuiz
     */
    function multiPlayerQuiz(io) {

        /**
         * Starts IO Connection
         * @name Connection
         * @namespace Connection
         * @memberof module:Websockets~multiPlayerQuiz
         * @inner
         */
    io.on('connection', socket => {


        console.log(`User ${socket.id} connected to Quiz App`)


        /**
         * Sends a welcome message to the user upon connection.
         * @function
         * @name EmitsWelcomeMessage
         * @param {Object} socket - The socket object representing the user's connection.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.emit('message', buildMsg(ADMIN, "Welcome to Quiz App!"))

        /**
         * Sends a list of active Rooms to user
         * @function
         * @name EmitsActiveRooms
         * @param {Object} socket - The socket object representing the user's connection.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.emit('roomList', {
            rooms: getAllActiveRooms(),
        });

        /**
         * Sends a list of categories from the Database to frontend
         * @function
         * @name EmitsCategories
         * @param {Object} socket - The socket object representing the user's connection.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        getCategories().then(categories => {
            socket.emit('listOfCategories', categories);
        }).catch(error => {
            console.log(error);
            socket.emit('listOfCategories', []);
        })

        /**
         * Handles the event when a user enters a room.
         * @function
         * @name UserEntersRoom
         * @param {Object} data - The data object containing room and token.
         * @param {string} data.room - The name of the room.
         * @param {string} data.token - The JWT token for user authentication.
         * @returns {Promise<void>} A promise that resolves when the user has entered the room and all updates are complete..
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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

        /**
         * Handles the event when a user creates a room.
         * @function
         * @name UserCreatesRoom
        * @param {Object} data - The data object containing room creation parameters.
        * @param {string} data.token - The JWT token for user authentication.
        * @param {number} data.questionCount - The total number of questions in the room.
        * @param {string} data.category - The category of the quiz.
        * @param {string} data.room - The name of the room.
        * @param {boolean} data.timerEnabled - Whether the timer is enabled.
        * @param {number|null} data.timer - The timer duration, or null if the timer is not enabled.
        * @param {boolean} data.privateRoomEnabled - Whether the room is private.
        * @param {string|null} data.privateRoomPassword - The password for the private room, or null if the room is not private.
        * @returns {Promise<void>} A promise that resolves when the room is created and the user has joined the room.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.on('createRoom', async ({token, questionCount, category, room, timerEnabled, timer, privateRoomEnabled, privateRoomPassword}) => {
            try{
                const user = await addUserToRoom(socket, room, token)

                // sets timer to 'null' when timer isn't in use
                if (!timerEnabled){
                    timer = null;
                }
                if (!privateRoomEnabled){
                    privateRoomPassword = null;
                }

                // activates room with given parameters
                RoomsState.activateRoom(room, 0, questionCount, category, timerEnabled, timer, user.name, privateRoomEnabled, privateRoomPassword);

                await userJoinsRoom(socket, user);
            }catch (error) {
                //if token fails emit 'failedToken' and disconnect user from websocket
                console.error('Token verification failed:', error);
                socket.emit('failedToken');
                socket.disconnect();
            }
        })

        /**
         * Handles the event when a quiz starts.
         * @function
         * @name StartsQuiz
         * @returns {Promise<void>} A promise that resolves when the quiz has started and all updates are complete.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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
                const result = await pool.query(global.queries.question, [room.category])
                const questions = result.rows;

                // increases current question for room
                const currentQuestionThisRound = room.currentQuestion + 1;

                //creates an update object and updates the room with new gameStatus and currentQuestion
                const updates = {
                    currentQuestion: currentQuestionThisRound,
                    gameStatus: gameState
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

        /**
         * Event listener for 'askForAnswers' socket event.
         * Fetches answers for a given question and emits them to the user's room.
         * @function
         * @name askForAnswers
         * @param {Object} data - The data object containing the question ID.
         * @param {number} data.question_id - The ID of the question to fetch answers for.
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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
                const result = await pool.query(global.queries.answer_list2, [question_id])
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

        /**
         * Event listener for 'submitAnswer' socket event.
         * Evaluates the player's answer, updates their status and score, and emits the result.
         * @function
         * @name submitAnswer
         * @param {Object} data - The data object containing the player's answer and question ID.
         * @param {string} data.playerAnswer - The answer provided by the player.
         * @param {number} data.question_id - The ID of the question being answered.
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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

        /**
         * Event listener for 'nextQuestion' socket event.
         * Advances to the next question if all players have answered, or ends the game if the maximum number of questions is reached.
         * @function
         * @name nextQuestion
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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
                        const result = await pool.query(global.queries.question, [room.category])
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

        /**
         * Event listener for 'skipQuestion' socket event.
         * Skips the current question if the user is the game host, and advances to the next question or ends the game if the maximum number of questions is reached.
         * @function
         * @name skipQuestion
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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

        /**
         * Event listener for 'leaveRoom' socket event.
         * Handles the user leaving the room.
         * @function
         * @name leaveRoom
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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

        /**
         * Event listener for 'getQuestionCount' socket event.
         * Retrieves the count of questions for a given category and emits it to the client.
         * @function
         * @name getQuestionCount
         * @param {Object} data - The data object containing the category.
         * @param {string} data.category - The category to get the question count for.
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.on('getQuestionCount', async ({category})=>{
            try {
                console.log(category);
                //const count = await getQuestionCountFromDB(category);
                const result = await pool.query(global.queries.question_count, [category]);
                socket.emit('questionCountForCategory', {count: result.rows[0].count});
            }catch (err){
                console.error('Fehler', err.stack)
            }
        })



        /**
         * Event listener for 'disconnect' socket event.
         * Handles user disconnection, executing necessary functions to leave the app and room.
         * @function
         * @name disconnect
         * @returns {Promise<void>}
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
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

        /**
         * Event listener for 'message' socket event.
         * Sends a message to the user's room.
         * @function
         * @name message
         * @param {Object} data - The data object containing the message details.
         * @param {string} data.name - The name of the user sending the message.
         * @param {string} data.text - The text of the message.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.on('message', ({name, text}) => {
            // gets room
            const room = getUser(socket.id)?.room
            //if room exist sends message to room
            if(room){
                io.to(room).emit('message', buildMsg(name, text))
            }

        })

        /**
         * Event listener for 'activity' socket event.
         * Sends an activity notification to the user's room.
         * @function
         * @name activity
         * @param {string} name - The name of the user performing the activity.
         * @memberof module:Websockets~multiPlayerQuiz~Connection
         * @inner
         */
        socket.on('activity', (name) => {
            // gets room
            const room = getUser(socket.id)?.room
            //if room exist sends activity notification to room
            if(room){
                socket.broadcast.to(room).emit('activity', name)
            }
        })
    })

/**
 * Adds a user to a specified room after verifying their token.
 * 
 * @param {Object} socket - The socket object representing the user's connection.
 * @param {string} room - The name of the room to add the user to.
 * @param {string} token - The JWT token for user authentication.
 * @returns {Promise<Object>} A promise that resolves to the user object.
 * @throws {Error} Throws an error if the token verification fails.
 * @memberof module:Websockets~multiPlayerQuiz
 * @inner
 */
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
/**
 * Handles a user joining a room, sending appropriate messages and updating user and room lists.
 * 
 * @param {Object} socket - The socket object representing the user's connection.
 * @param {Object} user - The user object containing user details.
 * @returns {Promise<void>} A promise that resolves when the user has joined the room and all updates are complete.
 * @memberof module:Websockets~multiPlayerQuiz
 * @inner
 */
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
/**
 * Handles a user leaving a room, sending appropriate messages and updating user and room lists.
 * 
 * @param {Object} user - The user object containing user details.
 * @param {Object} socket - The socket object representing the user's connection.
 * @returns {Promise<void>} A promise that resolves when the user has left the room and all updates are complete.
 * @memberof module:Websockets~multiPlayerQuiz
 * @inner
 */
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