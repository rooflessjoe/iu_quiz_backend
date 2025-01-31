// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { authenticateToken } = require('../components/auth.js');
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

// CORS
//router.use(cors({ origin: cors_origin.origin_local }));

// Abfrage von Benutzerdaten aus der Datenbank.
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

//TODO: Ausarbeiten
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
});

/**
 * Export der Komponente für die main-Instanz in server.js
 */
module.exports = router;