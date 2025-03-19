    const pool = require ("./pool");
    //const queries = require ("./queries");

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

        //creates a room with its setting or updates a room and removes the room with the same name to don't have duplicate rooms
        activateRoom: function(room, currentQuestion, questionCount, category, timerEnabled, timer, gameHost) {
            const newRoom = {
                room,
                currentQuestion: currentQuestion || 0,
                questionCount: questionCount,
                category: category,
                gameStatus: 'open',
                roomStatus: 'open',
                timerEnabled: timerEnabled,
                timer: timer,
                playerAnswersArray: {},
                gameHost: gameHost
            };

            this.setRooms([
                ...this.rooms.filter(r => r.room !== room),
                newRoom
            ]);

            return newRoom;
        },
        // Gets Room by Name
        getRoom: function(roomName) {
            return this.rooms.find(r => r.room === roomName) || null;
        }
    };

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

    //function if a user Leaves the App, resets the score and removes user from UserState
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

        // Creates an updated roomObject
        const updatedRoom = {
            ...existingRoom, // keeps existing attributes
            ...updates       // overwrites some with new
        };

        // updates room in roomState
        RoomsState.setRooms([
            ...RoomsState.rooms.filter(r => r.room !== room), // removes old room
            updatedRoom                                      // adds updated room
        ]);

        return updatedRoom; // returns the updated room
    }

    //Function to evaluate the Answers
    //TODO: Überprüfen ob diese Funktion auch für SinglePlayer genutzt werden kann!
    async function evaluateAnswer(playerAnswer, question_id) {
        try{
            const result = await pool.query(global.queries.answer_valid2, [question_id, playerAnswer]);
            if(result.rows.length === 0){
                return {correct : false, message: 'Ungültige Antwort'}
            }
            const isCorrect = result.rows[0].valid;
            return {correct: isCorrect, message: isCorrect ? 'Richtig!' : 'Falsch!'}
        }catch(err){
            console.error('Fehler bei der Antwortauswertung:', err.stack);
            throw err;
        }

    }

    //returns a list of Categories from the Database
    async function getCategories(){
        try{
            const { rows } = await pool.query(global.queries.quiz_list);
            console.log('Abgerufene Categories:', rows);
            return rows.map(({quiz_name}) => quiz_name);
        }catch (err){
            console.error('Fehler beim Abruf: ', err.stack)
            return []
        }
    }

    module.exports = {
        UsersState,
        RoomsState,
        buildMsg,
        activateUser,
        userLeavesApp,
        getUser,
        getUsersInRoom,
        getAllActiveRooms,
        updateRoomAttribute,
        evaluateAnswer,
        getCategories
    };