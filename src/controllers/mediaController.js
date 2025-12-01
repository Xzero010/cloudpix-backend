const db = require('../models/db');
const path = require('path');

// 1. Upload new media (for creators)
exports.uploadMedia = (req, res) => {
  const { title, caption, location, people } = req.body;
  const file = req.file;
  const userId = req.user.id; // We get this from the checkAuth middleware

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  // For local storage, the file path is relative to the server's root
  const filePath = `/uploads/${file.filename}`;

  const query = `INSERT INTO media (title, caption, location, people, filePath, userId) VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(query, [title, caption, location, people, filePath, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error on insert', error: err.message });
    }
    res.status(201).json({ message: 'File uploaded successfully!', mediaId: this.lastID, filePath });
  });
};

// 2. Get all media (for consumers)
// 2. Get all media (for consumers)
exports.getAllMedia = (req, res) => {
  // Safely handle logged-in or anonymous user
  const currentUserId = req.user ? req.user.id : null;

  const query = `
      SELECT
          m.id, m.title, m.caption, m.filePath, m.createdAt, m.userId,
          u.username AS creatorUsername,
          (SELECT COUNT(*) FROM likes WHERE mediaId = m.id) AS likeCount,
          (SELECT COUNT(*) FROM comments WHERE mediaId = m.id) AS commentCount,
          (SELECT COUNT(*) FROM likes WHERE mediaId = m.id AND userId = ?) AS userHasLiked,
          (
              SELECT c.text 
              FROM comments c 
              WHERE c.mediaId = m.id 
              ORDER BY c.createdAt DESC 
              LIMIT 1
          ) AS latestCommentText,
          (
              SELECT u.username 
              FROM comments c 
              JOIN users u ON c.userId = u.id 
              WHERE c.mediaId = m.id 
              ORDER BY c.createdAt DESC 
              LIMIT 1
          ) AS latestCommentUsername
      FROM media m
      JOIN users u ON m.userId = u.id
      ORDER BY m.createdAt DESC;
  `;

  db.all(query, [currentUserId || 0], (err, rows) => {
    if (err) {
      console.error("❌ Database error on fetch:", err.message);
      return res.status(500).json({ message: 'Database error on fetch', error: err.message });
    }

    // Fix Windows slashes and null fields
    const fixedRows = rows.map(r => ({
      ...r,
      filePath: r.filePath?.replace(/\\/g, '/'),
      userHasLiked: r.userHasLiked > 0
    }));

    res.json(fixedRows);
  });
};



// 3. Add a comment to a media item
exports.addComment = (req, res) => {
  const mediaId = req.params.id;
  const userId = req.user.id; // From checkAuth middleware
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  const query = `INSERT INTO comments (text, mediaId, userId) VALUES (?, ?, ?)`;
  db.run(query, [text, mediaId, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error on comment', error: err.message });
    }
    res.status(201).json({ message: 'Comment added successfully!', commentId: this.lastID });
  });
};

// 4. Add a rating to a media item
exports.addRating = (req, res) => {
  const mediaId = req.params.id;
  const userId = req.user.id;
  const { value } = req.body;

  if (!value || value < 1 || value > 5) {
    return res.status(400).json({ message: 'Rating value must be between 1 and 5.' });
  }
  
  // Using INSERT OR REPLACE to handle new ratings and updates
  // The UNIQUE constraint on (mediaId, userId) in the DDL makes this work
  const query = `
    INSERT INTO ratings (value, mediaId, userId) 
    VALUES (?, ?, ?)
    ON CONFLICT(mediaId, userId) DO UPDATE SET value = excluded.value;
  `;

  db.run(query, [value, mediaId, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error on rating', error: err.message });
    }
    res.status(201).json({ message: 'Rating submitted successfully!' });
  });
};
// 5. Delete a media item (Owner only)
exports.deleteMedia = (req, res) => {
  const mediaId = req.params.id;
  const requestingUserId = req.user.id; // User making the request

  // First, get the ID of the user who owns the post
  const getOwnerQuery = 'SELECT userId FROM media WHERE id = ?';
  db.get(getOwnerQuery, [mediaId], (err, post) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // *** THE OWNERSHIP CHECK ***
    if (post.userId !== requestingUserId) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this post.' });
    }

    // If the check passes, delete the post
    const deleteQuery = 'DELETE FROM media WHERE id = ?';
    db.run(deleteQuery, [mediaId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete post', error: err.message });
      }
      // We should also delete the file from storage here (Azure Blob Storage later)
      res.status(200).json({ message: 'Post deleted successfully.' });
    });
  });
};

// 6. Update a media item (Owner only)
exports.updateMedia = (req, res) => {
  const mediaId = req.params.id;
  const requestingUserId = req.user.id;
  const { title, caption } = req.body; // What can be edited

  // Get the owner of the post
  const getOwnerQuery = 'SELECT userId FROM media WHERE id = ?';
  db.get(getOwnerQuery, [mediaId], (err, post) => {
    if (err) { return res.status(500).json({ message: 'Database error', error: err.message }); }
    if (!post) { return res.status(404).json({ message: 'Post not found.' }); }

    // *** THE OWNERSHIP CHECK ***
    if (post.userId !== requestingUserId) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this post.' });
    }

    // If the check passes, update the post
    const updateQuery = 'UPDATE media SET title = ?, caption = ? WHERE id = ?';
    db.run(updateQuery, [title, caption, mediaId], function(err) {
      if (err) { return res.status(500).json({ message: 'Failed to update post', error: err.message }); }
      res.status(200).json({ message: 'Post updated successfully.' });
    });
  });
};
// 7. Like a media item
exports.likeMedia = (req, res) => {
    const mediaId = req.params.id;
    const userId = req.user.id;
    const query = 'INSERT INTO likes (userId, mediaId) VALUES (?, ?)';
    db.run(query, [userId, mediaId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(201).json({ message: 'Post liked successfully.' });
    });
};

// 8. Unlike a media item
exports.unlikeMedia = (req, res) => {
    const mediaId = req.params.id;
    const userId = req.user.id;
    const query = 'DELETE FROM likes WHERE userId = ? AND mediaId = ?';
    db.run(query, [userId, mediaId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(200).json({ message: 'Post unliked successfully.' });
    });
};

// 9. Get all comments for a specific media item
exports.getCommentsForMedia = (req, res) => {
    const mediaId = req.params.id;
    const query = `
        SELECT c.id, c.text, c.createdAt, u.username
        FROM comments c
        JOIN users u ON c.userId = u.id
        WHERE c.mediaId = ?
        ORDER BY c.createdAt ASC;
    `;
    db.all(query, [mediaId], (err, comments) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(comments);
    });
};