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

const sourceHtml = await readProjectFile("src/app.html");
const publicHtml = await readProjectFile("public/app.html");

assert(sourceHtml.length > 0, "src/app.html phai co noi dung.");
assert(publicHtml.length > 0, "public/app.html phai co noi dung.");

assert(sourceHtml === publicHtml, "public/app.html phai khop 1:1 voi src/app.html sau build.");

assert(sourceHtml.includes("Autoscript TCP Pro"), "src/app.html phai giu title cua webapp.");
assert(sourceHtml.includes("function renderTable"), "src/app.html phai giu app logic hien tai.");
assert(sourceHtml.includes("const btnSyncSheets"), "src/app.html phai giu logic Sync Sheets.");
assert(sourceHtml.includes("const sheetsUrlInput"), "src/app.html phai giu logic sheetsUrlInput.");

for (const match of sourceHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
  const scriptContent = match[1].trim();
  if (scriptContent) {
    new Function(scriptContent);
  }
}

console.log("[Autoscript] Verify app source OK.");
