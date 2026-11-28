// Overview of open work on GitHub (/mitmachen/offen/): open pull requests grouped by check and merge state, open
// issues split into "can be picked up" and "in progress".
//
// Only with a GitHub connection (the token of "🔑 GitHub verbinden", assets/js/github-api.js): without a token this
// script sends no request to GitHub, it only offers to connect. Merging stays on GitHub (link) for now.
//
// Requests per load: user + repository (whoAmI), the open pull requests with their files (GitHubApi.openPulls), per
// pull request its merge state and checks, and the open issues. The result is kept for a short time in sessionStorage
// ("ifsmb-open-work"), "🔄 Aktualisieren" loads it fresh.
//
// The classification (classifyPull, checkSummary, linkedIssues, groupIssues, pageFor) has no DOM dependencies and
// also runs in Node: require("./assets/js/open-work.js").
var OpenWork = (function () {
  "use strict";
  var CACHE_KEY = "ifsmb-open-work", CACHE_MS = 2 * 60 * 1000, PARALLEL = 4;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function login(s) { return String(s || "").replace(/[^\w-]/g, ""); }

  // "vor 3 Tagen" – age of an ISO date relative to now
  function age(iso, now) {
    var t = Date.parse(iso); if (isNaN(t)) return "";
    var min = Math.max(0, Math.round(((now || Date.now()) - t) / 60000));
    function n(v, one, many) { return "vor " + v + " " + (v === 1 ? one : many); }
    if (min < 1) return "gerade eben";
    if (min < 60) return n(min, "Minute", "Minuten");
    var h = Math.round(min / 60); if (h < 24) return n(h, "Stunde", "Stunden");
    var d = Math.round(h / 24); if (d < 14) return n(d, "Tag", "Tagen");
    if (d < 60) return n(Math.round(d / 7), "Woche", "Wochen");
    if (d < 730) return n(Math.round(d / 30), "Monat", "Monaten");
    return n(Math.round(d / 365), "Jahr", "Jahren");
  }

  // ---------- source file → page on the site ----------
  // pages = { "<path>": [url, title] } from #open-work-pages (every page and document of the build). Files that are
  // not built yet (new in a pull request) get their future address from the permalinks in _config.yml – the same
  // collections as the ✏️ forms (_includes/edit-buttons.html, neu.js).
  var COLLECTIONS = { _team: "/team/", _projects: "/projects/", _events: "/calendar/", _equipment: "/equipment/",
    _challenges: "/challenges/", _press: "/press/" };
  // → { url, title, isNew } | { asset: true, image } | null (no page, e.g. a script)
  function pageFor(file, pages) {
    var hit = pages && pages[file];
    if (hit) return { url: hit[0], title: hit[1] || hit[0], isNew: false };
    var m;
    if ((m = file.match(/^_posts\/(\d{4})-(\d{2})-(\d{2})-(.+)\.(md|markdown|html)$/))) return { url: "/news/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4] + "/", isNew: true };
    if ((m = file.match(/^(_[a-z]+)\/([^/]+)\.(md|markdown|html)$/)) && COLLECTIONS[m[1]]) {
      var name = m[1] === "_press" ? m[2].replace(/^\d{4}-\d{2}-\d{2}-/, "") : m[2]; // presse uses :slug (no date)
      return { url: COLLECTIONS[m[1]] + name + "/", isNew: true };
    }
    if (/^_data\/(partner\/|partners\.yml$)/.test(file)) return { url: "/partners/", title: "Partner", isNew: false };
    if (/^_data\/(press_report\/|press_reports\.yml$)/.test(file)) return { url: "/press/", title: "Presse", isNew: false };
    if (/^todos\/todo-[^/]+\.md$/.test(file)) return { url: "/todos/", title: "Todos", isNew: false };
    if (/^assets\//.test(file)) return { asset: true, image: /\.(jpe?g|png|gif|webp|svg)$/i.test(file) };
    return null;
  }

  // ---------- classification ----------
  // checks = { readable, items: [{ name, state }] } (GitHubApi.commitChecks)
  // → { state: "success" | "failure" | "pending" | "none" | "unknown", failing: [names], pending: [names], total }
  function checkSummary(checks) {
    if (!checks || !checks.readable) return { state: "unknown", failing: [], pending: [], total: 0 };
    var failing = [], pending = [];
    checks.items.forEach(function (c) {
      if (c.state === "failure" && failing.indexOf(c.name) < 0) failing.push(c.name);
      if (c.state === "pending" && pending.indexOf(c.name) < 0) pending.push(c.name);
    });
    var state = !checks.items.length ? "none" : failing.length ? "failure" : pending.length ? "pending" : "success";
    return { state: state, failing: failing, pending: pending, total: checks.items.length };
  }
  // pr = { draft, checks, merge: { mergeable, state } } → "draft" | "failing" | "running" | "ready"
  function classifyPull(pr) {
    if (pr.draft) return "draft";
    var c = checkSummary(pr.checks), m = pr.merge || {};
    if (c.state === "failure" || m.mergeable === false || m.state === "dirty" || m.state === "behind") return "failing";
    if (c.state === "pending" || c.state === "unknown" || m.mergeable == null) return "running";
    return "ready";
  }
  // issue numbers a pull request description refers to: "Closes #12", "Fixes #3, #4", "Teil von #129", "Part of #7"
  // → [{ number, closes }]
  var LINK_RE = /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?|schlie(?:ß|ss)t|teil von|part of|refs?)\b\s*:?\s*((?:#\d+(?:\s*(?:,|und|and|&)\s*)?)+)/gi;
  function linkedIssues(body) {
    var out = [], m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(String(body || "")))) {
      var closes = !/^(teil von|part of|refs?)$/i.test(m[1]);
      (m[2].match(/#\d+/g) || []).forEach(function (n) {
        var num = +n.slice(1), old = out.filter(function (x) { return x.number === num; })[0];
        if (old) old.closes = old.closes || closes; else out.push({ number: num, closes: closes });
      });
    }
    return out;
  }
  // issues + pulls → issues with linkedPulls [{ number, title, url, closes }] and group "pickable" | "in-progress"
  function groupIssues(issues, pulls) {
    return issues.map(function (i) {
      var linked = [];
      pulls.forEach(function (pr) {
        linkedIssues(pr.body).forEach(function (l) {
          if (l.number === i.number) linked.push({ number: pr.number, title: pr.title, url: pr.url, closes: l.closes });
        });
      });
      return Object.assign({}, i, { linkedPulls: linked, group: i.assignees.length || linked.length ? "in-progress" : "pickable" });
    });
  }

  // ---------- loading ----------
  // run fn over list with at most n requests at the same time → results in order
  function eachLimited(list, n, fn) {
    var i = 0, out = new Array(list.length);
    function next() {
      if (i >= list.length) return Promise.resolve();
      var k = i++;
      return fn(list[k]).then(function (r) { out[k] = r; return next(); });
    }
    var workers = [];
    for (var w = 0; w < Math.min(n, list.length); w++) workers.push(next());
    return Promise.all(workers).then(function () { return out; });
  }
  function readCache(repo, who) {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (c && c.repo === repo && c.login === who && Date.now() - c.at < CACHE_MS) return c;
    } catch (e) { /* storage blocked or broken */ }
    return null;
  }
  function writeCache(data) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* full or blocked */ } }
  function dropCache() { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* blocked */ } }

  // → { at, repo, login, canPush, pulls: [… + merge, checks], issues }
  function load(fresh) {
    var api = window.GitHubApi;
    return api.whoAmI().then(function (me) {
      var cached = !fresh && readCache(api.repo(), me.login);
      if (cached) return cached;
      return Promise.all([api.openPulls(fresh), api.openIssues()]).then(function (res) {
        return eachLimited(res[0], PARALLEL, function (pr) {
          var merge = api.pullMergeState(pr.number).catch(function (e) {
            if (e.kind === "notfound") return { mergeable: null, state: "unknown" }; throw e;
          });
          return Promise.all([merge, pr.sha ? api.commitChecks(pr.sha) : Promise.resolve(null)]).then(function (r) {
            // the file patches are not needed here – keep the cache small
            var files = pr.files.map(function (f) { return { filename: f.filename, previous_filename: f.previous_filename, status: f.status }; });
            return Object.assign({}, pr, { files: files, merge: r[0], checks: r[1] });
          });
        }).then(function (pulls) {
          var data = { at: Date.now(), repo: api.repo(), login: me.login, canPush: me.canPush, pulls: pulls, issues: res[1] };
          writeCache(data);
          return data;
        });
      });
    });
  }

  // ---------- rendering ----------
  var PULL_GROUPS = [
    ["ready", "✅ Bereit zum Mergen", "Kein Entwurf, alle Checks grün, kein Konflikt – durchsehen und auf GitHub mergen."],
    ["failing", "❌ Checks rot / Konflikt", "Ein Check ist fehlgeschlagen, der Branch hat einen Konflikt mit main oder ist hinter main."],
    ["running", "⏳ Checks laufen", "Die Checks laufen noch (oder GitHub prüft noch auf Konflikte) – gleich nochmal aktualisieren."],
    ["draft", "📝 Entwürfe", "Als Entwurf markiert – noch nicht fertig zum Durchsehen."]
  ];
  var ISSUE_GROUPS = [
    ["pickable", "🙋 Kann übernommen werden", "Niemand zugewiesen und kein offener Pull Request dazu."],
    ["in-progress", "🛠️ In Arbeit", "Jemand ist zugewiesen oder ein offener Pull Request gehört dazu."]
  ];

  function checkBadge(pr) {
    var c = checkSummary(pr.checks), m = pr.merge || {}, parts = [];
    if (c.state === "failure") parts.push('<span class="open-work-badge" data-check-state="failure">❌ Fehlgeschlagen: ' + c.failing.map(esc).join(", ") + "</span>");
    else if (c.state === "pending") parts.push('<span class="open-work-badge" data-check-state="pending">⏳ Läuft: ' + c.pending.map(esc).join(", ") + "</span>");
    else if (c.state === "success") parts.push('<span class="open-work-badge" data-check-state="success">✅ ' + (c.total === 1 ? "1 Check" : c.total + " Checks") + " grün</span>");
    else if (c.state === "none") parts.push('<span class="open-work-badge" data-check-state="none">Keine Checks</span>');
    else parts.push('<span class="open-work-badge" data-check-state="unknown" title="Dem Token fehlt die Leseberechtigung für Checks/Commit-Status">❔ Checks nicht lesbar</span>');
    if (m.mergeable === false || m.state === "dirty") parts.push('<span class="open-work-badge" data-merge-state="dirty">⚔️ Konflikt mit main</span>');
    else if (m.state === "behind") parts.push('<span class="open-work-badge" data-merge-state="behind">↩️ Hinter main</span>');
    else if (m.mergeable == null) parts.push('<span class="open-work-badge" data-merge-state="unknown">⏳ GitHub prüft auf Konflikte</span>');
    else if (m.state === "blocked") parts.push('<span class="open-work-badge" data-merge-state="blocked">🔒 Wartet auf Freigabe</span>');
    return parts.join(" ");
  }
  function pagesHtml(pr, pages) {
    var seen = {}, out = [], images = 0, other = 0, rest = [];
    pr.files.forEach(function (f) {
      var p = pageFor(f.filename, pages);
      if (p && p.asset) { if (p.image) images++; else other++; return; }
      if (!p) { rest.push(f.filename); return; }
      if (seen[p.url]) return; seen[p.url] = true;
      if (p.isNew || f.status === "added") out.push('<span class="open-work-page-new">neu: <code>' + esc(p.url) + "</code></span>");
      else out.push('<a href="' + esc(p.url) + '">' + esc(p.title) + "</a>" + (f.status === "removed" ? " (gelöscht)" : ""));
    });
    rest.slice(0, 3).forEach(function (r) { out.push("<code>" + esc(r) + "</code>"); });
    if (rest.length > 3) other += rest.length - 3;
    if (images) out.push(images === 1 ? "📷 1 Bild" : "📷 " + images + " Bilder");
    if (other) out.push(other === 1 ? "1 weitere Datei" : other + " weitere Dateien");
    return out.length ? '<div class="open-work-pages">' + (out.length > 1 ? "Seiten/Dateien: " : "Seite: ") + out.join(", ") + "</div>" : "";
  }
  // the files of a pull request that a ✏️ form can open (same folders as TYPEN in neu.js)
  var FORM_FILE = /^(_posts|_projects|_events|_equipment|_challenges|_team|_press|_data\/partner|_data\/press_report)\/[^/]+\.(md|markdown|html|ya?ml)$/;
  function formFiles(pr) {
    return (pr.files || []).filter(function (x) { return x.status !== "removed" && FORM_FILE.test(x.filename); }).map(function (x) { return x.filename; });
  }
  function pullItem(pr, pages, issuesByNumber, canPush) {
    // one file (a new resource, the usual case): one button; several: one per file to choose from
    var files = pr.sameRepo && canPush ? formFiles(pr).slice(0, 8) : [];
    var actions = files.length ? '<div class="open-work-actions">' + files.map(function (file) {
      return '<button type="button" class="btn btn-small" data-pr-edit="' + pr.number + '" data-path="' + esc(file) + '" title="' + esc(file) + '">✏️ '
        + (files.length === 1 ? "Im Formular weiterarbeiten" : esc(file.split("/").pop())) + "</button>";
    }).join(" ") + ' <span class="open-work-claim-status small" data-pr-edit-status aria-live="polite"></span></div>' : "";
    var links = linkedIssues(pr.body).map(function (l) {
      var i = issuesByNumber[l.number];
      return (l.closes ? "schließt " : "Teil von ") + (i ? '<a href="' + esc(i.url) + '" target="_blank" rel="noopener">#' + l.number + " " + esc(i.title) + "</a>" : "#" + l.number);
    });
    return '<li class="open-work-item" data-pull="' + pr.number + '">'
      + '<div class="open-work-title"><a href="' + esc(pr.url) + '" target="_blank" rel="noopener"><span class="open-work-number">#' + pr.number + "</span> " + esc(pr.title) + "</a></div>"
      + '<div class="open-work-meta">' + (pr.user ? "von @" + esc(login(pr.user)) + " · " : "") + esc(age(pr.createdAt))
      + (pr.sameRepo ? "" : " · aus einem Fork") + " · " + checkBadge(pr) + "</div>"
      + pagesHtml(pr, pages)
      + (links.length ? '<div class="open-work-meta">Aufgabe: ' + links.join(", ") + "</div>" : "")
      + actions + "</li>";
  }
  function labelChip(l) {
    var color = /^[0-9a-f]{6}$/i.test(l.color) ? "#" + l.color : "";
    return '<span class="open-work-label"' + (color ? ' style="--label-color: ' + color + '"' : "") + ">" + esc(l.name) + "</span>";
  }
  function issueItem(i, data) {
    var meta = [(i.user ? "von @" + esc(login(i.user)) + " · " : "") + esc(age(i.createdAt))];
    if (i.assignees.length) meta.push("Zuständig: " + i.assignees.map(function (a) { return "@" + esc(login(a)); }).join(", "));
    if (i.linkedPulls.length) meta.push("PR: " + i.linkedPulls.map(function (p) {
      return '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">#' + p.number + "</a>" + (p.closes ? "" : " (Teil)");
    }).join(", "));
    var claim = i.group === "pickable" && data.canPush
      ? '<div class="open-work-actions"><button type="button" class="btn btn-small btn-ghost" data-claim="' + i.number + '">🙋 Übernehmen</button> <span class="open-work-claim-status small" data-claim-status aria-live="polite"></span></div>' : "";
    return '<li class="open-work-item" data-issue="' + i.number + '">'
      + '<div class="open-work-title"><a href="' + esc(i.url) + '" target="_blank" rel="noopener"><span class="open-work-number">#' + i.number + "</span> " + esc(i.title) + "</a>"
      + (i.labels.length ? " " + i.labels.map(labelChip).join(" ") : "") + "</div>"
      + '<div class="open-work-meta">' + meta.join(" · ") + "</div>" + claim + "</li>";
  }
  function group(id, title, hint, items, kind) {
    return '<section class="open-work-group" data-group="' + id + '" id="' + kind + "-" + id + '">'
      + "<h3>" + esc(title) + ' <span class="open-work-count">' + items.length + "</span></h3>"
      + '<p class="muted small">' + esc(hint) + "</p>"
      + (items.length ? '<ul class="open-work-list">' + items.join("") + "</ul>" : '<p class="open-work-empty muted small">– nichts –</p>')
      + "</section>";
  }
  function render(data, el, pages) {
    var byNumber = {};
    var issues = groupIssues(data.issues, data.pulls);
    issues.forEach(function (i) { byNumber[i.number] = i; });
    var pulls = data.pulls.map(function (pr) { return Object.assign({ group: classifyPull(pr) }, pr); });
    var time = new Date(data.at), stamp = String(time.getHours()).padStart(2, "0") + ":" + String(time.getMinutes()).padStart(2, "0");
    el.querySelector("[data-open-work-who]").innerHTML = "Verbunden als <strong>@" + esc(login(data.login)) + "</strong>";
    el.querySelector("[data-open-work-stamp]").textContent = "Stand: " + stamp + " Uhr";
    el.querySelector("[data-open-work-content]").innerHTML =
      '<nav class="equipment-jump"><a href="#pull-requests">Pull Requests (' + pulls.length + ')</a> · <a href="#aufgaben">Aufgaben (' + issues.length + ")</a></nav>"
      + '<h2 id="pull-requests">Pull Requests</h2>'
      + '<p class="muted small">Gemergt wird (noch) auf GitHub: Pull Request öffnen, Änderungen durchsehen, „Merge“.' + (pulls.length >= 30 ? " Es werden höchstens 30 offene Pull Requests angezeigt." : "") + "</p>"
      + PULL_GROUPS.map(function (g) {
        return group(g[0], g[1], g[2], pulls.filter(function (p) { return p.group === g[0]; }).map(function (p) { return pullItem(p, pages, byNumber, data.canPush); }), "pulls");
      }).join("")
      + '<h2 id="aufgaben">Aufgaben</h2>'
      + '<p class="muted small">Offene <a href="https://github.com/' + esc(data.repo) + '/issues" target="_blank" rel="noopener">Issues auf GitHub</a> – ohne Pull Requests. Wer eine Aufgabe anpackt, trägt sich ein und verweist im Pull Request mit „Closes #N“ oder „Teil von #N“ darauf.</p>'
      + ISSUE_GROUPS.map(function (g) {
        return group(g[0], g[1], g[2], issues.filter(function (i) { return i.group === g[0]; }).map(function (i) { return issueItem(i, data); }), "issues");
      }).join("");
  }

  // ---------- page ----------
  function init(root) {
    var intro = root.querySelector("[data-open-work-intro]"), body = root.querySelector("[data-open-work-body]");
    var connectBtn = intro.querySelector("[data-open-work-connect]"), pages = {}, current = null;
    try { pages = JSON.parse(document.getElementById("open-work-pages").textContent); } catch (e) { pages = {}; }
    body.innerHTML = '<div class="open-work-bar"><span data-open-work-who></span>'
      + '<button type="button" class="btn btn-small" data-open-work-refresh>🔄 Aktualisieren</button>'
      + '<span class="muted small" data-open-work-stamp></span>'
      + '<button type="button" class="btn btn-small btn-ghost" data-open-work-connect>🔑 Verbindung</button></div>'
      + '<p class="open-work-status" data-open-work-status role="status" aria-live="polite"></p>'
      + '<div data-open-work-content></div>';
    var status = body.querySelector("[data-open-work-status]");

    function connect() {
      window.ladeSkripte(["formular.js", "neu.js"]).then(function () { return window.NeuFormular.connect(); })
        .then(function (dlg) { dlg.addEventListener("close", function () { start(false); }, { once: true }); })
        .catch(function () { status.textContent = "⚠️ Das Verbinden-Fenster ließ sich nicht laden – bitte die Seite neu laden."; });
    }
    function showStatus(text, kind) { status.textContent = text; status.setAttribute("data-kind", kind || ""); }
    function start(fresh) {
      var on = window.GitHubApi && window.GitHubApi.connected();
      intro.hidden = !!on; connectBtn.hidden = !!on; body.hidden = !on;
      if (!on) { dropCache(); return; }
      var refresh = body.querySelector("[data-open-work-refresh]");
      refresh.disabled = true;
      showStatus(fresh ? "Lade neu von GitHub …" : "Lade von GitHub …", "busy");
      return load(fresh).then(function (data) {
        current = data;
        render(data, body, pages);
        showStatus("", "");
      }, function (err) {
        showStatus("⚠️ " + err.message, err.kind || "other");
        if (err.kind === "auth") { intro.hidden = false; connectBtn.hidden = false; }
      }).then(function () { refresh.disabled = false; });
    }
    function claim(btn) {
      var n = +btn.getAttribute("data-claim"), out = btn.parentNode.querySelector("[data-claim-status]");
      btn.disabled = true; out.textContent = "Trage dich ein …";
      window.GitHubApi.assignIssue(n, current.login).then(function (assignees) {
        if (assignees.indexOf(current.login) < 0) {
          btn.disabled = false;
          out.textContent = "GitHub hat dich nicht eingetragen – Aufgaben übernehmen können nur Personen mit Schreibrechten auf " + current.repo + ".";
          return;
        }
        current.issues.forEach(function (i) { if (i.number === n) i.assignees = assignees; });
        writeCache(current);
        render(current, body, pages);
        showStatus("Du hast #" + n + " übernommen – sie steht jetzt unter „In Arbeit“.", "ok");
      }, function (err) {
        btn.disabled = false;
        if (err.kind === "permission" || err.kind === "notfound") {
          out.innerHTML = "Dein Token darf keine Aufgaben zuweisen. Beim Token für " + esc(current.repo) + " zusätzlich <em>Issues</em> auf „Read and write“ stellen – oder "
            + '<a href="https://github.com/' + esc(current.repo) + "/issues/" + n + '" target="_blank" rel="noopener">auf GitHub übernehmen ↗</a>.';
        } else out.textContent = "⚠️ " + err.message;
      });
    }
    // ✏️ continue a pull request in the form (neu.js NeuFormular.editPull): the file from the PR's branch, saving
    // adds a commit there – works for pages that exist only in the pull request, too
    function editPull(btn) {
      var n = +btn.getAttribute("data-pr-edit"), pr = (current.pulls || []).filter(function (p) { return p.number === n; })[0];
      var out = btn.parentNode.querySelector("[data-pr-edit-status]");
      if (!pr) return;
      btn.disabled = true; out.textContent = "Lade #" + n + " …";
      window.ladeSkripte(["formular.js", "neu.js"]).then(function () {
        return window.NeuFormular.editPull({ number: pr.number, url: pr.url, branch: pr.branch }, btn.getAttribute("data-path"));
      }).then(function () { out.textContent = ""; }, function (err) { out.textContent = "⚠️ " + ((err && err.message) || err); })
        .then(function () { btn.disabled = false; });
    }
    root.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-open-work-connect")) connect();
      else if (t.hasAttribute("data-open-work-refresh")) start(true);
      else if (t.hasAttribute("data-claim")) claim(t);
      else if (t.hasAttribute("data-pr-edit")) editPull(t);
    });
    connectBtn.hidden = false;
    return window.ladeSkripte(["github-api.js"]).then(function () { return start(false); });
  }

  if (typeof document !== "undefined") {
    var boot = function () { var root = document.getElementById("open-work"); if (root && window.ladeSkripte) init(root); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  }

  return { age: age, formFiles: formFiles, pageFor: pageFor, checkSummary: checkSummary, classifyPull: classifyPull, linkedIssues: linkedIssues, groupIssues: groupIssues };
})();
if (typeof module !== "undefined") module.exports = OpenWork;
