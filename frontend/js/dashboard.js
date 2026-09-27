document.addEventListener('DOMContentLoaded', async () => {
  // Guard the route - redirect to login if not logged in
  requireLogin();

  const user = Auth.getUser();
  if (!user) {
    Auth.logout();
    return;
  }

  // Display welcome message
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    const firstName = (user.name || 'User').split(' ')[0];
    welcomeTitle.textContent = `Welcome back, ${firstName}`;
  }

  // Set up sidebar navigation
  const sideLinks = document.querySelectorAll('.side-link');
  sideLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const section = link.getAttribute('data-section');
      if (section) {
        showSection(section);
        sideLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // Load All Dashboard Sections
  await loadDashboardData();

  // Handle logout buttons
  const logoutBtn = document.getElementById('btn-logout');
  const sideLogout = document.getElementById('side-logout');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.logout());
  }
  if (sideLogout) {
    sideLogout.addEventListener('click', () => Auth.logout());
  }

  // Handle refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      location.reload();
    });
  }
});

function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.add('hidden');
  });

  const selected = document.getElementById('section-' + sectionId);
  if (selected) {
    selected.classList.remove('hidden');
  }
}

// Combined function to load stats, tables, profile, and history from backend
async function loadDashboardData() {
  try {
    // 1. Fetch elections and user votes from backend
    const [electionsResponse, votesResponse] = await Promise.all([
      apiFetch('/api/elections'),
      apiFetch('/api/votes/my-votes')
    ]);

    const electionsData = await electionsResponse.json();
    const votesData = await votesResponse.json();

    const elections = electionsData.elections || [];
    const myVotes = votesData.votes || [];
    
    // Create a Set of election IDs the user has already voted in
    const votedElectionIds = new Set(myVotes.map(v => v.election_id));

    // 2. Render Statistics
    loadStats(elections, myVotes);

    // 3. Render Elections lists (Recent & Available)
    renderElectionsList(elections, votedElectionIds);

    // 4. Render My Votes History
    renderMyVotes(myVotes);

    // 5. Render Election Results
    await renderElectionResults(elections);

    // 6. Render Profile Card
    renderProfile(myVotes.length);

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function loadStats(elections, myVotes) {
  const statAvailable = document.getElementById('stat-available');
  const statVoted = document.getElementById('stat-voted');
  const statUpcoming = document.getElementById('stat-upcoming');
  const statCompleted = document.getElementById('stat-completed');

  if (statAvailable) statAvailable.textContent = elections.length;
  if (statVoted) statVoted.textContent = myVotes.length;
  if (statUpcoming) statUpcoming.textContent = elections.filter(e => e.status === 'active' || e.status === 'pending').length;
  if (statCompleted) statCompleted.textContent = elections.filter(e => e.status === 'closed').length;
}

function renderElectionsList(elections, votedElectionIds) {
  // Recent Elections List in Dashboard Home tab
  const electionsList = document.getElementById('electionsList');
  if (electionsList) {
    if (elections.length > 0) {
      electionsList.innerHTML = elections.map(election => {
        const hasVoted = votedElectionIds.has(election.id);
        
        const now = new Date();
        const start = new Date(election.start_date);
        const end = new Date(election.end_date);
        
        let statusLabel = 'PENDING';
        let badgeClass = 'pending';
        let btnLabel = 'Not Started';
        let canVote = false;
        
        if (now < start) {
          statusLabel = 'UPCOMING';
          badgeClass = 'pending';
          btnLabel = 'Not Started';
        } else if (now > end || election.status === 'closed') {
          statusLabel = 'CLOSED';
          badgeClass = 'closed';
          btnLabel = 'Closed';
        } else if (election.status === 'active') {
          statusLabel = 'ACTIVE';
          badgeClass = 'active';
          btnLabel = 'Vote Now';
          canVote = true;
        } else {
          statusLabel = 'PENDING';
          badgeClass = 'pending';
          btnLabel = 'Pending';
        }

        const btnText = hasVoted ? 'Voted' : btnLabel;
        const isActive = canVote;

        return `
          <div class="election-item card" style="padding: 16px; margin-bottom: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${escapeHtml(election.name)}</h3>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">
                <span class="badge badge-${badgeClass}">${escapeHtml(statusLabel)}</span> • ${election.candidates} candidates
              </p>
              <p style="margin: 0; font-size: 12px; color: #888;">
                Starts: ${new Date(election.start_date).toLocaleString()} | Ends: ${new Date(election.end_date).toLocaleString()}
              </p>
            </div>
            <button class="btn btn-primary" onclick="openVotePage(${election.id}, ${hasVoted}, ${isActive})" ${hasVoted || !isActive ? 'disabled' : ''}>
              ${btnText}
            </button>
          </div>
        `;
      }).join('');
    } else {
      electionsList.innerHTML = '<p style="color: #666; padding: 12px;">No recent elections available.</p>';
    }
  }

  // Available Elections tab
  const electionsTable = document.getElementById('electionsTable');
  if (electionsTable) {
    if (elections.length > 0) {
      electionsTable.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd;">
              <th style="padding: 12px; text-align: left; font-weight: 600;">Election</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Time Window</th>
              <th style="padding: 12px; text-align: center; font-weight: 600;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${elections.map(election => {
              const hasVoted = votedElectionIds.has(election.id);
              
              const now = new Date();
              const start = new Date(election.start_date);
              const end = new Date(election.end_date);
              
              let statusLabel = 'PENDING';
              let badgeClass = 'pending';
              let btnLabel = 'Not Started';
              let canVote = false;
              
              if (now < start) {
                statusLabel = 'UPCOMING';
                badgeClass = 'pending';
                btnLabel = 'Not Started';
              } else if (now > end || election.status === 'closed') {
                statusLabel = 'CLOSED';
                badgeClass = 'closed';
                btnLabel = 'Closed';
              } else if (election.status === 'active') {
                statusLabel = 'ACTIVE';
                badgeClass = 'active';
                btnLabel = 'Vote';
                canVote = true;
              } else {
                statusLabel = 'PENDING';
                badgeClass = 'pending';
                btnLabel = 'Pending';
              }

              const btnText = hasVoted ? 'Voted' : btnLabel;
              const isActive = canVote;

              return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px; font-weight: 500;">
                    ${escapeHtml(election.name)}
                    <div style="font-size: 11px; color:#999; font-weight:normal; margin-top:2px;">
                      ${escapeHtml(election.description || '')}
                    </div>
                  </td>
                  <td style="padding: 12px;"><span class="badge badge-${badgeClass}">${escapeHtml(statusLabel)}</span></td>
                  <td style="padding: 12px; color: #555; font-size: 12px;">
                    ${new Date(election.start_date).toLocaleString()}<br/>to ${new Date(election.end_date).toLocaleString()}
                  </td>
                  <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-primary" onclick="openVotePage(${election.id}, ${hasVoted}, ${isActive})" ${hasVoted || !isActive ? 'disabled' : ''}>
                      ${btnText}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      electionsTable.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No elections available.</p>';
    }
  }
}

function openVotePage(electionId, hasVoted, isActive) {
  if (hasVoted) {
    alert('You have already voted in this election.');
    return;
  }
  if (!isActive) {
    alert('This election is not active.');
    return;
  }
  
  // Store selected election in localStorage for the vote page to retrieve
  localStorage.setItem('selectedElection', electionId);
  window.location.href = 'vote.html';
}

function renderMyVotes(myVotes) {
  const myVotesList = document.getElementById('myVotesList');
  if (!myVotesList) return;

  if (myVotes.length === 0) {
    myVotesList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">You have not voted in any elections yet.</p>';
    return;
  }

  myVotesList.innerHTML = myVotes.map(vote => {
    const votedDate = new Date(vote.voted_at);
    const votedDateStr = votedDate.toLocaleDateString();
    const votedTimeStr = votedDate.toLocaleTimeString();

    return `
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; border-left: 4px solid #1976d2; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Election</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(vote.election)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Candidate</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(vote.candidate)}</p>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Party</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(vote.party)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Status</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">
              <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Ballot Recorded</span>
            </p>
          </div>
        </div>

        <div>
          <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vote Cast Time</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600; color: #555;">${votedDateStr} at ${votedTimeStr}</p>
        </div>
      </div>
    `;
  }).join('');
}

async function renderElectionResults(elections) {
  const resultsList = document.getElementById('resultsList');
  if (!resultsList) return;

  if (elections.length === 0) {
    resultsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No election results available.</p>';
    return;
  }

  // Fetch results for all elections in parallel
  try {
    const resultsPromises = elections.map(e => apiFetch(`/api/results/${e.id}`).then(res => res.json()));
    const resultsListResponses = await Promise.all(resultsPromises);

    resultsList.innerHTML = resultsListResponses.map((resData, index) => {
      const election = elections[index];
      if (resData.status !== 'success') {
        return `<div class="card" style="padding:16px; margin-bottom:16px;"><p>Could not load results for ${escapeHtml(election.name)}</p></div>`;
      }

      const totalVotes = resData.totalVotes;
      const sortedCandidates = resData.candidates || [];

      return `
        <div class="card" style="padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <div style="margin-bottom: 16px; padding: 12px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #1976d2;">
            <p style="margin: 0; font-size: 12px; color: #0d47a1; text-transform: uppercase; letter-spacing: 0.5px;">Election</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; color: #0d47a1;">${escapeHtml(resData.electionName)}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total Ballots Cast</p>
              <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 600;">${totalVotes}</p>
            </div>
            <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Status</p>
              <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 600; text-transform: uppercase; color: ${election.status === 'active' ? '#2e7d32' : '#c62828'}">
                ${escapeHtml(election.status)}
              </p>
            </div>
          </div>

          <div style="border-top: 1px solid #ddd; padding-top: 12px;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight:600; color:#333;">Tally of Votes</h3>
            ${sortedCandidates.length === 0 ? '<p style="color:#777; font-size:14px;">No candidates added to this election yet.</p>' : sortedCandidates.map((c, idx) => {
              const maxVotes = Math.max(...sortedCandidates.map(cand => cand.votes), 1);
              const percentage = c.percentage;
              const isLeader = idx === 0 && c.votes > 0;

              // Photo HTML
              const photoUrl = c.candidate_photo ? getImageUrl(c.candidate_photo) : '';
              const photoHtml = photoUrl
                ? `<img src="${photoUrl}" alt="${escapeHtml(c.name)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; flex-shrink: 0;">`
                : `<div style="width: 36px; height: 36px; border-radius: 50%; background: #1976d2; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0;">${escapeHtml((c.name || 'C').substring(0, 2).toUpperCase())}</div>`;

              // Symbol HTML
              let symbolHtml = '';
              if (isImagePath(c.party_symbol)) {
                symbolHtml = `<img src="${getImageUrl(c.party_symbol)}" alt="Symbol" style="width: 18px; height: 18px; object-fit: contain; vertical-align: middle; margin-right: 5px; border-radius: 2px;">`;
              } else if (c.party_symbol) {
                symbolHtml = `<span style="margin-right: 5px; font-size: 14px;">${escapeHtml(c.party_symbol)}</span>`;
              }

              return `
                <div style="padding: 12px; border-bottom: 1px solid #eee; ${isLeader ? 'background: #f0f7ff; border-radius: 8px; margin-bottom: 8px;' : ''}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${photoHtml}
                      <div>
                        <p style="margin: 0; font-weight: 600; font-size: 14px;">${escapeHtml(c.name)}</p>
                        <p style="margin: 3px 0 0 0; color: #666; font-size: 12px; display: flex; align-items: center;">
                          ${symbolHtml}<span>${escapeHtml(c.party)}</span>
                        </p>
                      </div>
                    </div>
                    <p style="margin: 0; font-weight: 600; font-size: 14px; color:#1976d2; white-space: nowrap;">${c.votes} votes (${percentage}%)</p>
                  </div>
                  <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="background: #1976d2; height: 100%; width: ${(c.votes / maxVotes) * 100}%; transition: width 0.3s ease;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error fetching results:', error);
    resultsList.innerHTML = '<p>Error loading election results.</p>';
  }
}

function renderProfile(votesCount) {
  const profileCard = document.getElementById('profileCard');
  if (!profileCard) return;

  const user = Auth.getUser();
  const registeredDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

  profileCard.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</p>
        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600;">${escapeHtml(user.name)}</p>
      </div>
      <div>
        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voter ID</p>
        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; font-family: monospace;">${escapeHtml(user.voter_id)}</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
      <div>
        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(user.email)}</p>
      </div>
      <div>
        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Registration Status</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">
          <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Active Voter</span>
        </p>
      </div>
    </div>

    <div style="margin-top: 16px;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(user.phone || 'N/A')}</p>
    </div>

    <div style="margin-top: 16px;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Address</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${escapeHtml(user.address || 'N/A')}</p>
    </div>

    <div style="margin-top: 16px;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Registered Date</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">${registeredDate}</p>
    </div>

    ${votesCount > 0 ? `
      <div style="margin-top: 20px; padding: 12px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
        <p style="margin: 0; color: #2e7d32; font-size: 14px; font-weight: 600;">✓ Ballots Cast: ${votesCount}</p>
        <p style="margin: 8px 0 0 0; color: #558b2f; font-size: 12px;">Your voting record is verified and stored in the database.</p>
      </div>
    ` : `
      <div style="margin-top: 20px; padding: 12px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
        <p style="margin: 0; color: #e65100; font-size: 14px; font-weight: 600;">⚠ No Ballots Cast Yet</p>
        <p style="margin: 8px 0 0 0; color: #bf360c; font-size: 12px;">You have not cast any votes yet. Navigate to "Available Elections" to cast a ballot.</p>
      </div>
    `}
  `;
}
