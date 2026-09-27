const express = require('express');
const router = express.Router();
const { castVote, getMyVotes } = require('../controllers/voteController');
const { protect } = require('../middleware/authMiddleware');

// Protected voting routes
router.post('/', protect, castVote);
router.get('/my-votes', protect, getMyVotes);

module.exports = router;
