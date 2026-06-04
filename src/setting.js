// ============================================================
//  AUTOSCRIPT TCP — Setting Page Logic
//  Fetches settings from Cloudflare KV via /api/settings,
//  saves updated values back to KV on "Save" click.
//  Restricted to Admin profile only.
// ============================================================

(function () {
    'use strict';

    // ── Session Checking & Auth ─────────────────────────────
    const sessionToken = localStorage.getItem('autoscript_session_token');
    const sessionUser = localStorage.getItem('autoscript_session_username');

    if (!sessionToken || !sessionUser) {
        window.location.href = 'login.html';
        return;
    }

    if (sessionUser.toLowerCase() !== 'admin') {
        window.location.href = 'project.html';
        return;
    }

    const API_URL = '/api/settings';
    const SETTING_TAB_STORAGE_KEY = 'autoscript_setting_active_tab';
    let users = [];

    // Helper for API headers
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
        };
    }

    // ── DOM References ───────────────────────────────────────
    const settingLoading = document.getElementById('settingLoading');
    const settingForm = document.getElementById('settingForm');
    const settingWebAppUrl = document.getElementById('settingWebAppUrl');
    const settingTemplateId = document.getElementById('settingTemplateId');
    const settingFolderId = document.getElementById('settingFolderId');
    const btnSave = document.getElementById('btnSave');
    const formStatus = document.getElementById('formStatus');
    const usersListBody = document.getElementById('usersListBody');
    const btnAddUser = document.getElementById('btnAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const addUserClose = document.getElementById('addUserClose');
    const addUserCancel = document.getElementById('addUserCancel');
    const addUserSave = document.getElementById('addUserSave');
    const newUsernameInput = document.getElementById('newUsername');
    const settingTabButtons = Array.from(document.querySelectorAll('[data-setting-tab]'));
    const settingPanels = Array.from(document.querySelectorAll('[data-setting-panel]'));

    // ── Helpers ──────────────────────────────────────────────
    function showStatus(msg, type) {
        if (!formStatus) return;
        formStatus.textContent = msg;
        formStatus.className = 'form-status ' + type;
        formStatus.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                formStatus.style.display = 'none';
            }, 4000);
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function setActiveSettingTab(tabName) {
        const hasPanel = settingPanels.some((panel) => panel.dataset.settingPanel === tabName);
        const nextTab = hasPanel ? tabName : 'application';

        settingTabButtons.forEach((button) => {
            const isActive = button.dataset.settingTab === nextTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.tabIndex = isActive ? 0 : -1;
        });

        settingPanels.forEach((panel) => {
            panel.hidden = panel.dataset.settingPanel !== nextTab;
        });

        localStorage.setItem(SETTING_TAB_STORAGE_KEY, nextTab);
    }

    // ── Load settings from KV ────────────────────────────────
    async function loadSettings() {
        const defaultWebAppUrl = 'https://script.google.com/macros/s/EXAMPLE_SPREADSHEET_APPS_SCRIPT_URL_ABC123/exec';
        const defaultTemplateId = '1S6YxzKJE7X5vZRZduA36KDc_E00Cdkxp2mD3VXhwfmA';

        try {
            const res = await fetch(API_URL, {
                headers: getAuthHeaders()
            });
            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            if (settingWebAppUrl) {
                settingWebAppUrl.value = data.googleSheetsWebAppUrl || localStorage.getItem('autoscript_google_sheets_url') || defaultWebAppUrl;
            }
            if (settingTemplateId) {
                settingTemplateId.value = data.googleTemplateId || localStorage.getItem('autoscript_google_template_id') || defaultTemplateId;
            }
            if (settingFolderId) {
                settingFolderId.value = data.googleDriveFolderId || localStorage.getItem('autoscript_google_folder_id') || '';
            }
        } catch (err) {
            console.warn('[Setting] Could not load from KV, trying localStorage:', err);

            // Fallback: load from localStorage
            if (settingWebAppUrl) {
                settingWebAppUrl.value = localStorage.getItem('autoscript_google_sheets_url') || defaultWebAppUrl;
            }
            if (settingTemplateId) {
                settingTemplateId.value = localStorage.getItem('autoscript_google_template_id') || defaultTemplateId;
            }
            if (settingFolderId) {
                settingFolderId.value = localStorage.getItem('autoscript_google_folder_id') || '';
            }
        } finally {
            // Show form, hide loading
            if (settingLoading) settingLoading.style.display = 'none';
            if (settingForm) settingForm.style.display = '';
        }
    }

    // ── Save settings to KV ──────────────────────────────────
    async function saveSettings() {
        if (formStatus) formStatus.style.display = 'none';

        const webAppUrl = settingWebAppUrl ? settingWebAppUrl.value.trim() : '';
        let templateId = settingTemplateId ? settingTemplateId.value.trim() : '';
        let folderId = settingFolderId ? settingFolderId.value.trim() : '';

        // Auto-extract Sheet ID if a full Google Sheets URL is pasted
        if (templateId) {
            const sheetIdMatch = templateId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_\-]+)/);
            if (sheetIdMatch && sheetIdMatch[1]) {
                templateId = sheetIdMatch[1];
                if (settingTemplateId) settingTemplateId.value = templateId;
            }
        }

        // Auto-extract Folder ID if a full Google Drive Folder URL is pasted
        if (folderId) {
            const folderIdMatch = folderId.match(/\/folders\/([a-zA-Z0-9_\-]+)/);
            if (folderIdMatch && folderIdMatch[1]) {
                folderId = folderIdMatch[1];
                if (settingFolderId) settingFolderId.value = folderId;
            }
        }

        if (!webAppUrl || webAppUrl.includes('EXAMPLE_SPREADSHEET_APPS_SCRIPT_URL_ABC123')) {
            showStatus('Google Sheets Web App URL is required.', 'error');
            if (settingWebAppUrl) settingWebAppUrl.focus();
            return;
        }

        if (!templateId) {
            showStatus('Template Spreadsheet ID or URL is required.', 'error');
            if (settingTemplateId) settingTemplateId.focus();
            return;
        }

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.classList.add('saving');
            btnSave.querySelector('span').textContent = 'Saving...';
        }

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    googleSheetsWebAppUrl: webAppUrl,
                    googleTemplateId: templateId,
                    googleDriveFolderId: folderId
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'HTTP ' + res.status);
            }

            // Also save to localStorage as cache
            localStorage.setItem('autoscript_google_sheets_url', webAppUrl);
            localStorage.setItem('autoscript_google_template_id', templateId);
            localStorage.setItem('autoscript_google_folder_id', folderId);

            showStatus('Settings saved to Cloudflare KV successfully.', 'success');
        } catch (err) {
            console.error('[Setting] Save error:', err);
            showStatus('Failed to save: ' + err.message, 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.classList.remove('saving');
                btnSave.querySelector('span').textContent = 'Save to Cloud';
            }
        }
    }

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
                usersListBody.innerHTML = `<tr><td colspan="3" class="users-table-placeholder" style="color: #fca5a5;">Failed to load user accounts.</td></tr>`;
            }
        }
    }

    function renderUsersList() {
        if (!usersListBody) return;
        usersListBody.innerHTML = '';

        if (users.length === 0) {
            usersListBody.innerHTML = `<tr><td colspan="3" class="users-table-placeholder">No profiles configured.</td></tr>`;
            return;
        }

        users.forEach((user) => {
            const isSet = user.hasPin;
            const badgeClass = isSet ? 'set' : 'unset';
            const badgeText = isSet ? 'Password PIN Set' : 'No PIN (Unconfigured)';
            const isSelfAdmin = user.username.toLowerCase() === 'admin';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong style="font-size: 14px; font-weight: 600;">${escapeHtml(user.username)}</strong></td>
                <td><span class="user-pin-badge ${badgeClass}">${badgeText}</span></td>
                <td>
                    <div class="user-actions-cell">
                        <button type="button" class="btn-user-action reset" data-change-username="${escapeHtml(user.username)}">Change PIN</button>
                        <button type="button" class="btn-user-action reset" data-reset-username="${escapeHtml(user.username)}">Reset PIN</button>
                        ${isSelfAdmin ? '' : `<button type="button" class="btn-user-action delete" data-delete-username="${escapeHtml(user.username)}">Delete Profile</button>`}
                    </div>
                </td>
            `;

            usersListBody.appendChild(row);
        });

        attachUserActionListeners();
    }

    function attachUserActionListeners() {
        document.querySelectorAll('[data-change-username]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.changeUsername;
                const newPin = prompt(`Enter a new 4-digit PIN for user "${username}":`);
                if (newPin === null) return;

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

        document.querySelectorAll('[data-reset-username]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.resetUsername;
                if (!confirm(`Reset the PIN for user "${username}"?\n\nThey will need to set a new PIN the next time they select this profile.`)) {
                    return;
                }

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
            });
        });

        document.querySelectorAll('[data-delete-username]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.deleteUsername;
                if (!confirm(`DANGER: Delete profile "${username}"?\n\nThis will completely delete their profile and project logs from KV! This cannot be undone.`)) {
                    return;
                }

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
            });
        });
    }

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

    // ── Event Listeners ──────────────────────────────────────
    if (btnSave) {
        btnSave.addEventListener('click', saveSettings);
    }
    if (btnAddUser) {
        btnAddUser.addEventListener('click', openAddUserModal);
    }
    settingTabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setActiveSettingTab(button.dataset.settingTab);
        });
    });
    if (addUserClose) addUserClose.addEventListener('click', closeAddUserModal);
    if (addUserCancel) addUserCancel.addEventListener('click', closeAddUserModal);
    if (addUserSave) addUserSave.addEventListener('click', handleAddUserSave);

    // Save on Enter key in inputs
    [settingWebAppUrl, settingTemplateId, settingFolderId].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveSettings();
                }
            });
        }
    });

    if (addUserModal) {
        addUserModal.addEventListener('click', (e) => {
            if (e.target === addUserModal) {
                closeAddUserModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddUserModal();
        }
        if (e.key === 'Enter' && addUserModal && addUserModal.style.display === 'flex') {
            e.preventDefault();
            handleAddUserSave();
        }
    });

    // ── Initialize ───────────────────────────────────────────
    setActiveSettingTab(localStorage.getItem(SETTING_TAB_STORAGE_KEY) || 'application');
    loadSettings();
    loadUsersList();

})();
