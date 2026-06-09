const fs = require('fs');

const backupHtml = fs.readFileSync('src/app.backup.html', 'utf8');
const templateHtml = fs.readFileSync('src/app/template.html', 'utf8');

const backupMatch = backupHtml.match(/<div class="video-section" id="videoSection">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
// Wait, the video-section div ends right before `<div class="resizer-h" id="resizerH1"></div>`
const backupVideoSection = backupHtml.split('<div class="video-section" id="videoSection">')[1].split('<div class="resizer-h" id="resizerH1"></div>')[0];

const fullBackupSection = '<div class="video-section" id="videoSection">\n' + backupVideoSection;

const templateParts = templateHtml.split(/<div class="video-section" id="videoSection">[\s\S]*?<div class="resizer-h" id="resizerH1">/);

if (templateParts.length === 2) {
    let patchedSection = fullBackupSection;
    // Add subOverlay
    patchedSection = patchedSection.replace(
        '<video id="videoPlayer" disablePictureInPicture></video>',
        '<video id="videoPlayer" disablePictureInPicture></video>\n                        <div id="subOverlay" class="sub-overlay"\n                            style="position: absolute; bottom: 10%; width: 100%; text-align: center; color: white; text-shadow: 1px 1px 2px black; font-size: 24px; pointer-events: none;">\n                        </div>'
    );
    
    fs.writeFileSync('src/app/template.html', templateParts[0] + patchedSection + '<div class="resizer-h" id="resizerH1">' + templateParts[1], 'utf8');
    console.log('Successfully patched template.html');
} else {
    console.log('Failed to find boundaries in template.html');
}
