const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mediaController = require('../controllers/mediaController');
const { verifyToken, checkRole } = require('../middleware/checkAuth');

// --- Multer Configuration for File Uploads ---
// This sets up where to store the files and how to name them
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Store files in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
// --- End of Multer Configuration ---


// @route   POST /api/media/upload
// @desc    Upload a new photo/video
// @access  Private (Creator only)
router.post(
  '/upload', 
  verifyToken, 
  upload.single('mediaFile'), // 'mediaFile' must match the name attribute in the HTML form
  mediaController.uploadMedia
);

// @route   GET /api/media
// @desc    Get all media for the public feed
// @access  Public
router.get('/', verifyToken, mediaController.getAllMedia);

// @route   POST /api/media/:id/comment
// @desc    Add a comment to a media item
// @access  Private (Any logged-in user)
router.post('/:id/comment', verifyToken, mediaController.addComment);

// @route   POST /api/media/:id/rate
// @desc    Add a rating to a media item
// @access  Private (Any logged-in user)
router.post('/:id/rate', verifyToken, mediaController.addRating);
// @route   DELETE /api/media/:id
// @desc    Delete a media post
// @access  Private (Owner only)
router.delete('/:id', verifyToken, mediaController.deleteMedia);

// @route   PUT /api/media/:id
// @desc    Update a media post's details
// @access  Private (Owner only)
router.put('/:id', verifyToken, mediaController.updateMedia);
// @route   POST /api/media/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', verifyToken, mediaController.likeMedia);

// @route   DELETE /api/media/:id/unlike
// @desc    Unlike a post
// @access  Private
router.delete('/:id/unlike', verifyToken, mediaController.unlikeMedia);

// @route   GET /api/media/:id/comments
// @desc    Get all comments for a post
// @access  Private
router.get('/:id/comments', verifyToken, mediaController.getCommentsForMedia);
module.exports = router;