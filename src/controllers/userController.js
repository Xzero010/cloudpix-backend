const db = require('../models/db');

// Follow a user
exports.followUser = (req, res) => {
  const followerId = req.user.id; // The logged-in user
  const followingId = req.params.id; // The user to be followed

  if (followerId == followingId) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  const query = 'INSERT INTO followers (followerId, followingId) VALUES (?, ?)';
  db.run(query, [followerId, followingId], function(err) {
    if (err) {
      // If it's a UNIQUE constraint error, it means they are already following.
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ message: 'You are already following this user.' });
      }
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.status(201).json({ message: `Successfully followed user ${followingId}.` });
  });
};

// Unfollow a user
exports.unfollowUser = (req, res) => {
    const followerId = req.user.id;
    const followingId = req.params.id;

    const query = 'DELETE FROM followers WHERE followerId = ? AND followingId = ?';
    db.run(query, [followerId, followingId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'You were not following this user.' });
        }
        res.status(200).json({ message: `Successfully unfollowed user ${followingId}.` });
    });
};

// Get user suggestions (users the current user is not already following)
exports.getSuggestions = (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT id, username FROM users
        WHERE id != ? AND id NOT IN (
            SELECT followingId FROM followers WHERE followerId = ?
        )
        LIMIT 5; -- Suggest up to 5 users
    `;
    db.all(query, [userId, userId], (err, users) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(users);
    });
};
exports.getUserPosts = (req, res) => {
  const userId = req.user.id; // Get user ID from the verified token
  const query = 'SELECT * FROM media WHERE userId = ? ORDER BY createdAt DESC';

  db.all(query, [userId], (err, posts) => {
    if (err) {
      return res.status(500).json({ message: 'Database error fetching user posts', error: err.message });
    }
    res.json(posts);
  });
};