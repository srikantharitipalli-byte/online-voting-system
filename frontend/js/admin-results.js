// Admin Results Script

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    loadElectionsForFilter();
    setupEventListeners();
    setupLogout();
});

let electionsData = [];

// Load Elections for Filter from backend
async function loadElectionsForFilter() {
    const select = document.getElementById('electionFilter');
    if (!select) return;
    
    try {
        const response = await apiFetch('/api/elections');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            electionsData = data.elections || [];
            
            select.innerHTML = '';
            electionsData.forEach(election => {
                const option = document.createElement('option');
                option.value = election.id;
                option.textContent = election.name;
                select.appendChild(option);
            });
            
            // Load first election by default
            if (electionsData.length > 0) {
                select.value = electionsData[0].id;
                displayResults(electionsData[0].id);
            }
        }
    } catch (error) {
        console.error('Error loading filter elections:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Election Filter Change
    const electionFilter = document.getElementById('electionFilter');
    if (electionFilter) {
        electionFilter.addEventListener('change', function(e) {
            displayResults(e.target.value);
        });
    }
    
    // Export Button
    const exportBtn = document.getElementById('exportResultsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportResults);
    }
}

// Fetch and Display Results for selected election
async function displayResults(electionId) {
    if (!electionId) return;

    try {
        const response = await apiFetch(`/api/results/${electionId}`);
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const results = data.candidates || [];
            const totalVotes = data.totalVotes || 0;

            // Display Results Table
            const tbody = document.getElementById('resultsTableBody');
            if (tbody) {
                if (results.length > 0) {
                    tbody.innerHTML = results.map((result, idx) => {
                        const photoUrl = result.candidate_photo ? getImageUrl(result.candidate_photo) : '';
                        const photoHtml = photoUrl
                            ? `<img src="${photoUrl}" alt="${escapeHtml(result.name)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; vertical-align: middle;">`
                            : `<div style="width: 36px; height: 36px; border-radius: 50%; background: #1976d2; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; vertical-align: middle;">${escapeHtml((result.name || 'C').substring(0, 2).toUpperCase())}</div>`;

                        let symbolHtml = '';
                        if (isImagePath(result.party_symbol)) {
                            symbolHtml = `<img src="${getImageUrl(result.party_symbol)}" alt="Symbol" style="width: 22px; height: 22px; object-fit: contain; vertical-align: middle; margin-right: 6px; border-radius: 2px;">`;
                        } else if (result.party_symbol) {
                            symbolHtml = `<span style="font-size: 15px; margin-right: 6px; vertical-align: middle;">${escapeHtml(result.party_symbol)}</span>`;
                        }

                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="text-align: center;">${photoHtml}</td>
                                <td><strong>${escapeHtml(result.name)}</strong></td>
                                <td><div style="display: flex; align-items: center;">${symbolHtml}<span>${escapeHtml(result.party)}</span></div></td>
                                <td>${result.votes}</td>
                                <td><strong>${result.percentage}%</strong></td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No candidate results available.</td></tr>';
                }
            }

            // Display Summary Data
            const totalVotesCast = document.getElementById('totalVotesCast');
            const validVotes = document.getElementById('validVotes');
            const invalidVotes = document.getElementById('invalidVotes');

            if (totalVotesCast) totalVotesCast.textContent = totalVotes;
            if (validVotes) validVotes.textContent = totalVotes;
            if (invalidVotes) invalidVotes.textContent = 0;
        } else {
            console.error('Error fetching results:', data.message);
        }
    } catch (error) {
        console.error('Error displaying results:', error);
    }
}

// Export Results handler
function exportResults() {
    alert('Exporting results... (CSV file preparation mock)');
}

// Setup Logout
function setupLogout() {
    const logoutLinks = document.querySelectorAll('a.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminEmail');
            Auth.logout();
        });
    });
}
