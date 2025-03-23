/**
 * Die von Websockets-Modul benötigten Funktionen und Objekte.
 * @module Websockets-Functions
 * @requires module:PostgreSQL-Middleware
*/
    
    const pool = require ("./pool");

    /**
    * UsersState object to manage the state of users.
    * @namespace UsersState
    */
    const UsersState = {
        /**
         * Array which saves the users.
         * @type {Array<Object>}
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        users: [],

        /**
         * Replaces users array with a new users array.
         * @param {Array<Object>} newUsersArray - The new array of users.
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        setUsers: function(newUsersArray) {
            this.users = newUsersArray;
        },

        /**
         * Updates the user's status if they answered a question.
         * @param {string} id - The unique identifier for the user.
         * @param {boolean} status - The new answered status.
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        updateUserStatus: function(id, status) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, answered: status } : user
            );
        },

        /**
         * Updates the user's score.
         * @param {string} id - The unique identifier for the user.
         * @param {number} score - The score to add to the user's current score.
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        updateUserScore: function(id, score) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: (user.score || 0) + score } : user
            );
        },

         /**
         * Sets the user's score back to 0.
         * @param {string} id - The unique identifier for the user.
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        resetUserScore: function(id) {
            this.users = this.users.map(user =>
                user.id === id ? { ...user, score: 0 } : user
            );
        },

        /**
         * Filters users in a given room.
         * 
         * @param {string} room - The name of the room.
         * @returns {Array<Object>} An array of user objects in the specified room.
         * @memberof module:Websockets-Functions~UsersState
         * @inner
         */
        getUsersInRoom: function(room) {
            return this.users.filter(user => user.room === room);
        },

        /**
     * Checks if all users in a given room have answered.
     * 
     * @param {string} room - The name of the room.
     * @returns {boolean} True if all users in the room have answered, otherwise false.
     * @memberof module:Websockets-Functions~UsersState
     * @inner
     */
        haveAllUsersAnswered: function(room) {
            const usersInRoom = this.getUsersInRoom(room);
            return usersInRoom.every(user => user.answered);
        }
    };

    /**
     * RoomsState object to manage the state of rooms.
     * @namespace RoomsState
     */
    const RoomsState = {
        /**
         * Array which saves the rooms.
         * @type {Array<Object>}
         * @memberof module:Websockets-Functions~RoomsState
         * @inner
         */
        rooms: [],
        /**
     * Replaces rooms array with a new rooms array.
     * 
     * @param {Array<Object>} newRoomsArray - The new array of rooms.
     * @memberof module:Websockets-Functions~RoomsState
     * @inner
     */
        setRooms: function(newRoomsArray) {
            this.rooms = newRoomsArray;
        },

        /**
     * Creates a room with its settings or updates an existing room, removing any room with the same name to avoid duplicates.
     * 
     * @param {string} room - The name of the room.
     * @param {int} [currentQuestion=0] - The current question number.
     * @param {int} questionCount - The total number of questions.
     * @param {string} category - The category of the quiz.
     * @param {boolean} timerEnabled - Whether the timer is enabled.
     * @param {int} timer - The timer duration.
     * @param {string} gameHost - The host of the game.
     * @param {boolean} privateRoomEnabled - Whether the room is private.
     * @param {string} privateRoomPassword - The password for the private room.
     * @returns {Object} The new or updated room object.
     * @memberof module:Websockets-Functions~RoomsState
     * @inner
     */
        activateRoom: function(room, currentQuestion, questionCount, category, timerEnabled, timer, gameHost, privateRoomEnabled, privateRoomPassword) {
            let roomStatus;
            if (privateRoomEnabled) {
                roomStatus = 'private'
            } else {
                roomStatus = 'open'
            }
            const newRoom = {
                room,
                currentQuestion: currentQuestion || 0,
                questionCount: questionCount,
                category: category,
                gameStatus: 'open',
                roomStatus: roomStatus,
                timerEnabled: timerEnabled,
                timer: timer,
                playerAnswersArray: {},
                gameHost: gameHost,
                privateRoomPassword: privateRoomPassword
            };

            this.setRooms([
                ...this.rooms.filter(r => r.room !== room),
                newRoom
            ]);

            return newRoom;
        },
        /**
     * Gets a room by its name.
     * 
     * @param {string} roomName - The name of the room.
     * @returns {Object|null} The room object if found, otherwise null.
     * @memberof module:Websockets-Functions~RoomsState
     * @inner
     */
        getRoom: function(roomName) {
            return this.rooms.find(r => r.room === roomName) || null;
        }
    };

    /**
    * Function to build Messages with name, text and time
    * @function buildMsg
    * @param {String} name - The name of the person sending the message.
    * @param {String} text - The text content of the message.
    * @returns {Object} - The message object containing name, text, and time.
    */
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

    /**
    * Function to activate a user with the attributes
    * @function activateUser
    * @param {int} id - The unique identifier for the user.
    * @param {String} name - The name of the user.
    * @param {String} room - The room the user is assigned to.
    * @returns {Object} - The user object containing id, name, room, answered, and score.
    */
    function activateUser(id, name, room){
        const user = {id, name, room, answered: false, score: 0}
        UsersState.setUsers([
            ...UsersState.users.filter(user => user.id !== id),
            user
        ])
        return user
    }

    /**
    * Function if a user Leaves the App, resets the score and removes user from UserState
    * @function userLeavesApp
    * @param {int} id - The unique identifier for the user.
    */
    function userLeavesApp(id){
        UsersState.resetUserScore(id)
        UsersState.setUsers(
            UsersState.users.filter(user => user.id !== id)
        )
    }

    /**
    * Function to get the user by its id
    * @function getUser
    * @param {int} id - The unique identifier for the user.
    * @returns {Object|undefined} The user object if found, otherwise undefined. 
    */
    function getUser(id){
        return UsersState.users.find(user => user.id === id)
    }

    /**
    * Function to get the users in a room by room
    * @function getUsersInRoom
    * @param {String} room - The name of the room.
    * @returns {Array<Object>} An array of user objects in the specified room.
    */
    function getUsersInRoom(room){
        return UsersState.users.filter(user => user.room === room)
    }
    
    /**
    * Function to return all active rooms
    * @function getAllActiveRooms
    * @returns {Array<Object>} An array of room objects representing all active rooms. 
    */
    function getAllActiveRooms(){
        return RoomsState.rooms
    }

    /**
    * Function to update the Attributes of a room
    * @function updateRoomAttribute
    * @param {String} room - The name of the room to update.
    * @param {Object} updates - An object containing the attributes to update.
    * @returns {Object} The updated room object.
    * @throws {Error} Throws an error if the room is not found.  
    */
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

    /**
    * Function to evaluate the Answers
    * @function evaluateAnswer
    * @param {int} playerAnswer - The answer provided by the player.
    * @param {int} question_id - The unique identifier for the question.
    * @returns {Promise<Object>} A promise that resolves to an object containing the correctness of the answer and a message.
    * @throws {Error} Throws an error if there is an issue with the database query. 
    */
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

    /**
    * Function to return a list of Categories from the Database
    * @function getCategories  
    * @returns {Promise<Array<string>>} A promise that resolves to an array of quiz category names.
    * @throws {Error} Throws an error if there is an issue with the database query.
    */
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