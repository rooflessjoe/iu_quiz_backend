/**
 * Express router providing quiz related routes
 * @module Quiz
 * @requires module:JWT-Authentification
 */

//Benötigte Module
const express = require('express');
const pool = require('../server');
const authenticateToken = require('../components/auth.js');
const queries = require('../components/queries.json');

/**
 * Express router to mount quiz related functions on
 * @type {object}
 * @const
 * @namespace quizRouter
 */
const router = express.Router();

//PostgreSQL Datenbankverbindung

/**
 * Erstellt einen neuen Pool für die Datenbankverbindungen.
 * @constant {Pool} pool - Der Pool für die Datenbankverbindungen.
 * @namespace PostgreSQL
 */

/**
 * Die Konfigurationsoptionen für den Pool.
 * @typedef {Object} PoolConfig
 * @property {string} connectionString - Die Verbindungszeichenfolge zur Datenbank, bereitgestellt durch die Umgebungsvariable.
 * @property {Object} ssl - Die SSL-Konfigurationsoptionen.
 * @property {boolean} ssl.require - Gibt an, ob SSL erforderlich ist.
 * @property {boolean} ssl.rejectUnauthorized - Gibt an, ob nicht autorisierte Zertifikate abgelehnt werden sollen.
 * @memberof module:Quiz~PostgreSQL
 */

/**
 * @type {PoolConfig}
 * @memberof module:Quiz~PostgreSQL
 */
/*const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Server stellt diese Umgebungsvariable bereit
  ssl: {
    require: true,
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
  }
});*/

/**
 * Route serving the list of available quizes
 * @name get/quiz_list
 * @async
 * @function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner
 */
router.get('/api/quiz_list', authenticateToken, async (req, res)  => {
  let client;
    try {
      client = await pool.connect(); // Verbindung reservieren
      const result = await pool.query(queries.quiz_list);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('Fehler beim Abrufen der Daten');
    } finally {
      if (client) {
        client.release(); // Verbindung freigeben
      }
    }
});

/**
 * Route serving the list of questions in the selected quiz
 * @name get/quiz
 * @async
 * @function
 * @param {String} path - Needed Structure /api/quiz?quizID=[int]&quizName=[String]
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner 
 */
router.get('/api/quiz', authenticateToken, async (req, res)  => {
    let client;
      try {
        client = await pool.connect(); // Verbindung reservieren
        const questions = await pool.query(queries.question_list, [req.query.quizID, req.query.quizName]);
        const answers = await pool.query(queries.answer_list, [req.query.quizID, req.query.quizName]);
        res.json({
          questions: questions.rows,
          answers: answers.rows
        });
      } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Abrufen der Daten');
      } finally {
        if (client) {
          client.release(); // Verbindung freigeben
        }
      }
  });

/**
 * Route serving the right answer to a question
 * @name get/answer
 * @async
 * @function
 * @param {String} path - Needed Structure /api/quiz?quizID=[int]&quizName=[String]&questionID=[int]
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner 
 */
router.get('/api/answer', authenticateToken, async (req, res) => {
      let client;
      try {
        client = await pool.connect(); // Verbindung reservieren
        const result = await pool.query(queries.answer_valid, [req.query.quizID, req.query.quizName, req.query.questionID]);
        res.json(result.rows);
      } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Abrufen der Daten');
      } finally {
        if (client) {
          client.release(); // Verbindung freigeben
        }
      }
});

/*//TODO
router.post('/api/quiz/custom', async (req, res) => {
  const { username, password } = req.body;
  try {
      const result = await pool.query(queries.answer_valid, req.query);
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
});*/

module.exports = router;