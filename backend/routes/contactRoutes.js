const express = require('express');
const router = express.Router();
const {
  submitContactMessage,
  getAllContactMessages,
  markContactMessageAsRead
} = require('../controllers/contactController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route: Any visitor can send a contact inquiry
router.post('/', submitContactMessage);

// Admin-only routes: View inquiries & mark as read
router.get('/', protect, adminOnly, getAllContactMessages);
router.patch('/:id/read', protect, adminOnly, markContactMessageAsRead);
router.put('/:id/read', protect, adminOnly, markContactMessageAsRead);

module.exports = router;
