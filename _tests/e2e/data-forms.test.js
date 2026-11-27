// Forms that write pure YAML files (_data/partner/<name>.yml): after the first save the form carries on in that pull
// request – it reads the YAML file back like front matter (readSource/editedText in neu.js). Before the fix this ended
// in "Cannot read properties of undefined (reading 'w0')" right after the PR was created (#292).
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

test("➕ Partner mit Logo → PR ohne Fehler; danach geändert → zweiter Commit im selben PR, reines YAML", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/partners/", "partner");
  await alice.fill({ name: "E2E Tüftelwerkstatt", url: "https://example.org/werkstatt/", description: "Erste Beschreibung." });
  await alice.addPhotos([env.makePng("logo.png", { width: 400, height: 300 })], ["Logo der Tüftelwerkstatt"]);
  // a partner has only one use for a photo (the logo) – the form puts it there by itself
  await alice.page.waitFor(() => /\/01\.jpg$/.test(document.querySelector('#neu-dialog [name="logo"]').value));

  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });
  assert.doesNotMatch(await alice.status(), /Cannot read|undefined/);
  const pr = env.control.state().pulls[0];
  const file = pr.files.find((f) => /^_data\/partner\/.+\.yml$/.test(f.filename)).filename;
  const first = env.control.readFile({ ref: pr.head.ref, path: file }).text;
  assert.match(first, /^name: E2E Tüftelwerkstatt$/m);
  assert.match(first, /^logo: \/assets\/images\/partner\/.+\/01\.jpg$/m);
  assert.ok(!first.startsWith("---"), "reines YAML, kein Front Matter");

  // the form is now in PR mode for this file: a change goes into the same pull request
  assert.match(await alice.page.text("#neu-dialog [data-submit]"), /In #1 speichern/);
  await alice.fill({ description: "Geänderte Beschreibung." });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/, { timeout: 20000 });
  const st = env.control.state();
  assert.equal(st.pulls.length, 1, "kein zweiter PR");
  assert.equal(st.pulls[0].commits, 2);
  const second = env.control.readFile({ ref: pr.head.ref, path: file }).text;
  assert.equal(second, first.replace("description: Erste Beschreibung.", "description: Geänderte Beschreibung."), "nur die Zeile geändert");
});

test("➕ Pressebericht (reines YAML) → PR ohne Fehler; danach geändert → zweiter Commit im selben PR", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/press/", "pressebericht");
  await alice.fill({ title: "E2E Bericht über die Werkstatt", medium: "E2E Zeitung", url: "https://example.org/bericht/" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });
  assert.doesNotMatch(await alice.status(), /Cannot read|undefined/);
  const pr = env.control.state().pulls[0];
  const file = pr.files.find((f) => /^_data\/press_report\/.+\.yml$/.test(f.filename)).filename;
  const first = env.control.readFile({ ref: pr.head.ref, path: file }).text;
  assert.ok(!first.startsWith("---"), "reines YAML");
  await alice.fill({ note: "E2E Hinweis" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/, { timeout: 20000 });
  const second = env.control.readFile({ ref: pr.head.ref, path: file }).text;
  assert.equal(second, first.replace(/\n$/, "\nnote: E2E Hinweis\n"), "nur die neue Zeile dazu");
});
