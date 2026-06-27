// Unit tests for src/app/js/richtext.js pure functions.
// Run: node scripts/test-richtext.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");
// richtext.js is a browser-global classic script (project is type:module), so
// load it by evaluating its source rather than require().
const src = fs.readFileSync(path.join(__dirname, "..", "src", "app", "js", "richtext.js"), "utf8");
const rt = new Function(
  src + "\nreturn { normalizeEditorHtml, htmlToRuns, richTextRunsToHtml, parseHtmlToRuns };"
)();

let pass = 0;
function t(name, fn) {
  try {
    fn();
    pass++;
    console.log("  ✓ " + name);
  } catch (err) {
    console.error("  ✗ " + name + "\n    " + err.message);
    process.exitCode = 1;
  }
}

const { normalizeEditorHtml, htmlToRuns, richTextRunsToHtml } = rt;

console.log("normalizeEditorHtml");
t("plain text unchanged", () => assert.strictEqual(normalizeEditorHtml("hello"), "hello"));
t("bold tag kept", () => assert.strictEqual(normalizeEditorHtml("<b>x</b>"), "<b>x</b>"));
t("strong -> b", () => assert.strictEqual(normalizeEditorHtml("<strong>x</strong>"), "<b>x</b>"));
t("em -> i", () => assert.strictEqual(normalizeEditorHtml("<em>x</em>"), "<i>x</i>"));
t("strike/del -> s", () => {
  assert.strictEqual(normalizeEditorHtml("<strike>x</strike>"), "<s>x</s>");
  assert.strictEqual(normalizeEditorHtml("<del>x</del>"), "<s>x</s>");
  assert.strictEqual(normalizeEditorHtml("<s>x</s>"), "<s>x</s>");
});
t("u kept", () => assert.strictEqual(normalizeEditorHtml("<u>x</u>"), "<u>x</u>"));
t("style font-weight bold -> b", () =>
  assert.strictEqual(normalizeEditorHtml('<span style="font-weight: 700">x</span>'), "<b>x</b>"));
t("style italic -> i", () =>
  assert.strictEqual(normalizeEditorHtml('<span style="font-style: italic">x</span>'), "<i>x</i>"));
t("style line-through -> s", () =>
  assert.strictEqual(normalizeEditorHtml('<span style="text-decoration: line-through">x</span>'), "<s>x</s>"));
t("style underline -> u", () =>
  assert.strictEqual(normalizeEditorHtml('<span style="text-decoration: underline">x</span>'), "<u>x</u>"));
t("unknown tag stripped, text kept", () =>
  assert.strictEqual(normalizeEditorHtml('<span class="z">hi</span>'), "hi"));
t("br -> newline", () => assert.strictEqual(normalizeEditorHtml("a<br>b"), "a\nb"));
t("div -> newline boundary", () => assert.strictEqual(normalizeEditorHtml("a<div>b</div>"), "a\nb"));
t("nested b>i ordered", () =>
  assert.strictEqual(normalizeEditorHtml("<b><i>z</i></b>"), "<b><i>z</i></b>"));
t("entities preserved/escaped", () =>
  assert.strictEqual(normalizeEditorHtml("a &amp; b"), "a &amp; b"));
t("nbsp -> space", () => assert.strictEqual(normalizeEditorHtml("a&nbsp;b"), "a b"));
t("idempotent on canonical", () => {
  const c = normalizeEditorHtml('<b>x</b><div>y<i>z</i></div>');
  assert.strictEqual(normalizeEditorHtml(c), c);
});
t("empty/null safe", () => {
  assert.strictEqual(normalizeEditorHtml(""), "");
  assert.strictEqual(normalizeEditorHtml(null), "");
  assert.strictEqual(normalizeEditorHtml(undefined), "");
});

console.log("htmlToRuns");
t("splits formatting runs", () => {
  assert.deepStrictEqual(htmlToRuns("<b>a</b>b"), [
    { text: "a", bold: true, italic: false, strike: false, underline: false },
    { text: "b", bold: false, italic: false, strike: false, underline: false },
  ]);
});
t("plain -> single run", () =>
  assert.deepStrictEqual(htmlToRuns("hi"), [
    { text: "hi", bold: false, italic: false, strike: false, underline: false },
  ]));

console.log("richTextRunsToHtml");
t("excel runs -> canonical html", () => {
  const arr = [
    { text: "a", font: { bold: true } },
    { text: "b" },
  ];
  assert.strictEqual(richTextRunsToHtml(arr), "<b>a</b>b");
});
t("underline + italic", () => {
  const arr = [{ text: "z", font: { italic: true, underline: true } }];
  assert.strictEqual(richTextRunsToHtml(arr), "<i><u>z</u></i>");
});
t("escapes special chars", () => {
  const arr = [{ text: "a < b & c" }];
  assert.strictEqual(richTextRunsToHtml(arr), "a &lt; b &amp; c");
});

console.log("\nround-trip");
t("html -> runs -> html stable", () => {
  const html = normalizeEditorHtml("<b>Bold</b> and <i>it</i>\nline2");
  const back = richTextRunsToHtml(
    htmlToRuns(html).map((r) => ({
      text: r.text,
      font: { bold: r.bold, italic: r.italic, strike: r.strike, underline: r.underline },
    }))
  );
  assert.strictEqual(back, html);
});

console.log("\n" + pass + " passed" + (process.exitCode ? " (with failures)" : ""));
