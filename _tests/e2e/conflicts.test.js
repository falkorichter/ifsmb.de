// Conflict scenarios from EDITING_CONFLICTS.md (K-numbers) as end-to-end tests against the fake GitHub.
// "Two people / same person editing the same file" – PRs are the backend state, conflicts are solved in the form.
// Run: _scripts/test_e2e.sh --test-name-pattern=K   (or the whole suite)
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startEnv, editPage, ROOT } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(async () => { if (env) await env.close(); });
beforeEach(() => env.reset());
afterEach(async (t) => {
  if (t.passed === false || process.env.E2E_LOGS) for (const l of env.logs()) console.log("    " + l);
  await env.closePeople();
});

const POST = () => editPage("beitrag");
const apiCalls = (method, re) => env.control.requests().filter((r) => r.method === method && re.test(r.path));
const setTitle = (text, title) => text.replace(/^title: .*$/m, 'title: "' + title + '"');
const read = (ref, p) => env.control.readFile({ ref, path: p }).text;

// a post seeded onto main + its original text
function seedPost() {
  const page = POST();
  env.seedSource([page.path]);
  return { page, original: fs.readFileSync(path.join(ROOT, page.path), "utf8") };
}
// someone else (bob) commits onto a branch (default: main)
function bobCommits(p, fn, branch = "main", message = "Bob ändert") {
  const cur = read(branch, p);
  return env.control.commit({ branch, files: { [p]: fn(cur) }, login: "bob", message }).sha;
}

test("K05 main hat sich inzwischen geändert (anderes Feld) → automatisch zusammengeführt, Commit auf neuem Stand", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  const bobSha = bobCommits(page.path, (t) => setTitle(t, "Titel von Bob"));
  await alice.fill({ text: (await alice.value("text")) + "\n\nAbsatz von Alice.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);

  const pr = env.control.state().pulls[0];
  const text = read(pr.head.ref, page.path);
  assert.match(text, /^title: "Titel von Bob"$/m, "Bobs Titel bleibt");
  assert.match(text, /Absatz von Alice\./, "Alices Text ist drin");
  const [head] = env.control.log({ ref: pr.head.ref, limit: 1 });
  assert.deepEqual(head.parents, [bobSha], "Commit sitzt auf dem neuen main");
});

test("K05 dasselbe Feld → Konfliktbox, Senden gesperrt, „Neuere Version“ übernehmen und senden", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  bobCommits(page.path, (t) => setTitle(t, "Titel von Bob"));
  await alice.fill({ title: "Titel von Alice" });
  await alice.submit();
  await alice.page.waitForSelector("#neu-dialog .form-conflicts");
  assert.match(await alice.page.text("#neu-dialog .form-conflicts h3"), /1 Konflikt/);
  assert.match(await alice.page.text("#neu-dialog .form-conflict legend"), /Titel/);
  assert.equal(await alice.page.evaluate(() => document.querySelector("#neu-dialog [data-submit]").disabled), true);
  assert.equal(env.control.state().pulls.length, 0, "noch nichts gesendet");

  await alice.page.click('#neu-dialog .form-conflicts input[value="theirs"]');
  await alice.page.click("#neu-dialog [data-conflicts-apply]");
  await alice.waitStatus(/Konflikte gelöst/);
  assert.equal(await alice.value("title"), "Titel von Bob");
  await alice.fill({ text: (await alice.value("text")) + "\n\nNach dem Konflikt.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  const text = read(env.control.state().pulls[0].head.ref, page.path);
  assert.match(text, /^title: "Titel von Bob"$/m);
  assert.match(text, /Nach dem Konflikt\./);
});

test("K04 nie still überschreiben: zweiter Klick nach Konflikt sendet nichts", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  bobCommits(page.path, (t) => setTitle(t, "Titel von Bob"));
  await alice.fill({ title: "Titel von Alice" });
  await alice.submit();
  await alice.page.waitForSelector("#neu-dialog .form-conflicts");
  await alice.page.evaluate(() => document.querySelector("#neu-dialog [data-submit]").click()); // disabled → nothing
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(env.control.state().pulls.length, 0);
  assert.equal(apiCalls("POST", /\/git\/blobs$/).length, 0, "nichts hochgeladen");
});

test("K16 eigener offener PR → Formular arbeitet automatisch dort weiter", async () => {
  const { page } = seedPost();
  const branch = "web/alice-frueher";
  env.control.commit({ branch, files: { [page.path]: setTitle(read("main", page.path), "Früherer Titel von Alice") }, login: "alice" });
  env.control.openPull({ head: branch, title: "Alices frühere Änderung", login: "alice" });
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.page.waitFor(() => /Du hast diese Seite schon in #1 geändert/.test((document.querySelector("#neu-dialog .form-pr-notice") || {}).textContent || ""));
  assert.equal(await alice.value("title"), "Früherer Titel von Alice");
  assert.equal(await alice.page.text("#neu-dialog [data-submit]"), "🚀 In #1 speichern");
  await alice.fill({ text: (await alice.value("text")) + "\n\nNachtrag.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);
  assert.equal(env.control.state().pulls.length, 1);
  assert.match(read(branch, page.path), /Nachtrag\./);
});

test("K07 „In #N mitschicken“ übernimmt, was schon eingetragen war", async () => {
  const { page } = seedPost();
  const branch = "web/bob-aenderung";
  env.control.commit({ branch, files: { [page.path]: read("main", page.path) + "\nZusatz von Bob.\n" }, login: "bob" });
  env.control.openPull({ head: branch, title: "Bobs Änderung", login: "bob" });
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.page.waitForSelector("#neu-dialog [data-pr-continue]");
  await alice.fill({ title: "Titel von Alice" }); // typed BEFORE joining Bob's PR
  await alice.page.click("#neu-dialog [data-pr-continue]");
  await alice.waitStatus(/deine Eingaben sind übernommen/);
  assert.equal(await alice.value("title"), "Titel von Alice");
  assert.match(await alice.value("text"), /Zusatz von Bob\./);
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);
  const text = read(branch, page.path);
  assert.match(text, /^title: "?Titel von Alice"?$/m);
  assert.match(text, /Zusatz von Bob\./);
});

test("K08/K09 Bob pusht in denselben PR, während Alice sendet → neu holen, mergen, nichts geht verloren", async () => {
  const { page } = seedPost();
  const branch = "web/bob-aenderung";
  env.control.commit({ branch, files: { [page.path]: read("main", page.path) + "\nZusatz von Bob.\n" }, login: "bob" });
  env.control.openPull({ head: branch, title: "Bobs Änderung", login: "bob" });
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.page.click("#neu-dialog [data-pr-continue]");
  await alice.waitStatus(/Stand aus #1 geladen/);
  await alice.fill({ title: "Titel von Alice" });
  // right before Alice's ref update, Bob pushes again (different line) → GitHub refuses: not a fast forward
  env.control.fail({ method: "PATCH", path: "/git/refs/heads/", times: 1,
    run: { op: "commit", args: { branch, files: { [page.path]: read(branch, page.path) + "Noch ein Satz von Bob.\n" }, login: "bob" } } });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/, { timeout: 20000 });
  const text = read(branch, page.path);
  assert.match(text, /^title: "?Titel von Alice"?$/m, "Alices Änderung ist drin");
  assert.match(text, /Noch ein Satz von Bob\./, "Bobs zweiter Commit ist nicht verloren");
  assert.equal(env.control.state().pulls.length, 1);
  assert.ok(apiCalls("PATCH", /\/git\/refs\/heads\//).length >= 2, "nach dem Abweisen nochmal versucht");
});

test("K17 nach dem Senden weiter ändern → weiterer Commit im selben PR, kein zweiter PR", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.fill({ title: "Erste Fassung" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  assert.equal(await alice.page.text("#neu-dialog [data-submit]"), "🚀 In #1 speichern");
  await alice.fill({ title: "Zweite Fassung" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);
  const { pulls } = env.control.state();
  assert.equal(pulls.length, 1);
  assert.equal(pulls[0].commits, 2);
  assert.match(read(pulls[0].head.ref, page.path), /^title: "?Zweite Fassung"?$/m);
});

test("K17 neue Datei: nach dem Senden weiter ändern → derselbe PR (kein „legt die Datei schon an“)", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E neu und nochmal", text: "Erste Fassung.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  await alice.fill({ text: "Zweite Fassung.\n" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);
  const pr = env.control.state().pulls[0];
  assert.equal(env.control.state().pulls.length, 1);
  assert.match(read(pr.head.ref, pr.files[0].filename), /Zweite Fassung\./);
});

test("K10 PR inzwischen gemergt → Hinweis, „Neuen Pull Request anlegen“ auf dem aktuellen Stand", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.fill({ title: "Erste Fassung" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  env.control.mergePull({ number: 1, method: "merge" });
  await alice.fill({ title: "Nach dem Merge" });
  await alice.submit();
  await alice.page.waitFor(() => /#1 ist inzwischen gemergt/.test((document.querySelector("#neu-dialog .form-pr-notice") || {}).textContent || ""));
  await alice.page.click("#neu-dialog [data-pr-new]");
  await alice.waitStatus(/neuer Pull Request auf dem aktuellen Stand/);
  await alice.submit();
  await alice.waitStatus(/Pull Request #2.*angelegt/);
  const pr2 = env.control.state().pulls.find((p) => p.number === 2);
  assert.match(read(pr2.head.ref, page.path), /^title: "?Nach dem Merge"?$/m);
  assert.equal(env.control.state().pulls.find((p) => p.number === 1).commits, 1, "in den gemergten PR wurde nichts mehr geschrieben");
});

test("K11 PR inzwischen geschlossen → Hinweis „geschlossen“, neuer PR möglich", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.fill({ title: "Erste Fassung" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  env.control.closePull({ number: 1 });
  await alice.fill({ title: "Nach dem Schließen" });
  await alice.submit();
  await alice.page.waitFor(() => /#1 wurde inzwischen geschlossen/.test((document.querySelector("#neu-dialog .form-pr-notice") || {}).textContent || ""));
  await alice.page.click("#neu-dialog [data-pr-new]");
  await alice.waitStatus(/neuer Pull Request auf dem aktuellen Stand/);
  await alice.submit();
  await alice.waitStatus(/Pull Request #2.*angelegt/);
});

test("veralteter Tab: Bob legt einen PR an, während Alice schreibt → Rückfrage statt stiller zweiter PR", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  assert.equal(await alice.notice(), null);
  const branch = "web/bob-spaeter";
  env.control.commit({ branch, files: { [page.path]: read("main", page.path) + "\nBob war schneller.\n" }, login: "bob" });
  env.control.openPull({ head: branch, title: "Bob war schneller", login: "bob" });
  await alice.fill({ title: "Titel von Alice" });
  await alice.submit();
  await alice.page.waitFor(() => /Während du geschrieben hast/.test((document.querySelector("#neu-dialog .form-pr-notice") || {}).textContent || ""));
  assert.equal(env.control.state().pulls.length, 1, "noch kein zweiter PR");
  await alice.page.click("#neu-dialog [data-pr-continue]"); // send along in Bob's PR
  await alice.waitStatus(/deine Eingaben sind übernommen/);
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt/);
  const text = read(branch, page.path);
  assert.match(text, /Bob war schneller\./);
  assert.match(text, /^title: "?Titel von Alice"?$/m);
});

test("veralteter Tab: „Trotzdem eigener Pull Request“ → zweiter PR nur mit Alices Änderung", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  const branch = "web/bob-spaeter";
  env.control.commit({ branch, files: { [page.path]: read("main", page.path) + "\nBob war schneller.\n" }, login: "bob" });
  env.control.openPull({ head: branch, title: "Bob war schneller", login: "bob" });
  await alice.fill({ title: "Titel von Alice" });
  await alice.submit();
  await alice.page.waitForSelector("#neu-dialog [data-pr-own]");
  await alice.page.click("#neu-dialog [data-pr-own]");
  await alice.submit();
  await alice.waitStatus(/Pull Request #2.*angelegt/);
  const text = read(env.control.state().pulls.find((p) => p.number === 2).head.ref, page.path);
  assert.match(text, /^title: "?Titel von Alice"?$/m);
  assert.doesNotMatch(text, /Bob war schneller/);
});

test("K14 Entwurf ist älter als die Seite → nicht gelöscht, sondern übertragen", async () => {
  const { page } = seedPost();
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.fill({ text: (await alice.value("text")) + "\n\nAus dem Entwurf.\n" });
  // pretend the draft was made on an older version of the file (someone changed the title since)
  await alice.page.evaluate((p) => {
    const k = "ifsmb-edit:" + p, d = JSON.parse(localStorage.getItem(k));
    d.source = d.source.replace(/^title: .*$/m, 'title: "Alter Titel"'); d.savedAt = Date.now() - 3600e3;
    localStorage.setItem(k, JSON.stringify(d));
    document.querySelector("#neu-dialog").close();
  }, [page.path]);
  await alice.openEdit();
  await alice.waitStatus(/Dein Entwurf vom .* wurde auf den neuen Stand der Seite übertragen/);
  assert.match(await alice.value("text"), /Aus dem Entwurf\./);
  assert.doesNotMatch(await alice.value("title"), /Alter Titel/, "der neue Titel der Seite bleibt");
});

test("K25 Fotonummer berücksichtigt Dateien in offenen PRs", async () => {
  const { page } = seedPost();
  const slug = path.basename(page.path, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const dir = "assets/images/news/" + slug + "/";
  const onMain = env.control.listFiles({ ref: "main" }).filter((f) => f.startsWith(dir)).map((f) => parseInt(path.basename(f), 10)).filter((n) => n > 0);
  const bobNr = Math.max(0, ...onMain) + 1;
  const pad = (n) => String(n).padStart(2, "0");
  env.control.commit({ branch: "web/bob-fotos", files: { [dir + pad(bobNr) + ".jpg"]: "x" }, login: "bob" });
  env.control.openPull({ head: "web/bob-fotos", title: "Bobs Foto", login: "bob" });
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);
  await alice.addPhotos([env.makePng("k25.png")], ["Testfoto für die Nummer"]);
  await alice.page.waitForSelector('#neu-dialog [data-photo="0"]');
  const name = await alice.page.text('#neu-dialog [data-photo="0"] code');
  assert.equal(name, pad(bobNr + 1) + ".jpg", "nicht dieselbe Nummer wie in Bobs PR");
});

test("K41 PR anlegen scheitert nach dem Branch → nochmal senden setzt fort, kein zweiter Branch/PR", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E unterbrochen", text: "Netz weg.\n" });
  env.control.fail({ method: "POST", path: "/pulls$", times: 1, status: 502, message: "Bad Gateway" });
  await alice.submit();
  await alice.waitStatus(/Nochmal senden setzt fort/);
  assert.equal(env.control.state().pulls.length, 0);
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  const { pulls, branches } = env.control.state();
  assert.equal(pulls.length, 1);
  assert.equal(Object.keys(branches).filter((b) => b.startsWith("web/alice")).length, 1, "nur ein Branch");
  assert.equal(apiCalls("POST", /\/git\/refs$/).length, 1);
});

test("K46 Text verweist auf ein Foto, das nicht (mehr) da ist → Senden stoppt mit Hinweis", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E totes Foto", text: "![Weg](/assets/images/news/e2e-totes-foto/01.jpg)\n{: .gallery}\n" });
  await alice.submit();
  await alice.waitStatus(/Diese Fotos stehen im Text, sind aber nicht mehr da.*01\.jpg/);
  assert.equal(env.control.state().pulls.length, 0);
  assert.equal(apiCalls("POST", /\/git\/blobs$/).length, 0);
});

test("K26 neuer Titel nach dem Foto: Foto zieht um und bekommt eine freie Nummer (nichts wird überschrieben)", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/news/", "beitrag");
  await alice.fill({ title: "E2E erster Titel", text: "Mit Foto.\n" });
  await alice.addPhotos([env.makePng("k26.png")], ["Testfoto zum Umziehen"]);
  await alice.page.waitForSelector('#neu-dialog [data-photo="0"]');
  await alice.toggleUse(0, "gallery");
  // the target folder of the new title already has a photo 01.jpg on main
  env.control.seed({ files: { "assets/images/news/e2e-zweiter-titel/01.jpg": "schon da" } });
  await alice.fill({ title: "E2E zweiter Titel" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 20000 });
  const pr = env.control.state().pulls[0];
  const names = pr.files.map((f) => f.filename).sort();
  assert.ok(names.includes("assets/images/news/e2e-zweiter-titel/02.jpg"), names.join("\n"));
  assert.ok(!names.includes("assets/images/news/e2e-zweiter-titel/01.jpg"), "fremdes 01.jpg nicht überschrieben");
  const post = names.find((n) => n.startsWith("_posts/"));
  assert.match(read(pr.head.ref, post), /\(\/assets\/images\/news\/e2e-zweiter-titel\/02\.jpg\)/);
});
