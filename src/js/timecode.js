const FPS = 25;

function formatTC(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00:00:00";
    let hh = Math.floor(seconds / 3600), rem = seconds % 3600;
    let mm = Math.floor(rem / 60), ss = Math.floor(rem % 60);
    let ff = Math.floor((rem - ss) * FPS); if (ff >= FPS) ff = FPS - 1;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}
function parseTC(tcStr) {
    let p = tcStr.trim().split(':'); if(p.length !== 4) return 0;
    return parseInt(p[0])*3600 + parseInt(p[1])*60 + parseInt(p[2]) + parseInt(p[3])/FPS;
}
