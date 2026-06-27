// ============================================================
//  AUTOSCRIPT TCP Pro — richtext.js
//  Shared rich-text helpers for SCRIPT / NOTE fields.
//  Canonical representation: minimal HTML using <b> <i> <s> <u>
//  plus "\n" for line breaks. Pure functions (no DOM) so they
//  behave identically in the browser and in unit tests.
//  Load order: after timecode.js, before renderer/toolbar/init.
// ============================================================

// ── Void & block tag tables ──────────────────────────────────
var RT_VOID_TAGS = {
    br: 1, img: 1, hr: 1, input: 1, meta: 1, link: 1, source: 1,
    area: 1, base: 1, col: 1, embed: 1, param: 1, track: 1, wbr: 1
};
var RT_BLOCK_TAGS = { div: 1, p: 1, li: 1, tr: 1 };

// ── Entity decode / escape ───────────────────────────────────
function rtDecodeEntities(str) {
    return String(str == null ? "" : str)
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0*39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

function rtEscapeText(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ── Detect formatting contributed by a single opening tag ────
//  Returns { bold, italic, strike, underline } booleans.
function rtTagFormatting(tagName, rawTag) {
    var name = tagName.toLowerCase();
    var fmt = { bold: false, italic: false, strike: false, underline: false };

    if (name === "b" || name === "strong") fmt.bold = true;
    else if (name === "i" || name === "em") fmt.italic = true;
    else if (name === "s" || name === "strike" || name === "del") fmt.strike = true;
    else if (name === "u" || name === "ins") fmt.underline = true;

    // Inline style based formatting (pasted spans / fonts / execCommand css mode)
    var styleMatch = /style\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawTag || "");
    if (styleMatch) {
        var style = (styleMatch[2] || styleMatch[3] || "").toLowerCase();
        if (/font-weight\s*:\s*(bold|bolder|[6-9]00)/.test(style)) fmt.bold = true;
        if (/font-style\s*:\s*italic/.test(style)) fmt.italic = true;
        if (/text-decoration[^;]*line-through/.test(style)) fmt.strike = true;
        if (/text-decoration[^;]*underline/.test(style)) fmt.underline = true;
    }
    return fmt;
}

// ── Parse an HTML fragment into styled text runs ─────────────
//  Output: [{ text, bold, italic, strike, underline }]
//  - <br>/<div>/<p>/... become "\n"
//  - unknown tags contribute no formatting but nest correctly
function parseHtmlToRuns(html) {
    var runs = [];
    if (html == null) return runs;
    var s = String(html);

    // Stack of formatting contributed by each currently-open tag.
    var stack = [];
    var active = { bold: 0, italic: 0, strike: 0, underline: 0 };

    function emit(text) {
        if (text === "") return;
        runs.push({
            text: text,
            bold: active.bold > 0,
            italic: active.italic > 0,
            strike: active.strike > 0,
            underline: active.underline > 0
        });
    }
    function applyDelta(fmt, dir) {
        if (fmt.bold) active.bold += dir;
        if (fmt.italic) active.italic += dir;
        if (fmt.strike) active.strike += dir;
        if (fmt.underline) active.underline += dir;
    }

    var tokenRe = /<[^>]*>|[^<]+/g;
    var m;
    while ((m = tokenRe.exec(s)) !== null) {
        var token = m[0];
        if (token.charAt(0) !== "<") {
            emit(rtDecodeEntities(token));
            continue;
        }
        // It's a tag. Identify name / open vs close.
        var tagMatch = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(token);
        if (!tagMatch) continue; // comment / doctype / malformed → ignore
        var isClose = tagMatch[1] === "/";
        var name = tagMatch[2].toLowerCase();

        if (RT_VOID_TAGS[name]) {
            if (name === "br") emit("\n");
            continue;
        }
        if (isClose) {
            if (stack.length) applyDelta(stack.pop(), -1);
            continue;
        }
        // Opening tag.
        if (RT_BLOCK_TAGS[name]) emit("\n");
        var fmt = rtTagFormatting(name, token);
        stack.push(fmt);
        applyDelta(fmt, 1);
    }
    return runs;
}

// ── Runs → canonical HTML (<b><i><s><u> order) ───────────────
function rtRunsToCanonicalHtml(runs) {
    var out = "";
    for (var i = 0; i < runs.length; i++) {
        var r = runs[i];
        var open = "";
        var close = "";
        if (r.bold) { open += "<b>"; close = "</b>" + close; }
        if (r.italic) { open += "<i>"; close = "</i>" + close; }
        if (r.strike) { open += "<s>"; close = "</s>" + close; }
        if (r.underline) { open += "<u>"; close = "</u>" + close; }
        out += open + rtEscapeText(r.text) + close;
    }
    return out;
}

// ── Public: normalize contenteditable HTML to canonical form ──
function normalizeEditorHtml(html) {
    return rtRunsToCanonicalHtml(parseHtmlToRuns(html));
}

// ── Public: canonical/raw HTML → runs for ExcelJS write ──────
function htmlToRuns(html) {
    var parsed = parseHtmlToRuns(html);
    return parsed.map(function (r) {
        return {
            text: r.text,
            bold: !!r.bold,
            italic: !!r.italic,
            strike: !!r.strike,
            underline: !!r.underline
        };
    });
}

// ── Public: ExcelJS richText array → canonical HTML (import) ──
function richTextRunsToHtml(richTextArr) {
    if (!richTextArr || !richTextArr.length) return "";
    var runs = richTextArr.map(function (run) {
        var font = run.font || {};
        return {
            text: run.text == null ? "" : String(run.text),
            bold: !!font.bold,
            italic: !!font.italic,
            strike: !!font.strike,
            underline: !!font.underline
        };
    });
    return rtRunsToCanonicalHtml(runs);
}
