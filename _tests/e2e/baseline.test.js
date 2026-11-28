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
  await alice.waitStatus(/^✅ Alles ist schon in #1 gespeichert – seitdem nichts geändert\.$/);
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

test("🔒 verschlüsselter Beitrag mit Foto → Foto wird nur als verschlüsselte .blob-Datei hochgeladen (keine .jpg)", async () => {
  const png = env.makePng("foto-secret.png", { width: 800, height: 600 });
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E Geheimer Beitrag", text: "Vertraulicher Text.\n", encrypted: true });
  await alice.page.waitForSelector("#neu-dialog [data-crypto-pw]");
  await alice.page.fill("#neu-dialog [data-crypto-pw]", "geheim-e2e-2026");

  await alice.addPhotos([png], ["Geheimes Foto der Tastatur"]);
  await alice.page.waitForSelector('#neu-dialog [data-photo="0"]');
  await alice.page.click('#neu-dialog [data-photo="0"] [data-toggle="gallery"]');
  await alice.page.waitFor(() => /01\.jpg\.blob/.test(document.querySelector("#neu-dialog .neu-vorschau").textContent));

  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });
  const pr = env.control.state().pulls[0];
  const post = pr.files.find((f) => f.filename.startsWith("_posts/")).filename;
  const slug = post.replace(/^_posts\/\d{4}-\d{2}-\d{2}-|\.md$/g, "");
  const dir = "assets/images/news/" + slug + "/";

  // Must ONLY contain the Markdown file and 01.jpg.blob – NO unencrypted .jpg, -600w.jpg, or -social.jpg!
  assert.deepEqual(pr.files.map((f) => f.filename).sort(), [post, dir + "01.jpg.blob"].sort());

  const mdContent = env.control.readFile({ ref: pr.head.ref, path: post }).text;
  assert.match(mdContent, /^encrypted: true$/m);
  assert.ok(!mdContent.includes("Vertraulicher Text"), "Klartext darf nicht im Markdown stehen");
  assert.ok(mdContent.includes('"' + "/" + dir + '01.jpg.blob"'), "Payload muss .blob-Anhang auflisten");

  const blobBytes = Buffer.from(env.control.readFile({ ref: pr.head.ref, path: dir + "01.jpg.blob" }).base64, "base64");
  assert.ok(blobBytes.length > 28, ".blob enthält 12 Byte IV + Ciphertext + Tag");
  // Must NOT start with JPEG magic bytes (FF D8 FF)
  assert.notEqual(blobBytes[0] === 0xff && blobBytes[1] === 0xd8, true, ".blob ist verschlüsselt, kein rohes JPEG");
});

test("✏️ bestehende verschlüsselte Seite mit unverschlüsselten .jpg-Fotos (wie #244 Augenarzttastatur) → konvertiert beim Speichern alle Fotos zu .blob und löscht die .jpg-Dateien", async () => {
  // Seed main with the unencrypted .jpg files of #244 so we can test the migration on edit. Stand-in bytes instead of
  // the real files: those were migrated to .blob on main (#255), and the form only encrypts the bytes it reads
  // through the API, it never decodes them.
  const dir = "assets/images/projekte/augenarzttastatur/";
  const fakeJpeg = (name) => ({ base64: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(name), Buffer.from([0xff, 0xd9])]).toString("base64") });
  const seedFiles = {};
  ["01.jpg", "01-600w.jpg", "02.jpg", "02-600w.jpg", "03.jpg", "03-600w.jpg", "04.jpg", "04-600w.jpg", "04-social.jpg"]
    .forEach((f) => { seedFiles[dir + f] = fakeJpeg(f); });
  env.control.seed({ files: seedFiles });

  // Create an encrypted payload with known password "test-augenarzt" and attachments: [] (just like #244)
  const CryptoPage = require("../../assets/js/crypto-page.js");
  const mdBody = "Geheimer Projekttext.\n\n![Bild 1](/" + dir + "01.jpg)\n![Bild 3](/" + dir + "03.jpg)\n![Bild 4](/" + dir + "04.jpg)\n{: .gallery}\n";
  const enc = await CryptoPage.encryptMarkdownPayload(mdBody, "test-augenarzt", null, false, []);
  const seededMd = `---
title: Augenarzttastatur
status: aktuell
start: 2026-01-01
period: seit 2026
event_tag: au
team: [falko-richter]
personal: true
encrypted: true
image: /${dir}02.jpg
social_media_preview_image: /${dir}04-social.jpg
uuid: 96f29aa4-3c72-4b70-95fe-5e123a482fe5
---

${enc.block}
`;
  // Write seededMd to both fake GitHub main and _site/source/_projects/augenarzttastatur.md for the test
  env.control.commit({ branch: "main", files: { "_projects/augenarzttastatur.md": seededMd }, login: "alice", message: "seed #244 state" });
  const siteSourcePath = path.join(ROOT, "_site/source/_projects/augenarzttastatur.md");
  const origSiteSource = fs.readFileSync(siteSourcePath, "utf8");
  fs.writeFileSync(siteSourcePath, seededMd);

  try {
    const alice = await env.person("token-alice");
    await alice.openEdit("/projects/augenarzttastatur/");
    // Unlock inside the ✏️ form
    await alice.page.waitForSelector("#neu-dialog [data-crypto-unlock-pw]");
    await alice.page.fill("#neu-dialog [data-crypto-unlock-pw]", "test-augenarzt");
    await alice.page.click("#neu-dialog [data-crypto-unlock-btn]");

    // Wait until unlocked and the 4 .blob attachments appear in the preview
    await alice.page.waitFor(() => /01\.jpg\.blob/.test(document.querySelector("#neu-dialog .neu-vorschau").textContent));
    await alice.page.waitFor(() => /02\.jpg\.blob/.test(document.querySelector("#neu-dialog .neu-vorschau").textContent));

    // Warning about unencrypted social_media_preview_image must be shown
    const warnText = await alice.page.text("#neu-dialog [data-crypto-social-warn]");
    assert.match(warnText, /unverschlüsselt/i);
    assert.match(warnText, /04-social\.jpg/);

    // Submit without even typing anything else!
    await alice.submit();
    await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });

    const pr = env.control.state().pulls[0];
    const added = pr.files.filter((f) => f.status === "added").map((f) => f.filename).sort();
    const removed = pr.files.filter((f) => f.status === "removed").map((f) => f.filename).sort();

    assert.deepEqual(added, [
      dir + "01.jpg.blob",
      dir + "02.jpg.blob",
      dir + "03.jpg.blob",
      dir + "04.jpg.blob"
    ]);
    // 04-social.jpg intentionally remains unencrypted for link previews; all 8 full/600w .jpg files are removed
    assert.deepEqual(removed, [
      dir + "01-600w.jpg", dir + "01.jpg",
      dir + "02-600w.jpg", dir + "02.jpg",
      dir + "03-600w.jpg", dir + "03.jpg",
      dir + "04-600w.jpg", dir + "04.jpg"
    ]);

    const updatedMd = env.control.readFile({ ref: pr.head.ref, path: "_projects/augenarzttastatur.md" }).text;
    assert.ok(!/^image:/m.test(updatedMd), "image: aus öffentlichem Front Matter entfernt");
    assert.match(updatedMd, /^social_media_preview_image: .*04-social\.jpg$/m, "social_media_preview_image bleibt im Front Matter");
    assert.ok(updatedMd.includes('"/' + dir + '01.jpg.blob"'));
    assert.ok(updatedMd.includes('"/' + dir + '02.jpg.blob"'));
    assert.ok(updatedMd.includes('"/' + dir + '03.jpg.blob"'));
    assert.ok(updatedMd.includes('"/' + dir + '04.jpg.blob"'));
  } finally {
    fs.writeFileSync(siteSourcePath, origSiteSource);
  }
});
