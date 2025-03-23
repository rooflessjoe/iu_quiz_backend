/**
 * @module Server
 * @requires Login&Registration
 * @requires Quiz
 * @requires Websockets
 */

// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
require('dotenv').config();

global.queries = JSON.parse(process.env.QUERIES_JSON);

//Für Websockets
const http = require('http');
const socketIo = require('socket.io');
const multiPlayerQuiz = require('./components/websockets')

// Importieren von Komponenten
const loginRouter = require('./routes/login');
const quizRouter = require('./routes/quiz');

//Server; Mit dem Express-Framework initialisiert.
const server = express();
server.disable('x-powered-by');

/**
 * Server Port;
 * Wird entweder aus der Umgebungsvariable oder manuell festgelegt.
 * @constant {int} port
 */
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit

// CORS
/**
 * Globale Middleware für CORS
 * @name useCors
 * @function
 * @param {Object} options - Die CORS-Optionen
 * @param {String} options.origin - Die erlaubte Ursprungs-URL
 * @memberof module:Server
 */
server.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Initialisieren von Komponenten
server.use(loginRouter);
server.use(quizRouter);

// HTTP-Server erstellen und mit Socket.io verbinden
const httpServer = http.createServer(server);
const io = socketIo(httpServer, 
  {
    cors: 
    {
      origin: 'https://rooflessjoe.github.io',
    }
  });
const quizNamespace = io.of('/quizAPI');

// WebSocket-Komponente initialisieren
multiPlayerQuiz(quizNamespace); // Die WebSocket-Logik hier aufrufen

// Ausgabe vom Server
httpServer.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});