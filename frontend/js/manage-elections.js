// Manage Elections Script
let electionsData = [];
let editingElectionId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    loadElections();
    setupEventListeners();
    setupLogout();
});

// Load Elections Table from database
async function loadElections(filter = '') {
    try {
        const response = await apiFetch('/api/elections');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            electionsData = data.elections || [];
            renderElectionsTable(filter);
        } else {
            console.error('Failed to load elections:', data.message);
        }
    } catch (error) {
        console.error('Error fetching elections:', error);
    }
}

// Render elections matching filter
function renderElectionsTable(filter) {
    const tbody = document.getElementById('electionsTableBody');
    if (!tbody) return;
    
    const filteredElections = electionsData.filter(election => 
        election.name.toLowerCase().includes(filter.toLowerCase()) ||
        election.status.toLowerCase().includes(filter.toLowerCase())
    );
    
    tbody.innerHTML = filteredElections.map(election => {
        // Format ISO start/end dates for display
        const startStr = election.start_date ? new Date(election.start_date).toLocaleString() : '—';
        const endStr = election.end_date ? new Date(election.end_date).toLocaleString() : '—';
        
        return `
            <tr>
                <td>${election.id}</td>
                <td>${escapeHtml(election.name)}</td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>
                    <span class="status ${election.status}">
                        ${election.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="editElection(${election.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteElection(${election.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Election Button
    const addElectionBtn = document.getElementById('addElectionBtn');
    if (addElectionBtn) {
        addElectionBtn.addEventListener('click', function() {
            editingElectionId = null;
            openElectionModal();
        });
    }
    
    // Search Elections
    const searchElections = document.getElementById('searchElections');
    if (searchElections) {
        searchElections.addEventListener('input', function(e) {
            loadElections(e.target.value);
        });
    }
    
    // Election Form Submit
    const electionForm = document.getElementById('electionForm');
    if (electionForm) {
        electionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveElection();
        });
    }
    
    // Modal Close Button
    const closeBtn = document.querySelector('#electionModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeElectionModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('electionModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeElectionModal();
            }
        });
    }
}

// Open Election Modal
function openElectionModal() {
    const modal = document.getElementById('electionModal');
    const form = document.getElementById('electionForm');
    
    if (!modal) return;
    
    if (editingElectionId) {
        const election = electionsData.find(e => e.id === editingElectionId);
        if (election) {
            document.getElementById('electionTitle').value = election.name || '';
            document.getElementById('electionDescription').value = election.description || '';
            
            // Format datetimes to match datetime-local input requirements (YYYY-MM-DDTHH:MM)
            if (election.start_date) {
                const sDate = new Date(election.start_date);
                sDate.setMinutes(sDate.getMinutes() - sDate.getTimezoneOffset());
                document.getElementById('electionStartDate').value = sDate.toISOString().slice(0, 16);
            }
            if (election.end_date) {
                const eDate = new Date(election.end_date);
                eDate.setMinutes(eDate.getMinutes() - eDate.getTimezoneOffset());
                document.getElementById('electionEndDate').value = eDate.toISOString().slice(0, 16);
            }
            
            document.getElementById('electionStatus').value = election.status || 'pending';
        }
        modal.querySelector('h2').textContent = 'Edit Election';
    } else {
        form.reset();
        modal.querySelector('h2').textContent = 'Create New Election';
    }
    
    modal.classList.add('active');
}

// Close Election Modal
function closeElectionModal() {
    const modal = document.getElementById('electionModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Save Election (Create or Update)
async function saveElection() {
    const title = document.getElementById('electionTitle').value.trim();
    const description = document.getElementById('electionDescription').value.trim();
    const start_date = document.getElementById('electionStartDate').value;
    const end_date = document.getElementById('electionEndDate').value;
    const status = document.getElementById('electionStatus').value;
    
    if (!title || !start_date || !end_date || !status) {
        alert('Please fill in all required fields');
        return;
    }

    const payload = {
        election_name: title,
        description,
        start_date,
        end_date,
        status
    };
    
    try {
        let response;
        if (editingElectionId) {
            response = await apiFetch(`/api/elections/${editingElectionId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            response = await apiFetch('/api/elections', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            alert(editingElectionId ? 'Election updated successfully' : 'Election created successfully');
            closeElectionModal();
            loadElections();
        } else {
            alert(data.message || 'Error saving election');
        }
    } catch (error) {
        console.error('Error saving election:', error);
        alert('Failed to save election.');
    }
}

// Edit Election trigger
window.editElection = function(electionId) {
    editingElectionId = electionId;
    openElectionModal();
};

// Delete Election
window.deleteElection = async function(electionId) {
    if (confirm('Are you sure you want to delete this election? All associated candidates and votes will be deleted!')) {
        try {
            const response = await apiFetch(`/api/elections/${electionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                alert('Election deleted successfully');
                loadElections();
            } else {
                alert(data.message || 'Error deleting election');
            }
        } catch (error) {
            console.error('Error deleting election:', error);
            alert('Failed to delete election.');
        }
    }
};

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
