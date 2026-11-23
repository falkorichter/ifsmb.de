// Themes (_data/themes.yml, assets/css/themes.css, assets/js/theme.js): the footer picker and ?theme=… set
// html[data-theme], the choice stays in localStorage["ifsmb-theme"] across reloads and pages, "Wie die Seite" removes it.
// Run: _scripts/test_e2e.sh --test-name-pattern="Theme"
"use strict";
const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(async () => { if (env) await env.close(); });
afterEach(async (t) => {
  if (t.passed === false || process.env.E2E_LOGS) for (const l of env.logs()) console.log("    " + l);
  await env.closePeople();
});

const state = (page) => page.evaluate(() => {
  let stored = null;
  try { stored = localStorage.getItem("ifsmb-theme"); } catch (e) { stored = "(blocked)"; }
  const picker = document.querySelector("[data-theme-picker]");
  return {
    theme: document.documentElement.getAttribute("data-theme"),
    pageTheme: document.documentElement.getAttribute("data-page-theme"),
    stored,
    pickerVisible: !!picker && !picker.hidden,
    pickerValue: picker ? picker.querySelector("select").value : null,
    font: getComputedStyle(document.body).fontFamily
  };
});
const choose = (page, id) => page.fill("#theme-select", id);

test("Theme: ohne Wahl gilt das Standard-Theme, die Auswahl im Footer ist da", async () => {
  const p = await env.person(null);
  await p.open("/");
  const s = await state(p.page);
  assert.equal(s.theme, "ifsmb");
  assert.equal(s.pageTheme, "ifsmb");
  assert.equal(s.stored, null);
  assert.ok(s.pickerVisible, "Auswahl sichtbar");
  assert.equal(s.pickerValue, "");
  assert.doesNotMatch(s.font, /Lexend|Carlito/);
});

test("Theme: Auswahl setzt data-theme und bleibt nach dem Neuladen und auf anderen Seiten", async () => {
  const p = await env.person(null);
  await p.open("/");
  await choose(p.page, "rfflabs");
  let s = await state(p.page);
  assert.equal(s.theme, "rfflabs");
  assert.equal(s.stored, "rfflabs");
  assert.match(s.font, /Lexend/);

  await p.open("/");
  s = await state(p.page);
  assert.equal(s.theme, "rfflabs", "nach dem Neuladen");
  assert.equal(s.pickerValue, "rfflabs");

  await p.open("/impressum/");
  s = await state(p.page);
  assert.equal(s.theme, "rfflabs", "auf einer anderen Seite");
  assert.equal(s.pageTheme, "ifsmb");

  await choose(p.page, "offene-werkstaetten");
  s = await state(p.page);
  assert.equal(s.theme, "offene-werkstaetten");
  assert.match(s.font, /Carlito/);

  // "Wie die Seite" forgets the choice
  await choose(p.page, "");
  s = await state(p.page);
  assert.equal(s.theme, "ifsmb");
  assert.equal(s.stored, null);
  await p.open("/impressum/");
  assert.equal((await state(p.page)).theme, "ifsmb");
});

test("Theme: ?theme=… wählt ein Theme, ?theme=auto vergisst es, Unbekanntes wird ignoriert", async () => {
  const p = await env.person(null);
  await p.open("/news/?theme=offene-werkstaetten");
  let s = await state(p.page);
  assert.equal(s.theme, "offene-werkstaetten");
  assert.equal(s.stored, "offene-werkstaetten");
  assert.equal(s.pickerValue, "offene-werkstaetten");

  await p.open("/calendar/");
  assert.equal((await state(p.page)).theme, "offene-werkstaetten", "Wahl gilt weiter ohne Parameter");

  await p.open("/calendar/?theme=gibt-es-nicht");
  s = await state(p.page);
  assert.equal(s.theme, "offene-werkstaetten", "unbekannter Wert ändert nichts");
  assert.equal(s.stored, "offene-werkstaetten");

  await p.open("/calendar/?theme=auto");
  s = await state(p.page);
  assert.equal(s.theme, "ifsmb");
  assert.equal(s.stored, null);
});

test("Theme: das Theme steht schon vor dem ersten Zeichnen fest (Skript im <head>)", async () => {
  const p = await env.person(null);
  await p.open("/");
  await choose(p.page, "rfflabs");
  // record data-theme as soon as <body> exists – before any deferred script or paint
  await p.page.addInitScript(
    "new MutationObserver(function (m, o) { if (document.body) { window.__themeAtBody = document.documentElement.getAttribute('data-theme'); o.disconnect(); } })" +
    ".observe(document, { childList: true, subtree: true });"
  );
  await p.open("/projects/");
  assert.equal(await p.page.evaluate(() => window.__themeAtBody), "rfflabs");
});
