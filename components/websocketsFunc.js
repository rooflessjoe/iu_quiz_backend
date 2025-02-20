    const { verifyToken } = require ("./auth");
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
            const result = await pool.query(queries.answer_valid2, [question_id, playerAnswer])
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
        try{
            const { rows } = await pool.query(queries.quiz_list);
            console.log('Abgerufene Categories:', rows);
            return rows.map(({quiz_name}) => quiz_name);
        }catch (err){
            console.error('Fehler beim Abruf: ', err.stack)
            return []
        }
    }

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

    module.exports = {
        buildMsg,
        userLeavesApp,
        getUser,
        getUsersInRoom,
        getAllActiveRooms,
        updateRoomAttribute,
        evaluateAnswer,
        getCategories,
        addUserToRoom,
        userJoinsRoom
    };