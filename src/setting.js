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

    // ── Event Listeners ──────────────────────────────────────
    if (btnSave) {
        btnSave.addEventListener('click', saveSettings);
    }

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

    // ── Initialize ───────────────────────────────────────────
    loadSettings();

})();
