const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const router = express.Router();
const secretKey = 'geheimeschluessel';

const allowedOrigins = ['https://rooflessjoe.github.io'];

router.use(cors({ 
  origin: function (origin, callback) {
    // Erlaube nur Anfragen von den erlaubten Ursprüngen
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
    } else {
        callback(new Error('Nicht erlaubter Ursprung'));
    }
  } 
}));

router.use(express.json());

router.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'user' && password === 'pass') {
      const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
});

module.exports = router;