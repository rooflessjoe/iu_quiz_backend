// Importieren benötigter Module
const express = require('express');
const pool = require('../components/pool');
const authenticateToken = require('../components/auth');
const queries = require('../components/queries');
/**
 * Express Router
 */
const router = express.Router();

// Abfrage von Benutzerdaten aus der Datenbank.#
router.get('/api/data', authenticateToken, async (req, res)  => {
  let client;
    try {
      client = await pool.connect(); // Verbindung reservieren
      const result = await pool.query(queries.data, [req.user.username]);
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
 * @module DataInterface
 * Export der Komponente für die main-Instanz in server.js
 */ 
module.exports = router;