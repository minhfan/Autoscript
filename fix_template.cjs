const fs = require('fs');

let html = fs.readFileSync('src/app/template.html', 'utf8');

// 1. Icon Setting
html = html.replace(
    '<label id="labelAction" style="margin-bottom: 0;">ACTION (A):</label>',
    '<label id="labelAction" style="margin-bottom: 0;">ACTION (A):</label>\n                        <button id="btnActionSettings" class="tool-btn icon" title="Edit Actions" style="background: none; border: none; font-size: 14px; cursor: pointer;">⚙️</button>'
);

// 2. Sub Overlay
html = html.replace(
    '<video id="videoPlayer" disablePictureInPicture></video>',
    '<video id="videoPlayer" disablePictureInPicture></video>\n                    <div id="subOverlay" class="sub-overlay" style="position: absolute; bottom: 10%; width: 100%; text-align: center; color: white; text-shadow: 1px 1px 2px black; font-size: 24px; pointer-events: none;"></div>'
);

// 3. Right Panel (Cột phải)
const rightColStart = html.indexOf('<div class="right-col" id="tablePanel">');
const actionBtnsStart = html.indexOf('<div class="action-btns"', rightColStart);
const tableWrapEnd = html.indexOf('</div>\n        </div>', actionBtnsStart); // This is risky, let's find the closing div of table-wrap

const headerEndIndex = html.indexOf('</div>', html.indexOf('<div class="table-header"', rightColStart)) + 6;

const rightTabs = `
            <div class="right-panel-tabs" style="display: flex; gap: 10px; padding: 0 12px; margin-bottom: 10px;">
                <button id="tabLogs" class="sheet-tab active" style="font-weight: bold;">Action Logs</button>
                <button id="tabTranscript" class="sheet-tab" style="font-weight: bold;">Transcript</button>
            </div>

            <div id="logsContainer" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">`;

const transcriptContainer = `
            </div>

            <div id="transcriptContainer" style="display: none; flex-direction: column; flex: 1; overflow: hidden; padding: 0 12px;">
                <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
                    <label class="btn-action btn-import" style="cursor: pointer; margin: 0;">
                        <input type="file" id="importSrt" accept=".srt" style="display: none;">
                        Import SRT
                    </label>
                    <input type="text" id="searchTranscript" placeholder="Search subtitles..."
                        style="background: var(--bg-input); border: 1px solid var(--border-bright); border-radius: var(--r-sm); color: var(--text-main); font-size: 12px; padding: 6px 10px; width: 100%; max-width: 300px; outline: none; font-family: 'Outfit', sans-serif;">
                </div>
                <div id="transcriptList"
                    style="flex: 1; overflow-y: auto; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px;">
                    <!-- Transcript items injected here -->
                </div>`;

const beforeHeaderEnd = html.substring(0, headerEndIndex);
const afterHeaderEnd = html.substring(headerEndIndex);

const tableWrapEndIndex = afterHeaderEnd.indexOf('</table>\n            </div>') + '</table>\n            </div>'.length;

const newHtml = beforeHeaderEnd + rightTabs + afterHeaderEnd.substring(0, tableWrapEndIndex) + transcriptContainer + afterHeaderEnd.substring(tableWrapEndIndex);

fs.writeFileSync('src/app/template.html', newHtml);
console.log("Done");
