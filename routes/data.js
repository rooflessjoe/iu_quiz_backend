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
 * Export der Komponente für die main-Instanz in server.js
 */
module.exports = router;