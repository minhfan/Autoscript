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
        window.location.href = '/tcpscript/login';
        return;
    }

    if (sessionUser.toLowerCase() !== 'admin') {
        window.location.href = '/tcpscript/project';
        return;
    }

    const API_URL = '/tcpscript/api/settings';
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
    const syncNotice = document.getElementById('syncNotice');
    const addUserModal = document.getElementById('addUserModal');
    const addUserClose = document.getElementById('addUserClose');
    const addUserCancel = document.getElementById('addUserCancel');
    const addUserSave = document.getElementById('addUserSave');
    const newUsernameInput = document.getElementById('newUsername');
    const pinModal = document.getElementById('pinModal');
    const pinModalTitle = document.getElementById('pinModalTitle');
    const pinModalLabel = document.getElementById('pinModalLabel');
    const pinModalInput = document.getElementById('pinModalInput');
    const pinModalClose = document.getElementById('pinModalClose');
    const pinModalCancel = document.getElementById('pinModalCancel');
    const pinModalConfirm = document.getElementById('pinModalConfirm');
    const confirmModal = document.getElementById('confirmModal');
    const confirmModalTitle = document.getElementById('confirmModalTitle');
    const confirmModalText = document.getElementById('confirmModalText');
    const confirmModalNote = document.getElementById('confirmModalNote');
    const confirmModalClose = document.getElementById('confirmModalClose');
    const confirmModalCancel = document.getElementById('confirmModalCancel');
    const confirmModalConfirm = document.getElementById('confirmModalConfirm');
    const messageModal = document.getElementById('messageModal');
    const messageModalTitle = document.getElementById('messageModalTitle');
    const messageModalText = document.getElementById('messageModalText');
    const messageModalNote = document.getElementById('messageModalNote');
    const messageModalClose = document.getElementById('messageModalClose');
    const messageModalConfirm = document.getElementById('messageModalConfirm');
    const settingTabButtons = Array.from(document.querySelectorAll('[data-setting-tab]'));
    const settingPanels = Array.from(document.querySelectorAll('[data-setting-panel]'));
    let syncNoticeTimer = null;
    let confirmModalResolver = null;
    let messageModalResolver = null;
    let pinModalResolver = null;

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

    function showSyncNotice(message) {
        if (!syncNotice) return;
        if (syncNoticeTimer) clearTimeout(syncNoticeTimer);
        syncNotice.textContent = message || 'Changes synced to KV successfully.';
        syncNotice.style.display = 'flex';
        syncNoticeTimer = setTimeout(() => {
            syncNotice.style.display = 'none';
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function closeConfirmModal(result) {
        if (confirmModal) confirmModal.style.display = 'none';
        if (confirmModalResolver) {
            const resolve = confirmModalResolver;
            confirmModalResolver = null;
            resolve(Boolean(result));
        }
    }

    function openConfirmModal(config) {
        if (!confirmModal || !confirmModalTitle || !confirmModalText || !confirmModalConfirm) {
            return Promise.resolve(false);
        }

        confirmModalTitle.textContent = config && config.title ? config.title : 'Confirm Action';
        confirmModalText.textContent = config && config.message ? config.message : 'Please confirm this action.';
        confirmModalConfirm.textContent = config && config.confirmText ? config.confirmText : 'Confirm';
        confirmModalConfirm.classList.toggle('btn-modal-danger', Boolean(config && config.isDanger));

        if (confirmModalNote) {
            const note = config && config.note ? config.note : '';
            confirmModalNote.textContent = note;
            confirmModalNote.style.display = note ? 'block' : 'none';
        }

        confirmModal.style.display = 'flex';
        confirmModalConfirm.focus();

        return new Promise((resolve) => {
            confirmModalResolver = resolve;
        });
    }

    function closeMessageModal() {
        if (messageModal) messageModal.style.display = 'none';
        if (messageModalResolver) {
            const resolve = messageModalResolver;
            messageModalResolver = null;
            resolve(true);
        }
    }

    function openMessageModal(config) {
        if (!messageModal || !messageModalTitle || !messageModalText) {
            return Promise.resolve(true);
        }

        messageModalTitle.textContent = config && config.title ? config.title : 'Notice';
        messageModalText.textContent = config && config.message ? config.message : '';

        if (messageModalNote) {
            const note = config && config.note ? config.note : '';
            messageModalNote.textContent = note;
            messageModalNote.style.display = note ? 'block' : 'none';
        }

        messageModal.style.display = 'flex';
        if (messageModalConfirm) messageModalConfirm.focus();

        return new Promise((resolve) => {
            messageModalResolver = resolve;
        });
    }

    function closePinModal(result) {
        if (pinModal) pinModal.style.display = 'none';
        if (pinModalResolver) {
            const resolve = pinModalResolver;
            pinModalResolver = null;
            resolve(result);
        }
    }

    function openPinModal(config) {
        if (!pinModal || !pinModalTitle || !pinModalInput) {
            return Promise.resolve(null);
        }

        if (pinModalTitle) pinModalTitle.textContent = config && config.title ? config.title : 'Change PIN';
        if (pinModalLabel) pinModalLabel.textContent = config && config.label ? config.label : 'New 4-digit PIN';
        if (pinModalConfirm) pinModalConfirm.textContent = config && config.confirmText ? config.confirmText : 'Save PIN';
        pinModalInput.value = '';
        pinModal.style.display = 'flex';
        pinModalInput.focus();

        return new Promise((resolve) => {
            pinModalResolver = resolve;
        });
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
                window.location.href = '/tcpscript/login';
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

            showSyncNotice('Settings synced to KV successfully.');
        } catch (err) {
            console.error('[Setting] Save error:', err);
            openMessageModal({
                title: 'Save Failed',
                message: 'Could not save settings to KV.',
                note: err.message,
                isDanger: true
            });
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
            const res = await fetch('/tcpscript/api/users', {
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
                const newPin = await openPinModal({
                    title: 'Change PIN',
                    label: `New 4-digit PIN for "${username}"`,
                    confirmText: 'Save PIN'
                });
                if (newPin === null) return;

                const pinTrimmed = newPin.trim();
                if (!/^\d{4}$/.test(pinTrimmed)) {
                    openMessageModal({
                        title: 'Invalid PIN',
                        message: 'PIN must be a 4-digit number.',
                        note: 'Example: 1234',
                        isDanger: true
                    });
                    return;
                }

                try {
                    const res = await fetch('/tcpscript/api/users', {
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
                    showSyncNotice(`PIN for "${username}" synced to KV successfully.`);
                } catch (err) {
                    openMessageModal({
                        title: 'PIN Update Failed',
                        message: `Could not update PIN for "${username}".`,
                        note: err.message,
                        isDanger: true
                    });
                }
            });
        });

        document.querySelectorAll('[data-reset-username]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.resetUsername;
                const shouldReset = await openConfirmModal({
                    title: 'Reset PIN',
                    message: `Reset the PIN for "${username}"?`,
                    note: 'They will need to set a new PIN the next time they select this profile.',
                    confirmText: 'Reset PIN'
                });
                if (!shouldReset) {
                    return;
                }

                try {
                    const res = await fetch('/tcpscript/api/users', {
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
                    showSyncNotice(`PIN reset for "${username}" synced to KV successfully.`);
                } catch (err) {
                    openMessageModal({
                        title: 'PIN Reset Failed',
                        message: `Could not reset PIN for "${username}".`,
                        note: err.message,
                        isDanger: true
                    });
                }
            });
        });

        document.querySelectorAll('[data-delete-username]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.deleteUsername;
                const shouldDelete = await openConfirmModal({
                    title: 'Delete Profile',
                    message: `Delete profile "${username}"?`,
                    note: 'This will completely delete their profile and project logs from KV. This cannot be undone.',
                    confirmText: 'Delete Profile',
                    isDanger: true
                });
                if (!shouldDelete) {
                    return;
                }

                try {
                    const res = await fetch('/tcpscript/api/users', {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ username })
                    });
                    if (!res.ok) throw new Error('Failed to delete user');
                    const data = await res.json();
                    users = data.users;
                    renderUsersList();
                    showSyncNotice(`Profile "${username}" removed from KV successfully.`);
                } catch (err) {
                    openMessageModal({
                        title: 'Delete Failed',
                        message: `Could not delete profile "${username}".`,
                        note: err.message,
                        isDanger: true
                    });
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
            openMessageModal({
                title: 'Missing Profile Name',
                message: 'Please enter a profile name.'
            });
            return;
        }

        try {
            const res = await fetch('/tcpscript/api/users', {
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
            showSyncNotice(`Profile "${username}" synced to KV successfully.`);
        } catch (err) {
            openMessageModal({
                title: 'Create Failed',
                message: `Could not create profile "${username}".`,
                note: err.message,
                isDanger: true
            });
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
    if (pinModalClose) pinModalClose.addEventListener('click', () => closePinModal(null));
    if (pinModalCancel) pinModalCancel.addEventListener('click', () => closePinModal(null));
    if (pinModalConfirm) pinModalConfirm.addEventListener('click', () => closePinModal(pinModalInput ? pinModalInput.value : ''));
    if (confirmModalClose) confirmModalClose.addEventListener('click', () => closeConfirmModal(false));
    if (confirmModalCancel) confirmModalCancel.addEventListener('click', () => closeConfirmModal(false));
    if (confirmModalConfirm) confirmModalConfirm.addEventListener('click', () => closeConfirmModal(true));
    if (messageModalClose) messageModalClose.addEventListener('click', closeMessageModal);
    if (messageModalConfirm) messageModalConfirm.addEventListener('click', closeMessageModal);

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
    if (pinModal) {
        pinModal.addEventListener('click', (e) => {
            if (e.target === pinModal) {
                closePinModal(null);
            }
        });
    }
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                closeConfirmModal(false);
            }
        });
    }
    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                closeMessageModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddUserModal();
            closePinModal(null);
            closeConfirmModal(false);
            closeMessageModal();
        }
        if (e.key === 'Enter' && addUserModal && addUserModal.style.display === 'flex') {
            e.preventDefault();
            handleAddUserSave();
        }
        if (e.key === 'Enter' && pinModal && pinModal.style.display === 'flex') {
            e.preventDefault();
            closePinModal(pinModalInput ? pinModalInput.value : '');
        }
    });

    // ── Initialize ───────────────────────────────────────────
    setActiveSettingTab(localStorage.getItem(SETTING_TAB_STORAGE_KEY) || 'application');
    loadSettings();
    loadUsersList();

})();
