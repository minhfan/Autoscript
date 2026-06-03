// ============================================================
//  AUTOSCRIPT TCP — Project Page Logic
//  Handles project CRUD via Worker API, profile-based token auth,
//  and Admin-only User Management panel.
// ============================================================

(function () {
    'use strict';

    // ── Session Checking & Auth ─────────────────────────────
    const sessionToken = localStorage.getItem('autoscript_session_token');
    const sessionUser = localStorage.getItem('autoscript_session_username');

    function requireAuth() {
        if (!sessionToken || !sessionUser) {
            localStorage.removeItem('autoscript_session_token');
            localStorage.removeItem('autoscript_session_username');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    if (!requireAuth()) return;

    // Helper for API headers
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
        };
    }

    // ── State ────────────────────────────────────────────────
    let projects = [];
    let users = [];
    let editingProject = null; // { index, field } for inline edit modal
    let isUserViewActive = false;

    // ── DOM References ───────────────────────────────────────
    // Views
    const projectsView = document.getElementById('projectsView');
    const userManagementView = document.getElementById('userManagementView');
    const projectGrid = document.getElementById('projectGrid');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    // Topbar
    const topbarEmail = document.getElementById('topbarEmail');
    const topbarAvatar = document.getElementById('topbarAvatar');
    const btnLogout = document.getElementById('btnLogout');
    const btnManageUsers = document.getElementById('btnManageUsers');

    // Project Actions
    const btnNewProject = document.getElementById('btnNewProject');
    const btnNewProjectEmpty = document.getElementById('btnNewProjectEmpty');

    // Project Modal references
    const newProjectModal = document.getElementById('newProjectModal');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalCreate = document.getElementById('modalCreate');
    const modalProjectName = document.getElementById('modalProjectName');
    const modalSpeaker = document.getElementById('modalSpeaker');
    const modalSource = document.getElementById('modalSource');
    const modalStatus = document.getElementById('modalStatus');

    // Edit field modal
    const editFieldModal = document.getElementById('editFieldModal');
    const editFieldClose = document.getElementById('editFieldClose');
    const editFieldCancel = document.getElementById('editFieldCancel');
    const editFieldSave = document.getElementById('editFieldSave');
    const editFieldInput = document.getElementById('editFieldInput');
    const editFieldTitle = document.getElementById('editFieldTitle');
    const editFieldLabel = document.getElementById('editFieldLabel');

    // Admin Add User Modal
    const btnAddUser = document.getElementById('btnAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const addUserClose = document.getElementById('addUserClose');
    const addUserCancel = document.getElementById('addUserCancel');
    const addUserSave = document.getElementById('addUserSave');
    const newUsernameInput = document.getElementById('newUsername');
    const usersListBody = document.getElementById('usersListBody');

    // ── Helpers ──────────────────────────────────────────────
    function formatDate(isoString) {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return '—';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Render User Info ─────────────────────────────────────
    function renderUserInfo() {
        if (topbarEmail) topbarEmail.textContent = sessionUser;
        if (topbarAvatar) {
            topbarAvatar.innerHTML = `<span class="profile-initial" style="font-weight: 700; color: #fff; font-size: 14px;">${sessionUser.charAt(0).toUpperCase()}</span>`;
            // Set dynamic background color based on length
            const colors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#f43f5e'];
            const colorIndex = sessionUser.toLowerCase() === 'admin' ? 0 : sessionUser.toLowerCase() === 'nguyên' ? 1 : sessionUser.length % colors.length;
            topbarAvatar.style.background = colors[colorIndex];
        }

        // Show Manage Users button only for Admin
        if (btnManageUsers && sessionUser.toLowerCase() === 'admin') {
            btnManageUsers.style.display = 'inline-flex';
        }
    }

    // ── Projects CRUD Logic ──────────────────────────────────
    async function loadProjects() {
        if (loadingState) loadingState.style.display = 'block';
        if (projectsView) projectsView.style.display = 'none';

        try {
            const res = await fetch('/api/projects', {
                headers: getAuthHeaders()
            });
            if (res.status === 401) {
                handleLogout();
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch project list');
            projects = await res.json();
            renderProjects();
        } catch (e) {
            console.error('Load projects error:', e);
            if (projectGrid) {
                projectGrid.innerHTML = `<div style="color: var(--danger); text-align: center; grid-column: 1/-1; padding: 40px;">Error: ${e.message}</div>`;
            }
        } finally {
            if (loadingState) loadingState.style.display = 'none';
            if (projectsView && !isUserViewActive) projectsView.style.display = 'block';
        }
    }

    function renderProjects() {
        if (!projectGrid) return;

        if (projects.length === 0) {
            projectGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        projectGrid.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        projectGrid.innerHTML = projects.map((project, index) => {
            const speakerDisplay = project.speaker || '';
            const sourceDisplay = project.source || '';
            const delay = Math.min(index * 0.08, 0.6);

            return `
                <div class="project-card" style="animation-delay: ${delay}s" data-index="${index}">
                    <div class="project-card-header">
                        <div class="project-card-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </div>
                        <div class="project-card-actions">
                            <a class="card-action-btn" href="${escapeHtml(project.url)}" target="_blank" rel="noopener" title="Open in Google Sheets">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                            <button class="card-action-btn danger" data-delete-id="${project.id}" title="Remove project">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div class="project-card-name">${escapeHtml(project.name)}</div>

                    <div class="project-card-info">
                        <div class="info-row" data-edit-field="speaker" data-edit-index="${index}">
                            <span class="info-label">Speaker</span>
                            <span class="info-value ${speakerDisplay ? '' : 'empty'}">${speakerDisplay ? escapeHtml(speakerDisplay) : 'Not set'}</span>
                            <span class="info-edit-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </span>
                        </div>
                        <div class="info-row" data-edit-field="source" data-edit-index="${index}">
                            <span class="info-label">Source</span>
                            <span class="info-value ${sourceDisplay ? '' : 'empty'}">${sourceDisplay ? escapeHtml(sourceDisplay) : 'Not set'}</span>
                            <span class="info-edit-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </span>
                        </div>
                    </div>

                    <div class="project-card-footer">
                        <span class="project-card-date">${formatDate(project.createdAt)}</span>
                        <a href="app.html?sheetId=${encodeURIComponent(project.id)}&sheetName=${encodeURIComponent(project.name)}&sheetUrl=${encodeURIComponent(project.url || '')}" class="btn-open-project">
                            Open Project
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        attachCardListeners();
    }

    function attachCardListeners() {
        // Delete buttons
        document.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const pId = btn.dataset.deleteId;
                const project = projects.find(p => p.id === pId);
                if (!project) return;

                if (confirm(`Remove "${project.name}" from your project list?\n\n(The Google Sheet file will NOT be deleted from Google Drive)`)) {
                    try {
                        const res = await fetch('/api/projects', {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ id: pId })
                        });
                        if (!res.ok) throw new Error('Failed to delete project');
                        projects = projects.filter(p => p.id !== pId);
                        renderProjects();
                    } catch (err) {
                        alert('Could not remove project: ' + err.message);
                    }
                }
            });
        });

        // Edit info rows
        document.querySelectorAll('[data-edit-field]').forEach(row => {
            row.addEventListener('click', () => {
                const field = row.dataset.editField;
                const idx = parseInt(row.dataset.editIndex, 10);
                if (isNaN(idx) || idx < 0 || idx >= projects.length) return;
                openEditFieldModal(idx, field);
            });
        });
    }

    // ── Create Project Modal ─────────────────────────────────
    function openNewProjectModal() {
        if (!newProjectModal) return;
        const today = new Date().toISOString().slice(0, 10);
        if (modalProjectName) modalProjectName.value = 'Project_' + today;
        if (modalSpeaker) modalSpeaker.value = '';
        if (modalSource) modalSource.value = '';
        if (modalStatus) { modalStatus.style.display = 'none'; modalStatus.textContent = ''; }
        if (modalCreate) modalCreate.disabled = false;

        newProjectModal.style.display = 'flex';
        if (modalProjectName) modalProjectName.focus();
    }

    function closeNewProjectModal() {
        if (newProjectModal) newProjectModal.style.display = 'none';
    }

    async function handleCreateProject() {
        const projectName = modalProjectName ? modalProjectName.value.trim() : '';
        const speaker = modalSpeaker ? modalSpeaker.value.trim() : '';
        const source = modalSource ? modalSource.value.trim() : '';

        if (!projectName) {
            showModalStatus('Please enter a project name.', 'error');
            return;
        }

        if (modalCreate) modalCreate.disabled = true;
        showModalStatus('Creating Google Sheet clone via Apps Script owner...', 'loading');

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: projectName,
                    speaker,
                    source
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Server error');
            }

            // Project created successfully!
            projects.unshift(data);

            if (data.moveStatus === 'failed') {
                showModalStatus(`Created, but failed to move to folder: ${data.moveError} (Tạo thành công nhưng không chuyển được vào thư mục: ${data.moveError})`, 'error');
                setTimeout(() => {
                    closeNewProjectModal();
                    renderProjects();
                }, 6000);
            } else if (data.moveStatus === 'outdated_script') {
                showModalStatus('Created. Warning: Google Apps Script Web App is outdated. Please deploy a "New Version" (Tạo thành công. Cảnh báo: Google Apps Script chưa được deploy bản mới nhất)', 'error');
                setTimeout(() => {
                    closeNewProjectModal();
                    renderProjects();
                }, 6000);
            } else {
                showModalStatus('Project created successfully!', 'success');
                setTimeout(() => {
                    closeNewProjectModal();
                    renderProjects();
                }, 800);
            }

        } catch (err) {
            console.error('[Project] Create error:', err);
            showModalStatus('Error: ' + err.message, 'error');
            if (modalCreate) modalCreate.disabled = false;
        }
    }

    function showModalStatus(msg, type) {
        if (!modalStatus) return;
        modalStatus.style.display = 'flex';
        modalStatus.className = 'modal-status' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');

        if (type === 'loading') {
            modalStatus.innerHTML = `<span class="spinner"></span>${escapeHtml(msg)}`;
        } else {
            modalStatus.textContent = msg;
        }
    }

    // ── Edit Field Modal ─────────────────────────────────────
    function openEditFieldModal(index, field) {
        if (!editFieldModal) return;
        editingProject = { index, field };

        const project = projects[index];
        const isSource = field === 'source';
        const currentValue = isSource ? (project.source || '') : (project.speaker || '');

        if (editFieldTitle) editFieldTitle.textContent = isSource ? 'Edit Source / Link' : 'Edit Speaker';
        if (editFieldLabel) editFieldLabel.textContent = isSource ? 'Source / Link (B2)' : 'Speaker (B1)';
        if (editFieldInput) editFieldInput.value = currentValue;

        editFieldModal.style.display = 'flex';
        if (editFieldInput) editFieldInput.focus();
    }

    function closeEditFieldModal() {
        if (editFieldModal) editFieldModal.style.display = 'none';
        editingProject = null;
    }

    async function handleSaveField() {
        if (!editingProject) return;

        const { index, field } = editingProject;
        const project = projects[index];
        const newValue = editFieldInput ? editFieldInput.value.trim() : '';
        const isSource = field === 'source';

        // Prepare body
        const updateBody = {
            id: project.id,
            speaker: isSource ? project.speaker : newValue,
            source: isSource ? newValue : project.source
        };

        // Optimistically update frontend UI
        if (isSource) {
            project.source = newValue;
        } else {
            project.speaker = newValue;
        }
        renderProjects();
        closeEditFieldModal();

        // Save to backend via proxy
        try {
            const res = await fetch('/api/projects', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateBody)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update metadata');
            }
        } catch (err) {
            console.error('Update metadata failed:', err);
            alert('Warning: Could not save changes to Sheet. ' + err.message);
            // Refresh to restore original data
            loadProjects();
        }
    }

    // ── Admin: User Management Panel ─────────────────────────
    async function loadUsersList() {
        try {
            const res = await fetch('/api/users', {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to retrieve user profiles');
            users = await res.json();
            renderUsersList();
        } catch (err) {
            console.error(err);
            if (usersListBody) {
                usersListBody.innerHTML = `<tr><td colspan="3" style="color: var(--danger); text-align: center;">Failed to load user accounts.</td></tr>`;
            }
        }
    }

    function renderUsersList() {
        if (!usersListBody) return;
        usersListBody.innerHTML = '';

        if (users.length === 0) {
            usersListBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No profiles configured.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const isSet = user.hasPin;
            const badgeClass = isSet ? 'set' : 'unset';
            const badgeText = isSet ? 'Password PIN Set' : 'No PIN (Unconfigured)';
            
            const isSelfAdmin = user.username.toLowerCase() === 'admin';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong style="font-size: 14px; font-weight: 600;">${escapeHtml(user.username)}</strong>
                </td>
                <td>
                    <span class="user-pin-badge ${badgeClass}">${badgeText}</span>
                </td>
                <td>
                    <div class="user-actions-cell">
                        <button type="button" class="btn-user-action reset" data-change-username="${escapeHtml(user.username)}" title="Directly set a new 4-digit PIN for this user">
                            Change PIN
                        </button>
                        <button type="button" class="btn-user-action reset" data-reset-username="${escapeHtml(user.username)}" title="Require user to set a new PIN on next sign in">
                            Reset PIN
                        </button>
                        ${isSelfAdmin ? '' : `
                        <button type="button" class="btn-user-action delete" data-delete-username="${escapeHtml(user.username)}" title="Remove profile and delete projects from database">
                            Delete Profile
                        </button>
                        `}
                    </div>
                </td>
            `;

            usersListBody.appendChild(row);
        });

        attachUserActionListeners();
    }

    function attachUserActionListeners() {
        // Change PIN
        document.querySelectorAll('[data-change-username]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.changeUsername;
                const newPin = prompt(`Enter a new 4-digit PIN for user "${username}":`);
                if (newPin === null) return; // Cancelled
                
                const pinTrimmed = newPin.trim();
                if (!/^\d{4}$/.test(pinTrimmed)) {
                    alert('Error: PIN must be a 4-digit number (e.g. 1234)');
                    return;
                }

                try {
                    const res = await fetch('/api/users', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            username,
                            pin: pinTrimmed,
                            action: 'changePin'
                        })
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Failed to change PIN');
                    }
                    const data = await res.json();
                    users = data.users;
                    renderUsersList();
                    alert(`Successfully updated PIN for user "${username}" on KV.`);
                } catch (err) {
                    alert(err.message);
                }
            });
        });

        // Reset PIN
        document.querySelectorAll('[data-reset-username]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.resetUsername;
                if (confirm(`Reset the PIN for user "${username}"?\n\nThey will need to set a new PIN the next time they select this profile.`)) {
                    try {
                        const res = await fetch('/api/users', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                username,
                                action: 'reset'
                            })
                        });
                        if (!res.ok) throw new Error('Failed to reset PIN');
                        const data = await res.json();
                        users = data.users;
                        renderUsersList();
                    } catch (err) {
                        alert(err.message);
                    }
                }
            });
        });

        // Delete user
        document.querySelectorAll('[data-delete-username]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.deleteUsername;
                if (confirm(`DANGER: Delete profile "${username}"?\n\nThis will completely delete their profile and project logs from KV! This cannot be undone.`)) {
                    try {
                        const res = await fetch('/api/users', {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ username })
                        });
                        if (!res.ok) throw new Error('Failed to delete user');
                        const data = await res.json();
                        users = data.users;
                        renderUsersList();
                    } catch (err) {
                        alert(err.message);
                    }
                }
            });
        });
    }

    // Toggle View (Projects vs Users)
    function toggleViewMode() {
        if (!btnManageUsers) return;

        isUserViewActive = !isUserViewActive;

        if (isUserViewActive) {
            btnManageUsers.classList.add('active');
            btnManageUsers.querySelector('span').textContent = 'Show Projects';
            btnManageUsers.querySelector('svg').outerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
            
            projectsView.style.display = 'none';
            userManagementView.style.display = 'block';
            if (btnNewProject) btnNewProject.style.display = 'none';

            if (pageTitle) pageTitle.textContent = 'User Accounts';
            if (pageSubtitle) pageSubtitle.textContent = 'Manage active editor profiles and lock states';

            loadUsersList();
        } else {
            btnManageUsers.classList.remove('active');
            btnManageUsers.querySelector('span').textContent = 'Manage Users';
            btnManageUsers.querySelector('svg').outerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;

            userManagementView.style.display = 'none';
            projectsView.style.display = 'block';
            if (btnNewProject) btnNewProject.style.display = 'inline-flex';

            if (pageTitle) pageTitle.textContent = 'Projects';
            if (pageSubtitle) pageSubtitle.textContent = 'Manage your video logging projects';

            loadProjects();
        }
    }

    // Open/Close Add User Modal
    function openAddUserModal() {
        if (addUserModal) addUserModal.style.display = 'flex';
        if (newUsernameInput) {
            newUsernameInput.value = '';
            newUsernameInput.focus();
        }
    }

    function closeAddUserModal() {
        if (addUserModal) addUserModal.style.display = 'none';
    }

    async function handleAddUserSave() {
        const username = newUsernameInput ? newUsernameInput.value.trim() : '';
        if (!username) {
            alert('Please enter a profile name');
            return;
        }

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    username,
                    action: 'create'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create profile');

            users = data.users;
            renderUsersList();
            closeAddUserModal();
        } catch (err) {
            alert(err.message);
        }
    }

    // ── Logout ───────────────────────────────────────────────
    function handleLogout() {
        localStorage.removeItem('autoscript_session_token');
        localStorage.removeItem('autoscript_session_username');
        window.location.href = 'login.html';
    }

    // ── Event Listeners ──────────────────────────────────────
    if (btnNewProject) btnNewProject.addEventListener('click', openNewProjectModal);
    if (btnNewProjectEmpty) btnNewProjectEmpty.addEventListener('click', openNewProjectModal);
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
    
    // Admin toggles
    if (btnManageUsers) btnManageUsers.addEventListener('click', toggleViewMode);
    if (btnAddUser) btnAddUser.addEventListener('click', openAddUserModal);

    // New project modal
    if (modalClose) modalClose.addEventListener('click', closeNewProjectModal);
    if (modalCancel) modalCancel.addEventListener('click', closeNewProjectModal);
    if (modalCreate) modalCreate.addEventListener('click', handleCreateProject);

    // Edit field modal
    if (editFieldClose) editFieldClose.addEventListener('click', closeEditFieldModal);
    if (editFieldCancel) editFieldCancel.addEventListener('click', closeEditFieldModal);
    if (editFieldSave) editFieldSave.addEventListener('click', handleSaveField);

    // Add user modal
    if (addUserClose) addUserClose.addEventListener('click', closeAddUserModal);
    if (addUserCancel) addUserCancel.addEventListener('click', closeAddUserModal);
    if (addUserSave) addUserSave.addEventListener('click', handleAddUserSave);

    // Close modals on overlay click
    [newProjectModal, editFieldModal, addUserModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (modal === editFieldModal) editingProject = null;
                }
            });
        }
    });

    // Keyboard shortcuts for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNewProjectModal();
            closeEditFieldModal();
            closeAddUserModal();
        }
        if (e.key === 'Enter') {
            if (editFieldModal && editFieldModal.style.display === 'flex') {
                e.preventDefault();
                handleSaveField();
            } else if (addUserModal && addUserModal.style.display === 'flex') {
                e.preventDefault();
                handleAddUserSave();
            } else if (newProjectModal && newProjectModal.style.display === 'flex') {
                e.preventDefault();
                handleCreateProject();
            }
        }
    });

    // ── Initialize ───────────────────────────────────────────
    renderUserInfo();
    loadProjects();

})();
