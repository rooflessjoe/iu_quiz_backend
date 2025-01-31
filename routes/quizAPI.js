const jwt = require("jsonwebtoken");
module.exports = (io) => {
    const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }
    });
    pool.connect().then(() => console.log('Datenverbindung erfolgreich!')).catch((err) => console.error('Fehler bei der Verbindung:', err.stack));

    const ADMIN = "Admin"

    //JWT Token Controlle
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

    //state
    const UsersState = {
        users: [],
        setUsers: function(newUsersArray) {
            this.users = newUsersArray;
        },
        updateUserStatus: function(id, status) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, answered: status } : user
            );
        },
        updateUserScore: function(id, score) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: (user.score || 0) + score } : user
            );
        },
        resetUserScore: function(id) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: 0 } : user
            );
        },
        getUsersInRoom: function(room) {
            return this.users.filter(user => user.room === room);
        },
        haveAllUsersAnswered: function(room) {
            const usersInRoom = this.getUsersInRoom(room);
            return usersInRoom.every(user => user.answered);
        }
    };

    const RoomsState = {
        rooms: [], // Array, das alle Räume speichert
        setRooms: function(newRoomsArray) {
            this.rooms = newRoomsArray;
        },
        // Funktion, um einen Raum zu aktivieren oder zu aktualisieren
        activateRoom: function(room, currentQuestion, questionCount = null, category = null) {
            const newRoom = {
                room,
                currentQuestion: currentQuestion || 0,  // Default to 0 if undefined
                questionCount: questionCount,
                category: category
            };

            this.setRooms([
                ...this.rooms.filter(r => r.room !== room), // Entfernt den alten Raum mit dieser Room
                newRoom // Fügt den neuen oder aktualisierten Raum hinzu
            ]);

            return newRoom; // Gibt das neu erstellte Raumobjekt zurück
        }
    };


    io.on('connection', socket => {


        console.log(`User ${socket.id} connected to Quiz`)


        // Upon connection - only to user
        socket.emit('message', buildMsg(ADMIN, "Welcome to Quiz App!"))


        socket.on('enterRoom', async ({name, room, token}) => {
            try{
                const decoded = await verifyToken(token);
                console.log(decoded);
                console.log(`User ${decoded.username} authenticated and entering room: ${room}`);

                // Entfernen des Benutzers aus dem vorherigen Raum (falls vorhanden)
                const prevRoom = getUser(socket.id)?.room;

                if (prevRoom) {
                    socket.leave(prevRoom);
                    io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
                }

                // Benutzer im neuen Raum aktivieren
                const user = activateUser(socket.id, name, room);

                if (prevRoom) {
                    io.to(prevRoom).emit('userList', {
                        users: getUsersInRoom(prevRoom),
                    });
                }

                // Benutzer in den neuen Raum aufnehmen
                socket.join(user.room);

                RoomsState.activateRoom(user.room, 0, null, null)

                // Den Benutzer informieren
                socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

                // Andere Benutzer im Raum informieren
                socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

                // Benutzerliste im neuen Raum aktualisieren
                io.to(user.room).emit('userList', {
                    users: getUsersInRoom(user.room),
                });

                // Räume für alle Clients aktualisieren
                io.emit('roomList', {
                    rooms: getAllActiveRooms(),
                });
            }catch (error) {
                console.error('Token verification failed:', error);
                socket.emit('failedToken');
                socket.disconnect();
            }
        });



        socket.on('startQuiz', async ({ questionCount, category  }) => {
            try {
                const user = getUser(socket.id);

                if (!user) {
                    throw new Error('User not found');
                }
                const room = user.room;
                if (!room) {
                    throw new Error('Room not found for the user');
                }
                console.log(`Starting quiz in room: ${room}`);

                const updatedRoom = updateRoomAttribute(room, {currentQuestion: 1, questionCount: questionCount, category: category})
                console.log('Start Quiz:', updatedRoom);
                console.log('currentRoom State', updatedRoom.currentQuestion)
                const questions = await getQuestions(updatedRoom.category);
                console.log('Retrieved questions:', questions);


                if (questions.length > 0) {
                    io.to(room).emit('question', {
                        question_id: questions[0].question_id,
                        question: questions[0].question,
                    });
                } else {
                    console.log('No questions found for the category:', up.category);
                }
            } catch (err) {
                console.error('Fehler:', err.stack);
                throw err;
            }
        });

        socket.on('askForAnswers', async ({question_id}) =>{
            try{
                const user = getUser(socket.id);

                if (!user) {
                    throw new Error('User not found');
                }
                const room = user.room;
                if (!room) {
                    throw new Error('Room not found for the user');
                }
                const answers = await getAnswersForQuestion(question_id)
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
                const user = getUser(socket.id);
                if (!user) {
                    throw new Error('User not found');
                }

                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    throw new Error('Room not found');
                }
                console.log(room)
                console.log('currentRoom State Current Question:', room.currentQuestion);


                console.log('Antwort: ', {playerAnswer, question_id}, 'User: ', user.name)
                UsersState.updateUserStatus(user.id, true)
                console.log('Has User Answered', getUser(socket.id).answered)

                // Überprüfe die Antwort des Spielers
                const {correct, message} = await evaluateAnswer(playerAnswer, question_id);
                console.log('Bewertungsergebnis:', correct);

                if(correct){
                    UsersState.updateUserScore(user.id, 10)

                }
                const updatedUser = getUser(socket.id)
                const score = updatedUser.score
                console.log('User in room', getUsersInRoom(room.room))
                console.log('score:', score)
                socket.emit('evaluatedAnswer', {correct, message, score})

            }catch(err){
                console.error('Fehler: ', err.stack)
                socket.emit('message', buildMsg(ADMIN, 'Fehler'))
            }
        })

        socket.on('nextQuestion', async()=>{
            try{
                const user = getUser(socket.id);
                if (!user) {
                    throw new Error('User not found');
                }

                const room = RoomsState.rooms.find(r => r.room === user.room);
                if (!room) {
                    throw new Error('Room not found');
                }
                console.log('currentRoom State  Current Question:', room.currentQuestion);
                console.log('Haben alle geantwortet?', UsersState.haveAllUsersAnswered(room.room))
                console.log('Wirklich?',getUsersInRoom(room.room) )
                if(UsersState.haveAllUsersAnswered(room.room)){

                    //Status auf false zurücksetzen
                    const usersInRoom = UsersState.getUsersInRoom(room.room);
                    usersInRoom.forEach(u => UsersState.updateUserStatus(u.id, false));
                    console.log('Current Question:', room.currentQuestion)
                    if(room.currentQuestion < room.questionCount){
                        const currentQuestionThisRound = room.currentQuestion + 1;
                        const updates = {
                            currentQuestion: currentQuestionThisRound
                        };
                        const updatedRoom = updateRoomAttribute(room.room, updates)
                        const questions = await getQuestions(updatedRoom.category);
                        console.log('Retrieved questions:', questions);

                        console.log(questions[0].question_id, questions[0].question)
                        io.to(updatedRoom.room).emit('question',{
                            question_id: questions[0].question_id,
                            question: questions[0].question,
                        })
                        console.log('next question send')

                    }else{
                        //Needs to be done
                        console.log('Game over')
                        const usersInRoom = getUsersInRoom(room.room)
                        const userScores = usersInRoom.map(u => ({
                            name: u.name,
                            score: u.score
                        }))
                        console.log(userScores)
                        io.to(room.room).emit('quizOver', userScores)
                    }
                }else {
                    console.log('Noch nicht alle Nutzer haben geantwortet');
                    return;
                }
            }catch(err){
                console.error('Fehler', err.stack)
                throw err
            }
        })


        // When user disconnects - to all others
        socket.on('disconnect', () => {
            const user = getUser(socket.id)
            userLeavesApp(socket.id)

            if(user){
                io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))

                io.to(user.room).emit('userList', {
                    users: getUsersInRoom(user.room)
                })
                io.emit('roomList', {
                    rooms: getAllActiveRooms()
                })
            }
            console.log(`User ${socket.id} disconnected from Chat`)
        })

        // Listening for a message event
        socket.on('message', ({name, text}) => {
            const room = getUser(socket.id)?.room
            if(room){
                io.to(room).emit('message', buildMsg(name, text))
            }

        })

        // Listen for activity
        socket.on('activity', (name) => {
            const room = getUser(socket.id)?.room
            if(room){
                socket.broadcast.to(room).emit('activity', name)
            }
        })
    })

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

    // User functions
    function activateUser(id, name, room){
        const user = {id, name, room, answered: false, score: 0}
        UsersState.setUsers([
            ...UsersState.users.filter(user => user.id !== id),
            user
        ])
        return user
    }

    function userLeavesApp(id){
        UsersState.resetUserScore(id)
        UsersState.setUsers(
            UsersState.users.filter(user => user.id !== id)
        )
    }

    function getUser(id){
        return UsersState.users.find(user => user.id === id)
    }

    function getUsersInRoom(room){
        return UsersState.users.filter(user => user.room === room)
    }

    function getAllActiveRooms(){
        return Array.from(new Set(UsersState.users.map(user => user.room)))
    }




    function updateRoomAttribute(room, updates) {
        // Sucht den bestehenden Raum
        const existingRoom = RoomsState.rooms.find(r => r.room === room);

        if (!existingRoom) {
            throw new Error(`Room "${room}" not found`);
        }

        // Erstellt ein aktualisiertes Raumobjekt
        const updatedRoom = {
            ...existingRoom, // Behalte alle bestehenden Eigenschaften bei
            ...updates       // Überschreibe mit den neuen Werten
        };

        // Aktualisiert den Raum im State
        RoomsState.setRooms([
            ...RoomsState.rooms.filter(r => r.room !== room), // Entfernt den alten Raum
            updatedRoom                                      // Fügt den aktualisierten Raum hinzu
        ]);

        return updatedRoom; // Gibt das aktualisierte Raumobjekt zurück
    }

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

}