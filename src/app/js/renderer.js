// ============================================================
//  AUTOSCRIPT TCP Pro — renderer.js
//  renderTable, drawMarkers, renderTimelineTicks,
//  renderSheetTabs, renderProjectVideoMeta, updateActiveSheetUI
//  Depends on: state.js, constants.js, timecode.js, api.js
// ============================================================

// ── Utility ──────────────────────────────────────────────────
function escapeHtml(value) {
    let escaped = String(value ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    
    // Restore basic formatting tags for script display
    escaped = escaped.replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');
    escaped = escaped.replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>');
    escaped = escaped.replace(/&lt;s&gt;/gi, '<s>').replace(/&lt;\/s&gt;/gi, '</s>');
    escaped = escaped.replace(/&lt;strike&gt;/gi, '<strike>').replace(/&lt;\/strike&gt;/gi, '</strike>');
    escaped = escaped.replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
    return escaped;
}

// ── Row Action (called from inline HTML) ─────────────────────
window.updateRowAction = function(index, action) {
    if (index >= 0 && index < logs.length) {
        logs[index].action = action;
        renderTable();
        drawMarkers();
        saveSession();
    }
};

// ── Render Log Table ─────────────────────────────────────────
function renderTable() {
    const tw = document.querySelector('.table-wrap');
    const oldScrollTop = tw ? tw.scrollTop : 0;
    const tbody = document.getElementById('logBody');
    if (!tbody) return;
    // Re-render destroys row wrappers; drop any floating SEND menu so it can't orphan.
    if (typeof window.forceHideRowSendMenu === 'function') window.forceHideRowSendMenu();
    tbody.innerHTML = '';
    let count = 0;

    logs.forEach((log, index) => {
        if (filterQuery !== 'ALL' && log.action !== filterQuery) return;
        if (searchQuery) {
            const text = (log.script + ' ' + log.note + ' ' + log.tcin + ' ' + log.tcout + ' ' + (log.tcswap || '')).toLowerCase();
            if (!text.includes(searchQuery)) return;
        }
        count++;
        const colorSet = actionColors[log.action] || actionColors['OTHERS'];
        const bg = colorSet.bg, txt = colorSet.color;
        const showPreview = (log.action === 'DELETE' || log.action === 'SWAP');
        const playButton = showPreview
            ? `<button class="btn-play-delete" onclick="playActionPreview(${index})" title="Preview action">&#9658;</button>`
            : '';
        const isEditing = (index === editingRowIndex);
        const editable  = isEditing ? 'contenteditable="true"' : '';
        const editClass = isEditing ? 'row-editing' : '';

        let actionCell;
        if (isEditing) {
            const opts = actionList.map(a =>
                `<option value="${a}" ${a === log.action ? 'selected' : ''}>${escapeHtml(a)}</option>`
            ).join('');
            actionCell = `<select onchange="window.updateRowAction(${index}, this.value)" style="width:auto; padding:3px 8px; font-size:7.92px; font-weight:700; background:${bg}; color:${txt}; border:1px solid rgba(255,255,255,0.2); border-radius:var(--r-sm); outline:none; text-align:center; cursor:pointer; font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; min-width:68px; letter-spacing:0.05em;">${opts}</select>`;
        } else {
            actionCell = `<span class="action-tag" style="background:${bg};color:${txt}">${escapeHtml(log.action)}</span>`;
        }

        const swapVal = log.tcswap || '';
        const outVal  = log.tcout === '00:00:00:00' ? '' : log.tcout;

        tbody.innerHTML += `
            <tr id="row-${index}" class="log-row ${editClass}" oncontextmenu="showRowMenu(event, ${index})">
                <td class="td-stt">${index + 1}</td>
                <td class="td-play">${playButton}</td>
                <td class="td-action">${actionCell}</td>
                <td class="td-tc" ${editable} onclick="window.jumpToTC(${index},'tcin')" onblur="inlineUpdate(${index},'tcin',this)">${escapeHtml(log.tcin)}</td>
                <td class="td-tc" ${editable} onclick="window.jumpToTC(${index},'tcout')" onblur="inlineUpdate(${index},'tcout',this)">${outVal ? escapeHtml(outVal) : ''}</td>
                <td class="td-tc" ${editable} onclick="window.jumpToTC(${index},'tcswap')" onblur="inlineUpdate(${index},'tcswap',this)">${swapVal ? escapeHtml(swapVal) : ''}</td>
                <td class="td-text" ${editable} onclick="if(this.getAttribute('contenteditable')!=='true') window.jumpToTC(${index},'tcin')" onblur="inlineUpdate(${index},'script',this)">${escapeHtml(log.script)}</td>
                <td class="td-text" ${editable} onclick="if(this.getAttribute('contenteditable')!=='true') window.jumpToTC(${index},'tcin')" onblur="inlineUpdate(${index},'note',this)">${escapeHtml(log.note)}</td>
                <td class="td-delete"><span class="row-tools"><span class="send-tab-wrapper"><button class="btn-send" title="Send to Tab" onclick="toggleRowSendMenu(event, this.parentElement, ${index})">SEND</button></span><button class="btn-delete" onclick="deleteLog(${index})" title="Delete">&#10006;</button></span></td>
            </tr>`;
    });

    if (count === 0) {
        const isFiltered = logs.length > 0;
        const msg = isFiltered
            ? 'Không có dòng nào khớp bộ lọc / tìm kiếm.'
            : 'Chưa có log nào. Đánh dấu <b>TC IN</b> trên video để bắt đầu ghi.';
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">
            <div class="empty-state">
                <div class="empty-state-icon">${isFiltered ? '🔍' : '🎬'}</div>
                <div class="empty-state-text">${msg}</div>
            </div></td></tr>`;
    }

    const logCount = document.getElementById('logCount');
    if (logCount) logCount.innerText = count;
    if (tw) tw.scrollTop = oldScrollTop;
}

// ── Draw Timeline Markers (SmartTags) ────────────────────────
function drawMarkers() {
    const timelineWrapper = document.getElementById('customTimeline');
    const video = document.getElementById('videoPlayer');
    if (!timelineWrapper || !video) return;

    Array.from(timelineWrapper.querySelectorAll('.marker-range')).forEach(el => el.remove());

    // Always use Full-show logs as source of truth for the universal marker layer
    const masterLogs = tabLogsCache['Full-show'] || logs;
    if (!video.duration || !masterLogs.length) return;

    // Sort by duration descending so longer items render behind shorter ones
    const sortedLogs = masterLogs
        .map((log, origIndex) => ({ log, origIndex }))
        .sort((a, b) => {
            const durA = (a.log.outSec && a.log.outSec > a.log.inSec) ? (a.log.outSec - a.log.inSec) : 0;
            const durB = (b.log.outSec && b.log.outSec > b.log.inSec) ? (b.log.outSec - b.log.inSec) : 0;
            return durB - durA;
        });

    const placed = [];

    sortedLogs.forEach(item => {
        const log = item.log;
        const origIndex = item.origIndex;
        const colorSet  = actionColors[log.action] || actionColors['OTHERS'];
        const colorHex  = colorSet.bg;
        const hasDuration = log.outSec && log.outSec > log.inSec;
        const startSec  = log.inSec;
        const endSec    = hasDuration ? log.outSec : log.inSec + 0.1;
        const startPct  = (startSec / video.duration) * 100;

        let level = 0;
        while (placed.some(p => p.level === level && Math.max(startSec, p.start) < Math.min(endSec, p.end))) {
            level++;
        }
        placed.push({ start: startSec, end: endSec, level });

        let hideText = false;
        if (hasDuration) {
            const timelineWidthPx = timelineWrapper.clientWidth || 1;
            const markerWidthPx   = ((endSec - startSec) / video.duration) * timelineWidthPx;
            if (markerWidthPx < 50) hideText = true;
        }

        const marker = document.createElement('div');
        marker.className = 'marker-range';
        marker.style.left = startPct + '%';
        if (hasDuration) {
            marker.style.width = ((endSec - startSec) / video.duration) * 100 + '%';
        } else {
            marker.style.width = '0%';
        }
        marker.style.backgroundColor = colorHex + '50';

        const topOffsetDur   = 24 + (level * 22);
        const topOffsetNoDur = 36 + (level * 22);
        const lineOffsetNoDur = 16 + (level * 22);

        let pillHTML = '';
        if (hasDuration) {
            pillHTML = `
                <div class="action-pill" style="position:absolute; top:-${topOffsetDur}px; left:0; width:100%; height:18px; display:flex; align-items:center; justify-content:center; background:${colorHex}; color:${colorSet.color}; font-size:10px; font-weight:bold; border-radius:6px; pointer-events:auto; cursor:pointer; border:1px solid rgba(255,255,255,0.3); z-index:5; box-shadow:0 2px 4px rgba(0,0,0,0.3); overflow:hidden; text-overflow:ellipsis;">
                    <span class="action-pill-text" style="display: ${hideText ? 'none' : 'inline'}">${escapeHtml(log.action)}</span>
                </div>`;
        } else {
            pillHTML = `
                <div class="action-pill" style="position:absolute; top:-${topOffsetNoDur}px; left:0; transform:translateX(-50%); background:${colorHex}; width:6px; height:18px; border-radius:3px; pointer-events:auto; cursor:pointer; border:1px solid rgba(255,255,255,0.5); z-index:5; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
                <div style="position:absolute; top:-${lineOffsetNoDur}px; left:0; transform:translateX(-50%); width:2px; height:${lineOffsetNoDur}px; background:rgba(255,255,255,0.3); z-index:4;"></div>`;
        }

        let tooltipContent = '';
        if (log.script) tooltipContent += `<div style="margin-bottom:4px;"><strong style="color:#aaa;">Script:</strong><br>${escapeHtml(log.script)}</div>`;
        if (log.note)   tooltipContent += `<div><strong style="color:#aaa;">Note:</strong><br>${escapeHtml(log.note)}</div>`;

        marker.innerHTML = pillHTML;

        marker.addEventListener('mousedown', ev => {
            if (ev.target.closest('.action-pill')) {
                ev.stopPropagation();
                window.jumpToTC(origIndex, 'tcin', true);
            }
        });

        marker.addEventListener('mouseenter', () => {
            if (!tooltipContent) return;
            let gt = document.getElementById('globalTooltip');
            if (!gt) {
                gt = document.createElement('div');
                gt.id = 'globalTooltip';
                gt.style.cssText = `display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:8px 12px; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; z-index:99999; position:fixed; pointer-events:none; max-width:500px; box-shadow:0 4px 12px rgba(0,0,0,0.5); opacity:0; visibility:hidden; transform:translate(-50%,-100%) translateY(6px); transition:opacity .18s ease, transform .18s ease;`;
                document.body.appendChild(gt);
            }
            if (gt._hideTimer) { clearTimeout(gt._hideTimer); gt._hideTimer = null; }
            if (gt._visTimer) { clearTimeout(gt._visTimer); gt._visTimer = null; }
            gt.style.background = `${colorHex}F2`;
            gt.innerHTML = `<span style="font-size:12px;text-align:left;white-space:pre-wrap;color:white;line-height:1.4;text-shadow:0 1px 2px rgba(0,0,0,0.8);">${tooltipContent}</span>`;
            const pill = marker.querySelector('.action-pill');
            const rect = (pill || marker).getBoundingClientRect();

            // Clamp into the viewport; flip below the tag if it would overflow the top.
            const margin = 8;
            const tw = gt.offsetWidth || 200;
            const th = gt.offsetHeight || 60;
            let centerX = rect.left + rect.width / 2;
            centerX = Math.max(margin + tw / 2, Math.min(window.innerWidth - margin - tw / 2, centerX));
            const flipBelow = (rect.top - 10 - th) < margin;
            const baseY = flipBelow ? '0%' : '-100%';
            gt._baseY = baseY;
            gt.style.left = centerX + 'px';
            gt.style.top  = (flipBelow ? rect.bottom + 10 : rect.top - 10) + 'px';
            gt.style.transform = `translate(-50%, ${baseY}) translateY(6px)`;
            // Show on the next frame so the transition runs from the hidden state.
            requestAnimationFrame(() => {
                gt.style.opacity = '1';
                gt.style.visibility = 'visible';
                gt.style.transform = `translate(-50%, ${baseY}) translateY(0)`;
            });
        });

        marker.addEventListener('mouseleave', () => {
            const gt = document.getElementById('globalTooltip');
            if (!gt) return;
            // Small delay so moving between adjacent tags doesn't flicker.
            gt._hideTimer = setTimeout(() => {
                gt.style.opacity = '0';
                gt.style.transform = `translate(-50%, ${gt._baseY || '-100%'}) translateY(6px)`;
                gt._visTimer = setTimeout(() => { gt.style.visibility = 'hidden'; }, 180);
            }, 80);
        });

        timelineWrapper.appendChild(marker);

        // SWAP secondary marker
        if (log.action === 'SWAP' && log.swapSec != null) {
            const swapLeftPct = (log.swapSec / video.duration) * 100;
            const swapMarker  = document.createElement('div');
            swapMarker.className = 'marker-range marker-swap';
            swapMarker.style.cssText = `position:absolute; top:0; height:100%; left:${swapLeftPct}%; pointer-events:auto; cursor:pointer;`;
            swapMarker.innerHTML = `
                <div style="position:absolute; top: -14px; left: 0; transform: translateX(-50%); width: 14px; height: calc(100% + 14px); z-index: 6;">
                    <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 2px; height: 100%; background: #ea580c;"></div>
                    <div style="position:absolute; top: -5px; left: 50%; transform: translateX(-50%); border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #ea580c;"></div>
                </div>`;
            swapMarker.addEventListener('mousedown', e => {
                e.stopPropagation();
                video.currentTime = log.swapSec;
            });
            timelineWrapper.appendChild(swapMarker);
        }
    });

    const maxLevel = placed.reduce((max, p) => Math.max(max, p.level), 0);
    const requiredTopSpace = 40 + (maxLevel * 22);
    const wrapper = document.querySelector('.custom-timeline-wrapper');
    if (wrapper) wrapper.style.paddingTop = requiredTopSpace + 'px';
}

// ── Render Timeline Tick Labels ───────────────────────────────
function renderTimelineTicks() {
    const ticksContainer = document.getElementById('timelineTicks');
    const video = document.getElementById('videoPlayer');
    if (!ticksContainer || !video || !video.duration) return;
    ticksContainer.innerHTML = '';
    const duration = video.duration;

    const visibleDuration = duration / timelineZoom;
    const targetStep = visibleDuration / 10;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
    let step = steps[steps.length - 1];
    for (let s of steps) {
        if (s >= targetStep) { step = s; break; }
    }

    for (let t = 0; t <= duration; t += step) {
        const pct  = (t / duration) * 100;
        const tick = document.createElement('div');
        tick.style.cssText = `position:absolute; left:${pct}%; top:0; height:100%; border-left:1px solid rgba(255,255,255,0.1);`;

        const label = document.createElement('div');
        let labelText = '';
        if (t > 0) {
            const h = Math.floor(t / 3600);
            const m = Math.floor((t % 3600) / 60);
            const s = Math.floor(t % 60);
            if (h > 0) labelText += h + 'h';
            if (m > 0 || (h > 0 && s > 0)) labelText += m + 'm';
            if (s > 0) labelText += s + 's';
        }
        label.innerText = labelText;
        label.style.cssText = `position:absolute; top:28px; left:-10px; font-size:9px; color:var(--text-muted); pointer-events:none;`;

        tick.appendChild(label);
        ticksContainer.appendChild(tick);
    }
}

// ── Render Sheet Tabs ─────────────────────────────────────────
function renderSheetTabs() {
    const container = document.getElementById('sheetTabsContainer');
    if (!container) return;
    container.innerHTML = '';
    availableSheetTabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'sheet-tab' + (tab === currentSheetTab ? ' active' : '');
        btn.dataset.tab = tab;
        btn.innerText   = tab;
        btn.onclick     = () => switchSheetTab(tab);
        container.appendChild(btn);
    });
}

// ── Render Project Video Meta ─────────────────────────────────
function formatVideoMetaBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes, unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex++; }
    return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatVideoMetaDuration(durationSec) {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return '';
    const totalSec = Math.round(durationSec);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    if (hh > 0) return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function formatVideoMetaDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function renderProjectVideoMeta() {
    const emptyState = document.getElementById('videoEmptyState');
    const summaryCenter = document.getElementById('videoMetaSummaryCenter');
    const video = document.getElementById('videoPlayer');
    if (!emptyState || !summaryCenter) return;

    const hasLoadedVideo = !!(video && (video.currentSrc || video.src));
    if (hasLoadedVideo) { 
        emptyState.style.display = 'none'; 
        return; 
    }
    
    emptyState.style.display = 'flex';

    const meta = sanitizeProjectVideoMeta(currentProjectVideoMeta);
    if (!meta) { 
        summaryCenter.style.display = 'none'; 
        summaryCenter.innerHTML = ''; 
        return; 
    }

    const detailParts = [];
    const sizeText     = formatVideoMetaBytes(meta.fileSize);
    const durationText = formatVideoMetaDuration(meta.durationSec);
    const updatedText  = formatVideoMetaDate(meta.updatedAt);
    if (sizeText)     detailParts.push(sizeText);
    if (durationText) detailParts.push(durationText);
    if (updatedText)  detailParts.push(updatedText);

    summaryCenter.style.display = 'block';
    summaryCenter.innerHTML = `<strong>Video gần nhất:</strong> ${escapeHtml(meta.fileName)}${detailParts.length ? `<br>${escapeHtml(detailParts.join(' · '))}` : ''}<br>Chọn lại file để tiếp tục trên máy này.`;
}

// ── Update Active Sheet Link in header ───────────────────────
function updateActiveSheetUI() {
    const linkEl = document.getElementById('activeSheetLink');
    const nameEl = document.getElementById('activeSheetName');
    const defaultTitle = document.getElementById('defaultScriptTitle');
    if (linkEl && nameEl) {
        if (currentSpreadsheetId && currentSpreadsheetUrl) {
            linkEl.href = currentSpreadsheetUrl;
            nameEl.innerText = currentSpreadsheetName || 'Google Sheet';
            linkEl.style.display = 'inline-flex';
            if (defaultTitle) defaultTitle.style.display = 'none';
        } else {
            linkEl.style.display = 'none';
            if (defaultTitle) defaultTitle.style.display = 'inline';
        }
    }
}

// ── Update Timeline Active Range Overlay ─────────────────────
function updateTimeline() {
    drawMarkers();
    renderTimelineTicks();
}

function updateActiveRange() {
    const video        = document.getElementById('videoPlayer');
    const activeRange  = document.getElementById('activeRange');
    const draftMarker  = document.getElementById('draftMarker');
    const swapIndicator = document.getElementById('activeSwapIndicator');
    const btnToolbarImport = document.getElementById('btnToolbarImport');
    if (!video || !video.duration || !activeRange) return;

    if (btnToolbarImport) {
        if (activeInSec !== null) btnToolbarImport.classList.add('pulse-import');
        else btnToolbarImport.classList.remove('pulse-import');
    }

    if (activeInSec !== null && activeOutSec !== null) {
        activeRange.style.display = 'block';
        activeRange.style.left    = (activeInSec / video.duration) * 100 + '%';
        activeRange.style.width   = ((activeOutSec - activeInSec) / video.duration) * 100 + '%';
        const colorSet = actionColors[selectedAction] || { bg: 'rgba(239, 68, 68, 0.4)' };
        activeRange.style.background = colorSet.bg + '66';
        if (draftMarker) draftMarker.style.display = 'none';
    } else if (activeInSec !== null && activeOutSec === null) {
        activeRange.style.display = 'none';
        if (draftMarker) {
            draftMarker.style.display = 'block';
            const draftOut = Math.max(activeInSec, video.currentTime);
            draftMarker.style.left    = (activeInSec / video.duration) * 100 + '%';
            draftMarker.style.width   = ((draftOut - activeInSec) / video.duration) * 100 + '%';
            const colorSet = actionColors[selectedAction] || { bg: 'rgba(255,255,255,0.7)' };
            draftMarker.style.background = colorSet.bg;
            draftMarker.style.opacity    = '0.5';
        }
    } else {
        activeRange.style.display = 'none';
        if (draftMarker) draftMarker.style.display = 'none';
    }

    if (selectedAction === 'SWAP' && activeSwapSec !== null) {
        if (swapIndicator) {
            swapIndicator.style.display = 'block';
            swapIndicator.style.left    = (activeSwapSec / video.duration) * 100 + '%';
        }
    } else {
        if (swapIndicator) swapIndicator.style.display = 'none';
    }

    const inIndicator  = document.getElementById('activeInIndicator');
    const outIndicator = document.getElementById('activeOutIndicator');
    const swapInd2     = document.getElementById('activeSwapIndicator');
    if (activeInSec !== null) { if (inIndicator) { inIndicator.style.display = 'block'; inIndicator.style.left = (activeInSec / video.duration) * 100 + '%'; } }
    else { if (inIndicator) inIndicator.style.display = 'none'; }
    if (activeOutSec !== null) { if (outIndicator) { outIndicator.style.display = 'block'; outIndicator.style.left = (activeOutSec / video.duration) * 100 + '%'; } }
    else { if (outIndicator) outIndicator.style.display = 'none'; }
    if (activeSwapSec !== null) { if (swapInd2) { swapInd2.style.display = 'block'; swapInd2.style.left = (activeSwapSec / video.duration) * 100 + '%'; } }
    else { if (swapInd2) swapInd2.style.display = 'none'; }
}

// ── Render Settings Panel ─────────────────────────────────────
function renderSettings() {
    const sGrid = document.getElementById('settingsGrid');
    const hGrid = document.getElementById('helpGrid');
    if (!sGrid || !hGrid) return;
    sGrid.innerHTML = ''; hGrid.innerHTML = '';

    for (const [key, sc] of Object.entries(shortcuts)) {
        const text = formatShortcutDisplay(sc);
        hGrid.innerHTML += `<div class="sc-item"><span>${sc.label}</span> <kbd style="font-family:monospace;font-weight:bold;color:var(--accent);background:var(--bg-panel);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${text}</kbd></div>`;
        const btn = document.createElement('button');
        btn.className = 'sc-btn'; btn.innerText = text;
        btn.onclick = ev => { ev.target.innerText = 'Listening…'; ev.target.classList.add('listening'); listeningAction = key; };
        const div = document.createElement('div'); div.className = 'sc-item';
        div.innerHTML = `<span>${sc.label}</span>`; div.appendChild(btn);
        sGrid.appendChild(div);
    }

    const lAction = document.getElementById('labelAction');
    const lScript = document.getElementById('labelScript');
    const lNote   = document.getElementById('labelNote');
    const uText   = document.getElementById('uploadText');
    if (lAction) lAction.innerText = `ACTION (${formatShortcutDisplay(shortcuts.action)}):`;
    if (lScript) lScript.innerText = `SCRIPT (${formatShortcutDisplay(shortcuts.script)}):`;
    if (lNote)   lNote.innerText   = `NOTE (${formatShortcutDisplay(shortcuts.note)}):`;

    // Google Sheets URL input
    const sheetsUrlInput = document.getElementById('sheetsUrlInput');
    if (sheetsUrlInput) {
        sheetsUrlInput.value = googleSheetsUrl;
        if (!sheetsUrlInput.dataset.hasListener) {
            sheetsUrlInput.dataset.hasListener = "true";
            sheetsUrlInput.addEventListener('input', e => {
                googleSheetsUrl = e.target.value.trim();
                localStorage.setItem('autoscript_google_sheets_url', googleSheetsUrl);
            });
        }
    }

    // Google Client ID input
    const googleClientIdInput = document.getElementById('googleClientIdInput');
    if (googleClientIdInput) {
        googleClientIdInput.value = googleClientId;
        if (!googleClientIdInput.dataset.hasListener) {
            googleClientIdInput.dataset.hasListener = "true";
            googleClientIdInput.addEventListener('input', e => {
                googleClientId = e.target.value.trim();
                localStorage.setItem('autoscript_google_client_id', googleClientId);
            });
        }
    }
}


// ── Render Action Buttons ─────────────────────────────────────
function renderActionButtons() {
    const container = document.getElementById('actionButtonGroup');
    if (!container) return;
    container.innerHTML = '';
    
    if (!customActions || customActions.length === 0) {
        customActions = actionList; // fallback
    }

    customActions.forEach(action => {
        const actionName = typeof action === 'string' ? action : action.name;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'action-button';
        btn.dataset.action = actionName;
        btn.setAttribute('role', 'radio');
        btn.innerText = actionName;
        btn.draggable = true;
        
        if (typeof action === 'object' && action.color) {
            btn.style.backgroundColor = action.color;
        }
        
        btn.addEventListener('click', () => {
            if (typeof setSelectedAction === 'function') {
                setSelectedAction(actionName);
            }
        });
        
        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', actionName);
            setTimeout(() => { btn.style.opacity = '0.5'; }, 0);
        });

        btn.addEventListener('dragend', () => {
            btn.style.opacity = '1';
            container.querySelectorAll('.action-button').forEach(b => {
                b.style.borderLeft = '';
                b.style.borderRight = '';
            });
        });

        btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) {
                btn.style.borderLeft = '2px solid var(--accent)';
                btn.style.borderRight = '';
            } else {
                btn.style.borderRight = '2px solid var(--accent)';
                btn.style.borderLeft = '';
            }
        });

        btn.addEventListener('dragleave', () => {
            btn.style.borderLeft = '';
            btn.style.borderRight = '';
        });

        btn.addEventListener('drop', async (e) => {
            e.preventDefault();
            btn.style.borderLeft = '';
            btn.style.borderRight = '';
            const draggedActionName = e.dataTransfer.getData('text/plain');
            if (draggedActionName && draggedActionName !== actionName) {
                const fromIndex = customActions.findIndex(a => (typeof a === 'string' ? a : a.name) === draggedActionName);
                let toIndex = customActions.findIndex(a => (typeof a === 'string' ? a : a.name) === actionName);
                if (fromIndex > -1 && toIndex > -1) {
                    const rect = btn.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x >= rect.width / 2) toIndex++;
                    const [draggedItem] = customActions.splice(fromIndex, 1);
                    if (fromIndex < toIndex) toIndex--;
                    customActions.splice(toIndex, 0, draggedItem);
                    if (typeof saveCustomActions === 'function') await saveCustomActions(customActions);
                    renderActionButtons();
                }
            }
        });
        
        container.appendChild(btn);
    });
    
    if (typeof updateActionButtons === 'function') {
        updateActionButtons();
    }
}

// ── Render Transcript List ────────────────────────────────────
function formatTranscriptTime(seconds) {
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = Math.floor(seconds % 60);
    if (hh > 0) {
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function renderTranscriptList(data = transcriptData) {
    const container = document.getElementById('transcriptList');
    if (!container) return;
    container.innerHTML = '';
    
    // Toggle pulse animation on Import SRT button
    const importSrtLabel = document.getElementById('importSrtLabel');
    if (importSrtLabel) {
        if (!data || data.length === 0) {
            importSrtLabel.classList.add('empty');
        } else {
            importSrtLabel.classList.remove('empty');
        }
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No transcript data</div>';
        return;
    }
    
    const query = (document.getElementById('searchTranscript')?.value || '').toLowerCase();
    
    const selectAllSubs = document.getElementById('selectAllSubs');
    const btnImportSelectedSubs = document.getElementById('btnImportSelectedSubs');

    function updateBtnImportSelectedSubsVisibility() {
        const checked = container.querySelectorAll('.sub-checkbox:checked');
        if (btnImportSelectedSubs) {
            btnImportSelectedSubs.style.display = checked.length > 0 ? 'inline-block' : 'none';
            if (checked.length > 1) {
                btnImportSelectedSubs.classList.add('pulse-green');
            } else {
                btnImportSelectedSubs.classList.remove('pulse-green');
            }
        }
        if (selectAllSubs) {
            const all = container.querySelectorAll('.sub-checkbox');
            selectAllSubs.checked = (all.length > 0 && all.length === checked.length);
        }
    }

    if (selectAllSubs) {
        selectAllSubs.checked = false;
        selectAllSubs.onchange = (e) => {
            const checkboxes = container.querySelectorAll('.sub-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateBtnImportSelectedSubsVisibility();
        };
    }

    if (btnImportSelectedSubs) {
        btnImportSelectedSubs.style.display = 'none';
        btnImportSelectedSubs.onclick = () => {
            const checked = container.querySelectorAll('.sub-checkbox:checked');
            if (checked.length === 0) return;
            
            let combinedText = '';
            let startTC = null;
            let endTC = null;
            
            checked.forEach((cb, index) => {
                const itemIndex = parseInt(cb.value, 10);
                const item = data[itemIndex];
                if (index === 0) startTC = item.start;
                endTC = item.end;
                combinedText += item.text + ' ';
            });
            
            const valTcIn = document.getElementById('valTcIn');
            const valTcOut = document.getElementById('valTcOut');
            const inputScript = document.getElementById('inputScript');
            
            if (valTcIn) valTcIn.innerText = formatTC(startTC);
            if (valTcOut) valTcOut.innerText = formatTC(endTC);
            if (inputScript) {
                inputScript.value = combinedText.trim();
                inputScript.focus();
                inputScript.style.transition = 'box-shadow 0.2s';
                inputScript.style.boxShadow = '0 0 0 2px var(--accent)';
                setTimeout(() => inputScript.style.boxShadow = 'none', 500);
            }
            
            activeInSec = startTC;
            activeOutSec = endTC;
            if (typeof updateActiveRange === 'function') updateActiveRange();
            
            const video = document.getElementById('videoPlayer');
            if (video) video.currentTime = startTC;
            
            if (selectAllSubs) selectAllSubs.checked = false;
            container.querySelectorAll('.sub-checkbox').forEach(cb => cb.checked = false);
            updateBtnImportSelectedSubsVisibility();
        };
    }
    
    data.forEach((item, originalIndex) => {
        if (query && !item.text.toLowerCase().includes(query)) return;
        
        const div = document.createElement('div');
        div.className = 'transcript-row';
        div.style.cssText = `padding: 8px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s; display: flex; align-items: flex-start; gap: 8px; position: relative;`;
        
        const timeText = formatTranscriptTime(item.start);
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; margin-top: calc(var(--transcript-font-size, 14px) * 0.25 + 2px);">
                <input type="checkbox" class="sub-checkbox" value="${originalIndex}" style="cursor: pointer; width: calc(var(--transcript-font-size, 14px) * 0.85); height: calc(var(--transcript-font-size, 14px) * 0.85); margin: 0;">
            </div>
            <div style="flex: 1; display: flex; align-items: flex-start; gap: 8px;">
                <span class="sub-tc-span" contenteditable="false" spellcheck="false" style="color: var(--accent); font-weight: bold; font-family: monospace; font-size: 12px; outline: none; border-radius: 4px; padding: 2px 4px; flex-shrink: 0; margin-top: 2px; word-wrap: break-word; word-break: break-word;">[${timeText}]</span>
                <span class="sub-text-span" contenteditable="false" spellcheck="false" style="font-size: 14px; color: var(--text-main); white-space: pre-wrap; outline: none; border-radius: 4px; padding: 2px 4px; flex: 1; word-wrap: break-word; word-break: break-word;">${escapeHtml(item.text)}</span>
            </div>
            <div class="row-sub-actions">
                <button class="btn-action btn-import-sub" style="padding: 4px 8px; font-size: 10px; font-weight: bold;">Import</button>
                <button class="btn-delete btn-delete-sub" style="padding: 4px 6px; font-size: 10px; font-weight: bold;" title="Delete Subtitle">X</button>
            </div>
        `;
        
        const cb = div.querySelector('.sub-checkbox');
        if (cb) {
            cb.addEventListener('click', (e) => e.stopPropagation());
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                updateBtnImportSelectedSubsVisibility();
            });
        }

        const importBtn = div.querySelector('.btn-import-sub');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Set global active state
                activeInSec = item.start;
                activeOutSec = item.end;
                
                // Update DOM elements
                const valTcIn = document.getElementById('valTcIn');
                const valTcOut = document.getElementById('valTcOut');
                const inputScript = document.getElementById('inputScript');
                
                if (valTcIn) valTcIn.innerText = formatTC(activeInSec);
                if (valTcOut) valTcOut.innerText = formatTC(activeOutSec);
                if (inputScript) inputScript.value = item.text;
                
                // Update markers on timeline
                if (typeof updateActiveRange === 'function') updateActiveRange();
                
                // Optional: jump playhead to the start of the subtitle
                const video = document.getElementById('videoPlayer');
                if (video) video.currentTime = item.start;
                
                // Highlight the Script input briefly to draw attention
                if (inputScript) {
                    inputScript.focus();
                    inputScript.style.transition = 'box-shadow 0.2s';
                    inputScript.style.boxShadow = '0 0 0 2px var(--accent)';
                    setTimeout(() => inputScript.style.boxShadow = 'none', 500);
                }
            });
        }
        
        div.addEventListener('click', () => {
            const video = document.getElementById('videoPlayer');
            if (video) video.currentTime = item.start;
        });
        

        
        const deleteBtn = div.querySelector('.btn-delete-sub');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await openConfirmModal('Xóa Subtitle', 'Bạn có chắc muốn xóa subtitle này không?');
                if (confirmed) {
                    const idx = transcriptData.indexOf(item);
                    if (idx > -1) { saveState(); transcriptData.splice(idx, 1); renderTranscriptList(); }
                }
            });
        }
        
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = document.getElementById('subContextMenu');
            if (menu) {
                menu.style.display = 'flex';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
                
                const editBtn = document.getElementById('menuSubEdit');
                const delBtn = document.getElementById('menuSubDelete');
                
                if (editBtn) {
                    editBtn.onclick = () => {
                        menu.style.display = 'none';
                        const textSpan = div.querySelector('.sub-text-span');
                        const tcSpan = div.querySelector('.sub-tc-span');
                        if (textSpan) {
                            textSpan.contentEditable = "true";
                            textSpan.style.background = 'var(--bg-input)';
                            textSpan.focus();
                            const blurHandler = () => {
                                textSpan.contentEditable = "false";
                                textSpan.style.background = 'transparent';
                                let html = textSpan.innerHTML;
                                html = html.replace(/<div><br><\/div>/gi, '\n').replace(/<div>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p>/gi, '\n').replace(/<\/p>/gi, '').replace(/<br>/gi, '\n');
                                if (item.text !== html) {
                                    saveState();
                                    item.text = html;
                                }
                                textSpan.removeEventListener('blur', blurHandler);
                            };
                            textSpan.addEventListener('blur', blurHandler);
                        }
                        if (tcSpan) {
                            tcSpan.contentEditable = "true";
                            tcSpan.style.background = 'var(--bg-input)';
                            const tcBlurHandler = () => {
                                tcSpan.contentEditable = "false";
                                tcSpan.style.background = 'transparent';
                                let txt = tcSpan.innerText.replace(/\[|\]/g, '').trim();
                                const parts = txt.split(':').reverse();
                                let sec = 0;
                                for (let i = 0; i < parts.length; i++) sec += parseFloat(parts[i]) * Math.pow(60, i);
                                if (!isNaN(sec)) {
                                    if (item.start !== sec) {
                                        saveState();
                                        item.start = sec;
                                    }
                                    tcSpan.innerText = '[' + formatTranscriptTime(item.start) + ']';
                                } else {
                                    tcSpan.innerText = '[' + timeText + ']';
                                }
                                tcSpan.removeEventListener('blur', tcBlurHandler);
                            };
                            tcSpan.addEventListener('blur', tcBlurHandler);
                        }
                    };
                }
                
                if (delBtn) {
                    delBtn.onclick = async () => {
                        menu.style.display = 'none';
                        const confirmed = await openConfirmModal('Xóa Subtitle', 'Bạn có chắc muốn xóa subtitle này không?');
                        if (confirmed) {
                            const idx = transcriptData.indexOf(item);
                            if (idx > -1) { saveState(); transcriptData.splice(idx, 1); renderTranscriptList(); }
                        }
                    };
                }
            }
        });
        
        const tcSpan = div.querySelector('.sub-tc-span');
        if (tcSpan) {
            tcSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); tcSpan.blur(); }
            });
        }
        
        container.appendChild(div);
    });
}
