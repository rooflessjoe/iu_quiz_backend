// Importieren benötigter Module
const express = require('express');
//const cors = require('cors');
//const { Pool } = require('pg');

// Express-Framework initialisieren
const app = express();

//const allowedOrigins = ['https://rooflessjoe.github.io'];

const loginRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const dataRouter = require('./routes/data');

// Server starten
const port = 3000;  // Render stellt die PORT-Variable bereit

app.use(loginRouter);
app.use(userRouter);
app.use(dataRouter);

/*app.use(cors({ 
  origin: function (origin, callback) {
    // Erlaube nur Anfragen von den erlaubten Ursprüngen
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
    } else {
        callback(new Error('Nicht erlaubter Ursprung'));
    }
  } 
}));*/

// PostgreSQL-Verbindung einrichten
/*const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
  ssl: {
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen, benötigt ein Zertifikat
  }
});*/

// API-Endpunkt für Daten
/*app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');  // Beispiel-Query, users Table wurde in der Datenbank angelegt
    res.json(result.rows);  // Rückgabe der Daten als JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten'); //Catch eines Fehlers beim Abruf der Daten
  }
});*/

// Pool schließen, wenn die Anwendung beendet wird
/*process.on('SIGINT', async () => {
  await pool.end();
  console.log('Datenbankverbindung geschlossen');
  process.exit(0);
});*/

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});