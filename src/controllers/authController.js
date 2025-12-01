const db = require('../models/db');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// --- 1. User Login ---
exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

  // IMPORTANT: In a real-world application, you MUST hash and salt passwords.
  // We are storing plain text passwords here only for academic simplicity.
  db.get(query, [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // User is authenticated, now create a token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Sign the token
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

    // Send the token and user role back to the client
    res.json({
      message: 'Logged in successfully!',
      token: token,
      role: user.role,
      userId: user.id
    });
  });
};


// --- 2. New User Registration ---
exports.register = (req, res) => {
  // Although the signup form has an 'email' and 'fullName' field,
  // our simple database only stores username, password, and role.
  // We'll primarily use username and password here.
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  // Check if username already exists
  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  db.get(checkUserQuery, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error during user check', error: err.message });
    }
    if (user) {
      // 409 Conflict is the correct status code for a resource that already exists.
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    // Insert new user into the database
    const insertUserQuery = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    // All new signups are automatically given the 'consumer' role.
    db.run(insertUserQuery, [username, password, 'creator'], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error on registration', error: err.message });
      }
      res.status(201).json({ message: 'User registered successfully! Please log in.' });
    });
  });
};