const socketIo = require('socket.io');

function setupWebSocket(server) {
    const io = socketIo(server);

    //Wenn sich ein Client verbindet
    io.on('connection', (socket) => {
        console.log('User connected');

        //Chat-Nachricht empfangen
        socket.on('chat message', (msg) => {
            console.log('nachricht empfangen', msg);
            io.emit('chat message', msg);//Nachricht an alle verbundenen clients
        });

        //Wenn sich ein Benutzer trennt
        socket.on('disconnect', () => {
            console.log('user disconnected');
        })
    })
}
module.exports = setupWebSocket;