/* ==========================================================================
   main.js — shared across every page
   - API Config & Auth helpers (JWT-based)
   - Mobile nav toggle + active link highlighting
   - Nav "user chip" showing who is logged in
   - Alert box helpers
   ========================================================================== */

const API_BASE_URL = 'http://localhost:5000';

/* ---------------- Auth storage helpers (JWT-based) ---------------- */
const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },
  setToken(token) {
    localStorage.setItem('token', token);
  },
  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  isLoggedIn() {
    return !!localStorage.getItem('token');
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedElection');
    window.location.href = 'login.html';
  }
};

/* ---------------- API Fetch wrapper with JWT ---------------- */
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  
  // Prepare headers
  const headers = {
    ...(options.headers || {})
  };
  
  // Only default to application/json if body is not FormData
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle unauthorized or expired token
  if (response.status === 401 && Auth.isLoggedIn()) {
    alert('Session expired. Please log in again.');
    Auth.logout();
    throw new Error('Unauthorized');
  }

  return response;
}

/* ---------------- Image URL resolver & fallback helpers ---------------- */
function getImageUrl(imgPath) {
  if (!imgPath) return '';
  if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('data:')) {
    return imgPath;
  }
  const cleanPath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
  return `${API_BASE_URL}/${cleanPath}`;
}

function isImagePath(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('uploads/') || str.startsWith('/uploads/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(str);
}

/* ---------------- Route guarding ---------------- */
function requireLogin() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
}

/* ---------------- Alert box helper ---------------- */
function showAlert(elId, message, type = 'error') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert show alert-${type}`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'alert';
}

/* Utility function to escape HTML */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------------- Nav behavior (runs on every page) ---------------- */
document.addEventListener('DOMContentLoaded', () => {

  // Highlight active nav link
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });

  // Mobile menu toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Populate user chip / auth-aware nav buttons
  const authArea = document.getElementById('nav-auth-area');
  if (authArea) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      const userName = user && user.name ? user.name : 'User';
      const voterId = user && user.voter_id ? user.voter_id : '';
      authArea.innerHTML = `
        <span id="user-chip" style="display:inline-flex">${escapeHtml(userName)} · ${escapeHtml(voterId)}</span>
        <button class="btn btn-outline" id="logoutBtn">Log out</button>
      `;
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
      }
    } else {
      authArea.innerHTML = `
        <a class="btn btn-outline" href="login.html">Log in</a>
        <a class="btn btn-primary" href="register.html">Register to vote</a>
      `;
    }
  }
});

