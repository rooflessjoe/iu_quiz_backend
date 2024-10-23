const express = require('express');
const cors = require('cors');

const router = express.Router();

const allowedOrigins = ['https://rooflessjoe.github.io'];

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

app.get('/api/data', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');  // Beispiel-Query, users Table wurde in der Datenbank angelegt
      res.json(result.rows);  // Rückgabe der Daten als JSON
    } catch (err) {
      console.error(err);
      res.status(500).send('Fehler beim Abrufen der Daten'); //Catch eines Fehlers beim Abruf der Daten
    }
  });