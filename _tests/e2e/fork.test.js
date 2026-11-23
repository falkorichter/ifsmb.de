// #186: editing with any GitHub account – collaborators (push access, not the owner) directly, everyone else through
// their own fork: created when needed, PR from "login:branch" (classic token) or GitHub's compare page (fine-grained).
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startEnv, editPage, ROOT } = require("./lib/helpers.js");
const { diffLines } = require("./lib/text-diff.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

const upstreamWebBranches = () => Object.keys(env.control.state().branches).filter((b) => b.startsWith("web/"));
const forkWebBranches = (login) => Object.entries(env.control.forkBranches({ login }) || {}).filter(([b]) => b.startsWith("web/"));

test("Collaborator (Schreibrechte, nicht Owner): Pull Request direkt im Repository", async () => {
  const page = editPage("beitrag");
  env.seedSource([page.path]);
  env.control.setUser({ token: "token-dana", login: "dana", push: true, classic: true });
  const dana = await env.person("token-dana");
  await dana.openEdit(page.url);
  await dana.fill({ title: "E2E von Dana" });
  await dana.submit();
  await dana.waitStatus(/Pull Request #1.*angelegt/);
  const pr = env.control.state().pulls[0];
  assert.equal(pr.login, "dana");
  assert.equal(pr.head.repo.full_name, "falkorichter/ifsmb.de");
  assert.deepEqual(env.control.state().forks, [], "kein Fork nötig");
});

test("Ohne Schreibrechte, klassischer Token: Fork wird angelegt, Pull Request aus dem Fork", async () => {
  const page = editPage("beitrag"), original = fs.readFileSync(path.join(ROOT, page.path), "utf8");
  env.seedSource([page.path]);
  env.control.setUser({ token: "token-carol", classic: true });
  const carol = await env.person("token-carol");
  await carol.openEdit(page.url);
  await carol.page.click("#neu-dialog [data-github]").catch(() => {});
  await carol.fill({ title: "E2E aus Carols Fork" });
  await carol.submit();
  await carol.waitStatus(/Pull Request #1.*aus deinem Fork carol\/ifsmb\.de/);
  const { pulls, forks } = env.control.state();
  assert.deepEqual(forks, ["carol/ifsmb.de"]);
  assert.equal(pulls.length, 1);
  assert.equal(pulls[0].head.repo.full_name, "carol/ifsmb.de");
  assert.deepEqual(upstreamWebBranches(), [], "kein Branch im Repository selbst");
  const [[branch, sha]] = forkWebBranches("carol");
  assert.equal(pulls[0].head.ref, branch);
  const d = diffLines(original, env.control.readFile({ ref: sha, path: page.path }).text);
  assert.equal(d.added.length, 1, d.patch);
  assert.match(d.added[0], /^title: "?E2E aus Carols Fork"?$/);
});

test("Ohne Schreibrechte, fine-grained Token: Branch im Fork, Pull Request über GitHubs Vergleichsseite", async () => {
  const page = editPage("beitrag");
  env.seedSource([page.path]);
  env.control.setUser({ token: "token-carol", classic: false });
  const carol = await env.person("token-carol");
  await carol.openEdit(page.url);
  await carol.fill({ title: "E2E fine-grained" });
  await carol.submit();
  await carol.waitStatus(/Deine Änderung liegt in deinem Fork carol\/ifsmb\.de/);
  assert.equal(env.control.state().pulls.length, 0, "GitHub verweigert den PR per API – kein PR");
  const [[branch]] = forkWebBranches("carol");
  const href = await carol.page.evaluate(() => document.querySelector("#neu-dialog [data-compare-link]").getAttribute("href"));
  assert.ok(href.startsWith("https://github.com/falkorichter/ifsmb.de/compare/main...carol:ifsmb.de:" + branch.split("/").map(encodeURIComponent).join("/") + "?expand=1"), href);
  assert.match(decodeURIComponent(href), /title=Beitrag geändert: E2E fine-grained/);
});

test("Vorhandener Fork wird wiederverwendet und vorher auf den neuesten Stand gebracht", async () => {
  const page = editPage("beitrag");
  env.seedSource([page.path]);
  env.control.createFork({ login: "carol" });
  env.control.commit({ branch: "main", files: { "README-neu.md": "neu auf main\n" }, login: "falkorichter", message: "main geht weiter" });
  env.control.setUser({ token: "token-carol", classic: true });
  const carol = await env.person("token-carol");
  await carol.openEdit(page.url);
  await carol.fill({ title: "E2E alter Fork" });
  await carol.submit();
  await carol.waitStatus(/Pull Request #1.*aus deinem Fork/);
  const posts = env.control.requests().filter((r) => r.method === "POST").map((r) => r.path);
  assert.ok(!posts.some((p) => /\/forks$/.test(p)), "kein zweiter Fork: " + posts.join(", "));
  assert.ok(posts.some((p) => /^\/repos\/carol\/ifsmb\.de\/merge-upstream$/.test(p)), "Fork abgeglichen");
  assert.equal(env.control.forkBranches({ login: "carol" }).main, env.control.state().branches.main);
});

test("Token darf keinen Fork anlegen: verständliche Meldung, nichts angelegt", async () => {
  const page = editPage("beitrag");
  env.seedSource([page.path]);
  env.control.setUser({ token: "token-carol", classic: false, fork: false });
  const carol = await env.person("token-carol");
  await carol.openEdit(page.url);
  await carol.fill({ title: "E2E ohne Fork-Recht" });
  await carol.submit();
  await carol.waitStatus(/darf keinen Fork anlegen.*„Administration“/);
  assert.deepEqual(env.control.state().forks, []);
  assert.equal(env.control.state().pulls.length, 0);
});

test("Verbinden-Dialog: ein Token-Weg (klassisch, public_repo), ohne Schreibrechte ehrlicher Hinweis statt „kommen später“", async () => {
  env.control.setUser({ token: "token-carol", classic: true });
  const carol = await env.person("token-carol");
  await carol.open(editPage("beitrag").url);
  await carol.page.evaluate(() => window.ladeSkripte(["formular.js", "neu.js"]).then(() => window.NeuFormular.connect()));
  await carol.page.waitFor(() => /beim ersten Senden wird dein eigener Fork angelegt/.test((document.querySelector("#github-connect .github-who") || {}).textContent || ""));
  const links = await carol.page.evaluate(() => [...document.querySelectorAll("#github-connect [data-token-link]")].map((a) => a.getAttribute("href")));
  assert.deepEqual(links, ["https://github.com/settings/tokens/new?scopes=public_repo&description=ifsmb.de%20bearbeiten"]);
  const text = await carol.page.text("#github-connect");
  assert.doesNotMatch(text, /kommen später|target_name|Fine-grained Token für/);
});

test("Veralteter Fork: Hinweis im Verbinden-Dialog", async () => {
  env.control.createFork({ login: "carol" });
  env.control.commit({ branch: "main", files: { "neu.md": "x\n" }, login: "falkorichter", message: "main geht weiter" });
  env.control.setUser({ token: "token-carol", classic: true });
  const carol = await env.person("token-carol");
  await carol.open(editPage("beitrag").url);
  await carol.page.evaluate(() => window.ladeSkripte(["formular.js", "neu.js"]).then(() => window.NeuFormular.connect()));
  await carol.page.waitFor(() => !!document.querySelector("#github-connect [data-fork-behind]"));
  assert.match(await carol.page.text("#github-connect .github-who"), /Fork carol\/ifsmb\.de.*nicht auf dem neuesten Stand/s);
});

test("Fork lässt sich nicht abgleichen: Warnung mit „Sync fork“, Änderung baut trotzdem auf dem aktuellen Stand auf", async () => {
  const page = editPage("beitrag"), original = fs.readFileSync(path.join(ROOT, page.path), "utf8");
  env.seedSource([page.path]);
  env.control.createFork({ login: "carol" });
  env.control.forkCommit({ login: "carol", files: { "eigenes.md": "nur im Fork\n" }, message: "eigener Commit auf main im Fork" });
  env.control.commit({ branch: "main", files: { "neu.md": "x\n" }, login: "falkorichter", message: "main geht weiter" });
  env.control.setUser({ token: "token-carol", classic: true });
  const carol = await env.person("token-carol");
  await carol.openEdit(page.url);
  await carol.fill({ title: "E2E trotz altem Fork" });
  await carol.submit();
  await carol.waitStatus(/Pull Request #1.*Sync fork/s);
  const pr = env.control.state().pulls[0];
  assert.deepEqual(pr.files.map((f) => f.filename), [page.path], "nur die eigene Änderung im PR – nichts aus dem alten Fork");
  const [[, sha]] = forkWebBranches("carol");
  assert.equal(diffLines(original, env.control.readFile({ ref: sha, path: page.path }).text).added.length, 1);
});

test("Collaborator mit fine-grained Token: Hinweis auf neuen (klassischen) Token, Senden geht über den Fork statt 403", async () => {
  const page = editPage("beitrag");
  env.seedSource([page.path]);
  env.control.setUser({ token: "github_pat_susi", login: "susi", push: true, fineGrained: true });
  const susi = await env.person("github_pat_susi");
  await susi.openEdit(page.url);
  await susi.page.evaluate(() => window.NeuFormular.connect());
  await susi.page.waitFor(() => /Collaborator.*fine-grained Token.*neuen Token erstellen/s.test((document.querySelector("#github-connect .github-who") || {}).textContent || ""));
  await susi.page.evaluate(() => document.getElementById("github-connect").close());
  await susi.fill({ title: "E2E Susi fine-grained" });
  await susi.submit();
  await susi.waitStatus(/Deine Änderung liegt in deinem Fork susi\/ifsmb\.de/);
  assert.deepEqual(upstreamWebBranches(), [], "nichts direkt im Repository");
  assert.equal(forkWebBranches("susi").length, 1);
});

