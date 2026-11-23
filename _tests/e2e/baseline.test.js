// Baseline end-to-end tests for "direct editing" (➕/✏️ forms → pull requests via the GitHub API), against the fake
// GitHub. They prove the test infrastructure; conflict scenarios build on the same helpers.
// Run: _scripts/test_e2e.sh  (or `node --test _tests/e2e/` after `bundle exec jekyll build`)
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startEnv, editPage, jpegSize, ROOT } = require("./lib/helpers.js");
const { diffLines } = require("./lib/text-diff.js");

let env;
before(async () => { env = await startEnv(); });
after(async () => { if (env) await env.close(); });
beforeEach(() => env.reset());
afterEach(async (t) => {
  // print the browser console of failed tests – the easiest way to see what the page did
  if (t.passed === false || process.env.E2E_LOGS) for (const l of env.logs()) console.log("    " + l);
  await env.closePeople();
});

const POST = () => editPage("beitrag");
const apiCalls = (method, re) => env.control.requests().filter((r) => r.method === method && re.test(r.path));

test("➕ neuer Beitrag → ein Pull Request mit genau der neuen Datei", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E neuer Beitrag", text: "Hallo aus dem Test.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);

  const { pulls, branches } = env.control.state();
  assert.equal(pulls.length, 1);
  const pr = pulls[0];
  assert.equal(pr.login, "alice");
  assert.equal(pr.base.ref, "main");
  assert.match(pr.head.ref, /^web\/alice-\d{4}-\d{2}-\d{2}-e2e-neuer-beitrag-\d{14}-[a-z0-9]{1,4}$/);
  assert.match(pr.title, /^Neu: Beitrag „E2E neuer Beitrag“$/);
  assert.equal(pr.files.length, 1);
  assert.equal(pr.files[0].status, "added");
  assert.match(pr.files[0].filename, /^_posts\/\d{4}-\d{2}-\d{2}-e2e-neuer-beitrag\.md$/);
  const file = env.control.readFile({ ref: pr.head.ref, path: pr.files[0].filename });
  assert.match(file.text, /^---\n[\s\S]*title: "?E2E neuer Beitrag"?\n[\s\S]*---\n[\s\S]*Hallo aus dem Test\./);
  assert.equal(env.control.readFile({ path: pr.files[0].filename }), null, "main bleibt unverändert");
  assert.ok(branches[pr.head.ref]);
});

test("✏️ bestehenden Beitrag ändern → PR enthält nur die geänderte Zeile", async () => {
  const page = POST();
  env.seedSource([page.path]);
  const original = fs.readFileSync(path.join(ROOT, page.path), "utf8");
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  assert.equal(await alice.notice(), null, "ohne offene PRs keine Warnung");
  await alice.fill({ title: "E2E geänderter Titel" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);

  const pr = env.control.state().pulls[0];
  assert.deepEqual(pr.files.map((f) => [f.filename, f.status]), [[page.path, "modified"]]);
  const changed = env.control.readFile({ ref: pr.head.ref, path: page.path }).text;
  const d = diffLines(original, changed);
  assert.equal(d.removed.length, 1, "genau eine Zeile entfernt:\n" + d.patch);
  assert.equal(d.added.length, 1, "genau eine Zeile hinzugefügt:\n" + d.patch);
  assert.match(d.removed[0], /^title:/);
  assert.match(d.added[0], /^title: "?E2E geänderter Titel"?$/);
  assert.equal(env.control.readFile({ path: page.path }).text, original, "main bleibt unverändert");
});

test("📷 Foto für Galerie und Social-Media-Vorschau → NN.jpg, NN-600w.jpg, NN-social.jpg", async () => {
  const png = env.makePng("foto.png", { width: 1800, height: 1200 });
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E Fotobeitrag", text: "Mit Foto.\n" });
  await alice.addPhotos([png], ["Ein orangefarbenes Testbild mit weißem Streifen"]);
  await alice.page.waitForSelector('#neu-dialog [data-photo="0"]');

  await alice.toggleUse(0, "gallery");
  await alice.page.waitFor(() => /01\.jpg\)\n\{: \.gallery\}/.test(document.querySelector('#neu-dialog [name="text"]').value));
  await alice.toggleUse(0, "social"); // opens the editor again with a fixed 1200×630 crop, no alt text
  await alice.acceptPhoto(null);
  await alice.page.waitFor(() => /-social\.jpg$/.test(document.querySelector('#neu-dialog [name="social_media_preview_image"]').value));

  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });
  const pr = env.control.state().pulls[0];
  const post = pr.files.find((f) => f.filename.startsWith("_posts/")).filename;
  const slug = post.replace(/^_posts\/\d{4}-\d{2}-\d{2}-|\.md$/g, "");
  const dir = "assets/images/news/" + slug + "/";
  assert.deepEqual(pr.files.map((f) => f.filename).sort(), [post, dir + "01-600w.jpg", dir + "01-social.jpg", dir + "01.jpg"].sort());
  assert.ok(pr.files.every((f) => f.status === "added"));

  const size = (p) => jpegSize(Buffer.from(env.control.readFile({ ref: pr.head.ref, path: p }).base64, "base64"));
  assert.deepEqual(size(dir + "01.jpg"), { width: 1600, height: 1067 });
  assert.equal(size(dir + "01-600w.jpg").width, 600);
  assert.deepEqual(size(dir + "01-social.jpg"), { width: 1200, height: 630 });

  const text = env.control.readFile({ ref: pr.head.ref, path: post }).text;
  assert.ok(text.includes("![Ein orangefarbenes Testbild mit weißem Streifen](/" + dir + "01.jpg)\n{: .gallery}"), text);
  assert.match(text, new RegExp("social_media_preview_image: \"?/" + dir.replace(/[.]/g, "\\.") + "01-social\\.jpg\"?"));
  // blobs went up as base64, the Markdown file as utf-8
  const blobs = apiCalls("POST", /\/git\/blobs$/).map((r) => r.body.encoding).sort();
  assert.deepEqual(blobs, ["base64", "base64", "base64", "utf-8"]);
});

test("offener PR von Bob → Warnung im Formular, „In #N weiterarbeiten“ ergänzt Bobs Branch", async () => {
  const page = POST();
  env.seedSource([page.path]);
  const original = fs.readFileSync(path.join(ROOT, page.path), "utf8");
  const bobBranch = "web/bob-e2e-aenderung";
  const bobSha = env.control.commit({ branch: bobBranch, files: { [page.path]: original + "\nZusatz von Bob.\n" }, login: "bob", message: "Bob ergänzt" }).sha;
  env.control.openPull({ head: bobBranch, title: "Bobs Änderung", login: "bob" });

  const alice = await env.person("token-alice");
  await alice.open(page.url);
  // the page itself warns connected people (edit-buttons.html)
  await alice.page.waitForSelector(".edit-pr-warning");
  assert.match(await alice.page.text(".edit-pr-warning"), /#1 Bobs Änderung von @bob/);

  await alice.openEdit();
  await alice.page.waitForSelector("#neu-dialog .form-pr-notice");
  assert.match(await alice.notice(), /Diese Seite wird gerade schon geändert:.*#1 Bobs Änderung von @bob/s);
  await alice.page.click("#neu-dialog [data-pr-continue]");
  await alice.waitStatus("Stand aus #1 geladen.");
  assert.match(await alice.value("text"), /Zusatz von Bob\./, "Formular zeigt Bobs Stand");
  assert.equal(await alice.page.text("#neu-dialog [data-submit]"), "🚀 In #1 speichern");

  await alice.fill({ title: "E2E Titel von Alice" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);

  const { pulls, branches } = env.control.state();
  assert.equal(pulls.length, 1, "kein zweiter Pull Request");
  assert.equal(pulls[0].commits, 2);
  const [head] = env.control.log({ ref: bobBranch, limit: 1 });
  assert.equal(head.login, "alice");
  assert.deepEqual(head.parents, [bobSha], "Commit sitzt auf Bobs Commit");
  const text = env.control.readFile({ ref: bobBranch, path: page.path }).text;
  assert.match(text, /Zusatz von Bob\./);
  assert.match(text, /^title: "?E2E Titel von Alice"?$/m);
  assert.equal(Object.keys(branches).filter((b) => b.startsWith("web/alice")).length, 0, "kein eigener Branch für Alice");
  assert.equal(apiCalls("PATCH", /\/git\/refs\/heads\/web\/bob-e2e-aenderung$/).length, 1);
  assert.equal(apiCalls("POST", /\/pulls$/).length, 0);
});

test("doppelt senden: während des Sendens und danach entsteht kein zweiter PR („Schon gesendet“)", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E doppelt", text: "Zweimal geklickt.\n" });
  // slow down the branch creation so the second click lands while the first one is still running
  env.control.fail({ method: "POST", path: "/git/refs$", delayMs: 600 });
  await alice.page.evaluate(() => { const b = document.querySelector("#neu-dialog [data-submit]"); b.click(); b.click(); });
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  await alice.submit();
  await alice.waitStatus(/^Schon gesendet: Pull Request #1\.$/);
  assert.equal(env.control.state().pulls.length, 1);
  assert.equal(apiCalls("POST", /\/pulls$/).length, 1);
  assert.equal(apiCalls("POST", /\/git\/refs$/).length, 1);
});

test("ohne Token: alter Weg (Kopieren → GitHub-Editor), keine einzige Anfrage an die API", async () => {
  const page = POST();
  const anon = await env.person(null);
  await anon.openNew("/news/", "beitrag");
  assert.equal(await anon.page.text("#neu-dialog [data-submit]"), "📋 Auf GitHub anlegen");
  await anon.fill({ title: "E2E ohne Token" });
  await anon.submit();
  await anon.waitStatus(/Kopiert|kopieren/);
  let opened = await anon.page.evaluate(() => window.__opened);
  assert.equal(opened.length, 1);
  assert.match(opened[0], /^https:\/\/github\.com\/falkorichter\/ifsmb\.de\/new\/main\/_posts\?filename=\d{4}-\d{2}-\d{2}-e2e-ohne-token\.md&value=/);

  await anon.openEdit(page.url);
  assert.equal(await anon.page.text("#neu-dialog [data-submit]"), "📋 Auf GitHub speichern");
  await anon.fill({ title: "E2E ohne Token geändert" });
  await anon.submit();
  await anon.waitStatus(/Kopiert|kopieren/);
  opened = await anon.page.evaluate(() => window.__opened);
  assert.equal(opened[0], "https://github.com/falkorichter/ifsmb.de/edit/main/" + page.path);
  assert.equal(await anon.page.evaluate(() => typeof window.GitHubApi === "undefined" || !window.GitHubApi.connected()), true);
  assert.deepEqual(env.control.requests(), [], "keine Anfrage an die (Fake-)API");
});
