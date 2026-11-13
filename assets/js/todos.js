// Todo app on /todos/ – an experiment next to the Herausforderungen collection, without libraries.
// One Markdown file per person (todos/todo-<person>.md, see the comment at the top of each file):
//   ## <quadrant heading>      → Eisenhower quadrant (q1 … q4) or "Erledigt"
//   ### <title> {#id}          → one challenge; order inside a quadrant = priority
//   ```yaml … ```              → fields (kurz, art, status, seit, faellig, helfer, projekte, tags, verlinkt …)
//   free Markdown text
// Files are fetched lazily per person. Every change is written to localStorage right away;
// "Pull Request" shows a diff, copies the new file and opens the GitHub editor.
// Format of todos/todo-<person>.md: parse ⇄ serialize. Pure functions, also usable from Node for tests.
var TodoFormat = (function () {
  "use strict";
  var BUCKETS = [
    { q: "q1", name: "Sofort erledigen", icon: "🔥", sub: "wichtig · dringend", finde: /sofort|🔥/i },
    { q: "q2", name: "Einplanen", icon: "📌", sub: "wichtig · nicht dringend", finde: /einplanen|📌/i },
    { q: "q3", name: "Abgeben", icon: "🤝", sub: "nicht wichtig · dringend", finde: /abgeben|🤝/i },
    { q: "q4", name: "Später", icon: "💤", sub: "nicht wichtig · nicht dringend", finde: /später|spaeter|💤/i },
    { q: "done", name: "Erledigt", icon: "✅", sub: "", finde: /erledigt|gelöst|✅/i }
  ];
  var BUCKET = {}; BUCKETS.forEach(function (b) { BUCKET[b.q] = b; });
  var FELDER = ["kurz", "art", "status", "seit", "faellig", "geloest_am", "helfer", "projekte", "tags", "verlinkt", "quelle"];
  var LISTEN = { helfer: 1, projekte: 1, tags: 1, verlinkt: 1 };

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function slugify(s) {
    return norm(s).replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "todo";
  }

  // ---------- Markdown format ----------
  function yamlWert(v) {
    v = v.trim();
    if (v === "" || v === "~" || v === "null") return "";
    if (v[0] === "[" && v[v.length - 1] === "]") {
      var innen = v.slice(1, -1).trim();
      if (!innen) return [];
      var out = [], cur = "", q = null;
      for (var i = 0; i < innen.length; i++) {
        var c = innen[i];
        if (q) { if (c === "\\" && q === '"') { cur += innen[++i]; continue; } if (c === q) { q = null; continue; } cur += c; }
        else if (c === '"' || c === "'") q = c;
        else if (c === ",") { out.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      out.push(cur.trim());
      return out.filter(function (x) { return x !== ""; });
    }
    if (v[0] === '"' && v[v.length - 1] === '"') return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    if (v[0] === "'" && v[v.length - 1] === "'") return v.slice(1, -1).replace(/''/g, "'");
    return v;
  }
  function yamlString(s) {
    s = String(s);
    if (s === "" || /^[\s\[\]{}#&*!|>'"%@`,?:-]/.test(s) || /: | #|\s$/.test(s) || /^(true|false|null|yes|no|~|\d[\d.:-]*)$/i.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }
    return s;
  }
  function yamlListe(a) { return "[" + a.map(function (x) { return /[,\[\]"']/.test(x) || /^\s|\s$/.test(x) ? '"' + String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : x; }).join(", ") + "]"; }

  function parse(md) {
    var lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
    var res = { kopf: "", todos: [] };
    var kopf = [], q = null, t = null, text = [], i = 0;
    function abschluss() { if (t) { t.text = text.join("\n").trim(); res.todos.push(t); } t = null; text = []; }
    for (; i < lines.length; i++) {
      var l = lines[i];
      if (q === null && !t && /^\s*<!--/.test(l)) {
        // comment block at the top of the file belongs to the header, even if it mentions ## or ###
        while (i < lines.length && lines[i].indexOf("-->") < 0) kopf.push(lines[i++]);
        if (i < lines.length) kopf.push(lines[i]);
        continue;
      }
      var h2 = /^##\s+(.*)$/.exec(l), h3 = /^###\s+(.*)$/.exec(l);
      if (h3 && !/^####/.test(l)) {
        abschluss();
        var m = /^(.*?)\s*\{#([^}]+)\}\s*$/.exec(h3[1]);
        var titel = (m ? m[1] : h3[1]).trim();
        t = { id: m ? m[2].trim() : slugify(titel), titel: titel, q: q || "q4", felder: {}, text: "" };
        // optional yaml block right after the heading (blank lines allowed)
        var j = i + 1; while (j < lines.length && lines[j].trim() === "") j++;
        if (j < lines.length && /^```ya?ml\s*$/.test(lines[j])) {
          var k = j + 1;
          for (; k < lines.length && !/^```\s*$/.test(lines[k]); k++) {
            var kv = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(lines[k]);
            if (kv) t.felder[kv[1]] = yamlWert(kv[2]);
          }
          i = k;
        }
      } else if (h2) {
        abschluss();
        q = "q4";
        for (var b = 0; b < BUCKETS.length; b++) if (BUCKETS[b].finde.test(h2[1])) { q = BUCKETS[b].q; break; }
      } else if (t) text.push(l);
      else if (q === null) kopf.push(l);
    }
    abschluss();
    res.kopf = kopf.join("\n").trim();
    res.todos.forEach(function (x) {
      if (x.felder.status === "geloest") x.q = "done";
      LISTEN_KEYS.forEach(function (f) { if (x.felder[f] != null && !Array.isArray(x.felder[f])) x.felder[f] = x.felder[f] === "" ? [] : [x.felder[f]]; });
    });
    return res;
  }
  var LISTEN_KEYS = Object.keys(LISTEN);

  function serialize(doc) {
    var out = [];
    if (doc.kopf) out.push(doc.kopf, "");
    BUCKETS.forEach(function (b) {
      out.push("## " + b.icon + " " + b.name, "");
      doc.todos.filter(function (t) { return t.q === b.q; }).forEach(function (t) {
        out.push("### " + (t.titel || "Ohne Titel").replace(/\s*\{#.*$/, "") + " {#" + t.id + "}", "", "```yaml");
        var keys = FELDER.concat(Object.keys(t.felder).filter(function (k) { return FELDER.indexOf(k) < 0; }));
        keys.forEach(function (k) {
          var v = t.felder[k];
          if (v == null || v === "" || Array.isArray(v) && !v.length) return;
          out.push(k + ": " + (Array.isArray(v) ? yamlListe(v) : yamlString(v)));
        });
        out.push("```", "");
        // headings inside the text would end the challenge, so they become ####
        var text = String(t.text || "").replace(/^#{2,3}(\s)/gm, "####$1").trim();
        if (text) out.push(text, "");
      });
    });
    return out.join("\n").replace(/\n+$/, "") + "\n";
  }
  function normal(md) { return md == null ? "" : serialize(parse(md)); }

  return { BUCKETS: BUCKETS, BUCKET: BUCKET, FELDER: FELDER, LISTEN_KEYS: LISTEN_KEYS, parse: parse, serialize: serialize, normal: normal, slugify: slugify, norm: norm };
})();
if (typeof module !== "undefined") module.exports = TodoFormat;

(function () {
  "use strict";

  if (typeof document === "undefined") return;
  var dataEl = document.getElementById("todos-daten");
  if (!dataEl) return;
  var F = TodoFormat, BUCKETS = F.BUCKETS, BUCKET = F.BUCKET, LISTEN_KEYS = F.LISTEN_KEYS;
  var parse = F.parse, serialize = F.serialize, normal = F.normal, slugify = F.slugify, norm = F.norm;
  var CFG = JSON.parse(dataEl.textContent);

  // Page mode on /todos/ (#todos-app exists) or embedded mode: a button on project pages and team profiles
  // (_includes/todos-knopf.html) loads this script on click and calls TodoApp.start(); everything lives in the pop-up.
  var app = document.getElementById("todos-app");
  var EINGEBETTET = !app;
  if (!document.getElementById("todos-dialog")) {
    document.body.insertAdjacentHTML("beforeend",
      '<dialog class="todos-dialog" id="todos-dialog" aria-labelledby="todos-dialog-titel">'
      + '<div class="todos-dialog-kopf"><h2 id="todos-dialog-titel">Todo bearbeiten</h2>'
      + '<a class="todos-alle" id="todos-alle" href="' + CFG.basis + '" hidden>Alle Todos ↗</a>'
      + '<button type="button" class="btn btn-small btn-ghost" id="todos-dialog-zu" aria-label="Schließen">✕</button></div>'
      + '<div class="todos-dialog-body"><div class="todos-dialog-links" id="todos-dialog-links"></div>'
      + '<form class="todos-editor" id="todos-editor" autocomplete="off"></form></div></dialog>'
      + '<dialog class="todos-dialog todos-diff-dialog" id="todos-diff" aria-labelledby="todos-diff-titel">'
      + '<div class="todos-dialog-kopf"><h2 id="todos-diff-titel">Änderungen speichern</h2>'
      + '<button type="button" class="btn btn-small btn-ghost" data-schliessen aria-label="Schließen">✕</button></div>'
      + '<div class="todos-diff-body" id="todos-diff-body"></div></dialog>');
  }
  if (EINGEBETTET) {
    document.getElementById("todos-dialog-links").insertAdjacentHTML("afterbegin",
      '<nav class="todos-personen" id="todos-personen" aria-label="Person wählen"></nav><div class="todos-leiste" id="todos-leiste" hidden></div>');
  }
  var personenNav = document.getElementById("todos-personen");
  var leiste = document.getElementById("todos-leiste");
  var matrixPlatz = EINGEBETTET ? document.getElementById("todos-dialog-links") : document.getElementById("todos-matrix-platz");
  var alleLink = document.getElementById("todos-alle");
  var dialog = document.getElementById("todos-dialog");
  var dialogLinks = document.getElementById("todos-dialog-links");
  var editor = document.getElementById("todos-editor");
  var diffDialog = document.getElementById("todos-diff");
  var diffBody = document.getElementById("todos-diff-body");

  var STORE = "ifsmb-todos:";
  // File of a person: todos/todo-<person>.md (the prefix keeps it apart from the profile _team/<person>.md)
  function dateiname(person) { return "todo-" + person + ".md"; }
  function pfad(person) { return "todos/" + dateiname(person); }
  var ART = { aufgabe: "📋", problem: "⚠️", frage: "❓" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function heute() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function datumDE(d) { var p = String(d || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : d; }
  function storeGet(k) { try { return JSON.parse(localStorage.getItem(STORE + k) || "null"); } catch (e) { return null; } }
  // ROH remembers the raw localStorage value this tab last wrote or saw per person, to notice changes from other tabs.
  var ROH = {};
  function storeRoh(k) { try { return localStorage.getItem(STORE + k); } catch (e) { return null; } }
  function storeSet(k, v) {
    var roh = v ? JSON.stringify(v) : null;
    ROH[k] = roh;
    try { if (roh) localStorage.setItem(STORE + k, roh); else localStorage.removeItem(STORE + k); } catch (e) { /* storage blocked */ }
  }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); var n = t.content.firstChild; t.content.removeChild(n); return n; }
  var liveEl = el('<p class="visually-hidden" aria-live="polite"></p>');
  document.body.appendChild(liveEl);
  function sagen(text) { liveEl.textContent = text; }

  // ---------- people ----------
  var PERSON = {};
  CFG.personen.forEach(function (p) { PERSON[p.id] = p; });
  CFG.dateien.forEach(function (id) { if (!PERSON[id]) { PERSON[id] = { id: id, name: id, bild: "" }; CFG.personen.push(PERSON[id]); } });
  function initialen(name) { return String(name || "?").split(/[\s-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(""); }
  function avatar(id, cls) {
    var p = PERSON[id] || { id: id, name: id };
    return p.bild
      ? '<img class="todo-avatar ' + (cls || "") + '" src="' + esc(p.bild) + '" alt="" title="' + esc(p.name) + '" width="24" height="24" loading="lazy">'
      : '<span class="todo-avatar todo-avatar-text ' + (cls || "") + '" title="' + esc(p.name) + '" aria-hidden="true">' + esc(initialen(p.name)) + "</span>";
  }

  // ---------- state per person ----------
  var DOCS = {};   // person → { server: text|null, doc, konflikt }
  var FILTER = null; // embedded on a project page: { projekt, tag } – only matching todos are shown
  var NAV = null;    // person ids in the navigation (null = everyone)
  function sichtbar(t) {
    if (!FILTER) return true;
    return (t.felder.projekte || []).indexOf(FILTER.projekt) >= 0 || !!FILTER.tag && (t.felder.tags || []).indexOf(FILTER.tag) >= 0;
  }
  var aktuell = null;
  var auswahl = null; // id of the challenge in the editor

  function laden(person) {
    if (DOCS[person]) return Promise.resolve(DOCS[person]);
    var hatDatei = CFG.dateien.indexOf(person) >= 0;
    var p = hatDatei
      ? fetch(CFG.basis + encodeURIComponent(dateiname(person)), { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      : Promise.resolve(null);
    return p.then(function (server) {
      ROH[person] = storeRoh(person);
      var entwurf = storeGet(person);
      var st = { server: server, doc: null, konflikt: false };
      if (entwurf && normal(entwurf.text) === normal(server)) { storeSet(person, null); entwurf = null; }
      if (entwurf) {
        st.doc = parse(entwurf.text);
        st.konflikt = normal(entwurf.basis) !== normal(server);
      } else {
        st.doc = parse(server || "<!--\nTodos von " + (PERSON[person] ? PERSON[person].name : person) + " – wird auf /todos/ bearbeitet (Eisenhower-Matrix).\n-->");
      }
      DOCS[person] = st;
      return st;
    });
  }

  // A person without a file and without todos has nothing to save.
  function unveraendert(st) { return st.server == null ? !st.doc.todos.length : serialize(st.doc) === normal(st.server); }
  function geaendert(person) {
    var st = DOCS[person];
    if (!st) { var e = storeGet(person); return !!e; }
    return unveraendert(st) ? false : true;
  }

  // Persist right away: localStorage holds the full file text plus the server version it is based on.
  function speichern(person) {
    var st = DOCS[person];
    if (!st) return;
    var text = serialize(st.doc);
    if (unveraendert(st)) storeSet(person, null);
    else {
      var alt = storeGet(person);
      storeSet(person, { basis: alt && st.konflikt ? alt.basis : st.server, text: text, zeit: new Date().toISOString() });
    }
    renderPersonen();
    renderLeiste();
  }

  function finde(id) { return DOCS[aktuell].doc.todos.filter(function (t) { return t.id === id; })[0]; }
  function eindeutig(doc, basis, ausser) {
    var id = basis, n = 2;
    while (doc.todos.some(function (t) { return t.id === id && t !== ausser; })) id = basis + "-" + n++;
    return id;
  }

  // ---------- people navigation ----------
  function renderPersonen() {
    var liste = NAV ? NAV.map(function (id) { return PERSON[id] || { id: id, name: id }; }) : CFG.personen;
    var html = liste.map(function (p) {
      var n = DOCS[p.id] ? DOCS[p.id].doc.todos.filter(function (t) { return t.q !== "done" && sichtbar(t); }).length : null;
      var hat = CFG.dateien.indexOf(p.id) >= 0 || DOCS[p.id] && DOCS[p.id].doc.todos.length;
      var innen = avatar(p.id, "todo-avatar-gross") + "<span>" + esc(p.name) + "</span>"
        + (n ? '<sup class="todos-zahl">' + n + "</sup>" : "")
        + (geaendert(p.id) ? '<span class="todos-punkt" title="Ungespeicherte Änderungen">●</span>' : "");
      var cls = "todos-person" + (p.id === aktuell ? " aktiv" : "") + (hat ? "" : " leer");
      return EINGEBETTET
        ? '<button type="button" class="' + cls + '" data-person="' + esc(p.id) + '"' + (p.id === aktuell ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + innen + "</button>"
        : '<a href="#' + esc(p.id) + '" class="' + cls + '"' + (p.id === aktuell ? ' aria-current="page"' : "") + ">" + innen + "</a>";
    }).join("");
    personenNav.innerHTML = html;
    personenNav.hidden = EINGEBETTET && liste.length < 2;
    if (alleLink && aktuell) alleLink.href = CFG.basis + "#" + encodeURIComponent(aktuell);
  }

  personenNav.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-person]");
    if (!b) return;
    auswahl = null;
    zeige(b.getAttribute("data-person")).then(function () { renderEditor(); });
  });

  // ---------- save bar ----------
  function renderLeiste() {
    var offen = CFG.personen.filter(function (p) { return geaendert(p.id); });
    var st = DOCS[aktuell];
    if (!offen.length && !(st && st.konflikt)) { leiste.hidden = true; leiste.innerHTML = ""; return; }
    leiste.hidden = false;
    leiste.innerHTML = offen.map(function (p) {
      return '<div class="todos-leiste-zeile">' + avatar(p.id) + ' <span>Änderungen in <code>' + esc(pfad(p.id)) + '</code> – im Browser gespeichert, noch nicht auf der Website.</span>'
        + '<span class="todos-leiste-knoepfe"><button type="button" class="btn btn-small" data-pr="' + esc(p.id) + '">🔀 Ansehen &amp; Pull Request</button>'
        + '<button type="button" class="btn btn-small btn-ghost" data-verwerfen="' + esc(p.id) + '">↩️ Verwerfen</button></span></div>';
    }).join("") + (st && st.konflikt ? '<p class="todos-konflikt">⚠️ <code>' + esc(pfad(aktuell)) + '</code> hat sich auf der Website geändert, seit du hier angefangen hast. Im Diff siehst du deine Fassung gegen die aktuelle – fremde Änderungen gehen beim Einfügen verloren.</p>' : "");
  }
  leiste.addEventListener("click", function (e) {
    var pr = e.target.closest("[data-pr]"), vw = e.target.closest("[data-verwerfen]");
    if (pr) zeigeDiff(pr.getAttribute("data-pr"));
    if (vw) {
      var p = vw.getAttribute("data-verwerfen");
      if (vw.getAttribute("data-sicher") !== "1") { vw.setAttribute("data-sicher", "1"); vw.textContent = "Wirklich verwerfen?"; return; }
      storeSet(p, null); delete DOCS[p];
      laden(p).then(function () { renderAlles(); sagen("Änderungen verworfen."); });
    }
  });

  // ---------- matrix ----------
  var matrix = el('<div class="todos-matrix" id="todos-matrix"></div>');

  function karte(t) {
    var f = t.felder, helfer = f.helfer || [];
    var meta = [];
    if (f.status === "in-arbeit") meta.push('<span class="badge badge-active">In Arbeit</span>');
    if (f.faellig) meta.push('<span class="todo-faellig' + (f.faellig < heute() && t.q !== "done" ? " ueberfaellig" : "") + '">📅 ' + esc(datumDE(f.faellig)) + "</span>");
    if ((f.projekte || []).length) meta.push('<span title="Projekte">🔧' + f.projekte.length + "</span>");
    if ((f.verlinkt || []).length) meta.push('<span title="Verknüpfte Seiten">🔗' + f.verlinkt.length + "</span>");
    if (f.quelle) meta.push('<span title="Quelle: ' + esc(f.quelle) + '">🌐</span>');
    return '<li class="todo-karte' + (t.id === auswahl ? " ausgewaehlt" : "") + '" data-id="' + esc(t.id) + '" tabindex="0" role="button" aria-label="' + esc(t.titel) + ' – bearbeiten; Pfeiltasten verschieben">'
      + '<span class="todo-griff" aria-hidden="true">⠿</span>'
      + '<span class="todo-inhalt"><span class="todo-titel">' + (ART[f.art] ? '<span aria-hidden="true">' + ART[f.art] + "</span> " : "") + esc(t.titel) + "</span>"
      + (meta.length || helfer.length ? '<span class="todo-meta">' + meta.join(" ")
        + (helfer.length ? '<span class="todo-helfer" title="Helfende Hände">' + helfer.slice(0, 4).map(function (h) { return avatar(h); }).join("") + (helfer.length > 4 ? '<span class="todo-avatar todo-avatar-text">+' + (helfer.length - 4) + "</span>" : "") + "</span>" : "")
        + "</span>" : "")
      + "</span></li>";
  }

  function renderMatrix() {
    var st = DOCS[aktuell];
    if (!st) return;
    var todos = st.doc.todos.filter(sichtbar);
    var zelle = function (b) {
      var liste = todos.filter(function (t) { return t.q === b.q; });
      return '<section class="todos-zelle todos-' + b.q + '" data-q="' + b.q + '">'
        + '<h3 class="todos-zelle-titel"><span aria-hidden="true">' + b.icon + "</span> " + b.name + ' <span class="eh-count">' + liste.length + "</span>"
        + '<button type="button" class="todos-neu" data-neu="' + b.q + '" title="Neue Herausforderung in „' + b.name + '“" aria-label="Neue Herausforderung in ' + b.name + '">➕</button></h3>'
        + (b.sub ? '<p class="todos-zelle-sub">' + b.sub + "</p>" : "")
        + '<ul class="todos-liste" data-q="' + b.q + '">' + liste.map(karte).join("") + "</ul></section>";
    };
    var n = todos.filter(function (t) { return t.q === "done"; }).length;
    var offenDone = matrix.querySelector(".todos-erledigt");
    var auf = offenDone ? offenDone.open : false;
    matrix.innerHTML = '<div class="todos-grid">'
      + '<div class="todos-achse todos-achse-ecke" aria-hidden="true"></div><div class="todos-achse" aria-hidden="true">Dringend</div><div class="todos-achse" aria-hidden="true">Nicht dringend</div>'
      + '<div class="todos-achse todos-achse-zeile" aria-hidden="true"><span>Wichtig</span></div>' + zelle(BUCKET.q1) + zelle(BUCKET.q2)
      + '<div class="todos-achse todos-achse-zeile" aria-hidden="true"><span>Nicht wichtig</span></div>' + zelle(BUCKET.q3) + zelle(BUCKET.q4)
      + "</div>"
      + '<details class="todos-erledigt"' + (auf ? " open" : "") + '><summary>✅ Erledigt (' + n + ") – hierher ziehen, um abzuhaken</summary>"
      + '<ul class="todos-liste" data-q="done">' + todos.filter(function (t) { return t.q === "done"; }).map(karte).join("") + "</ul></details>";
  }

  function renderAlles() {
    renderPersonen();
    renderLeiste();
    renderMatrix();
    if (!matrix.parentNode) { if (!EINGEBETTET) matrixPlatz.innerHTML = ""; matrixPlatz.appendChild(matrix); }
  }

  // Read the order from the DOM after a move and write it back into the document.
  function ausDom() {
    var st = DOCS[aktuell], byId = {};
    st.doc.todos.forEach(function (t) { byId[t.id] = t; });
    var dom = [];
    matrix.querySelectorAll(".todos-liste").forEach(function (ul) {
      var q = ul.getAttribute("data-q");
      ul.querySelectorAll(":scope > .todo-karte").forEach(function (li) {
        var t = byId[li.getAttribute("data-id")];
        if (!t) return;
        setzeFeld(t, q);
        dom.push(t);
      });
    });
    // Shown todos fill the array slots they occupied before, in their new order; hidden ones (filter) stay put.
    var neu = st.doc.todos.slice(), k = 0;
    st.doc.todos.forEach(function (t, i) { if (dom.indexOf(t) >= 0) neu[i] = dom[k++]; });
    st.doc.todos = neu;
  }
  // Moving into/out of "Erledigt" also sets the status.
  function setzeFeld(t, q) {
    if (q === t.q) return;
    if (q === "done") { t.felder.status = "geloest"; if (!t.felder.geloest_am) t.felder.geloest_am = heute(); }
    else if (t.q === "done") { t.felder.status = "offen"; delete t.felder.geloest_am; }
    t.q = q;
  }

  // ---------- drag & drop (pointer events: mouse anywhere on the card, touch on the handle) ----------
  var drag = null;
  matrix.addEventListener("pointerdown", function (e) {
    var li = e.target.closest(".todo-karte");
    if (!li || e.button > 0) return;
    if (e.pointerType !== "mouse" && !e.target.closest(".todo-griff")) return;
    var r = li.getBoundingClientRect();
    drag = { li: li, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, aktiv: false, x: e.clientX, y: e.clientY, griff: !!e.target.closest(".todo-griff") };
    if (drag.griff) e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.aktiv) {
      if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 6) return;
      drag.aktiv = true;
      var ghost = drag.li.cloneNode(true);
      ghost.classList.add("todo-ghost");
      ghost.style.width = drag.w + "px";
      (matrix.closest("dialog") || document.body).appendChild(ghost);
      drag.ghost = ghost;
      drag.li.classList.add("todo-platzhalter");
      document.body.classList.add("todos-ziehen");
      var details = matrix.querySelector(".todos-erledigt"); if (details) details.open = true;
    }
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.dx) + "px";
    drag.ghost.style.top = (e.clientY - drag.dy) + "px";
    var unter = document.elementFromPoint(e.clientX, e.clientY);
    var ul = unter && (unter.closest(".todos-liste") || (unter.closest(".todos-zelle, .todos-erledigt") || {}).querySelector && unter.closest(".todos-zelle, .todos-erledigt").querySelector(".todos-liste"));
    if (!ul || !matrix.contains(ul)) return;
    var vor = null;
    ul.querySelectorAll(":scope > .todo-karte").forEach(function (k) {
      if (vor || k === drag.li) return;
      var r = k.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) vor = k;
    });
    if (vor) { if (vor !== drag.li.nextSibling || drag.li.parentNode !== ul) ul.insertBefore(drag.li, vor); }
    else if (drag.li.parentNode !== ul || drag.li.nextSibling) ul.appendChild(drag.li);
  }, { passive: false });
  function dragEnde(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!d.aktiv) return; // a click – handled below
    d.ghost.remove();
    d.li.classList.remove("todo-platzhalter");
    document.body.classList.remove("todos-ziehen");
    unterdrueckeKlick = true; setTimeout(function () { unterdrueckeKlick = false; }, 0);
    ausDom();
    speichern(aktuell);
    renderMatrix();
    var t = finde(d.li.getAttribute("data-id"));
    if (t) sagen("„" + t.titel + "“ jetzt in " + BUCKET[t.q].name + ".");
    if (auswahl) renderEditor();
  }
  window.addEventListener("pointerup", dragEnde);
  window.addEventListener("pointercancel", dragEnde);
  var unterdrueckeKlick = false;
  (function autoScroll() {
    if (drag && drag.aktiv) {
      var box = matrix.closest("dialog") ? dialogLinks : null;
      var top = box ? box.getBoundingClientRect().top : 0, h = box ? box.getBoundingClientRect().bottom : window.innerHeight, edge = 60;
      var by = drag.y < top + edge ? -Math.ceil((top + edge - drag.y) / 4) : drag.y > h - edge ? Math.ceil((drag.y - (h - edge)) / 4) : 0;
      if (by) { if (box) box.scrollTop += by; else window.scrollBy(0, by); }
    }
    window.requestAnimationFrame(autoScroll);
  })();

  // click / keyboard
  matrix.addEventListener("click", function (e) {
    var neu = e.target.closest("[data-neu]");
    if (neu) { neueAufgabe(neu.getAttribute("data-neu")); return; }
    var li = e.target.closest(".todo-karte");
    if (li && !unterdrueckeKlick) oeffne(li.getAttribute("data-id"));
  });
  // Arrow keys move the focused card: up/down inside a quadrant (at the edge into the one above/below),
  // left/right between the columns. Enter/space opens the editor.
  var NACHBAR = {
    q1: { links: null, rechts: "q2", hoch: null, runter: "q3" }, q2: { links: "q1", rechts: null, hoch: null, runter: "q4" },
    q3: { links: null, rechts: "q4", hoch: "q1", runter: "done" }, q4: { links: "q3", rechts: null, hoch: "q2", runter: "done" },
    done: { links: null, rechts: null, hoch: "q3", runter: null }
  };
  matrix.addEventListener("keydown", function (e) {
    var li = e.target.closest(".todo-karte");
    if (!li || e.target !== li) return;
    var id = li.getAttribute("data-id");
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); oeffne(id); return; }
    var richtung = { ArrowUp: "hoch", ArrowDown: "runter", ArrowLeft: "links", ArrowRight: "rechts" }[e.key];
    if (!richtung) return;
    e.preventDefault();
    var st = DOCS[aktuell], t = finde(id);
    var gleiche = st.doc.todos.filter(function (x) { return x.q === t.q && sichtbar(x); });
    var i = gleiche.indexOf(t), alle = st.doc.todos;
    if (richtung === "hoch" && i > 0) { tausche(alle, t, gleiche[i - 1]); }
    else if (richtung === "runter" && i < gleiche.length - 1) { tausche(alle, t, gleiche[i + 1]); }
    else {
      var ziel = NACHBAR[t.q][richtung];
      if (!ziel) return;
      alle.splice(alle.indexOf(t), 1);
      setzeFeld(t, ziel);
      var zielListe = alle.filter(function (x) { return x.q === ziel && sichtbar(x); });
      if (richtung === "runter" && zielListe.length) alle.splice(alle.indexOf(zielListe[0]), 0, t); else alle.push(t);
    }
    speichern(aktuell);
    renderMatrix();
    var neuLi = matrix.querySelector('.todo-karte[data-id="' + CSS.escape(id) + '"]');
    if (neuLi) { if (t.q === "done") matrix.querySelector(".todos-erledigt").open = true; neuLi.focus(); }
    var pos = st.doc.todos.filter(function (x) { return x.q === t.q && sichtbar(x); }).indexOf(t) + 1;
    sagen("„" + t.titel + "“: " + BUCKET[t.q].name + ", Platz " + pos + ".");
    if (auswahl) renderEditor();
  });
  function tausche(a, x, y) { var i = a.indexOf(x), j = a.indexOf(y); a[i] = y; a[j] = x; }

  function neueAufgabe(q) {
    var st = DOCS[aktuell];
    var t = { id: eindeutig(st.doc, "neues-todo"), titel: "", q: q, felder: { art: "aufgabe", status: q === "done" ? "geloest" : "offen", seit: heute() }, text: "", autoId: true };
    if (FILTER) { t.felder.projekte = [FILTER.projekt]; if (FILTER.tag) t.felder.tags = [FILTER.tag]; }
    st.doc.todos.push(t);
    speichern(aktuell);
    renderMatrix();
    oeffne(t.id, true);
  }

  // ---------- pop-up: matrix left, editor right ----------
  function oeffne(id, neu) {
    auswahl = id;
    if (!dialog.open) {
      dialogLinks.appendChild(matrix);
      dialog.showModal();
    }
    renderMatrix();
    renderEditor(neu);
    ladeIndex();
    if (!EINGEBETTET) location.replace("#" + aktuell + "/" + id);
  }
  function schliessen() {
    auswahl = null;
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener("close", function () {
    auswahl = null;
    if (!EINGEBETTET) { matrixPlatz.appendChild(matrix); if (aktuell) location.replace("#" + aktuell); }
    renderMatrix();
  });
  document.getElementById("todos-dialog-zu").addEventListener("click", schliessen);
  dialog.addEventListener("click", function (e) { if (e.target === dialog) schliessen(); });

  var ART_NAMEN = { aufgabe: "📋 Aufgabe", problem: "⚠️ Problem", frage: "❓ Frage" };
  var STATUS_NAMEN = { offen: "Offen", "in-arbeit": "In Arbeit", geloest: "Gelöst" };
  function optionen(map, wert) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === wert ? " selected" : "") + ">" + map[k] + "</option>"; }).join(""); }

  function renderEditor(neu) {
    var t = auswahl && finde(auswahl);
    if (!t) { editor.innerHTML = '<p class="muted">Wähle links eine Karte – oder lege mit ➕ in einem Feld ein neues Todo an.</p>'; return; }
    var f = t.felder;
    var felder = {}; BUCKETS.forEach(function (b) { felder[b.q] = b.icon + " " + b.name; });
    var personen = {}; CFG.personen.forEach(function (p) { personen[p.id] = p.name; });
    editor.innerHTML =
      '<label class="todos-feld todos-feld-titel"><span>Titel</span><input name="titel" type="text" required value="' + esc(t.titel) + '" placeholder="Kurz, gern als Frage"></label>'
      + '<p class="todos-id muted small">#' + esc(t.id) + "</p>"
      + '<label class="todos-feld"><span>Kurz (ein Satz für die Karte)</span><input name="kurz" type="text" value="' + esc(f.kurz || "") + '"></label>'
      + '<div class="todos-reihe">'
      + '<label class="todos-feld"><span>Art</span><select name="art">' + optionen(ART_NAMEN, f.art || "aufgabe") + "</select></label>"
      + '<label class="todos-feld"><span>Status</span><select name="status">' + optionen(STATUS_NAMEN, f.status || "offen") + "</select></label>"
      + '<label class="todos-feld"><span>Feld</span><select name="q">' + optionen(felder, t.q) + "</select></label>"
      + '<label class="todos-feld"><span>Fällig</span><input name="faellig" type="date" value="' + esc(f.faellig || "") + '"></label>'
      + "</div>"
      + '<label class="todos-feld"><span>Hauptzuständig</span><select name="person">' + optionen(personen, aktuell) + "</select></label>"
      + chipFeld("helfer", "🙌 Helfende Hände", "Name aus dem Team …")
      + chipFeld("projekte", "🔧 Projekte", "Projekt suchen …")
      + chipFeld("tags", "🏷️ Stichworte", "Stichwort suchen oder neu …")
      + chipFeld("verlinkt", "🔗 Verknüpft (Termine, Beiträge, Geräte, Seiten …)", "Seite suchen …")
      + '<label class="todos-feld"><span>🌐 Quelle (woher das Todo kommt)</span><input name="quelle" type="url" value="' + esc(f.quelle || "") + '" placeholder="https://…"></label>'
      + (sichereUrl(f.quelle) ? '<p class="todos-quelle small"><a href="' + esc(f.quelle) + '" target="_blank" rel="noopener noreferrer">Quelle öffnen ↗</a></p>' : "")
      + '<label class="todos-feld"><span>Beschreibung (Markdown)</span><textarea name="text" rows="7">' + esc(t.text || "") + "</textarea></label>"
      + '<div class="todos-editor-fuss"><button type="button" class="btn btn-small btn-ghost" data-loeschen>🗑️ Löschen</button>'
      + '<span class="muted small">Jede Änderung ist sofort im Browser gespeichert.</span>'
      + '<button type="button" class="btn btn-small" data-fertig>Fertig</button></div>';
    LISTEN_KEYS.forEach(function (k) { renderChips(k); });
    if (neu) { var i = editor.querySelector('[name="titel"]'); i.focus(); }
  }

  function chipFeld(key, label, ph) {
    return '<div class="todos-feld todos-chips-feld" data-chips="' + key + '"><span id="lbl-' + key + '">' + label + "</span>"
      + '<div class="todos-chips"><ul class="todos-chip-liste"></ul>'
      + '<div class="todos-ac"><input type="text" class="todos-ac-input" aria-labelledby="lbl-' + key + '" placeholder="' + ph + '" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="ac-' + key + '">'
      + '<ul class="todos-ac-liste" id="ac-' + key + '" role="listbox" hidden></ul></div></div></div>';
  }

  function renderChips(key) {
    var t = finde(auswahl), box = editor.querySelector('[data-chips="' + key + '"] .todos-chip-liste');
    if (!t || !box) return;
    box.innerHTML = (t.felder[key] || []).map(function (v, i) {
      var info = beschreibe(key, v);
      return '<li class="todos-chip' + (key === "helfer" ? " todos-chip-person" : "") + '">' + (key === "helfer" ? avatar(v) : "")
        + (info.url ? '<a href="' + esc(info.url) + '" target="_blank" rel="noopener">' + esc(info.name) + "</a>" : "<span>" + esc(info.name) + "</span>")
        + '<button type="button" data-weg="' + key + '" data-i="' + i + '" aria-label="' + esc(info.name) + ' entfernen">✕</button></li>';
    }).join("");
  }

  function beschreibe(key, v) {
    var I = INDEX || {};
    if (key === "helfer") { var p = PERSON[v]; return { name: p ? p.name : v, url: p && (I.personen || []).filter(function (x) { return x.id === v; }).map(function (x) { return x.url; })[0] }; }
    if (key === "projekte") { var pr = (I.projekte || []).filter(function (x) { return x.id === v; })[0]; return { name: pr ? pr.name : v, url: pr && pr.url }; }
    if (key === "tags") { var tg = (I.stichworte || []).filter(function (x) { return x.id === v; })[0]; return { name: tg ? tg.name : v, url: null }; }
    var s = (I.seiten || []).filter(function (x) { return x.url === v; })[0];
    return { name: s ? s.name : v, url: /^(\/|https?:)/.test(v) ? v : null };
  }

  // Editor input → document → localStorage, at once.
  editor.addEventListener("input", function (e) {
    var t = finde(auswahl), n = e.target.name;
    if (!t || !n) return;
    var v = e.target.value;
    if (n === "titel") {
      t.titel = v;
      if (t.autoId && v.trim()) { t.id = eindeutig(DOCS[aktuell].doc, slugify(v), t); auswahl = t.id; editor.querySelector(".todos-id").textContent = "#" + t.id; if (!EINGEBETTET) location.replace("#" + aktuell + "/" + t.id); }
    } else if (n === "text") t.text = v;
    else if (n === "kurz" || n === "faellig" || n === "quelle") { if (v) t.felder[n] = v; else delete t.felder[n]; }
    else return;
    speichern(aktuell);
    renderMatrix();
  });
  editor.addEventListener("change", function (e) {
    var t = finde(auswahl), n = e.target.name;
    if (!t || !n) return;
    var v = e.target.value;
    if (n === "art") t.felder.art = v;
    else if (n === "status") {
      t.felder.status = v;
      if (v === "geloest" && t.q !== "done") { setzeFeld(t, "done"); t.felder.status = "geloest"; }
      else if (v !== "geloest" && t.q === "done") { t.q = "q4"; delete t.felder.geloest_am; }
    } else if (n === "q") { var vorher = t.felder.status; setzeFeld(t, v); if (v !== "done" && t.q !== "done" && vorher === "in-arbeit") t.felder.status = "in-arbeit"; }
    else if (n === "person") { uebergeben(t, v); return; }
    else return;
    speichern(aktuell);
    renderMatrix();
    renderEditor();
  });
  editor.addEventListener("click", function (e) {
    var weg = e.target.closest("[data-weg]");
    if (weg) {
      var t = finde(auswahl), k = weg.getAttribute("data-weg");
      t.felder[k].splice(+weg.getAttribute("data-i"), 1);
      speichern(aktuell); renderChips(k); renderMatrix();
      editor.querySelector('[data-chips="' + k + '"] .todos-ac-input').focus();
      return;
    }
    if (e.target.closest("[data-fertig]")) { schliessen(); return; }
    var lo = e.target.closest("[data-loeschen]");
    if (lo) {
      if (lo.getAttribute("data-sicher") !== "1") { lo.setAttribute("data-sicher", "1"); lo.textContent = "Wirklich löschen?"; return; }
      var st = DOCS[aktuell];
      st.doc.todos = st.doc.todos.filter(function (x) { return x.id !== auswahl; });
      speichern(aktuell); schliessen(); sagen("Gelöscht.");
    }
  });

  // Hand a challenge over to someone else: it moves into their file (both files change).
  function uebergeben(t, person) {
    var von = aktuell;
    laden(person).then(function (ziel) {
      if (NAV && NAV.indexOf(person) < 0) NAV.push(person);
      var st = DOCS[von];
      st.doc.todos = st.doc.todos.filter(function (x) { return x !== t; });
      t.id = eindeutig(ziel.doc, t.id, t);
      t.felder.helfer = (t.felder.helfer || []).filter(function (h) { return h !== person; });
      if (von && t.felder.helfer.indexOf(von) < 0) t.felder.helfer.push(von);
      ziel.doc.todos.push(t);
      speichern(von); speichern(person);
      // switch the person while the pop-up stays open (closing would reset the hash asynchronously)
      zeige(person).then(function () { oeffne(t.id); sagen("„" + t.titel + "“ gehört jetzt " + (PERSON[person] ? PERSON[person].name : person) + "."); });
    });
  }

  // ---------- autocomplete (search index, lazily loaded; Pagefind as extra source where it exists) ----------
  var INDEX = null, indexPromise = null, pagefind = null, pagefindVersucht = false;
  function ladeIndex() {
    if (!indexPromise) {
      indexPromise = fetch(CFG.suchindex).then(function (r) { return r.json(); }).then(function (j) {
        INDEX = j;
        (j.personen || []).forEach(function (p) { if (!PERSON[p.id]) PERSON[p.id] = p; });
        if (auswahl) LISTEN_KEYS.forEach(renderChips);
        return j;
      }).catch(function () { INDEX = { personen: [], projekte: [], stichworte: [], seiten: [] }; return INDEX; });
    }
    return indexPromise;
  }
  function ladePagefind() {
    if (pagefindVersucht) return Promise.resolve(pagefind);
    pagefindVersucht = true;
    return import(CFG.pagefind).then(function (m) { pagefind = m; return m; }).catch(function () { return null; });
  }

  function treffer(key, q) {
    var I = INDEX || {}, nq = norm(q).trim(), t = finde(auswahl), schon = (t && t.felder[key]) || [];
    function passt(s) { return !nq || norm(s).indexOf(nq) >= 0; }
    var r = [];
    if (key === "helfer") r = CFG.personen.filter(function (p) { return p.id !== aktuell && (passt(p.name) || passt(p.id)); }).map(function (p) { return { wert: p.id, name: p.name, person: p.id }; });
    if (key === "projekte") r = (I.projekte || []).filter(function (p) { return passt(p.name) || passt(p.id); }).map(function (p) { return { wert: p.id, name: p.name, typ: p.status === "abgeschlossen" ? "Archiv" : "Projekt", tag: p.tag }; });
    if (key === "tags") {
      r = (I.stichworte || []).filter(function (s) { return passt(s.name) || passt(s.id); }).map(function (s) { return { wert: s.id, name: s.name, typ: s.id }; });
      if (nq && !r.some(function (x) { return x.wert === slugify(q); })) r.push({ wert: slugify(q), name: "Neues Stichwort „" + slugify(q) + "“", typ: "neu" });
    }
    if (key === "verlinkt") {
      r = (I.seiten || []).filter(function (s) { return nq && (passt(s.name) || passt(s.url)); }).map(function (s) { return { wert: s.url, name: s.name, typ: s.typ + (s.datum ? " · " + datumDE(s.datum) : "") }; });
      if (/^(\/|https?:\/\/)\S+$/.test(q.trim())) r.unshift({ wert: q.trim(), name: q.trim(), typ: "Adresse" });
    }
    return r.filter(function (x) { return schon.indexOf(x.wert) < 0; }).slice(0, 8);
  }

  var acTimer = null;
  function zeigeTreffer(input, extra) {
    var feld = input.closest("[data-chips]"), key = feld.getAttribute("data-chips"), liste = feld.querySelector(".todos-ac-liste");
    var r = treffer(key, input.value);
    if (extra) extra.forEach(function (x) { if (!r.some(function (y) { return y.wert === x.wert; })) r.push(x); });
    r = r.slice(0, 10);
    if (!input.value.trim() && key !== "helfer" && key !== "projekte") r = r.slice(0, key === "tags" ? 8 : 0);
    liste.innerHTML = r.map(function (x, i) {
      return '<li role="option" id="ac-' + key + "-" + i + '" data-wert="' + esc(x.wert) + '"' + (i === 0 ? ' aria-selected="true"' : "") + ">"
        + (x.person ? avatar(x.person) : "") + '<span class="todos-ac-name">' + esc(x.name) + "</span>" + (x.typ ? '<span class="todos-ac-typ">' + esc(x.typ) + "</span>" : "") + "</li>";
    }).join("") || (INDEX ? "" : '<li class="muted small">Suchindex lädt …</li>');
    liste.hidden = !liste.innerHTML;
    input.setAttribute("aria-expanded", liste.hidden ? "false" : "true");
    input.setAttribute("aria-activedescendant", r.length ? "ac-" + key + "-0" : "");
  }
  function waehle(input, wert) {
    var feld = input.closest("[data-chips]"), key = feld.getAttribute("data-chips"), t = finde(auswahl);
    if (!t || !wert) return;
    t.felder[key] = (t.felder[key] || []).concat([wert]);
    // a project's event_tag comes along as tag, so the challenge shows up via tags as well
    if (key === "projekte" && INDEX) { var p = (INDEX.projekte || []).filter(function (x) { return x.id === wert; })[0]; if (p && p.tag && (t.felder.tags || []).indexOf(p.tag) < 0) { t.felder.tags = (t.felder.tags || []).concat([p.tag]); renderChips("tags"); } }
    input.value = "";
    feld.querySelector(".todos-ac-liste").hidden = true;
    input.setAttribute("aria-expanded", "false");
    speichern(aktuell); renderChips(key); renderMatrix();
    input.focus();
  }
  editor.addEventListener("focusin", function (e) { if (e.target.classList.contains("todos-ac-input")) ladeIndex().then(function () { if (document.activeElement === e.target) zeigeTreffer(e.target); }); });
  editor.addEventListener("focusout", function (e) {
    if (!e.target.classList.contains("todos-ac-input")) return;
    setTimeout(function () { var l = e.target.closest("[data-chips]"); if (l && !l.contains(document.activeElement)) { l.querySelector(".todos-ac-liste").hidden = true; e.target.setAttribute("aria-expanded", "false"); } }, 150);
  });
  editor.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.classList.contains("todos-ac-input")) return;
    zeigeTreffer(input);
    var key = input.closest("[data-chips]").getAttribute("data-chips");
    clearTimeout(acTimer);
    if (key === "verlinkt" && input.value.trim().length >= 3) {
      acTimer = setTimeout(function () {
        var q = input.value.trim();
        ladePagefind().then(function (pf) {
          if (!pf) return null;
          return pf.search(q).then(function (s) { return Promise.all(s.results.slice(0, 5).map(function (r) { return r.data(); })); });
        }).then(function (daten) {
          if (!daten || input.value.trim() !== q) return;
          zeigeTreffer(input, daten.map(function (d) { return { wert: d.url.replace(/index\.html$/, ""), name: (d.meta && d.meta.title) || d.url, typ: "Suche" }; }));
        }).catch(function () {});
      }, 250);
    }
  });
  editor.addEventListener("keydown", function (e) {
    var input = e.target;
    if (!input.classList || !input.classList.contains("todos-ac-input")) return;
    var feld = input.closest("[data-chips]"), liste = feld.querySelector(".todos-ac-liste");
    var opts = Array.prototype.slice.call(liste.querySelectorAll("[role=option]"));
    var i = opts.findIndex(function (o) { return o.getAttribute("aria-selected") === "true"; });
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!opts.length) return;
      e.preventDefault();
      if (i >= 0) opts[i].removeAttribute("aria-selected");
      i = (i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      opts[i].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", opts[i].id);
      opts[i].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!liste.hidden && i >= 0) waehle(input, opts[i].getAttribute("data-wert"));
    } else if (e.key === "Escape" && !liste.hidden) {
      e.preventDefault(); e.stopPropagation();
      liste.hidden = true; input.setAttribute("aria-expanded", "false");
    } else if (e.key === "Backspace" && !input.value) {
      var t = finde(auswahl), key = feld.getAttribute("data-chips");
      if (t && (t.felder[key] || []).length) { t.felder[key].pop(); speichern(aktuell); renderChips(key); renderMatrix(); }
    }
  });
  editor.addEventListener("mousedown", function (e) {
    var o = e.target.closest(".todos-ac-liste [role=option]");
    if (!o) return;
    e.preventDefault();
    waehle(o.closest("[data-chips]").querySelector(".todos-ac-input"), o.getAttribute("data-wert"));
  });
  editor.addEventListener("submit", function (e) { e.preventDefault(); });
  // Escape in an open autocomplete only closes the list, not the dialog.
  dialog.addEventListener("cancel", function (e) { if (editor.querySelector('.todos-ac-input[aria-expanded="true"]')) e.preventDefault(); });

  // ---------- diff + pull request ----------
  function diffZeilen(a, b) {
    var n = a.length, m = b.length, dp = [];
    for (var i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push([" ", a[i]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(["-", a[i++]]);
      else out.push(["+", b[j++]]);
    }
    while (i < n) out.push(["-", a[i++]]);
    while (j < m) out.push(["+", b[j++]]);
    return out;
  }
  function diffHtml(alt, neu) {
    var ops = diffZeilen(alt ? alt.replace(/\n$/, "").split("\n") : [], neu.replace(/\n$/, "").split("\n"));
    var html = [], ruhe = [];
    function flush(ende) {
      if (ruhe.length > 6) {
        var kopf = html.length ? ruhe.slice(0, 2) : [], fuss = ende ? [] : ruhe.slice(-2);
        kopf.forEach(function (l) { html.push('<span class="d-gleich">  ' + esc(l) + "</span>"); });
        html.push('<span class="d-mehr">… ' + (ruhe.length - kopf.length - fuss.length) + " unveränderte Zeilen …</span>");
        fuss.forEach(function (l) { html.push('<span class="d-gleich">  ' + esc(l) + "</span>"); });
      } else ruhe.forEach(function (l) { html.push('<span class="d-gleich">  ' + esc(l) + "</span>"); });
      ruhe = [];
    }
    ops.forEach(function (o) {
      if (o[0] === " ") { ruhe.push(o[1]); return; }
      flush(false);
      html.push('<span class="' + (o[0] === "+" ? "d-plus" : "d-minus") + '">' + o[0] + " " + esc(o[1]) + "</span>");
    });
    flush(true);
    var plus = ops.filter(function (o) { return o[0] === "+"; }).length, minus = ops.filter(function (o) { return o[0] === "-"; }).length;
    return { html: html.join(""), plus: plus, minus: minus };
  }

  var diffPerson = null;
  function zeigeDiff(person) {
    diffPerson = person;
    laden(person).then(function (st) {
      var neu = serialize(st.doc), alt = st.server;
      var d = diffHtml(alt, neu);
      var datei = pfad(person);
      var url = alt == null
        ? CFG.github + "/new/" + CFG.branch + "/todos?filename=" + encodeURIComponent(dateiname(person)) + "&value=" + encodeURIComponent(neu)
        : CFG.github + "/edit/" + CFG.branch + "/" + datei;
      diffBody.innerHTML =
        "<p>" + avatar(person) + " <code>" + esc(datei) + "</code> " + (alt == null ? "(neue Datei)" : "") + ' <span class="d-zahl-plus">+' + d.plus + '</span> <span class="d-zahl-minus">−' + d.minus + "</span></p>"
        + '<pre class="todos-diff-pre">' + d.html + "</pre>"
        + '<ol class="todos-diff-schritte">'
        + (alt == null
          ? "<li>„Kopieren &amp; GitHub öffnen“ – GitHub legt die Datei mit diesem Inhalt an.</li>"
          : "<li>„Kopieren &amp; GitHub öffnen“ – im GitHub-Editor alles markieren (Strg/⌘ + A) und einfügen.</li>")
        + "<li>„Commit changes …“ → <strong>„Create a new branch … and start a pull request“</strong>.</li>"
        + "<li>Sobald der Pull Request gemergt ist und die Seite neu gebaut wurde, verschwindet der Hinweis hier von selbst.</li></ol>"
        + '<div class="todos-diff-knoepfe"><button type="button" class="btn" data-kopieren>📋 Kopieren &amp; GitHub öffnen</button>'
        + '<button type="button" class="btn btn-ghost" data-schliessen>Weiter bearbeiten</button></div>'
        + '<p class="muted small" data-status aria-live="polite"></p>'
        + '<details><summary>Ganze neue Datei ansehen</summary><textarea class="todos-diff-text" rows="12" readonly>' + esc(neu) + "</textarea></details>";
      diffBody.querySelector("[data-kopieren]").addEventListener("click", function () {
        var status = diffBody.querySelector("[data-status]");
        var oeffnen = function (msg) { status.textContent = msg; window.open(url, "_blank", "noopener"); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(neu).then(function () { oeffnen("Kopiert – jetzt im GitHub-Editor einfügen."); },
            function () { diffBody.querySelector("details").open = true; diffBody.querySelector("textarea").select(); oeffnen("Kopieren ging nicht – bitte den Text unten kopieren."); });
        } else { diffBody.querySelector("details").open = true; diffBody.querySelector("textarea").select(); oeffnen("Bitte den Text unten kopieren."); }
      });
      if (!diffDialog.open) diffDialog.showModal();
    });
  }
  diffDialog.addEventListener("click", function (e) { if (e.target === diffDialog || e.target.closest("[data-schliessen]")) diffDialog.close(); });

  // ---------- routing: #person or #person/challenge ----------
  function zeige(person) {
    aktuell = person;
    renderPersonen();
    if (!EINGEBETTET && !matrix.parentNode && !matrixPlatz.querySelector("#todos-laden")) matrixPlatz.innerHTML = '<p class="muted" id="todos-laden">Lädt …</p>';
    return laden(person).then(function () {
      if (aktuell !== person) return;
      renderAlles();
    }).catch(function () {
      (EINGEBETTET ? matrix : matrixPlatz).innerHTML = '<p class="note">Die Datei <code>' + esc(pfad(person)) + '</code> konnte nicht geladen werden.</p>';
    });
  }
  // Only http(s) addresses become clickable links (no javascript: from a hash or a file).
  function sichereUrl(u) { return /^https?:\/\/\S+$/i.test(String(u || "")); }

  // #neu?titel=…&text=…&quelle=…&person=…&feld=q2 – a new todo from outside, e.g. the Chrome extension
  // (_chrome-erweiterung/). The data stays in the fragment, which the browser never sends to the server.
  function neuAusHash(hash) {
    var p = new URLSearchParams(hash.replace(/^neu[?&]?/, ""));
    var person = PERSON[p.get("person")] ? p.get("person") : (CFG.dateien[0] || (CFG.personen[0] && CFG.personen[0].id));
    var q = BUCKET[p.get("feld")] ? p.get("feld") : "q2";
    var auszug = String(p.get("text") || "").trim();
    var quelle = sichereUrl(p.get("quelle")) ? p.get("quelle").trim() : "";
    var titel = String(p.get("titel") || "").trim() || auszug.split(/\n/)[0].slice(0, 80) || "Neues Todo";
    var text = auszug ? auszug.split(/\n/).map(function (z) { return "> " + z; }).join("\n") : "";
    if (quelle) text += (text ? "\n\n" : "") + "Quelle: [" + (String(p.get("quelle_titel") || "").trim().replace(/[\[\]]/g, "") || quelle) + "](" + quelle + ")";
    return zeige(person).then(function () {
      var st = DOCS[person];
      var t = { id: eindeutig(st.doc, slugify(titel)), titel: titel, q: q, felder: { art: "aufgabe", status: "offen", seit: heute() }, text: text, autoId: true };
      if (quelle) t.felder.quelle = quelle;
      st.doc.todos.push(t);
      speichern(person);
      renderMatrix();
      location.replace("#" + person + "/" + t.id);   // replace: reloading must not create it twice
      oeffne(t.id);
      sagen("Neues Todo aus der Auswahl angelegt.");
    });
  }

  function route() {
    if (/^#neu([?&]|$)/.test(location.hash)) { neuAusHash(location.hash.slice(1)); return; }
    var h = decodeURIComponent(location.hash.slice(1)).split("/");
    var person = PERSON[h[0]] ? h[0] : (CFG.dateien[0] || (CFG.personen[0] && CFG.personen[0].id));
    if (!person) return;
    var weiter = person === aktuell ? Promise.resolve() : zeige(person);
    weiter.then(function () {
      if (h[1] && DOCS[person] && DOCS[person].doc.todos.some(function (t) { return t.id === h[1]; })) { if (auswahl !== h[1]) oeffne(h[1]); }
      else if (dialog.open && !h[1]) dialog.close();
    });
  }
  // Another tab changed a draft (edited, saved, discarded): take over its content, so this tab neither shows
  // a stale save bar / diff nor overwrites the other tab with an older state.
  function abgleich(person, roh) {
    if (ROH[person] === roh) return;
    ROH[person] = roh;
    var st = DOCS[person];
    if (st) {
      var neu = null;
      try { neu = JSON.parse(roh || "null"); } catch (x) { /* ignore broken value */ }
      st.doc = parse(neu ? neu.text : (st.server || ""));
      st.konflikt = !!neu && normal(neu.basis) !== normal(st.server);
      if (person === aktuell) {
        renderMatrix();
        if (auswahl && !finde(auswahl)) schliessen();
        else if (auswahl && !editor.contains(document.activeElement)) renderEditor();
      }
    }
    renderPersonen(); renderLeiste();
    if (diffDialog.open && diffPerson === person) {
      if (geaendert(person)) zeigeDiff(person);
      else { diffDialog.close(); sagen("Die Änderungen an " + pfad(person) + " wurden in einem anderen Tab gespeichert oder verworfen."); }
    }
  }
  window.addEventListener("storage", function (e) {
    if (e.key === null) { pruefeTabs(); return; } // localStorage.clear() in another tab
    if (e.key.indexOf(STORE) === 0) abgleich(e.key.slice(STORE.length), e.newValue);
  });
  // Safety net for missed events (e.g. a tab restored from the back/forward cache): compare once per second
  // while the tab is visible, and right away when it becomes visible again.
  function pruefeTabs() {
    var personen = Object.keys(ROH);
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(STORE) === 0 && personen.indexOf(k.slice(STORE.length)) < 0) personen.push(k.slice(STORE.length)); } } catch (e) { return; }
    personen.forEach(function (p) { abgleich(p, storeRoh(p)); });
  }
  setInterval(function () { if (!document.hidden) pruefeTabs(); }, 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pruefeTabs(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) pruefeTabs(); });
  if (!EINGEBETTET) {
    window.addEventListener("hashchange", route);
    route();
    return;
  }

  // Embedded: o = { person } (team profile) or { projekt, tag, team: [...] } (project page), plus titel.
  // On a project page every person file is loaded; the navigation shows people with todos for the project, then the project team.
  matrixPlatz.appendChild(matrix);
  window.TodoApp = {
    start: function (o) {
      FILTER = o.projekt ? { projekt: o.projekt, tag: o.tag || "" } : null;
      document.getElementById("todos-dialog-titel").textContent = o.titel || "Todos";
      alleLink.hidden = false;
      var laden1 = o.person ? laden(o.person) : Promise.all(CFG.dateien.map(function (id) { return laden(id).catch(function () { return null; }); }));
      return laden1.then(function () {
        var personen = [];
        if (o.person) personen = [o.person];
        else {
          CFG.dateien.forEach(function (id) { if (DOCS[id] && DOCS[id].doc.todos.some(sichtbar)) personen.push(id); });
          (o.team || []).forEach(function (id) { if (PERSON[id] && personen.indexOf(id) < 0) personen.push(id); });
          if (!personen.length) personen = CFG.dateien.slice(0, 1);
        }
        NAV = personen;
        auswahl = null;
        return zeige(personen[0]);
      }).then(function () {
        if (!dialog.open) dialog.showModal();
        renderEditor();
        ladeIndex();
      });
    }
  };
})();
