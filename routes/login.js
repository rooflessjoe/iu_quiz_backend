// Importieren benötigter Module
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');
const queries = require('../components/queries.json');
/**
 * Express Router
 */
const router = express.Router();

/** 
 * PostgreSQL-Verbindung
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Server stellt diese Umgebungsvariable bereit
  ssl: {
    require: true,
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
  }
});

//CORS
router.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Registrierung der Middleware zur Verarbeitung von JSON Anfragen
router.use(express.json());

// Authentifiziert einen Benutzer und gibt ein JSON Web Token zurück.
router.post('/api/login', async (req, res) => {
  //console.log(pool);
  const { username, password } = req.body;
  try {
      console.log(queries);
      const result = await pool.query(queries.login);
      //const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]); // await wartet auf die Antwort von pool.query (SQL Statement)
      //console.log(result);
      const user = result.rows[0];

      if (!user){console.log('User not found');} // Server-interne Ausgabe, falls der User nicht existiert
      
      // bcrypt.compare vergleicht das gehashte Passwort in der Datenbank mit dem übergebenen Passwort in Klartext
      if (user && await bcrypt.compare(password, user.password)) {
          const token = jwt.sign({ username: user.username }, process.env.SECRET_KEY, { expiresIn: '1h' }); // jwt.sign generiert einen Token für den jeweiligen User
          res.json({ token });
      } else {
          res.status(401).send('Invalid credentials');
      }
  } catch (err) {
      res.status(500).send('Error logging in');
  }
});

/**
 * Export der Komponente für die main-Instanz in server.js
 */ 
module.exports = router;