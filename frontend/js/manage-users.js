// Manage Users Script
let usersData = [];
let editingUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    loadUsers();
    setupEventListeners();
    setupLogout();
});

// Load Users Table from database
async function loadUsers(filter = '') {
    try {
        const response = await apiFetch('/api/users');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            usersData = data.users || [];
            renderUsersTable(filter);
        } else {
            console.error('Failed to load users:', data.message);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Render users matching filter
function renderUsersTable(filter) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    const filteredUsers = usersData.filter(user => 
        (user.name && user.name.toLowerCase().includes(filter.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(filter.toLowerCase())) ||
        (user.voter_id && user.voter_id.toLowerCase().includes(filter.toLowerCase()))
    );
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.voter_id || '—')}</td>
            <td>${escapeHtml(user.role)}</td>
            <td>
                <span class="status active">Active</span>
            </td>
            <td>
                <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
                <button class="btn-delete" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Add User Button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            editingUserId = null;
            openUserModal();
        });
    }
    
    // Search Users
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
        searchUsers.addEventListener('input', function(e) {
            renderUsersTable(e.target.value);
        });
    }
    
    // User Form Submit
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }
    
    // Modal Close Button
    const closeBtn = document.querySelector('#userModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeUserModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('userModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeUserModal();
            }
        });
    }
}

// Open User Modal
function openUserModal() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    
    if (!modal) return;
    
    if (editingUserId) {
        const user = usersData.find(u => u.id === editingUserId);
        if (user) {
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userVoterId').value = user.voter_id || '';
            document.getElementById('userPhone').value = user.phone || '';
            document.getElementById('userRole').value = user.role || 'voter';
            document.getElementById('userAddress').value = user.address || '';
        }
        modal.querySelector('h2').textContent = 'Edit User';
    } else {
        form.reset();
        modal.querySelector('h2').textContent = 'Add New User';
    }
    
    modal.classList.add('active');
}

// Close User Modal
function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Save User (Create or Update)
async function saveUser() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const voter_id = document.getElementById('userVoterId').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const role = document.getElementById('userRole').value;
    const address = document.getElementById('userAddress').value.trim();
    
    if (!name || !email || !role || !voter_id) {
        alert('Please fill in name, email, voter ID, and role');
        return;
    }

    const payload = { name, email, voter_id, phone, role, address };

    try {
        let response;
        if (editingUserId) {
            // Update user via API
            response = await apiFetch(`/api/users/${editingUserId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            // Create user via API
            response = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            alert(editingUserId ? 'User updated successfully' : 'User added successfully');
            closeUserModal();
            loadUsers();
        } else {
            alert(data.message || 'Error saving user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Failed to save user due to network/server error.');
    }
}

// Edit User Trigger
window.editUser = function(userId) {
    editingUserId = userId;
    openUserModal();
};

// Delete User
window.deleteUser = async function(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await apiFetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                alert('User deleted successfully');
                loadUsers();
            } else {
                alert(data.message || 'Error deleting user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user.');
        }
    }
};

// Logout handler
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
