const db = require('../config/db');

// Get all candidates (Admin view)
const getAllCandidates = async (req, res) => {
  try {
    const sql = `
      SELECT c.id,
             c.id AS candidate_id,
             c.election_id,
             c.candidate_name,
             c.candidate_name AS name,
             c.party_name,
             c.party_name AS party,
             c.description,
             c.candidate_photo,
             c.party_symbol,
             e.election_name AS election
      FROM candidates c
      JOIN elections e ON c.election_id = e.id
      ORDER BY c.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return res.json({ status: 'success', candidates: rows });
  } catch (error) {
    console.error('Get All Candidates Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Get candidates for a specific election
const getCandidatesByElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const sql = `
      SELECT c.id,
             c.id AS candidate_id,
             c.election_id,
             c.candidate_name,
             c.candidate_name AS name,
             c.party_name,
             c.party_name AS party,
             c.description,
             c.candidate_photo,
             c.party_symbol,
             e.election_name AS election
      FROM candidates c
      JOIN elections e ON c.election_id = e.id
      WHERE c.election_id = ?
    `;
    const [rows] = await db.query(sql, [electionId]);
    return res.json({ status: 'success', candidates: rows });
  } catch (error) {
    console.error('Get Candidates By Election Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Helper to normalize upload relative path with leading slash
function normalizePath(val) {
  if (!val || typeof val !== 'string') return null;
  val = val.trim();
  if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
    return val;
  }
  if (val.startsWith('uploads/')) {
    return `/${val}`;
  }
  return val;
}

// Create a candidate (Admin only)
const createCandidate = async (req, res) => {
  try {
    const { election_id, name, candidate_name, party, party_name, description, party_symbol, party_symbol_text } = req.body;
    const finalName = (candidate_name || name || '').trim();
    const finalParty = (party_name || party || '').trim();

    if (!election_id || !finalName || !finalParty) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide election_id, candidate name, and party.'
      });
    }

    // Resolve candidate photo path
    let candidate_photo = null;
    if (req.files && req.files.candidate_photo) {
      candidate_photo = req.files.candidate_photo.path;
    } else if (req.body.candidate_photo && !req.body.candidate_photo.includes('fakepath')) {
      candidate_photo = normalizePath(req.body.candidate_photo);
    }

    // Resolve party symbol (file path or text emoji)
    let party_symbol_val = null;
    const symFile = req.files && (req.files.party_symbol || req.files.party_symbol_file);
    if (symFile) {
      party_symbol_val = symFile.path;
    } else if (party_symbol && !party_symbol.includes('fakepath')) {
      party_symbol_val = normalizePath(party_symbol);
    } else if (party_symbol_text) {
      party_symbol_val = party_symbol_text.trim();
    }

    const sql = `
      INSERT INTO candidates (election_id, candidate_name, party_name, description, candidate_photo, party_symbol)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [election_id, finalName, finalParty, description || null, candidate_photo, party_symbol_val];
    const [result] = await db.query(sql, values);

    return res.status(201).json({
      status: 'success',
      message: 'Candidate added successfully!',
      candidateId: result.insertId,
      candidate_id: result.insertId,
      candidate_photo,
      party_symbol: party_symbol_val
    });
  } catch (error) {
    console.error('Create Candidate Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Update a candidate (Admin only)
const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { election_id, name, candidate_name, party, party_name, description, party_symbol, party_symbol_text } = req.body;
    const finalName = (candidate_name || name || '').trim();
    const finalParty = (party_name || party || '').trim();

    if (!election_id || !finalName || !finalParty) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide election_id, candidate name, and party.'
      });
    }

    // Fetch existing candidate to preserve files if not re-uploaded
    const [existingRows] = await db.query('SELECT candidate_photo, party_symbol FROM candidates WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Candidate not found.' });
    }
    const existing = existingRows[0];

    // Resolve candidate photo
    let candidate_photo = existing.candidate_photo;
    if (req.files && req.files.candidate_photo) {
      candidate_photo = req.files.candidate_photo.path;
    } else if (req.body.candidate_photo && !req.body.candidate_photo.includes('fakepath')) {
      candidate_photo = normalizePath(req.body.candidate_photo);
    }

    // Resolve party symbol
    let party_symbol_val = existing.party_symbol;
    const symFile = req.files && (req.files.party_symbol || req.files.party_symbol_file);
    if (symFile) {
      party_symbol_val = symFile.path;
    } else if (party_symbol && !party_symbol.includes('fakepath')) {
      party_symbol_val = normalizePath(party_symbol);
    } else if (party_symbol_text) {
      party_symbol_val = party_symbol_text.trim();
    }

    const sql = `
      UPDATE candidates 
      SET election_id = ?, candidate_name = ?, party_name = ?, description = ?, candidate_photo = ?, party_symbol = ?
      WHERE id = ?
    `;
    const values = [election_id, finalName, finalParty, description || null, candidate_photo, party_symbol_val, id];
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Candidate not found.' });
    }

    return res.json({
      status: 'success',
      message: 'Candidate updated successfully!',
      candidate_photo,
      party_symbol: party_symbol_val
    });
  } catch (error) {
    console.error('Update Candidate Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Delete a candidate (Admin only)
const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM candidates WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Candidate not found.' });
    }

    return res.json({ status: 'success', message: 'Candidate deleted successfully!' });
  } catch (error) {
    console.error('Delete Candidate Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  getAllCandidates,
  getCandidatesByElection,
  createCandidate,
  updateCandidate,
  deleteCandidate
};
