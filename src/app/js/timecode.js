// ============================================================
//  AUTOSCRIPT TCP Pro — timecode.js
//  NDF (Non-Drop Frame) Timecode format/parse utilities.
//  Depends on: constants.js (for FPS global)
//
//  KEY FIX: At non-integer FPS (29.97, 23.976, 59.94), timecode
//  must be calculated through FRAME NUMBERS, not real-time seconds.
//  NDF timecode counts frames using the nominal FPS (30, 24, 60)
//  which causes TC seconds to drift from real seconds over time.
//  Old code treated real seconds as TC seconds → ~3.6s drift/hour
//  at 29.97fps. Now we convert: seconds ↔ frames ↔ TC.
// ============================================================

let FPS = 29.97;

/**
 * Convert seconds → "HH:MM:SS:FF" NDF timecode string.
 * Path: seconds → totalFrames → HH:MM:SS:FF
 * Uses nominal FPS (Math.round) for TC second/frame boundaries,
 * matching NLE behavior (DaVinci Resolve, Premiere, etc.)
 */
function formatTC(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00:00:00";
    const nominalFPS = Math.round(FPS); // 30 for 29.97, 24 for 23.976, etc.
    const totalFrames = Math.round(seconds * FPS);
    const ff = totalFrames % nominalFPS;
    const totalSecs = Math.floor(totalFrames / nominalFPS);
    const ss = totalSecs % 60;
    const mm = Math.floor(totalSecs / 60) % 60;
    const hh = Math.floor(totalSecs / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

/**
 * Convert "HH:MM:SS:FF" NDF timecode string → seconds.
 * Path: HH:MM:SS:FF → totalFrames → seconds
 * Uses nominal FPS to reconstruct the frame count, then
 * divides by actual FPS to get real-time seconds.
 */
function parseTC(tcStr) {
    if (!tcStr || typeof tcStr !== 'string') return 0;
    
    // Normalize delimiters and support continuous digit strings
    let s = tcStr.trim().replace(/[;.,-]/g, ':');
    if (/^\d+$/.test(s)) {
        s = s.padStart(8, '0');
        if (s.length > 8) s = s.slice(-8); // Limit to 8 digits
        s = `${s.slice(0,2)}:${s.slice(2,4)}:${s.slice(4,6)}:${s.slice(6,8)}`;
    }

    const p = s.split(':');
    if (p.length !== 4) return 0;
    const vals = p.map(Number);
    if (vals.some(isNaN)) return 0;
    const nominalFPS = Math.round(FPS);
    const totalFrames = vals[0] * 3600 * nominalFPS + vals[1] * 60 * nominalFPS + vals[2] * nominalFPS + vals[3];
    return totalFrames / FPS;
}

/**
 * Format seconds as short time label (MM:SS or HH:MM:SS).
 * Used for timeline bound labels.
 */
function formatBoundTC(sec) {
    if (!sec || isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}
