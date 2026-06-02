import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceFile = path.join(projectRoot, "ScriptAutomation_v1.html");
const publicDir = path.join(projectRoot, "public");
const targetFile = path.join(publicDir, "index.html");

async function readRelative(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function buildPublicIndex() {
  const [html, css, timecodeJs, appJs] = await Promise.all([
    readRelative("ScriptAutomation_v1.html"),
    readRelative("src/styles.css"),
    readRelative("src/js/timecode.js"),
    readRelative("src/js/app.js"),
  ]);

  const builtHtml = html
    .replace('<link rel="stylesheet" href="src/styles.css">', `<style>\n${css}</style>`)
    .replace(
      '<script src="src/js/timecode.js"></script>\n    <script src="src/js/app.js"></script>',
      `<script>\n${timecodeJs}\n${appJs}</script>`
    );

  await mkdir(publicDir, { recursive: true });
  await writeFile(targetFile, builtHtml, "utf8");

  console.log("[Autoscript] Đã build public/index.html từ source tách module.");
}

buildPublicIndex().catch((error) => {
  console.error("[Autoscript] Lỗi: Không build được public/index.html.");
  console.error(error);
  process.exit(1);
});
