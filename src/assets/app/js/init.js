// ============================================================
//  AUTOSCRIPT TCP Pro — init.js
//  Bootstrap: DOM refs, event listeners, initial data load.
//  Must be loaded LAST after all other modules.
// ============================================================

// ── Debug Error Catcher ───────────────────────────────────────
window.__jsErrors = [];
window.onerror = function(msg, src, line) {
    window.__jsErrors.push(msg + ' @ ' + src + ':' + line);
    console.error('[AUTOSCRIPT ERROR]', msg, '@', src, ':', line);
};

// ── Read URL Params → Project Identity ───────────────────────
window.formatText = function(elementId, command) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.focus();
    document.execCommand(command, false, null);
    if (typeof updateFormatButtonsState === 'function') {
        updateFormatButtonsState();
    }
    el.dispatchEvent(new Event('input'));
};

document.addEventListener("DOMContentLoaded", () => {
    ['inputScript', 'inputNote'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            Object.defineProperty(el, 'value', {
                get: function() { 
                    let html = this.innerHTML;
                    html = html.replace(/<div><br><\/div>/gi, '\n');
                    html = html.replace(/<div>/gi, '\n');
                    html = html.replace(/<\/div>/gi, '');
                    html = html.replace(/<p>/gi, '\n');
                    html = html.replace(/<\/p>/gi, '');
                    html = html.replace(/<br>/gi, '\n');
                    return html;
                },
                set: function(val) { 
                    this.innerHTML = String(val).replace(/\n/g, '<br>'); 
                }
            });
        }
    });
});

(function applyUrlParams() {
    const urlParams  = new URLSearchParams(window.location.search);
    const urlSheetId   = urlParams.get('sheetId');
    const urlSheetName = urlParams.get('sheetName');
    const urlSheetUrl  = urlParams.get('sheetUrl');
    const pathSheetId  = getSpreadsheetIdFromPath();
    const resolvedSheetId = urlSheetId || pathSheetId;
    if (resolvedSheetId) {
        currentSpreadsheetId   = resolvedSheetId;
        currentSpreadsheetUrl  = urlSheetUrl  || `https://docs.google.com/spreadsheets/d/${resolvedSheetId}/edit`;
        currentSpreadsheetName = urlSheetName || 'Google Sheet';
        currentProjectVideoMeta = getCachedProjectVideoMeta(resolvedSheetId);
        localStorage.setItem('autoscript_current_spreadsheet_id',   currentSpreadsheetId);
        localStorage.setItem('autoscript_current_spreadsheet_url',  currentSpreadsheetUrl);
        localStorage.setItem('autoscript_current_spreadsheet_name', currentSpreadsheetName);
    }
})();

// ── Legacy OAuth stubs ────────────────────────────────────────
function isTokenValid() { return true; }
function updateGoogleUI() {} // legacy stub – overridden below
window.initGoogleOAuth = function() {};
function handleGoogleAuthClick() {}

// ── Resizer ───────────────────────────────────────────────────
(function initResizers() {
    const mainContainer = document.getElementById('mainContainer');
    const leftCol       = document.getElementById('leftCol');
    const rightCol      = document.getElementById('tablePanel');
    const resizerV      = document.getElementById('resizerV');
    const resizerH1     = document.getElementById('resizerH1');
    const resizerH2     = document.getElementById('resizerH2');
    const videoSection  = document.getElementById('videoSection');
    const formSection   = document.getElementById('formSection');
    const floatPanel    = document.getElementById('floatHelpPanel');
    const floatHeader   = document.getElementById('floatHelpHeader');

    if (resizerV)  resizerV.addEventListener('mousedown',  e => { isResizingV  = true; document.body.style.cursor = 'col-resize'; e.preventDefault(); });
    if (resizerH2) resizerH2.addEventListener('mousedown', e => { isResizingH2 = true; document.body.style.cursor = 'row-resize'; e.preventDefault(); });

    window.addEventListener('mousemove', e => {
        if (isResizingV) {
            const rect = mainContainer.getBoundingClientRect();
            const pct  = ((e.clientX - rect.left) / rect.width) * 100;
            if (pct > 20 && pct < 80) { leftCol.style.width = pct + '%'; rightCol.style.width = (100 - pct) + '%'; }
        }

        if (isResizingH2) {
            const rect = leftCol.getBoundingClientRect();
            let formH = rect.bottom - e.clientY;
            
            const video = document.getElementById('videoPlayer');
            if (video && video.videoWidth && video.videoHeight) {
                const videoRatio = video.videoHeight / video.videoWidth;
                const videoWrapper = document.querySelector('.video-wrapper');
                if (videoWrapper) {
                    const maxVideoH = videoWrapper.clientWidth * videoRatio;
                    const extrasH = Math.max(0, videoSection.offsetHeight - videoWrapper.offsetHeight);
                    const maxVideoSectionH = maxVideoH + extrasH;
                    
                    const newVideoSectionH = rect.height - formH - 8;
                    if (newVideoSectionH > maxVideoSectionH) {
                        formH = rect.height - maxVideoSectionH - 8;
                    }
                }
            }
            
            if (formH > 100 && formH < rect.height - 250) { 
                formSection.style.height = formH + 'px'; 
                formSection.style.flex = 'none'; 
            }
        }
        if (isDraggingFloat && floatPanel) {
            floatPanel.style.left = (e.clientX - floatOffsetX) + 'px';
            floatPanel.style.top  = (e.clientY - floatOffsetY) + 'px';
        }
        if (isDraggingSpeed) {
            const dx = e.clientX - speedStartX;
            if (Math.abs(dx) > 3) speedDidDrag = true;
            const video = document.getElementById('videoPlayer');
            const speedDisplay = document.getElementById('speedDisplay');
            const newSpeed = Math.max(0.25, Math.min(speedStartVal + Math.round(dx / 10) * 0.25, 10.0));
            if (Math.abs(newSpeed - playbackSpeed) > 0.05) {
                playbackSpeed = newSpeed;
                if (video) video.playbackRate = playbackSpeed;
                if (speedDisplay) speedDisplay.innerText = playbackSpeed.toFixed(2) + 'x';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        isResizingV = false; isResizingH1 = false; isResizingH2 = false;
        isDraggingFloat = false; isDraggingSpeed = false;
        document.body.style.cursor = 'default';
    });

    // Float panel drag
    if (floatHeader && floatPanel) {
        floatHeader.addEventListener('mousedown', e => {
            isDraggingFloat = true;
            floatOffsetX = e.clientX - floatPanel.offsetLeft;
            floatOffsetY = e.clientY - floatPanel.offsetTop;
            document.body.style.cursor = 'move';
        });
    }
})();

// ── Float Help Panel ──────────────────────────────────────────
document.getElementById('btnHelp').onclick = () => {
    const fp = document.getElementById('floatHelpPanel');
    if (fp) fp.style.display = fp.style.display === 'flex' ? 'none' : 'flex';
};
document.getElementById('btnCloseHelp').onclick = () => {
    const fp = document.getElementById('floatHelpPanel');
    if (fp) fp.style.display = 'none';
};

// ── Settings Modal ────────────────────────────────────────────
document.getElementById('btnShortcuts').onclick   = () => { document.getElementById('settingsModal').style.display = 'flex'; };
document.getElementById('btnCloseSettings').onclick = () => { document.getElementById('settingsModal').style.display = 'none'; };

// ── TC Box Clicks ─────────────────────────────────────────────
(function bindTCBoxes() {
    const boxIn   = document.getElementById('boxIn');
    const boxOut  = document.getElementById('boxOut');
    const boxSwap = document.getElementById('boxSwap');

    if (boxIn) boxIn.addEventListener('click', markInPoint);
    if (boxOut) boxOut.addEventListener('click', markOutPoint);
    if (boxSwap) boxSwap.addEventListener('click', markSwapPoint);
})();

// ── Theme Select ──────────────────────────────────────────────
document.getElementById('themeSelect').addEventListener('change', (e) => {
    document.body.setAttribute('data-theme', e.target.value);
});

// ── FPS Select ────────────────────────────────────────────────
const fpsSelect = document.getElementById('fpsSelect');
if (fpsSelect) {
    fpsSelect.addEventListener('change', (e) => {
        FPS = parseFloat(e.target.value);
        const video = document.getElementById('videoPlayer');
        if (video && video.duration) {
            document.getElementById('tcEnd').innerText = formatBoundTC(video.duration);
            document.getElementById('bigTimecode').innerText = formatTC(video.currentTime);
            renderTable(); drawMarkers(); renderTimelineTicks();
        }
    });
}

// ── Action Buttons ────────────────────────────────────────────
document.querySelectorAll('#actionButtonGroup .action-button').forEach(btn =>
    btn.addEventListener('click', () => setSelectedAction(btn.dataset.action))
);

// ── Video Upload ──────────────────────────────────────────────
function handleVideoUpload(e) {
    if (!e.target.files[0]) return;
    const selectedFile = e.target.files[0];
    const video = document.getElementById('videoPlayer');
    if (video.src && video.src.startsWith('blob:')) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(selectedFile);
    
    const uploadText = document.getElementById('uploadText');
    if (uploadText) uploadText.innerText = selectedFile.name;
    
    const uploadLabel = document.getElementById('uploadLabel');
    if (uploadLabel) uploadLabel.classList.remove('empty');
    
    const emptyState = document.getElementById('videoEmptyState');
    if (emptyState) emptyState.style.display = 'none';
    
    pendingVideoMeta = {
        fileName: selectedFile.name, fileSize: selectedFile.size,
        fileType: selectedFile.type, lastModified: selectedFile.lastModified,
        durationSec: 0, updatedAt: new Date().toISOString()
    };
    persistProjectVideoMeta(pendingVideoMeta);
}

const upload = document.getElementById('videoUpload');
if (upload) upload.addEventListener('change', handleVideoUpload);

const uploadCenter = document.getElementById('videoUploadCenter');
if (uploadCenter) uploadCenter.addEventListener('change', handleVideoUpload);

// ── Video Events ──────────────────────────────────────────────
(function bindVideoEvents() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;

    video.addEventListener('loadedmetadata', () => {
        document.getElementById('tcStart').innerText = '00:00';
        document.getElementById('tcEnd').innerText   = formatBoundTC(video.duration);
        const uploadLabel = document.getElementById('uploadLabel');
        if (uploadLabel) uploadLabel.classList.remove('empty');
        drawMarkers(); renderTimelineTicks();
        if (pendingVideoMeta) {
            pendingVideoMeta.durationSec = video.duration || 0;
            pendingVideoMeta.updatedAt   = new Date().toISOString();
            persistProjectVideoMeta(pendingVideoMeta);
            pendingVideoMeta = null;
        }
    });

    document.getElementById('tcStart').addEventListener('click', () => { video.currentTime = 0; });
    document.getElementById('tcEnd').addEventListener('click',   () => { if (video.duration) video.currentTime = video.duration; });
    video.addEventListener('focus', () => video.blur());

    // Play/pause
    const btnPlayVideo   = document.getElementById('btnPlayVideo');
    const btnPlayReverse = document.getElementById('btnPlayReverse');

    if (btnPlayVideo) {
        btnPlayVideo.addEventListener('click', () => {
            if (reverseInterval) { clearInterval(reverseInterval); reverseInterval = null; if (btnPlayReverse) btnPlayReverse.classList.remove('active'); }
            togglePlayback();
        });
    }
    video.addEventListener('play',  () => { updateToolbarPlayState(); if (tcAutoSelected) clearAutoSelectedTC(); });
    video.addEventListener('pause', updateToolbarPlayState);
    video.addEventListener('seeked', () => {
        if (tcJumpWait) { tcJumpWait = false; }
        else if (tcAutoSelected) { clearAutoSelectedTC(); }
    });

    // Play Reverse
    if (btnPlayReverse) {
        btnPlayReverse.addEventListener('click', () => {
            if (!video.paused) video.pause();
            if (reverseInterval) {
                clearInterval(reverseInterval); reverseInterval = null;
                btnPlayReverse.classList.remove('active'); updateToolbarPlayState();
            } else {
                reverseInterval = setInterval(() => {
                    if (video.currentTime <= 0.05) {
                        clearInterval(reverseInterval); reverseInterval = null;
                        btnPlayReverse.classList.remove('active');
                        video.currentTime = 0; updateToolbarPlayState();
                    } else { video.currentTime -= 0.05; }
                }, 50);
                btnPlayReverse.classList.add('active'); updateToolbarPlayState();
            }
        });
    }

    // Big timecode
    const bigTc = document.getElementById('bigTimecode');
    if (bigTc) {
        bigTc.addEventListener('click', function() {
            navigator.clipboard.writeText(this.innerText);
            this.style.color = 'var(--success)';
            setTimeout(() => { this.style.color = 'var(--accent)'; }, 500);
        });
        bigTc.addEventListener('dblclick', function(e) { e.preventDefault(); showTimecodeJump(); });
    }

    // Speed control
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
        speedDisplay.addEventListener('mousedown', e => {
            isDraggingSpeed = true; speedDidDrag = false;
            speedStartX = e.clientX; speedStartVal = playbackSpeed;
            document.body.style.cursor = 'ew-resize'; e.preventDefault();
        });
        speedDisplay.addEventListener('click', e => {
            if (speedDidDrag) return;
            e.stopPropagation();
            playbackSpeed = 1; video.playbackRate = 1;
            speedDisplay.innerText = '1.00x';
        });
    }

    // Volume
    const volSlider = document.getElementById('volumeSlider');
    if (volSlider) volSlider.addEventListener('input', e => { video.volume = e.target.value; });

    // Preview cut
    const btnPreviewCut = document.getElementById('btnPreviewCut');
    if (btnPreviewCut) btnPreviewCut.addEventListener('click', togglePreviewCut);

    // Time update loop
    video.addEventListener('timeupdate', () => {
        const ct = video.currentTime;
        if (!video.duration) return;
        const pct     = (ct / video.duration) * 100;
        const progress = document.getElementById('timelineProgress');
        const playhead = document.getElementById('playheadIndicator');
        if (progress) progress.style.width = pct + '%';
        if (playhead) playhead.style.left  = pct + '%';
        if (bigTc) bigTc.innerText = formatTC(ct);

        const valTcIn  = document.getElementById('valTcIn');
        const valTcOut = document.getElementById('valTcOut');
        const valTcSwap = document.getElementById('valTcSwap');
        if (activeInSec   === null && valTcIn)  valTcIn.innerText  = formatTC(ct);
        if (activeOutSec  === null && valTcOut)  valTcOut.innerText = formatTC(ct);
        if (activeSwapSec === null && valTcSwap) valTcSwap.innerText = formatTC(ct);

        let activeColor = 'var(--text-main)';
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            const end = log.outSec ? log.outSec : log.inSec + 1;
            const row = document.getElementById('row-' + i);
            if (ct >= log.inSec - 0.05 && ct < end) {
                const colorSet = actionColors[log.action] || actionColors['OTHERS'];
                activeColor = colorSet.bg;
                if (row) row.classList.add('highlight-playing');
            } else {
                if (row) row.classList.remove('highlight-playing');
            }
        }
        if (bigTc) bigTc.style.color = activeColor;

        if (activeInSec !== null && activeOutSec === null) updateActiveRange();

        // Preview Cut skip
        if (isPreviewCut) {
            const isReversing = reverseInterval !== null;
            for (let i = 0; i < logs.length; i++) {
                if (logs[i].action === 'DELETE' && logs[i].outSec) {
                    if (ct >= logs[i].inSec && ct < logs[i].outSec) {
                        video.currentTime = isReversing ? logs[i].inSec - 0.05 : logs[i].outSec;
                        break;
                    }
                }
            }
        }

        // Preview state machine
        if (previewState && previewState.active) {
            const log = logs[previewState.logIndex];
            if (log) {
                if (log.action === 'SWAP') {
                    const sSec = Number.isFinite(log.swapSec) ? log.swapSec : parseTC(log.tcswap);
                    const iSec = Number.isFinite(log.inSec) ? log.inSec : parseTC(log.tcin);
                    const oSec = Number.isFinite(log.outSec) ? log.outSec : parseTC(log.tcout);
                    if (previewState.phase === 1) { if (ct >= sSec) { video.currentTime = iSec; previewState.phase = 2; } }
                    else if (previewState.phase === 2) {
                        const endTarget = (Number.isFinite(oSec) && oSec > iSec) ? oSec : iSec + 3;
                        if (ct >= endTarget) { video.currentTime = sSec; previewState.phase = 3; }
                    } else if (previewState.phase === 3) {
                        if (ct >= sSec + 3) { video.pause(); endPreview(); }
                    }
                } else {
                    const iSec = Number.isFinite(log.inSec) ? log.inSec : parseTC(log.tcin);
                    const oSec = Number.isFinite(log.outSec) ? log.outSec : parseTC(log.tcout);
                    const endTarget = (Number.isFinite(oSec) && oSec > iSec) ? oSec + 3 : iSec + 3;
                    if (ct >= endTarget) { video.pause(); endPreview(); }
                }
            }
        }
    });
})();

// ── TC Jump Overlay ───────────────────────────────────────────
document.getElementById('tcJumpGo').addEventListener('click',    executeTimecodeJump);
document.getElementById('tcJumpClose').addEventListener('click', hideTimecodeJump);

// ── Import Button ─────────────────────────────────────────────
const btnToolbarImport = document.getElementById('btnToolbarImport');
if (btnToolbarImport) btnToolbarImport.addEventListener('click', saveLog);

// ── Sync Sheets ───────────────────────────────────────────────
const btnSyncSheets = document.getElementById('btnSyncSheets');
if (btnSyncSheets) btnSyncSheets.addEventListener('click', syncToGoogleSheets);

// ── Message Modal Close ───────────────────────────────────────
const btnCloseMsg = document.getElementById('btnCloseMessageModal');
if (btnCloseMsg) btnCloseMsg.addEventListener('click', closeMessageModal);
const mMessage = document.getElementById('messageModal');
if (mMessage) mMessage.addEventListener('click', e => { if (e.target === mMessage) closeMessageModal(); });

// ── Global Mousedown (context menu + edit exit) ───────────────

function updateFormatButtonsState() {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id === 'inputScript' || activeEl.id === 'inputNote')) {
        const isBold = document.queryCommandState('bold');
        const isItalic = document.queryCommandState('italic');
        const isStrike = document.queryCommandState('strikeThrough');
        
        const prefix = activeEl.id === 'inputScript' ? 'btnScript' : 'btnNote';
        
        ['btnScriptBold', 'btnScriptItalic', 'btnScriptStrike', 'btnNoteBold', 'btnNoteItalic', 'btnNoteStrike'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.classList.remove('active');
        });

        const btnBold = document.getElementById(prefix + 'Bold');
        const btnItalic = document.getElementById(prefix + 'Italic');
        const btnStrike = document.getElementById(prefix + 'Strike');

        if(btnBold && isBold) btnBold.classList.add('active');
        if(btnItalic && isItalic) btnItalic.classList.add('active');
        if(btnStrike && isStrike) btnStrike.classList.add('active');
    }
}

document.addEventListener('selectionchange', updateFormatButtonsState);

document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tc-jump-overlay')) return;
    if (!e.target.closest('.context-menu')) {
        document.querySelectorAll('.context-menu').forEach(menu => menu.style.display = 'none');
    }

    if (editingRowIndex !== null) {
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row && row.contains(e.target)) return;
        if (e.target.closest('.context-menu'))              return;
        if (e.target.closest('.form-section'))              return;
        if (e.target.closest('.tc-row'))                    return;
        if (e.target.closest('.action-button-group'))       return;
        if (e.target.closest('.action-button'))             return;
        if (e.target.closest('#btnToolbarImport'))          return;
        if (e.target.closest('#btnToolbarImportShort'))     return;
        if (e.target.closest('.custom-timeline-wrapper'))   return;
        if (e.target.closest('#boxIn') || e.target.closest('#boxOut') || e.target.closest('#boxSwap')) return;
        saveEdit();
    }
});

document.addEventListener('contextmenu', e => {
    if (!e.target.closest('.log-row') && !e.target.closest('.transcript-row') && !e.target.closest('.context-menu') && !e.target.closest('.action-button')) {
        document.querySelectorAll('.context-menu').forEach(menu => menu.style.display = 'none');
    }
});

// ── Script/Note sync while in edit mode ───────────────────────
document.getElementById('inputScript').addEventListener('input', function(e) {
    if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < logs.length) {
        logs[editingRowIndex].script = e.target.value;
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row) { const cells = row.querySelectorAll('td'); if (cells[6]) cells[6].innerText = e.target.value; }
    }
});
document.getElementById('inputNote').addEventListener('input', function(e) {
    if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < logs.length) {
        logs[editingRowIndex].note = e.target.value;
        const row = document.getElementById(`row-${editingRowIndex}`);
        if (row) { const cells = row.querySelectorAll('td'); if (cells[7]) cells[7].innerText = e.target.value; }
    }
});

// Setup text size sliders independently
const savedLogFontSize = localStorage.getItem('autoscript_log_font_size');
const savedTranscriptFontSize = localStorage.getItem('autoscript_transcript_font_size');

if (savedLogFontSize) {
    document.documentElement.style.setProperty('--log-font-size', savedLogFontSize + 'px');
    const logSlider = document.getElementById('actionLogSizeSlider');
    if (logSlider) logSlider.value = savedLogFontSize;
}
if (savedTranscriptFontSize) {
    document.documentElement.style.setProperty('--transcript-font-size', savedTranscriptFontSize + 'px');
    const transcriptSlider = document.getElementById('transcriptSizeSlider');
    if (transcriptSlider) transcriptSlider.value = savedTranscriptFontSize;
}

const logSlider = document.getElementById('actionLogSizeSlider');
if (logSlider) {
    logSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--log-font-size', val + 'px');
        localStorage.setItem('autoscript_log_font_size', val);
    });
}

const transcriptSlider = document.getElementById('transcriptSizeSlider');
if (transcriptSlider) {
    transcriptSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--transcript-font-size', val + 'px');
        localStorage.setItem('autoscript_transcript_font_size', val);
    });
}


// ── Table Filters ─────────────────────────────────────────────
const searchInput = document.getElementById('searchInput');
if (searchInput) searchInput.addEventListener('input', e => { searchQuery = e.target.value.toLowerCase(); renderTable(); });
const filterActionSel = document.getElementById('filterAction');
if (filterActionSel) filterActionSel.addEventListener('change', e => { filterQuery = e.target.value; renderTable(); });

// ── Context Menu Actions ──────────────────────────────────────
(function bindContextMenu() {
    const menuEdit   = document.getElementById('menuEdit');
    const menuDelete = document.getElementById('menuDelete');
    const valTcIn    = document.getElementById('valTcIn');
    const valTcOut   = document.getElementById('valTcOut');
    const valTcSwap  = document.getElementById('valTcSwap');
    const boxIn      = document.getElementById('boxIn');
    const boxOut     = document.getElementById('boxOut');
    const boxSwap    = document.getElementById('boxSwap');

    if (menuEdit) menuEdit.addEventListener('click', () => {
        if (editingRowIndex !== null && editingRowIndex !== menuTargetIndex) saveEdit();
        editingRowIndex = menuTargetIndex;
        const log = logs[editingRowIndex];
        if (!log) { editingRowIndex = null; return; }

        activeInSec = log.inSec; activeOutSec = log.outSec; activeSwapSec = log.swapSec;
        if (valTcIn)  valTcIn.innerText  = formatTC(activeInSec);
        if (valTcOut) valTcOut.innerText = activeOutSec  != null ? formatTC(activeOutSec)  : '00:00:00:00';
        if (valTcSwap) valTcSwap.innerText = activeSwapSec != null ? formatTC(activeSwapSec) : '00:00:00:00';
        document.getElementById('inputScript').value = log.script || '';
        document.getElementById('inputNote').value   = log.note   || '';
        selectedAction = log.action; updateActionButtons();
        if (boxSwap) boxSwap.style.display = log.action === 'SWAP' ? 'block' : 'none';
        if (boxIn)  { if (activeInSec  != null) boxIn.classList.add('active');  else boxIn.classList.remove('active'); }
        if (boxOut) { if (activeOutSec != null) boxOut.classList.add('active'); else boxOut.classList.remove('active'); }
        if (boxSwap) { if (activeSwapSec != null) boxSwap.classList.add('active'); else boxSwap.classList.remove('active'); }
        updateActiveRange(); renderTable(); hideContextMenu();
    });

    if (menuDelete) menuDelete.addEventListener('click', () => {
        deleteLog(menuTargetIndex); hideContextMenu();
    });
})();

// ── Keyboard Shortcuts ────────────────────────────────────────
document.addEventListener('keydown', e => {
    const mMessage   = document.getElementById('messageModal');
    const mSettings  = document.getElementById('settingsModal');

    if (mMessage && mMessage.style.display === 'flex' && e.key === 'Escape') {
        e.preventDefault(); closeMessageModal(); return;
    }
    const cModal = document.getElementById('confirmModal');
    if (cModal && cModal.style.display === 'flex' && e.key === 'Escape') {
        e.preventDefault(); document.getElementById('btnConfirmCancel')?.click(); return;
    }
    if (listeningAction) {
        e.preventDefault();
        if (e.key === 'Escape') { listeningAction = null; renderSettings(); return; }
        if (['Shift','Control','Alt','Meta'].includes(e.key)) return;
        shortcuts[listeningAction] = { key: e.key.toUpperCase(), shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, label: shortcuts[listeningAction].label };
        localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcuts));
        listeningAction = null; renderSettings(); return;
    }
    if (e.key === 'Escape' || e.code === 'Space') { if (previewState.active) endPreview(); }
    if (e.key === 'Escape') { if (editingRowIndex !== null) saveEdit(); }
    if (mSettings && mSettings.style.display === 'flex') {
        if (e.key === 'Escape') mSettings.style.display = 'none';
        return;
    }
    const tcJumpOverlay = document.getElementById('tcJumpOverlay');
    if (tcJumpOverlay && tcJumpOverlay.style.display === 'flex') {
        if (e.key === 'Enter') { e.preventDefault(); executeTimecodeJump(); return; }
        if (e.key === 'Escape') { e.preventDefault(); hideTimecodeJump(); return; }
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }

    const active = document.activeElement;
    const isTypingInput = active.tagName === 'INPUT' && !['button','checkbox','radio','range','submit','reset','color'].includes(active.type);
    const typing = isTypingInput || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable;
    if (e.key === 'Escape') { active.blur(); return; }

    if (matchShortcut(e, 'save')) { e.preventDefault(); saveLog(); return; }
    if (typing) return;

    if (matchShortcut(e, 'zoom1x'))   { e.preventDefault(); applyZoom(1); return; }
    if (matchShortcut(e, 'zoomOut'))  { e.preventDefault(); applyZoom(Math.max(1, timelineZoom - 5)); return; }
    if (matchShortcut(e, 'zoomIn'))   { e.preventDefault(); applyZoom(Math.min(50, timelineZoom + 5)); return; }

    if      (matchShortcut(e, 'play'))       { e.preventDefault(); togglePlayback(); }
    else if (matchShortcut(e, 'tcin'))       { e.preventDefault(); markInPoint(); }
    else if (matchShortcut(e, 'tcout'))      { e.preventDefault(); markOutPoint(); }
    else if (matchShortcut(e, 'tcswap'))     { e.preventDefault(); markSwapPoint(); }
    else if (matchShortcut(e, 'prev'))       { e.preventDefault(); jumpMarker(-1); }
    else if (matchShortcut(e, 'next'))       { e.preventDefault(); jumpMarker(1); }
    else if (matchShortcut(e, 'jumpin'))     { e.preventDefault(); const v = document.getElementById('videoPlayer'); if (activeInSec !== null && v) v.currentTime = activeInSec; }
    else if (matchShortcut(e, 'jumpout'))    { e.preventDefault(); const v = document.getElementById('videoPlayer'); if (activeOutSec !== null && v) v.currentTime = activeOutSec; }
    else if (matchShortcut(e, 'slow'))       { e.preventDefault(); const s = document.getElementById('speedDisplay'); const v = document.getElementById('videoPlayer'); playbackSpeed = Math.max(0.25, playbackSpeed - 0.25); if (v) v.playbackRate = playbackSpeed; if (s) s.innerText = playbackSpeed.toFixed(2) + 'x'; }
    else if (matchShortcut(e, 'fast'))       { e.preventDefault(); const s = document.getElementById('speedDisplay'); const v = document.getElementById('videoPlayer'); playbackSpeed = Math.min(10, playbackSpeed + 0.25); if (v) v.playbackRate = playbackSpeed; if (s) s.innerText = playbackSpeed.toFixed(2) + 'x'; }
    else if (matchShortcut(e, 'previewCut')){ e.preventDefault(); togglePreviewCut(); }
    else if (matchShortcut(e, 'script'))     { e.preventDefault(); document.getElementById('inputScript').focus(); }
    else if (matchShortcut(e, 'note'))       { e.preventDefault(); document.getElementById('inputNote').focus(); }
    else if (matchShortcut(e, 'action'))     { e.preventDefault(); const list = customActions.length > 0 ? customActions.map(a => typeof a === 'string' ? a : a.name) : actionList; let idx = list.indexOf(selectedAction); idx = (Math.max(0, idx) + 1) % list.length; setSelectedAction(list[idx]); }
    else if (matchShortcut(e, 'video'))      { e.preventDefault(); const u = document.getElementById('videoUpload'); if (u) u.click(); }
    else if (e.code === 'ArrowRight')        { e.preventDefault(); skipTime(5); }
    else if (e.code === 'ArrowLeft')         { e.preventDefault(); skipTime(-5); }
});

// ── Init Sub-Systems ──────────────────────────────────────────
initZoomDragButton();
initTimelinePan();
initTimelineWheel();
initTimelineScrub();
initCSVImport();

updateActionButtons();
updateToolbarPlayState();

// ── Override renderSheetTabs to also update menus ─────────────
const _origRenderSheetTabs = renderSheetTabs;
renderSheetTabs = function() {
    _origRenderSheetTabs();
    buildImportShortMenu();
    updateImportShortVisibility();
};
buildImportShortMenu();
updateImportShortVisibility();

// ── Override updateGoogleUI to load sheet tabs after auth ──────
window.updateGoogleUI = function() {
    if (isTokenValid()) loadSheetTabsFromGoogle();
};

// ── Bootstrap Sequence ────────────────────────────────────────
renderSettings();
resolveCurrentSpreadsheetMeta().finally(() => {
    Promise.all([
        loadProjectLogsFromKV(),
        fetchCustomActions()
    ]).finally(() => {
        renderActionButtons();
        renderTable();
        updateActiveSheetUI();
        renderProjectVideoMeta();
        updateGoogleUI();
        initGoogleOAuth();
        setTimeout(drawMarkers, 300);
        console.log('[AUTOSCRIPT] ✓ Initialized successfully');
    });
});


// ── Transcript & Tabs Event Listeners ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const importSrtBtn = document.getElementById('importSrt');
    if (importSrtBtn) {
        importSrtBtn.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const text = evt.target.result;
                if (typeof parseSRT === 'function') {
                    transcriptData = parseSRT(text);
                    if (typeof renderTranscriptList === 'function') {
                        renderTranscriptList();
                    }
                } else {
                    console.error('parseSRT is not defined');
                }
            };
            reader.readAsText(file);
        });
    }

    const searchInput = document.getElementById('searchTranscript');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (typeof renderTranscriptList === 'function') {
                renderTranscriptList();
            }
        });
    }

    const btnExportSrt = document.getElementById('btnExportSrt');
    if (btnExportSrt) {
        btnExportSrt.addEventListener('click', async () => {
            if (!transcriptData || transcriptData.length === 0) {
                alert('No subtitles to export. Please generate or import subtitles first.');
                return;
            }
            let srt = '';
            const pad = (num, size) => ('000' + num).slice(-size);
            const formatSrtTime = (seconds) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                const ms = Math.floor((seconds % 1) * 1000);
                return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
            };
            transcriptData.forEach((sub, i) => {
                srt += (i + 1) + '\n';
                srt += formatSrtTime(sub.start) + ' --> ' + formatSrtTime(sub.end) + '\n';
                srt += sub.text + '\n\n';
            });
            
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'subtitles.srt',
                        types: [{
                            description: 'SRT File',
                            accept: { 'text/plain': ['.srt'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(srt);
                    await writable.close();
                    alert('SRT file exported successfully!');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Export failed:', err);
                        alert('Export failed: ' + err.message);
                    }
                }
            } else {
                const blob = new Blob([srt], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'subtitles.srt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    }



    const tabLogs = document.getElementById('tabLogs');
    const tabTranscript = document.getElementById('tabTranscript');
    const logsContainer = document.getElementById('logsContainer');
    const transcriptContainer = document.getElementById('transcriptContainer');
    
    if (tabLogs && tabTranscript && logsContainer && transcriptContainer) {
        tabLogs.addEventListener('click', () => {
            tabLogs.classList.add('active');
            tabTranscript.classList.remove('active');
            logsContainer.style.display = 'flex';
            transcriptContainer.style.display = 'none';
        });
        
        tabTranscript.addEventListener('click', () => {
            tabTranscript.classList.add('active');
            tabLogs.classList.remove('active');
            transcriptContainer.style.display = 'flex';
            logsContainer.style.display = 'none';
        });
    }
});

// ── Custom Actions Settings Modal ────────────────────────────
const btnActionSettings = document.getElementById('btnActionSettings');
if (btnActionSettings) {
    btnActionSettings.addEventListener('click', () => {
        const modal = document.getElementById('actionSettingsModal');
        if (modal) {
            document.getElementById('newActionInput').value = '';
            modal.style.display = 'flex';
        }
    });
}

const btnActionAdd = document.getElementById('btnActionAdd');
if (btnActionAdd) {
    btnActionAdd.addEventListener('click', async () => {
        const input = document.getElementById('newActionInput');
        if (input) {
            const newName = input.value.trim().toUpperCase();
            if (newName) {
                // Check if exists
                const exists = customActions.find(a => (typeof a === 'string' ? a : a.name) === newName);
                if (!exists) {
                    customActions.push(newName);
                    await saveCustomActions(customActions);
                    if (typeof renderActionButtons === 'function') renderActionButtons();
                }
                document.getElementById('actionSettingsModal').style.display = 'none';
            }
        }
    });
}

// ── Context Menu for Action Buttons ─────────────────────────
let currentContextAction = null;
const actionContextMenu = document.getElementById('actionContextMenu');

document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('action-button')) {
        e.preventDefault();
        currentContextAction = e.target.dataset.action;
        
        if (actionContextMenu) {
            actionContextMenu.style.display = 'block';
            actionContextMenu.style.left = `${e.pageX}px`;
            actionContextMenu.style.top = `${e.pageY}px`;
            
            // Set current color in picker
            const customObj = customActions.find(a => typeof a === 'object' && a.name === currentContextAction);
            const colorPicker = document.getElementById('cmenuColorPicker');
            if (colorPicker) {
                colorPicker.value = customObj ? customObj.color : (actionColors[currentContextAction] ? actionColors[currentContextAction].bg : '#1e293b');
            }
        }
    } else {
        if (actionContextMenu) actionContextMenu.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (actionContextMenu && !actionContextMenu.contains(e.target)) {
        actionContextMenu.style.display = 'none';
    }
});

document.getElementById('cmenuRename')?.addEventListener('click', async () => {
    if (!currentContextAction) return;
    const newName = prompt('Rename action to:', currentContextAction);
    if (newName && newName.trim()) {
        const uppercaseName = newName.trim().toUpperCase();
        // Rename in customActions
        for (let i = 0; i < customActions.length; i++) {
            if (typeof customActions[i] === 'string' && customActions[i] === currentContextAction) {
                customActions[i] = uppercaseName;
            } else if (typeof customActions[i] === 'object' && customActions[i].name === currentContextAction) {
                customActions[i].name = uppercaseName;
            }
        }
        await saveCustomActions(customActions);
        if (typeof renderActionButtons === 'function') renderActionButtons();
        actionContextMenu.style.display = 'none';
    }
});

document.getElementById('cmenuColorPicker')?.addEventListener('change', async (e) => {
    if (!currentContextAction) return;
    const newColor = e.target.value;
    
    let found = false;
    for (let i = 0; i < customActions.length; i++) {
        if (typeof customActions[i] === 'string' && customActions[i] === currentContextAction) {
            customActions[i] = { name: currentContextAction, color: newColor };
            found = true;
        } else if (typeof customActions[i] === 'object' && customActions[i].name === currentContextAction) {
            customActions[i].color = newColor;
            found = true;
        }
    }
    if (!found) {
        customActions.push({ name: currentContextAction, color: newColor });
    }
    
    await saveCustomActions(customActions);
    if (typeof updateActionButtons === 'function') updateActionButtons();
    actionContextMenu.style.display = 'none';
});

document.getElementById('cmenuDelete')?.addEventListener('click', async () => {
    if (!currentContextAction) return;
    if (confirm(`Delete action ${currentContextAction}?`)) {
        customActions = customActions.filter(a => (typeof a === 'string' ? a : a.name) !== currentContextAction);
        await saveCustomActions(customActions);
        if (typeof renderActionButtons === 'function') renderActionButtons();
        actionContextMenu.style.display = 'none';
    }
});

// ── Subtitle Settings ─────────────────────────────────────────
const btnSubSettings = document.getElementById('btnSubSettings');
const subSettingsModal = document.getElementById('subSettingsModal');
const subOverlay = document.getElementById('subOverlay');

if (btnSubSettings && subSettingsModal) {
    btnSubSettings.addEventListener('click', () => {
        subSettingsModal.style.display = 'flex';
    });
}

function updateSubStyles() {
    if (!subOverlay) return;
    
    const size = document.getElementById('subSizeRange')?.value || 24;
    const opacity = document.getElementById('subOpacityRange')?.value || 50;
    const bgColor = document.getElementById('subBgColorPicker')?.value || '#000000';
    const shadow = document.getElementById('subShadowCheck')?.checked;
    const isVisible = document.getElementById('subVisibilityCheck')?.checked !== false;
    
    // Convert hex to rgb
    let r = 0, g = 0, b = 0;
    if (bgColor.length === 7) {
        r = parseInt(bgColor.slice(1,3), 16);
        g = parseInt(bgColor.slice(3,5), 16);
        b = parseInt(bgColor.slice(5,7), 16);
    }
    
    // Safely parse opacity to prevent NaN
    const parsedOpacity = Number(opacity);
    const opacityNum = isNaN(parsedOpacity) ? 50 : parsedOpacity;
    const bgRgba = `rgba(${r},${g},${b},${opacityNum / 100})`;
    
    subOverlay.style.fontSize = `${size}px`;
    subOverlay.style.backgroundColor = bgRgba;
    subOverlay.style.textShadow = shadow ? '1px 1px 2px black, 0 0 4px black' : 'none';
    subOverlay.style.padding = '4px 12px';
    subOverlay.style.borderRadius = '4px';
    
    // Force overlay visibility logic
    subOverlay.style.display = (subOverlay.textContent && isVisible) ? 'inline-block' : 'none';
    
    // Update labels
    const sizeVal = document.getElementById('subSizeVal');
    if (sizeVal) sizeVal.innerText = size;
    const opacityVal = document.getElementById('subOpacityVal');
    if (opacityVal) opacityVal.innerText = opacity;
    
    // Save to local storage
    localStorage.setItem('autoscript_sub_settings', JSON.stringify({ size, opacity, bgColor, shadow, isVisible }));
}

['subSizeRange', 'subOpacityRange', 'subBgColorPicker', 'subShadowCheck', 'subVisibilityCheck'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', updateSubStyles);
        el.addEventListener('change', updateSubStyles);
    }
});

// Load Subtitle settings on init
try {
    const saved = localStorage.getItem('autoscript_sub_settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (document.getElementById('subSizeRange')) document.getElementById('subSizeRange').value = parsed.size;
        if (document.getElementById('subOpacityRange')) document.getElementById('subOpacityRange').value = parsed.opacity;
        if (document.getElementById('subBgColorPicker')) document.getElementById('subBgColorPicker').value = parsed.bgColor;
        if (document.getElementById('subShadowCheck')) document.getElementById('subShadowCheck').checked = parsed.shadow;
        if (document.getElementById('subVisibilityCheck') && parsed.isVisible !== undefined) document.getElementById('subVisibilityCheck').checked = parsed.isVisible;
        updateSubStyles();
    } else {
        updateSubStyles(); // apply defaults
    }
} catch(e) {}
