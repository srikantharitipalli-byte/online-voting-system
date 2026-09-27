const db = require('../config/db');

// Cast a vote
const castVote = async (req, res) => {
  try {
    const { election_id, candidate_id, latitude, longitude } = req.body;
    const user_id = req.user.id;

    if (!election_id || !candidate_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both election_id and candidate_id.'
      });
    }

    // Geolocation Verification
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({
        status: 'error',
        message: 'Location verification is mandatory to cast a vote. Please allow location access.'
      });
    }

    const latVal = Number(latitude);
    const lngVal = Number(longitude);
    if (latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location coordinates. Voting is denied.'
      });
    }

    // 1. Check if the election exists and is active
    const [elections] = await db.query('SELECT * FROM elections WHERE id = ?', [election_id]);
    if (elections.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Election not found.' });
    }

    const election = elections[0];
    
    // Validate election dates
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (now < startDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Voting has not started yet.'
      });
    }

    if (now > endDate || election.status === 'closed') {
      return res.status(400).json({
        status: 'error',
        message: 'Voting for this election has ended.'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'This election is not currently active.'
      });
    }

    // 2. Check if the candidate exists and belongs to this election
    const [candidates] = await db.query(
      'SELECT * FROM candidates WHERE id = ? AND election_id = ?',
      [candidate_id, election_id]
    );
    if (candidates.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found or does not belong to this election.'
      });
    }

    // 3. Check if the user has already voted in this election
    const [existingVotes] = await db.query(
      'SELECT id FROM votes WHERE user_id = ? AND election_id = ?',
      [user_id, election_id]
    );
    if (existingVotes.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already voted in this election.'
      });
    }

    // 4. Record the vote in MySQL database
    const sql = 'INSERT INTO votes (user_id, election_id, candidate_id) VALUES (?, ?, ?)';
    await db.query(sql, [user_id, election_id, candidate_id]);

    return res.status(201).json({
      status: 'success',
      message: 'Your vote has been submitted successfully!',
      votedAt: new Date().toISOString()
    });

  } catch (error) {
    // Handle database duplicate key error just in case (unique constraint unique_user_election)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        status: 'error',
        message: 'You have already voted in this election.'
      });
    }
    console.error('Cast Vote Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Get current user's voting history
const getMyVotes = async (req, res) => {
  try {
    const user_id = req.user.id;
    const sql = `
      SELECT v.id, v.voted_at, v.election_id, v.candidate_id,
             e.election_name AS election, 
             c.candidate_name AS candidate, 
             c.party_name AS party
      FROM votes v
      JOIN elections e ON v.election_id = e.id
      JOIN candidates c ON v.candidate_id = c.id
      WHERE v.user_id = ?
      ORDER BY v.voted_at DESC
    `;
    const [rows] = await db.query(sql, [user_id]);
    return res.json({ status: 'success', votes: rows });
  } catch (error) {
    console.error('Get My Votes Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  castVote,
  getMyVotes
};
