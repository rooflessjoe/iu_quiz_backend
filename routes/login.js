/**
 * Express router providing Login and Registration related routes
 * @module Login&Registration
 */

//Benötigte Module
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../components/pool');
const queries = require('../components/queries.json');
//const cors_origin = require('../components/cors_origin.json');

/**
 * Express router to mount login related functions on
 * @type {object}
 * @constant router
 * @namespace loginRouter
 */
const router = express.Router();

// Registrierung der Middleware zur Verarbeitung von JSON Anfragen
router.use(express.json());

// Authentifiziert einen Benutzer und gibt ein JSON Web Token zurück.
/**
 * Route providing the login authentification for the web application
 * @name post/login
 * @async
 * @function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON Web Token
 * @memberof module:Login&Registration~loginRouter
 * @inner
 */
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
/**
 * Route providing the registration for the web application
 * @name post/login
 * @async
 * @function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @memberof module:Login&Registration~loginRouter
 * @inner
 */
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

module.exports = router;