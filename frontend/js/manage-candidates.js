// Manage Candidates Script
let candidatesData = [];
let electionsData = [];
let editingCandidateId = null;

// Placeholder SVG for missing photos
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' fill='%239e9e9e' viewBox='0 0 16 16'><path d='M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'/><path fill-rule='evenodd' d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z'/></svg>";

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    loadCandidates();
    loadElections();
    setupEventListeners();
    setupImagePreviews();
    setupLogout();
});

// Load Candidates Table from database
async function loadCandidates(filter = '') {
    try {
        const response = await apiFetch('/api/candidates');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            candidatesData = data.candidates || [];
            renderCandidatesTable(filter);
        } else {
            console.error('Failed to load candidates:', data.message);
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
    }
}

// Render candidates table matching filter
function renderCandidatesTable(filter) {
    const tbody = document.getElementById('candidatesTableBody');
    if (!tbody) return;
    
    const filteredCandidates = candidatesData.filter(candidate => 
        (candidate.name && candidate.name.toLowerCase().includes(filter.toLowerCase())) ||
        (candidate.party && candidate.party.toLowerCase().includes(filter.toLowerCase())) ||
        (candidate.election && candidate.election.toLowerCase().includes(filter.toLowerCase()))
    );
    
    tbody.innerHTML = filteredCandidates.map(candidate => {
        // Photo thumbnail
        const photoUrl = candidate.candidate_photo ? getImageUrl(candidate.candidate_photo) : DEFAULT_AVATAR;
        const photoHtml = `<img src="${photoUrl}" onerror="this.src='${DEFAULT_AVATAR}'" alt="${escapeHtml(candidate.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; vertical-align: middle;">`;

        // Party symbol (image or text)
        let symbolHtml = '';
        if (isImagePath(candidate.party_symbol)) {
            symbolHtml = `<img src="${getImageUrl(candidate.party_symbol)}" alt="Symbol" style="width: 26px; height: 26px; object-fit: contain; vertical-align: middle; margin-right: 6px; border-radius: 4px; border: 1px solid #eee; background: #fff; padding: 1px;">`;
        } else if (candidate.party_symbol) {
            symbolHtml = `<span style="font-size: 18px; margin-right: 6px; vertical-align: middle;">${escapeHtml(candidate.party_symbol)}</span>`;
        }

        return `
            <tr>
                <td style="text-align: center;">${photoHtml}</td>
                <td>${candidate.id}</td>
                <td><strong>${escapeHtml(candidate.name)}</strong></td>
                <td><div style="display: flex; align-items: center;">${symbolHtml}<span>${escapeHtml(candidate.party)}</span></div></td>
                <td>${escapeHtml(candidate.election)}</td>
                <td>
                    <span class="status active">Active</span>
                </td>
                <td>
                    <button class="btn-edit" onclick="editCandidate(${candidate.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteCandidate(${candidate.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup live image file selection previews in modal
function setupImagePreviews() {
    const photoInput = document.getElementById('candidatePhoto') || document.getElementById('candidateImage');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const photoPreviewImg = document.getElementById('photoPreviewImg');

    if (photoInput && photoPreviewImg && photoPreviewContainer) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    photoPreviewImg.src = evt.target.result;
                    photoPreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                photoPreviewContainer.style.display = 'none';
            }
        });
    }

    const symbolInput = document.getElementById('partySymbol') || document.getElementById('candidateSymbolImage');
    const symbolPreviewContainer = document.getElementById('symbolPreviewContainer');
    const symbolPreviewImg = document.getElementById('symbolPreviewImg');

    if (symbolInput && symbolPreviewImg && symbolPreviewContainer) {
        symbolInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    symbolPreviewImg.src = evt.target.result;
                    symbolPreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                symbolPreviewContainer.style.display = 'none';
            }
        });
    }
}

// Load Elections Select list
async function loadElections() {
    const select = document.getElementById('candidateElection');
    if (!select) return;
    
    try {
        const response = await apiFetch('/api/elections');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            electionsData = data.elections || [];
            
            select.innerHTML = '<option value="">-- Select Election --</option>';
            electionsData.forEach(election => {
                const option = document.createElement('option');
                option.value = election.id;
                option.textContent = election.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading elections:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Candidate Button
    const addCandidateBtn = document.getElementById('addCandidateBtn');
    if (addCandidateBtn) {
        addCandidateBtn.addEventListener('click', function() {
            editingCandidateId = null;
            openCandidateModal();
        });
    }
    
    // Search Candidates
    const searchCandidates = document.getElementById('searchCandidates');
    if (searchCandidates) {
        searchCandidates.addEventListener('input', function(e) {
            renderCandidatesTable(e.target.value);
        });
    }
    
    // Candidate Form Submit
    const candidateForm = document.getElementById('candidateForm');
    if (candidateForm) {
        candidateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCandidate();
        });
    }
    
    // Modal Close Button
    const closeBtn = document.querySelector('#candidateModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCandidateModal);
    }

    // Modal Cancel Button
    const cancelBtn = document.getElementById('cancelCandidateBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeCandidateModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('candidateModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCandidateModal();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const candidateModal = document.getElementById('candidateModal');
            if (candidateModal && candidateModal.classList.contains('active')) {
                closeCandidateModal();
            }
        }
    });
}

// Open Candidate Modal
function openCandidateModal() {
    const modal = document.getElementById('candidateModal');
    const form = document.getElementById('candidateForm');
    
    if (!modal) return;
    
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const photoPreviewImg = document.getElementById('photoPreviewImg');
    const symbolPreviewContainer = document.getElementById('symbolPreviewContainer');
    const symbolPreviewImg = document.getElementById('symbolPreviewImg');
    const submitBtn = document.getElementById('submitCandidateBtn') || modal.querySelector('.btn-submit');

    if (editingCandidateId) {
        const candidate = candidatesData.find(c => c.id === editingCandidateId);
        if (candidate) {
            document.getElementById('candidateName').value = candidate.name || '';
            document.getElementById('candidateParty').value = candidate.party || '';
            document.getElementById('candidateElection').value = candidate.election_id || '';
            const descInput = document.getElementById('candidateDescription');
            if (descInput) descInput.value = candidate.description || '';
            
            // Symbol text vs image
            const symbolText = isImagePath(candidate.party_symbol) ? '' : (candidate.party_symbol || '');
            const symbolTextInput = document.getElementById('candidatePartySymbolText');
            if (symbolTextInput) symbolTextInput.value = symbolText;

            // Previews for existing images
            if (photoPreviewContainer && photoPreviewImg) {
                if (candidate.candidate_photo) {
                    photoPreviewImg.src = getImageUrl(candidate.candidate_photo);
                    photoPreviewContainer.style.display = 'block';
                } else {
                    photoPreviewContainer.style.display = 'none';
                }
            }

            if (symbolPreviewContainer && symbolPreviewImg) {
                if (isImagePath(candidate.party_symbol)) {
                    symbolPreviewImg.src = getImageUrl(candidate.party_symbol);
                    symbolPreviewContainer.style.display = 'block';
                } else {
                    symbolPreviewContainer.style.display = 'none';
                }
            }
        }
        modal.querySelector('h2').textContent = 'Edit Candidate';
        if (submitBtn) submitBtn.textContent = 'Update Candidate';
    } else {
        form.reset();
        const descInput = document.getElementById('candidateDescription');
        if (descInput) descInput.value = '';
        if (photoPreviewContainer) photoPreviewContainer.style.display = 'none';
        if (symbolPreviewContainer) symbolPreviewContainer.style.display = 'none';
        modal.querySelector('h2').textContent = 'Add New Candidate';
        if (submitBtn) submitBtn.textContent = 'Save Candidate';
    }
    
    // Reset modal body scroll to top
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Candidate Modal
function closeCandidateModal() {
    const modal = document.getElementById('candidateModal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// Save Candidate (Create or Update with FormData)
async function saveCandidate() {
    const name = document.getElementById('candidateName').value.trim();
    const party = document.getElementById('candidateParty').value.trim();
    const election_id = document.getElementById('candidateElection').value;
    const descInput = document.getElementById('candidateDescription');
    const description = descInput ? descInput.value.trim() : '';
    const symbolTextInput = document.getElementById('candidatePartySymbolText');
    const symbolText = symbolTextInput ? symbolTextInput.value.trim() : '';

    const photoInput = document.getElementById('candidatePhoto') || document.getElementById('candidateImage');
    const symbolInput = document.getElementById('partySymbol') || document.getElementById('candidateSymbolImage');
    
    if (!name || !party || !election_id) {
        alert('Please fill in candidate name, party, and election.');
        return;
    }

    const formData = new FormData();
    formData.append('election_id', Number(election_id));
    formData.append('name', name);
    formData.append('candidate_name', name);
    formData.append('party', party);
    formData.append('party_name', party);
    if (description) {
        formData.append('description', description);
    }
    if (symbolText) {
        formData.append('party_symbol_text', symbolText);
    }

    if (photoInput && photoInput.files && photoInput.files[0]) {
        formData.append('candidate_photo', photoInput.files[0]);
    }

    if (symbolInput && symbolInput.files && symbolInput.files[0]) {
        formData.append('party_symbol', symbolInput.files[0]);
        formData.append('party_symbol_file', symbolInput.files[0]);
    }
    
    const submitBtn = document.querySelector('#candidateForm .btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    try {
        let response;
        if (editingCandidateId) {
            response = await apiFetch(`/api/candidates/${editingCandidateId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            response = await apiFetch('/api/candidates', {
                method: 'POST',
                body: formData
            });
        }

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            alert(editingCandidateId ? 'Candidate updated successfully!' : 'Candidate added successfully!');
            closeCandidateModal();
            loadCandidates();
        } else {
            alert(data.message || 'Error saving candidate');
        }
    } catch (error) {
        console.error('Error saving candidate:', error);
        alert('Failed to save candidate.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editingCandidateId ? 'Update Candidate' : 'Save Candidate';
        }
    }
}

// Edit Candidate trigger
window.editCandidate = function(candidateId) {
    editingCandidateId = candidateId;
    openCandidateModal();
};

// Delete Candidate
window.deleteCandidate = async function(candidateId) {
    if (confirm('Are you sure you want to delete this candidate?')) {
        try {
            const response = await apiFetch(`/api/candidates/${candidateId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                alert('Candidate deleted successfully');
                loadCandidates();
            } else {
                alert(data.message || 'Error deleting candidate');
            }
        } catch (error) {
            console.error('Error deleting candidate:', error);
            alert('Failed to delete candidate.');
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

