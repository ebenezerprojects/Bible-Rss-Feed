async function loadUsersList() {
    try {
        const data = await apiRequest('/admin/users');
        const tbody = document.getElementById('usersTableBody');
        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(user => `<tr><td>${user.user_pk}</td><td>${user.user_id}</td><td>${user.email || '-'}</td><td>${user.full_name || '-'}</td><td><span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${user.role}</span></td><td><span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></td><td><button class="btn btn-sm btn-outline-warning" onclick="toggleUserStatus('${user.user_id}', ${user.is_active})"><i class="fas ${user.is_active ? 'fa-ban' : 'fa-check'}"></i></button><button class="btn btn-sm btn-outline-primary" onclick="showAssignFormatsModal('${user.user_id}')"><i class="fas fa-tags"></i></button><button class="btn btn-sm btn-outline-success" onclick="showAssignVersionsModal('${user.user_id}')"><i class="fas fa-book"></i></button></td></tr>`).join('');
        } else { tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>'; }
    } catch (e) { document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${e.message}</td></tr>`; }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} user ${userId}?`)) {
        try { await apiRequest(`/admin/users/${userId}/toggle-status`, { method: 'PATCH' }); showAlert(`User ${userId} ${action}d successfully`, 'success'); await loadUsersList(); } catch (e) { showAlert(e.message, 'danger'); }
    }
}

function showCreateUserModal() {
    const modalHtml = `<div class="modal fade" id="createUserModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header bg-primary text-white"><h5 class="modal-title"><i class="fas fa-user-plus me-2"></i>Create New User</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><div class="mb-3"><label class="form-label">Username *</label><input type="text" class="form-control" id="newUserId" required></div><div class="mb-3"><label class="form-label">Password *</label><input type="password" class="form-control" id="newPassword" required></div><div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" id="newEmail"></div><div class="mb-3"><label class="form-label">Full Name</label><input type="text" class="form-control" id="newFullName"></div><div class="mb-3"><label class="form-label">Role</label><select class="form-select" id="newRole"><option value="user">User</option><option value="admin">Admin</option></select></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-primary" onclick="createUser()">Create</button></div></div></div></div>`;
    const existingModal = document.getElementById('createUserModal'); if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('createUserModal')).show();
}

async function createUser() {
    const userData = { user_id: document.getElementById('newUserId').value, password: document.getElementById('newPassword').value, email: document.getElementById('newEmail').value, full_name: document.getElementById('newFullName').value, role: document.getElementById('newRole').value };
    if (!userData.user_id || !userData.password) { showAlert('Username and password are required', 'warning'); return; }
    try { await apiRequest('/user/create', { method: 'POST', body: JSON.stringify(userData) }); showAlert('User created successfully!', 'success'); const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal')); modal.hide(); await loadUsersList(); } catch (e) { showAlert(e.message, 'danger'); }
}

async function showAssignFormatsModal(userId) {
    const formatsData = await apiRequest('/user/formats/list');
    const availableFormats = formatsData.data;
    const modalHtml = `<div class="modal fade" id="assignFormatsModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header bg-primary text-white"><h5 class="modal-title"><i class="fas fa-tags me-2"></i>Assign Formats to ${userId}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><div class="mb-3"><label class="form-label">Select Formats</label>${availableFormats.map(format => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${format.format_code}" id="format_${format.format_code}"><label class="form-check-label" for="format_${format.format_code}">${format.format_name} (${format.format_type})</label></div>`).join('')}</div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-primary" onclick="assignFormats('${userId}')">Assign</button></div></div></div></div>`;
    const existingModal = document.getElementById('assignFormatsModal'); if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('assignFormatsModal')).show();
}

async function assignFormats(userId) {
    const selectedFormats = [];
    const formats = await apiRequest('/user/formats/list');
    formats.data.forEach(format => { const checkbox = document.getElementById(`format_${format.format_code}`); if (checkbox && checkbox.checked) selectedFormats.push(format.format_code); });
    if (selectedFormats.length === 0) { showAlert('Please select at least one format', 'warning'); return; }
    try { await apiRequest('/user/assign-formats', { method: 'POST', body: JSON.stringify({ user_id: userId, format_codes: selectedFormats }) }); showAlert('Formats assigned successfully!', 'success'); const modal = bootstrap.Modal.getInstance(document.getElementById('assignFormatsModal')); modal.hide(); } catch (e) { showAlert(e.message, 'danger'); }
}

async function showAssignVersionsModal(userId) {
    const versionsData = await apiRequest('/user/versions/list');
    const availableVersions = versionsData.data;
    const modalHtml = `<div class="modal fade" id="assignVersionsModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header bg-primary text-white"><h5 class="modal-title"><i class="fas fa-book me-2"></i>Assign Bible Versions to ${userId}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><div class="mb-3"><label class="form-label">Select Bible Versions</label>${availableVersions.map(version => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${version.version_code}" id="version_${version.version_code}"><label class="form-check-label" for="version_${version.version_code}">${version.version_name} (${version.language_name})</label></div>`).join('')}</div><div class="mb-3"><label class="form-label">Default Version</label><select class="form-select" id="defaultVersion"><option value="">None</option>${availableVersions.map(version => `<option value="${version.version_code}">${version.version_name}</option>`).join('')}</select></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-primary" onclick="assignVersions('${userId}')">Assign</button></div></div></div></div>`;
    const existingModal = document.getElementById('assignVersionsModal'); if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('assignVersionsModal')).show();
}

async function assignVersions(userId) {
    const selectedVersions = [];
    const versionsData = await apiRequest('/user/versions/list');
    versionsData.data.forEach(version => { const checkbox = document.getElementById(`version_${version.version_code}`); if (checkbox && checkbox.checked) selectedVersions.push(version.version_code); });
    const defaultVersion = document.getElementById('defaultVersion').value;
    if (selectedVersions.length === 0) { showAlert('Please select at least one Bible version', 'warning'); return; }
    try { await apiRequest('/user/assign-versions', { method: 'POST', body: JSON.stringify({ user_id: userId, version_codes: selectedVersions, default_version: defaultVersion || null }) }); showAlert('Bible versions assigned successfully!', 'success'); const modal = bootstrap.Modal.getInstance(document.getElementById('assignVersionsModal')); modal.hide(); } catch (e) { showAlert(e.message, 'danger'); }
}

async function loadBackupsList() {
    try {
        const data = await apiRequest('/admin/backup/list');
        const tbody = document.getElementById('backupsTableBody');
        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(backup => `<tr><td><code>${backup.filename}</code></td><td>${backup.size}</td><td>${new Date(backup.created_at).toLocaleString()}</td><td><span class="badge ${backup.type === 'auto' ? 'bg-info' : 'bg-primary'}">${backup.type}</span></td><td><button class="btn btn-sm btn-outline-success" onclick="downloadBackup('${backup.filename}')"><i class="fas fa-download"></i></button><button class="btn btn-sm btn-outline-danger" onclick="deleteBackup('${backup.filename}')"><i class="fas fa-trash"></i></button></td>`).join('');
        } else { tbody.innerHTML = '<tr><td colspan="5" class="text-center">No backups found</td></tr>'; }
    } catch (e) { document.getElementById('backupsTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${e.message}</td></tr>`; }
}

async function createBackup() { try { const response = await apiRequest('/admin/backup/create', { method: 'POST' }); showAlert(response.message, 'success'); await loadBackupsList(); } catch (e) { showAlert(e.message, 'danger'); } }
function downloadBackup(filename) { const token = getToken(); window.open(`${API_URL}/admin/backup/download/${filename}?token=${token}`, '_blank'); }
async function deleteBackup(filename) { if (confirm(`Are you sure you want to delete backup ${filename}?`)) { try { await apiRequest(`/admin/backup/delete/${filename}`, { method: 'DELETE' }); showAlert('Backup deleted successfully!', 'success'); await loadBackupsList(); } catch (e) { showAlert(e.message, 'danger'); } } }

async function loadSystemStats() {
    try {
        const data = await apiRequest('/admin/stats');
        const statsDiv = document.getElementById('systemStats');
        statsDiv.innerHTML = `<div class="mb-3"><strong>Total Users:</strong> ${data.data.users}</div><div class="mb-3"><strong>Total API Calls:</strong> ${data.data.api_calls}</div><div class="mb-3"><strong>Active Users:</strong> ${data.data.active_users || 'N/A'}</div>`;
    } catch (e) { document.getElementById('systemStats').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

async function loadBackupStatsData() {
    try {
        const data = await apiRequest('/admin/backup/stats');
        const statsDiv = document.getElementById('backupStats');
        statsDiv.innerHTML = `<div class="mb-3"><strong>Total Backups:</strong> ${data.data.total_backups}</div><div class="mb-3"><strong>Auto Backups:</strong> ${data.data.auto_backups}</div><div class="mb-3"><strong>Manual Backups:</strong> ${data.data.manual_backups}</div><div class="mb-3"><strong>Total Size:</strong> ${data.data.total_size}</div><div class="mb-3"><strong>Auto Backup Interval:</strong> ${data.data.auto_backup_interval}</div>`;
    } catch (e) { document.getElementById('backupStats').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}