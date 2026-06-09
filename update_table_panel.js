const fs = require('fs');
let html = fs.readFileSync('src/app/components/table-panel.html', 'utf8');

// Insert Tabs right after the .table-header
const tabsHTML = `
            <div class="right-panel-tabs" style="display: flex; gap: 10px; padding: 0 12px; margin-bottom: 10px;">
                <button id="tabLogs" class="sheet-tab active" style="font-weight: bold;">Action Logs</button>
                <button id="tabTranscript" class="sheet-tab" style="font-weight: bold;">Transcript</button>
            </div>
            
            <div id="logsContainer" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
`;

html = html.replace('</div>\n            <div class="action-btns"', '</div>\n' + tabsHTML + '            <div class="action-btns"');

const transcriptHTML = `
            </div>
            
            <div id="transcriptContainer" style="display: none; flex-direction: column; flex: 1; overflow: hidden; padding: 0 12px;">
                <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
                    <label class="btn-action btn-import" style="cursor: pointer; margin: 0;">
                        <input type="file" id="importSrt" accept=".srt" style="display: none;">
                        Import SRT
                    </label>
                    <input type="text" id="searchTranscript" placeholder="Search subtitles..." style="background: var(--bg-input); border: 1px solid var(--border-bright); border-radius: var(--r-sm); color: var(--text-main); font-size: 12px; padding: 6px 10px; width: 100%; max-width: 300px; outline: none; font-family: 'Outfit', sans-serif;">
                </div>
                <div id="transcriptList" style="flex: 1; overflow-y: auto; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px;">
                    <!-- Transcript items injected here -->
                </div>
            </div>
`;

// Wrap table-wrap with logsContainer end and add transcriptContainer before sheet-tabs-container
html = html.replace('</div>\n            <div style="margin-top: 12px; margin-bottom: 10px; margin-left: 12px; margin-right: 12px;">', transcriptHTML + '\n            <div style="margin-top: 12px; margin-bottom: 10px; margin-left: 12px; margin-right: 12px;">');

fs.writeFileSync('src/app/components/table-panel.html', html);
console.log('Updated table-panel.html');
