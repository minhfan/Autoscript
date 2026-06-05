import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const publicDir = path.join(projectRoot, "public");

async function readRelative(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

// ── Build /app (main webapp) ─────────────────────────────────
// Strategy:
//   1. If src/app/template.html exists → modular build (inject CSS + JS modules)
//   2. Otherwise → copy monolith src/app.html as-is (legacy fallback)
async function buildAppPage() {
  const templatePath = path.join(projectRoot, "src/app/template.html");

  let useModular = false;
  try {
    await readFile(templatePath, "utf8");
    useModular = true;
  } catch (_) {
    // template not yet created → fallback to monolith
  }

  if (useModular) {
    await buildAppPageModular(templatePath);
  } else {
    const html = await readRelative("src/app.html");
    await writeFile(path.join(publicDir, "app.html"), html, "utf8");
    console.log("[Autoscript] ✓ Built public/app.html (monolith)");
  }
}

// CSS modules in dependency order (design-system must be first)
const CSS_MODULES = [
  "src/app/styles/design-system.css",
  "src/app/styles/layout.css",
  "src/app/styles/timeline.css",
  "src/app/styles/table.css",
  "src/app/styles/modals.css",
];

// JS modules in dependency order (constants → state → ... → init last)
const JS_MODULES = [
  "src/app/js/constants.js",
  "src/app/js/timecode.js",
  "src/app/js/state.js",
  "src/app/js/shortcuts.js",
  "src/app/js/modals.js",
  "src/app/js/api.js",
  "src/app/js/storage.js",
  "src/app/js/renderer.js",
  "src/app/js/playback.js",
  "src/app/js/timeline.js",
  "src/app/js/tabs.js",
  "src/app/js/toolbar.js",
  "src/app/js/init.js",
];

async function buildAppPageModular(templatePath) {
  const [template, ...moduleContents] = await Promise.all([
    readFile(templatePath, "utf8"),
    ...CSS_MODULES.map(p => readRelative(p)),
    ...JS_MODULES.map(p => readRelative(p)),
  ]);

  const cssContents = moduleContents.slice(0, CSS_MODULES.length);
  const jsContents  = moduleContents.slice(CSS_MODULES.length);

  const combinedCSS = cssContents.join("\n\n");
  const combinedJS  = jsContents.join("\n\n");

  let html = template
    .replace("<!-- INJECT_STYLES -->", `<style>\n${combinedCSS}\n</style>`)
    .replace("<!-- INJECT_SCRIPTS -->", `<script>\n${combinedJS}\n</script>`);

  await writeFile(path.join(publicDir, "app.html"), html, "utf8");
  console.log("[Autoscript] ✓ Built public/app.html (modular: " + CSS_MODULES.length + " CSS + " + JS_MODULES.length + " JS modules)");
}

// ── Build /login ──────────────────────────────────────────────
async function buildLoginPage() {
  const [html, css, js] = await Promise.all([
    readRelative("src/login.html"),
    readRelative("src/login.css"),
    readRelative("src/login.js"),
  ]);

  const builtHtml = html
    .replace(/<link rel="stylesheet" href="login\.css">/, `<style>\n${css}</style>`)
    .replace(/<script src="login\.js"><\/script>/, `<script>\n${js}</script>`);

  await writeFile(path.join(publicDir, "login.html"), builtHtml, "utf8");
  console.log("[Autoscript] ✓ Built public/login.html");
}

// ── Build /project ────────────────────────────────────────────
async function buildProjectPage() {
  const [html, css, js] = await Promise.all([
    readRelative("src/project.html"),
    readRelative("src/project.css"),
    readRelative("src/project.js"),
  ]);

  const builtHtml = html
    .replace(/<link rel="stylesheet" href="project\.css">/, `<style>\n${css}</style>`)
    .replace(/<script src="project\.js"><\/script>/, `<script>\n${js}</script>`);

  await writeFile(path.join(publicDir, "project.html"), builtHtml, "utf8");
  console.log("[Autoscript] ✓ Built public/project.html");
}

// ── Build /setting ────────────────────────────────────────────
async function buildSettingPage() {
  const [html, css, js] = await Promise.all([
    readRelative("src/setting.html"),
    readRelative("src/setting.css"),
    readRelative("src/setting.js"),
  ]);

  const builtHtml = html
    .replace(/<link rel="stylesheet" href="setting\.css">/, `<style>\n${css}</style>`)
    .replace(/<script src="setting\.js"><\/script>/, `<script>\n${js}</script>`);

  await writeFile(path.join(publicDir, "setting.html"), builtHtml, "utf8");
  console.log("[Autoscript] ✓ Built public/setting.html");
}

// ── Build / (redirect → /login) ───────────────────────────────
async function buildRedirectIndex() {
  const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=login.html">
    <title>Autoscript TCP — Redirecting...</title>
    <style>
        body {
            background: #09090b;
            color: #a1a1aa;
            font-family: 'Outfit', system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
    </style>
</head>
<body>
    <p>Redirecting to sign in...</p>
    <script>window.location.href = 'login.html';</script>
</body>
</html>`;

  await writeFile(path.join(publicDir, "index.html"), redirectHtml, "utf8");
  console.log("[Autoscript] ✓ Built public/index.html (redirect → login)");
}

// ── Main Build ────────────────────────────────────────────────
async function buildAll() {
  await mkdir(publicDir, { recursive: true });

  await Promise.all([
    buildAppPage(),
    buildLoginPage(),
    buildProjectPage(),
    buildSettingPage(),
    buildRedirectIndex(),
  ]);

  console.log("\n[Autoscript] Build complete! All pages ready in public/");
}

buildAll().catch((error) => {
  console.error("[Autoscript] Build failed:");
  console.error(error);
  process.exit(1);
});
