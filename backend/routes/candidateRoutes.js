const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidatesByElection,
  createCandidate,
  updateCandidate,
  deleteCandidate
} = require('../controllers/candidateController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// Get endpoints (voters and admin)
router.get('/', protect, getAllCandidates);
router.get('/:electionId', protect, getCandidatesByElection);

// Admin endpoints
router.post('/', protect, adminOnly, uploadMiddleware, createCandidate);
router.put('/:id', protect, adminOnly, uploadMiddleware, updateCandidate);
router.delete('/:id', protect, adminOnly, deleteCandidate);

module.exports = router;
