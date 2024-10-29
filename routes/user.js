const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const router = express.Router();

// PostgreSQL-Verbindung einrichten
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
  ssl: {
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
  }
});

router.use(cors({ origin: 'https://rooflessjoe.github.io' }));

// Registrierung
router.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
      const result = await pool.query(
          'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
          [username, hashedPassword]
      );
      res.status(201).send(`User registered with ID: ${result.rows[0].id}`);
  } catch (err) {
      res.status(500).send('Error registering user');
  }
});

module.exports = router;