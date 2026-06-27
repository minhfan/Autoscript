// ============================================================
//  AUTOSCRIPT TCP Pro — state.js
//  All global mutable state declarations.
//  No DOM access. No function calls.
//  Depends on: constants.js
// ============================================================

// ── Playback State ───────────────────────────────────────────
let playbackSpeed    = 1.0;
let reverseInterval  = null;

// ── Active TC Points ─────────────────────────────────────────
let activeInSec      = null;
let activeOutSec     = null;
let activeSwapSec    = null;

// ── Edit Mode ────────────────────────────────────────────────
let editingRowIndex  = null;
let menuTargetIndex  = null;

// ── Preview Cut ──────────────────────────────────────────────
let isPreviewCut     = false;
let previewState     = { active: false, logIndex: -1, phase: 0, restorePreviewCut: false };
let originalPreviewCutState = null;
let masterSwap       = null; // continuous swap substitution during master Preview-Cut
let masterSkipGuard  = null; // outSec last skipped to (prevents seek re-trigger loop)

// ── Resizing ─────────────────────────────────────────────────
let isResizingV      = false;
let isResizingH1     = false;
let isResizingH2     = false;

// ── Float Panel Drag ─────────────────────────────────────────
let isDraggingFloat  = false;
let floatOffsetX, floatOffsetY;

// ── Speed Drag ───────────────────────────────────────────────
let isDraggingSpeed  = false;
let speedStartX = 0, speedStartVal = 1.0, speedDidDrag = false;

// ── Undo / Redo History ──────────────────────────────────────
let logHistory  = [];
let redoHistory = [];

// ── Action Selection ─────────────────────────────────────────
let selectedAction = actionList[0]; // requires constants.js
let customActions = [];
let transcriptData = [];

// ── Tab / Sheet State ────────────────────────────────────────
let currentSheetTab      = 'Full-show';
let availableSheetTabs   = ['Full-show'];

// ── Project Identity ─────────────────────────────────────────
let currentSpreadsheetId   = localStorage.getItem('autoscript_current_spreadsheet_id') || '';
let currentSpreadsheetUrl  = localStorage.getItem('autoscript_current_spreadsheet_url') || '';
let currentSpreadsheetName = localStorage.getItem('autoscript_current_spreadsheet_name') || '';
let currentProjectVideoMeta = null;
let pendingVideoMeta = null;

// ── Session Auth ─────────────────────────────────────────────
let googleClientId = localStorage.getItem('autoscript_google_client_id') || '';
const sessionToken = localStorage.getItem('autoscript_session_token');
let googleSheetsUrl = localStorage.getItem('autoscript_google_sheets_url') || '';

// ── Shortcut State ───────────────────────────────────────────
let listeningAction = null;

// ── Table Filters ────────────────────────────────────────────
let searchQuery = '';
let filterQuery = 'ALL';

// ── Clipboard (last imported log → re-send to Short) ─────────
let clipboardLogData = null;

// ── TC Auto-Select (click row → populate toolbar) ────────────
let tcAutoSelected = false;
let tcJumpWait     = false;

// ── Persistence State ────────────────────────────────────────
let logs                 = [];
let projectLogsSaveTimer = null;
let isProjectLogsLoaded  = false;
let projectLogsLoadToken = 0;
let isLogsDirty          = false;

// ── In-Memory Tab Cache (instant tab switching) ───────────────
const tabLogsCache = {};
