// ============================================================
//  AUTOSCRIPT TCP Pro — modals.js
//  openMessageModal, closeMessageModal, openConfirmModal,
//  showRowMenu, hideContextMenu
//  Depends on: state.js
// ============================================================

// ── Toast (non-blocking notifications) ───────────────────────
function showToast(message, type = 'success', duration = 2600) {
    let host = document.getElementById('toastHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg"></span>`;
    toast.querySelector('.toast-msg').innerText = message || '';
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    const remove = () => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 220);
    };
    const timer = setTimeout(remove, duration);
    toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

// ── Message Modal ─────────────────────────────────────────────
function closeMessageModal() {
    const mMessage = document.getElementById('messageModal');
    if (mMessage) mMessage.style.display = 'none';
}

function openMessageModal(title, message) {
    const mMessage     = document.getElementById('messageModal');
    const titleEl      = document.getElementById('messageModalTitle');
    const bodyEl       = document.getElementById('messageModalBody');
    if (!mMessage || !titleEl || !bodyEl) {
        console.warn('[Modal fallback]', title, message);
        return;
    }
    titleEl.innerText = title   || 'Thông báo';
    bodyEl.innerText  = message || '';
    mMessage.style.display = 'flex';
}

// ── Confirm Modal (Promise-based) ─────────────────────────────
function openConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modal     = document.getElementById('confirmModal');
        const titleEl   = document.getElementById('confirmModalTitle');
        const bodyEl    = document.getElementById('confirmModalBody');
        const btnOK     = document.getElementById('btnConfirmOK');
        const btnCancel = document.getElementById('btnConfirmCancel');
        if (!modal || !titleEl || !bodyEl) { resolve(confirm(message)); return; }

        titleEl.innerText = title   || 'Xác nhận';
        bodyEl.innerText  = message || '';
        modal.style.display = 'flex';

        function cleanup() {
            modal.style.display = 'none';
            btnOK.removeEventListener('click', onOK);
            btnCancel.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
        }
        function onOK()      { cleanup(); resolve(true); }
        function onCancel()  { cleanup(); resolve(false); }
        function onBackdrop(e) { if (e.target === modal) { cleanup(); resolve(false); } }

        btnOK.addEventListener('click', onOK);
        btnCancel.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
    });
}

// ── Row Context Menu ──────────────────────────────────────────
function hideContextMenu() {
    const menu = document.getElementById('rowContextMenu');
    if (menu) menu.style.display = 'none';
}

window.showRowMenu = function(e, index) {
    e.preventDefault();
    menuTargetIndex = index;
    const menu = document.getElementById('rowContextMenu');
    if (menu) {
        menu.style.display = 'flex';
        menu.style.left    = e.pageX + 'px';
        menu.style.top     = e.pageY + 'px';
    }
};
