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
  // Page that creates a fine-grained token for this repository (fields may be pre-filled; GitHub ignores unknown ones).
  function tokenUrl() {
    var owner = repo().split("/")[0];
    return "https://github.com/settings/personal-access-tokens/new?name=" + encodeURIComponent("ifsmb.de bearbeiten")
      + "&description=" + encodeURIComponent("Pull Requests direkt von ifsmb.de aus") + "&target_name=" + encodeURIComponent(owner)
      + "&expires_in=30&contents=write&pull_requests=write&issues=write";
  }

  // ---------- requests ----------
  function call(method, path, body) {
    var t = token();
    if (!t) return Promise.reject(new Error("Nicht mit GitHub verbunden."));
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
      throw failure("network", 0, "Keine Verbindung zu GitHub – bitte die Internetverbindung prüfen und nochmal versuchen.");
    });
  }
  // Error with a German message and a kind the form can react to: auth (connect again), rate (wait), permission,
  // notfound, conflict (422 – e.g. branch moved or file exists), network, other. err.status = HTTP status.
  function failure(kind, status, msg) { var err = new Error(msg); err.kind = kind; err.status = status; return err; }
  function explain(r, data) {
    var gh = (data && data.message) || r.statusText || "Fehler";
    if (r.status === 401) return failure("auth", 401, "Dein GitHub-Token ist abgelaufen oder ungültig. Bitte neu verbinden – deine Eingaben bleiben erhalten.");
    var remaining = r.headers.get("X-RateLimit-Remaining"), reset = +r.headers.get("X-RateLimit-Reset");
    if ((r.status === 403 || r.status === 429) && (remaining === "0" || r.headers.get("Retry-After"))) {
      var when = reset ? new Date(reset * 1000) : null;
      return failure("rate", r.status, "GitHub bremst gerade (zu viele Anfragen)." + (when ? " Ab " + String(when.getHours()).padStart(2, "0") + ":" + String(when.getMinutes()).padStart(2, "0") + " Uhr geht es wieder." : " Bitte in ein paar Minuten nochmal versuchen."));
    }
    if (r.status === 403) return failure("permission", 403, "Das Token darf das nicht (" + gh + "). Beim Token für " + repo() + " „Contents“ und „Pull requests“ auf „Read and write“ stellen.");
    if (r.status === 404) return failure("notfound", 404, "Nicht gefunden (" + gh + ") – fehlt dem Token der Zugriff auf " + repo() + "?");
    if (r.status === 409 || r.status === 422) return failure("conflict", r.status, "GitHub hat die Änderung abgelehnt: " + gh);
    if (r.status >= 500) return failure("other", r.status, "GitHub hat gerade ein Problem (" + r.status + "). Bitte gleich nochmal versuchen.");
    return failure("other", r.status, gh);
  }

  // Who is connected and may they push to the repository? → { login, avatar, name, canPush }
  var me = null;
  function whoAmI() {
    if (me) return Promise.resolve(me);
    return Promise.all([call("GET", "/user"), call("GET", "/repos/" + repo())]).then(function (r) {
      me = { login: r[0].login, name: r[0].name || r[0].login, avatar: r[0].avatar_url,
        canPush: !!(r[1].permissions && r[1].permissions.push) };
      return me;
    });
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
  function createPullRequest(o) {
    var r = "/repos/" + repo(), step = o.onStep || function () {}, base = o.pr ? o.pr.branch : baseBranch(), branch, baseSha;
    return whoAmI().then(function (u) {
      if (!u.canPush) throw new Error("@" + u.login + " darf in " + repo() + " keine Branches anlegen (Pull Requests aus Forks kommen später).");
      branch = o.pr ? o.pr.branch : branchName(o.branchHint);
      if (o.parent) return { object: { sha: o.parent } }; // the commit the form merged against (see neu.js direct.submit)
      step("Stand von " + base + " holen …");
      return call("GET", r + "/git/ref/heads/" + base.split("/").map(encodeURIComponent).join("/"));
    }).then(function (ref) {
      baseSha = ref.object.sha;
      return call("GET", r + "/git/commits/" + baseSha);
    }).then(function (commit) {
      var n = 0;
      // blobs one after another: keeps it simple and stays far below GitHub's secondary rate limits
      return o.files.reduce(function (p, f) {
        return p.then(function (list) {
          step("Datei " + (++n) + " von " + o.files.length + " hochladen …");
          var content = f.blob ? blobToBase64(f.blob).then(function (b) { return { content: b, encoding: "base64" }; })
            : Promise.resolve({ content: f.text, encoding: "utf-8" });
          return content.then(function (c) { return call("POST", r + "/git/blobs", c); })
            .then(function (b) { return list.concat([{ path: f.path, mode: "100644", type: "blob", sha: b.sha }]); });
        });
      }, Promise.resolve([])).then(function (tree) {
        step("Commit anlegen …");
        return call("POST", r + "/git/trees", { base_tree: commit.tree.sha, tree: tree });
      });
    }).then(function (tree) {
      return call("POST", r + "/git/commits", {
        message: o.title + "\n\nAngelegt über das Formular auf ifsmb.de (" + location.pathname + ").",
        tree: tree.sha, parents: [baseSha]
      });
    }).then(function (commit) {
      if (o.pr) {
        step("Pull Request #" + o.pr.number + " ergänzen …");
        // force: false – if someone pushed to the branch meanwhile, GitHub refuses instead of losing their commit
        return call("PATCH", r + "/git/refs/heads/" + branch.split("/").map(encodeURIComponent).join("/"), { sha: commit.sha, force: false })
          .then(function () { return { pr: o.pr }; });
      }
      step("Branch " + branch + " anlegen …");
      return call("POST", r + "/git/refs", { ref: "refs/heads/" + branch, sha: commit.sha });
    }).then(function (res) {
      if (res && res.pr) return { html_url: res.pr.url, number: res.pr.number, updated: true };
      step("Pull Request öffnen …");
      return call("POST", r + "/pulls", { title: o.title, head: branch, base: base, body: o.body || "", maintainer_can_modify: true })
        .catch(function (err) { err.pendingBranch = branch; throw err; }); // branch exists → finishPullRequest can carry on
    }).then(function (pr) { return { url: pr.html_url, number: pr.number, branch: branch, updated: !!pr.updated }; });
  }

  // Carry on after an interrupted send: the branch with the commit exists, the pull request maybe (answer lost) or not.
  // o = { branch, title, body } → { url, number, branch } – never a second branch or a second PR (K41/K42)
  function finishPullRequest(o) {
    return openPulls(true).then(function (list) {
      var found = list.filter(function (pr) { return pr.branch === o.branch; })[0];
      if (found) return { url: found.url, number: found.number, branch: o.branch };
      return call("POST", "/repos/" + repo() + "/pulls", { title: o.title, head: o.branch, base: baseBranch(), body: o.body || "", maintainer_can_modify: true })
        .then(function (pr) { return { url: pr.html_url, number: pr.number, branch: o.branch }; });
    });
  }

  return {
    token: token, setToken: setToken, logout: logout, connected: connected, tokenUrl: tokenUrl, repo: repo,
    whoAmI: whoAmI, readFile: readFile, listFolder: listFolder, openPullsForFile: openPullsForFile, openPulls: openPulls,
    namesInOpenPulls: namesInOpenPulls, getPull: getPull, headSha: headSha, createPullRequest: createPullRequest,
    finishPullRequest: finishPullRequest, pullMergeState: pullMergeState, commitChecks: commitChecks, openIssues: openIssues,
    assignIssue: assignIssue
  };
})();
if (typeof module !== "undefined") module.exports = GitHubApi;
