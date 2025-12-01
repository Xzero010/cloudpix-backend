const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to the database file
const dbPath = path.resolve(__dirname, '../../database/cloudpix.db');

// Create a new database connection
// This will create the file if it doesn't exist
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// Function to create database tables and seed initial users
function createTables() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('creator', 'consumer'))
    );
  `;

  const mediaTable = `
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      caption TEXT,
      location TEXT,
      people TEXT,
      filePath TEXT NOT NULL,
      mediaType TEXT NOT NULL DEFAULT 'image',
      userId INTEGER NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `;

  const commentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      mediaId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mediaId) REFERENCES media (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `;

  const ratingsTable = `
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value INTEGER NOT NULL CHECK(value >= 1 AND value <= 5),
      mediaId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mediaId) REFERENCES media (id),
      FOREIGN KEY (userId) REFERENCES users (id),
      UNIQUE(mediaId, userId)
    );
  `;

  const followersTable = `
    CREATE TABLE IF NOT EXISTS followers (
      followerId INTEGER NOT NULL,
      followingId INTEGER NOT NULL,
      PRIMARY KEY (followerId, followingId),
      FOREIGN KEY (followerId) REFERENCES users (id),
      FOREIGN KEY (followingId) REFERENCES users (id)
    );
  `;

  const likesTable = `
    CREATE TABLE IF NOT EXISTS likes (
      userId INTEGER NOT NULL,
      mediaId INTEGER NOT NULL,
      PRIMARY KEY (userId, mediaId),
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (mediaId) REFERENCES media (id)
    );
  `;

  // Execute all table creation queries
  db.serialize(() => {
    db.run(usersTable)
      .run(mediaTable)
      .run(commentsTable)
      .run(ratingsTable)
      .run(followersTable)
      .run(likesTable);
  });
}

module.exports = db;
