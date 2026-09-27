const express = require('express');
const router = express.Router();
const { getElectionResults, getAdminSummary } = require('../controllers/resultController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Get summary stats (Admin only, place before /:electionId route)
router.get('/admin-summary', protect, adminOnly, getAdminSummary);

// Get results for specific election (voters and admin)
router.get('/:electionId', protect, getElectionResults);

module.exports = router;
