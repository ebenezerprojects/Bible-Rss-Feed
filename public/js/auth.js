const API_URL = window.location.origin;

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

async function login(user_id, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            localStorage.setItem('sessionId', data.data.session_id);
            localStorage.setItem('versions', JSON.stringify(data.data.versions));
            localStorage.setItem('formats', JSON.stringify(data.data.formats));
            localStorage.setItem('permissions', JSON.stringify(data.data.permissions || []));
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'danger');
    }
}

async function logout() {
    const token = localStorage.getItem('token');
    if (token) {
        try { await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } catch(e) {}
    }
    localStorage.clear();
    window.location.href = '/login';
}

function getCurrentUser() { const user = localStorage.getItem('user'); return user ? JSON.parse(user) : null; }
function getToken() { return localStorage.getItem('token'); }
function isAdmin() { const user = getCurrentUser(); return user && user.role === 'admin'; }
function getUserVersions() { const versions = localStorage.getItem('versions'); return versions ? JSON.parse(versions) : []; }
function getUserFormats() { const formats = localStorage.getItem('formats'); return formats ? JSON.parse(formats) : []; }

function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (alertDiv) {
        alertDiv.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
        setTimeout(() => { const alert = alertDiv.querySelector('.alert'); if (alert) alert.remove(); }, 5000);
    }
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
    const mergedOptions = { ...defaultOptions, ...options };
    const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401) { localStorage.clear(); window.location.href = '/login'; throw new Error('Session expired. Please login again.'); }
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        login(document.getElementById('user_id').value, document.getElementById('password').value);
    });
}
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); logout(); });
}