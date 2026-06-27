// ============================================================
//  AUTOSCRIPT TCP Pro — playback.js
//  Video playback, preview-cut, speed, TC mark/jump.
//  Depends on: state.js, timecode.js, renderer.js, modals.js
// ============================================================

// ── Playback ──────────────────────────────────────────────────
function togglePlayback() {
    const video = document.getElementById('videoPlayer');
    if (video.paused) video.play();
    else video.pause();
}

function updateToolbarPlayState() {
    const video = document.getElementById('videoPlayer');
    const btnPlayVideo   = document.getElementById('btnPlayVideo');
    const btnPlayReverse = document.getElementById('btnPlayReverse');
    if (!btnPlayVideo) return;
    if (!video.paused) {
        btnPlayVideo.innerHTML = '&#10074;&#10074;';
        btnPlayVideo.classList.remove('primary');
        btnPlayVideo.title = 'Tạm dừng video';
        if (reverseInterval) { clearInterval(reverseInterval); reverseInterval = null; if (btnPlayReverse) btnPlayReverse.classList.remove('active'); }
    } else if (reverseInterval) {
        btnPlayVideo.innerHTML = '&#10074;&#10074;';
        btnPlayVideo.classList.remove('primary');
        btnPlayVideo.title = 'Tạm dừng tua lùi';
    } else {
        btnPlayVideo.innerHTML = '&#9658;';
        btnPlayVideo.classList.add('primary');
        btnPlayVideo.title = 'Phát video';
    }
    btnPlayVideo.setAttribute('aria-label', btnPlayVideo.title);
}

function endPreview() {
    const btnPreviewCut = document.getElementById('btnPreviewCut');
    if (previewState.restorePreviewCut) {
        isPreviewCut = originalPreviewCutState;
        if (btnPreviewCut) {
            btnPreviewCut.classList.toggle('active', isPreviewCut);
            btnPreviewCut.title = isPreviewCut ? 'Preview Cut: ON (P)' : 'Preview Cut: OFF (P)';
        }
        previewState.restorePreviewCut = false;
    }
    previewState.active = false;
}

function togglePreviewCut() {
    const btnPreviewCut = document.getElementById('btnPreviewCut');
    const video = document.getElementById('videoPlayer');
    isPreviewCut = !isPreviewCut;
    masterSwap = null;
    if (btnPreviewCut) {
        btnPreviewCut.classList.toggle('active', isPreviewCut);
        btnPreviewCut.title = isPreviewCut ? 'Preview Cut: ON (P)' : 'Preview Cut: OFF (P)';
    }
    // Turning it ON starts auto-preview: play through, skipping DELETE segments
    // and substituting SWAP segments (handled in the timeupdate loop).
    if (isPreviewCut && video && video.duration && video.paused && !reverseInterval) {
        video.play();
    }
}

window.playActionPreview = function(index) {
    const video = document.getElementById('videoPlayer');
    const btnPreviewCut = document.getElementById('btnPreviewCut');
    const log = logs[index];
    if (!log) return;

    originalPreviewCutState = isPreviewCut;
    if (!isPreviewCut) {
        isPreviewCut = true;
        if (btnPreviewCut) { btnPreviewCut.classList.add('active'); btnPreviewCut.title = 'Preview Cut: ON (P)'; }
    }

    previewState.active = true;
    previewState.logIndex = index;
    previewState.restorePreviewCut = true;

    const iSec = Number.isFinite(log.inSec)   ? log.inSec   : parseTC(log.tcin);
    const oSec = Number.isFinite(log.outSec)   ? log.outSec  : parseTC(log.tcout);
    const sSec = (log.action === 'SWAP' && Number.isFinite(log.swapSec)) ? log.swapSec : parseTC(log.tcswap || '');

    if (log.action === 'SWAP' && Number.isFinite(sSec) && sSec > 0) {
        previewState.phase = 1;
        video.currentTime = Math.max(0, sSec - 2);
    } else if (log.action === 'DELETE') {
        previewState.phase = 0;
        video.currentTime = Math.max(0, iSec - 2);
    } else {
        previewState.phase = 0;
        video.currentTime = Number.isFinite(iSec) ? Math.max(0, iSec - 2) : 0;
    }
    video.play();

    let pts = [];
    if (Number.isFinite(iSec)) pts.push(iSec);
    if (Number.isFinite(oSec) && oSec > 0) pts.push(oSec);
    if (log.action === 'SWAP' && Number.isFinite(sSec) && sSec > 0) pts.push(sSec);
    let centerSec = iSec || 0;
    let targetZoom = 50;
    if (pts.length >= 2) {
        const minSec = Math.min(...pts);
        const maxSec = Math.max(...pts);
        const validDur = maxSec - minSec;
        if (validDur > 0) {
            targetZoom = Math.max(1, Math.min(50, video.duration / (validDur * 3)));
            centerSec  = minSec + validDur / 2;
        }
    }
    applyZoom(targetZoom, false, centerSec);
};

// ── TC IN / OUT / SWAP ────────────────────────────────────────
function markInPoint() {
    const video   = document.getElementById('videoPlayer');
    const valTcIn = document.getElementById('valTcIn');
    const boxIn   = document.getElementById('boxIn');
    const boxOut  = document.getElementById('boxOut');
    const valTcOut = document.getElementById('valTcOut');
    if (!video.duration) return;
    if (editingRowIndex !== null) {
        activeInSec = video.currentTime;
        if (valTcIn) valTcIn.innerText = formatTC(activeInSec);
        logs[editingRowIndex].inSec = activeInSec;
        logs[editingRowIndex].tcin  = formatTC(activeInSec);
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row) { const cells = row.querySelectorAll('td'); if (cells[4]) cells[4].innerText = formatTC(activeInSec); }
        drawMarkers(); updateActiveRange(); return;
    }
    if (activeInSec !== null) {
        activeInSec = null;
        if (boxIn) boxIn.classList.remove('active');
        if (valTcIn) valTcIn.innerText = formatTC(video.currentTime);
        updateActiveRange(); return;
    }
    activeInSec = video.currentTime;
    if (activeOutSec !== null && activeOutSec <= activeInSec) {
        activeOutSec = null;
        if (valTcOut) valTcOut.innerText = formatTC(video.currentTime);
        if (boxOut) boxOut.classList.remove('active');
    }
    if (valTcIn) valTcIn.innerText = formatTC(activeInSec);
    if (boxIn) boxIn.classList.add('active');
    updateActiveRange();
}

function markOutPoint() {
    const video    = document.getElementById('videoPlayer');
    const valTcOut = document.getElementById('valTcOut');
    const valTcIn  = document.getElementById('valTcIn');
    const boxOut   = document.getElementById('boxOut');
    const boxIn    = document.getElementById('boxIn');
    if (!video.duration) return;
    if (editingRowIndex !== null) {
        activeOutSec = video.currentTime;
        if (valTcOut) valTcOut.innerText = formatTC(activeOutSec);
        logs[editingRowIndex].outSec = activeOutSec;
        logs[editingRowIndex].tcout  = formatTC(activeOutSec);
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row) { const cells = row.querySelectorAll('td'); if (cells[5]) cells[5].innerText = formatTC(activeOutSec); }
        drawMarkers(); updateActiveRange(); return;
    }
    if (activeOutSec !== null) {
        activeOutSec = null;
        if (boxOut) boxOut.classList.remove('active');
        if (valTcOut) valTcOut.innerText = formatTC(video.currentTime);
        updateActiveRange(); return;
    }
    activeOutSec = video.currentTime;
    if (activeInSec !== null && activeInSec >= activeOutSec) {
        activeInSec = null;
        if (valTcIn) valTcIn.innerText = formatTC(video.currentTime);
        if (boxIn) boxIn.classList.remove('active');
    }
    if (valTcOut) valTcOut.innerText = formatTC(activeOutSec);
    if (boxOut) boxOut.classList.add('active');
    updateActiveRange();
}

function markSwapPoint() {
    const video     = document.getElementById('videoPlayer');
    const valTcSwap = document.getElementById('valTcSwap');
    const boxSwap   = document.getElementById('boxSwap');
    if (!video.duration) return;
    if (editingRowIndex !== null) {
        activeSwapSec = video.currentTime;
        if (valTcSwap) valTcSwap.innerText = formatTC(activeSwapSec);
        logs[editingRowIndex].swapSec = activeSwapSec;
        logs[editingRowIndex].tcswap  = formatTC(activeSwapSec);
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row) { const cells = row.querySelectorAll('td'); if (cells[3]) cells[3].innerText = formatTC(activeSwapSec); }
        drawMarkers(); updateActiveRange(); return;
    }
    if (activeSwapSec !== null) {
        activeSwapSec = null;
        if (boxSwap) boxSwap.classList.remove('active');
        if (valTcSwap) valTcSwap.innerText = formatTC(video.currentTime);
        updateActiveRange(); return;
    }
    activeSwapSec = video.currentTime;
    if (valTcSwap) valTcSwap.innerText = formatTC(activeSwapSec);
    if (boxSwap) boxSwap.classList.add('active');
    updateActiveRange();
}

// ── Jump Marker ───────────────────────────────────────────────
function jumpMarker(direction) {
    const video = document.getElementById('videoPlayer');
    if (!logs.length) return;
    const sorted = [...logs].sort((a, b) => a.inSec - b.inSec);
    let target = null;
    if (direction === 1) {
        const next = sorted.find(l => l.inSec > video.currentTime + 0.5);
        if (next) target = next.inSec;
    } else {
        const prevs = sorted.filter(l => l.inSec < video.currentTime - 0.5);
        if (prevs.length) target = prevs[prevs.length - 1].inSec;
    }
    if (target !== null) video.currentTime = target;
}

function skipTime(seconds) {
    const video = document.getElementById('videoPlayer');
    if (!video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}

// ── TC jump deselect on play/seek ────────────────────────────
function clearAutoSelectedTC() {
    const video    = document.getElementById('videoPlayer');
    const valTcIn  = document.getElementById('valTcIn');
    const valTcOut = document.getElementById('valTcOut');
    const valTcSwap = document.getElementById('valTcSwap');
    const boxIn    = document.getElementById('boxIn');
    const boxOut   = document.getElementById('boxOut');
    const boxSwap  = document.getElementById('boxSwap');
    activeInSec = null; activeOutSec = null; activeSwapSec = null;
    if (valTcIn)  valTcIn.innerText  = formatTC(video.currentTime);
    if (valTcOut) valTcOut.innerText = formatTC(video.currentTime);
    if (valTcSwap) valTcSwap.innerText = formatTC(video.currentTime);
    if (boxIn)  boxIn.classList.remove('active');
    if (boxOut) boxOut.classList.remove('active');
    if (boxSwap) boxSwap.classList.remove('active');
    updateActiveRange();
    tcAutoSelected = false;
}

// ── TC Jump Overlay ───────────────────────────────────────────
function showTimecodeJump() {
    const video   = document.getElementById('videoPlayer');
    const overlay = document.getElementById('tcJumpOverlay');
    const input   = document.getElementById('tcJumpInput');
    const bigTc   = document.getElementById('bigTimecode');
    if (!overlay || !input) return;
    overlay.style.display = 'flex';
    if (bigTc) input.value = bigTc.innerText;
    input.focus(); input.select();
}

function hideTimecodeJump() {
    const overlay = document.getElementById('tcJumpOverlay');
    if (overlay) overlay.style.display = 'none';
}

function executeTimecodeJump() {
    const video = document.getElementById('videoPlayer');
    const input = document.getElementById('tcJumpInput');
    if (!input) return;
    const sec = parseTC(input.value);
    if (sec > 0 && sec <= video.duration) video.currentTime = sec;
    hideTimecodeJump();
}

// ── Update Action Buttons ─────────────────────────────────────
function updateActionButtons() {
    const actionButtons = Array.from(document.querySelectorAll('#actionButtonGroup .action-button'));
    actionButtons.forEach(btn => {
        const action   = btn.dataset.action;
        let customObj = null;
        if (Array.isArray(customActions)) {
            customObj = customActions.find(a => typeof a === 'object' && a.name === action);
        }
        const colorSet = customObj ? { bg: customObj.color, color: '#ffffff' } : (actionColors[action] || actionColors['OTHERS']);
        const active   = action === selectedAction;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', String(active));
        btn.style.setProperty('--action-bg',    colorSet.bg);
        btn.style.setProperty('--action-color', colorSet.color);
    });
}

function setSelectedAction(action) {
    const video   = document.getElementById('videoPlayer');
    const boxSwap = document.getElementById('boxSwap');
    selectedAction = action;
    updateActionButtons();
    if (boxSwap) boxSwap.style.display = action === 'SWAP' ? 'block' : 'none';
    updateActiveRange();
    if (editingRowIndex !== null) {
        logs[editingRowIndex].action = action;
        renderTable(); drawMarkers();
    }
}

// ── Transcript Sync ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('videoPlayer');
    if (video) {
        video.addEventListener('timeupdate', () => {
            const overlay = document.getElementById('subOverlay');
            if (!overlay || !transcriptData || transcriptData.length === 0) return;
            
            const ct = video.currentTime;
            const currentSub = transcriptData.find(sub => ct >= sub.start && ct <= sub.end);
            
            const newText = currentSub ? currentSub.text : '';
            const isVisible = document.getElementById('subVisibilityCheck')?.checked !== false;
            
            if (overlay.textContent !== newText) {
                overlay.textContent = newText;
            }
            // Always update display in case visibility settings changed but text remained the same
            overlay.style.display = (overlay.textContent && isVisible) ? 'inline-block' : 'none';
        });
    }
});
