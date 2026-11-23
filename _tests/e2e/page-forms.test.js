// #154: plain pages outside the collections open the ✏️ form too – Markdown pages ("seite") and HTML overview pages
// ("uebersicht", with an HTML field that is checked before saving).
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startEnv, ROOT } = require("./lib/helpers.js");
const { diffLines } = require("./lib/text-diff.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("✏️ Übersichtsseite /team/: Unterzeile ändern → nur diese Zeile, HTML bleibt", async () => {
  const file = "team/index.html", original = read(file);
  env.seedSource([file]);
  const alice = await env.person("token-alice");
  await alice.openEdit("/team/");
  assert.equal(await alice.value("title"), "Team");
  assert.match(await alice.value("text"), /\{%/, "HTML mit Liquid steht im Feld");
  await alice.fill({ lead: "E2E neue Unterzeile" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);

  const pr = env.control.state().pulls[0];
  assert.deepEqual(pr.files.map((f) => [f.filename, f.status]), [[file, "modified"]]);
  const d = diffLines(original, env.control.readFile({ ref: pr.head.ref, path: file }).text);
  assert.equal(d.removed.length, 1, d.patch);
  assert.match(d.removed[0], /^lead:/);
  assert.deepEqual(d.added, ["lead: E2E neue Unterzeile"]);
});

test("✏️ Übersichtsseite: kaputtes HTML wird nicht gespeichert, Meldung nennt die Zeile", async () => {
  env.seedSource(["team/index.html"]);
  const alice = await env.person("token-alice");
  await alice.openEdit("/team/");
  await alice.fill({ text: "<section>\n<div class=\"grid\">\n</section>" });
  await alice.submit();
  await alice.waitStatus(/<\/section>.*Zeile 3.*<div>.*Zeile 2/);
  assert.equal(env.control.state().pulls.length, 0, "kein Pull Request");
  await alice.fill({ text: "{% for p in site.team %}\n<p>{{ p.title }}</p>" });
  await alice.submit();
  await alice.waitStatus(/\{% for %\}.*Zeile 1.*endfor/);
  assert.equal(env.control.state().pulls.length, 0, "kein Pull Request");
});

test("✏️ Markdown-Seite /partners/rfflabs/: Formular „Seite“ mit Text", async () => {
  const file = "partners/rfflabs/index.md", original = read(file);
  env.seedSource([file]);
  const alice = await env.person("token-alice");
  await alice.openEdit("/partners/rfflabs/");
  assert.equal(await alice.value("title"), "RFFLabs");
  assert.equal(await alice.value("theme"), "rfflabs");
  await alice.fill({ title: "RFFLabs (E2E)" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  const pr = env.control.state().pulls[0];
  const d = diffLines(original, env.control.readFile({ ref: pr.head.ref, path: file }).text);
  assert.deepEqual(d.added, ['title: RFFLabs (E2E)'], d.patch);
});

test("✏️ Startseite: HTML von index.html ändern → Pull Request mit genau dieser Zeile", async () => {
  const file = "index.html", original = read(file);
  env.seedSource([file]);
  const alice = await env.person("token-alice");
  await alice.openEdit("/");
  const html = await alice.value("text");
  assert.match(html, /slogan/i, "HTML der Startseite im Feld");
  // change the first line of the HTML that is plain markup (no Liquid), e.g. a heading or a paragraph
  const lines = html.split("\n"), i = lines.findIndex((l) => /<(h2|p)\b[^>]*>[^<{]+</.test(l));
  assert.ok(i >= 0, "keine Zeile mit Überschrift/Absatz gefunden");
  const before = lines[i], after = before.replace(/>([^<{]+)</, ">E2E geänderter Text<");
  lines[i] = after;
  await alice.fill({ text: lines.join("\n") });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  const pr = env.control.state().pulls[0];
  assert.deepEqual(pr.files.map((f) => [f.filename, f.status]), [[file, "modified"]]);
  const d = diffLines(original, env.control.readFile({ ref: pr.head.ref, path: file }).text);
  assert.deepEqual(d.removed, [before], d.patch);
  assert.deepEqual(d.added, [after], d.patch);
});
