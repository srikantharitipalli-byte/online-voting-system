const db = require('../config/db');

// Get all elections
const getElections = async (req, res) => {
  try {
    const sql = `
      SELECT e.id, e.election_name AS name, e.status, e.description, 
             e.start_date, e.end_date,
             DATE_FORMAT(e.start_date, '%d %M %Y') AS date,
             COUNT(c.id) AS candidates
      FROM elections e
      LEFT JOIN candidates c ON e.id = c.election_id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return res.json({ status: 'success', elections: rows });
  } catch (error) {
    console.error('Get Elections Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Get a specific election
const getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT e.id, e.election_name AS name, e.status, e.description, 
             e.start_date, e.end_date,
             DATE_FORMAT(e.start_date, '%d %M %Y') AS date,
             COUNT(c.id) AS candidates
      FROM elections e
      LEFT JOIN candidates c ON e.id = c.election_id
      WHERE e.id = ?
      GROUP BY e.id
    `;
    const [rows] = await db.query(sql, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Election not found.' });
    }
    
    return res.json({ status: 'success', election: rows[0] });
  } catch (error) {
    console.error('Get Election By ID Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Create a new election (Admin only)
const createElection = async (req, res) => {
  try {
    const { election_name, description, start_date, end_date, status } = req.body;

    if (!election_name || !start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide election_name, start_date, and end_date.'
      });
    }

    const sql = `
      INSERT INTO elections (election_name, description, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [election_name, description || null, start_date, end_date, status || 'pending'];
    const [result] = await db.query(sql, values);

    return res.status(201).json({
      status: 'success',
      message: 'Election created successfully!',
      electionId: result.insertId
    });
  } catch (error) {
    console.error('Create Election Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Update an election (Admin only)
const updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { election_name, description, start_date, end_date, status } = req.body;

    if (!election_name || !start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide election_name, start_date, and end_date.'
      });
    }

    const sql = `
      UPDATE elections 
      SET election_name = ?, description = ?, start_date = ?, end_date = ?, status = ?
      WHERE id = ?
    `;
    const values = [election_name, description || null, start_date, end_date, status, id];
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Election not found.' });
    }

    return res.json({ status: 'success', message: 'Election updated successfully!' });
  } catch (error) {
    console.error('Update Election Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Delete an election (Admin only)
const deleteElection = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM elections WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Election not found.' });
    }

    return res.json({ status: 'success', message: 'Election deleted successfully!' });
  } catch (error) {
    console.error('Delete Election Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection
};
