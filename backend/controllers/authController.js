const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

// 1. Register User (Voter)
const register = async (req, res) => {
  try {
    const { name, email, voter_id, phone, password, address } = req.body;

    if (!name || !email || !voter_id || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, email, voter_id, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check email
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'This email is already registered.'
      });
    }

    // Check voter ID
    const [existingVoterId] = await db.query('SELECT id FROM users WHERE voter_id = ?', [voter_id]);
    if (existingVoterId.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'This Voter ID is already registered.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const sql = `
      INSERT INTO users (name, email, voter_id, phone, password, role, address)
      VALUES (?, ?, ?, ?, ?, 'voter', ?)
    `;
    const values = [name, email, voter_id, phone || null, hashedPassword, address || null];
    await db.query(sql, values);

    return res.status(201).json({
      status: 'success',
      message: 'Registration successful! You can now log in.'
    });

  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.'
    });
  }
};

// 2. Login User (Voter or Admin)
const login = async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.username || req.body.voter_id || '').trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter both email and password.'
      });
    }

    // Find user in database by email OR voter_id (case-insensitive & trimmed)
    const sql = 'SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(?) OR LOWER(TRIM(voter_id)) = LOWER(?)';
    const [users] = await db.query(sql, [identifier, identifier]);
    
    if (users.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // Check password securely with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      voter_id: user.voter_id
    });

    return res.json({
      status: 'success',
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        voter_id: user.voter_id,
        phone: user.phone,
        address: user.address,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.'
    });
  }
};

// 3. Get User Profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, voter_id, phone, role, address, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    return res.json({
      status: 'success',
      user: users[0]
    });

  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error.'
    });
  }
};

// 4. Update Profile (Voter self-update)
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }

    const sql = 'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?';
    await db.query(sql, [name, phone || null, address || null, userId]);

    // Fetch updated user
    const [users] = await db.query(
      'SELECT id, name, email, voter_id, phone, role, address, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      status: 'success',
      message: 'Profile updated successfully!',
      user: users[0]
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
