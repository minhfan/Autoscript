        let activeInSec = null, activeOutSec = null;
        let playbackSpeed = 1.0;
        let listeningAction = null; 
        
        const actionList = ["DELTELE", "POP-UP", "QUESTION", "QUOTE", "NOTE", "OTHERS"];
        const actionColors = {
            "DELTELE":  { bg: "#b91c1c", color: "#ffffff" },
            "POP-UP":   { bg: "#166534", color: "#ffffff" },
            "QUESTION": { bg: "#1d4ed8", color: "#ffffff" },
            "QUOTE":    { bg: "#d9f99d", color: "#166534" },
            "NOTE":     { bg: "#bae6fd", color: "#0369a1" },
            "OTHERS":   { bg: "#374151", color: "#ffffff" }
        };
        let selectedAction = actionList[0];

        // --- RESIZERS LOGIC ---
        const mainContainer = document.getElementById('mainContainer');
        const leftCol = document.getElementById('leftCol'), rightCol = document.getElementById('tablePanel');
        const resizerV = document.getElementById('resizerV');
        const videoSection = document.getElementById('videoSection'), formSection = document.getElementById('formSection');
        const resizerH = document.getElementById('resizerH');
        let isResizingV = false, isResizingH = false;

        resizerV.addEventListener('mousedown', (e) => { isResizingV = true; document.body.style.cursor = 'col-resize'; e.preventDefault(); });
        resizerH.addEventListener('mousedown', (e) => { isResizingH = true; document.body.style.cursor = 'row-resize'; e.preventDefault(); });

        window.addEventListener('mousemove', (e) => {
            if (isResizingV) {
                let rect = mainContainer.getBoundingClientRect();
                let pct = ((e.clientX - rect.left) / rect.width) * 100;
                if(pct > 20 && pct < 80) { leftCol.style.width = pct + '%'; rightCol.style.width = (100 - pct) + '%'; }
            }
            if (isResizingH) {
                let rect = leftCol.getBoundingClientRect();
                let pct = ((e.clientY - rect.top) / rect.height) * 100;
                if(pct > 20 && pct < 80) { videoSection.style.height = pct + '%'; formSection.style.height = (100 - pct) + '%'; }
            }
        });
        window.addEventListener('mouseup', () => { isResizingV = false; isResizingH = false; document.body.style.cursor = 'default'; });

        // --- DRAGGABLE FLOAT PANEL ---
        const floatPanel = document.getElementById('floatHelpPanel');
        const floatHeader = document.getElementById('floatHelpHeader');
        let isDraggingFloat = false, floatOffsetX, floatOffsetY;

        document.getElementById('btnHelp').onclick = () => { floatPanel.style.display = floatPanel.style.display === "flex" ? "none" : "flex"; };
        document.getElementById('btnCloseHelp').onclick = () => { floatPanel.style.display = "none"; };

        floatHeader.addEventListener('mousedown', (e) => {
            isDraggingFloat = true;
            floatOffsetX = e.clientX - floatPanel.offsetLeft;
            floatOffsetY = e.clientY - floatPanel.offsetTop;
            document.body.style.cursor = 'move';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDraggingFloat) return;
            floatPanel.style.left = (e.clientX - floatOffsetX) + 'px';
            floatPanel.style.top = (e.clientY - floatOffsetY) + 'px';
        });
        window.addEventListener('mouseup', () => { isDraggingFloat = false; if(!isResizingV && !isResizingH) document.body.style.cursor = 'default'; });

        // --- SESSION MANAGEMENT ---
        let logs = JSON.parse(localStorage.getItem('autoscript_tcp_v9')) || [];
        function saveSession() {
            localStorage.setItem('autoscript_tcp_v9', JSON.stringify(logs));
            const status = document.getElementById('saveStatus');
            status.innerText = "Saving...";
            setTimeout(() => { status.innerText = "Saved"; }, 500);
        }

        document.getElementById('csvImport').addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const lines = event.target.result.split('\n');
                let newLogs = [];
                for(let i=4; i<lines.length; i++) {
                    let line = lines[i].trim(); if(!line) continue;
                    let cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if(cols.length >= 6) {
                        let action = cols[1].replace(/^"|"$/g, '').trim();
                        let tcin = cols[2].replace(/^"|"$/g, '').trim();
                        let tcout = cols[3].replace(/^"|"$/g, '').trim();
                        let script = cols[4].replace(/^"|"$/g, '').replace(/""/g, '"');
                        let note = cols[5].replace(/^"|"$/g, '').replace(/""/g, '"');
                        newLogs.push({ action, tcin, tcout, script, note, inSec: parseTC(tcin), outSec: parseTC(tcout) || null });
                    }
                }
                if(newLogs.length > 0) {
                    if(confirm(`Found ${newLogs.length} rows. Overwrite current list?`)) {
                        logs = newLogs; renderTable(); drawMarkers(); saveSession();
                    }
                } else alert("Invalid or empty CSV!");
            };
            reader.readAsText(file); e.target.value = ''; 
        });

        // --- SHORTCUT ENGINE ---
        const defaultShortcuts = {
            action: { key: 'A', shift: false, ctrl: false, alt: false, label: "Select ACTION" },
            script: { key: 'S', shift: false, ctrl: false, alt: false, label: "Select SCRIPT" },
            note: { key: 'N', shift: false, ctrl: false, alt: false, label: "Select NOTE" },
            video: { key: 'V', shift: false, ctrl: false, alt: false, label: "Upload Video" },
            tcin: { key: 'I', shift: false, ctrl: false, alt: false, label: "Mark TC IN" },
            tcout: { key: 'O', shift: false, ctrl: false, alt: false, label: "Mark TC OUT" },
            jumpin: { key: 'Q', shift: false, ctrl: false, alt: false, label: "Seek to IN" },
            jumpout: { key: 'W', shift: false, ctrl: false, alt: false, label: "Seek to OUT" },
            play: { key: ' ', shift: false, ctrl: false, alt: false, label: "Play/Pause" },
            save: { key: 'S', shift: false, ctrl: true, alt: false, label: "Save Log (Ctrl+S)" },
            prev: { key: '[', shift: false, ctrl: false, alt: false, label: "Prev Marker" },
            next: { key: ']', shift: false, ctrl: false, alt: false, label: "Next Marker" },
            slow: { key: ',', shift: false, ctrl: false, alt: false, label: "Speed -0.25x" },
            fast: { key: '.', shift: false, ctrl: false, alt: false, label: "Speed +0.25x" },
            previewCut: { key: 'P', shift: false, ctrl: false, alt: false, label: "Toggle Preview Cut" },
            fullscreen: { key: 'F', shift: false, ctrl: false, alt: false, label: "Toggle Fullscreen" }
        };

        let shortcuts = JSON.parse(localStorage.getItem('autoscript_shortcuts')) || defaultShortcuts;

        function formatShortcutDisplay(sc) {
            let parts = [];
            if (sc.ctrl) parts.push("Ctrl"); if (sc.alt) parts.push("Alt"); if (sc.shift) parts.push("Shift");
            parts.push(sc.key === ' ' ? 'Space' : sc.key.toUpperCase());
            return parts.join('+');
        }

        function matchShortcut(e, actionName) {
            let sc = shortcuts[actionName]; if (!sc) return false;
            let keyMatch = (sc.key === ' ') ? (e.key === ' ') : (e.key.toUpperCase() === sc.key.toUpperCase());
            return keyMatch && e.shiftKey === sc.shift && (e.ctrlKey || e.metaKey) === sc.ctrl && e.altKey === sc.alt;
        }

        function renderSettings() {
            const sGrid = document.getElementById('settingsGrid'), hGrid = document.getElementById('helpGrid');
            sGrid.innerHTML = ""; hGrid.innerHTML = "";
            for (let [key, sc] of Object.entries(shortcuts)) {
                let text = formatShortcutDisplay(sc);
                hGrid.innerHTML += `<div class="sc-item"><span>${sc.label}</span> <kbd style="font-family:monospace; font-weight:bold; color:var(--accent); background:var(--bg-panel); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">${text}</kbd></div>`;
                let btn = document.createElement('button');
                btn.className = 'sc-btn'; btn.innerText = text;
                btn.onclick = (e) => { e.target.innerText = "Listening..."; e.target.classList.add('listening'); listeningAction = key; };
                let div = document.createElement('div'); div.className = 'sc-item'; div.innerHTML = `<span>${sc.label}</span>`; div.appendChild(btn);
                sGrid.appendChild(div);
            }
            document.getElementById('labelAction').innerText = `ACTION (${formatShortcutDisplay(shortcuts.action)}):`;
            document.getElementById('labelScript').innerText = `SCRIPT (${formatShortcutDisplay(shortcuts.script)}):`;
            document.getElementById('labelNote').innerText = `NOTE (${formatShortcutDisplay(shortcuts.note)}):`;
            document.getElementById('uploadText').innerText = `Click or press '${formatShortcutDisplay(shortcuts.video)}' to upload a video file`;
        }

        document.addEventListener('keydown', (e) => {
            if (listeningAction) {
                e.preventDefault();
                if (e.key === 'Escape') { listeningAction = null; renderSettings(); return; }
                if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; 
                shortcuts[listeningAction] = { key: e.key.toUpperCase(), shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, label: shortcuts[listeningAction].label };
                localStorage.setItem('autoscript_shortcuts', JSON.stringify(shortcuts));
                listeningAction = null; renderSettings();
            }
        });

        // Elements
        const video = document.getElementById('videoPlayer'), upload = document.getElementById('videoUpload');
        const bigTc = document.getElementById('bigTimecode'), valTcIn = document.getElementById('valTcIn'), valTcOut = document.getElementById('valTcOut');
        const boxIn = document.getElementById('boxIn'), boxOut = document.getElementById('boxOut');
        const activeRange = document.getElementById('activeRange');
        const actionButtons = Array.from(document.querySelectorAll('#actionButtonGroup .action-button'));
        const speedDisplay = document.getElementById('speedDisplay'), speedMenu = document.getElementById('speedMenu');
        
        function updateActionButtons() {
            actionButtons.forEach((button) => {
                const action = button.dataset.action;
                const colorSet = actionColors[action] || actionColors["OTHERS"];
                const isActive = action === selectedAction;

                button.classList.toggle('active', isActive);
                button.setAttribute('aria-checked', String(isActive));
                button.style.setProperty('--action-bg', colorSet.bg);
                button.style.setProperty('--action-color', colorSet.color);
            });
        }

        function setSelectedAction(action) {
            if (!actionColors[action]) return;
            selectedAction = action;
            updateActionButtons();
        }

        actionButtons.forEach((button) => {
            button.addEventListener('click', () => setSelectedAction(button.dataset.action));
        });
        updateActionButtons();

        document.getElementById('themeSelect').addEventListener('change', (e) => document.body.setAttribute('data-theme', e.target.value));
        document.getElementById('btnFullscreen').addEventListener('click', function() {
            const panel = document.getElementById('tablePanel'); panel.classList.toggle('fullscreen');
            this.innerText = panel.classList.contains('fullscreen') ? 'Shrink' : 'Expand';
        });

        const mSettings = document.getElementById('settingsModal');
        document.getElementById('btnShortcuts').onclick = () => mSettings.style.display = "flex";
        document.getElementById('btnCloseSettings').onclick = () => mSettings.style.display = "none";
        function togglePlayback() {
            if (video.paused) video.play();
            else video.pause();
        }

        function stopPlayback() {
            video.pause();
            if (video.duration) video.currentTime = 0;
        }

        function markInPoint() {
            activeInSec = video.currentTime;
            activeOutSec = null;
            valTcIn.innerText = formatTC(activeInSec);
            valTcOut.innerText = "00:00:00:00";
            boxIn.classList.add('active');
            boxOut.classList.remove('active');
            updateActiveRange();
        }

        function markOutPoint() {
            if (activeInSec !== null && video.currentTime > activeInSec) {
                activeOutSec = video.currentTime;
                valTcOut.innerText = formatTC(activeOutSec);
                boxOut.classList.add('active');
                updateActiveRange();
            }
        }

        function updateToolbarPlayState() {
            const btn = document.getElementById('btnPlayVideo');
            btn.classList.toggle('active', !video.paused);
            btn.innerHTML = video.paused ? "&#9658;" : "&#10074;&#10074;";
            btn.title = video.paused ? "Phát video" : "Tạm dừng video";
            btn.setAttribute('aria-label', btn.title);
        }

        upload.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                video.src = URL.createObjectURL(e.target.files[0]);
                document.getElementById('uploadText').innerText = e.target.files[0].name;
            }
        });
        
        video.addEventListener('loadedmetadata', () => { document.getElementById('tcEnd').innerText = formatTC(video.duration); });
        document.getElementById('tcStart').addEventListener('click', () => { video.currentTime = 0; });
        document.getElementById('tcEnd').addEventListener('click', () => { if(video.duration) video.currentTime = video.duration; });
        
        video.addEventListener('focus', () => video.blur());
        boxIn.addEventListener('click', () => { if (activeInSec !== null) video.currentTime = activeInSec; });
        boxOut.addEventListener('click', () => { if (activeOutSec !== null) video.currentTime = activeOutSec; });

        document.getElementById('btnPlayVideo').addEventListener('click', togglePlayback);
        document.getElementById('btnStopVideo').addEventListener('click', stopPlayback);
        document.getElementById('btnToolbarImport').addEventListener('click', saveLog);
        video.addEventListener('play', updateToolbarPlayState);
        video.addEventListener('pause', updateToolbarPlayState);
        updateToolbarPlayState();

        bigTc.addEventListener('click', function() {
            navigator.clipboard.writeText(this.innerText);
            this.style.color = 'var(--success)'; setTimeout(() => this.style.color = 'var(--accent)', 500);
        });

        // --- SPEED LOGIC ---
        let isDraggingSpeed = false, speedStartX = 0, speedStartVal = 1.0, speedDidDrag = false;
        speedDisplay.addEventListener('mousedown', (e) => {
            isDraggingSpeed = true; speedDidDrag = false; speedStartX = e.clientX; speedStartVal = playbackSpeed;
            document.body.style.cursor = 'ew-resize'; e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDraggingSpeed) return;
            const deltaX = e.clientX - speedStartX;
            if (Math.abs(deltaX) > 3) speedDidDrag = true;
            let newSpeed = Math.max(0.1, Math.min(speedStartVal + Math.round(deltaX / 10) * 0.1, 4.0));
            if (Math.abs(newSpeed - playbackSpeed) > 0.05) {
                playbackSpeed = newSpeed; video.playbackRate = playbackSpeed;
                speedDisplay.innerText = playbackSpeed.toFixed(2) + "x";
            }
        });
        window.addEventListener('mouseup', () => { if (isDraggingSpeed) { isDraggingSpeed = false; document.body.style.cursor = 'default'; } });
        speedDisplay.addEventListener('click', (e) => {
            if (speedDidDrag) return; e.stopPropagation();
            speedMenu.style.display = (speedMenu.style.display === 'block') ? 'none' : 'block';
        });
        window.addEventListener('click', () => speedMenu.style.display = 'none');
        document.querySelectorAll('#speedMenu li').forEach(li => {
            li.addEventListener('click', (e) => {
                playbackSpeed = parseFloat(e.target.getAttribute('data-speed'));
                video.playbackRate = playbackSpeed; speedDisplay.innerText = playbackSpeed.toFixed(2) + "x";
            });
        });

        document.getElementById('volumeSlider').addEventListener('input', (e) => { video.volume = e.target.value; });

        // --- PREVIEW CUT ENGINE ---
        let isPreviewCut = false;
        const btnPreviewCut = document.getElementById('btnPreviewCut');
        
        function togglePreviewCut() {
            isPreviewCut = !isPreviewCut;
            btnPreviewCut.innerText = isPreviewCut ? "Preview: ON" : "Preview: OFF";
            btnPreviewCut.style.background = isPreviewCut ? "var(--accent)" : "";
            btnPreviewCut.style.color = isPreviewCut ? "#000" : "";
            btnPreviewCut.style.borderColor = isPreviewCut ? "var(--accent)" : "";
        }
        btnPreviewCut.addEventListener('click', togglePreviewCut);

        // --- CORE KEYBOARD ENGINE ---
        document.addEventListener('keydown', function(e) {
            if (listeningAction) return; 
            const activeEl = document.activeElement;
            const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable;
            
            if (e.code === 'Escape') { activeEl.blur(); return; }
            if (e.code === 'Enter' && activeEl.isContentEditable && activeEl.classList.contains('td-tc')) { e.preventDefault(); activeEl.blur(); return; }
            if (matchShortcut(e, 'save')) { e.preventDefault(); saveLog(); return; }
            if (isEditing) return; 

            if (matchShortcut(e, 'video')) { e.preventDefault(); upload.click(); }
            else if (matchShortcut(e, 'action')) { 
                e.preventDefault(); 
                const currentIndex = actionList.indexOf(selectedAction);
                setSelectedAction(actionList[(currentIndex + 1) % actionList.length]);
                activeEl.blur(); 
            }
            else if (matchShortcut(e, 'script')) { e.preventDefault(); document.getElementById('inputScript').focus(); }
            else if (matchShortcut(e, 'note')) { e.preventDefault(); document.getElementById('inputNote').focus(); }
            else if (matchShortcut(e, 'play')) { e.preventDefault(); togglePlayback(); } 
            else if (matchShortcut(e, 'slow')) { e.preventDefault(); playbackSpeed = Math.max(0.25, playbackSpeed - 0.25); video.playbackRate = playbackSpeed; speedDisplay.innerText = playbackSpeed.toFixed(2) + "x"; }
            else if (matchShortcut(e, 'fast')) { e.preventDefault(); playbackSpeed = Math.min(4.0, playbackSpeed + 0.25); video.playbackRate = playbackSpeed; speedDisplay.innerText = playbackSpeed.toFixed(2) + "x"; }
            else if (matchShortcut(e, 'tcin')) {
                e.preventDefault();
                markInPoint();
            } 
            else if (matchShortcut(e, 'tcout')) {
                e.preventDefault();
                markOutPoint();
            }
            else if (matchShortcut(e, 'jumpin')) { e.preventDefault(); if (activeInSec !== null) video.currentTime = activeInSec; }
            else if (matchShortcut(e, 'jumpout')) { e.preventDefault(); if (activeOutSec !== null) video.currentTime = activeOutSec; }
            else if (matchShortcut(e, 'prev')) { e.preventDefault(); jumpMarker(-1); }
            else if (matchShortcut(e, 'next')) { e.preventDefault(); jumpMarker(1); }
            else if (matchShortcut(e, 'previewCut')) { e.preventDefault(); togglePreviewCut(); }
            else if (matchShortcut(e, 'fullscreen')) {
                e.preventDefault();
                const tablePanel = document.getElementById('tablePanel');
                if (tablePanel.contains(document.activeElement) || tablePanel.classList.contains('fullscreen')) {
                    document.getElementById('btnFullscreen').click();
                } else {
                    if (!document.fullscreenElement) document.getElementById('videoPlayer').requestFullscreen().catch(err => {});
                    else document.exitFullscreen();
                }
            }
        });

        // --- HOVER TIMELINE (ALWAYS ON) ---
        const timelineWrapper = document.getElementById('customTimeline'), hoverTooltip = document.getElementById('hoverTooltip');
        timelineWrapper.addEventListener('mousemove', (e) => {
            if (!video.duration) { hoverTooltip.style.display = 'none'; return; }
            const rect = timelineWrapper.getBoundingClientRect();
            const hoverSec = (Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width) * video.duration;
            hoverTooltip.style.display = 'block'; hoverTooltip.style.left = Math.max(0, Math.min(e.clientX - rect.left, rect.width)) + 'px';
            hoverTooltip.innerText = formatTC(hoverSec);
        });
        timelineWrapper.addEventListener('mouseleave', () => { hoverTooltip.style.display = 'none'; });

        function updateActiveRange() {
            if (!video.duration || activeInSec === null) { activeRange.style.display = 'none'; return; }
            activeRange.style.display = 'block';
            let currentEnd = activeOutSec !== null ? activeOutSec : Math.max(activeInSec, video.currentTime);
            activeRange.style.left = (activeInSec / video.duration) * 100 + '%';
            activeRange.style.width = ((currentEnd - activeInSec) / video.duration) * 100 + '%';
        }

        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                if (isPreviewCut) {
                    for (let i = 0; i < logs.length; i++) {
                        if (logs[i].action === "DELTELE" && logs[i].outSec) {
                            if (video.currentTime >= logs[i].inSec && video.currentTime < logs[i].outSec - 0.1) {
                                video.currentTime = logs[i].outSec; break;
                            }
                        }
                    }
                }

                document.getElementById('timelineProgress').style.width = (video.currentTime / video.duration) * 100 + '%';
                bigTc.innerText = formatTC(video.currentTime);
                if (activeInSec !== null && activeOutSec === null) updateActiveRange();
                
                if (activeOutSec !== null) {
                    if (video.currentTime > activeOutSec) boxOut.classList.remove('active');
                    else boxOut.classList.add('active');
                }
            }
        });

        timelineWrapper.addEventListener('click', (e) => {
            if (!video.duration) return;
            video.currentTime = ((e.clientX - timelineWrapper.getBoundingClientRect().left) / timelineWrapper.getBoundingClientRect().width) * video.duration;
        });

        function drawMarkers() {
            Array.from(timelineWrapper.querySelectorAll('.marker-range')).forEach(el => el.remove());
            logs.forEach((log) => {
                if (!video.duration || log.inSec === undefined) return;
                let startPct = (log.inSec / video.duration) * 100;
                let endSec = log.outSec ? log.outSec : log.inSec + 1; 
                
                const marker = document.createElement('div'); marker.className = 'marker-range';
                marker.style.left = startPct + '%'; marker.style.width = ((endSec - log.inSec) / video.duration) * 100 + '%';
                
                let colorHex = actionColors[log.action].bg;
                marker.style.borderLeftColor = colorHex; marker.style.borderRightColor = colorHex;
                marker.style.backgroundColor = colorHex + '50'; 
                
                marker.innerHTML = `<div class="tooltip">[${log.action}]\n${log.note || log.script || ""}</div>`;
                marker.addEventListener('click', (e) => { e.stopPropagation(); video.currentTime = log.inSec; });
                timelineWrapper.appendChild(marker);
            });
        }

        function jumpMarker(direction) {
            if (logs.length === 0) return;
            const sorted = [...logs].sort((a, b) => a.inSec - b.inSec);
            let targetSec = null;
            if (direction === 1) {
                let next = sorted.find(l => l.inSec > video.currentTime + 0.5);
                if (next) targetSec = next.inSec;
            } else {
                let prevs = sorted.filter(l => l.inSec < video.currentTime - 0.5);
                if (prevs.length > 0) targetSec = prevs[prevs.length - 1].inSec;
            }
            if (targetSec !== null) video.currentTime = targetSec;
        }

        // LƯU KỊCH BẢN
        function saveLog() {
            const action = selectedAction;
            let tcin = valTcIn.innerText, tcout = valTcOut.innerText;
            const script = document.getElementById('inputScript').value.replace(/"/g, '""').replace(/\n/g, " ");
            const note = document.getElementById('inputNote').value.replace(/"/g, '""').replace(/\n/g, " ");

            if (activeOutSec === null && activeInSec !== null && video.currentTime > activeInSec) {
                activeOutSec = video.currentTime; tcout = formatTC(activeOutSec);
            }
            if (action === "DELTELE" && (tcout === "00:00:00:00" || tcout === tcin)) { alert("DELETE requires valid TC OUT!"); return; }
            if (action !== "DELTELE" && (tcout === "00:00:00:00" || tcout === tcin)) tcout = "";
            
            logs.push({ action, tcin, tcout, script, note, inSec: (activeInSec !== null ? activeInSec : video.currentTime), outSec: (tcout !== "") ? parseTC(tcout) : null });
            
            renderTable(); drawMarkers(); saveSession();

            document.getElementById('inputScript').value = ""; document.getElementById('inputNote').value = "";
            activeInSec = null; activeOutSec = null;
            boxIn.classList.remove('active'); boxOut.classList.remove('active');
            updateActiveRange(); 
            valTcIn.innerText = tcout !== "" ? tcout : valTcIn.innerText; valTcOut.innerText = "00:00:00:00";
            document.activeElement.blur(); 
        }

        window.inlineUpdate = function(index, field, element) {
            logs[index][field] = element.innerText.trim();
            if(field === 'tcin') { logs[index].inSec = parseTC(logs[index].tcin); drawMarkers(); }
            if(field === 'tcout') { logs[index].outSec = parseTC(logs[index].tcout); drawMarkers(); }
            saveSession();
        };

        window.toggleAction = function(index) {
            let currentIdx = actionList.indexOf(logs[index].action);
            logs[index].action = actionList[(currentIdx + 1) % actionList.length];
            renderTable(); drawMarkers(); saveSession();
        };

        window.jumpToTC = function(index, field) { let sec = parseTC(logs[index][field]); if(sec > 0) video.currentTime = sec; };

        window.playDeleteLeadIn = function(index) {
            const log = logs[index];
            if (!log || log.action !== "DELTELE") return;

            const startSec = Number.isFinite(log.inSec) ? log.inSec : parseTC(log.tcin);
            if (!Number.isFinite(startSec)) return;

            video.currentTime = Math.max(0, startSec - 3);
            video.play();
        };

        function escapeHtml(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function renderTable() {
            const tbody = document.getElementById('logBody'); tbody.innerHTML = "";
            logs.forEach((log, index) => {
                const colorSet = actionColors[log.action] || actionColors["OTHERS"];
                const bg = colorSet.bg, txt = colorSet.color;
                const action = escapeHtml(log.action);
                const tcin = escapeHtml(log.tcin);
                const tcout = escapeHtml(log.tcout);
                const script = escapeHtml(log.script);
                const note = escapeHtml(log.note);
                const playButton = log.action === "DELTELE"
                    ? `<button class="btn-play-delete" onclick="playDeleteLeadIn(${index})" title="Play từ 3 giây trước TC IN">PLAY</button>`
                    : "";
                tbody.innerHTML += `
                    <tr>
                        <td class="td-action" onclick="toggleAction(${index})" title="Click to swap Action">
                            <span class="action-tag" style="background:${bg}; color:${txt}">${action}</span>
                        </td>
                        <td class="td-tc" contenteditable="true" onfocus="jumpToTC(${index}, 'tcin')" onblur="inlineUpdate(${index}, 'tcin', this)" title="${tcin}">${tcin}</td>
                        <td class="td-tc" contenteditable="true" onfocus="jumpToTC(${index}, 'tcout')" onblur="inlineUpdate(${index}, 'tcout', this)" title="${tcout}">${tcout}</td>
                        <td class="td-text" contenteditable="true" onblur="inlineUpdate(${index}, 'script', this)" title="${script}">${script}</td>
                        <td class="td-text" contenteditable="true" onblur="inlineUpdate(${index}, 'note', this)" title="${note}">${note}</td>
                        <td class="td-delete"><span class="row-tools">${playButton}<button class="btn-delete" onclick="deleteLog(${index})">DEL</button></span></td>
                    </tr>
                `;
            });
            document.getElementById('logCount').innerText = logs.length;
            document.querySelector('.table-wrap').scrollTop = document.querySelector('.table-wrap').scrollHeight; 
        }

        window.deleteLog = function(index) { logs.splice(index, 1); renderTable(); drawMarkers(); saveSession(); }

        document.getElementById('btnExport').addEventListener('click', () => {
            if (logs.length === 0) { alert("Empty log list!"); return; }
            let csvContent = "\uFEFFPROJECT INFO: Autoscript TCP\nEXPORT DATE: " + new Date().toLocaleDateString() + "\n\nSECTION,ACTION,TC IN,TC OUT,SCRIPT,NOTE\n";
            logs.forEach(log => csvContent += `"",${log.action},${log.tcin},${log.tcout},"${log.script}","${log.note}"\n`);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
            link.download = `Autoscript_TCP_${new Date().getTime()}.csv`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        });
// --- NEW PROJECT (CLEAR SESSION) ---
        document.getElementById('btnNewProject').addEventListener('click', () => {
            if (logs.length > 0) {
                if (!confirm("⚠️ CẢNH BÁO: Bắt đầu Project mới sẽ XÓA SẠCH kịch bản hiện tại. Bạn đã Export CSV chưa?")) return;
            }
            
            // Xóa Data
            logs = [];
            saveSession();
            renderTable();
            drawMarkers();
            
            // Reset UI
            video.src = "";
            document.getElementById('uploadText').innerText = "Click or press '" + formatShortcutDisplay(shortcuts.video) + "' to upload a video file";
            activeInSec = null; activeOutSec = null;
            valTcIn.innerText = "00:00:00:00"; valTcOut.innerText = "00:00:00:00";
            bigTc.innerText = "00:00:00:00";
            document.getElementById('timelineProgress').style.width = "0%";
            boxIn.classList.remove('active'); boxOut.classList.remove('active');
            updateActiveRange();
        });
        // INITIALIZATION
        renderSettings(); renderTable(); setTimeout(drawMarkers, 500);
