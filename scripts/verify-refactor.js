import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const sourceHtml = await readProjectFile("ScriptAutomation_v2.html");
const publicHtml = await readProjectFile("public/index.html");
const css = await readProjectFile("src/styles.css");
const timecodeJs = await readProjectFile("src/js/timecode.js");
const appJs = await readProjectFile("src/js/app.js");

assert(sourceHtml.includes('href="src/styles.css'), "HTML nguồn phải link src/styles.css.");
assert(sourceHtml.includes('src="src/js/timecode.js'), "HTML nguồn phải load src/js/timecode.js.");
assert(sourceHtml.includes('src="src/js/app.js'), "HTML nguồn phải load src/js/app.js.");
assert(!sourceHtml.includes("<style>\n        /* ============================================================"), "HTML nguồn không nên chứa CSS inline lớn.");
assert(!sourceHtml.includes("let playbackSpeed    = 1.0;"), "HTML nguồn không nên chứa app JS inline lớn.");

assert(css.includes(".video-toolbar"), "CSS tách ra phải chứa style toolbar.");
assert(timecodeJs.includes("function formatTC"), "timecode.js phải chứa formatTC.");
assert(timecodeJs.includes("function parseTC"), "timecode.js phải chứa parseTC.");
assert(appJs.includes("function renderTable"), "app.js phải chứa logic renderTable.");
assert(appJs.includes("playActionPreview = function"), "app.js phải có handler playActionPreview cho DELETE/SWAP.");
assert(appJs.includes("log.action === 'DELETE'"), "renderTable phải kiểm tra action DELETE để hiện nút PLAY.");
assert(appJs.includes("Math.max(0, startSec - 3)"), "Nút PLAY DELETE phải chạy từ TC IN trừ 3 giây.");
assert(appJs.includes("playActionPreview(${index})"), "Row DELETE phải gọi playActionPreview(index).");
assert(!sourceHtml.includes('id="inputAction"'), "ACTION không được dùng select#inputAction nữa.");
assert(sourceHtml.includes('id="actionButtonGroup"'), "ACTION phải dùng button group.");
assert(sourceHtml.includes('data-action="DELETE"'), "Action button group phải có button DELETE.");
assert(css.includes(".action-button-group"), "CSS phải có layout cho action button group.");
assert(css.includes(".action-button.active"), "CSS phải có trạng thái nổi bật cho action button đang chọn.");
assert(css.includes(".btn-play-delete"), "CSS phải có style cho nút PLAY của DELETE.");
assert(appJs.includes("function setSelectedAction"), "app.js phải có hàm setSelectedAction.");
assert(appJs.includes("function updateActionButtons"), "app.js phải cập nhật trạng thái active của action buttons.");
assert(
  appJs.includes("btnToolbarImport.addEventListener('click', saveLog);"),
  "Toolbar IMPORT phải đưa log hiện tại vào Log List giống Ctrl+S."
);
assert(
  appJs.includes("btnPlayVideo.innerHTML = '&#9658;';"),
  "Nút phát video phải đổi sang icon play khi dừng video."
);

assert(publicHtml.includes("<style>"), "public/index.html phải inline CSS để deploy độc lập.");
assert(publicHtml.includes("<script>"), "public/index.html phải inline JS để deploy độc lập.");
assert(publicHtml.includes(".video-toolbar"), "public/index.html phải chứa CSS toolbar đã build.");
assert(publicHtml.includes("function renderTable"), "public/index.html phải chứa app JS đã build.");
assert(!publicHtml.includes('id="inputAction"'), "public/index.html không được còn select#inputAction.");
assert(publicHtml.includes('id="actionButtonGroup"'), "public/index.html phải chứa action button group đã build.");
assert(!publicHtml.includes('src/styles.css'), "public/index.html không được phụ thuộc src/styles.css.");
assert(!publicHtml.includes('src/js/app.js'), "public/index.html không được phụ thuộc src/js/app.js.");

for (const script of [timecodeJs, appJs]) {
  new Function(script);
}

for (const match of publicHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
  new Function(match[1]);
}

console.log("[Autoscript] Verify refactor OK.");
