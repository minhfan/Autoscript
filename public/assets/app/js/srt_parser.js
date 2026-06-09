// ============================================================
//  AUTOSCRIPT TCP Pro — srt_parser.js
//  SRT Parser Module
// ============================================================

function parseSRT(srtText) {
    const timecodeRegex = /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/;
    const lines = srtText.replace(/\r\n/g, '\n').split('\n');
    const result = [];
    
    let currentId = null;
    let currentStart = null;
    let currentEnd = null;
    let currentText = [];
    
    function tcToSeconds(tc) {
        const [time, ms] = tc.split(',');
        const [hh, mm, ss] = time.split(':').map(Number);
        return (hh * 3600) + (mm * 60) + ss + (Number(ms) / 1000);
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
            if (currentId !== null && currentStart !== null && currentEnd !== null) {
                result.push({
                    id: currentId,
                    start: currentStart,
                    end: currentEnd,
                    text: currentText.join('\n')
                });
            }
            currentId = null;
            currentStart = null;
            currentEnd = null;
            currentText = [];
            continue;
        }
        
        if (currentId === null && !isNaN(parseInt(line, 10))) {
            currentId = parseInt(line, 10);
            continue;
        }
        
        const tcMatch = line.match(timecodeRegex);
        if (tcMatch) {
            currentStart = tcToSeconds(tcMatch[1]);
            currentEnd = tcToSeconds(tcMatch[2]);
            continue;
        }
        
        if (currentId !== null && currentStart !== null) {
            currentText.push(line);
        }
    }
    
    // push the last block if file doesn't end with newline
    if (currentId !== null && currentStart !== null && currentEnd !== null) {
        result.push({
            id: currentId,
            start: currentStart,
            end: currentEnd,
            text: currentText.join('\n')
        });
    }
    
    return result;
}
