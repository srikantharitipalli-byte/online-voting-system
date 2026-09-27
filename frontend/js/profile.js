// js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
  // Guard route
  requireLogin();

  const form = document.getElementById('profileForm');
  const submitBtn = document.getElementById('submitBtn');

  try {
    // 1. Fetch user profile from backend
    const profileRes = await apiFetch('/api/auth/profile');
    const profileData = await profileRes.json();

    if (!profileRes.ok || profileData.status !== 'success') {
      showAlert('alertBox', 'Could not load your profile. Please refresh the page.');
      return;
    }

    const user = profileData.user;
    // Update local user details cache
    Auth.setUser(user);

    // 2. Fetch user's votes to count cast ballots
    const votesRes = await apiFetch('/api/votes/my-votes');
    const votesData = await votesRes.json();
    const myVotes = votesData.votes || [];

    // Populate form fields
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('address').value = user.address || '';

    // Populate voter card details
    const cardVoterId = document.getElementById('cardVoterId');
    const cardRole = document.getElementById('cardRole');
    const cardVoteStatus = document.getElementById('cardVoteStatus');
    const cardCreated = document.getElementById('cardCreated');

    if (cardVoterId) cardVoterId.textContent = user.voter_id || '—';
    if (cardRole) cardRole.textContent = user.role === 'admin' ? 'Administrator' : 'Registered Voter';
    if (cardVoteStatus) cardVoteStatus.textContent = myVotes.length > 0 ? `Voted (${myVotes.length} ballots)` : 'Not voted';
    if (cardCreated) cardCreated.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';

  } catch (error) {
    console.error('Error fetching profile:', error);
    showAlert('alertBox', 'Error connecting to database to load profile.');
  }

  // Handle form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('alertBox');

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();

      if (!name) {
        showAlert('alertBox', 'Full name is required.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      try {
        // Send PUT update request to backend
        const response = await apiFetch('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ name, phone, address })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          // Update cached user in localStorage
          Auth.setUser(data.user);
          showAlert('alertBox', 'Profile updated successfully.', 'success');
          
          setTimeout(() => {
            location.reload();
          }, 1500);
        } else {
          showAlert('alertBox', data.message || 'Failed to update profile.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Changes';
        }
      } catch (err) {
        console.error('Profile update error:', err);
        showAlert('alertBox', 'Server error. Profile could not be updated.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    });
  }
});
