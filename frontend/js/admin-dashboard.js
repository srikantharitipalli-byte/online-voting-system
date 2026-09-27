// Admin Dashboard Script

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Load dashboard data
    loadDashboardStats();
    loadRecentActivity();
    loadContactMessages();
    setupLogout();

    const refreshBtn = document.getElementById('refreshMessagesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadContactMessages);
    }
});

// Load Dashboard Statistics from backend API
async function loadDashboardStats() {
    try {
        const response = await apiFetch('/api/results/admin-summary');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            const stats = data.stats;
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalCandidates').textContent = stats.totalCandidates;
            document.getElementById('activeElections').textContent = stats.activeElections;
            document.getElementById('totalVotes').textContent = stats.totalVotes;
        } else {
            console.error('Failed to load dashboard summary stats:', data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load Contact Inquiries from backend API
async function loadContactMessages() {
    const tbody = document.getElementById('contactMessagesBody');
    const unreadEl = document.getElementById('unreadMessages');
    if (!tbody) return;

    try {
        const response = await apiFetch('/api/contact');
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const messages = data.messages || [];
            if (unreadEl) {
                unreadEl.textContent = data.unreadCount !== undefined ? data.unreadCount : messages.filter(m => m.status === 'unread').length;
            }

            if (messages.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: #718096;">No contact messages yet.</td></tr>';
                return;
            }

            tbody.innerHTML = messages.map(msg => {
                const isUnread = msg.status === 'unread';
                const statusBadge = isUnread
                    ? '<span style="background: #fed7d7; color: #9b2c2c; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700;">Unread</span>'
                    : '<span style="background: #c6f6d5; color: #22543d; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700;">Read</span>';

                const dateStr = msg.created_at ? new Date(msg.created_at).toLocaleString() : '—';
                const actionBtn = isUnread
                    ? `<button class="btn-edit" onclick="markMessageAsRead(${msg.id})" style="padding: 4px 10px; font-size: 12px; background: #667eea; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Mark Read</button>`
                    : '<span style="color: #a0aec0; font-size: 13px;">✓ Read</span>';

                return `
                    <tr style="${isUnread ? 'background: #fffdfa;' : ''}">
                        <td><strong>#${msg.id}</strong></td>
                        <td style="font-size: 12.5px; color: #4a5568;">${escapeHtml(dateStr)}</td>
                        <td><strong>${escapeHtml(msg.name)}</strong></td>
                        <td><a href="mailto:${encodeURIComponent(msg.email)}" style="color: #667eea; text-decoration: underline;">${escapeHtml(msg.email)}</a></td>
                        <td>${escapeHtml(msg.subject || '—')}</td>
                        <td style="max-width: 280px; word-break: break-word; line-height: 1.4; font-size: 13px;">${escapeHtml(msg.message)}</td>
                        <td>${statusBadge}</td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            }).join('');
        } else {
            console.error('Failed to load contact messages:', data.message);
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e53e3e; padding: 16px;">${escapeHtml(data.message || 'Error loading messages.')}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #e53e3e; padding: 16px;">Failed to connect to server.</td></tr>';
    }
}

// Mark a message as read
window.markMessageAsRead = async function(id) {
    try {
        const response = await apiFetch(`/api/contact/${id}/read`, {
            method: 'PATCH'
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            loadContactMessages();
        } else {
            alert(data.message || 'Failed to update message status.');
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
        alert('Failed to connect to the server.');
    }
};

// Load Recent Activity (Can remain mock or display seed actions)
function loadRecentActivity() {
    const activities = [
        { time: '10:30 AM', action: 'System synchronization completed' },
        { time: '09:45 AM', action: 'Verification engine online' },
        { time: '09:15 AM', action: 'Database connection established' },
        { time: '08:50 AM', action: 'Voter registry synchronized' },
        { time: '08:20 AM', action: 'Security handshake validated' }
    ];
    
    const activityLog = document.getElementById('activityLog');
    if (activityLog) {
        activityLog.innerHTML = activities.map(activity => 
            `<div class="activity-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${activity.time}</strong>: ${activity.action}
            </div>`
        ).join('');
    }
}

// Logout functionality
function setupLogout() {
    const logoutLinks = document.querySelectorAll('a.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear admin session storage
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminEmail');
            
            // Clear core auth token and redirect
            Auth.logout();
        });
    });
}
