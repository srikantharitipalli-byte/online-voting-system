// js/result.js
const REFRESH_INTERVAL_MS = 5000;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  // Guard route
  requireLogin();
  
  loadResults();
  refreshInterval = setInterval(loadResults, REFRESH_INTERVAL_MS);
});

async function loadResults() {
  const user = Auth.getUser();
  if (!user) {
    Auth.logout();
    return;
  }

  // Get selected election ID from localStorage
  let electionId = Number(localStorage.getItem('selectedElection'));

  try {
    // 1. Fetch user's vote history from backend
    const votesRes = await apiFetch('/api/votes/my-votes');
    const votesData = await votesRes.json();
    const myVotes = votesData.votes || [];

    // If no election selected in localStorage, default to their most recent vote
    if (!electionId && myVotes.length > 0) {
      electionId = myVotes[0].election_id;
      localStorage.setItem('selectedElection', electionId);
    }

    // 2. Check if the user has voted in the current election
    const currentVote = myVotes.find(v => v.election_id === electionId);

    if (!currentVote) {
      // User hasn't voted in this election yet - show prompt to vote
      showVotePrompt();
      const leaderBanner = document.getElementById('leaderBanner');
      if (leaderBanner) leaderBanner.style.display = 'none';
      return;
    }

    // 3. Fetch results for this election from backend
    const resultsRes = await apiFetch(`/api/results/${electionId}`);
    const resultsData = await resultsRes.json();

    if (resultsRes.ok && resultsData.status === 'success') {
      const totalVotes = resultsData.totalVotes;
      const candidates = resultsData.candidates || [];

      // Display total votes and turnout
      const totalVotesEl = document.getElementById('totalVotes');
      if (totalVotesEl) {
        totalVotesEl.textContent = totalVotes;
      }

      const turnoutPctEl = document.getElementById('turnoutPct');
      if (turnoutPctEl) {
        turnoutPctEl.textContent = totalVotes > 0 ? '100%' : '0%';
      }

      // Update Leader Banner (Top Candidate)
      const leaderBanner = document.getElementById('leaderBanner');
      if (leaderBanner && candidates.length > 0) {
        const leader = candidates[0];
        if (leader.votes > 0) {
          leaderBanner.style.display = 'flex';
          const leaderName = document.getElementById('leaderName');
          const leaderParty = document.getElementById('leaderParty');
          const leaderVotes = document.getElementById('leaderVotes');
          
          if (leaderName) leaderName.textContent = leader.name;
          if (leaderParty) leaderParty.textContent = leader.party;
          if (leaderVotes) leaderVotes.textContent = `${leader.votes} votes (${leader.percentage}%)`;
        } else {
          leaderBanner.style.display = 'none';
        }
      } else if (leaderBanner) {
        leaderBanner.style.display = 'none';
      }

      // Render Receipt and Live results
      renderResultsView(currentVote, candidates, resultsData.electionName, totalVotes);
    } else {
      console.error('Failed to fetch election results:', resultsData.message);
    }
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

function renderResultsView(voteRecord, candidates, electionName, totalVotes) {
  const resultsList = document.getElementById('resultsList');
  if (!resultsList) return;

  const votedDate = new Date(voteRecord.voted_at);
  const votedDateStr = votedDate.toLocaleDateString();
  const votedTimeStr = votedDate.toLocaleTimeString();

  resultsList.innerHTML = `
    <div class="result-section" style="margin-bottom: 32px;">
      <h2 style="margin-bottom: 20px;">Your Vote Receipt</h2>
      <div class="result-receipt" style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voter Name</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${escapeHtml(Auth.getUser().name)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voter ID</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; font-family: monospace;">${escapeHtml(Auth.getUser().voter_id)}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Election</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${escapeHtml(electionName)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voted For</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; color: #1976d2;">${escapeHtml(voteRecord.candidate)}</p>
          </div>
        </div>

        <div style="border-top: 1px solid #ddd; margin-top: 16px; padding-top: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Party</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${escapeHtml(voteRecord.party)}</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voting Date</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${votedDateStr}</p>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voting Time</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${votedTimeStr}</p>
          </div>
        </div>
      </div>

      <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; border-radius: 4px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px; color: #2e7d32;">✓</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #2e7d32;">Vote Submitted Successfully</p>
            <p style="margin: 4px 0 0 0; color: #558b2f; font-size: 14px;">Your vote has been securely recorded and stored in the database.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="result-section">
      <h2 style="margin-bottom: 20px;">Live Election Results</h2>
      ${renderCandidateResults(candidates, totalVotes)}
    </div>
  `;
}

function renderCandidateResults(candidates, totalVotes) {
  if (!candidates || candidates.length === 0) {
    return '<p>No candidates available.</p>';
  }

  const maxVotes = Math.max(...candidates.map(cand => cand.votes), 1);

  return candidates.map((c, idx) => {
    const votes = c.votes;
    const percentage = c.percentage;
    const isLeader = idx === 0 && votes > 0;

    // Candidate photo HTML
    const photoUrl = c.candidate_photo ? getImageUrl(c.candidate_photo) : '';
    const photoHtml = photoUrl
      ? `<img src="${photoUrl}" alt="${escapeHtml(c.name)}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; flex-shrink: 0;">`
      : `<div style="width: 42px; height: 42px; border-radius: 50%; background: #1976d2; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">${escapeHtml((c.name || 'C').substring(0, 2).toUpperCase())}</div>`;

    // Party symbol HTML
    let symbolHtml = '';
    if (isImagePath(c.party_symbol)) {
      symbolHtml = `<img src="${getImageUrl(c.party_symbol)}" alt="Symbol" style="width: 20px; height: 20px; object-fit: contain; vertical-align: middle; margin-right: 6px; border-radius: 2px;">`;
    } else if (c.party_symbol) {
      symbolHtml = `<span style="font-size: 16px; margin-right: 6px;">${escapeHtml(c.party_symbol)}</span>`;
    }

    return `
      <div class="result-row ${isLeader ? 'rank-1' : ''}" style="padding: 16px; border-bottom: 1px solid #eee; margin-bottom: 8px; border-radius: 8px; ${isLeader ? 'background: #f0f7ff;' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${photoHtml}
            <div>
              <span style="font-weight: 600; font-size: 16px;">${escapeHtml(c.name)}</span>
              <span style="color: #666; font-size: 13px; display: flex; align-items: center; margin-top: 3px;">
                ${symbolHtml}<span>${escapeHtml(c.party)}</span>
              </span>
            </div>
          </div>
          <span style="font-weight: 600; font-size: 15px; color: #1976d2; white-space: nowrap;">${votes} votes (${percentage}%)</span>
        </div>
        <div class="bar-track" style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
          <div class="bar-fill" style="background: #1976d2; height: 100%; width: ${(votes / maxVotes) * 100}%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function showVotePrompt() {
  const resultsList = document.getElementById('resultsList');
  if (resultsList) {
    resultsList.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2>You haven't voted in this election yet</h2>
        <p style="color: #666; margin-bottom: 20px;">Please cast your vote to view the live receipt and details.</p>
        <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
      </div>
    `;
  }
}
