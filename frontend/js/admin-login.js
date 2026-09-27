// Admin Login Script

document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const submitBtn = document.getElementById('submitBtn');
    const alertBox = document.getElementById('alertBox');

    function showAdminAlert(msg, type = 'error') {
        if (alertBox) {
            alertBox.textContent = msg;
            alertBox.style.display = 'block';
            if (type === 'success') {
                alertBox.style.background = '#e8f5e9';
                alertBox.style.color = '#2e7d32';
                alertBox.style.border = '1px solid #c8e6c9';
            } else {
                alertBox.style.background = '#ffebee';
                alertBox.style.color = '#c62828';
                alertBox.style.border = '1px solid #ffcdd2';
            }
        } else {
            alert(msg);
        }
    }

    function hideAdminAlert() {
        if (alertBox) {
            alertBox.style.display = 'none';
        }
    }
    
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAdminAlert();
            
            const emailInput = document.getElementById('adminEmail');
            const passwordInput = document.getElementById('adminPassword');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            
            // Basic validation
            if (!email || !password) {
                showAdminAlert('Please enter both email and password.');
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';
            }

            try {
                // Call login API
                const response = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Check if the user is actually an admin
                    if (data.user.role !== 'admin') {
                        showAdminAlert('Access denied. This account does not have administrator privileges.');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Login';
                        }
                        return;
                    }

                    // Store auth state for API headers and admin session guard
                    Auth.setToken(data.token);
                    Auth.setUser(data.user);
                    
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    sessionStorage.setItem('adminEmail', data.user.email);
                    
                    showAdminAlert('Admin login successful! Redirecting...', 'success');

                    // Redirect to admin dashboard
                    setTimeout(() => {
                        window.location.href = 'admin-dashboard.html';
                    }, 600);
                } else {
                    showAdminAlert(data.message || 'Invalid email or password.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Login';
                    }
                }
            } catch (err) {
                console.error('Admin login error:', err);
                showAdminAlert('Server is offline. Please ensure your backend is running.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
            }
        });
    }
});

// Check if admin is already logged in
window.addEventListener('load', function() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        window.location.href = 'admin-dashboard.html';
    }
});

