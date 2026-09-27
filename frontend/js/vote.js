// js/vote.js
let selectedCandidate = null;
let electionId = null;
let userLatitude = null;
let userLongitude = null;
let locationVerified = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Guard route
  requireLogin();

  const user = Auth.getUser();
  if (!user) {
    Auth.logout();
    return;
  }

  const voterIdLabel = document.getElementById('voterIdLabel');
  if (voterIdLabel) {
    voterIdLabel.textContent = user.voter_id || '—';
  }

  const loadingState = document.getElementById('loadingState');
  const alreadyVotedState = document.getElementById('alreadyVotedState');
  const voteForm = document.getElementById('voteForm');

  // Request browser location
  requestLocation();

  // Get selected election ID from localStorage, or auto-detect active election
  electionId = Number(localStorage.getItem('selectedElection'));
  if (!electionId) {
    try {
      const elRes = await apiFetch('/api/elections');
      const elData = await elRes.json();
      const elList = elData.elections || [];
      const activeEl = elList.find(e => e.status === 'active') || elList[0];
      if (activeEl) {
        electionId = activeEl.id;
        localStorage.setItem('selectedElection', electionId);
      }
    } catch (e) {
      console.warn('Could not auto-detect active election:', e);
    }
  }

  if (!electionId) {
    alert('No election selected. Redirecting to dashboard.');
    window.location.href = 'dashboard.html';
    return;
  }

  try {
    // 1. Fetch user's votes, election details, and candidates in parallel
    const [votesRes, electionRes, candidatesRes] = await Promise.all([
      apiFetch('/api/votes/my-votes'),
      apiFetch(`/api/elections/${electionId}`),
      apiFetch(`/api/candidates/${electionId}`)
    ]);

    const votesData = await votesRes.json();
    const electionData = await electionRes.json();
    const candidatesData = await candidatesRes.json();

    const myVotes = votesData.votes || [];
    const election = electionData.election;
    const candidates = candidatesData.candidates || [];

    if (loadingState) loadingState.style.display = 'none';

    // 2. Enforce date and status validation
    if (!election) {
      showAlert('alertBox', 'Election details not found.');
      return;
    }

    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (now < startDate) {
      showAlert('alertBox', 'Voting has not started yet.');
      return;
    }

    if (now > endDate || election.status === 'closed') {
      showAlert('alertBox', 'Voting for this election has ended.');
      return;
    }

    if (election.status !== 'active') {
      showAlert('alertBox', 'This election is not currently active.');
      return;
    }

    // 3. Check if user already voted
    const existingVote = myVotes.find(v => v.election_id === electionId);
    if (existingVote) {
      if (alreadyVotedState) alreadyVotedState.style.display = 'block';
      
      const alreadyVotedText = document.getElementById('alreadyVotedText');
      if (alreadyVotedText) {
        alreadyVotedText.textContent = `You have already voted for ${existingVote.candidate} (${existingVote.party}) in this election. Only one ballot is allowed per voter.`;
      }
      return;
    }

    if (candidates.length === 0) {
      showAlert('alertBox', 'No candidates are available for this election. Please check back later.');
      return;
    }

    // Render candidate cards
    renderCandidates(candidates);
    if (voteForm) voteForm.style.display = 'block';

    // Handle form submission
    if (voteForm) {
      voteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedCandidate) return;
        if (!locationVerified) {
          showAlert('alertBox', 'Location access is required to submit your vote.');
          return;
        }
        openConfirmModal(selectedCandidate);
      });
    }

    // Handle confirmation modal buttons
    const cancelConfirm = document.getElementById('cancelConfirm');
    const finalConfirm = document.getElementById('finalConfirm');
    
    if (cancelConfirm) {
      cancelConfirm.addEventListener('click', closeConfirmModal);
    }
    
    if (finalConfirm) {
      finalConfirm.addEventListener('click', submitVote);
    }

  } catch (error) {
    console.error('Error initializing vote page:', error);
    if (loadingState) loadingState.style.display = 'none';
    showAlert('alertBox', 'Error loading election details. Please try again.');
  }
});

function requestLocation() {
  const card = document.getElementById('locationStatusCard');
  const text = document.getElementById('locationStatusText');
  const indicator = document.getElementById('locationIndicator');
  const submitBtn = document.getElementById('submitVoteBtn');

  if (!navigator.geolocation) {
    updateLocationUI('error', 'Geolocation is not supported by your browser.', card, text, indicator);
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;
      
      updateLocationUI('pending', 'Verifying location details...', card, text, indicator);

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLatitude}&lon=${userLongitude}&zoom=10&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        
        if (!response.ok) {
          throw new Error('Reverse geocoding failed');
        }

        const data = await response.json();
        const address = data.address || {};
        
        const country = address.country || 'Unknown Country';
        const state = address.state || 'Unknown State';
        // Resolve district with safe fallbacks
        const district = address.state_district || address.district || address.county || address.city || address.town || address.village || 'Unknown District';

        locationVerified = true;
        
        const displayMsg = `<strong>Location Verified</strong><br/>📍 District: ${escapeHtml(district)}<br/>State: ${escapeHtml(state)}<br/>Country: ${escapeHtml(country)}`;
        updateLocationUI('success', displayMsg, card, text, indicator);
        
        // Re-enable submit button if a candidate is already selected
        if (selectedCandidate && submitBtn) {
          submitBtn.disabled = false;
        }
      } catch (geocodingError) {
        console.error('Geocoding error:', geocodingError);
        locationVerified = false;
        updateLocationUI('error', 'Location verification failed: Unable to resolve human-readable address. Please check your internet connection.', card, text, indicator);
        if (submitBtn) {
          submitBtn.disabled = true;
        }
      }
    },
    (err) => {
      locationVerified = false;
      let errMsg = 'Location access denied. You must grant location permission to cast a vote.';
      if (err.code === err.POSITION_UNAVAILABLE) {
        errMsg = 'Location information is unavailable. Please check your GPS/network.';
      } else if (err.code === err.TIMEOUT) {
        errMsg = 'Location verification timed out. Please refresh and try again.';
      }
      updateLocationUI('error', errMsg, card, text, indicator);
      if (submitBtn) {
        submitBtn.disabled = true;
      }
    },
    options
  );
}

function updateLocationUI(status, message, card, text, indicator) {
  if (!card || !text || !indicator) return;
  text.innerHTML = message;
  if (status === 'success') {
    card.style.background = '#e8f5e9';
    card.style.borderLeft = '4px solid #2e7d32';
    indicator.style.background = '#2e7d32';
  } else if (status === 'pending') {
    card.style.background = '#fffde7';
    card.style.borderLeft = '4px solid #f4b400';
    indicator.style.background = '#f4b400';
  } else {
    card.style.background = '#ffebee';
    card.style.borderLeft = '4px solid #d32f2f';
    indicator.style.background = '#d32f2f';
  }
}

function renderCandidates(candidates) {
  const grid = document.getElementById('candidateGrid');
  if (!grid) return;

  const defaultCandidateImg = 'http://localhost:5000/uploads/candidates/default-candidate.svg';
  const defaultPartySymbolImg = 'http://localhost:5000/uploads/symbols/default-symbol.svg';

  grid.innerHTML = candidates.map((candidate) => {
    const candidateId = candidate.candidate_id || candidate.id;
    const candidateName = candidate.candidate_name || candidate.name || 'Candidate';
    const partyName = candidate.party_name || candidate.party || 'Independent';

    // 1. Candidate Photo
    const photoUrl = candidate.candidate_photo
      ? (candidate.candidate_photo.startsWith('http')
          ? candidate.candidate_photo
          : `http://localhost:5000${candidate.candidate_photo.startsWith('/') ? '' : '/'}${candidate.candidate_photo}`)
      : defaultCandidateImg;

    // 2. Party Symbol
    let isImageSymbol = false;
    let symbolUrl = defaultPartySymbolImg;
    let symbolText = '';

    if (candidate.party_symbol) {
      if (
        candidate.party_symbol.startsWith('/') ||
        candidate.party_symbol.startsWith('http') ||
        candidate.party_symbol.startsWith('uploads') ||
        /\.(png|jpe?g|webp|svg|gif)$/i.test(candidate.party_symbol)
      ) {
        isImageSymbol = true;
        symbolUrl = candidate.party_symbol.startsWith('http')
          ? candidate.party_symbol
          : `http://localhost:5000${candidate.party_symbol.startsWith('/') ? '' : '/'}${candidate.party_symbol}`;
      } else {
        symbolText = candidate.party_symbol;
      }
    } else {
      isImageSymbol = true;
      symbolUrl = defaultPartySymbolImg;
    }

    const symbolHtml = isImageSymbol
      ? `<div class="party-symbol-wrapper">
          <img src="${symbolUrl}" onerror="this.onerror=null;this.src='${defaultPartySymbolImg}';" alt="${escapeHtml(partyName)} Symbol" class="party-symbol-img" />
        </div>`
      : `<div class="party-symbol-wrapper text-symbol">
          <span class="party-symbol-text">${escapeHtml(symbolText)}</span>
        </div>`;

    return `
      <div class="candidate-card" data-id="${candidateId}">
        <input type="radio" name="candidate" value="${candidateId}" style="display: none;" />

        <!-- [Candidate Photo] -->
        <div class="candidate-photo-wrapper">
          <img src="${photoUrl}" onerror="this.onerror=null;this.src='${defaultCandidateImg}';" alt="${escapeHtml(candidateName)} Photo" class="candidate-photo-img" />
        </div>

        <!-- Candidate Name -->
        <h3 class="candidate-name">${escapeHtml(candidateName)}</h3>

        <!-- Party Name -->
        <p class="candidate-party-name">${escapeHtml(partyName)}</p>

        <!-- [Party Symbol] -->
        ${symbolHtml}

        <!-- Description -->
        <p class="candidate-desc">${escapeHtml(candidate.description || 'Registered Candidate')}</p>

        <!-- [ Vote ] Button -->
        <button type="button" class="btn btn-card-vote">Vote</button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.candidate-card').forEach((card) => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.candidate-card').forEach((c) => {
        c.classList.remove('selected');
        const voteBtn = c.querySelector('.btn-card-vote');
        if (voteBtn) voteBtn.textContent = 'Vote';
      });
      card.classList.add('selected');
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;

      const cardVoteBtn = card.querySelector('.btn-card-vote');
      if (cardVoteBtn) cardVoteBtn.textContent = 'Selected ✓';

      const id = Number(card.dataset.id);
      const candidate = candidates.find((c) => (c.candidate_id || c.id) === id);
      selectedCandidate = candidate;

      const selectedLabel = document.getElementById('selectedLabel');
      const submitBtn = document.getElementById('submitVoteBtn');
      
      const cName = candidate.candidate_name || candidate.name;
      const pName = candidate.party_name || candidate.party;
      if (selectedLabel) {
        selectedLabel.textContent = `Selected: ${cName} (${pName})`;
      }
      if (submitBtn) {
        submitBtn.disabled = !locationVerified; // Only enable if location is verified
      }
    });
  });
}

function openConfirmModal(candidate) {
  const confirmName = document.getElementById('confirmName');
  const confirmParty = document.getElementById('confirmParty');
  const confirmModal = document.getElementById('confirmModal');
  
  const cName = candidate.candidate_name || candidate.name;
  const pName = candidate.party_name || candidate.party;
  if (confirmName) confirmName.textContent = cName;
  if (confirmParty) confirmParty.textContent = pName;
  if (confirmModal) confirmModal.style.display = 'flex';
}

function closeConfirmModal() {
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal) confirmModal.style.display = 'none';
}

async function submitVote() {
  if (!selectedCandidate || !electionId) return;

  const btn = document.getElementById('finalConfirm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting…';
  }

  try {
    const candidateId = selectedCandidate.candidate_id || selectedCandidate.id;
    const response = await apiFetch('/api/votes', {
      method: 'POST',
      body: JSON.stringify({
        election_id: electionId,
        candidate_id: candidateId,
        latitude: userLatitude,
        longitude: userLongitude
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      closeConfirmModal();
      showAlert('alertBox', 'Your vote has been submitted successfully!', 'success');
      
      // Redirect to results page after showing success
      setTimeout(() => {
        window.location.href = 'result.html';
      }, 1500);
    } else {
      closeConfirmModal();
      showAlert('alertBox', data.message || 'Failed to submit vote. Please try again.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirm Vote';
      }
    }
  } catch (error) {
    console.error('Error submitting vote:', error);
    closeConfirmModal();
    showAlert('alertBox', 'Failed to connect to the server. Please try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm Vote';
    }
  }
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}
