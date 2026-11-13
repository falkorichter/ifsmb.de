// Shared building blocks for the pop-up forms, without libraries. Used by
//   - assets/js/todos.js  (todo editor)
//   - assets/js/neu.js    ("➕ new" forms for posts, events, projects, equipment …)
// Contents: helpers, search index + autocomplete sources, people/avatars, chip field widget,
// dialog shell, YAML output and the "copy & open GitHub" step.
// Configuration: <script type="application/json" id="formular-daten"> from _includes/formular-config.html.
var Formular = (function () {
  "use strict";

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function slugify(s, ersatz) {
    var r = norm(String(s || "").replace(/ß/g, "ss")).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
    return r || (ersatz == null ? "" : ersatz);
  }
  function zwei(n) { return String(n).padStart(2, "0"); }
  function heute() { var d = new Date(); return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate()); }
  function datumDE(d) { var p = String(d || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : d; }
  // HTML → a detached element (parentNode null, so callers can test whether it is mounted yet)
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); var n = t.content.firstElementChild; n.remove(); return n; }

  // ---------- configuration + search index ----------
  var CFG = null;
  function cfg() {
    if (!CFG) { var d = document.getElementById("formular-daten"); CFG = d ? JSON.parse(d.textContent) : {}; }
    return CFG;
  }

  // Index (todos/suchindex.json): personen, projekte, stichworte, seiten, partner, kategorien. Loaded once, on demand.
  var INDEX = null, indexPromise = null;
  function I(key) { return (INDEX && INDEX[key]) || []; }
  function ladeIndex() {
    if (!indexPromise) {
      indexPromise = fetch(cfg().suchindex).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return {}; })
        .then(function (j) {
          INDEX = j;
          personen(j.personen || []);
          // chip fields that are already on screen show names and links now instead of raw ids
          document.querySelectorAll(".form-chips-feld").forEach(function (f) { if (f.aktualisiere) f.aktualisiere(); });
          return j;
        });
    }
    return indexPromise;
  }
  var pagefind = null, pagefindVersucht = false;
  function ladePagefind() {
    if (pagefindVersucht || !cfg().pagefind) return Promise.resolve(pagefind);
    pagefindVersucht = true;
    return import(cfg().pagefind).then(function (m) { pagefind = m; return m; }).catch(function () { return null; });
  }

  // ---------- people ----------
  var PERSONEN = {}, REIHENFOLGE = [];
  // Register people { id, name, bild, url }; later calls only fill in missing fields.
  function personen(liste) {
    liste.forEach(function (p) {
      var alt = PERSONEN[p.id];
      if (!alt) { REIHENFOLGE.push(p.id); PERSONEN[p.id] = Object.assign({}, p); return; }
      Object.keys(p).forEach(function (k) { if (!alt[k] && p[k]) alt[k] = p[k]; });
    });
  }
  function person(id) { return PERSONEN[id] || { id: id, name: id, bild: "" }; }
  function initialen(name) { return String(name || "?").split(/[\s-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(""); }
  function avatar(id, cls) {
    var p = person(id);
    return p.bild
      ? '<img class="person-avatar ' + (cls || "") + '" src="' + esc(p.bild) + '" alt="" title="' + esc(p.name) + '" width="24" height="24" loading="lazy">'
      : '<span class="person-avatar person-avatar-text ' + (cls || "") + '" title="' + esc(p.name) + '" aria-hidden="true">' + esc(initialen(p.name)) + "</span>";
  }

  // ---------- autocomplete sources ----------
  // treffer(nq, text) → [{ wert, name, typ, person }]; beschreibe(wert) → { name, url, person }.
  // Optional: neu(text) → entry for free input (new tag, address), neuZuerst, leer = hits shown for an empty query,
  // pagefind = Pagefind full-text search as extra source.
  function passt(nq) { var a = Array.prototype.slice.call(arguments, 1); return !nq || a.some(function (s) { return norm(s).indexOf(nq) >= 0; }); }
  function finde(liste, key, wert) { return liste.filter(function (x) { return x[key] === wert; })[0]; }
  var QUELLEN = {
    personen: {
      leer: 99,
      treffer: function (nq) {
        return REIHENFOLGE.map(person).filter(function (p) { return passt(nq, p.name, p.id); })
          .map(function (p) { return { wert: p.id, name: p.name, person: p.id }; });
      },
      beschreibe: function (v) { var p = person(v); return { name: p.name, url: p.url, person: v }; }
    },
    projekte: {
      leer: 99,
      treffer: function (nq) {
        return I("projekte").filter(function (p) { return passt(nq, p.name, p.id); })
          .map(function (p) { return { wert: p.id, name: p.name, typ: p.status === "abgeschlossen" ? "Archiv" : "Projekt" }; });
      },
      beschreibe: function (v) { var p = finde(I("projekte"), "id", v); return { name: p ? p.name : v, url: p && p.url }; }
    },
    stichworte: {
      leer: 8,
      treffer: function (nq) {
        return I("stichworte").filter(function (s) { return passt(nq, s.name, s.id); }).map(function (s) { return { wert: s.id, name: s.name, typ: s.id }; });
      },
      neu: function (text) { var s = slugify(text); return s && { wert: s, name: "Neues Stichwort „" + s + "“", typ: "neu" }; },
      beschreibe: function (v) { var s = finde(I("stichworte"), "id", v); return { name: s ? s.name : v }; }
    },
    seiten: {
      leer: 0,
      pagefind: true,
      neuZuerst: true,
      treffer: function (nq) {
        return nq ? I("seiten").filter(function (s) { return passt(nq, s.name, s.url); })
          .map(function (s) { return { wert: s.url, name: s.name, typ: s.typ + (s.datum ? " · " + datumDE(s.datum) : "") }; }) : [];
      },
      neu: function (text) { return /^(\/|https?:\/\/)\S+$/.test(text) && { wert: text, name: text, typ: "Adresse" }; },
      beschreibe: function (v) { var s = finde(I("seiten"), "url", v); return { name: s ? s.name : v, url: /^(\/|https?:)/.test(v) ? v : null }; }
    },
    partner: {
      leer: 99,
      treffer: function (nq) { return I("partner").filter(function (p) { return passt(nq, p.name); }).map(function (p) { return { wert: p.name, name: p.name, typ: "Partner" }; }); },
      beschreibe: function (v) { var p = finde(I("partner"), "name", v); return { name: v, url: p && p.url }; }
    }
  };

  // ---------- chip field ----------
  // A list of values (people, projects, tags, pages …) with autocomplete. Returns the element; element.aktualisiere()
  // redraws the chips. o = { label, quelle (key of QUELLEN or own source), werte() → array, setze(array),
  // placeholder, hilfe, einzeln (at most one value), ausser() → values not to offer, gewaehlt(wert) after a pick }
  var zaehler = 0;
  function chipFeld(o) {
    var q = typeof o.quelle === "string" ? QUELLEN[o.quelle] : o.quelle;
    var id = "fc" + (++zaehler);
    var feld = el('<div class="form-feld form-chips-feld"><span id="' + id + '-l">' + esc(o.label) + "</span>"
      + '<div class="form-chips"><ul class="form-chip-liste"></ul><div class="form-ac">'
      + '<input type="text" class="form-ac-input" aria-labelledby="' + id + '-l" placeholder="' + esc(o.placeholder || "Suchen …") + '"'
      + ' role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="' + id + '-a">'
      + '<ul class="form-ac-liste" id="' + id + '-a" role="listbox" hidden></ul></div></div>'
      + (o.hilfe ? '<small class="form-hilfe">' + esc(o.hilfe) + "</small>" : "") + "</div>");
    var chips = feld.querySelector(".form-chip-liste"), input = feld.querySelector("input"), liste = feld.querySelector(".form-ac-liste");
    var timer = null;
    function werte() { return (o.werte() || []).slice(); }

    function aktualisiere() {
      var w = werte();
      chips.innerHTML = w.map(function (v, i) {
        var info = q.beschreibe(v);
        return '<li class="form-chip' + (info.person ? " form-chip-person" : "") + '">' + (info.person ? avatar(info.person) : "")
          + (info.url ? '<a href="' + esc(info.url) + '" target="_blank" rel="noopener">' + esc(info.name) + "</a>" : "<span>" + esc(info.name) + "</span>")
          + '<button type="button" data-i="' + i + '" aria-label="' + esc(info.name) + ' entfernen">✕</button></li>';
      }).join("");
      input.hidden = !!o.einzeln && w.length > 0;
    }
    function zu() { liste.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
    function zeige(extra) {
      var text = input.value.trim(), nq = norm(text), schon = werte().concat(o.ausser ? o.ausser() : []);
      var r = q.treffer(nq, text);
      var neu = text && q.neu && q.neu(text);
      if (neu && !r.some(function (x) { return x.wert === neu.wert; })) r[q.neuZuerst ? "unshift" : "push"](neu);
      (extra || []).forEach(function (x) { if (!r.some(function (y) { return y.wert === x.wert; })) r.push(x); });
      r = r.filter(function (x) { return schon.indexOf(x.wert) < 0; }).slice(0, nq ? 10 : (q.leer || 0));
      liste.innerHTML = r.map(function (x, i) {
        return '<li role="option" id="' + id + "-" + i + '" data-wert="' + esc(x.wert) + '"' + (i === 0 ? ' aria-selected="true"' : "") + ">"
          + (x.person ? avatar(x.person) : "") + '<span class="form-ac-name">' + esc(x.name) + "</span>"
          + (x.typ ? '<span class="form-ac-typ">' + esc(x.typ) + "</span>" : "") + "</li>";
      }).join("") || (INDEX ? "" : '<li class="muted small">Suchindex lädt …</li>');
      liste.hidden = !liste.innerHTML;
      input.setAttribute("aria-expanded", liste.hidden ? "false" : "true");
      if (r.length) input.setAttribute("aria-activedescendant", id + "-0"); else input.removeAttribute("aria-activedescendant");
    }
    function waehle(wert) {
      if (!wert) return;
      o.setze(o.einzeln ? [wert] : werte().concat([wert]));
      input.value = "";
      zu(); aktualisiere();
      if (o.gewaehlt) o.gewaehlt(wert);
      (input.hidden ? chips.querySelector("button") : input).focus();
    }
    function entferne(i) {
      var w = werte(); w.splice(i, 1); o.setze(w); aktualisiere();
    }
    function sucheVoll() {
      clearTimeout(timer);
      var text = input.value.trim();
      if (!q.pagefind || text.length < 3) return;
      timer = setTimeout(function () {
        ladePagefind().then(function (pf) {
          return pf && pf.search(text).then(function (s) { return Promise.all(s.results.slice(0, 5).map(function (r) { return r.data(); })); });
        }).then(function (daten) {
          if (!daten || input.value.trim() !== text) return;
          zeige(daten.map(function (d) { return { wert: d.url.replace(/index\.html$/, ""), name: (d.meta && d.meta.title) || d.url, typ: "Suche" }; }));
        }).catch(function () {});
      }, 250);
    }

    input.addEventListener("focus", function () { ladeIndex().then(function () { if (document.activeElement === input) zeige(); }); });
    input.addEventListener("blur", function () { setTimeout(function () { if (!feld.contains(document.activeElement)) zu(); }, 150); });
    input.addEventListener("input", function () { zeige(); sucheVoll(); });
    input.addEventListener("keydown", function (e) {
      var opts = Array.prototype.slice.call(liste.querySelectorAll("[role=option]"));
      var i = opts.findIndex(function (x) { return x.getAttribute("aria-selected") === "true"; });
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
        if (!liste.hidden && i >= 0) waehle(opts[i].getAttribute("data-wert"));
      } else if (e.key === "Escape" && !liste.hidden) {
        e.preventDefault(); e.stopPropagation(); zu();
      } else if (e.key === "Backspace" && !input.value && werte().length) {
        entferne(werte().length - 1);
      }
    });
    liste.addEventListener("mousedown", function (e) {
      var opt = e.target.closest("[role=option]");
      if (!opt) return;
      e.preventDefault();
      waehle(opt.getAttribute("data-wert"));
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (!b) return;
      entferne(+b.getAttribute("data-i"));
      input.focus();
    });
    feld.aktualisiere = aktualisiere;
    aktualisiere();
    return feld;
  }

  // ---------- dialog ----------
  // <dialog> with a header (title, optional extra HTML, ✕), appended to <body>. Closes on ✕, on [data-schliessen]
  // and on a click on the backdrop (only if the click also started there, so selecting text never closes it).
  // Escape in an open autocomplete only closes the list.
  function dialog(o) {
    var d = el('<dialog class="form-dialog ' + (o.klasse || "") + '" id="' + o.id + '" aria-labelledby="' + o.id + '-titel">'
      + '<div class="form-dialog-kopf"><h2 id="' + o.id + '-titel">' + esc(o.titel || "") + "</h2>" + (o.kopf || "")
      + '<button type="button" class="btn btn-small btn-ghost" data-schliessen aria-label="Schließen">✕</button></div></dialog>');
    var start = null;
    d.addEventListener("pointerdown", function (e) { start = e.target; });
    d.addEventListener("click", function (e) {
      if ((e.target === d && start === d) || e.target.closest("[data-schliessen]")) d.close();
    });
    d.addEventListener("cancel", function (e) { if (d.querySelector('.form-ac-input[aria-expanded="true"]')) e.preventDefault(); });
    d.titel = function (t) { d.querySelector("h2").textContent = t; };
    document.body.appendChild(d);
    return d;
  }

  // ---------- YAML ----------
  var RESERVIERT = /^(true|false|null|yes|no|on|off|~|[-+]?\d[\d._:-]*)$/i;
  function yamlText(s) {
    s = String(s);
    if (s === "" || /^[\s\[\]{}#&*!|>'"%@`,?:-]/.test(s) || /: | #|:$|\s$/.test(s) || RESERVIERT.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }
    return s;
  }
  function yamlListe(a) {
    return "[" + a.map(function (x) { x = String(x); return /[,\[\]{}"'#]|: |^[\s&*!|>%@`?-]|\s$/.test(x) || RESERVIERT.test(x) ? '"' + x.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : x; }).join(", ") + "]";
  }
  function leer(v) { return v == null || v === "" || v === false || (Array.isArray(v) && !v.length); }
  // [[key, value], …] → YAML lines; empty values are left out, multi-line text becomes a block scalar.
  function yaml(paare) {
    return paare.filter(function (p) { return !leer(p[1]); }).map(function (p) {
      var k = p[0], v = p[1];
      if (Array.isArray(v)) return k + ": " + yamlListe(v);
      if (typeof v === "boolean" || typeof v === "number") return k + ": " + v;
      if (/\n/.test(v)) return k + ": |\n" + String(v).replace(/\s+$/, "").split("\n").map(function (z) { return z ? "  " + z : ""; }).join("\n");
      return k + ": " + yamlText(v);
    }).join("\n");
  }
  function frontMatter(paare, text) { return "---\n" + yaml(paare) + "\n---\n" + (String(text || "").trim() ? "\n" + String(text).trim() + "\n" : ""); }

  // ---------- GitHub ----------
  // Address of GitHub's "new file" editor with name and content filled in.
  function githubNeu(ordner, datei, inhalt) {
    var c = cfg();
    return c.github + "/new/" + c.branch + "/" + ordner + "?filename=" + encodeURIComponent(datei) + (inhalt == null ? "" : "&value=" + encodeURIComponent(inhalt));
  }
  function githubEdit(pfad) { var c = cfg(); return c.github + "/edit/" + c.branch + "/" + pfad; }
  // Copy text, then open url in a new tab. status (element) gets a hint; if copying fails, fallback() is called
  // (e.g. to show the text for manual copying).
  function kopierenUndOeffnen(text, url, status, fallback) {
    function oeffnen(msg) { status.textContent = msg; window.open(url, "_blank", "noopener"); }
    function manuell(msg) { if (fallback) fallback(); oeffnen(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { oeffnen("Kopiert – GitHub ist in einem neuen Tab offen."); },
        function () { manuell("Kopieren ging nicht – bitte den Text unten kopieren."); });
    } else manuell("Bitte den Text unten kopieren.");
  }

  return {
    esc: esc, norm: norm, slugify: slugify, heute: heute, datumDE: datumDE, el: el, zwei: zwei,
    cfg: cfg, ladeIndex: ladeIndex, index: function () { return INDEX; },
    personen: personen, person: person, avatar: avatar,
    QUELLEN: QUELLEN, chipFeld: chipFeld, dialog: dialog,
    yaml: yaml, yamlText: yamlText, yamlListe: yamlListe, frontMatter: frontMatter, leer: leer,
    githubNeu: githubNeu, githubEdit: githubEdit, kopierenUndOeffnen: kopierenUndOeffnen
  };
})();
if (typeof module !== "undefined") module.exports = Formular;
