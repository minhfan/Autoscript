// ============================================================
//  AUTOSCRIPT TCP Pro — toolbar.js
//  Save Log (Import action), jumpToTC, deleteLog, saveEdit,
//  inlineUpdate, CSV Import, Sync Sheets, filters, Edit row.
//  Depends on: state.js, timecode.js, renderer.js,
//              storage.js, modals.js, playback.js, tabs.js
// ============================================================

// ── Import Action (Save Log) ──────────────────────────────────
async function logAction(actionName) {
    const video = document.getElementById('videoPlayer');
    if (!video || !video.duration) return;

    if (actionName === 'DELETE') {
        if (editingRowIndex !== null && logs[editingRowIndex].outSec === null && activeOutSec === null) {
            openMessageModal('Lỗi', 'Action DELETE bắt buộc phải có TC OUT. Vui lòng thêm TC OUT!'); return;
        } else if (editingRowIndex === null && activeOutSec === null) {
            openMessageModal('Lỗi', 'Action DELETE bắt buộc phải có TC OUT. Vui lòng thêm TC OUT!'); return;
        }
    }

    if (editingRowIndex !== null) {
        if (document.activeElement && document.activeElement.hasAttribute('contenteditable')) document.activeElement.blur();
        logs[editingRowIndex].action = actionName;
        selectedAction = actionName;
        updateActionButtons();
        const boxSwap = document.getElementById('boxSwap');
        if (boxSwap) boxSwap.style.display = actionName === 'SWAP' ? 'block' : 'none';
        saveEdit(); 
        return;
    }

    if (activeInSec === null) return;

    // Warn if overlapping a DELETE zone
    if (actionName !== 'DELETE') {
        const newIn  = activeInSec;
        const newOut = activeOutSec !== null ? activeOutSec : activeInSec;
        const overlappingDelete = logs.find(l =>
            l.action === 'DELETE' && l.inSec !== null && l.outSec !== null &&
            newIn < l.outSec && newOut > l.inSec
        );
        if (overlappingDelete) {
            const confirmed = await openConfirmModal(
                '⚠️ Cảnh báo vùng DELETE',
                `Vùng TC IN/OUT của action "${actionName}" đang nằm trong (hoặc chồng lấn) một vùng DELETE đã đánh dấu trước đó (${formatTC(overlappingDelete.inSec)} → ${formatTC(overlappingDelete.outSec)}).\n\nĐoạn này sẽ bị xóa khi xuất bản, action mới có thể không có ý nghĩa.\n\nBạn có muốn tiếp tục thêm không?`
            );
            if (!confirmed) return;
        }
    }

    saveState();
    const st = document.getElementById('inputScript').value.trim();
    const nt = document.getElementById('inputNote').value.trim();
    logs.push({
        action: actionName,
        inSec: activeInSec, outSec: activeOutSec, swapSec: activeSwapSec,
        tcswap: activeSwapSec !== null ? formatTC(activeSwapSec) : '',
        tcin:   formatTC(activeInSec),
        tcout:  activeOutSec !== null ? formatTC(activeOutSec) : '',
        script: st, note: nt
    });
    logs.sort((a, b) => a.inSec - b.inSec);
    saveSession();
    renderTable(); drawMarkers();

    // Highlight new row
    const newIdx = logs.findIndex(l => l.inSec === activeInSec && l.action === actionName && l.script === st && l.note === nt);
    if (newIdx >= 0) {
        const row = document.getElementById('row-' + newIdx);
        if (row) {
            row.classList.add('highlight-new');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => row.classList.remove('highlight-new'), 2000);
        }
    }

    // Store to clipboard BEFORE clearing form
    clipboardLogData = {
        action: actionName,
        inSec: activeInSec, outSec: activeOutSec, swapSec: activeSwapSec,
        tcswap: activeSwapSec !== null ? formatTC(activeSwapSec) : '',
        tcin:   formatTC(activeInSec),
        tcout:  activeOutSec !== null ? formatTC(activeOutSec) : '',
        script: st, note: nt
    };

    // Clear workspace
    const valTcIn  = document.getElementById('valTcIn');
    const valTcOut = document.getElementById('valTcOut');
    const valTcSwap = document.getElementById('valTcSwap');
    const boxIn  = document.getElementById('boxIn');
    const boxOut = document.getElementById('boxOut');
    const boxSwap = document.getElementById('boxSwap');
    activeInSec = null; activeOutSec = null; activeSwapSec = null;
    if (valTcIn)  valTcIn.innerText  = formatTC(video.currentTime);
    if (valTcOut) valTcOut.innerText = formatTC(video.currentTime);
    if (valTcSwap) valTcSwap.innerText = formatTC(video.currentTime);
    document.getElementById('inputScript').value = '';
    document.getElementById('inputNote').value   = '';
    updateActiveRange();
    if (boxIn)  boxIn.classList.remove('active');
    if (boxOut) boxOut.classList.remove('active');
    if (boxSwap) boxSwap.classList.remove('active');
    saveSession();
    renderTable(); drawMarkers();
}

function saveLog() { logAction(selectedAction); }

// ── Jump to TC from table ─────────────────────────────────────
window.jumpToTC = function(index, field, useMaster = false) {
    const logArray = useMaster ? (tabLogsCache['Full-show'] || logs) : logs;
    const log = logArray[index];
    if (!log) return;

    const video    = document.getElementById('videoPlayer');
    const valTcIn  = document.getElementById('valTcIn');
    const valTcOut = document.getElementById('valTcOut');
    const valTcSwap = document.getElementById('valTcSwap');
    const boxIn   = document.getElementById('boxIn');
    const boxOut  = document.getElementById('boxOut');
    const boxSwap = document.getElementById('boxSwap');

    tcAutoSelected = true;
    tcJumpWait = true;

    if (log.inSec !== undefined && log.inSec !== null) {
        activeInSec = log.inSec;
        if (valTcIn) valTcIn.innerText = formatTC(activeInSec);
        if (boxIn) boxIn.classList.add('active');
    }
    if (log.outSec !== undefined && log.outSec !== null) {
        activeOutSec = log.outSec;
        if (valTcOut) valTcOut.innerText = formatTC(activeOutSec);
        if (boxOut) boxOut.classList.add('active');
    }
    if (log.swapSec !== undefined && log.swapSec !== null && valTcSwap) {
        activeSwapSec = log.swapSec;
        valTcSwap.innerText = formatTC(activeSwapSec);
        if (boxSwap) boxSwap.classList.add('active');
    }

    updateActiveRange();

    const sec = parseTC(log[field]);
    if (sec !== null && !isNaN(sec)) {
        if (video) video.currentTime = sec;
        let targetZoom = 50;
        let pts = [];
        if (log.inSec !== null) pts.push(log.inSec);
        if (log.outSec !== null) pts.push(log.outSec);
        if (log.action === 'SWAP' && log.swapSec !== null) pts.push(log.swapSec);
        let centerSec = sec;
        if (pts.length >= 2) {
            const minSec = Math.min(...pts), maxSec = Math.max(...pts);
            const validDur = maxSec - minSec;
            if (validDur > 0 && video && video.duration && !isNaN(video.duration)) {
                targetZoom = Math.max(1, Math.min(50, video.duration / (validDur * 3)));
                centerSec  = minSec + validDur / 2;
            }
        }
        applyZoom(targetZoom, false, centerSec);
    }
};

// ── Delete Log ────────────────────────────────────────────────
window.deleteLog = function(index) {
    saveState();
    logs.splice(index, 1);
    if (editingRowIndex === index) editingRowIndex = null;
    else if (editingRowIndex > index) editingRowIndex--;
    saveSession();
    renderTable(); drawMarkers();
};

// ── Save/Exit Edit Mode ───────────────────────────────────────
function saveEdit() {
    const video = document.getElementById('videoPlayer');
    const valTcIn  = document.getElementById('valTcIn');
    const valTcOut = document.getElementById('valTcOut');
    const valTcSwap = document.getElementById('valTcSwap');
    const boxIn   = document.getElementById('boxIn');
    const boxOut  = document.getElementById('boxOut');
    const boxSwap = document.getElementById('boxSwap');

    if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < logs.length) {
        const log    = logs[editingRowIndex];
        const scriptEl = document.getElementById('inputScript');
        const noteEl   = document.getElementById('inputNote');
        if (scriptEl) log.script = scriptEl.value.trim();
        if (noteEl)   log.note   = noteEl.value.trim();
        log.tcin  = formatTC(log.inSec);
        log.tcout = log.outSec ? formatTC(log.outSec) : '00:00:00:00';
        log.tcswap = log.swapSec ? formatTC(log.swapSec) : '';
    }
    editingRowIndex = null;
    activeInSec = null; activeOutSec = null; activeSwapSec = null;
    if (valTcIn)  valTcIn.innerText  = '00:00:00:00';
    if (valTcOut) valTcOut.innerText = '00:00:00:00';
    if (valTcSwap) valTcSwap.innerText = '00:00:00:00';
    document.getElementById('inputScript').value = '';
    document.getElementById('inputNote').value   = '';
    updateActiveRange();
    if (boxIn)  boxIn.classList.remove('active');
    if (boxOut) boxOut.classList.remove('active');
    if (boxSwap) boxSwap.classList.remove('active');
    saveSession();
    renderTable(); drawMarkers();
}

// ── Inline Table Cell Edit ────────────────────────────────────
window.inlineUpdate = function(index, field, element) {
    saveState();
    logs[index][field] = element.value || element.innerText.trim();
    saveSession();
    if (field === 'tcswap') { logs[index].swapSec = parseTC(logs[index].tcswap); drawMarkers(); }
    if (field === 'tcin')   { logs[index].inSec   = parseTC(logs[index].tcin);   drawMarkers(); }
    if (field === 'tcout')  { logs[index].outSec  = parseTC(logs[index].tcout);  drawMarkers(); }
};

// ── Excel Import / Export (canonical layout: STT, ACTION, TC IN, ──
//    TC OUT, TC SWAP, SCRIPT, NOTE — data from row 5) ───────────

// Read a cell as plain text (action / timecode columns).
function xlsxCellText(cell) {
    const v = cell ? cell.value : null;
    if (v == null) return '';
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) return v.richText.map(r => r.text || '').join('');
        if (v.text != null) return String(v.text);       // hyperlink
        if (v.result != null) return String(v.result);   // formula result
        if (v instanceof Date) return '';
        return String(v);
    }
    return String(v);
}

// Read a cell as canonical rich HTML (script / note columns).
function xlsxCellRichHtml(cell) {
    const v = cell ? cell.value : null;
    if (v == null) return '';
    if (typeof v === 'object' && Array.isArray(v.richText)) {
        return richTextRunsToHtml(v.richText);
    }
    return rtEscapeText(xlsxCellText(cell));
}

function initCSVImport() {
    const csvImportEl = document.getElementById('csvImport');
    if (!csvImportEl) return;
    csvImportEl.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            if (typeof ExcelJS === 'undefined') throw new Error('ExcelJS chưa được tải.');
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const ws = workbook.worksheets[0];
            if (!ws) throw new Error('Workbook rỗng.');

            // Locate the header row so data start is robust across sheets.
            let headerRow = 0;
            const scanMax = Math.min(ws.rowCount || 0, 12);
            for (let r = 1; r <= scanMax; r++) {
                const labels = [];
                for (let c = 1; c <= 7; c++) labels.push(xlsxCellText(ws.getRow(r).getCell(c)).trim().toUpperCase());
                if (labels.indexOf('ACTION') !== -1 || labels.indexOf('TC IN') !== -1 || labels.indexOf('STT') !== -1) {
                    headerRow = r;
                    break;
                }
            }
            const dataStart = headerRow ? headerRow + 1 : 5;

            const newLogs = [];
            for (let r = dataStart; r <= ws.rowCount; r++) {
                const row = ws.getRow(r);
                let action  = xlsxCellText(row.getCell(2)).trim();
                if (action === 'DELTELE') action = 'DELETE';
                const tcin   = xlsxCellText(row.getCell(3)).trim();
                const tcout  = xlsxCellText(row.getCell(4)).trim();
                const tcswap = xlsxCellText(row.getCell(5)).trim();
                const script = xlsxCellRichHtml(row.getCell(6));
                const note   = xlsxCellRichHtml(row.getCell(7));
                if (action || tcin || tcout || tcswap || script || note) {
                    newLogs.push({
                        action, tcswap, tcin, tcout, script, note,
                        inSec: parseTC(tcin),
                        outSec: parseTC(tcout) || null,
                        swapSec: tcswap ? parseTC(tcswap) : null
                    });
                }
            }

            if (newLogs.length > 0) {
                const ok = await openConfirmModal('Import Data', `Tìm thấy ${newLogs.length} dòng. Ghi đè danh sách hiện tại?`);
                if (ok) {
                    if (typeof saveState === 'function') saveState();
                    logs = newLogs;
                    renderTable();
                    drawMarkers();
                    saveProjectLogsToKV();
                    if (typeof saveSession === 'function') saveSession();
                }
            } else {
                openMessageModal('Lỗi Import', 'File không hợp lệ hoặc rỗng!');
            }
        } catch (err) {
            console.error(err);
            openMessageModal('Lỗi Import', 'Không thể đọc file. Vui lòng chọn file Excel (.xlsx) hợp lệ.');
        } finally {
            e.target.value = '';
        }
    });
}

// Build an ExcelJS cell value, preserving bold/italic/strike/underline.
function buildExcelCellValue(html) {
    const runs = htmlToRuns(html);
    if (!runs.length) return '';
    const hasFmt = runs.some(r => r.bold || r.italic || r.strike || r.underline);
    if (!hasFmt) return runs.map(r => r.text).join('');
    return {
        richText: runs.map(r => {
            const font = {};
            if (r.bold) font.bold = true;
            if (r.italic) font.italic = true;
            if (r.strike) font.strike = true;
            if (r.underline) font.underline = true;
            return { text: r.text, font };
        })
    };
}

function safeExcelSheetName(name) {
    const cleaned = String(name || 'Sheet').replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31);
    return cleaned || 'Sheet';
}

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportToExcel() {
    if (typeof ExcelJS === 'undefined') {
        openMessageModal('Export Excel', 'Thư viện ExcelJS chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    if (!logs.length) {
        openMessageModal('Export Excel', 'Danh sách log rỗng. Không có gì để xuất.');
        return;
    }
    const btn = document.getElementById('btnExportExcel');
    const originalText = btn ? btn.innerText : 'Export Excel';
    if (btn) { btn.disabled = true; btn.innerText = 'Đang xuất...'; }
    try {
        const tabName = currentSheetTab || 'Full-show';
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet(safeExcelSheetName(tabName));
        ws.columns = [
            { width: 6 }, { width: 12 }, { width: 14 }, { width: 14 },
            { width: 14 }, { width: 50 }, { width: 40 }
        ];

        // Header area (rows 1–4); data starts at row 5 to match the Sheet template.
        ws.getCell('A1').value = currentSpreadsheetName || 'Autoscript';
        const headers = ['STT', 'ACTION', 'TC IN', 'TC OUT', 'TC SWAP', 'SCRIPT', 'NOTE'];
        headers.forEach((label, idx) => {
            const cell = ws.getCell(4, idx + 1);
            cell.value = label;
            cell.font = { bold: true };
        });

        logs.forEach((log, i) => {
            const r = 5 + i;
            ws.getCell(r, 1).value = i + 1;
            ws.getCell(r, 2).value = log.action || '';
            ws.getCell(r, 3).value = log.tcin || '';
            ws.getCell(r, 4).value = (log.tcout && log.tcout !== '00:00:00:00') ? log.tcout : '';
            ws.getCell(r, 5).value = log.tcswap || '';
            ws.getCell(r, 6).value = buildExcelCellValue(log.script);
            ws.getCell(r, 7).value = buildExcelCellValue(log.note);
            ws.getCell(r, 6).alignment = { wrapText: true, vertical: 'top' };
            ws.getCell(r, 7).alignment = { wrapText: true, vertical: 'top' };
        });

        const out = await wb.xlsx.writeBuffer();
        const blob = new Blob([out], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const filename = `${currentSpreadsheetName || 'Autoscript'} - ${tabName}.xlsx`
            .replace(/[\\/:*?"<>|]+/g, '_');
        triggerBlobDownload(blob, filename);
    } catch (err) {
        console.error(err);
        openMessageModal('Lỗi Export', 'Không thể tạo file Excel: ' + (err.message || err));
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = originalText; }
    }
}

// Sync / Export dropdown menu wiring.
function initSyncMenu() {
    const trigger = document.getElementById('btnSyncMenu');
    const menu = document.getElementById('syncMenu');
    if (!trigger || !menu) return;

    const closeMenu = () => {
        menu.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
    };
    const openMenu = () => {
        menu.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.style.display === 'block') closeMenu();
        else openMenu();
    });
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== trigger) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    const btnSync = document.getElementById('btnSyncSheets');
    if (btnSync) btnSync.addEventListener('click', () => { closeMenu(); syncToGoogleSheets(); });
    const btnExport = document.getElementById('btnExportExcel');
    if (btnExport) btnExport.addEventListener('click', () => { closeMenu(); exportToExcel(); });
}
