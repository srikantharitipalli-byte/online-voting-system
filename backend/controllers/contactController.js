const db = require('../config/db');

// Basic in-memory rate limiting against spam/automated floods: max 5 requests per 5 minutes per IP
const submissionTracker = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Clean up tracker entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of submissionTracker.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      submissionTracker.delete(ip);
    } else {
      submissionTracker.set(ip, valid);
    }
  }
}, 10 * 60 * 1000).unref();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public: Submit a contact message
 * POST /api/contact
 */
const submitContactMessage = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Check rate limit
    const timestamps = submissionTracker.get(clientIp) || [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many messages sent. Please wait a few minutes before submitting again.'
      });
    }

    const { name, email, subject, message } = req.body || {};

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please provide your full name.' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ status: 'error', message: 'Name must not exceed 100 characters.' });
    }

    // Validate email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please provide a valid email address.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 150) {
      return res.status(400).json({ status: 'error', message: 'Email address must not exceed 150 characters.' });
    }
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ status: 'error', message: 'Please provide a valid email address format (e.g., user@example.com).' });
    }

    // Validate subject (optional)
    let cleanSubject = null;
    if (subject && typeof subject === 'string' && subject.trim().length > 0) {
      if (subject.trim().length > 200) {
        return res.status(400).json({ status: 'error', message: 'Subject must not exceed 200 characters.' });
      }
      cleanSubject = subject.trim();
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please provide a message.' });
    }
    if (message.trim().length > 5000) {
      return res.status(400).json({ status: 'error', message: 'Message is too long (maximum 5000 characters).' });
    }

    // Insert into contact_messages using parameterized query
    const sql = `
      INSERT INTO contact_messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [name.trim(), cleanEmail, cleanSubject, message.trim()]);

    // Record submission for rate limiting
    recent.push(now);
    submissionTracker.set(clientIp, recent);

    return res.status(201).json({
      status: 'success',
      message: 'Thank you! Your message has been sent successfully. We will get back to you shortly.',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Submit Contact Message Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send your message. Please try again later.'
    });
  }
};

/**
 * Admin: Get all contact messages
 * GET /api/contact
 */
const getAllContactMessages = async (req, res) => {
  try {
    const sql = `
      SELECT id, name, email, subject, message, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql);
    const unreadCount = rows.filter(r => r.status === 'unread').length;

    return res.json({
      status: 'success',
      total: rows.length,
      unreadCount,
      messages: rows
    });
  } catch (error) {
    console.error('Get All Contact Messages Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * Admin: Mark a contact message as read
 * PATCH /api/contact/:id/read or PUT /api/contact/:id/read
 */
const markContactMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      'UPDATE contact_messages SET status = "read" WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Contact message not found.' });
    }

    return res.json({
      status: 'success',
      message: 'Message marked as read successfully.'
    });
  } catch (error) {
    console.error('Mark Message Read Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  submitContactMessage,
  getAllContactMessages,
  markContactMessageAsRead
};
