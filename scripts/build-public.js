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

// â”€â”€ Build /app (main webapp â€” from src/app.html) â”€â”€
async function buildAppPage() {
  const html = await readRelative("src/app.html");
  await writeFile(path.join(publicDir, "app.html"), html, "utf8");
  console.log("[Autoscript] âœ“ Built public/app.html (main webapp)");
}

// â”€â”€ Build /login â”€â”€
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
  console.log("[Autoscript] âœ“ Built public/login.html");
}

// â”€â”€ Build /project â”€â”€
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
  console.log("[Autoscript] âœ“ Built public/project.html");
}

// â”€â”€ Build /setting â”€â”€
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
  console.log("[Autoscript] âœ“ Built public/setting.html");
}

// â”€â”€ Build / (redirect to /login) â”€â”€
async function buildRedirectIndex() {
  const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=login.html">
    <title>Autoscript TCP â€” Redirecting...</title>
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
  console.log("[Autoscript] âœ“ Built public/index.html (redirect â†’ login)");
}

// â”€â”€ Main Build â”€â”€
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

