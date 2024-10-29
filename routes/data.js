// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

//Initialisieren als Express-Komponente
const router = express.Router();

// Middleware zur Token-Überprüfung
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'secretKey', (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
}

// PostgreSQL-Verbindung einrichten
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
    ssl: {
      rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
    }
});

//CORS
router.use(cors({ origin: 'https://rooflessjoe.github.io' }));

//GET-API für Komunikation mit der Datenbank
router.get('/api/data', authenticateToken, async (req, res)  => {
    try {
      const result = await pool.query('SELECT * FROM users');  // Beispiel-Query, users Table wurde in der Datenbank angelegt
      res.json(result.rows);  // Rückgabe der Daten als JSON
    } catch (err) {
      console.error(err);
      res.status(500).send('Fehler beim Abrufen der Daten'); //Catch eines Fehlers beim Abruf der Daten
    }
});

// Pool schließen, wenn die Anwendung beendet wird
/*process.on('SIGINT', async () => {
  await pool.end();
  console.log('Datenbankverbindung geschlossen');
  process.exit(0);
});*/

//Export der Komponente für die main-Instanz in server.js
module.exports = router;