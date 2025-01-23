// Importieren benötigter Module
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');
const queries = require('../components/queries.json');
//const cors_origin = require('../components/cors_origin.json');
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
//router.use(cors({ origin: cors_origin.origin_local }));

// Registrierung der Middleware zur Verarbeitung von JSON Anfragen
router.use(express.json());

// Authentifiziert einen Benutzer und gibt ein JSON Web Token zurück.
router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const result = await pool.query(queries.login, [username]);
      const user = result.rows[0];
      
      // bcrypt.compare vergleicht das gehashte Passwort in der Datenbank mit dem übergebenen Passwort in Klartext
      if (user && await bcrypt.compare(password, user.password)) {
          const token = jwt.sign({ username: user.username }, process.env.SECRET_KEY, { expiresIn: '1h' }); // jwt.sign generiert einen Token für den jeweiligen User
          //const token = jwt.sign({ username: user.username }, '123', { expiresIn: '1h' }); // jwt.sign generiert einen Token für den jeweiligen User
          res.json({ token });
      } else if (!user) {
          //console.log('User not found');
          //console.log('Used username:', username);
          res.status(401).send('Invalid credentials');
      } else {
        //console.log('Used username:', username);
        //console.log('Used password:', password);
        res.status(401).send('Invalid credentials');
      }
  } catch (err) {
      console.error(err);
      res.status(500).send('Error logging in');
  }
});

// Registriert einen Benutzter durch speichern seiner Daten in der Datenbank; Passwort wird gehashed gespeichert
router.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  if (username.includes('@iu-study.org')){
  try {
      const result = await pool.query(queries.register,[username, hashedPassword]);
      res.status(201).send(`User registered with ID: ${result.rows[0].id}`);
  } catch (err) {
    console.error(err);
      res.status(500).send('Error registering user');
  }
} else res.status(403).send('Unathorized Domain');
});

/**
 * Export der Komponente für die main-Instanz in server.js
 */
module.exports = router;