/**
 * Middleware zur Authentifizierung eines JSON Web Tokens (JWT).
 * Überprüft den Authorization-Header und validiert den Token.
 * @module Authentification-Middleware
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
    
    if (token != null){
    try {
        const user = jwt.verify(token, process.env.SECRET_KEY);
        req.user = user;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
          res.status(403).json({ message: 'Token abgelaufen' });
      } else {
          res.status(500).send('Authentication Error');
      }
  }
} else {
  res.status(401).send('Invalid Token');
}
  next();
}

/**
 * @function verifyToken
 * @param {Object} token - The JWT token to verify.
 * @returns {Promise<Object>} A promise that resolves with the decoded token object if valid, or rejects with an error message if invalid.
*/
function verifyToken(token) {
  return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
          if (err) {
              reject('Invalid token');
          }else{
              resolve(decoded);
          }
      })
  })
}

module.exports = {
  authenticateToken,
  verifyToken
};