// End-to-end tests for the overview of open work (/mitmachen/offen/, assets/js/open-work.js): open pull requests
// grouped by checks/merge state, open issues (pickable / in progress), "Übernehmen", errors, cache – against the fake
// GitHub. Run: _scripts/test_e2e.sh --no-build --test-name-pattern="Offen"
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startEnv, editPage, ROOT } = require("./lib/helpers.js");

const URL_PATH = "/mitmachen/offen/";
let env;
before(async () => { env = await startEnv(); });
after(async () => { if (env) await env.close(); });
beforeEach(() => env.reset());
afterEach(async (t) => {
  if (t.passed === false || process.env.E2E_LOGS) for (const l of env.logs()) console.log("    " + l);
  await env.closePeople();
});

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

// A few pull requests and issues in every state the page knows → { post } (the real post changed by #1)
function seedWork() {
  const post = editPage("beitrag");
  env.seedSource([post.path]);
  env.control.seed({ files: { "konflikt.txt": "a\n" } });
  const original = fs.readFileSync(path.join(ROOT, post.path), "utf8");
  const c = env.control;
  // #1 green: changes an existing post, all checks pass
  c.commit({ branch: "web/gruen", files: { [post.path]: original + "\nNoch ein Satz.\n" }, login: "bob" });
  c.openPull({ head: "web/gruen", title: "Beitrag ergänzt", login: "bob", createdAt: daysAgo(2) });
  c.setChecks({ number: 1, checkRuns: [{ name: "Prüfen", conclusion: "success" }, { name: "E2E", conclusion: "success" }], statuses: [{ context: "pages", state: "success" }] });
  // #2 red: a new post, one check fails; it closes issue #8 (below)
  c.commit({ branch: "web/rot", files: { "_posts/2026-11-20-neuer-test.md": "---\ntitle: Neu\n---\nText\n" }, login: "alice" });
  c.openPull({ head: "web/rot", title: "Neuer Beitrag mit Fehler", login: "alice", body: "Closes #8", createdAt: daysAgo(1) });
  c.setChecks({ number: 2, checkRuns: [{ name: "Prüfen", conclusion: "failure" }, { name: "E2E", conclusion: "success" }] });
  // #3 draft
  c.commit({ branch: "web/entwurf", files: { "entwurf.md": "x\n" }, login: "alice" });
  c.openPull({ head: "web/entwurf", title: "Halb fertig", login: "alice", draft: true });
  // #4 checks still running
  c.commit({ branch: "web/laeuft", files: { "laeuft.md": "x\n" }, login: "bob" });
  c.openPull({ head: "web/laeuft", title: "Checks laufen noch", login: "bob" });
  c.setChecks({ number: 4, checkRuns: [{ name: "Prüfen", status: "in_progress", conclusion: null }] });
  // #5 merge conflict with main, checks green
  c.commit({ branch: "web/konflikt", files: { "konflikt.txt": "b\n" }, login: "bob" });
  c.openPull({ head: "web/konflikt", title: "Konflikt", login: "bob" });
  c.commit({ branch: "main", files: { "konflikt.txt": "c\n" }, login: "alice" });
  c.setChecks({ number: 5, checkRuns: [{ name: "Prüfen", conclusion: "success" }] });
  // issues: #6 free, #7 assigned, #8 free but has a pull request (#2)
  c.openIssue({ title: "Freie Aufgabe", labels: [{ name: "enhancement", color: "a2eeef" }], createdAt: daysAgo(10) });
  c.openIssue({ title: "Bob macht das", assignees: ["bob"], labels: ["bug"] });
  c.openIssue({ title: "Mit Pull Request", createdAt: daysAgo(3) });
  return { post };
}
// pull request / issue numbers per group on the page: { ready: [1], failing: [2, 5], … }
function groups(page) {
  return page.evaluate(() => {
    const out = {};
    document.querySelectorAll("[data-group]").forEach((g) => {
      out[g.getAttribute("data-group")] = [...g.querySelectorAll("[data-pull], [data-issue]")].map((e) => +(e.getAttribute("data-pull") || e.getAttribute("data-issue")));
    });
    return out;
  });
}
async function openOverview(person) {
  await person.open(URL_PATH);
  await person.page.waitFor(() => document.querySelectorAll("#open-work [data-group]").length === 6, [], { message: "Übersicht lädt nicht" });
}

test("Offen: ohne Verbindung nur Erklärung und „GitHub verbinden“ – keine Anfrage an GitHub", async () => {
  seedWork();
  env.control.clearRequests();
  const guest = await env.person(null);
  await guest.open(URL_PATH);
  await guest.page.waitForSelector("#open-work [data-open-work-connect]");
  const s = await guest.page.evaluate(() => ({
    intro: !document.querySelector("[data-open-work-intro]").hidden,
    body: !document.querySelector("[data-open-work-body]").hidden,
    groups: document.querySelectorAll("[data-group]").length,
    text: document.querySelector("[data-open-work-intro]").textContent,
    link: getComputedStyle(document.querySelector("[data-open-work-link]")).display
  }));
  assert.equal(s.intro, true);
  assert.equal(s.body, false);
  assert.equal(s.groups, 0);
  assert.match(s.text, /GitHub-Verbindung/);
  assert.equal(s.link, "none", "der 🧩-Knopf in der Bearbeiten-Zeile bleibt ohne Verbindung unsichtbar");
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(env.control.requests().length, 0, "ohne Token keine Anfrage an GitHub");

  // the connect button opens the existing "🔑 Mit GitHub verbinden" dialog; after connecting the overview loads
  await guest.page.click("[data-open-work-intro] [data-open-work-connect]");
  await guest.page.waitFor(() => { const d = document.getElementById("github-connect"); return d && d.open; });
  await guest.page.fill("#github-connect input[type=password]", "token-alice");
  await guest.page.click("#github-connect [data-connect]");
  await guest.page.waitFor(() => /@alice/.test(document.querySelector("#github-connect .github-who").textContent));
  await guest.page.evaluate(() => document.getElementById("github-connect").close());
  await guest.page.waitFor(() => document.querySelectorAll("#open-work [data-group]").length === 6, [], { message: "Übersicht lädt nach dem Verbinden nicht" });
  assert.deepEqual((await groups(guest.page)).ready, [1]);
});

test("Offen: Pull Requests nach Checks/Konflikt gruppiert, Aufgaben nach übernehmbar / in Arbeit", async () => {
  const { post } = seedWork();
  const alice = await env.person("token-alice");
  await openOverview(alice);
  const g = await groups(alice.page);
  assert.deepEqual(g.ready, [1], "grün → Bereit zum Mergen");
  assert.deepEqual(g.failing.sort(), [2, 5], "roter Check und Konflikt → Checks rot / Konflikt");
  assert.deepEqual(g.running, [4]);
  assert.deepEqual(g.draft, [3]);
  assert.deepEqual(g.pickable, [6], "ohne Zuständige und ohne PR → kann übernommen werden");
  assert.deepEqual(g["in-progress"].sort(), [7, 8], "zugewiesen oder mit „Closes #8“ → in Arbeit");

  const item = (sel) => alice.page.evaluate((s) => { const e = document.querySelector(s); return e && { text: e.textContent, links: [...e.querySelectorAll("a")].map((a) => a.getAttribute("href")) }; }, sel);
  const green = await item('[data-pull="1"]');
  assert.match(green.text, /#1 Beitrag ergänzt/);
  assert.match(green.text, /von @bob · vor 2 Tagen/);
  assert.match(green.text, /3 Checks grün/);
  assert.ok(green.links.includes("https://github.com/falkorichter/ifsmb.de/pull/1"), "Link zum PR auf GitHub");
  assert.ok(green.links.includes(post.url), "geänderte Seite verlinkt: " + post.url + " in " + green.links);
  const red = await item('[data-pull="2"]');
  assert.match(red.text, /Fehlgeschlagen: Prüfen/, "der fehlgeschlagene Check steht mit Namen da");
  assert.doesNotMatch(red.text, /Fehlgeschlagen: .*E2E/);
  assert.match(red.text, /neu: \/news\/2026\/11\/20\/neuer-test\//, "neue Datei → künftige Adresse");
  assert.match(red.text, /schließt #8 Mit Pull Request/);
  assert.match((await item('[data-pull="5"]')).text, /Konflikt mit main/);
  assert.match((await item('[data-pull="4"]')).text, /Läuft: Prüfen/);

  const free = await item('[data-issue="6"]');
  assert.match(free.text, /enhancement/);
  assert.match(free.text, /vor 10 Tagen/);
  assert.match(free.text, /Übernehmen/);
  assert.match((await item('[data-issue="7"]')).text, /Zuständig: @bob/);
  assert.match((await item('[data-issue="8"]')).text, /PR: #2/);
  assert.equal(await alice.page.evaluate(() => getComputedStyle(document.querySelector("[data-open-work-link]")).display !== "none"), true,
    "mit Verbindung erscheint 🧩 Offen in der Bearbeiten-Zeile");
});

test("Offen: „Übernehmen“ weist die Aufgabe zu; ohne Issue-Recht eine deutsche Erklärung", async () => {
  seedWork();
  const alice = await env.person("token-alice");
  await openOverview(alice);
  await alice.page.click('[data-issue="6"] [data-claim]');
  await alice.page.waitFor(() => !!document.querySelector('[data-group="in-progress"] [data-issue="6"]'), [], { message: "#6 wandert nicht nach „In Arbeit“" });
  assert.deepEqual(env.control.state().issues.find((i) => i.number === 6).assignees, ["alice"]);
  assert.match(await alice.page.text("[data-open-work-status]"), /#6 übernommen/);

  // a token that may read but not assign issues → 403 → German hint, nothing assigned
  env.control.openIssue({ title: "Noch eine" }); // #9
  env.control.setUser({ token: "token-bob", login: "bob", issues: "read" });
  const bob = await env.person("token-bob");
  await bob.open(URL_PATH);
  await bob.page.waitForSelector('[data-issue="9"] [data-claim]');
  await bob.page.click('[data-issue="9"] [data-claim]');
  await bob.page.waitFor(() => /darf keine Aufgaben zuweisen/.test(document.querySelector('[data-issue="9"] [data-claim-status]').textContent));
  assert.deepEqual(env.control.state().issues.find((i) => i.number === 9).assignees, []);
  assert.equal(await bob.page.evaluate(() => document.querySelector('[data-issue="9"] [data-claim]').disabled), false, "nochmal versuchen geht");
});

test("Offen: ohne Schreibrechte kein „Übernehmen“-Knopf", async () => {
  seedWork();
  const carol = await env.person("token-carol");
  await openOverview(carol);
  assert.equal(await carol.page.evaluate(() => document.querySelectorAll("[data-claim]").length), 0);
});

test("Offen: Ergebnis kurz im Sitzungsspeicher, „🔄 Aktualisieren“ lädt neu", async () => {
  seedWork();
  const alice = await env.person("token-alice");
  await openOverview(alice);
  const pullsRequests = () => env.control.requests().filter((r) => r.method === "GET" && /\/pulls\?state=open/.test(r.path)).length;
  assert.equal(pullsRequests(), 1);
  await openOverview(alice); // reload within two minutes → from sessionStorage
  assert.equal(pullsRequests(), 1, "zweites Öffnen kommt aus dem Cache");

  env.control.setChecks({ number: 4, checkRuns: [{ name: "Prüfen", conclusion: "success" }] });
  await alice.page.click("[data-open-work-refresh]");
  await alice.page.waitFor(() => !!document.querySelector('[data-group="ready"] [data-pull="4"]'), [], { message: "#4 nach dem Aktualisieren nicht bereit" });
  assert.equal(pullsRequests(), 2);
});

test("Offen: Fehler von GitHub erscheinen auf Deutsch (abgelaufenes Token, Serverfehler)", async () => {
  seedWork();
  env.control.fail({ method: "GET", path: "/issues\\?", status: 502 });
  const alice = await env.person("token-alice");
  await alice.open(URL_PATH);
  await alice.page.waitFor(() => /GitHub hat gerade ein Problem \(502\)/.test(document.querySelector("[data-open-work-status]").textContent));
  // second try works (the rule fired once)
  await alice.page.click("[data-open-work-refresh]");
  await alice.page.waitFor(() => document.querySelectorAll("#open-work [data-group]").length === 6);

  env.control.expireToken({ token: "token-alice" });
  await alice.page.click("[data-open-work-refresh]");
  await alice.page.waitFor(() => /abgelaufen oder ungültig/.test(document.querySelector("[data-open-work-status]").textContent));
  assert.equal(await alice.page.evaluate(() => !document.querySelector("[data-open-work-intro] [data-open-work-connect]").hidden), true, "„GitHub verbinden“ wird wieder angeboten");
});

test("Offen: Token ohne Leserecht für Checks → „Checks nicht lesbar“ statt Fehler", async () => {
  seedWork();
  env.control.setUser({ token: "token-alice", login: "alice", checks: false });
  const alice = await env.person("token-alice");
  await openOverview(alice);
  const g = await groups(alice.page);
  assert.deepEqual(g.ready, [], "ohne lesbare Checks ist nichts „bereit“");
  assert.ok(g.running.includes(1));
  assert.match(await alice.page.text('[data-pull="1"]'), /Checks nicht lesbar/);
});
