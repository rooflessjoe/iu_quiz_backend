/**
 * @module Server
 * @requires Login&Registration
 * @requires Quiz
 * @requires Websockets
 */

// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = '/etc/secrets/secret_key'; // Pfad zur geheimen Datei auf dem Server

//Für Websockets
const http = require('http');
const socketIo = require('socket.io');
const multiQuiz = require('./components/websockets')

/**
 * Geheimer Schlüssel aus der geheimen Datei auf dem Server
 * @constant {String} secretKey
 * @namespace secretKey
 */
 
/**
 * Liest den geheimen Schlüssel aus der Datei auf dem Server
 * @name readFileSync
 * @function
 * @param {String} path - internal path on server for read file
 * @param {String} encoding - Zeichenkodierung, die verwendet werden soll.
 * @returns {String} Inhalt der Datei.
 * @memberof module:Server~secretKey
 */
const secretKey = fs.readFileSync(path, 'utf8').trim();

/**
 * Umgebungsvariable für den geheimen Schlüssel auf dem Server
 * @name SECRET_KEY
 * @memberof module:Server~secretKey
 */
process.env.SECRET_KEY = secretKey;

// Importieren von Komponenten
const loginRouter = require('./routes/login');
const dataRouter = require('./routes/data');
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
server.use(dataRouter);

// HTTP-Server erstellen und mit Socket.io verbinden
const httpServer = http.createServer(server);
const io = socketIo(httpServer, 
  {
    cors: 
    {
      origin: 'https://rooflessjoe.github.io',
    }
  });
const quizNamespace = io.of('/multi_quiz')

// WebSocket-Komponente initialisieren
multiQuiz(quizNamespace); // Die WebSocket-Logik hier aufrufen

// Ausgabe vom Server
httpServer.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});