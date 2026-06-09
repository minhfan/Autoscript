const fs = require('fs');
let html = fs.readFileSync('src/app.html', 'utf8');

// Remove project CSS links
html = html.replace(/\s*<link rel="stylesheet" href="\/tcpscript\/assets\/app\/styles\/.*?">/g, '');

// Insert INJECT_STYLES before closing </head>
html = html.replace('</head>', '    <!-- INJECT_STYLES -->\n</head>');

// Remove inline scripts and project JS links
// Wait, the instructions say "Xóa bỏ toàn bộ các đoạn code nội tuyến <style>...</style> và <script>...</script>"
html = html.replace(/\s*<script src="\/tcpscript\/assets\/app\/js\/.*?<\/script>/g, '');

// Insert INJECT_SCRIPTS before closing </body>
html = html.replace('</body>', '    <!-- INJECT_SCRIPTS -->\n</body>');

// Ensure directory exists
if (!fs.existsSync('src/app')) {
    fs.mkdirSync('src/app', { recursive: true });
}

fs.writeFileSync('src/app/template.html', html);
console.log('Template created at src/app/template.html');
