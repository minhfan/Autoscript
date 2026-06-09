import { readFile, writeFile } from 'fs/promises';
import { APP_HTML_COMPONENTS } from './scripts/lib/build-app-page.js';

async function mergeTemplate() {
    let html = await readFile('src/app/template.html', 'utf8');

    let allReplaced = false;
    while (!allReplaced) {
        let changed = false;
        for (const [placeholder, relativePath] of Object.entries(APP_HTML_COMPONENTS)) {
            if (html.includes(placeholder)) {
                const content = await readFile(relativePath, 'utf8');
                html = html.replace(placeholder, content);
                changed = true;
            }
        }
        allReplaced = !changed;
    }

    await writeFile('src/app/template.html', html, 'utf8');
    console.log('Successfully merged components into src/app/template.html');
}

mergeTemplate().catch(console.error);
