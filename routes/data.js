const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const router = express.Router();

const allowedOrigins = ['https://rooflessjoe.github.io'];

// PostgreSQL-Verbindung einrichten
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
    ssl: {
      rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen, benötigt ein Zertifikat
    }
});

router.use(cors({ 
  origin: function (origin, callback) {
    // Erlaube nur Anfragen von den erlaubten Ursprüngen
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
    } else {
        callback(new Error('Nicht erlaubter Ursprung'));
    }
  } 
}));

router.get('/api/data', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');  // Beispiel-Query, users Table wurde in der Datenbank angelegt
      res.json(result.rows);  // Rückgabe der Daten als JSON
    } catch (err) {
      console.error(err);
      res.status(500).send('Fehler beim Abrufen der Daten'); //Catch eines Fehlers beim Abruf der Daten
    }
});

module.exports = router;