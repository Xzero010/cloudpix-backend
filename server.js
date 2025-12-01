const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const db = require('./src/models/db'); // This ensures the DB is initialized when the server starts

// --- Route Imports ---
const authRoutes = require('./src/api/auth');
const mediaRoutes = require('./src/api/media');
const userRoutes = require('./src/api/users');

// --- App Initialization ---
const app = express();

// --- Middleware ---
app.use(cors()); // Allows cross-origin requests (from our frontend)
app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parses form data

// --- Static File Serving ---
// This makes the 'uploads' folder publicly accessible
app.use('/uploads', express.static('uploads'));


// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/users', userRoutes);
// --- Simple Root Route for Testing ---
app.get('/', (req, res) => {
  res.send('CloudPix Backend API is running!');
});

// --- Server Startup ---
app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});