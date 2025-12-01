const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Middleware to verify the token on protected routes
const verifyToken = (req, res, next) => {
  // Get token from header (format: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Failed to authenticate token.' });
    }

    // If everything is good, save the decoded user info to the request for use in other routes
    req.user = decoded;
    next();
  });
};

// Middleware to check if the user has a specific role
const checkRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next(); // Role is correct, proceed
    } else {
      res.status(403).json({ message: `Access denied. Requires '${role}' role.` });
    }
  };
};

module.exports = { verifyToken, checkRole };