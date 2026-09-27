const db = require('../config/db');

// Get results for a specific election
const getElectionResults = async (req, res) => {
  try {
    const { electionId } = req.params;

    // 1. Get election details
    const [elections] = await db.query('SELECT election_name FROM elections WHERE id = ?', [electionId]);
    if (elections.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Election not found.' });
    }
    const electionName = elections[0].election_name;

    // 2. Get total votes for this election
    const [totalVotesRow] = await db.query('SELECT COUNT(*) AS total FROM votes WHERE election_id = ?', [electionId]);
    const totalVotes = totalVotesRow[0].total;

    // 3. Get candidates with their vote counts
    const sql = `
      SELECT c.id, c.candidate_name AS name, c.party_name AS party, c.description,
             c.candidate_photo, c.party_symbol,
             COUNT(v.id) AS votes
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
      WHERE c.election_id = ?
      GROUP BY c.id
      ORDER BY votes DESC
    `;
    const [candidates] = await db.query(sql, [electionId, electionId]);

    // 4. Calculate percentages
    const results = candidates.map(c => {
      const votes = c.votes;
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';
      return {
        id: c.id,
        name: c.name,
        party: c.party,
        party_symbol: c.party_symbol,
        candidate_photo: c.candidate_photo,
        description: c.description,
        votes: votes,
        percentage: percentage
      };
    });

    return res.json({
      status: 'success',
      electionName,
      totalVotes,
      candidates: results
    });

  } catch (error) {
    console.error('Get Election Results Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Get summary stats for admin dashboard
const getAdminSummary = async (req, res) => {
  try {
    const [usersCount] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'voter'");
    const [candidatesCount] = await db.query('SELECT COUNT(*) AS total FROM candidates');
    const [activeElectionsCount] = await db.query("SELECT COUNT(*) AS total FROM elections WHERE status = 'active'");
    const [votesCount] = await db.query('SELECT COUNT(*) AS total FROM votes');

    return res.json({
      status: 'success',
      stats: {
        totalUsers: usersCount[0].total,
        totalCandidates: candidatesCount[0].total,
        activeElections: activeElectionsCount[0].total,
        totalVotes: votesCount[0].total
      }
    });
  } catch (error) {
    console.error('Get Admin Summary Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  getElectionResults,
  getAdminSummary
};
