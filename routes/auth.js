// Importieren benötigter Module
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

//Initialisieren als Express-Komponente
const router = express.Router();

// PostgreSQL-Verbindung einrichten
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Render stellt diese Umgebungsvariable bereit
  ssl: {
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
  }
});

//CORS
router.use(cors({ origin: 'https://rooflessjoe.github.io' }));

router.use(express.json());

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = result.rows[0];
      if (user && await bcrypt.compare(password, user.password)) {
          const token = jwt.sign({ username: user.username }, 'secretKey', { expiresIn: '1h' });
          res.json({ token });
      } else {
          res.status(401).send('Invalid credentials');
      }
  } catch (err) {
      res.status(500).send('Error logging in');
  }
});

//Export der Komponente für die main-Instanz in server.js
module.exports = router;