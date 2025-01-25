// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = '/etc/secrets/secret_key'; // Pfad zur geheimen Datei auf dem Server

/**
 * Für Websockets
 */
const http = require('http');
const socketIo = require('socket.io');
const quizAPI = require('./routes/quizAPI')

/**
 * Liest den geheimen Schlüssel aus der geheimen Datei auf dem Server
 */
const secretKey = fs.readFileSync(path, 'utf8').trim();

/**
 * Umgebungsvariable für den geheimen Schlüssel auf dem Server
 */
process.env.SECRET_KEY = secretKey;

// Importieren von Komponenten
const loginRouter = require('./routes/login');
const dataRouter = require('./routes/data');
const quizRouter = require('./routes/quiz');

/**
 * Server;
 * Mit dem Express-Framework initialisiert.
 */
const server = express();
server.disable('x-powered-by');

/**
 * Server Port;
 * Wird entweder aus der Umgebungsvariable oder manuell festgelegt.
 */
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit



// CORS
server.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Initialisieren von Komponenten
server.use(loginRouter);
server.use(quizRouter);
server.use(dataRouter);

// HTTP-Server erstellen und mit Socket.io verbinden
const httpServer = http.createServer(server);
const io = socketIo(httpServer, {
  cors: {
    origin: 'https://rooflessjoe.github.io',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true
  }
});
const quizNamespace = io.of('/quizAPI')

// WebSocket-Komponente initialisieren
quizAPI(quizNamespace); // Die WebSocket-Logik hier aufrufen

// Ausgabe vom Server
server.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});