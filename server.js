// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = 'process.env'; // Pfad zur geheimen Datei auf dem Server
require('dotenv').config();

//für Websocket
const https = require('https');
const socketIo = require('socket.io');


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
//Für WebSocket

/**
 * Server; 
 * Mit dem Express-Framework initialisiert.
 */
// const server = express(); zu const app = express();
const app = express();
app.disable('x-powered-by');

/**
 * Server Port;
 * Wird entweder aus der Umgebungsvariable oder manuell festgelegt.
 */ 
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit

// Erstelle einen HTTP-Server für Express und WebSocket
const server = https.createServer(app);


// CORS
app.use(cors({ origin: 'http://localhost:63342' }));

// Initialisieren von Komponenten
app.use(loginRouter);
//server.use(userRouter);
app.use(dataRouter);

//Initialisieren vom WebSockets
setupWebSocket(server);

// Ausgabe vom Server
server.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});