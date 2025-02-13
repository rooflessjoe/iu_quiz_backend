//ToDo
//Check when a user gets remove from socket and room (leftRoom, join scoket and disconnect

const jwt = require("jsonwebtoken");
const {query} = require("express");
module.exports = (io) => {
    const { Pool } = require('pg');
    //Database connection
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }
    });
    pool.connect().then(() => console.log('Datenverbindung erfolgreich!')).catch((err) => console.error('Fehler bei der Verbindung:', err.stack));

    //Variable for Message Function
    const ADMIN = "Admin"

    //JWT Check function
    function verifyToken(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
                if (err) {
                    reject('Invalid token');
                }else{
                    resolve(decoded);
                }
            })
        })
    }

    //states

    const UsersState = {
        //array which saves the users
        users: [],

        //replaces users array with a new users array
        setUsers: function(newUsersArray) {
            this.users = newUsersArray;
        },
        //updates the users Status if they answered a question
        updateUserStatus: function(id, status) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, answered: status } : user
            );
        },
        // updates users score
        updateUserScore: function(id, score) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: (user.score || 0) + score } : user
            );
        },
        // set the users Score back to 0
        resetUserScore: function(id) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: 0 } : user
            );
        },
        // filters users in a given room
        getUsersInRoom: function(room) {
            return this.users.filter(user => user.room === room);
        },
        // checks if all users in a given Room have answered
        haveAllUsersAnswered: function(room) {
            const usersInRoom = this.getUsersInRoom(room);
            return usersInRoom.every(user => user.answered);
        }
    };

    const RoomsState = {
        //array which saves the rooms
        rooms: [],
        // replaces rooms array with a new rooms array
        setRooms: function(newRoomsArray) {
            this.rooms = newRoomsArray;
        },

        //creates a room with its setting or updates a room and removes the room with the same name to dont have duplicate rooms
        activateRoom: function(room, currentQuestion, questionCount, category, timerEnabled, timer) {
            const newRoom = {
                room,
                currentQuestion: currentQuestion || 0,
                questionCount: questionCount,
                category: category,
                gameStatus: 'open',
                timerEnabled: timerEnabled,
                timer: timer
            };

            this.setRooms([
                ...this.rooms.filter(r => r.room !== room),
                newRoom
            ]);

            return newRoom;
        }
    };


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

                // emit update list of users in Old room to the old room
                if (prevRoom) {
                    io.to(prevRoom).emit('userList', {
                        users: getUsersInRoom(prevRoom),
                    });
                }

                // Add user to new room
                socket.join(user.room);

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

                // sets timer to 'null' when timer isnt in use
                if (!timerEnabled){
                    timer = null;
                }

                // activates room with given parameters
                RoomsState.activateRoom(room, 0, questionCount, category, timerEnabled, timer);

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
                    throw new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    throw new Error('Room not found for the user');
                }

                console.log(`Starting quiz in room: ${room.room}`);

                // gets questions from Database
                const questions = await getQuestions(room.category);

                // increases current question for room
                const currentQuestionThisRound = room.currentQuestion + 1;

                //creates an update object and updates the room with new gameStatus and currentquestion
                const updates = {
                    currentQuestion: currentQuestionThisRound,
                    gameStatus: gameState,
                };
                const updatedRoom = updateRoomAttribute(room.room, updates)

                // emits new Room list to all clients
                io.emit('roomList', {
                    rooms: getAllActiveRooms(),
                });

                // checks if question got loaded and sent question with timer to room
                if (questions.length > 0) {
                    console.log('timer:', room.timer, room.timerEnabled);
                    io.to(room.room).emit('question', {
                        timerEnabled: room.timerEnabled,
                        timerDuration: room.timer,
                        question_id: questions[0].question_id,
                        question: questions[0].question,
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
                    throw new Error('User not found');
                }
                const room = user.room;
                if (!room) {
                    throw new Error('Room not found for the user');
                }

                // database request to get the Answers for the Question
                const answers = await getAnswersForQuestion(question_id)

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
                    throw new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    throw new Error('Room not found');
                }

                // updates user to set answered true
                UsersState.updateUserStatus(user.id, true)


                // checks the answer of the user
                const {correct, message} = await evaluateAnswer(playerAnswer, question_id);

                // adds 10 points to score of user if answer is right
                if(correct){
                    UsersState.updateUserScore(user.id, 10)

                }
                // gets updated user object to get new Score to emit score and validated answer to room to room
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
                    throw new Error('User not found');
                }
                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    throw new Error('Room not found');
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
                        const questions = await getQuestions(updatedRoom.category);

                        // emits question to room
                        io.to(updatedRoom.room).emit('question',{
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

                        io.to(room.room).emit('quizOver', userScores)
                    }
                }else {
                    // if not everyone has answered, ends here and waits for last person to answer
                    console.log('Noch nicht alle Nutzer haben geantwortet');
                    return;
                }
            }catch(err){
                console.error('Fehler', err.stack)
                throw err
            }
        })

        socket.on('leaveRoom', async () => {
            try {
                //find user
                const user = getUser(socket.id);
                if (!user) {
                    throw new Error('User not found');
                }

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


                    // checks if room is empty after user left
                    if(getUsersInRoom(prevRoom)  < 1){
                        console.log('Room Empty')
                        // removes room from Roomstate if empty
                        RoomsState.setRooms(RoomsState.rooms.filter(r => r.room !== prevRoom));
                    }
                    //emits new activeRoom list
                    io.emit('roomList', {
                        rooms: getAllActiveRooms(),
                    });
                }
            } catch (err) {
                console.error('Fehler', err.stack);
            }
        });



        // When user disconnects - to all others
        socket.on('disconnect', () => {
            //get user and excute function to leaveApp on disconnect
            const user = getUser(socket.id)
            userLeavesApp(socket.id)

            //if user exists
            if(user){
                //inform players in room user left
                io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))

                // emits new user in room list to room
                io.to(user.room).emit('userList', {
                    users: getUsersInRoom(user.room)
                })
                //emits new room list
                io.emit('roomList', {
                    rooms: getAllActiveRooms()
                })
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


    //function to build Messages with name, text and time
    function buildMsg(name, text){
        return {
            name,
            text,
            time: new Intl.DateTimeFormat('default', {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            }).format(new Date())
        }
    }

    // function to activate a user with the attributes
    function activateUser(id, name, room){
        const user = {id, name, room, answered: false, score: 0}
        UsersState.setUsers([
            ...UsersState.users.filter(user => user.id !== id),
            user
        ])
        return user
    }

    //function if a user Leaves the App, resets the score and removes user from Userstate
    function userLeavesApp(id){
        UsersState.resetUserScore(id)
        UsersState.setUsers(
            UsersState.users.filter(user => user.id !== id)
        )
    }

    //gets the user by its id
    function getUser(id){
        return UsersState.users.find(user => user.id === id)
    }

    //gets the users in a room by room
    function getUsersInRoom(room){
        return UsersState.users.filter(user => user.room === room)
    }
    // return all active rooms
    function getAllActiveRooms(){
        return RoomsState.rooms
    }

    //updates the Attributes of a room
    function updateRoomAttribute(room, updates) {
        // Sucht den bestehenden Raum
        const existingRoom = RoomsState.rooms.find(r => r.room === room);

        if (!existingRoom) {
            throw new Error(`Room "${room}" not found`);
        }

        // Creates an updated roomObejct
        const updatedRoom = {
            ...existingRoom, // keeps existing attributes
            ...updates       // overwrites some with new
        };

        // updates room in roomstate
        RoomsState.setRooms([
            ...RoomsState.rooms.filter(r => r.room !== room), // removes old room
            updatedRoom                                      // adds updated room
        ]);

        return updatedRoom; // returns the updated room
    }

    //returns questions from Database
    async function getQuestions(category) {
        const query =  `
            SELECT f.question_id, f.question
            FROM fragen f
                     JOIN quiz q ON f.quiz_id = q.quiz_id
            WHERE q.quiz_name = $1
            ORDER BY RANDOM()
                LIMIT 1;
        `
        try{
            console.log('In der Funktion Kategory:', category)
            const result = await pool.query(query, [category])
            console.log('Abgerufene Fragen:', result.rows);
            return result.rows;
        }catch(err){
            console.error('Fehler beim Abruf: ', err.stack);
            throw err;
        }
    }

    //Function to get Answers to Questions
    async function getAnswersForQuestion(question_id) {
        const query = `
            SELECT a.answer_id, a.answer, a.question_id
            FROM antworten a
            WHERE a.question_id = $1;`

        try{
            const result = await pool.query(query, [question_id])
            console.log('Abgerufene Antworten:', result.rows)
            return result.rows
        }catch(err){
            console.error('Fehler beim Abruf: ', err.stack)
            throw err
        }
    }

    //Function to evaluate the Answers
    async function evaluateAnswer(playerAnswer, question_id) {
        try{
            const result = await pool.query(`
                SELECT valid
                FROM antworten
                WHERE question_id = $1 AND answer_id = $2
            `, [question_id, playerAnswer])
            if(result.rows.length === 0){
                return {correct : false, message: 'Ungültige Antwort'}
            }
            const isCorrect = result.rows[0].valid;
            return {correct: isCorrect, message: isCorrect ? 'Richtig!' : 'Falsch!'}
        }catch(err){
            console.error('Fehler bei der Antwortauswertung:', err.stack)
            throw err;
        }

    }

    //returns a list of Categories from the Database
    async function getCategories(){
        const query = `
            SELECT DISTINCT quiz_name
            from quiz`

        try{
            const result = await pool.query(query)
            console.log('Abgerufene Categories:', result.rows)
            return result.rows.map(row => row.quiz_name);
        }catch (err){
            console.error('Fehler beim Abruf: ', err.stack)
            return []
        }
    }

}