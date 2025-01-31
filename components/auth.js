const jwt = require('jsonwebtoken');
/**
 * Middleware zur Authentifizierung eines JSON Web Tokens (JWT).
 * Überprüft den Authorization-Header und validiert den Token.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401).send('Invalid Token');
    } else {
        jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
            //jwt.verify(token, '123', (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError'){
                    return res.sendStatus(403).json({ message: 'Token abgelaufen' });
                }
                return res.sendStatus(500).send('Authentification Error');;
            }
            req.user = user;
            next();
        });
    }
}

//Statischer Token bis Registrierung und Login komplett implementiert wurden
//const staticToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/*function authenticateStaticToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Kein Token vorhanden

  if (token !== staticToken) return res.sendStatus(403); // Token ungültig

  next();
}*/

/**
 * Export der Funktion für die Routen
 */
module.exports = { authenticateToken };