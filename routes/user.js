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

router.get('/api/protected', (req, res) => {
    const token = req.headers['authorization'];
    if (token) {
      jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid token' });
        } else {
          res.json({ message: 'Protected data', user: decoded.username });
        }
      });
    } else {
      res.status(401).json({ message: 'No token provided' });
    }
});

module.exports = router;