const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/checkAuth');


// @route   GET /api/users/me/posts
// @desc    Get all posts for the currently logged-in user
// @access  Private
router.get('/me/posts', verifyToken, userController.getUserPosts);
// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', verifyToken, userController.followUser);

// @route   DELETE /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.delete('/:id/unfollow', verifyToken, userController.unfollowUser);

// @route   GET /api/users/suggestions
// @desc    Get user suggestions to follow
// @access  Private
router.get('/suggestions', verifyToken, userController.getSuggestions);

module.exports = router;