// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

//Initialisieren als Express-Komponente
const router = express.Router();

//Statischer Token bis Registrierung und Login komplett implementiert wurden
//const staticToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Definiere die Ratenbegrenzung
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 10, // Maximal 5 Anfragen pro Minute
  message: "Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut."
});

/*function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Kein Token vorhanden

  if (token !== staticToken) return res.sendStatus(403); // Token ungültig

  next();
}*/

// Middleware zur Token-Überprüfung
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
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

router.use(limiter);

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