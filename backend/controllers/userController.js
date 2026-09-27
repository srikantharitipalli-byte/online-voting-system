const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const sql = 'SELECT id, name, email, voter_id, phone, role, address, created_at FROM users ORDER BY created_at DESC';
    const [rows] = await db.query(sql);
    return res.json({ status: 'success', users: rows });
  } catch (error) {
    console.error('Get All Users Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Create a new user (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, voter_id, phone, password, role, address } = req.body;

    if (!name || !email || !voter_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and voter_id.'
      });
    }

    // Default password if not provided
    const userPassword = password || 'voterpassword123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userPassword, salt);

    // Check email duplicates
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ status: 'error', message: 'This email is already registered.' });
    }

    // Check voter ID duplicates
    const [existingVoterId] = await db.query('SELECT id FROM users WHERE voter_id = ?', [voter_id]);
    if (existingVoterId.length > 0) {
      return res.status(400).json({ status: 'error', message: 'This Voter ID is already registered.' });
    }

    const sql = `
      INSERT INTO users (name, email, voter_id, phone, password, role, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [name, email, voter_id, phone || null, hashedPassword, role || 'voter', address || null];
    const [result] = await db.query(sql, values);

    return res.status(201).json({
      status: 'success',
      message: 'User created successfully!',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create User Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Update user details (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, voter_id, phone, role, address } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and role.'
      });
    }

    const sql = `
      UPDATE users 
      SET name = ?, email = ?, voter_id = ?, phone = ?, role = ?, address = ?
      WHERE id = ?
    `;
    const values = [name, email, voter_id || null, phone || null, role, address || null, id];
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    return res.json({ status: 'success', message: 'User updated successfully!' });
  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Delete a user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    return res.json({ status: 'success', message: 'User deleted successfully!' });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
