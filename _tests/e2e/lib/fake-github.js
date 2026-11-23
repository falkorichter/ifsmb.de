// Fake GitHub for the end-to-end tests: an in-memory git repository (blobs, trees, commits, branches) plus pull
// requests, issues and checks (check runs + commit statuses, set by the tests), served with exactly the REST endpoints assets/js/github-api.js uses – realistic status codes and error
// bodies, CORS, several tokens/users. No dependencies (node:http, node:crypto).
//
// Usable in-process (tests call the control methods directly) or standalone:
//   node _tests/e2e/lib/fake-github.js --port 0      → prints the URL
// Control API over HTTP: POST /__fake/<method> with a JSON body (arguments), GET /__fake/<method>?arg=… for reads.
// See _tests/e2e/README.md for the list.
"use strict";
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { diffLines, merge3 } = require("./text-diff.js");

const DEFAULT_USERS = {
  "token-alice": { login: "alice", name: "Alice Test", push: true },
  "token-bob": { login: "bob", name: "Bob Test", push: true },
  "token-carol": { login: "carol", name: "Carol Ohne-Rechte", push: false }
};

function sha1(s) { return crypto.createHash("sha1").update(s).digest("hex"); }
function toBuffer(v) {
  if (Buffer.isBuffer(v)) return v;
  if (v && typeof v === "object" && typeof v.base64 === "string") return Buffer.from(v.base64, "base64");
  if (v && typeof v === "object" && typeof v.text === "string") return Buffer.from(v.text, "utf8");
  return Buffer.from(String(v), "utf8");
}
function isText(buf) { return !buf.includes(0) && Buffer.from(buf.toString("utf8"), "utf8").equals(buf); }
// GitHub wraps base64 content in the contents API every 60 characters
function wrap64(b64) { return b64.replace(/(.{60})/g, "$1\n"); }

class ApiError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra || {}; }
}

function createFakeGitHub(options) {
  const opts = Object.assign({ owner: "falkorichter", repo: "ifsmb.de", base: "main", users: DEFAULT_USERS }, options);
  let st; // whole state, replaced by reset()
  let server = null, url = null;

  // ---------- git model ----------
  function putBlob(buf) {
    const sha = sha1(Buffer.concat([Buffer.from("blob " + buf.length + "\0"), buf]));
    if (!st.objects.has(sha)) st.objects.set(sha, { type: "blob", data: buf });
    return sha;
  }
  // trees are flat: { "dir/file.md": { sha, mode } } – enough for the endpoints the site uses
  function putTree(files) {
    const sorted = {}; Object.keys(files).sort().forEach((p) => { sorted[p] = { sha: files[p].sha, mode: files[p].mode || "100644" }; });
    const sha = sha1("tree " + JSON.stringify(sorted));
    if (!st.objects.has(sha)) st.objects.set(sha, { type: "tree", files: sorted });
    return sha;
  }
  function putCommit({ tree, parents, message, login }) {
    const date = new Date(Date.now() + st.counter).toISOString(); // strictly increasing, even within one millisecond
    const c = { type: "commit", tree, parents: parents || [], message: message || "", login: login || "fake", date, n: ++st.counter };
    const sha = sha1("commit " + JSON.stringify(c));
    st.objects.set(sha, c);
    return sha;
  }
  function obj(sha, type) { const o = st.objects.get(sha); return o && (!type || o.type === type) ? o : null; }
  function treeFiles(commitSha) { return obj(obj(commitSha, "commit").tree, "tree").files; }
  // branch name or commit sha → commit sha (or null)
  function resolve(ref) {
    if (ref == null || ref === "") ref = st.base;
    ref = String(ref).replace(/^refs\/heads\/|^heads\//, "");
    if (st.refs.has(ref)) return st.refs.get(ref);
    if (/^[0-9a-f]{40}$/.test(ref) && obj(ref, "commit")) return ref;
    return null;
  }
  function ancestors(sha) { // sha → distance, breadth first
    const seen = new Map([[sha, 0]]), queue = [sha];
    while (queue.length) {
      const s = queue.shift();
      for (const p of obj(s, "commit").parents) if (!seen.has(p)) { seen.set(p, seen.get(s) + 1); queue.push(p); }
    }
    return seen;
  }
  function isAncestor(a, b) { return ancestors(b).has(a); }
  function mergeBase(a, b) {
    const A = ancestors(a), B = ancestors(b);
    let best = null, bestD = Infinity;
    for (const [s, d] of B) if (A.has(s) && d + A.get(s) < bestD) { best = s; bestD = d + A.get(s); }
    return best;
  }
  // new commit on top of a branch: changes = { path: content | null (delete) }; creates the branch from `from` if missing
  function commitChanges(branch, changes, { login, message, from } = {}) {
    let parent = st.refs.get(branch);
    if (!parent) {
      parent = resolve(from || st.base);
      if (!parent) throw new ApiError(422, "Branch " + (from || st.base) + " does not exist");
    }
    const files = Object.assign({}, treeFiles(parent));
    for (const [p, v] of Object.entries(changes || {})) {
      if (v === null) delete files[p];
      else files[p] = { sha: putBlob(toBuffer(v)), mode: "100644" };
    }
    const sha = putCommit({ tree: putTree(files), parents: [parent], message: message || "Änderung von " + (login || "fake"), login });
    st.refs.set(branch, sha);
    return sha;
  }

  // ---------- pull requests ----------
  function headRefs(pr) { const f = st.forks.get(pr.head.repo); return f ? f.refs : st.refs; }
  function pullHeadSha(pr) {
    if (pr.state === "open" && headRefs(pr).has(pr.head.ref)) pr.headSha = headRefs(pr).get(pr.head.ref);
    return pr.headSha;
  }
  function blobText(sha) { const b = obj(sha, "blob"); return b && isText(b.data) ? b.data.toString("utf8") : null; }
  // files changed between two trees, like GitHub's PR "files" list (incl. renames with identical content)
  function diffTrees(fromFiles, toFiles) {
    const out = [];
    const added = [], removed = [];
    for (const p of Object.keys(toFiles)) {
      if (!fromFiles[p]) added.push(p);
      else if (fromFiles[p].sha !== toFiles[p].sha) out.push(fileEntry(p, "modified", fromFiles[p].sha, toFiles[p].sha));
    }
    for (const p of Object.keys(fromFiles)) if (!toFiles[p]) removed.push(p);
    for (const p of added) {
      const i = removed.findIndex((r) => fromFiles[r].sha === toFiles[p].sha);
      if (i >= 0) { const prev = removed.splice(i, 1)[0]; out.push(Object.assign(fileEntry(p, "renamed", fromFiles[prev].sha, toFiles[p].sha), { previous_filename: prev })); }
      else out.push(fileEntry(p, "added", null, toFiles[p].sha));
    }
    for (const p of removed) out.push(fileEntry(p, "removed", fromFiles[p].sha, null));
    return out.sort((a, b) => a.filename.localeCompare(b.filename));
  }
  function fileEntry(filename, status, fromSha, toSha) {
    const a = fromSha ? blobText(fromSha) : "", b = toSha ? blobText(toSha) : "";
    const e = { sha: toSha || fromSha, filename, status, additions: 0, deletions: 0, changes: 0 };
    if (a != null && b != null) {
      const d = diffLines(a, b);
      e.additions = d.added.length; e.deletions = d.removed.length; e.changes = e.additions + e.deletions;
      if (status !== "renamed" || e.changes) e.patch = d.patch;
    }
    return e;
  }
  function pullFiles(pr) {
    if (pr.filesSnapshot) return pr.filesSnapshot;
    const head = pullHeadSha(pr), base = resolve(pr.base.ref);
    const mb = (head && base && mergeBase(head, base)) || pr.baseSha;
    return diffTrees(treeFiles(mb), treeFiles(head));
  }
  function pullCommits(pr) {
    const head = pullHeadSha(pr), stop = ancestors(pr.baseSha);
    const list = []; let s = head;
    while (s && !stop.has(s)) { list.unshift(s); s = obj(s, "commit").parents[0]; }
    return list;
  }
  function repoJson(fullName) { return { full_name: fullName || st.owner + "/" + st.repo, name: (fullName || st.repo).split("/").pop(), owner: { login: (fullName || st.owner).split("/")[0], type: "User" } }; }
  function userJson(u) { return { login: u.login, id: u.id, type: "User", avatar_url: url + "/__fake/avatar/" + u.login + ".svg", html_url: "https://github.com/" + u.login }; }
  function pullJson(pr) {
    const full = st.owner + "/" + st.repo;
    return {
      number: pr.number, title: pr.title, body: pr.body, state: pr.state, draft: !!pr.draft, locked: false,
      labels: labelsJson(pr.labels), assignees: [],
      html_url: "https://github.com/" + full + "/pull/" + pr.number,
      url: url + "/repos/" + full + "/pulls/" + pr.number,
      user: userJson(pr.user), created_at: pr.created_at, updated_at: pr.updated_at,
      closed_at: pr.closed_at || null, merged_at: pr.merged_at || null, merged: !!pr.merged_at,
      merge_commit_sha: pr.merge_commit_sha || null,
      head: { ref: pr.head.ref, sha: pullHeadSha(pr), label: pr.head.repo.split("/")[0] + ":" + pr.head.ref, repo: repoJson(pr.head.repo) },
      base: { ref: pr.base.ref, sha: resolve(pr.base.ref), label: st.owner + ":" + pr.base.ref, repo: repoJson() }
    };
  }
  // labels as GitHub returns them; input: names or { name, color }
  function labelsJson(list) {
    return (list || []).map((l, i) => typeof l === "string" ? { id: 500 + i, name: l, color: "ededed" } : Object.assign({ id: 500 + i, color: "ededed" }, l));
  }
  function issueJson(i) {
    const full = st.owner + "/" + st.repo;
    return { number: i.number, title: i.title, body: i.body, state: i.state, html_url: "https://github.com/" + full + "/issues/" + i.number,
      url: url + "/repos/" + full + "/issues/" + i.number, user: userJson(i.user), labels: labelsJson(i.labels),
      assignees: i.assignees.map(userJson), assignee: i.assignees[0] ? userJson(i.assignees[0]) : null,
      created_at: i.created_at, updated_at: i.updated_at, closed_at: i.closed_at || null };
  }
  // a pull request in the /issues list, like GitHub (with a pull_request key)
  function pullAsIssueJson(pr) {
    const p = pullJson(pr);
    return { number: p.number, title: p.title, body: p.body, state: p.state, html_url: p.html_url, user: p.user, labels: p.labels,
      assignees: [], assignee: null, created_at: p.created_at, updated_at: p.updated_at, closed_at: p.closed_at,
      pull_request: { url: p.url, html_url: p.html_url, merged_at: p.merged_at } };
  }
  function findUser(login) { return Object.values(st.users).find((u) => u.login === login) || null; }
  // branch, sha or pull request number → commit sha whose checks are meant
  function checkSha({ sha, ref, number }) {
    if (number != null) return pullHeadSha(getPull(number));
    const s = sha || resolve(ref);
    if (!s) throw new ApiError(422, "No commit found for " + (sha || ref));
    return s;
  }
  function checksOf(sha) { return st.checks.get(sha) || { checkRuns: [], statuses: [] }; }
  // combined status like GitHub: failure if one failed/errored, pending if one is pending or there are none, else success
  function combinedState(statuses) {
    if (statuses.some((x) => x.state === "failure" || x.state === "error")) return "failure";
    if (!statuses.length || statuses.some((x) => x.state === "pending")) return "pending";
    return "success";
  }
  function openPullInternal({ head, base, title, body, user, headRepo, draft, createdAt, labels }) {
    const full = st.owner + "/" + st.repo;
    base = base || st.base;
    const errs = [];
    if (!st.refs.has(base)) errs.push({ resource: "PullRequest", field: "base", code: "invalid" });
    const fork = headRepo && headRepo !== full ? st.forks.get(headRepo) : null, hRefs = fork ? fork.refs : st.refs;
    if (!hRefs.has(head)) errs.push({ resource: "PullRequest", field: "head", code: "invalid" });
    if (errs.length) throw new ApiError(422, "Validation Failed", { errors: errs });
    if (st.pulls.some((p) => p.state === "open" && p.head.ref === head && (p.head.repo || full) === (headRepo || full) && p.base.ref === base))
      throw new ApiError(422, "Validation Failed", { errors: [{ resource: "PullRequest", code: "custom", message: "A pull request already exists for " + st.owner + ":" + head + "." }] });
    if (isAncestor(hRefs.get(head), st.refs.get(base)))
      throw new ApiError(422, "Validation Failed", { errors: [{ resource: "PullRequest", code: "custom", message: "No commits between " + base + " and " + head }] });
    const now = createdAt || new Date().toISOString();
    const pr = { number: ++st.issueCounter, title: title || head, body: body || "", state: "open", user, draft: !!draft, labels: labels || [],
      head: { ref: head, repo: headRepo || full }, base: { ref: base }, headSha: hRefs.get(head),
      baseSha: mergeBase(hRefs.get(head), st.refs.get(base)), created_at: now, updated_at: now };
    st.pulls.push(pr);
    return pr;
  }
  function getPull(n) {
    const pr = st.pulls.find((p) => p.number === Number(n));
    if (!pr) throw new ApiError(404, "Not Found");
    return pr;
  }
  // merge like GitHub's merge button: three-way, line by line for text files; conflicts → 405 like the real API
  function mergedTree(baseSha, headSha) {
    const mb = mergeBase(baseSha, headSha), O = treeFiles(mb), A = treeFiles(baseSha), B = treeFiles(headSha);
    const out = {}, conflicts = [];
    for (const p of new Set([...Object.keys(O), ...Object.keys(A), ...Object.keys(B)])) {
      const o = O[p] && O[p].sha, a = A[p] && A[p].sha, b = B[p] && B[p].sha;
      let r;
      if (a === b) r = a; else if (o === a) r = b; else if (o === b) r = a;
      else {
        const to = o ? blobText(o) : "", ta = a ? blobText(a) : null, tb = b ? blobText(b) : null;
        const m = ta != null && tb != null && to != null ? merge3(to, ta, tb) : { conflict: true };
        if (m.conflict) { conflicts.push(p); continue; }
        r = putBlob(Buffer.from(m.text, "utf8"));
      }
      if (r) out[p] = { sha: r, mode: "100644" };
    }
    return { tree: putTree(out), conflicts };
  }

  // ---------- control API (tests) ----------
  const control = {
    reset(args = {}) {
      const users = {};
      let id = 1000;
      for (const [tok, u] of Object.entries(args.users || opts.users)) users[tok] = Object.assign({ id: ++id, name: u.login, push: true, expired: false, issues: true, checks: true }, u);
      st = { owner: args.owner || opts.owner, repo: args.repo || opts.repo, base: args.base || opts.base,
        objects: new Map(), refs: new Map(), forks: new Map(), pulls: [], issues: [], checks: new Map(), users, requests: [], rules: [], counter: 0, issueCounter: 0 };
      st.refs.set(st.base, putCommit({ tree: putTree({}), parents: [], message: "Initial commit", login: st.owner }));
      return { ok: true };
    },
    // add or change a token → user mapping: { token, login, name, push, expired, issues, checks }
    // issues: false / checks: false = the token lacks that permission → 403 on those endpoints; issues: "read" = may
    // list issues but not assign them
    setUser({ token, ...u }) {
      const old = st.users[token] || { id: 2000 + Object.keys(st.users).length, push: true, expired: false, issues: true, checks: true };
      st.users[token] = Object.assign({}, old, u, { name: u.name || old.name || u.login || old.login });
      return userJson(st.users[token]);
    },
    // fork of the repository for a user: own branches, starting with a copy of the base branch (GitHub's default)
    createFork({ login }) {
      const full = login + "/" + st.repo;
      if (!st.forks.has(full)) st.forks.set(full, { owner: login, full, refs: new Map([[st.base, st.refs.get(st.base)]]) });
      return st.forks.get(full);
    },
    // someone commits on a fork branch (e.g. its main, so the fork can't be fast-forwarded any more) → { sha }
    forkCommit({ login, branch, files, message }) {
      const f = st.forks.get(login + "/" + st.repo);
      if (!f) throw new ApiError(404, "no fork for " + login);
      const b = branch || st.base, parent = f.refs.get(b);
      const tree = Object.assign({}, treeFiles(parent));
      for (const [pp, v] of Object.entries(files || {})) { if (v === null) delete tree[pp]; else tree[pp] = { sha: putBlob(toBuffer(v)), mode: "100644" }; }
      const sha = putCommit({ tree: putTree(tree), parents: [parent], message: message || "Änderung im Fork", login });
      f.refs.set(b, sha);
      return { sha };
    },
    // branches of a fork → { name: sha } (null if the fork doesn't exist)
    forkBranches({ login }) {
      const f = st.forks.get(login + "/" + st.repo);
      if (!f) return null;
      const out = {}; for (const [k, v] of f.refs) out[k] = v; return out;
    },
    expireToken({ token }) { if (!st.users[token]) throw new ApiError(404, "unknown token"); st.users[token].expired = true; return { ok: true }; },
    // files on the base branch: { files: { path: text | {base64} }, fromDir: { root, paths: [file or folder, …] } }
    seed({ files = {}, fromDir, message, login } = {}) {
      const all = Object.assign({}, files);
      if (fromDir) for (const p of fromDir.paths) readDir(fromDir.root, p, all);
      return { sha: commitChanges(st.base, all, { login: login || st.owner, message: message || "Seed" }) };
    },
    // someone else commits: { branch, from (if the branch is new), files: { path: content | null }, login, message }
    commit({ branch, from, files, login, message }) {
      return { sha: commitChanges(branch || st.base, files || {}, { login, message, from }), branch: branch || st.base };
    },
    createBranch({ name, from, sha }) {
      if (st.refs.has(name)) throw new ApiError(422, "Reference already exists");
      const s = sha || resolve(from); if (!s) throw new ApiError(422, "Object does not exist");
      st.refs.set(name, s); return { name, sha: s };
    },
    // force-move a branch (e.g. someone force-pushed): { name, sha | from }
    moveBranch({ name, sha, from }) {
      const s = sha || resolve(from); if (!s) throw new ApiError(422, "Object does not exist");
      st.refs.set(name, s); return { name, sha: s };
    },
    // like GitHub: deleting the head branch of an open pull request closes it
    deleteBranch({ name }) {
      if (!st.refs.has(name)) throw new ApiError(422, "Reference does not exist");
      st.pulls.forEach((p) => { if (p.state === "open" && p.head.ref === name) { pullHeadSha(p); p.state = "closed"; p.closed_at = new Date().toISOString(); } });
      st.refs.delete(name); return { ok: true };
    },
    // { head, base, title, body, login, headRepo ("someone/ifsmb.de" = from a fork), draft, createdAt (ISO), labels }
    openPull({ head, base, title, body, login, headRepo, draft, createdAt, labels }) {
      const user = findUser(login || st.owner) || { login: login || st.owner, id: 1 };
      return pullJson(openPullInternal({ head, base, title, body, user, headRepo, draft, createdAt, labels }));
    },
    // change a pull request: { number, draft?, title?, body?, labels?, mergeable? (true | false | null = "still
    // computing"), mergeableState? ("clean" | "dirty" | "behind" | "blocked" | "unstable" | "unknown") } – without
    // mergeable/mergeableState GET /pulls/:n computes them (conflict → dirty, failing checks → unstable, else clean)
    setPull({ number, ...ch }) {
      const pr = getPull(number);
      for (const k of ["draft", "title", "body", "labels"]) if (k in ch) pr[k] = ch[k];
      if ("mergeable" in ch) pr.mergeableOverride = ch.mergeable;
      if ("mergeableState" in ch) pr.mergeableStateOverride = ch.mergeableState;
      return pullJson(pr);
    },
    // checks of a commit: { number (its head) | ref | sha, checkRuns: [{ name, status: "queued" | "in_progress" |
    // "completed", conclusion: "success" | "failure" | … }], statuses: [{ context, state: "success" | "failure" |
    // "error" | "pending", description }] } – replaces the earlier checks of that commit
    setChecks({ number, ref, sha, checkRuns = [], statuses = [] }) {
      const s = checkSha({ number, ref, sha });
      st.checks.set(s, { checkRuns: checkRuns.map((c, i) => Object.assign({ id: 9000 + i, status: "completed", conclusion: "success" }, c)),
        statuses: statuses.map((x) => Object.assign({ state: "success", description: "" }, x)) });
      return { sha: s };
    },
    // { title, body, login, labels: [name | { name, color }], assignees: [login], createdAt } → issue JSON
    openIssue({ title, body, login, labels, assignees, createdAt }) {
      const now = createdAt || new Date().toISOString();
      const who = (l) => findUser(l) || { login: l, id: 3000 + l.length };
      const i = { number: ++st.issueCounter, title: title || "Aufgabe", body: body || "", state: "open", user: who(login || st.owner),
        labels: labels || [], assignees: (assignees || []).map(who), created_at: now, updated_at: now };
      st.issues.push(i);
      return issueJson(i);
    },
    closeIssue({ number }) {
      const i = st.issues.find((x) => x.number === Number(number)); if (!i) throw new ApiError(404, "Not Found");
      i.state = "closed"; i.closed_at = new Date().toISOString(); return issueJson(i);
    },
    // { number, method: "merge" | "squash", deleteBranch, login }
    mergePull({ number, method = "merge", deleteBranch = false, login }) {
      const pr = getPull(number);
      if (pr.state !== "open") throw new ApiError(405, "Pull Request is not mergeable");
      const head = pullHeadSha(pr), base = st.refs.get(pr.base.ref);
      const files = pullFiles(pr);
      const m = mergedTree(base, head);
      if (m.conflicts.length) throw new ApiError(405, "Pull Request is not mergeable", { conflicts: m.conflicts });
      const sha = putCommit({ tree: m.tree, parents: method === "squash" ? [base] : [base, head],
        message: method === "squash" ? pr.title + " (#" + pr.number + ")" : "Merge pull request #" + pr.number + " from " + pr.head.ref, login: login || st.owner });
      st.refs.set(pr.base.ref, sha);
      Object.assign(pr, { state: "closed", merged_at: new Date().toISOString(), closed_at: new Date().toISOString(), merge_commit_sha: sha, filesSnapshot: files });
      if (deleteBranch && st.refs.has(pr.head.ref)) st.refs.delete(pr.head.ref);
      return { sha, merged: true, message: "Pull Request successfully merged" };
    },
    closePull({ number }) { const pr = getPull(number); pullHeadSha(pr); pr.state = "closed"; pr.closed_at = new Date().toISOString(); return pullJson(pr); },
    reopenPull({ number }) { const pr = getPull(number); pr.state = "open"; pr.closed_at = null; return pullJson(pr); },
    // failure/delay injection for the API (not the control API):
    // { method, path (RegExp source, matched against the path incl. query), nth = 1 (fire from the nth match on),
    //   times = 1, status (default 500, or none if only delayMs is given), message, delayMs,
    //   run: { op: "<control method>", args } – runs that control method when the rule fires (e.g. a commit "meanwhile") }
    fail(rule) {
      const r = Object.assign({ nth: 1, times: 1, seen: 0, fired: 0 }, rule);
      if (r.status === undefined) r.status = r.delayMs || r.run ? 0 : 500;
      st.rules.push(r); return { rules: st.rules.length };
    },
    clearFailures() { st.rules = []; return { ok: true }; },
    requests({ since = 0 } = {}) { return st.requests.slice(Number(since)); },
    clearRequests() { st.requests = []; return { ok: true }; },
    // a file on a branch/commit → { path, ref, sha, text (utf-8, null for binary), base64, size } or null
    readFile({ ref, path: p }) {
      const c = resolve(ref); if (!c) return null;
      const f = treeFiles(c)[p]; if (!f) return null;
      const data = obj(f.sha, "blob").data;
      return { path: p, ref: ref || st.base, sha: f.sha, size: data.length, text: isText(data) ? data.toString("utf8") : null, base64: data.toString("base64") };
    },
    listFiles({ ref, prefix = "" } = {}) {
      const c = resolve(ref); if (!c) return null;
      return Object.keys(treeFiles(c)).filter((p) => p.startsWith(prefix));
    },
    // commits of a branch, newest first: [{ sha, message, login, parents }]
    log({ ref, limit = 20 } = {}) {
      const out = []; let s = resolve(ref);
      while (s && out.length < limit) { const c = obj(s, "commit"); out.push({ sha: s, message: c.message, login: c.login, parents: c.parents }); s = c.parents[0]; }
      return out;
    },
    state() {
      const branches = {}; for (const [k, v] of st.refs) branches[k] = v;
      return {
        owner: st.owner, repo: st.repo, base: st.base, branches, forks: [...st.forks.keys()],
        pulls: st.pulls.map((pr) => Object.assign(pullJson(pr), {
          login: pr.user.login, merged: !!pr.merged_at, commits: pullCommits(pr).length,
          files: pullFiles(pr).map((f) => ({ filename: f.filename, status: f.status, previous_filename: f.previous_filename, additions: f.additions, deletions: f.deletions }))
        })),
        issues: st.issues.map((i) => Object.assign(issueJson(i), { assignees: i.assignees.map((a) => a.login), labels: labelsJson(i.labels).map((l) => l.name) })),
        requests: st.requests.length
      };
    },
    // merge would conflict? { number } → { mergeable, conflicts }
    mergeable({ number }) {
      const pr = getPull(number);
      if (pr.state !== "open") return { mergeable: false, conflicts: [] };
      const m = mergedTree(st.refs.get(pr.base.ref), pullHeadSha(pr));
      return { mergeable: !m.conflicts.length, conflicts: m.conflicts };
    }
  };
  function readDir(root, rel, into) {
    const abs = path.join(root, rel), s = fs.statSync(abs);
    if (s.isDirectory()) { for (const n of fs.readdirSync(abs)) if (!n.startsWith(".")) readDir(root, path.posix.join(rel, n), into); }
    else into[rel.split(path.sep).join("/")] = fs.readFileSync(abs);
  }

  // ---------- REST API ----------
  function decodePath(s) { return s.split("/").map(decodeURIComponent).join("/"); }
  function needUser(req) { if (!req.user) throw new ApiError(401, "Requires authentication"); return req.user; }
  function needPush(req) {
    const u = needUser(req);
    if (req.forkOwner) return u; // writing objects for the caller's own fork (forkRoute)
    if (!u.push) throw new ApiError(403, "Resource not accessible by personal access token");
    // a fine-grained token only reaches its owner's repositories – a collaborator's role doesn't help (like GitHub)
    if (u.fineGrained && u.login !== st.owner) throw new ApiError(403, "Resource not accessible by personal access token");
    return u;
  }
  function commitJson(sha) {
    const c = obj(sha, "commit"), who = { name: c.login, email: c.login + "@users.noreply.github.com", date: c.date };
    return { sha, node_id: "C_" + sha.slice(0, 12), url: url + "/repos/" + st.owner + "/" + st.repo + "/git/commits/" + sha,
      tree: { sha: c.tree }, parents: c.parents.map((p) => ({ sha: p })), message: c.message, author: who, committer: who };
  }
  function contents(p, ref) {
    const c = resolve(ref);
    if (!c) throw new ApiError(404, "No commit found for the ref " + ref);
    const files = treeFiles(c);
    p = p.replace(/^\/+|\/+$/g, "");
    if (files[p]) {
      const data = obj(files[p].sha, "blob").data;
      return { type: "file", encoding: "base64", size: data.length, name: p.split("/").pop(), path: p, sha: files[p].sha, content: wrap64(data.toString("base64")) + "\n" };
    }
    const prefix = p ? p + "/" : "", entries = new Map();
    for (const f of Object.keys(files)) {
      if (!f.startsWith(prefix)) continue;
      const rest = f.slice(prefix.length), name = rest.split("/")[0], isDir = rest.includes("/");
      if (!entries.has(name)) entries.set(name, isDir
        ? { type: "dir", name, path: prefix + name, sha: sha1("dir " + prefix + name), size: 0 }
        : { type: "file", name, path: prefix + name, sha: files[f].sha, size: obj(files[f].sha, "blob").data.length });
    }
    if (!entries.size) throw new ApiError(404, "Not Found");
    return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function route(req, method, p, q, body) {
    if (method === "GET" && p === "/user") { const u = needUser(req); return [200, Object.assign(userJson(u), { name: u.name })]; }
    const m = p.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
    if (!m) throw new ApiError(404, "Not Found");
    const fork = st.forks.get(m[1] + "/" + m[2]);
    if (fork) return forkRoute(req, method, fork, m[3] || "", q, body);
    if (m[1] !== st.owner || m[2] !== st.repo) throw new ApiError(404, "Not Found");
    const rest = m[3] || "";
    let x;
    if (method === "GET" && rest === "") {
      const u = req.user;
      return [200, Object.assign(repoJson(), { private: false, default_branch: st.base,
        permissions: { admin: false, maintain: false, push: !!(u && u.push), triage: !!(u && u.push), pull: true } })];
    }
    if (method === "GET" && rest === "/pulls") {
      const state = q.get("state") || "open", per = Math.min(+q.get("per_page") || 30, 100), page = +q.get("page") || 1;
      const list = st.pulls.filter((pr) => state === "all" || pr.state === state).sort((a, b) => b.number - a.number);
      return [200, list.slice((page - 1) * per, page * per).map(pullJson)];
    }
    if (method === "POST" && rest === "/forks") {
      const u = needUser(req);
      // a fine-grained token needs "Administration: write" (on the caller's account) to fork
      if (u.fork === false) throw new ApiError(403, "Resource not accessible by personal access token");
      return [202, forkJson(control.createFork({ login: u.login }))];
    }
    if (method === "POST" && rest === "/pulls") {
      const owner = /:/.test(String(body.head || "")) ? String(body.head).split(":")[0] : st.owner;
      const head = String(body.head || "").replace(/^[^:]+:/, "");
      if (owner !== st.owner) {
        // from a fork: anyone may open it on a public repository – but GitHub refuses fine-grained tokens of outside users
        const u = needUser(req);
        if (!u.classic && (!u.push || u.fineGrained)) throw new ApiError(403, "Resource not accessible by personal access token");
        return [201, pullJson(openPullInternal({ head, headRepo: owner + "/" + st.repo, base: body.base, title: body.title, body: body.body, user: u, draft: body.draft }))];
      }
      const u = needPush(req);
      return [201, pullJson(openPullInternal({ head, base: body.base, title: body.title, body: body.body, user: u, draft: body.draft }))];
    }
    if (method === "GET" && (x = rest.match(/^\/pulls\/(\d+)$/))) {
      const pr = getPull(x[1]), json = pullJson(pr);
      if (pr.state === "open") {
        json.mergeable = "mergeableOverride" in pr ? pr.mergeableOverride : control.mergeable({ number: pr.number }).mergeable;
        const c = checksOf(pullHeadSha(pr));
        const failing = combinedState(c.statuses) === "failure" || c.checkRuns.some((r) => r.status === "completed" && r.conclusion !== "success" && r.conclusion !== "neutral" && r.conclusion !== "skipped");
        json.mergeable_state = pr.mergeableStateOverride || (json.mergeable === null ? "unknown" : json.mergeable === false ? "dirty" : failing ? "unstable" : "clean");
      } else { json.mergeable = null; json.mergeable_state = "unknown"; }
      return [200, json];
    }
    if (method === "GET" && (x = rest.match(/^\/commits\/([^/]+)\/(check-runs|status)$/))) {
      const u = needUser(req);
      const s = resolve(decodeURIComponent(x[1]));
      if (!s) throw new ApiError(422, "No commit found for SHA: " + x[1]);
      const c = checksOf(s);
      if (x[2] === "check-runs") {
        if (u.checks === false) throw new ApiError(403, "Resource not accessible by personal access token");
        return [200, { total_count: c.checkRuns.length, check_runs: c.checkRuns.map((r) => Object.assign({ head_sha: s }, r)) }];
      }
      if (u.checks === false) throw new ApiError(403, "Resource not accessible by personal access token");
      return [200, { state: combinedState(c.statuses), sha: s, total_count: c.statuses.length, statuses: c.statuses }];
    }
    if (method === "GET" && rest === "/issues") {
      const u = needUser(req);
      if (u.issues === false) throw new ApiError(403, "Resource not accessible by personal access token");
      const state = q.get("state") || "open", per = Math.min(+q.get("per_page") || 30, 100), page = +q.get("page") || 1;
      const all = st.issues.map((i) => ({ n: i.number, state: i.state, json: () => issueJson(i) }))
        .concat(st.pulls.map((pr) => ({ n: pr.number, state: pr.state, json: () => pullAsIssueJson(pr) })))
        .filter((i) => state === "all" || i.state === state).sort((a, b) => b.n - a.n);
      return [200, all.slice((page - 1) * per, page * per).map((i) => i.json())];
    }
    if (method === "GET" && (x = rest.match(/^\/issues\/(\d+)$/))) {
      const i = st.issues.find((y) => y.number === Number(x[1]));
      if (i) return [200, issueJson(i)];
      return [200, pullAsIssueJson(getPull(x[1]))];
    }
    if (method === "POST" && (x = rest.match(/^\/issues\/(\d+)\/assignees$/))) {
      const u = needUser(req);
      if (u.issues !== true || !u.push) throw new ApiError(403, "Resource not accessible by personal access token");
      const i = st.issues.find((y) => y.number === Number(x[1]));
      if (!i) throw new ApiError(404, "Not Found");
      // like GitHub: people who may not be assigned (no write access) are silently left out
      for (const l of body.assignees || []) {
        const who = findUser(l);
        if (who && who.push && !i.assignees.some((a) => a.login === l)) i.assignees.push(who);
      }
      i.updated_at = new Date().toISOString();
      return [201, issueJson(i)];
    }
    if (method === "GET" && (x = rest.match(/^\/pulls\/(\d+)\/files$/))) {
      const per = Math.min(+q.get("per_page") || 30, 100), page = +q.get("page") || 1;
      return [200, pullFiles(getPull(x[1])).slice((page - 1) * per, page * per)];
    }
    if (method === "GET" && (x = rest.match(/^\/contents(?:\/(.*))?$/))) return [200, contents(decodePath(x[1] || ""), q.get("ref") || undefined)];
    if (method === "GET" && (x = rest.match(/^\/git\/ref\/(heads\/.+)$/))) {
      const name = decodePath(x[1]).replace(/^heads\//, "");
      if (!st.refs.has(name)) throw new ApiError(404, "Not Found");
      return [200, { ref: "refs/heads/" + name, object: { sha: st.refs.get(name), type: "commit" } }];
    }
    if (method === "GET" && (x = rest.match(/^\/git\/commits\/([0-9a-f]{40})$/))) {
      if (!obj(x[1], "commit")) throw new ApiError(404, "Not Found");
      return [200, commitJson(x[1])];
    }
    if (method === "GET" && (x = rest.match(/^\/git\/blobs\/([0-9a-f]{40})$/))) {
      const b = obj(x[1], "blob"); if (!b) throw new ApiError(404, "Not Found");
      return [200, { sha: x[1], size: b.data.length, encoding: "base64", content: wrap64(b.data.toString("base64")) }];
    }
    if (method === "POST" && rest === "/git/blobs") {
      needPush(req);
      if (typeof body.content !== "string") throw new ApiError(422, "Invalid request.\n\n\"content\" wasn't supplied.");
      const enc = body.encoding || "utf-8";
      if (enc !== "utf-8" && enc !== "base64") throw new ApiError(422, "encoding must be utf-8 or base64");
      const sha = putBlob(enc === "base64" ? Buffer.from(body.content, "base64") : Buffer.from(body.content, "utf8"));
      return [201, { sha, url: url + "/repos/" + st.owner + "/" + st.repo + "/git/blobs/" + sha }];
    }
    if (method === "POST" && rest === "/git/trees") {
      needPush(req);
      let files = {};
      if (body.base_tree) {
        const t = obj(body.base_tree, "tree");
        if (!t) throw new ApiError(422, "Invalid tree info", { errors: ["base_tree is not a valid tree oid"] });
        files = Object.assign({}, t.files);
      }
      for (const e of body.tree || []) {
        if (!e.path || /^\/|\/$|\/\//.test(e.path)) throw new ApiError(422, "Invalid tree info", { errors: ["invalid path " + e.path] });
        if (e.sha === null) { delete files[e.path]; continue; }
        let s = e.sha;
        if (e.content != null) s = putBlob(Buffer.from(String(e.content), "utf8"));
        if (!obj(s, "blob")) throw new ApiError(422, "Invalid tree info", { errors: ["tree.sha " + s + " is not a valid blob"] });
        files[e.path] = { sha: s, mode: e.mode || "100644" };
      }
      const sha = putTree(files);
      return [201, { sha, truncated: false, tree: Object.entries(obj(sha, "tree").files).map(([pp, f]) => ({ path: pp, mode: f.mode, type: "blob", sha: f.sha })) }];
    }
    if (method === "POST" && rest === "/git/commits") {
      const u = needPush(req);
      if (!obj(body.tree, "tree")) throw new ApiError(422, "Tree SHA does not exist");
      for (const pp of body.parents || []) if (!obj(pp, "commit")) throw new ApiError(422, "Parent SHA does not exist or is not a commit object");
      return [201, commitJson(putCommit({ tree: body.tree, parents: body.parents || [], message: body.message, login: u.login }))];
    }
    if (method === "POST" && rest === "/git/refs") {
      needPush(req);
      const ref = String(body.ref || "");
      if (!/^refs\/heads\/.+/.test(ref)) throw new ApiError(422, "Reference name is invalid");
      if (!obj(body.sha, "commit")) throw new ApiError(422, "Object does not exist");
      const name = ref.replace(/^refs\/heads\//, "");
      if (st.refs.has(name)) throw new ApiError(422, "Reference already exists");
      st.refs.set(name, body.sha);
      return [201, { ref, object: { sha: body.sha, type: "commit" } }];
    }
    if ((method === "PATCH" || method === "DELETE") && (x = rest.match(/^\/git\/refs\/heads\/(.+)$/))) {
      needPush(req);
      const name = decodePath(x[1]);
      if (!st.refs.has(name)) throw new ApiError(422, "Reference does not exist");
      if (method === "DELETE") { control.deleteBranch({ name }); return [204, null]; }
      if (!obj(body.sha, "commit")) throw new ApiError(422, "Object does not exist");
      if (!body.force && !isAncestor(st.refs.get(name), body.sha)) throw new ApiError(422, "Update is not a fast forward");
      st.refs.set(name, body.sha);
      st.pulls.forEach((pr) => { if (pr.state === "open" && pr.head.ref === name) { pr.headSha = body.sha; pr.updated_at = new Date().toISOString(); } });
      return [200, { ref: "refs/heads/" + name, object: { sha: body.sha, type: "commit" } }];
    }
    throw new ApiError(404, "Not Found");
  }

  // ---------- forks: own branches, objects shared with the upstream repository (like GitHub's fork network) ----------
  function forkJson(f) {
    return { full_name: f.full, name: st.repo, owner: { login: f.owner }, fork: true, default_branch: st.base, private: false,
      parent: repoJson(), source: repoJson(), permissions: { admin: true, maintain: true, push: true, triage: true, pull: true } };
  }
  function forkRoute(req, method, f, rest, q, body) {
    const u = req.user;
    const isOwner = u && u.login === f.owner;
    let x;
    if (method === "GET" && rest === "") {
      const json = forkJson(f);
      if (!isOwner) json.permissions = { admin: false, maintain: false, push: false, triage: false, pull: true };
      return [200, json];
    }
    if (method === "GET" && (x = rest.match(/^\/git\/ref\/(heads\/.+)$/))) {
      const name = decodePath(x[1]).replace(/^heads\//, "");
      if (!f.refs.has(name)) throw new ApiError(404, "Not Found");
      return [200, { ref: "refs/heads/" + name, object: { sha: f.refs.get(name), type: "commit" } }];
    }
    if (method === "GET" && /^\/git\/commits\/[0-9a-f]{40}$/.test(rest)) return route(req, method, "/repos/" + st.owner + "/" + st.repo + rest, q, body);
    if (!isOwner) { needUser(req); throw new ApiError(403, "Resource not accessible by personal access token"); }
    if (method === "POST" && rest === "/merge-upstream") {
      const b = body.branch || st.base, up = st.refs.get(b), mine = f.refs.get(b);
      if (!up) throw new ApiError(422, "Branch not found upstream");
      if (mine === up) return [200, { message: "This branch is not behind the upstream", merge_type: "none", base_branch: st.owner + ":" + b }];
      if (mine && !isAncestor(mine, up)) throw new ApiError(409, "There are merge conflicts");
      f.refs.set(b, up);
      return [200, { message: "Successfully fetched and fast-forwarded from upstream", merge_type: "fast-forward", base_branch: st.owner + ":" + b }];
    }
    if (method === "POST" && /^\/git\/(blobs|trees|commits)$/.test(rest))
      return route(Object.assign({}, req, { forkOwner: true }), method, "/repos/" + st.owner + "/" + st.repo + rest, q, body);
    if (method === "POST" && rest === "/git/refs") {
      const ref = String(body.ref || "");
      if (!/^refs\/heads\/.+/.test(ref)) throw new ApiError(422, "Reference name is invalid");
      if (!obj(body.sha, "commit")) throw new ApiError(422, "Object does not exist");
      const name = ref.replace(/^refs\/heads\//, "");
      if (f.refs.has(name)) throw new ApiError(422, "Reference already exists");
      f.refs.set(name, body.sha);
      return [201, { ref, object: { sha: body.sha, type: "commit" } }];
    }
    if (method === "PATCH" && (x = rest.match(/^\/git\/refs\/heads\/(.+)$/))) {
      const name = decodePath(x[1]);
      if (!f.refs.has(name)) throw new ApiError(422, "Reference does not exist");
      if (!obj(body.sha, "commit")) throw new ApiError(422, "Object does not exist");
      if (!body.force && !isAncestor(f.refs.get(name), body.sha)) throw new ApiError(422, "Update is not a fast forward");
      f.refs.set(name, body.sha);
      st.pulls.forEach((pr) => { if (pr.state === "open" && pr.head.repo === f.full && pr.head.ref === name) { pr.headSha = body.sha; pr.updated_at = new Date().toISOString(); } });
      return [200, { ref: "refs/heads/" + name, object: { sha: body.sha, type: "commit" } }];
    }
    throw new ApiError(404, "Not Found");
  }

  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Accept, Content-Type, X-GitHub-Api-Version, If-None-Match",
    "Access-Control-Expose-Headers": "ETag, Link, Location, X-GitHub-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
    "Access-Control-Max-Age": "86400"
  };
  function send(res, status, data) {
    const headers = Object.assign({}, CORS);
    if (data !== null && data !== undefined) headers["Content-Type"] = "application/json; charset=utf-8";
    res.writeHead(status, headers);
    res.end(data === null || data === undefined ? "" : JSON.stringify(data));
  }
  function errorBody(e) {
    return Object.assign({ message: e.message }, e.extra, { documentation_url: "https://docs.github.com/rest", status: String(e.status) });
  }
  function readBody(req) {
    return new Promise((ok) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => ok(Buffer.concat(chunks).toString("utf8"))); });
  }
  function shortBody(b) {
    if (!b || typeof b !== "object") return b;
    const c = Object.assign({}, b);
    if (typeof c.content === "string" && c.content.length > 200) c.content = c.content.slice(0, 200) + "…(" + c.content.length + ")";
    return c;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function handle(req, res) {
    const u = new URL(req.url, "http://x");
    const method = req.method;
    if (method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
    const raw = await readBody(req);
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch (e) { send(res, 400, { message: "Problems parsing JSON" }); return; }

    if (u.pathname.startsWith("/__fake/")) return handleControl(u, method, body, res);

    const auth = req.headers.authorization || "";
    const tok = (auth.match(/^(?:Bearer|token)\s+(.+)$/i) || [])[1];
    const entry = { i: st.requests.length, method, path: u.pathname + u.search, token: tok || null, login: null, status: 0, body: method === "GET" ? undefined : shortBody(body) };
    st.requests.push(entry);
    try {
      for (const r of st.rules) {
        if (r.method && r.method !== method) continue;
        if (r.path && !new RegExp(r.path).test(u.pathname + u.search)) continue;
        r.seen++;
        if (r.seen < r.nth || r.fired >= r.times) continue;
        r.fired++;
        if (r.delayMs) await sleep(r.delayMs);
        if (r.run) control[r.run.op](r.run.args || {});
        if (r.status) { entry.injected = true; throw new ApiError(r.status, r.message || "Fake failure (injected)"); }
      }
      if (tok) {
        const user = st.users[tok];
        if (!user || user.expired) throw new ApiError(401, "Bad credentials");
        req.user = user; entry.login = user.login;
      }
      const [status, data] = route(req, method, u.pathname, u.searchParams, body);
      entry.status = status;
      send(res, status, data);
    } catch (e) {
      if (!(e instanceof ApiError)) { console.error(e); e = new ApiError(500, "Fake server error: " + e.message); }
      entry.status = e.status; entry.error = e.message;
      send(res, e.status, errorBody(e));
    }
  }
  function handleControl(u, method, body, res) {
    const op = u.pathname.slice("/__fake/".length);
    const m = op.match(/^avatar\/(.+)\.svg$/);
    if (m) {
      res.writeHead(200, Object.assign({ "Content-Type": "image/svg+xml" }, CORS));
      res.end('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#888"/></svg>');
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(control, op)) { send(res, 404, { message: "unknown control method " + op }); return; }
    const args = method === "GET" ? Object.fromEntries(u.searchParams) : body;
    try { send(res, 200, control[op](args) ?? null); }
    catch (e) { send(res, e.status || 500, { message: e.message, extra: e.extra }); }
  }

  control.reset();
  return {
    control,
    get url() { return url; },
    listen(port = 0, host = "127.0.0.1") {
      server = http.createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); try { send(res, 500, { message: e.message }); } catch (_) { /* gone */ } }); });
      return new Promise((ok) => server.listen(port, host, () => { url = "http://" + host + ":" + server.address().port; ok(url); }));
    },
    close() { return new Promise((ok) => (server ? (server.closeAllConnections(), server.close(() => ok())) : ok())); }
  };
}

module.exports = { createFakeGitHub, DEFAULT_USERS };

if (require.main === module) {
  const i = process.argv.indexOf("--port");
  const fake = createFakeGitHub();
  fake.listen(i > 0 ? Number(process.argv[i + 1]) : 0).then((u) => console.log("Fake GitHub läuft auf " + u + " (Steuerung: " + u + "/__fake/state)"));
}
