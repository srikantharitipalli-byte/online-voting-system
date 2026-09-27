const express = require('express');
const router = express.Router();
const {
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection
} = require('../controllers/electionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Get all or single election (voters and admin)
router.get('/', protect, getElections);
router.get('/:id', protect, getElectionById);

// Admin-only CRUD actions
router.post('/', protect, adminOnly, createElection);
router.put('/:id', protect, adminOnly, updateElection);
router.delete('/:id', protect, adminOnly, deleteElection);

module.exports = router;
