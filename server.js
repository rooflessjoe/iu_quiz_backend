// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = '/etc/secrets/secret_key'; // Pfad zur geheimen Datei

// Lies den geheimen Schlüssel aus der Datei
const secretKey = fs.readFileSync(path, 'utf8').trim();

// Setze den geheimen Schlüssel in process.env
process.env.SECRET_KEY = secretKey;

// Importieren von Komponenten
const loginRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const dataRouter = require('./routes/data');

// Express-Framework initialisieren
const server = express();

// Server starten
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit



// CORS
server.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Initialisieren von Komponenten
server.use(loginRouter);
server.use(userRouter);
server.use(dataRouter);

// Ausgabe vom Server
server.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});