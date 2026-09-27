// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email && !password) {
      showAlert('alertBox', 'Please enter your email and password.');
      return;
    }

    if (!email) {
      showAlert('alertBox', 'Please enter your email address.');
      return;
    }

    if (!password) {
      showAlert('alertBox', 'Please enter your password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        Auth.setToken(data.token);
        Auth.setUser(data.user);
        showAlert('alertBox', 'Login Successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } else {
        showAlert('alertBox', data.message || 'Invalid email or password.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in';
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('alertBox', 'Failed to connect to the server. Please check if backend is running.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
});
