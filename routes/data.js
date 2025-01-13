// Importieren benötigter Module
const express = require('express');
const cors = require('cors');
//const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { authenticateToken } = require('../components/auth.js');

/**
 * Express Router
 */
const router = express.Router();

/** 
 * PostgreSQL-Verbindung
 */
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'iu_quiz',
  password: 'postgres',
  port: 5432,  // Server stellt diese Umgebungsvariable bereit
    ssl: {
      require: true,
      rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
    }
});

// CORS
router.use(cors({ origin: 'http://localhost:63342' }));

// Abfrage von Benutzerdaten aus der Datenbank.
router.get('/api/data', authenticateToken, async (req, res)  => {
  let client;
    try {
      client = await pool.connect(); // Verbindung reservieren
      const result = await pool.query('SELECT name, email FROM users');  // Beispiel-Query; users Tabelle wurde in der Datenbank manuell angelegt
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      console.error('Fehler beim Abrufen der Daten:', err.message);
      res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
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