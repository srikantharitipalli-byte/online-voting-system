// js/register.js
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, no need to register again
  if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');

    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const voter_id = document.getElementById('voter_id').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const address = document.getElementById('address').value.trim();

    // Validation
    if (!name) {
      showAlert('alertBox', 'Please enter your full name.');
      return;
    }

    if (!email || !email.includes('@')) {
      showAlert('alertBox', 'Please enter a valid email address.');
      return;
    }

    if (!voter_id) {
      showAlert('alertBox', 'Please enter your Voter ID.');
      return;
    }

    if (!password) {
      showAlert('alertBox', 'Please enter a password.');
      return;
    }

    if (password.length < 6) {
      showAlert('alertBox', 'Password must be at least 6 characters long.');
      return;
    }

    // Disable button to prevent double click
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
      // POST request to backend
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          voter_id,
          phone,
          password,
          address
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        showAlert('alertBox', 'Registration Successful! Redirecting to login...', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      } else {
        showAlert('alertBox', data.message || 'Registration failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
      }
    } catch (err) {
      console.error('Registration fetch error:', err);
      showAlert('alertBox', 'Server is offline. Please start your backend first.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
    }
  });
});
