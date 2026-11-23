// Tests for the fake GitHub itself (no browser): status codes and error bodies like the real API, git model,
// pull request files, merges, control API. If these pass, a failing browser test points at the site, not the fake.
"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createFakeGitHub } = require("./lib/fake-github.js");

let fake, api;
const R = "/repos/falkorichter/ifsmb.de";
before(async () => { fake = createFakeGitHub(); api = await fake.listen(0); });
after(() => fake.close());
beforeEach(() => { fake.control.reset(); fake.control.seed({ files: { "_posts/a.md": "eins\nzwei\ndrei\nvier\nfünf\n", "assets/images/news/a/01.jpg": { base64: "/9j/AA==" } } }); });

async function call(method, path, body, token = "token-alice") {
  const r = await fetch(api + path, { method, headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}), body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  return { status: r.status, data: txt ? JSON.parse(txt) : null, headers: r.headers };
}
// the same steps as GitHubApi.createPullRequest: blob → tree → commit → ref
async function commitVia(branch, files, { token = "token-alice", newBranch = true, force } = {}) {
  const base = (await call("GET", R + "/git/ref/heads/" + (newBranch ? "main" : branch), null, token)).data.object.sha;
  const commit = (await call("GET", R + "/git/commits/" + base, null, token)).data;
  const tree = [];
  for (const [path, text] of Object.entries(files)) tree.push({ path, mode: "100644", type: "blob", sha: (await call("POST", R + "/git/blobs", { content: text, encoding: "utf-8" }, token)).data.sha });
  const t = (await call("POST", R + "/git/trees", { base_tree: commit.tree.sha, tree }, token)).data;
  const c = (await call("POST", R + "/git/commits", { message: "x", tree: t.sha, parents: [base] }, token)).data;
  const ref = newBranch ? await call("POST", R + "/git/refs", { ref: "refs/heads/" + branch, sha: c.sha }, token)
    : await call("PATCH", R + "/git/refs/heads/" + branch, { sha: c.sha, force: !!force }, token);
  return { sha: c.sha, ref };
}

test("Tokens: Benutzer, Schreibrechte, ungültig/abgelaufen", async () => {
  assert.equal((await call("GET", "/user")).data.login, "alice");
  assert.equal((await call("GET", R)).data.permissions.push, true);
  assert.equal((await call("GET", R, null, "token-carol")).data.permissions.push, false);
  const bad = await call("GET", "/user", null, "nope");
  assert.equal(bad.status, 401); assert.equal(bad.data.message, "Bad credentials");
  fake.control.expireToken({ token: "token-bob" });
  assert.equal((await call("GET", R, null, "token-bob")).status, 401);
  const ro = await call("POST", R + "/git/blobs", { content: "x" }, "token-carol");
  assert.equal(ro.status, 403); assert.match(ro.data.message, /not accessible/);
  assert.equal((await call("GET", "/repos/someone/else")).status, 404);
});

test("CORS: Preflight und Header", async () => {
  const r = await fetch(api + R + "/git/refs", { method: "OPTIONS" });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  assert.match(r.headers.get("access-control-allow-headers"), /Authorization/);
  assert.match(r.headers.get("access-control-allow-methods"), /PATCH/);
});

test("contents: Datei (base64 mit Zeilenumbrüchen), Ordner, 404, unbekannte ref", async () => {
  const f = (await call("GET", R + "/contents/_posts/a.md?ref=main")).data;
  assert.equal(f.type, "file");
  assert.equal(Buffer.from(f.content.replace(/\n/g, ""), "base64").toString(), "eins\nzwei\ndrei\nvier\nfünf\n");
  const dir = (await call("GET", R + "/contents/assets/images/news/a?ref=main")).data;
  assert.deepEqual(dir.map((x) => x.name), ["01.jpg"]);
  assert.deepEqual((await call("GET", R + "/contents/assets/images?ref=main")).data.map((x) => [x.name, x.type]), [["news", "dir"]]);
  assert.equal((await call("GET", R + "/contents/fehlt.md?ref=main")).status, 404);
  assert.equal((await call("GET", R + "/contents/_posts/a.md?ref=gibt-es-nicht")).status, 404);
});

test("refs: anlegen, schon vorhanden, Fast-Forward-Prüfung, force", async () => {
  const a = await commitVia("web/x", { "_posts/a.md": "neu\n" });
  assert.equal(a.ref.status, 201);
  const again = await call("POST", R + "/git/refs", { ref: "refs/heads/web/x", sha: a.sha });
  assert.equal(again.status, 422); assert.equal(again.data.message, "Reference already exists");
  // a commit based on main (not on web/x) → not a fast forward
  const other = await commitVia("tmp", { "_posts/b.md": "b\n" });
  const nf = await call("PATCH", R + "/git/refs/heads/web/x", { sha: other.sha, force: false });
  assert.equal(nf.status, 422); assert.equal(nf.data.message, "Update is not a fast forward");
  assert.equal((await call("PATCH", R + "/git/refs/heads/web/x", { sha: other.sha, force: true })).status, 200);
  assert.equal((await call("PATCH", R + "/git/refs/heads/fehlt", { sha: other.sha })).data.message, "Reference does not exist");
  const ff = await commitVia("web/x", { "_posts/c.md": "c\n" }, { newBranch: false });
  assert.equal(ff.ref.status, 200);
});

test("Pull Requests: Dateiliste mit added/modified/removed/renamed, doppelter PR, keine Commits", async () => {
  fake.control.commit({ branch: "web/r", files: { "_posts/a.md": null, "_posts/umbenannt.md": "eins\nzwei\ndrei\nvier\nfünf\n", "assets/images/news/a/01.jpg": null, "neu.md": "n\n" }, login: "bob" });
  fake.control.commit({ branch: "web/m", files: { "_posts/a.md": "eins\nZWEI\ndrei\nvier\nfünf\n" } });
  const pr = await call("POST", R + "/pulls", { title: "R", head: "web/r", base: "main", body: "" });
  assert.equal(pr.status, 201); assert.equal(pr.data.number, 1); assert.equal(pr.data.head.repo.full_name, "falkorichter/ifsmb.de");
  const files = (await call("GET", R + "/pulls/1/files?per_page=100")).data;
  assert.deepEqual(files.map((f) => [f.filename, f.status, f.previous_filename]), [
    ["_posts/umbenannt.md", "renamed", "_posts/a.md"], ["assets/images/news/a/01.jpg", "removed", undefined], ["neu.md", "added", undefined]]);
  const dup = await call("POST", R + "/pulls", { title: "R2", head: "web/r", base: "main" });
  assert.equal(dup.status, 422); assert.match(dup.data.errors[0].message, /already exists/);
  fake.control.createBranch({ name: "leer", from: "main" });
  assert.equal((await call("POST", R + "/pulls", { title: "leer", head: "leer", base: "main" })).status, 422);
  await call("POST", R + "/pulls", { title: "M", head: "web/m", base: "main" });
  const m = (await call("GET", R + "/pulls/2/files")).data[0];
  assert.deepEqual([m.status, m.additions, m.deletions], ["modified", 1, 1]);
  assert.match(m.patch, /-zwei\n\+ZWEI/);
  assert.deepEqual((await call("GET", R + "/pulls?state=open&per_page=50")).data.map((p) => p.number), [2, 1]);
});

test("Mergen: Zeilen zusammenführen, Konflikt (405), Branch löschen schließt PR", async () => {
  fake.control.commit({ branch: "web/a", files: { "_posts/a.md": "EINS\nzwei\ndrei\nvier\nfünf\n" } });
  fake.control.commit({ branch: "web/b", files: { "_posts/a.md": "eins\nzwei\ndrei\nvier\nFÜNF\n" } });
  fake.control.commit({ branch: "web/c", files: { "_posts/a.md": "eins!\nzwei\ndrei\nvier\nfünf\n" } });
  fake.control.commit({ branch: "web/d", files: { "neu.md": "d\n" } });
  for (const b of ["a", "b", "c", "d"]) fake.control.openPull({ head: "web/" + b, title: b, login: "bob" });
  fake.control.mergePull({ number: 1 });
  assert.equal(fake.control.mergeable({ number: 2 }).mergeable, true);
  fake.control.mergePull({ number: 2, method: "squash" });
  assert.equal(fake.control.readFile({ path: "_posts/a.md" }).text, "EINS\nzwei\ndrei\nvier\nFÜNF\n");
  assert.deepEqual(fake.control.mergeable({ number: 3 }), { mergeable: false, conflicts: ["_posts/a.md"] });
  assert.throws(() => fake.control.mergePull({ number: 3 }), (e) => e.status === 405);
  fake.control.deleteBranch({ name: "web/d" });
  const s = fake.control.state();
  assert.deepEqual(s.pulls.map((p) => [p.number, p.state, p.merged]), [[1, "closed", true], [2, "closed", true], [3, "open", false], [4, "closed", false]]);
  // merged PRs keep their file list
  assert.deepEqual(s.pulls[0].files.map((f) => f.filename), ["_posts/a.md"]);
});

test("Fehler einschleusen: n-te Anfrage, Verzögerung mit Aktion", async () => {
  fake.control.fail({ method: "POST", path: "/git/blobs$", nth: 2, status: 502, message: "Bad Gateway" });
  assert.equal((await call("POST", R + "/git/blobs", { content: "a" })).status, 201);
  const second = await call("POST", R + "/git/blobs", { content: "b" });
  assert.equal(second.status, 502); assert.equal(second.data.message, "Bad Gateway");
  assert.equal((await call("POST", R + "/git/blobs", { content: "c" })).status, 201, "nur einmal");
  // "meanwhile someone commits": the rule runs a control method before the request is answered
  fake.control.fail({ method: "GET", path: "/git/ref/heads/main$", run: { op: "commit", args: { files: { "x.md": "x\n" }, login: "bob" } } });
  const before = fake.control.log({ limit: 1 })[0].sha;
  const ref = (await call("GET", R + "/git/ref/heads/main")).data.object.sha;
  assert.notEqual(ref, before);
  assert.equal(fake.control.requests().filter((r) => r.injected).length, 1);
});

test("Steuerung über HTTP: /__fake/<methode>", async () => {
  const r = await fetch(api + "/__fake/commit", { method: "POST", body: JSON.stringify({ branch: "web/h", files: { "h.md": "h\n" }, login: "bob" }) });
  assert.equal(r.status, 200);
  const pr = await (await fetch(api + "/__fake/openPull", { method: "POST", body: JSON.stringify({ head: "web/h", title: "H", login: "bob" }) })).json();
  assert.equal(pr.number, 1);
  const st = await (await fetch(api + "/__fake/state")).json();
  assert.deepEqual(st.pulls[0].files.map((f) => f.filename), ["h.md"]);
  const file = await (await fetch(api + "/__fake/readFile?ref=web/h&path=h.md")).json();
  assert.equal(file.text, "h\n");
  assert.equal((await fetch(api + "/__fake/gibtsnicht", { method: "POST" })).status, 404);
});
