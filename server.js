// Importiere benötigte Module
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Express-Anwendung initialisieren
const app = express();

// PostgreSQL-Verbindung einrichten
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
  ssl: {
    rejectUnauthorized: false  // Wichtig für Verbindungen mit SSL
  }
});

// API-Endpunkt für Daten
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');  // Beispiel-Query
    res.json(result.rows);  // Rückgabe der Daten als JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten');
  }
});

// Server starten
const port = process.env.PORT || 3000;  // Render stellt die PORT-Variable bereit
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});

app.use(cors({
  origin: 'https://rooflessjoe.github.io'
}));