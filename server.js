// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = '/etc/secrets/secret_key'; // Pfad zur geheimen Datei auf dem Server

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

/**
 * Server; 
 * Mit dem Express-Framework initialisiert.
 */ 
const server = express();
server.disable('x-powered-by');

/**
 * Server Port;
 * Wird entweder global vom Server oder manuell festgelegt.
 */ 
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit



// CORS
server.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Initialisieren von Komponenten
server.use(loginRouter);
//server.use(userRouter);
server.use(dataRouter);

// Ausgabe vom Server
server.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});