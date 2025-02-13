/**
 * Middleware zur Authentifizierung eines JSON Web Tokens (JWT).
 * Überprüft den Authorization-Header und validiert den Token.
 * @module JWT-Authentification
*/

const jwt = require('jsonwebtoken');

/**
 * @function authenticateToken
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function  
*/
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    //async() => {
    if (token == null) {
      res.sendStatus(401).send('Invalid Token');
    } else {
      jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      //jwt.verify(token, '123', (err, user) => {
        if (err) {
          if (err.name === 'TokenExpiredError'){
            res.sendStatus(403).json({ message: 'Token abgelaufen' });
          }
            res.status(500).send('Authentification Error');
        }
        req.user = user;
        next();
    });
    }
  }
//}

//Statischer Token bis Registrierung und Login komplett implementiert wurden
//const staticToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/*function authenticateStaticToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Kein Token vorhanden

  if (token !== staticToken) return res.sendStatus(403); // Token ungültig

  next();
}*/

module.exports = authenticateToken;