// ============================================================
//  AUTOSCRIPT TCP Pro — storage.js
//  Session save, dirty tracking, undo/redo.
//  Depends on: state.js, api.js
// ============================================================

// ── Undo / Redo ──────────────────────────────────────────────
function saveState(clearRedo = true) {
    logHistory.push({
        logs: JSON.parse(JSON.stringify(logs)),
        transcriptData: JSON.parse(JSON.stringify(transcriptData))
    });
    if (logHistory.length > 50) logHistory.shift();
    if (clearRedo) redoHistory = [];
}

function undo() {
    if (logHistory.length > 0) {
        redoHistory.push({
            logs: JSON.parse(JSON.stringify(logs)),
            transcriptData: JSON.parse(JSON.stringify(transcriptData))
        });
        const state = logHistory.pop();
        logs = state.logs;
        transcriptData = state.transcriptData;
        saveSession();
        renderTable(); 
        drawMarkers(); 
        if (typeof renderTranscriptList === 'function') renderTranscriptList();
    }
}

function redo() {
    if (redoHistory.length > 0) {
        logHistory.push({
            logs: JSON.parse(JSON.stringify(logs)),
            transcriptData: JSON.parse(JSON.stringify(transcriptData))
        });
        const state = redoHistory.pop();
        logs = state.logs;
        transcriptData = state.transcriptData;
        saveSession();
        renderTable(); 
        drawMarkers(); 
        if (typeof renderTranscriptList === 'function') renderTranscriptList();
    }
}

// ── Session Save (debounced write-through cache) ─────────────
/**
 * Mark data dirty, update in-memory cache, debounce KV write.
 * Call this after any mutation to `logs`.
 */
function saveSession() {
    const status = document.getElementById('saveStatus');
    if (status) status.innerText = 'Syncing...';
    if (!isProjectLogsLoaded) return;

    isLogsDirty = true;
    // Always update in-memory cache immediately so tab switch is safe
    tabLogsCache[currentSheetTab] = JSON.parse(JSON.stringify(logs));

    // Debounced KV save (background, non-blocking)
    if (projectLogsSaveTimer) clearTimeout(projectLogsSaveTimer);
    projectLogsSaveTimer = setTimeout(async () => {
        try {
            await saveProjectLogsToKV();
            isLogsDirty = false;
            if (status) status.innerText = 'Saved';
        } catch (error) {
            console.error('[STORAGE] Failed to sync project logs:', error);
            if (status) status.innerText = 'Sync failed';
        }
    }, 500);
}
