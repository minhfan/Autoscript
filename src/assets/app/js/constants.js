// ============================================================
//  AUTOSCRIPT TCP Pro — constants.js
//  Shared constants: action definitions, colors, storage keys.
//  No dependencies. Must be loaded first.
// ============================================================

// ── Action Types & Colors ────────────────────────────────────
const actionList = ['DELETE','SWAP','POP-UP','QUESTION','QUOTE','NOTE','OTHERS'];

const actionColors = {
    'DELETE' : { bg:'#b91c1c', color:'#ffffff' },
    'SWAP'    : { bg:'#ea580c', color:'#ffffff' },
    'POP-UP'  : { bg:'#166534', color:'#ffffff' },
    'QUESTION': { bg:'#1d4ed8', color:'#ffffff' },
    'QUOTE'   : { bg:'#a855f7', color:'#ffffff' },
    'NOTE'    : { bg:'#3f3f46', color:'#f8fafc' },
    'OTHERS'  : { bg:'#1e293b', color:'#e2e8f0' }
};

// ── Storage Keys ─────────────────────────────────────────────
const LEGACY_LOG_STORAGE_KEY = 'autoscript_tcp_v9';
const PROJECT_VIDEO_META_CACHE_KEY = 'autoscript_project_video_meta_cache_v1';
const SHORTCUT_STORAGE_KEY = 'autoscript_shortcuts';

// ── External Resources ───────────────────────────────────────
const TEMPLATE_SPREADSHEET_ID = "1S6YxzKJE7X5vZRZduA36KDc_E00Cdkxp2mD3VXhwfmA";
