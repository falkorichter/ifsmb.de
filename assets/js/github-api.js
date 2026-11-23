// Direct pull requests from the browser (prototype).
//
// The ➕/✏️ forms can create a pull request themselves instead of "copy & open GitHub's editor": with a GitHub token
// the browser talks to api.github.com directly (no server of ours in between). All files of one change – the Markdown
// file and its photos – go into ONE commit on a new branch, then a pull request against site.branch is opened.
// Nothing is ever committed to main directly.
//
// Token: for now a fine-grained personal access token (only this repository, "Contents" and "Pull requests":
// read & write). It stays in this browser: sessionStorage by default (gone when the tab closes), localStorage only
// if "auf diesem Gerät merken" is chosen. A real "Sign in with GitHub" needs a small token-exchange service –
// see PLAN_DIRECT_EDITING.md.
//
// Only works for people with write access to the repository (branch in the same repository); forks are a later step.
var GitHubApi = (function () {
  "use strict";
  var KEY = "ifsmb-github-token", API = apiBase();

  // Tests only (_tests/e2e/): localStorage "ifsmb-github-api" points the API at a local fake GitHub. Honoured only
  // when this page runs on localhost/127.0.0.1 AND the override is a local http address – so on ifsmb.de (or with a
  // stray value) the token is never sent anywhere but api.github.com.
  function apiBase() {
    var real = "https://api.github.com";
    try {
      if (typeof location === "undefined" || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return real;
      var v = localStorage.getItem("ifsmb-github-api");
      return v && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(v) ? v : real;
    } catch (e) { return real; } // storage blocked
  }

  function cfg() { return JSON.parse(document.getElementById("formular-daten").textContent); }
  function repo() { return cfg().github.replace(/^https:\/\/github\.com\//, ""); } // "owner/name"
  function baseBranch() { return cfg().branch || "main"; }

  // ---------- token ----------
  function storage(remember) { try { return remember ? localStorage : sessionStorage; } catch (e) { return null; } }
  function token() {
    try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t, remember) {
    logout();
    var s = storage(remember);
    if (s && t) s.setItem(KEY, t.trim());
  }
  function logout() {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    me = null;
  }
  function connected() { return !!token(); }
  // Page that creates a classic token with public_repo – one way for every account (#186): the owner, collaborators
  // (fine-grained tokens never reach another person's repository) and everyone else, who send through their own fork
  // (only a classic token may open a pull request from a fork via the API). Fine-grained tokens still work if pasted.
  function tokenUrl() {
    return "https://github.com/settings/tokens/new?scopes=public_repo&description=" + encodeURIComponent("ifsmb.de bearbeiten");
  }

  // UI string (assets/js/i18n.js); German fallback without it. Commit messages and PR titles stay German.
  function tr(key, params, fallback) { return typeof window !== "undefined" && window.I18n ? window.I18n.t(key, params) : fallback; }

  // ---------- requests ----------
  function call(method, path, body) {
    var t = token();
    if (!t) return Promise.reject(new Error(tr("github.not_connected", null, "Nicht mit GitHub verbunden.")));
    return fetch(API + path, {
      method: method,
      headers: { "Authorization": "Bearer " + t, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
        if (!r.ok) throw explain(r, data);
        return data;
      });
    }, function () { // fetch itself failed: offline, DNS, blocked
      throw failure("network", 0, tr("github.network", null, "Keine Verbindung zu GitHub – bitte die Internetverbindung prüfen und nochmal versuchen."));
    });
  }
  // Error with a German message and a kind the form can react to: auth (connect again), rate (wait), permission,
  // notfound, conflict (422 – e.g. branch moved or file exists), network, other. err.status = HTTP status.
  function failure(kind, status, msg) { var err = new Error(msg); err.kind = kind; err.status = status; return err; }
  function explain(r, data) {
    var gh = (data && data.message) || r.statusText || tr("github.error", null, "Fehler");
    if (r.status === 401) return failure("auth", 401, tr("github.auth", null, "Dein GitHub-Token ist abgelaufen oder ungültig. Bitte neu verbinden – deine Eingaben bleiben erhalten."));
    var remaining = r.headers.get("X-RateLimit-Remaining"), reset = +r.headers.get("X-RateLimit-Reset");
    if ((r.status === 403 || r.status === 429) && (remaining === "0" || r.headers.get("Retry-After"))) {
      var when = reset ? new Date(reset * 1000) : null;
      var hhmm = when ? String(when.getHours()).padStart(2, "0") + ":" + String(when.getMinutes()).padStart(2, "0") : "";
      return failure("rate", r.status, tr("github.rate", null, "GitHub bremst gerade (zu viele Anfragen).") + " " + (when ? tr("github.rate_until", { time: hhmm }, "Ab " + hhmm + " Uhr geht es wieder.") : tr("github.rate_later", null, "Bitte in ein paar Minuten nochmal versuchen.")));
    }
    var p = { message: gh, repo: repo(), status: r.status };
    if (r.status === 403) return failure("permission", 403, tr("github.permission", p, "Das Token darf das nicht (" + gh + "). Beim Token für " + repo() + " „Contents“ und „Pull requests“ auf „Read and write“ stellen."));
    if (r.status === 404) return failure("notfound", 404, tr("github.not_found", p, "Nicht gefunden (" + gh + ") – fehlt dem Token der Zugriff auf " + repo() + "?"));
    if (r.status === 409 || r.status === 422) return failure("conflict", r.status, tr("github.rejected", p, "GitHub hat die Änderung abgelehnt: " + gh));
    if (r.status >= 500) return failure("other", r.status, tr("github.server", p, "GitHub hat gerade ein Problem (" + r.status + "). Bitte gleich nochmal versuchen."));
    return failure("other", r.status, gh);
  }

  // Who is connected and may they push to the repository? → { login, avatar, name, canPush, fork }
  // fork = "login/name" of the person's own fork of the repository (only looked up without push access), or null.
  var me = null;
  function whoAmI() {
    if (me) return Promise.resolve(me);
    var u;
    return Promise.all([call("GET", "/user"), call("GET", "/repos/" + repo())]).then(function (r) {
      var rolePush = !!(r[1].permissions && r[1].permissions.push), owner = r[1].owner || {};
      // permissions.push is the account's role. A fine-grained token (github_pat_…) never reaches a personal repository
      // of somebody else – not even as a collaborator (403 on every write) → then it goes through the fork (#186)
      var fineGrainedForeign = /^github_pat_/.test(token() || "") && owner.type !== "Organization" && owner.login && owner.login !== r[0].login;
      u = { login: r[0].login, name: r[0].name || r[0].login, avatar: r[0].avatar_url,
        canPush: rolePush && !fineGrainedForeign, collaboratorNeedsClassic: rolePush && fineGrainedForeign, fork: null };
      if (u.canPush) return null;
      return call("GET", "/repos/" + u.login + "/" + repo().split("/")[1]).then(function (f) {
        var parent = (f.parent && f.parent.full_name) || (f.source && f.source.full_name);
        if (!f.fork || parent !== repo()) return null;
        u.fork = f.full_name;
        // behind the repository? (an outdated fork is synced before sending – but say so, #186)
        var ref = "/git/ref/heads/" + encodeURIComponent(baseBranch());
        return Promise.all([call("GET", "/repos/" + f.full_name + ref), call("GET", "/repos/" + repo() + ref)]).then(function (r) {
          u.forkBehind = r[0].object.sha !== r[1].object.sha;
        }, function () { /* unknown – no hint */ });
      }, function (err) { if (err.kind === "auth") throw err; }); // 404: no fork yet
    }).then(function () { me = u; return me; });
  }
  // Known without a request: false = connected without push access (contributions go through a fork), null = unknown.
  function canPushKnown() { return me ? me.canPush : null; }

  // The person's fork, created if needed and brought up to date with the base branch → Promise<"login/name">
  function ensureFork(step) {
    var base = baseBranch();
    return whoAmI().then(function (u) {
      if (u.fork) {
        step(tr("github.step_sync_fork", { fork: u.fork }, "Fork " + u.fork + " auf den neuesten Stand bringen …"));
        // fast-forward the fork's base branch; if that fails (diverged), the commit is built on the upstream state anyway
        return call("POST", "/repos/" + u.fork + "/merge-upstream", { branch: base }).then(function () { u.forkBehind = false; u.forkStale = false; }, function (err) {
          if (err.kind === "auth") throw err;
          u.forkStale = true; // fork's base branch couldn't be synced (own commits on it?) – the branch is built on the repository's state anyway
        }).then(function () { return u.fork; });
      }
      step(tr("github.step_create_fork", { repo: repo() }, "Eigenen Fork von " + repo() + " anlegen …"));
      return call("POST", "/repos/" + repo() + "/forks", {}).then(function (f) {
        // GitHub creates forks in the background: wait until the base branch is there (max. ~30 s)
        var tries = 0;
        function ready() {
          return call("GET", "/repos/" + f.full_name + "/git/ref/heads/" + encodeURIComponent(base)).then(function () {
            u.fork = f.full_name; return f.full_name;
          }, function (err) {
            if (err.kind !== "notfound" || ++tries > 15) throw err;
            return new Promise(function (res) { setTimeout(res, 2000); }).then(ready);
          });
        }
        return ready();
      }, function (err) {
        if (err.kind === "permission") throw failure("permission", 403, tr("github.fork_permission", { repo: repo() }, "Das Token darf keinen Fork anlegen. Entweder den Fork von " + repo() + " einmal auf GitHub anlegen („Fork“ oben rechts) oder beim Token „Administration“ auf „Read and write“ stellen."));
        throw err;
      });
    });
  }
  // GitHub's page to open the pull request by hand (fine-grained tokens may not open it from a fork via the API)
  function compareUrl(fork, branch, title, body) {
    return "https://github.com/" + repo() + "/compare/" + encodeURIComponent(baseBranch()) + "..." + fork.split("/")[0] + ":" + fork.split("/")[1] + ":"
      + branch.split("/").map(encodeURIComponent).join("/") + "?expand=1&title=" + encodeURIComponent(title || "") + "&body=" + encodeURIComponent(body || "");
  }

  // ---------- encoding ----------
  function blobToBase64(blob) {
    return new Promise(function (ok, fail) {
      var fr = new FileReader();
      fr.onload = function () { ok(String(fr.result).replace(/^data:[^,]*,/, "")); };
      fr.onerror = function () { fail(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  // Current text of a file on the base branch or on ref (or null if it doesn't exist) – to warn before overwriting newer changes.
  function readFile(path, ref) {
    return call("GET", "/repos/" + repo() + "/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(ref || baseBranch()))
      .then(function (f) {
        var bin = atob(String(f.content).replace(/\n/g, "")), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      }, function (e) { if (e.status === 404) return null; throw e; });
  }

  // File names in a folder on the base branch ([] if the folder doesn't exist yet)
  function listFolder(folder, ref) {
    var path = folder.replace(/\/$/, "").split("/").map(encodeURIComponent).join("/");
    return call("GET", "/repos/" + repo() + "/contents/" + path + "?ref=" + encodeURIComponent(ref || baseBranch()))
      .then(function (list) { return (Array.isArray(list) ? list : []).map(function (f) { return f.name; }); },
        function (e) { if (e.status === 404) return []; throw e; });
  }

  // All open pull requests with their changed files (max. 30 PRs), cached for 30 s – used for "is this page being
  // edited?", the page warning, for photo numbers already taken in open PRs and the overview /mitmachen/offen/.
  // → [{ number, title, url, branch, user, sameRepo, files: [{ filename, previous_filename, status }], draft, sha, body,
  //      createdAt, labels }]
  var pullsCache = null;
  function openPulls(fresh) {
    if (!fresh && pullsCache && Date.now() - pullsCache.at < 30000) return pullsCache.list;
    var r = "/repos/" + repo();
    var list = call("GET", r + "/pulls?state=open&per_page=50").then(function (pulls) {
      return Promise.all(pulls.slice(0, 30).map(function (pr) {
        return call("GET", r + "/pulls/" + pr.number + "/files?per_page=100").then(function (files) { return files; }, function () { return []; })
          .then(function (files) {
            return { number: pr.number, title: pr.title, url: pr.html_url, branch: pr.head.ref, user: pr.user && pr.user.login,
              sameRepo: !!(pr.head.repo && pr.head.repo.full_name === repo()), files: files,
              draft: !!pr.draft, sha: pr.head.sha, body: pr.body || "", createdAt: pr.created_at, labels: pr.labels || [] };
          });
      }));
    });
    pullsCache = { at: Date.now(), list: list };
    list.catch(function () { pullsCache = null; });
    return list;
  }
  // Open pull requests that change (or create) this file – the page's Markdown file is the indicator.
  function openPullsForFile(path, fresh) {
    return openPulls(fresh).then(function (list) {
      return list.filter(function (pr) {
        return pr.files.some(function (f) { return f.filename === path || f.previous_filename === path; });
      }).map(function (pr) {
        var f = pr.files.filter(function (x) { return x.filename === path || x.previous_filename === path; })[0];
        return { number: pr.number, title: pr.title, url: pr.url, branch: pr.branch, user: pr.user, sameRepo: pr.sameRepo, status: f.status };
      });
    });
  }
  // file names inside folder that open pull requests add (photo numbers must not collide with them)
  function namesInOpenPulls(folder) {
    var prefix = folder.replace(/\/?$/, "/");
    return openPulls().then(function (list) {
      var names = [];
      list.forEach(function (pr) { pr.files.forEach(function (f) { if (f.filename.indexOf(prefix) === 0 && f.filename.slice(prefix.length).indexOf("/") < 0) names.push(f.filename.slice(prefix.length)); }); });
      return names;
    }, function () { return []; });
  }
  // state of one pull request → { number, url, branch, state: "open" | "closed", merged }
  function getPull(number) {
    return call("GET", "/repos/" + repo() + "/pulls/" + number).then(function (pr) {
      return { number: pr.number, url: pr.html_url, branch: pr.head.ref, state: pr.state, merged: !!pr.merged };
    });
  }
  // newest commit of a branch (default: the base branch); null if the branch is gone
  function headSha(branch) {
    return call("GET", "/repos/" + repo() + "/git/ref/heads/" + (branch || baseBranch()).split("/").map(encodeURIComponent).join("/"))
      .then(function (ref) { return ref.object.sha; }, function (e) { if (e.status === 404) return null; throw e; });
  }

  // ---------- overview of open work (/mitmachen/offen/, assets/js/open-work.js) ----------
  // Can a pull request be merged? → { mergeable: true | false | null (GitHub still computing), state: "clean" |
  // "dirty" (conflict) | "behind" | "blocked" | "unstable" | "unknown" | … }
  function pullMergeState(number) {
    return call("GET", "/repos/" + repo() + "/pulls/" + number).then(function (pr) {
      return { mergeable: pr.mergeable === undefined ? null : pr.mergeable, state: pr.mergeable_state || "unknown" };
    });
  }
  // All checks of a commit: check runs (GitHub Actions) and commit statuses, as one list
  // → { readable, items: [{ name, state: "success" | "failure" | "pending" | "neutral" }] } – readable: false if the
  // token may not read them (403), so the overview can say so instead of failing completely.
  function commitChecks(sha) {
    var r = "/repos/" + repo() + "/commits/" + encodeURIComponent(sha);
    function soft(p) { return p.catch(function (e) { if (e.kind === "permission" || e.kind === "notfound") return null; throw e; }); }
    return Promise.all([soft(call("GET", r + "/check-runs?per_page=100")), soft(call("GET", r + "/status?per_page=100"))]).then(function (res) {
      var items = [];
      ((res[0] && res[0].check_runs) || []).forEach(function (c) {
        var bad = ["failure", "timed_out", "cancelled", "action_required", "startup_failure", "stale"];
        items.push({ name: c.name, state: c.status !== "completed" ? "pending" : c.conclusion === "success" ? "success"
          : bad.indexOf(c.conclusion) >= 0 ? "failure" : "neutral" });
      });
      ((res[1] && res[1].statuses) || []).forEach(function (s) {
        items.push({ name: s.context, state: s.state === "error" ? "failure" : s.state });
      });
      return { readable: !!(res[0] || res[1]), items: items };
    });
  }
  // Open issues without pull requests (GitHub lists both under /issues), newest first (max. 100)
  // → [{ number, title, url, user, createdAt, labels: [{ name, color }], assignees: [login] }]
  function openIssues() {
    return call("GET", "/repos/" + repo() + "/issues?state=open&per_page=100").then(function (list) {
      return (list || []).filter(function (i) { return !i.pull_request; }).map(function (i) {
        return { number: i.number, title: i.title, url: i.html_url, user: i.user && i.user.login, createdAt: i.created_at,
          labels: (i.labels || []).map(function (l) { return typeof l === "string" ? { name: l, color: "" } : { name: l.name, color: l.color || "" }; }),
          assignees: (i.assignees || []).map(function (a) { return a.login; }) };
      });
    });
  }
  // Assign an issue to someone ("Übernehmen") → the new list of assignees. GitHub silently ignores people who may
  // not be assigned (no write access) – the caller checks whether the login is in the result.
  function assignIssue(number, login) {
    return call("POST", "/repos/" + repo() + "/issues/" + number + "/assignees", { assignees: [login] }).then(function (i) {
      return ((i && i.assignees) || []).map(function (a) { return a.login; });
    });
  }

  function branchName(hint) {
    var d = new Date(), stamp = d.toISOString().slice(0, 19).replace(/[-:T]/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    var slug = String(hint || "aenderung").toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    return "web/" + (me ? me.login.toLowerCase() + "-" : "") + slug + "-" + stamp;
  }

  // One commit with all files on a new branch + pull request.
  // o = { title, body, files: [{ path, text } | { path, blob }], branchHint, onStep(text), parent? (commit SHA to build on) }
  // With o.pr = { number, url, branch } the commit goes on top of that open pull request's branch instead (no new PR).
  // → Promise<{ url, number, branch, updated }>
  // Without push access the branch goes to the person's own fork (created if needed, #186): o.pr then must be one of
  // their own fork branches (o.pr.fork); the pull request is opened from "login:branch", or – if GitHub refuses that
  // token – the result has no number but compareUrl, GitHub's page to open it with one click.
  function createPullRequest(o) {
    var up = "/repos/" + repo(), r = up, step = o.onStep || function () {}, base = o.pr ? o.pr.branch : baseBranch(), branch, baseSha, fork = null, u;
    return whoAmI().then(function (who) {
      u = who;
      branch = o.pr ? o.pr.branch : branchName(o.branchHint);
      if (u.canPush) return null;
      if (o.pr && !o.pr.fork) throw new Error(tr("github.fork_no_continue", { number: o.pr.number }, "Ohne Schreibrechte kannst du nicht in #" + o.pr.number + " mitschicken – bitte als eigenen Pull Request senden."));
      return ensureFork(step).then(function (f) { fork = f; r = "/repos/" + f; });
    }).then(function () {
      if (o.parent) return { object: { sha: o.parent } }; // the commit the form merged against (see neu.js direct.submit)
      step(tr("github.step_base", { branch: base }, "Stand von " + base + " holen …"));
      // a fork branch of one's own pull request lives in the fork; the base branch always comes from the repository
      return call("GET", (o.pr && fork ? r : up) + "/git/ref/heads/" + base.split("/").map(encodeURIComponent).join("/"));
    }).then(function (ref) {
      baseSha = ref.object.sha;
      return call("GET", r + "/git/commits/" + baseSha);
    }).then(function (commit) {
      var n = 0;
      // blobs one after another: keeps it simple and stays far below GitHub's secondary rate limits
      return o.files.reduce(function (p, f) {
        return p.then(function (list) {
          n++;
          step(tr("github.step_upload", { n: n, total: o.files.length }, "Datei " + n + " von " + o.files.length + " hochladen …"));
          var content = f.blob ? blobToBase64(f.blob).then(function (b) { return { content: b, encoding: "base64" }; })
            : Promise.resolve({ content: f.text, encoding: "utf-8" });
          return content.then(function (c) { return call("POST", r + "/git/blobs", c); })
            .then(function (b) { return list.concat([{ path: f.path, mode: "100644", type: "blob", sha: b.sha }]); });
        });
      }, Promise.resolve([])).then(function (tree) {
        step(tr("github.step_commit", null, "Commit anlegen …"));
        return call("POST", r + "/git/trees", { base_tree: commit.tree.sha, tree: tree });
      });
    }).then(function (tree) {
      return call("POST", r + "/git/commits", {
        message: o.title + "\n\nAngelegt über das Formular auf ifsmb.de (" + location.pathname + ").",
        tree: tree.sha, parents: [baseSha]
      });
    }).then(function (commit) {
      if (o.pr) {
        step(tr("github.step_update_pr", { number: o.pr.number }, "Pull Request #" + o.pr.number + " ergänzen …"));
        // force: false – if someone pushed to the branch meanwhile, GitHub refuses instead of losing their commit
        return call("PATCH", r + "/git/refs/heads/" + branch.split("/").map(encodeURIComponent).join("/"), { sha: commit.sha, force: false })
          .then(function () { return { pr: o.pr }; });
      }
      step(tr("github.step_branch", { branch: branch }, "Branch " + branch + " anlegen …"));
      return call("POST", r + "/git/refs", { ref: "refs/heads/" + branch, sha: commit.sha });
    }).then(function (res) {
      if (res && res.pr) return { html_url: res.pr.url, number: res.pr.number, updated: true };
      step(tr("github.step_open_pr", null, "Pull Request öffnen …"));
      return openPull({ title: o.title, body: o.body, branch: branch, fork: fork })
        .catch(function (err) { err.pendingBranch = branch; err.pendingFork = fork; throw err; }); // branch exists → finishPullRequest can carry on
    }).then(function (pr) {
      var stale = !!(fork && u.forkStale);
      if (pr.compareUrl) return { compareUrl: pr.compareUrl, branch: branch, fork: fork, forkStale: stale };
      return { url: pr.html_url, number: pr.number, branch: branch, fork: fork, forkStale: stale, updated: !!pr.updated };
    });
  }
  // POST the pull request; from a fork with a token GitHub refuses for that (fine-grained, outside collaborator):
  // → { compareUrl } instead of failing
  function openPull(o) {
    var body = { title: o.title, head: o.fork ? o.fork.split("/")[0] + ":" + o.branch : o.branch, base: baseBranch(), body: o.body || "", maintainer_can_modify: true };
    return call("POST", "/repos/" + repo() + "/pulls", body).catch(function (err) {
      if (o.fork && (err.kind === "permission" || err.kind === "notfound")) return { compareUrl: compareUrl(o.fork, o.branch, o.title, o.body) };
      throw err;
    });
  }

  // Carry on after an interrupted send: the branch with the commit exists, the pull request maybe (answer lost) or not.
  // o = { branch, title, body } → { url, number, branch } – never a second branch or a second PR (K41/K42)
  function finishPullRequest(o) {
    return openPulls(true).then(function (list) {
      var found = list.filter(function (pr) { return pr.branch === o.branch; })[0];
      if (found) return { url: found.url, number: found.number, branch: o.branch, fork: o.fork || null };
      return openPull({ title: o.title, body: o.body, branch: o.branch, fork: o.fork }).then(function (pr) {
        if (pr.compareUrl) return { compareUrl: pr.compareUrl, branch: o.branch, fork: o.fork };
        return { url: pr.html_url, number: pr.number, branch: o.branch, fork: o.fork || null };
      });
    });
  }

  return {
    token: token, setToken: setToken, logout: logout, connected: connected, tokenUrl: tokenUrl, repo: repo,
    canPushKnown: canPushKnown, ensureFork: ensureFork, compareUrl: compareUrl,
    whoAmI: whoAmI, readFile: readFile, listFolder: listFolder, openPullsForFile: openPullsForFile, openPulls: openPulls,
    namesInOpenPulls: namesInOpenPulls, getPull: getPull, headSha: headSha, createPullRequest: createPullRequest,
    finishPullRequest: finishPullRequest, pullMergeState: pullMergeState, commitChecks: commitChecks, openIssues: openIssues,
    assignIssue: assignIssue
  };
})();
if (typeof module !== "undefined") module.exports = GitHubApi;
