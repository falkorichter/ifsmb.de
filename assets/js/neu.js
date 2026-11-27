// "➕ new" forms: one pop-up per resource type, built from the schemas in TYPEN with the building blocks of
// assets/js/formular.js (chip fields with autocomplete, dialog, YAML). Loaded on the first click on a ➕ link
// (_includes/neu-buttons.html). Each link carries data-neu = { typ, label, hinweis, werte } – werte is the connection
// to the current page (author, team, tags, projects …). Without JS the link opens GitHub with the full template.
// The form writes the new file (front matter + Markdown, or plain YAML), shows it live, keeps a draft in
// localStorage and creates it through GitHub's "new file" editor (→ pull request).
// NeuFormular.datei(typ, werte) builds a file without DOM – used by the tests (_scripts/test_formulare.rb).
//
// The ✏️ button (_includes/edit-buttons.html) opens the same form for an existing page: NeuFormular.edit(link)
// loads the unprocessed source from /source/<path> (_plugins/source_files.rb), fills the fields and writes back only
// what was changed – every other line (unknown fields, comments, galleries, formatting) stays byte for byte.
// GitHub's edit page can't be prefilled, so saving copies the file and opens the editor to paste it.
// NeuFormular.editedFile(type, source, changes, path) does the same without DOM (tests).
var NeuFormular = (function () {
  "use strict";
  var F = typeof Formular !== "undefined" ? Formular : require("./formular.js");
  // UI strings (assets/js/i18n.js, keys form.* / github.* in _data/i18n/*.yml) with the German text as fallback.
  // Not yet translated: field labels/hints of the schemas below, photo slots, conflict boxes, most status lines.
  var t = F.t;
  var TYPE_KEYS = { beitrag: "post", termin: "event", projekt: "project", "projekt-vergangen": "past_project", geraet: "device",
    herausforderung: "challenge", team: "team_profile", presse: "press_release", partner: "partner", pressebericht: "press_report" };
  function typeName(typ, schema) { return TYPE_KEYS[typ] ? t("form.types." + TYPE_KEYS[typ], null, schema.titel) : schema.titel; }
  var esc = F.esc;

  // ---------- field factories ----------
  // Field: { typ, name, label, pflicht, platzhalter, hilfe, standard (value or function), folgt(w) (derived value until
  // the field is edited), mehr (under "Weitere Felder"), optionen, quelle, einzeln, liste (datalist from the index),
  // ausgabe(v, w) (value written to the file), intern (not written to the front matter) }.
  // An array of fields is one row.
  function feld(typ, name, label, extra) { return Object.assign({ typ: typ, name: name, label: label }, extra); }
  function text(name, label, x) { return feld("text", name, label, x); }
  function adresse(name, label, x) { return feld("adresse", name, label, Object.assign({ platzhalter: "https://…" }, x)); }
  function datum(name, label, x) { return feld("datum", name, label, x); }
  function zeit(name, label, x) { return feld("zeit", name, label, x); }
  function zahl(name, label, x) { return feld("zahl", name, label, Object.assign({ ausgabe: function (v) { return v === "" ? "" : Number(v); } }, x)); }
  function haken(name, label, x) { return feld("haken", name, label, x); }
  function auswahl(name, label, optionen, x) { return feld("auswahl", name, label, Object.assign({ optionen: optionen, standard: optionen[0][0] }, x)); }
  function chips(name, label, quelle, x) { return feld("chips", name, label, Object.assign({ quelle: quelle }, x)); }
  function titel(platzhalter, x) { return text("title", "Titel", Object.assign({ pflicht: true, platzhalter: platzhalter, klasse: "form-feld-titel" }, x)); }
  function inhalt(platzhalter, x) { return feld("langtext", "text", "Text (Markdown)", Object.assign({ intern: true, markdown: true, zeilen: 10, platzhalter: platzhalter }, x)); }

  // ---------- HTML/Liquid check for the HTML field of overview pages (#154) ----------
  // A small sanity check, not a full parser: Liquid blocks ({% if %} … {% endif %}) and output ({{ … }}) must be closed,
  // HTML elements must be closed in the right order. Elements HTML lets you leave open (p, li, td …) are fine.
  // → German message for the status line, or null.
  var LIQUID_BLOCKS = ["if", "unless", "case", "for", "capture", "comment", "raw", "tablerow"];
  var VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
  var OPTIONAL_END = /^(p|li|dt|dd|option|optgroup|tr|td|th|thead|tbody|tfoot|colgroup|rb|rt|rp)$/i;
  function lineAt(src, i) { return src.slice(0, i).split("\n").length; }
  function blank(s) { return s.replace(/[^\n]/g, " "); } // same length and line breaks – positions stay right
  function checkHtml(src) {
    src = String(src || "");
    var stack = [], m, re = /\{%-?\s*(end)?(\w+)[\s\S]*?-?%\}/g, skip = null;
    // unclosed {% … %} / {{ … }}
    for (var i = 0; (i = src.indexOf("{%", i)) >= 0; i += 2) if (src.indexOf("%}", i) < 0) return "Liquid-Tag „{%“ in Zeile " + lineAt(src, i) + " wird nicht mit „%}“ geschlossen.";
    for (i = 0; (i = src.indexOf("{{", i)) >= 0; i += 2) {
      var end = src.indexOf("}}", i), next = src.indexOf("{{", i + 2);
      if (end < 0 || (next >= 0 && next < end)) return "Liquid-Ausgabe „{{“ in Zeile " + lineAt(src, i) + " wird nicht mit „}}“ geschlossen.";
    }
    while ((m = re.exec(src))) {
      var name = m[2], isEnd = !!m[1];
      if (skip) { if (isEnd && name === skip) { skip = null; stack.pop(); } continue; }
      if (!isEnd && LIQUID_BLOCKS.indexOf(name) >= 0) {
        stack.push({ name: name, line: lineAt(src, m.index) });
        if (name === "comment" || name === "raw") skip = name;
      } else if (isEnd && LIQUID_BLOCKS.indexOf(name) >= 0) {
        var top = stack.pop();
        if (!top) return "„{% end" + name + " %}“ in Zeile " + lineAt(src, m.index) + " hat keinen Anfang.";
        if (top.name !== name) return "„{% end" + name + " %}“ in Zeile " + lineAt(src, m.index) + " passt nicht – offen ist „{% " + top.name + " %}“ aus Zeile " + top.line + ".";
      }
    }
    if (stack.length) { var last = stack[stack.length - 1]; return "„{% " + last.name + " %}“ aus Zeile " + last.line + " wird nicht mit „{% end" + last.name + " %}“ geschlossen."; }
    // HTML: Liquid, comments and script/style contents blanked out, then the tags in order
    var html = src.replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}|\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|<!--[\s\S]*?-->/g, blank)
      .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, function (all, a, tag, body, b) { return a + blank(body) + b; });
    var tags = [], t = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
    while ((m = t.exec(html))) {
      var tag = m[2].toLowerCase(), line = lineAt(html, m.index);
      if (!m[1]) {
        if (VOID_ELEMENTS.test(tag) || /\/\s*$/.test(m[3])) continue;
        if (OPTIONAL_END.test(tag) && tags.length && tags[tags.length - 1].tag === tag) tags.pop(); // <li>…<li>
        tags.push({ tag: tag, line: line });
        continue;
      }
      if (VOID_ELEMENTS.test(tag)) continue;
      var at = -1;
      for (var k = tags.length - 1; k >= 0; k--) { if (tags[k].tag === tag) { at = k; break; } if (!OPTIONAL_END.test(tags[k].tag)) break; }
      if (at < 0) {
        var openTop = tags[tags.length - 1];
        return "„</" + tag + ">“ in Zeile " + line + " passt nicht" + (openTop ? " – offen ist „<" + openTop.tag + ">“ aus Zeile " + openTop.line : " – dazu gibt es kein „<" + tag + ">“") + ".";
      }
      tags.length = at;
    }
    var left = tags.filter(function (x) { return !OPTIONAL_END.test(x.tag); }).pop(); // the innermost one
    return left ? "„<" + left.tag + ">“ aus Zeile " + left.line + " wird nicht geschlossen." : null;
  }

  // fields that many types share
  var stichworte = function (x) { return chips("tags", "🏷️ Stichworte", "stichworte", Object.assign({ platzhalter: "Stichwort suchen oder neu …" }, x)); };
  // external links with title and kind (links: [{ title, url, category }]) – title and kind are read from the page
  var externeLinks = function () {
    return feld("links", "links", "🌍 Externe Links (mit Titel und Art)", { hilfe: "Adresse einfügen und ➕ – Titel und Art liest das Formular von der Seite, wenn sie es verrät; sonst selbst eintragen. Erscheint unten bei „Verbindungen“ in der passenden Gruppe." });
  };
  var verlinkt = function () { return chips("linked", "🔗 Verknüpft (Termine, Beiträge, Geräte, Seiten …)", "seiten", { platzhalter: "Seite suchen oder /adresse/ …" }); };
  var leute = function (name, label, x) { return chips(name, label, "personen", Object.assign({ platzhalter: "Name aus dem Team …" }, x)); };
  var partner = function (name, label, x) { return chips(name, label, "partner", Object.assign({ platzhalter: "Partner suchen …" }, x)); };
  var projekte = function (name, label, x) { return chips(name, label, "projekte", Object.assign({ platzhalter: "Projekt suchen …" }, x)); };
  var persoenlich = function (hilfe) { return haken("personal", "Persönlich", { hilfe: hilfe }); };
  var verschluesselt = function () { return haken("encrypted", "🔒 Inhalt mit Passwort verschlüsseln (Ende-zu-Ende im Browser)"); };
  // Site-specific values (title, url, host, contact_name) from _includes/formular-config.html – none are hard-coded here.
  // Without a page (Node tests) there is no config: empty object, callers fall back.
  function siteCfg() { try { return F.cfg().site || {}; } catch (e) { return {}; } }
  function siteHost() { return siteCfg().host || (typeof location !== "undefined" ? location.host : ""); }
  // look of the page: the list of _data/themes.yml ([id, name], via formular-config.html); "" = the site's default.
  // In Node (tests) read _data/themes.yml directly – it only has `- id:` / `name:` lines.
  function themeList() {
    try { var c = F.cfg(); if (c.themes) return c.themes; } catch (e) { /* no page */ }
    if (typeof require === "undefined") return [];
    try {
      var out = [], cur = null;
      require("fs").readFileSync(require("path").join(__dirname, "../../_data/themes.yml"), "utf8").split("\n").forEach(function (l) {
        var id = l.match(/^- id:\s*(\S+)/), name = l.match(/^\s+name:\s*"?(.*?)"?\s*$/);
        if (id) out.push(cur = [id[1], id[1]]); else if (name && cur) cur[1] = name[1];
      });
      return out;
    } catch (e) { return []; }
  }
  var THEMES = [["", "Wie die ganze Website"]].concat(themeList());
  var themeField = function () { return auswahl("theme", "🎨 Theme (Aussehen)", THEMES, { mehr: true, hilfe: "Besucher*innen können unten auf der Seite trotzdem selbst wählen" }); };
  var socialBild = function () { return text("social_media_preview_image", "Social-Media-Vorschaubild (1200×630 px)", { mehr: true, platzhalter: "/assets/images/og-….jpg – leer = erstes Bild oder Standard" }); };

  // ---------- values ----------
  function jetzt(stunde) {
    var d = new Date();
    return F.heute() + "T" + (stunde == null ? F.zwei(d.getHours()) + ":" + F.zwei(d.getMinutes()) : F.zwei(stunde) + ":00");
  }
  function lokal(d) { return d.getFullYear() + "-" + F.zwei(d.getMonth() + 1) + "-" + F.zwei(d.getDate()) + "T" + F.zwei(d.getHours()) + ":" + F.zwei(d.getMinutes()); }
  function plusStunden(v, h) { var d = new Date(v); if (!v || isNaN(d)) return ""; d.setHours(d.getHours() + h); return lokal(d); }
  // "2026-11-13T14:05" → "2026-11-13 14:05:00 +0100" (UTC offset of that day)
  function mitZone(v) {
    if (!v) return "";
    var off = -new Date(v).getTimezoneOffset();
    return v.replace("T", " ").slice(0, 16) + ":00 " + (off >= 0 ? "+" : "-") + F.zwei(Math.floor(Math.abs(off) / 60)) + F.zwei(Math.abs(off) % 60);
  }
  function ohneT(v) { return v ? v.replace("T", " ").slice(0, 16) : ""; }
  function tag(v) { return String(v || "").slice(0, 10); }
  // one value as a plain scalar, several as a list (author, location_partner – single-value fields in .pages.yml)
  function einerOderListe(v) { return v && v.length === 1 ? v[0] : v; }
  // free text into a list (owner_name is `list: true` in .pages.yml)
  function alsEintrag(v) { return v ? [v] : ""; }
  // "a, b" / "[a, b]" / '"Name"' / array (prefills from _includes/neu-button.html) → array
  function alsListe(v) {
    if (Array.isArray(v)) return v.map(String);
    return String(v == null ? "" : v).replace(/^\s*\[|\]\s*$/g, "").split(",")
      .map(function (s) { return s.trim().replace(/^["']|["']$/g, ""); }).filter(Boolean);
  }

  // ---------- schemas ----------
  var STATUS_PROJEKT = [["aktuell", "🛠️ Aktuell"], ["idee", "💡 Idee"], ["anfrage", "📨 Anfrage"], ["abgeschlossen", "✅ Abgeschlossen (Archiv)"]];
  function projektFelder() {
    return [
      titel("Name des Projekts"),
      text("summary", "Kurzbeschreibung (Projektkarte)", { platzhalter: "Ein bis zwei Sätze, worum es geht" }),
      [auswahl("status", "Status", STATUS_PROJEKT), datum("start", "Start", { pflicht: true, standard: F.heute, hilfe: "wird zum Sortieren genutzt" }),
        text("period", "Zeitraum", { platzhalter: "z. B. Herbst 2026", folgt: function (w) { return w.status === "abgeschlossen" || !w.start ? "" : "seit " + w.start.slice(0, 4); } })],
      [text("location", "Ort", { platzhalter: "z. B. Kurt-Tucholsky-Grundschule, Moabit – keine Wohnadressen" }),
        text("event_tag", "Eigenes Stichwort (event_tag)", { folgt: function (w) { return F.slugify(w.title); }, hilfe: "Beiträge und Termine mit diesem Stichwort erscheinen auf der Projektseite – nie ein allgemeines wie 35services" })],
      leute("team", "👥 Beteiligte"),
      partner("partners", "🤝 Partner"),
      projekte("part_of", "🧩 Teil von", { hilfe: "Nur für Teilprojekte – erscheinen dann nicht in den Übersichten" }),
      projekte("related", "↔️ Verwandte Projekte", { mehr: true }),
      verlinkt(),
        externeLinks(),
      persoenlich("Privates Projekt aus dem Team: nur im Teamprofil, nicht in den Listen des Instituts"),
      verschluesselt(),
      inhalt("Ziel, Stand, was gebraucht wird …"),
      text("image", "Titelbild", { mehr: true, platzhalter: "/assets/images/projekte/<name>/01.jpg – ohne Metadaten" }),
      socialBild(),
      themeField()
    ];
  }
  var TYPEN = {
    beitrag: {
      titel: "Beitrag", ordner: "_posts",
      datei: function (w) { return tag(w.date) + "-" + F.slugify(w.title, "titel-des-beitrags") + ".md"; },
      felder: [
        titel("Titel des Beitrags"),
        [zeit("date", "Datum & Uhrzeit", { pflicht: true, standard: function () { return jetzt(); }, ausgabe: mitZone }),
          persoenlich("Persönliches Update: nicht unter Neuigkeiten, sondern im Teamprofil")],
        leute("author", "✍️ Autor*in", { pflicht: true, standard: ["falko-richter"], ausgabe: einerOderListe }),
        stichworte({ hilfe: "Das event_tag eines Projekts zeigt den Beitrag auf der Projektseite" }),
        verlinkt(),
        externeLinks(),
        verschluesselt(),
        inhalt("Text in Markdown. Fotos als Galerie: ![Was zu sehen ist](/assets/images/news/<dateiname>/01.jpg) und darunter {: .gallery}"),
        adresse("original_url", "Original-Adresse", { mehr: true, hilfe: "nur bei übernommenen Beiträgen" }),
        text("original_site", "Original-Website", { mehr: true, platzhalter: "z. B. 35services.de" }),
        socialBild(),
        themeField()
      ]
    },
    termin: {
      titel: "Termin", ordner: "_events",
      datei: function (w) { return tag(w.start) + "-" + F.slugify(w.title, "name-des-termins") + ".md"; },
      felder: [
        titel("Name des Termins"),
        [zeit("start", "Beginn", { pflicht: true, standard: function () { return jetzt(16); }, ausgabe: ohneT }),
          zeit("end", "Ende", { folgt: function (w) { return plusStunden(w.start, 2); }, ausgabe: ohneT }),
          haken("all_day", "Ganztägig")],
        [text("location", "Ort", { platzhalter: "Ort, Straße (keine Wohnadressen)" }), adresse("location_url", "Link zum Ort")],
        text("summary", "Kurzbeschreibung (Terminliste & iCal)"),
        leute("team", "👥 Dabei", { hilfe: "nur wer wirklich da ist/war" }),
        projekte("projects", "🔧 Projekte"),
        stichworte(),
        partner("partners", "🤝 Partner"),
        verlinkt(),
        externeLinks(),
        [persoenlich("Privater Termin aus dem Team (braucht „Dabei“): nur im Teamprofil"),
          haken("project_only", "Nur auf der Projektseite", { hilfe: "interner Termin: vorher nicht im Kalender, danach normal" })],
        verschluesselt(),
        inhalt("Was passiert, wer kann kommen, was mitbringen …"),
        text("date_label", "Text statt Datum", { mehr: true, platzhalter: "z. B. „Januar 2027 – genauer Termin folgt“" }),
        socialBild(),
        themeField()
      ]
    },
    projekt: {
      titel: "Projekt", ordner: "_projects",
      datei: function (w) { return F.slugify(w.title, "name-des-projekts") + ".md"; },
      felder: projektFelder()
    },
    "projekt-vergangen": {
      titel: "Vergangenes Projekt", ordner: "_projects",
      datei: function (w) { return F.slugify(w.title, "name-des-projekts") + ".md"; },
      felder: projektFelder(),
      standard: {
        status: "abgeschlossen", start: "",
        text: "**Worum ging es?**\n\nFür wen war das Projekt, was war das Ziel?\n\n**Was wir gemacht haben:**\n\n- Erster Schritt\n- Zweiter Schritt\n\n**Was daraus geworden ist:**\n\nErgebnis, was wir gelernt haben, wie es weitergeht."
      }
    },
    geraet: {
      titel: "Gerät", ordner: "_equipment",
      datei: function (w) { return F.slugify(w.title, "hersteller-modell") + ".md"; },
      felder: [
        titel("Hersteller Modell"),
        [text("category", "Kategorie", { liste: "kategorien", platzhalter: "z. B. 3D-Drucker" }),
          auswahl("status", "Status", [["", "Im Einsatz"], ["in-aussicht", "🔭 In Aussicht"], ["im-test", "🧪 Im Test"], ["in-reparatur", "🔧 In Reparatur"]])],
        text("summary", "Kurzbeschreibung", { platzhalter: "Was das Gerät kann und wofür wir es nutzen" }),
        leute("owner_team", "🔑 Gehört (Team)"),
        partner("owner_partner", "🔑 Gehört (Partner)"),
        text("owner_name", "🔑 Gehört (andere)", { platzhalter: "freier Name", ausgabe: alsEintrag }),
        [text("location", "Standort", { platzhalter: "z. B. KTG, Raum 101" }),
          partner("location_partner", "📍 Steht bei Partner", { einzeln: true, ausgabe: einerOderListe })],
        stichworte({ hilfe: "Gerät, Gerätetyp, Besitzer*in, z. B. bambu-lab-a1-mini, 3d-drucker" }),
        verlinkt(),
        externeLinks(),
        verschluesselt(),
        inhalt("Was das Gerät kann, Erfahrungen, Tipps …"),
        text("image", "Foto", { mehr: true, platzhalter: "eigenes Foto ohne Metadaten – keine Hersteller- oder Shopfotos" }),
        text("image_alt", "Beschreibung des Fotos", { mehr: true }),
        haken("image_is_illustration", "Foto ist eine eigene SVG-Illustration", { mehr: true }),
        socialBild(),
        themeField()
      ],
      pruefe: function (w) {
        if (!(w.owner_team || []).length && !(w.owner_partner || []).length && !w.owner_name) return "Wem gehört das Gerät? Bitte mindestens eine Besitzer*in eintragen – das Institut besitzt selbst nichts.";
      }
    },
    herausforderung: {
      titel: "Herausforderung", ordner: "_challenges",
      datei: function (w) { return F.slugify(w.title, "kurzer-name") + ".md"; },
      felder: [
        titel("Was ist die Herausforderung? (kurz, gern als Frage)"),
        text("summary", "Kurz (ein Satz für die Karte)"),
        [auswahl("kind", "Art", [["frage", "❓ Frage"], ["aufgabe", "📋 Aufgabe"], ["problem", "⚠️ Problem"]]),
          auswahl("status", "Status", [["offen", "Offen"], ["in-arbeit", "In Arbeit"], ["geloest", "Gelöst"]]),
          datum("since", "Seit", { standard: F.heute })],
        [haken("important", "Wichtig", { hilfe: "allein 📌 einplanen, mit dringend 🔥 sofort" }),
          haken("urgent", "Dringend", { hilfe: "allein 🤝 abgeben, keins von beiden 💤 später" })],
        leute("team", "👥 Zuständig"),
        projekte("projects", "🔧 Projekte"),
        stichworte(),
        verlinkt(),
        externeLinks(),
        persoenlich("Aus einem privaten Projekt im Team"),
        verschluesselt(),
        inhalt("Was ist das Problem, was wurde schon probiert, was wird gebraucht?"),
        datum("solved_on", "Gelöst am", { mehr: true }),
        feld("langtext", "solution", "Lösung (Markdown)", { mehr: true, markdown: true, zeilen: 4 }),
        socialBild(),
        themeField()
      ]
    },
    team: {
      titel: "Teamprofil", ordner: "_team",
      datei: function (w) { return F.slugify(w.title, "vorname-nachname") + ".md"; },
      felder: [
        text("title", "Name", { pflicht: true, platzhalter: "Vorname Nachname", klasse: "form-feld-titel", hilfe: "Der Dateiname wird das Team-Kürzel für team, author, owner_team" }),
        [text("role", "Rolle", { platzhalter: "z. B. hilft in der KTG-AG" }), zahl("order", "Reihenfolge", { standard: "50", hilfe: "kleiner = weiter vorne" })],
        verlinkt(),
        externeLinks(),
        haken("not_in_team", "Nicht auf /team/ auflisten (nur eigene Seite zum Verlinken)"),
        verschluesselt(),
        inhalt("Was die Person macht und womit sie im Makespace hilft – keine Wohnadresse, keine privaten E-Mail-Adressen"),
        text("photo", "Foto", { mehr: true, platzhalter: "/assets/images/team/<kürzel>-480w.jpg – nur mit Erlaubnis" }),
        text("photo_credit", "Bildnachweis", { mehr: true, hilfe: "Pflicht bei Fremdfotos (Presse, Agentur)" }),
        socialBild(),
        themeField()
      ]
    },
    presse: {
      titel: "Pressemitteilung", ordner: "_press",
      datei: function (w) { return tag(w.date) + "-" + F.slugify(w.title, "titel-der-mitteilung") + ".md"; },
      felder: [
        titel("Überschrift der Pressemitteilung"),
        [text("subtitle", "Unterzeile"), datum("date", "Datum", { pflicht: true, standard: F.heute })],
        stichworte(),
        verlinkt(),
        externeLinks(),
        verschluesselt(),
        inhalt("**Berlin, Datum** – Erster Absatz mit dem Wichtigsten: wer, was, wann, wo, warum."),
        text("contact_name", "Pressekontakt", { mehr: true, hilfe: "leer = Pressekontakt aus _data/press.yml" }),
        socialBild(),
        themeField()
      ]
    },
    partner: {
      titel: "Partner", ordner: "_data/partner", format: "yaml",
      datei: function (w) { return F.slugify(w.name, "name-des-partners") + ".yml"; },
      felder: [
        text("name", "Name", { pflicht: true, klasse: "form-feld-titel", hilfe: "genau so, wie andere Seiten ihn unter partners: nennen" }),
        adresse("url", "Website", { pflicht: true }),
        text("description", "Beschreibung", { platzhalter: "Wer der Partner ist und wie wir zusammenarbeiten" }),
        adresse("instagram", "Instagram", { mehr: true }),
        text("logo", "Logo", { mehr: true, platzhalter: "/assets/images/partner/<name>.png" }),
        haken("logo_dark", "Logo hat helle Elemente (dunkler Hintergrund)", { mehr: true }),
        text("page", "Eigene Partnerseite", { mehr: true, platzhalter: "/partners/<name>/", hilfe: "Nur unsere eigene Unterseite (partners/<name>/index.md) – die Website des Partners gehört oben in „Website“." })
      ]
    },
    // Pages outside the collections, edit only (_plugins/source_files.rb sets page.edit_form, #154).
    // Markdown pages (partners/<name>/index.md, angebot/, spenden/ …): title, lead, links, text.
    seite: {
      titel: "Seite", ordner: "",
      datei: function (w) { return F.slugify(w.title, "name-der-seite") + ".md"; },
      felder: [
        titel("Titel der Seite"),
        text("lead", "Unterzeile", { platzhalter: "Ein Satz unter dem Titel" }),
        verlinkt(),
        externeLinks(),
        verschluesselt(),
        inhalt("Text der Seite in Markdown"),
        socialBild(),
        themeField()
      ]
    },
    // HTML overview pages (team/, partner/, projekte/ …): only the front matter – the HTML with its lists stays as it
    // is and is not shown in the form.
    uebersicht: {
      titel: "Übersichtsseite", ordner: "",
      datei: function (w) { return F.slugify(w.title, "name-der-seite") + ".html"; },
      felder: [
        titel("Titel der Seite"),
        text("lead", "Unterzeile", { platzhalter: "Ein Satz unter dem Titel" }),
        feld("langtext", "text", "🧑‍💻 HTML der Seite", { intern: true, mehr: true, code: true, zeilen: 18, klasse: "form-field-code",
          hilfe: "Für Mutige: Listen und Karten entstehen aus Liquid ({% for %} …). Vor dem Speichern wird geprüft, ob alle HTML-Tags und Liquid-Blöcke geschlossen sind." }),
        socialBild(),
        themeField()
      ],
      // only check the HTML when it was changed – a title change must never be blocked by the checker
      pruefe: function (w) { return aktiv && aktiv.edit && w.text === aktiv.edit.w0.text ? null : checkHtml(w.text); }
    },
    pressebericht: {
      titel: "Wir in der Presse", ordner: "_data/press_report", format: "yaml",
      datei: function (w) { return (w.date ? w.date + "-" : "") + F.slugify(w.medium, "medium") + ".yml"; },
      felder: [
        text("title", "Überschrift des Berichts", { pflicht: true, klasse: "form-feld-titel" }),
        [text("medium", "Medium", { pflicht: true, platzhalter: "Zeitung, Website oder Kanal" }), datum("date", "Erschienen am", { standard: F.heute })],
        adresse("url", "Link zum Bericht", { pflicht: true, hilfe: "ohne Tracking-Parameter (?si=, utm_ …)" }),
        chips("occasion", "🔗 Anlass (eigene Seite)", "seiten", { einzeln: true, ausgabe: einerOderListe, platzhalter: "Termin oder Beitrag suchen …" }),
        text("note", "Hinweis", { platzhalter: "erscheint in Klammern hinter dem Eintrag" })
      ]
    }
  };

  // ---------- state ----------
  var STORE = "ifsmb-neu:";
  var EDIT_HASH = /^#(bearbeiten|edit)$/; // <page>#bearbeiten opens the edit form directly (_includes/edit-buttons.html)
  var d = null, form, links, mehrBox, vorschau, socialBox, socialImg, socialTitel, socialBeschr, dateiInput, ordnerEl, status, hinweisEl, vorlageLink;
  var aktiv = null; // { typ, schema, w (values), beruehrt (edited by hand), schluessel, gesendet, felder, edit, path }
  var stepsEl, discardBtn, submitBtn, githubBtn, fotosBtn, fotosEl, filesBtn, filesEl, recycleBox;

  function alleFelder(schema) {
    return schema.felder.reduce(function (a, z) { return a.concat(z); }, []).concat([{ name: "datei", intern: true, folgt: schema.datei }]);
  }
  // Values of a new form: field defaults, then the type's defaults, then the prefill from the page (vorgabe).
  function anfangswerte(schema, vorgabe) {
    var felder = alleFelder(schema), w = {};
    felder.forEach(function (f) {
      var s = typeof f.standard === "function" ? f.standard() : f.standard;
      w[f.name] = f.typ === "chips" ? alsListe(s) : f.typ === "links" ? [] : f.typ === "haken" ? !!s : s == null ? "" : String(s);
    });
    Object.assign(w, schema.standard);
    Object.keys(vorgabe || {}).forEach(function (k) {
      var v = vorgabe[k], f = felder.filter(function (x) { return x.name === k; })[0];
      if (!f || v == null || v === "" || f.typ === "links") return;
      w[k] = f.typ === "chips" ? alsListe(v) : f.typ === "haken" ? v === true || v === "true" : String(v);
    });
    return w;
  }
  // Derived fields (file name, event_tag, end …) follow the others until edited by hand. Returns the changed names.
  function folgeWerte(felder, w, beruehrt) {
    return felder.filter(function (f) {
      if (!f.folgt || beruehrt[f.name]) return false;
      var v = f.folgt(w);
      if (v === w[f.name]) return false;
      w[f.name] = v;
      return true;
    }).map(function (f) { return f.name; });
  }
  function speichereEntwurf() {
    try {
      var wDraft = aktiv.w;
      if (aktiv.crypto && (aktiv.w.encrypted || aktiv.crypto.wasEncrypted)) {
        wDraft = Object.assign({}, aktiv.w, { text: aktiv.crypto.encryptedBlock || aktiv.crypto.initialEncryptedBlock || "" });
      }
      localStorage.setItem(aktiv.schluessel, JSON.stringify({ w: wDraft, beruehrt: aktiv.beruehrt, source: aktiv.edit && aktiv.edit.source, pr: aktiv.prBase || null, savedAt: Date.now() }));
    } catch (e) { /* storage blocked */ }
  }
  function ladeEntwurf() {
    try { return JSON.parse(localStorage.getItem(aktiv.schluessel) || "null"); } catch (e) { return null; }
  }
  function loescheEntwurf() { try { localStorage.removeItem(aktiv.schluessel); } catch (e) { /* storage blocked */ } }

  // ---------- client-side encryption in the form (assets/js/crypto-page.js) ----------
  function withCrypto() {
    if (typeof window !== "undefined" && window.CryptoPage) return Promise.resolve(window.CryptoPage);
    if (typeof window !== "undefined" && window.ladeSkripte) {
      return window.ladeSkripte(["crypto-page.js"]).then(function () { return window.CryptoPage; });
    }
    if (typeof require === "function") return Promise.resolve(require("./crypto-page.js"));
    return Promise.reject(new Error("CryptoPage nicht verfügbar."));
  }
  function parseEncryptedBlock(text) {
    var m = String(text || "").trim().match(/^<script\s+type=["']application\/json["']\s+class=["']encrypted-data["']\s*>\s*([\s\S]*?)\s*<\/script>$/i);
    if (!m) return null;
    try {
      var p = JSON.parse(m[1]);
      return p && p.kdf && p.kdf.salt && p.iv && p.data ? p : null;
    } catch (e) { return null; }
  }
  function initCryptoState(state, isEdit) {
    var rawBody = isEdit && state.edit ? state.edit.w0.text : "";
    var payload = isEdit ? parseEncryptedBlock(rawBody) : null;
    state.crypto = {
      wasEncrypted: !!payload,
      unlocked: !payload,
      initialPayload: payload,
      initialEncryptedBlock: payload ? rawBody : null,
      initialPlaintext: null,
      initialPassword: "",
      password: "",
      encryptedBlock: payload ? rawBody : null,
      encryptedForText: null,
      encryptedForPw: null,
      encryptedForAtts: null,
      lastKey: null,
      lastPayload: payload || null,
      migratedPublicImages: [],
      promise: null,
      error: ""
    };
    if (payload) {
      // keep plaintext field empty while locked so the raw JSON ciphertext is never edited as Markdown
      state.w.text = "";
    }
  }
  function mimeForPath(p) {
    if (/\.png$/i.test(p)) return "image/png";
    if (/\.webp$/i.test(p)) return "image/webp";
    if (/\.gif$/i.test(p)) return "image/gif";
    if (/\.svg$/i.test(p)) return "image/svg+xml";
    if (/\.pdf$/i.test(p)) return "application/pdf";
    if (/\.3mf$/i.test(p)) return "model/3mf";
    if (/\.stl$/i.test(p)) return "model/stl";
    if (/\.(mp4|m4v)$/i.test(p)) return "video/mp4";
    if (/\.webm$/i.test(p)) return "video/webm";
    if (/\.mp3$/i.test(p)) return "audio/mpeg";
    if (/\.m4a$/i.test(p)) return "audio/mp4";
    return "image/jpeg";
  }
  // Collects local images (/assets/images/...) referenced in state.w.text (plus used photos in state.photos)
  // that need to be listed as .blob attachments in the encrypted payload.
  function collectEncryptedAttachments(state) {
    if (!state || !state.w || !state.w.encrypted) return [];
    var initialAtts = (state.crypto && state.crypto.initialPayload && Array.isArray(state.crypto.initialPayload.attachments))
      ? state.crypto.initialPayload.attachments : [];
    var alreadyInInitial = {};
    initialAtts.forEach(function (a) { if (a && a.name) alreadyInInitial[a.name] = true; });
    var found = [], seen = {};
    function addPath(url) {
      if (!url || seen[url] || alreadyInInitial[url]) return;
      seen[url] = true;
      found.push({ name: url, blob: url + ".blob", mime: mimeForPath(url) });
    }
    // photos and 📎 attachments (/assets/dateien/: 3D models, audio, video)
    var md = String(state.w.text || ""), re = /!\[[^\]]*\]\((\/assets\/(?:images\/[^\s)"'\]]+\.(?:jpe?g|png|webp|gif)|dateien\/[^\s)"'\]]+))\)/gi, m;
    while ((m = re.exec(md))) addPath(m[1]);
    (state.photos || []).forEach(function (p) {
      var u = "/" + p.folder + p.name;
      if (md.indexOf("](" + u + ")") >= 0) addPath(u);
    });
    return found;
  }
  // When encryption is enabled, public front-matter image fields (image, photo, logo)
  // would leak unencrypted photos in the public front matter. Move any local image into the
  // encrypted Markdown gallery and clear those public front-matter image fields.
  // social_media_preview_image (-social.jpg) is intentionally kept unencrypted (with a warning in the UI)
  // so social media / messenger link previews still work.
  function migratePublicImagesToEncrypted(state) {
    if (!state || !state.w || !state.w.encrypted || !state.crypto) return;
    if (state.crypto.wasEncrypted && !state.crypto.unlocked) return;
    var t = String(state.w.text || "").replace(/\s+$/, "");
    function ensureInGallery(imgUrl, altText) {
      if (!imgUrl || !/^\/assets\/images\//.test(imgUrl) || /\/og-preview\.jpg$/.test(imgUrl) || /-social\.jpg$/i.test(imgUrl)) return;
      if (t.indexOf("](" + imgUrl + ")") >= 0) return;
      var line = "![" + String(altText || state.w.title || "Bild").replace(/[\[\]]/g, "") + "](" + imgUrl + ")";
      t = /\n\{: \.gallery[^}]*\}$/.test(t) && /\)\n\{: \.gallery[^}]*\}$/.test(t)
        ? t.replace(/\n(\{: \.gallery[^}]*\})$/, "\n" + line + "\n$1")
        : t + (t ? "\n\n" : "") + line + "\n{: .gallery}";
    }
    (state.photos || []).forEach(function (p) {
      var u = "/" + p.folder + p.name;
      if (state.w.image === u || state.w.photo === u || state.w.logo === u) {
        ensureInGallery(u, p.alt);
      }
    });
    ["image", "photo", "logo"].forEach(function (field) {
      var val = state.w[field];
      if (!val) return;
      if (field === "image") ensureInGallery(val, state.w.image_alt || state.w.title);
      if (/^\/assets\/images\//.test(val) && state.crypto.migratedPublicImages.indexOf(val) < 0) {
        state.crypto.migratedPublicImages.push(val);
      }
      state.w[field] = "";
      var inp = form && form.elements[field];
      if (inp) inp.value = "";
    });
    if ("image_alt" in state.w && state.w.image_alt) {
      state.w.image_alt = "";
      var altInp = form && form.elements.image_alt;
      if (altInp) altInp.value = "";
    }
    var newMd = t ? t + "\n" : "";
    if (newMd.replace(/\s+$/, "") !== String(state.w.text || "").replace(/\s+$/, "")) {
      state.w.text = newMd.replace(/\s+$/, "");
      var ed = editors.filter(function (e) { return e.textarea && e.textarea.name === "text"; })[0];
      if (ed) ed.setValue(state.w.text); else if (form && form.elements.text) form.elements.text.value = state.w.text;
    }
  }
  function effectiveTextForSave(state) {
    if (!state || !state.crypto) return state ? state.w.text : "";
    var c = state.crypto;
    if (state.w.encrypted) {
      if (c.wasEncrypted && !c.unlocked) return c.initialEncryptedBlock;
      var extraAtts = collectEncryptedAttachments(state);
      if (c.wasEncrypted && c.unlocked && !extraAtts.length && state.w.text === c.initialPlaintext && c.password === c.initialPassword) {
        return c.initialEncryptedBlock;
      }
      if (c.encryptedBlock) return c.encryptedBlock;
      if (c.initialEncryptedBlock) return c.initialEncryptedBlock;
      return '<script type="application/json" class="encrypted-data">\n  /* 🔒 Bitte Passwort eingeben, um den Inhalt zu verschlüsseln */\n</script>';
    }
    if (c.wasEncrypted && !c.unlocked) return c.initialEncryptedBlock;
    return state.w.text;
  }
  function scheduleCryptoEncrypt(state) {
    if (!state || !state.crypto || !state.w.encrypted) return Promise.resolve();
    var c = state.crypto;
    if (c.wasEncrypted && !c.unlocked) return Promise.resolve(c.initialEncryptedBlock);
    if (!c.password) {
      c.encryptedBlock = null;
      c.encryptedForText = null;
      c.encryptedForPw = null;
      c.encryptedForAtts = null;
      return Promise.resolve(null);
    }
    var extraAtts = collectEncryptedAttachments(state);
    var attsKey = JSON.stringify(extraAtts);
    if (c.wasEncrypted && !extraAtts.length && state.w.text === c.initialPlaintext && c.password === c.initialPassword) {
      c.encryptedBlock = c.initialEncryptedBlock;
      c.encryptedForText = state.w.text;
      c.encryptedForPw = c.password;
      c.encryptedForAtts = attsKey;
      c.lastPayload = c.initialPayload;
      if (aktiv === state && vorschau) zeigeVorschau();
      return Promise.resolve(c.encryptedBlock);
    }
    if (c.encryptedBlock && c.encryptedForText === state.w.text && c.encryptedForPw === c.password && c.encryptedForAtts === attsKey && c.lastKey) {
      return Promise.resolve(c.encryptedBlock);
    }
    var textToEnc = state.w.text, pwToEnc = c.password;
    var keepKdf = !!(c.wasEncrypted && pwToEnc === c.initialPassword);
    var p = withCrypto().then(function (CP) {
      return CP.encryptMarkdownPayload(textToEnc, pwToEnc, c.initialPayload, keepKdf, extraAtts);
    }).then(function (res) {
      if (state.w.text === textToEnc && c.password === pwToEnc) {
        c.encryptedBlock = res.block;
        c.encryptedForText = textToEnc;
        c.encryptedForPw = pwToEnc;
        c.encryptedForAtts = attsKey;
        c.lastKey = res.key;
        c.lastPayload = res.payload;
        if (aktiv === state && vorschau) zeigeVorschau();
      }
      return res.block;
    });
    c.promise = p;
    return p;
  }
  function unlockCryptoForEdit(state, password, silent) {
    if (!state || !state.crypto || !state.crypto.initialPayload || !password) {
      return Promise.reject(new Error("Bitte Passwort eingeben."));
    }
    var c = state.crypto;
    return withCrypto().then(function (CP) {
      return CP.decryptMarkdown(c.initialPayload, password).then(function (plain) {
        if (aktiv !== state) return plain;
        var norm = String(plain || "").replace(/^\n+/, "").replace(/\s+$/, "");
        c.unlocked = true;
        c.error = "";
        c.password = password;
        c.initialPassword = password;
        c.initialPlaintext = norm;
        c.encryptedBlock = c.initialEncryptedBlock;
        c.encryptedForText = norm;
        c.encryptedForPw = password;
        state.w.text = norm;
        migratePublicImagesToEncrypted(state);
        scheduleCryptoEncrypt(state);
        CP.setUnlockedPassword(state.w.uuid || state.url, password, false);
        if (typeof document !== "undefined") {
          var pageContainer = document.querySelector(".encrypted-container");
          if (pageContainer && typeof pageContainer._cryptoTryUnlock === "function") {
            pageContainer._cryptoTryUnlock(password, false).catch(function () {});
          }
        }
        baueFelder();
        zeigeVorschau();
        return norm;
      });
    }).catch(function (err) {
      if (aktiv === state && !silent) {
        c.error = "Falsches Passwort – der Inhalt konnte nicht entschlüsselt werden.";
        var errEl = d && d.querySelector("[data-crypto-err]");
        if (errEl) { errEl.textContent = c.error; errEl.hidden = false; }
      }
      throw err;
    });
  }

  // ---------- file ----------
  // random v4 UUID for the "read" marker (assets/js/gelesen.js); crypto.randomUUID needs a secure context
  function neueUuid() {
    var c = typeof crypto !== "undefined" ? crypto : null;
    if (c && c.randomUUID) return c.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (z) {
      var r = Math.random() * 16 | 0;
      return (z === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function dateiText(schema, w) {
    var paare = alleFelder(schema).filter(function (f) { return !f.intern; }).map(function (f) {
      return [f.name, f.ausgabe ? f.ausgabe(w[f.name], w) : w[f.name]];
    });
    // pages get a uuid (kept in the draft, so it stays the same while editing); _data/*.yml entries don't
    if (schema.format !== "yaml") {
      if (!w.uuid) w.uuid = neueUuid();
      paare.push(["uuid", w.uuid]);
    }
    return schema.format === "yaml" ? F.yaml(paare) + "\n" : F.frontMatter(paare, w.text);
  }
  function dateiInhalt() {
    var wOut = aktiv.crypto ? Object.assign({}, aktiv.w, { text: effectiveTextForSave(aktiv) }) : aktiv.w;
    return aktiv.edit ? editedText(aktiv.schema, aktiv.edit, wOut) : dateiText(aktiv.schema, wOut);
  }

  // ---------- editing an existing file ----------
  function sameValue(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // value from the file → value of the form field (undefined: the form can't show it)
  function toFieldValue(f, v) {
    if (f.typ === "chips") return Array.isArray(v) ? v.map(String) : F.leer(v) ? [] : [String(v)];
    if (f.typ === "haken") return v === true || v === "true";
    // a one-entry list of text is what alsEintrag writes (owner_name) – show it as that text
    if (Array.isArray(v) && v.length === 1 && typeof v[0] === "string" && !f.optionen) v = v[0];
    if (Array.isArray(v) || typeof v === "boolean") return undefined;
    v = String(v);
    if (f.typ === "zeit") { var m = v.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? m[1] + "T" + (m[2] || "00:00") : v; }
    if (f.typ === "datum") return v.slice(0, 10);
    if (f.typ === "langtext" || f.typ === "text" || f.typ === "adresse") return v.replace(/\n$/, "");
    return v;
  }
  // Reads a source file for a type. → { source, file (blocks + rest), w0 (values as loaded), rawFields ({ name: true }
  // for fields the form can't show, e.g. lists of objects) } or null if the file has no front matter.
  // Pure YAML files (_data/partner/<name>.yml, schema.format "yaml") are read like front matter without a body –
  // needed e.g. after the first save of a new partner, when the form carries on in that pull request.
  function readSource(schema, source, path) {
    var yaml = schema.format === "yaml";
    var file = F.splitFile(yaml ? "---\n" + String(source).replace(/\r\n/g, "\n").replace(/\n*$/, "\n") + "---\n" : source);
    if (!file) return null;
    var fields = alleFelder(schema), w = anfangswerte(schema), rawFields = {};
    fields.forEach(function (f) { if (f.typ) w[f.name] = f.typ === "chips" || f.typ === "links" ? [] : f.typ === "haken" ? false : ""; });
    file.blocks.forEach(function (block) {
      if (block.key === "uuid") { w.uuid = F.yamlValue(block.raw); return; }
      var f = block.key && fields.filter(function (x) { return x.name === block.key && x.typ && !x.intern; })[0];
      if (!f) return;
      var v = f.typ === "links" ? F.yamlLinks(block.raw) : F.yamlValue(block.raw);
      var value = v === undefined ? undefined : f.typ === "links" ? v : toFieldValue(f, v);
      if (value === undefined) rawFields[f.name] = true; else w[f.name] = value;
    });
    w.text = file.rest.replace(/^\n+/, "").replace(/\s+$/, "");
    w.datei = path ? path.split("/").pop() : "";
    return { source: source, file: file, w0: JSON.parse(JSON.stringify(w)), rawFields: rawFields, yaml: yaml };
  }
  // The file with the changed fields: unchanged blocks stay as they were, changed ones are written anew (or removed
  // when emptied), new fields go to the end of the front matter. The body only changes when the text was edited.
  function editedText(schema, edit, w) {
    var fields = alleFelder(schema).filter(function (f) { return f.typ && !f.intern; }), seen = {};
    function yamlLine(f) { return F.yaml([[f.name, f.ausgabe ? f.ausgabe(w[f.name], w) : w[f.name]]]); }
    var blocks = [];
    edit.file.blocks.forEach(function (block) {
      var f = block.key && fields.filter(function (x) { return x.name === block.key; })[0];
      if (f) seen[f.name] = true;
      if (!f || edit.rawFields[f.name] || sameValue(w[f.name], edit.w0[f.name])) { blocks.push(block.raw); return; }
      var line = yamlLine(f), trailingBlank = (block.raw.match(/(\n\s*)*$/) || [""])[0];
      // keep a trailing comment of a one-line value ("status: offen   # offen, in-arbeit oder geloest")
      var first = block.raw.split("\n")[0], withoutComment = first.replace(/\s+#[^"'\n]*$/, "");
      if (line && line.indexOf("\n") < 0 && withoutComment !== first && sameValue(F.yamlValue(withoutComment), F.yamlValue(first))) {
        line += first.slice(withoutComment.length);
      }
      if (line) blocks.push(line + trailingBlank); else if (trailingBlank.length > 1) blocks.push(trailingBlank.slice(1));
    });
    fields.forEach(function (f) {
      if (seen[f.name] || sameValue(w[f.name], edit.w0[f.name])) return;
      var line = yamlLine(f);
      if (!line) return;
      var i = blocks.length; // before a trailing uuid
      var original = edit.file.blocks;
      if (original.length && original[original.length - 1].key === "uuid") i = blocks.length - 1;
      blocks.splice(i, 0, line);
    });
    // pages without a uuid get one on saving (kept in w, so it stays the same while editing); _data/*.yml entries,
    // overview pages (`search: false`) and redirects don't – same rule as _scripts/uuids_ergaenzen.rb
    var keinUuid = edit.file.blocks.some(function (b) {
      var v = b.key && F.yamlValue(b.raw);
      return b.key === "uuid" || (b.key === "search" && v === false) || (b.key === "layout" && v === "weiterleitung");
    });
    if (schema.format !== "yaml" && schema !== TYPEN.uebersicht && !keinUuid) {
      if (!w.uuid) w.uuid = neueUuid();
      blocks.push("uuid: " + w.uuid);
    }
    // a changed body keeps the file's own spacing after "---" (Markdown: an empty line, index.html: none) and the
    // indentation of its first line – only line breaks around it are dropped, like readSource does
    var body = String(w.text).replace(/^\n+/, "").replace(/\s+$/, ""), gap = (edit.file.rest.match(/^\n*/)[0] || "") || "\n\n";
    if (!/\S/.test(edit.file.rest)) gap = "\n\n";
    var rest = w.text === edit.w0.text ? edit.file.rest : body ? gap + body + "\n" : "\n";
    if (edit.yaml) return blocks.join("\n").replace(/\n*$/, "\n"); // pure YAML: no "---", no body
    return F.joinFile(blocks, rest);
  }
  // Without DOM: the file after changing some values (tests). → { content, rawFields, values }
  function editedFile(type, source, changes, path) {
    var schema = TYPEN[type], edit = readSource(schema, source, path);
    if (!edit) return null;
    var w = Object.assign(JSON.parse(JSON.stringify(edit.w0)), changes || {});
    return { content: editedText(schema, edit, w), rawFields: Object.keys(edit.rawFields), values: edit.w0 };
  }
  // Lines of after that are not in before (longest common subsequence) → array of booleans
  function changedLines(before, after) {
    var a = before.split("\n"), n = after.split("\n"), L = [];
    for (var i = a.length; i >= 0; i--) { L[i] = []; for (var j = n.length; j >= 0; j--) L[i][j] = i === a.length || j === n.length ? 0 : a[i] === n[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]); }
    var r = n.map(function () { return true; }), x = 0, y = 0;
    while (x < a.length && y < n.length) {
      if (a[x] === n[y]) { r[y] = false; x++; y++; } else if (L[x + 1][y] >= L[x][y + 1]) x++; else y++;
    }
    return r;
  }
  // Without DOM: the file a form of this type would create from these values (as if typed in by hand).
  function datei(typ, werte) {
    var schema = TYPEN[typ], w = anfangswerte(schema), beruehrt = {};
    Object.keys(werte || {}).forEach(function (k) { w[k] = werte[k]; beruehrt[k] = werte[k] !== ""; });
    folgeWerte(alleFelder(schema), w, beruehrt);
    return { ordner: schema.ordner, datei: w.datei, inhalt: dateiText(schema, w), format: schema.format || "markdown", werte: w };
  }

  // ---------- dialog ----------
  function baueDialog() {
    d = F.dialog({ id: "neu-dialog", klasse: "neu-dialog", kopf: '<a class="neu-vorlage small" data-vorlage target="_blank" rel="noopener"></a>' });
    d.insertAdjacentHTML("beforeend",
      '<form class="neu-form" autocomplete="off">'
      + '<div class="neu-spalten"><div class="neu-links"><p class="neu-hinweis muted small"></p><div class="neu-felder"></div>'
      + '<details class="neu-mehr"><summary>' + esc(t("form.more_fields", null, "Weitere Felder")) + '</summary><div class="neu-felder"></div></details></div>'
      + '<aside class="neu-rechts"><label class="form-feld"><span></span><span class="neu-pfad"><code></code><input name="datei" type="text" required spellcheck="false"></span></label>'
      + '<pre class="neu-vorschau" aria-label="' + esc(t("form.file_preview", null, "Vorschau der Datei")) + '"></pre>'
      + '<details class="neu-social" open><summary>' + esc(t("form.social_preview", null, "Social-Media-Vorschau (WhatsApp, Signal, X …)")) + '</summary>'
      + '<div class="neu-social-karte"><img class="neu-social-bild" src="/assets/images/og-preview.jpg" alt="" loading="lazy">'
      + '<div class="neu-social-text"><span class="neu-social-domain">' + esc(siteHost()) + '</span><strong class="neu-social-titel"></strong><span class="neu-social-beschr"></span></div></div></details>'
      + '<div class="form-photos" aria-label="' + esc(t("form.new_photos", null, "Neue Fotos")) + '"></div>'
      + '<div class="form-files" aria-label="' + esc(t("form.new_files", null, "Neue Dateien")) + '"></div>'
      + '<ol class="neu-schritte small"></ol></aside></div>'
      + '<div class="form-fuss"><button type="button" class="btn btn-small btn-ghost" data-verwerfen></button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-github>' + esc(t("github.connect", null, "🔑 GitHub verbinden")) + '</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-photos hidden>' + esc(t("form.add_photos", null, "📷 Fotos hinzufügen")) + '</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-files hidden title="' + esc(t("form.add_files_title", null, "STL, 3MF, MP4 oder MP3 an der Cursor-Position einfügen")) + '">' + esc(t("form.add_files", null, "📎 Datei")) + '</button>'
      + '<label class="form-recycle small" hidden><input type="checkbox" data-recycle> ' + esc(t("form.recycle", null, "♻️ PR")) + ' <span class="muted" data-recycle-target></span></label>'
      + '<span class="muted small" data-status aria-live="polite"></span>'
      + '<button type="submit" class="btn" data-submit></button></div></form>');
    form = d.querySelector("form");
    links = d.querySelector(".neu-links > .neu-felder");
    mehrBox = d.querySelector(".neu-mehr");
    vorschau = d.querySelector(".neu-vorschau");
    socialBox = d.querySelector(".neu-social");
    socialImg = d.querySelector(".neu-social-bild");
    socialTitel = d.querySelector(".neu-social-titel");
    socialBeschr = d.querySelector(".neu-social-beschr");
    dateiInput = form.elements.datei;
    ordnerEl = d.querySelector(".neu-pfad code");
    status = d.querySelector("[data-status]");
    hinweisEl = d.querySelector(".neu-hinweis");
    vorlageLink = d.querySelector(".neu-vorlage");
    stepsEl = d.querySelector(".neu-schritte");
    discardBtn = d.querySelector("[data-verwerfen]");
    submitBtn = d.querySelector("[data-submit]");
    githubBtn = d.querySelector("[data-github]");
    fotosBtn = d.querySelector("[data-photos]");
    fotosEl = d.querySelector(".form-photos");
    filesBtn = d.querySelector("[data-files]");
    recycleBox = d.querySelector(".form-recycle");
    recycleBox.querySelector("[data-recycle]").addEventListener("change", function (e) {
      try { localStorage.setItem(RECYCLE_KEY, e.target.checked ? "1" : "0"); } catch (x) { /* storage blocked */ }
      direct.update();
    });
    recycleBox.addEventListener("change", function (e) {
      if (!e.target.matches("[data-recycle-select]") || !aktiv) return;
      aktiv.recycleCandidate = (aktiv.recycleCandidates || []).filter(function (pr) { return String(pr.number) === e.target.value; })[0] || aktiv.recycleCandidate;
      direct.update();
    });
    filesEl = d.querySelector(".form-files");
    githubBtn.addEventListener("click", function () { direct.connectDialog(); });
    fotosBtn.addEventListener("click", function () { direct.addPhotos(); });
    filesBtn.addEventListener("click", function () { direct.addFiles(); });
    filesEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-file-remove]"); if (b) direct.removeFile(+b.getAttribute("data-file-remove"));
      var x = e.target.closest("[data-existing-remove]"); if (x) direct.removeExisting(+x.getAttribute("data-existing-remove"));
      var u = e.target.closest("[data-existing-undo]"); if (u) direct.undoRemoveExisting(+u.getAttribute("data-existing-undo"));
    });
    fotosEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-photo-remove]"); if (b) { direct.removePhoto(+b.getAttribute("data-photo-remove")); return; }
      var t = e.target.closest("[data-toggle]"); if (t) direct.toggle(+t.closest("[data-photo]").getAttribute("data-photo"), t.getAttribute("data-toggle"));
    });
    fotosEl.addEventListener("dragstart", function (e) {
      var c = e.target.closest("[data-photo]"); if (!c) return;
      e.dataTransfer.setData("text/x-ifsmb-photo", c.getAttribute("data-photo")); e.dataTransfer.effectAllowed = "copy";
    });
    fotosEl.addEventListener("dragover", function (e) {
      var sl = e.target.closest("[data-slot]"); if (!sl || e.dataTransfer.types.indexOf("text/x-ifsmb-photo") < 0) return;
      e.preventDefault(); sl.classList.add("media-drop");
    });
    fotosEl.addEventListener("dragleave", function (e) { var sl = e.target.closest("[data-slot]"); if (sl) sl.classList.remove("media-drop"); });
    fotosEl.addEventListener("drop", function (e) {
      var sl = e.target.closest("[data-slot]"); if (!sl) return;
      e.preventDefault(); sl.classList.remove("media-drop");
      var i = +e.dataTransfer.getData("text/x-ifsmb-photo"), p = aktiv.photos[i], slot = direct.slots().filter(function (x) { return x.id === sl.getAttribute("data-slot"); })[0];
      if (p && slot) direct.assign(p, slot).then(direct.showPhotos, function (err) { direct.showError(err); });
    });
    // direct pull requests: github-api.js is small – load it with the dialog to know whether a token is there
    if (window.ladeSkripte) window.ladeSkripte(["github-api.js"]).then(function () { direct.update(); }).catch(function () {});

    form.addEventListener("input", aenderung);
    form.addEventListener("change", aenderung);
    // remember where the cursor is in the text, so "📎 Datei" puts the embed there (the file dialog takes the focus)
    ["keyup", "click", "select", "input", "focusout"].forEach(function (ev) {
      form.addEventListener(ev, function (e) {
        var ta = e.target;
        if (ta && ta.tagName === "TEXTAREA" && ta.name === "text") ta.setAttribute("data-cursor", String(ta.selectionEnd));
      });
    });
    // Enter in a one-line field must not send the form
    form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "submit") e.preventDefault(); });
    form.addEventListener("submit", function (e) { e.preventDefault(); anlegen(); });
    discardBtn.addEventListener("click", function () {
      loescheEntwurf();
      direct.clearPhotos();
      if (aktiv.edit) {
        aktiv.w = JSON.parse(JSON.stringify(aktiv.edit.w0));
        aktiv.beruehrt = allTouched();
        if (aktiv.crypto) {
          if (aktiv.crypto.wasEncrypted && aktiv.crypto.unlocked) {
            aktiv.w.text = aktiv.crypto.initialPlaintext;
            aktiv.crypto.password = aktiv.crypto.initialPassword;
            aktiv.crypto.encryptedBlock = aktiv.crypto.initialEncryptedBlock;
            aktiv.crypto.encryptedForText = aktiv.crypto.initialPlaintext;
            aktiv.crypto.encryptedForPw = aktiv.crypto.initialPassword;
          } else {
            initCryptoState(aktiv, true);
          }
        }
      } else {
        aktiv.w = anfangswerte(aktiv.schema, aktiv.vorgabe);
        aktiv.beruehrt = {};
        if (aktiv.crypto) initCryptoState(aktiv, false);
      }
      folge(); baueFelder(); zeigeVorschau();
      status.textContent = aktiv.edit ? t("form.discarded", null, "Änderungen verworfen.") : t("form.restarted", null, "Neu angefangen.");
    });
    // "close" fires a moment after close(); if the dialog was opened again meanwhile, leave the new form alone
    d.addEventListener("close", function () {
      if (d.open) return;
      if (aktiv && aktiv.gesendet) loescheEntwurf();
      destroyEditors(); aktiv = null;
      if (EDIT_HASH.test(location.hash)) history.replaceState(history.state, "", location.pathname + location.search);
    });
  }

  // The page being edited, in every spelling a link to it can have – never offered as a link to itself (#128).
  function ownAddresses(url) {
    if (!url) return [];
    var path = url.replace(/^https?:\/\/[^/]+/, "").replace(/index\.html$/, ""), bare = path.replace(/\/$/, "");
    var forms = [path, bare, bare + "/", bare + "/index.html"];
    var hosts = (siteCfg().url ? [siteCfg().url.replace(/\/$/, "")] : []).concat(typeof location !== "undefined" && location.origin ? [location.origin] : []);
    return forms.concat.apply(forms, hosts.map(function (h) { return forms.map(function (x) { return h + x; }); }));
  }

  // in edit mode a required field only stays required if the file had a value (old posts without date: …)
  function isRequired(f) { return f.pflicht && !(aktiv.edit && F.leer(aktiv.edit.w0[f.name])); }
  function baueCryptoFeld(f) {
    var c = aktiv.crypto || {}, w = !!aktiv.w.encrypted;
    var lockedExisting = !!(c.wasEncrypted && !c.unlocked);
    var wrap = F.el('<div class="form-feld form-crypto-wrap">'
      + '<label class="form-check"><input type="checkbox" name="encrypted"' + (w ? " checked" : "") + (lockedExisting ? ' disabled title="Bitte zuerst das Passwort eingeben und entsperren"' : "") + "><span>" + esc(f.label) + "</span></label>"
      + '<div class="form-crypto-box"></div></div>');
    var box = wrap.querySelector(".form-crypto-box");
    if (lockedExisting) {
      box.innerHTML = '<div class="card small" style="margin-top: 0.5rem; padding: 0.85rem 1rem; border-left: 4px solid var(--accent, #e6a800);">'
        + '<p style="margin: 0 0 0.5rem;"><strong>🔒 Verschlüsselte Seite entsperren</strong> – gib das Passwort ein, um den Klartext im Editor zu öffnen und zu bearbeiten:</p>'
        + '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">'
        + '<input type="password" data-crypto-unlock-pw placeholder="Passwort eingeben …" autocomplete="current-password" style="flex: 1; min-width: 180px;">'
        + '<button type="button" class="btn btn-small" data-crypto-unlock-btn>🔓 Entschlüsseln &amp; Text bearbeiten</button>'
        + "</div>"
        + '<p class="small" data-crypto-err style="color: #b00; margin: 0.4rem 0 0;"' + (c.error ? "" : " hidden") + ">" + esc(c.error || "") + "</p>"
        + '<small class="form-hilfe" style="display: block; margin-top: 0.4rem;">Titel, Stichworte und Verbindungen lassen sich auch ohne Passwort ändern – der verschlüsselte Inhalt bleibt dann unverändert.</small>'
        + "</div>";
      var unlockInput = box.querySelector("[data-crypto-unlock-pw]"), unlockBtn = box.querySelector("[data-crypto-unlock-btn]");
      var doUnlock = function () {
        var pw = unlockInput.value;
        if (!pw) { unlockInput.focus(); return; }
        unlockBtn.disabled = true;
        unlockCryptoForEdit(aktiv, pw, false).catch(function () { unlockBtn.disabled = false; unlockInput.focus(); });
      };
      unlockBtn.addEventListener("click", doUnlock);
      unlockInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doUnlock(); } });
    } else if (w) {
      var noteHtml = (aktiv.edit && !c.wasEncrypted)
        ? '<p class="note small" data-crypto-history-note style="margin: 0 0 0.6rem;">⚠️ <strong>Hinweis zur Git-Historie:</strong> Diese Seite war bisher unverschlüsselt veröffentlicht. Der frühere Klartext bleibt in älteren Git-Commits (und ggf. in Archiven oder Suchmaschinen) weiterhin öffentlich einsehbar. Nur der aktuelle Stand der Seite wird ab jetzt verschlüsselt ausgeliefert. Titel und Front-Matter-Felder bleiben sichtbar.</p>'
        : (c.wasEncrypted
          ? '<p class="small muted" style="margin: 0 0 0.5rem;">🔓 <strong>Klartext entsperrt:</strong> Du bearbeitest unten den entschlüsselten Markdown-Text. Beim Speichern wird er automatisch wieder verschlüsselt.</p>'
          : '<p class="small muted" style="margin: 0 0 0.5rem;">🔒 Der Markdown-Text unten wird vor dem Speichern im Browser mit AES-GCM (256 Bit) verschlüsselt. Titel und Front-Matter-Felder bleiben öffentlich lesbar.</p>');
      var socialWarnHtml = aktiv.w.social_media_preview_image
        ? '<p class="note small" data-crypto-social-warn style="margin: 0 0 0.6rem;">⚠️ <strong>Social-Media-Vorschaubild unverschlüsselt:</strong> Das Vorschaubild (<code>' + esc(aktiv.w.social_media_preview_image) + '</code>) bleibt <strong>unverschlüsselt</strong> öffentlich sichtbar, damit Messenger (Signal, WhatsApp, Mastodon …) eine Link-Vorschau laden können.</p>'
        : "";
      box.innerHTML = '<div class="card small" style="margin-top: 0.5rem; padding: 0.85rem 1rem;">'
        + noteHtml
        + socialWarnHtml
        + '<label class="form-feld" style="margin: 0;"><span>🔑 Passwort für die Verschlüsselung <span class="form-pflicht" aria-hidden="true">*</span></span>'
        + '<span style="display: flex; gap: 0.4rem; align-items: center;">'
        + '<input type="password" data-crypto-pw placeholder="Passwort für diese Seite …" autocomplete="new-password" style="flex: 1;" value="' + esc(c.password || "") + '">'
        + '<button type="button" class="btn btn-small btn-ghost" data-crypto-toggle-pw title="Passwort anzeigen / verbergen" aria-label="Passwort anzeigen / verbergen">👁️</button>'
        + "</span></label></div>";
      var pwInput = box.querySelector("[data-crypto-pw]"), toggleBtn = box.querySelector("[data-crypto-toggle-pw]");
      pwInput.addEventListener("input", function () {
        if (!aktiv || !aktiv.crypto) return;
        aktiv.crypto.password = pwInput.value;
        scheduleCryptoEncrypt(aktiv);
        aktiv.gesendet = false;
        status.textContent = "";
        zeigeVorschau();
      });
      toggleBtn.addEventListener("click", function () {
        pwInput.type = pwInput.type === "password" ? "text" : "password";
      });
    } else if (c.wasEncrypted && c.unlocked) {
      box.innerHTML = '<p class="note small" style="margin-top: 0.5rem;">🔓 <strong>Verschlüsselung wird aufgehoben:</strong> Beim Speichern wird der entschlüsselte Text wieder als normaler, öffentlicher Klartext gespeichert.</p>';
    }
    return wrap;
  }

  function baueFeld(f) {
    if (aktiv.edit && aktiv.edit.rawFields[f.name]) {
      return F.el('<label class="form-feld"><span>' + esc(f.label) + '</span><input type="text" disabled value="(in der Datei als Liste/Objekt – bitte auf GitHub bearbeiten)"></label>');
    }
    if (f.name === "encrypted") return baueCryptoFeld(f);
    if (f.name === "text" && aktiv.crypto && aktiv.crypto.wasEncrypted && !aktiv.crypto.unlocked) {
      return F.el('<div class="form-feld" data-crypto-locked-text><span>' + esc(f.label) + '</span>'
        + '<div class="note small" style="margin: 0;">🔒 Der Text dieser Seite ist verschlüsselt. Gib oben das Passwort ein und klicke auf „🔓 Entschlüsseln &amp; Text bearbeiten“, um den Klartext im Editor zu öffnen.</div></div>');
    }
    var w = aktiv.w[f.name], hilfe = f.hilfe ? '<small class="form-hilfe">' + esc(f.hilfe) + "</small>" : "";
    var label = esc(f.label) + (isRequired(f) ? ' <span class="form-pflicht" aria-hidden="true">*</span>' : "");
    if (f.typ === "chips") {
      return F.chipFeld({
        label: f.label + (isRequired(f) ? " *" : ""), quelle: f.quelle, placeholder: f.platzhalter, hilfe: f.hilfe, einzeln: f.einzeln,
        werte: function () { return aktiv.w[f.name]; },
        ausser: f.quelle === "seiten" ? function () { return ownAddresses(aktiv.url); } : null,
        setze: function (a) { aktiv.w[f.name] = a; nachAenderung(); }
      });
    }
    if (f.typ === "links") return baueLinksFeld(f);
    if (f.typ === "haken") {
      return F.el('<label class="form-check"><input type="checkbox" name="' + f.name + '"' + (w ? " checked" : "") + "><span>" + label + "</span>" + hilfe + "</label>");
    }
    var attr = ' name="' + f.name + '"' + (isRequired(f) ? " required" : "") + (f.platzhalter ? ' placeholder="' + esc(f.platzhalter) + '"' : "");
    var eingabe;
    if (f.typ === "auswahl") {
      eingabe = "<select" + attr + ">" + f.optionen.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === w ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    } else if (f.typ === "langtext") {
      eingabe = "<textarea" + attr + ' rows="' + (f.zeilen || 8) + '"' + (f.code ? ' spellcheck="false" autocapitalize="off" wrap="off"' : "") + ">" + esc(w) + "</textarea>";
    } else {
      var typ = { text: "text", adresse: "url", datum: "date", zeit: "datetime-local", zahl: "number" }[f.typ];
      eingabe = '<input type="' + typ + '"' + attr + (f.liste ? ' list="neu-liste-' + f.liste + '"' : "") + ' value="' + esc(w) + '">';
    }
    return F.el('<label class="form-feld' + (f.klasse ? " " + f.klasse : "") + '"><span>' + label + "</span>" + eingabe + hilfe + "</label>");
  }

  // External links: list of rows (address, title, kind) + "➕ Link". Adding a link reads title and kind from the
  // page (F.linkMetadata: Microdata, JSON-LD, og:title) as suggestions – a page that can't be read (CORS) or tells
  // nothing leaves both for the editor. Inputs have no name: the form's input handler ignores them.
  function baueLinksFeld(f) {
    var box = F.el('<div class="form-feld form-links"><span>' + esc(f.label) + '</span><ul class="form-links-liste"></ul>'
      + '<div class="form-links-neu"><input type="url" placeholder="https://… (Adresse einfügen)" aria-label="Adresse eines externen Links">'
      + '<button type="button" class="btn btn-small">➕ Link</button></div>'
      + (f.hilfe ? '<small class="form-hilfe">' + esc(f.hilfe) + "</small>" : "") + "</div>");
    var liste = box.querySelector(".form-links-liste"), input = box.querySelector(".form-links-neu input");
    function werte() { if (!Array.isArray(aktiv.w[f.name])) aktiv.w[f.name] = []; return aktiv.w[f.name]; }
    function speichern() { aktiv.w[f.name] = werte().slice(); nachAenderung(); }
    function zeile(o) {
      var li = F.el('<li class="form-links-eintrag"><div class="form-links-adresse"><a target="_blank" rel="noopener"></a>'
        + '<button type="button" class="form-links-weg" aria-label="Link entfernen" title="Link entfernen">✕</button></div>'
        + '<div class="form-reihe"><label class="form-feld"><span>Titel</span><input type="text" data-k="title" placeholder="Wie heißt die Seite?"></label>'
        + '<label class="form-feld"><span>Art</span><select data-k="category">'
        + F.LINK_KINDS.map(function (k) { return '<option value="' + esc(k[0]) + '">' + esc(k[1]) + "</option>"; }).join("")
        + "</select></label></div><small class=\"form-hilfe\" data-status></small></li>");
      var a = li.querySelector("a");
      a.href = o.url; a.textContent = o.url;
      li.querySelector('[data-k="title"]').value = o.title || "";
      li.querySelector('[data-k="category"]').value = o.category || "";
      function aendern(e) {
        var k = e.target.getAttribute("data-k");
        if (!k) return;
        if (e.target.value) o[k] = e.target.value; else delete o[k];
        speichern();
      }
      li.addEventListener("input", aendern);
      li.addEventListener("change", aendern);
      li.querySelector(".form-links-weg").addEventListener("click", function () {
        var i = werte().indexOf(o);
        if (i >= 0) werte().splice(i, 1);
        speichern(); zeichne();
      });
      return li;
    }
    function zeichne() { liste.innerHTML = ""; werte().forEach(function (o) { liste.appendChild(zeile(o)); }); }
    function hinzufuegen() {
      var u = input.value.trim();
      if (!/^https?:\/\/[^\s\/]+\.[^\s]+$/.test(u)) {
        input.setCustomValidity("Bitte eine vollständige Adresse mit https:// eingeben."); input.reportValidity(); return;
      }
      input.value = "";
      var o = { url: u };
      werte().push(o); speichern(); zeichne();
      var status = function () { var li = liste.children[werte().indexOf(o)]; return li && li.querySelector("[data-status]"); };
      if (status()) status().textContent = "⏳ Lese Titel und Art von der Seite …";
      F.linkMetadata(u).then(function (m) {
        if (werte().indexOf(o) < 0) return; // removed meanwhile
        if (!m || (!m.title && !m.category)) {
          zeichne();
          if (status()) status().textContent = "Die Seite verrät nichts (oder lässt sich nicht lesen) – bitte Titel und Art eintragen.";
          var li = liste.children[werte().indexOf(o)];
          if (li) li.querySelector('[data-k="title"]').focus();
          return;
        }
        if (!o.title && m.title) o.title = m.title;
        if (!o.category && m.category) o.category = m.category;
        speichern(); zeichne();
        if (status()) status().textContent = "✓ Von der Seite gelesen – bei Bedarf anpassen." + (o.category ? "" : " Art bitte wählen.");
      });
    }
    box.querySelector(".form-links-neu button").addEventListener("click", hinzufuegen);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); hinzufuegen(); } });
    input.addEventListener("input", function () { input.setCustomValidity(""); });
    zeichne();
    return box;
  }

  function baueFelder() {
    destroyEditors();
    var mehrFelder = mehrBox.querySelector(".neu-felder");
    links.innerHTML = ""; mehrFelder.innerHTML = "";
    aktiv.schema.felder.forEach(function (zeile) {
      var liste = [].concat(zeile), ziel = liste[0].mehr ? mehrFelder : links;
      var els = liste.map(baueFeld);
      if (els.length === 1) { ziel.appendChild(els[0]); return; }
      var reihe = F.el('<div class="form-reihe"></div>');
      els.forEach(function (x) { reihe.appendChild(x); });
      ziel.appendChild(reihe);
    });
    mehrBox.hidden = !mehrFelder.children.length;
    mehrBox.open = aktiv.felder.some(function (f) { return f.mehr && !F.leer(aktiv.w[f.name]); });
    dateiInput.value = aktiv.w.datei;
    aktiv.felder.forEach(function (f) { if (f.liste) fuelleListe(f.liste); });
    createMarkdownEditors();
  }
  function fuelleListe(key) {
    F.ladeIndex().then(function (I) {
      if (document.getElementById("neu-liste-" + key)) return;
      d.insertAdjacentHTML("beforeend", '<datalist id="neu-liste-' + key + '">' + (I[key] || []).map(function (x) { return '<option value="' + esc(x) + '">'; }).join("") + "</datalist>");
    });
  }

  // ---------- markdown editor ----------
  // Fields with markdown: true get OverType (assets/js/third-party/overtype/, MIT, copied unchanged – no external files,
  // see DEPENDENCIES.md), loaded on first use. Its textarea keeps the field's name, so input, preview and draft work as
  // before; if the script can't load, the plain textarea stays. The toolbar can be switched off (🛠️) – off by default
  // on phones, the choice is remembered in this browser.
  var editors = [], TOOLBAR_KEY = "ifsmb-md-toolbar";
  var NAV = typeof navigator !== "undefined" ? navigator : {};
  var IS_MAC = /Mac|iPhone|iPad/.test(NAV.platform || NAV.userAgent || "");
  // shortcut hints shown to visitors (German UI text)
  var MOD = IS_MAC ? "⌘" : "Strg+", SHIFT_MOD = IS_MAC ? "⇧⌘" : "Strg+Umschalt+";
  var LABELS = {
    toolbar: "Formatierung",
    viewModes: { normal: "Bearbeiten", plain: "Nur Text", preview: "Vorschau" },
    buttons: { bold: "Fett", italic: "Kursiv", strikethrough: "Durchgestrichen (" + SHIFT_MOD + "X)", code: "Code", link: "Link einfügen",
      h1: "Überschrift 1", h2: "Überschrift 2", h3: "Überschrift 3", h4: "Überschrift 4", h5: "Überschrift 5", h6: "Überschrift 6",
      bulletList: "Liste", orderedList: "Nummerierte Liste", taskList: "Aufgabenliste", outdent: "Ausrücken", indent: "Einrücken",
      quote: "Zitat", upload: "Datei hochladen", viewMode: "Ansicht", underline: "Unterstrichen (" + MOD + "U)" }
  };
  // Shortcuts on top of OverType's own (⌘B, ⌘I, ⌘K, ⌘E, ⌥⌘1–3, ⇧⌘7/8/9, ⇧⌘.): ⇧⌘X strikethrough (~~ ~~),
  // ⌘U underline. Markdown has no underline – <u>…</u> is HTML that kramdown passes through. Ctrl instead of ⌘ off Mac.
  var STROKE = 'stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"';
  function toggleUnderline(ta) {
    var OPEN = "<u>", CLOSE = "</u>", value = ta.value, from = ta.selectionStart, to = ta.selectionEnd;
    var selected = value.slice(from, to), replacement, start;
    if (selected.length >= OPEN.length + CLOSE.length && selected.indexOf(OPEN) === 0 && selected.slice(-CLOSE.length) === CLOSE) {
      replacement = selected.slice(OPEN.length, -CLOSE.length); start = from;            // tags selected too → remove
    } else if (value.slice(from - OPEN.length, from) === OPEN && value.slice(to, to + CLOSE.length) === CLOSE) {
      ta.setSelectionRange(from - OPEN.length, to + CLOSE.length);                       // tags around → remove
      replacement = selected; start = from - OPEN.length;
    } else {
      replacement = OPEN + selected + CLOSE; start = from + OPEN.length;                  // wrap
    }
    var innerLength = replacement === selected || replacement.indexOf(OPEN) !== 0 ? replacement.length : selected.length;
    ta.focus();
    // insertText keeps undo (⌘Z) working; fallback for browsers without it
    if (!(document.execCommand && document.execCommand("insertText", false, replacement))) {
      ta.setRangeText(replacement);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    ta.setSelectionRange(start, start + innerLength);
  }
  function toolbarButtons() {
    var T = window.toolbarButtons, buttons = (window.defaultToolbarButtons || []).slice();
    if (!T || !buttons.length) return null; // OverType without exports: keep its default toolbar
    var underline = {
      name: "underline", actionId: "toggleUnderline", title: "Unterstrichen (" + MOD + "U)",
      icon: '<svg viewBox="0 0 18 18"><path ' + STROKE + ' d="M5,3v5a4,4,0,0,0,8,0V3"></path><line ' + STROKE + ' x1="4" x2="14" y1="15.5" y2="15.5"></line></svg>',
      action: function (o) { toggleUnderline(o.editor.textarea); }
    };
    var attach = {
      name: "attach", actionId: "insertAttachment", title: t("form.add_files_title", null, "STL, 3MF, MP4 oder MP3 an der Cursor-Position einfügen"),
      icon: '<svg viewBox="0 0 18 18"><path ' + STROKE + ' d="M12.5,8.5l-4.6,4.6a2.6,2.6,0,0,1-3.7-3.7l5.3-5.3a1.8,1.8,0,0,1,2.5,2.5L6.9,11.7a0.9,0.9,0,0,1-1.3-1.3L10.2,5.8"></path></svg>',
      action: function (o) {
        var ta = o.editor.textarea;
        if (ta.name !== "text") return;
        ta.setAttribute("data-cursor", String(ta.selectionEnd));
        direct.addFiles();
      }
    };
    var i = buttons.indexOf(T.italic);
    buttons.splice(i < 0 ? 2 : i + 1, 0, T.strikethrough, underline);
    if (T.link) { var li = buttons.indexOf(T.link); buttons.splice(li < 0 ? buttons.length : li + 1, 0, attach); }
    else buttons.push(attach);
    return buttons;
  }
  function onEditorKeydown(e, editor) {
    if (!(IS_MAC ? e.metaKey : e.ctrlKey) || e.altKey) return;
    var key = (e.key || "").toLowerCase();
    if (key === "u" && !e.shiftKey) { e.preventDefault(); editor.performAction("toggleUnderline", e); }
    else if (key === "x" && e.shiftKey) { e.preventDefault(); editor.performAction("toggleStrikethrough", e); }
  }
  // toolbarVisible() reads the remembered choice (default: off on phones), toolbarVisible(bool) stores it
  function toolbarVisible(visible) {
    if (visible != null) { try { localStorage.setItem(TOOLBAR_KEY, visible ? "1" : "0"); } catch (e) { /* storage blocked */ } return visible; }
    try { var stored = localStorage.getItem(TOOLBAR_KEY); if (stored != null) return stored === "1"; } catch (e) { /* storage blocked */ }
    return !(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
  }
  function destroyEditors() {
    editors.forEach(function (e) { try { e.destroy(); } catch (x) { /* already gone */ } });
    editors = [];
  }
  function createMarkdownEditors() {
    var state = aktiv, fields = aktiv.felder.filter(function (f) { return f.markdown && form.elements[f.name]; });
    if (!fields.length || !window.ladeSkripte) return;
    window.ladeSkripte(["third-party/overtype/overtype.min.js"]).then(function () {
      if (aktiv !== state || !window.OverType) return; // dialog closed or reopened meanwhile
      fields.forEach(function (f) { createEditor(f, state); });
    }).catch(function () { /* plain textarea stays */ });
  }
  function createEditor(f, state) {
    var ta = form.elements[f.name];
    if (!ta || ta.tagName !== "TEXTAREA") return;
    var oldField = ta.closest(".form-feld"), visible = toolbarVisible();
    // a <div> instead of the <label>: clicks on the toolbar must not jump into the text
    var field = F.el('<div class="form-feld form-md' + (visible ? "" : " toolbar-hidden") + '"><div class="form-md-head"><span>'
      + esc(f.label) + '</span><button type="button" class="btn btn-ghost btn-small form-md-toggle" aria-pressed="' + visible
      + '" title="Werkzeugleiste ein- oder ausblenden">🛠️ <span class="form-md-toggle-text">Werkzeugleiste</span></button></div>'
      + '<div class="form-md-editor"></div>' + (f.hilfe ? '<small class="form-hilfe">' + esc(f.hilfe) + "</small>" : "") + "</div>");
    oldField.replaceWith(field);
    var editor = new window.OverType(field.querySelector(".form-md-editor"), {
      value: aktiv.w[f.name] || "",
      toolbar: true, toolbarButtons: toolbarButtons() || undefined, labels: LABELS, placeholder: f.platzhalter || "",
      onKeydown: onEditorKeydown,
      fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: "14px", lineHeight: 1.6,
      autoResize: true, minHeight: Math.max(6, (f.zeilen || 8) * 1.6) + "em", maxHeight: "60vh",
      spellcheck: true,
      textareaProps: { name: f.name, "aria-label": f.label },
      onChange: function (value) {
        if (aktiv !== state || value === aktiv.w[f.name]) return;
        aktiv.w[f.name] = value;
        nachAenderung();
      }
    })[0];
    editors.push(editor);
    var toggle = field.querySelector(".form-md-toggle");
    toggle.addEventListener("click", function () {
      var show = toggle.getAttribute("aria-pressed") !== "true";
      toolbarVisible(show);
      toggle.setAttribute("aria-pressed", String(show));
      field.classList.toggle("toolbar-hidden", !show);
    });
  }

  // update derived fields and their inputs (except the one being typed in)
  function folge(ausser) {
    folgeWerte(aktiv.felder, aktiv.w, aktiv.beruehrt).forEach(function (n) {
      var input = form && form.elements[n];
      if (input && input !== ausser) input.value = aktiv.w[n];
    });
  }
  function aenderung(e) {
    var t = e.target, n = t.name;
    if (!n || !(n in aktiv.w)) return;
    var v = t.type === "checkbox" ? t.checked : t.value;
    if (v === aktiv.w[n]) return;
    aktiv.w[n] = v;
    aktiv.beruehrt[n] = v !== ""; // emptied → follows again
    if (n === "encrypted") {
      if (v) migratePublicImagesToEncrypted(aktiv);
      baueFelder();
      direct.showPhotos();
      if (v) {
        scheduleCryptoEncrypt(aktiv);
        var pwField = form.querySelector("[data-crypto-pw]");
        if (pwField && !pwField.value) pwField.focus();
      }
    }
    folge(t);
    nachAenderung();
  }
  function nachAenderung() {
    folge();
    if (aktiv.w.encrypted && aktiv.crypto && (!aktiv.crypto.wasEncrypted || aktiv.crypto.unlocked)) {
      scheduleCryptoEncrypt(aktiv);
    }
    zeigeVorschau();
    speichereEntwurf();
    aktiv.gesendet = false;
    status.textContent = "";
    if (filesEl) direct.showFiles(); // existing attachments: removed from the text → "wird gelöscht"
  }
  function erstesMarkdownBild(md) {
    var m = String(md || "").match(/!\[[^\]]*\]\(([^)\s]+)\)/);
    return m && !/\.svg$/i.test(m[1]) ? m[1] : "";
  }
  function ersteTextzeile(md) {
    return String(md || "").replace(/!\[[^\]]*\]\([^)]*\)|\{:[^}]*\}/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#*_>`~]/g, "").split("\n").map(function (z) { return z.trim(); }).filter(Boolean)[0] || "";
  }
  function zeigeVorschau() {
    var text = dateiInhalt();
    if (aktiv.edit) {
      var marked = changedLines(aktiv.edit.source.replace(/\r\n/g, "\n"), text), count = marked.filter(Boolean).length;
      vorschau.innerHTML = text.split("\n").map(function (line, i) { return marked[i] ? '<mark class="changed-line">' + esc(line || " ") + "</mark>" : esc(line); }).join("\n");
      // a change that only deletes lines marks nothing in the new text – compare the whole text
      var changed = count > 0 || text !== aktiv.edit.source.replace(/\r\n/g, "\n");
      submitBtn.disabled = !changed;
      submitBtn.title = changed ? "" : t("form.unchanged_short", null, "Noch nichts geändert");
    } else vorschau.textContent = text;
    if (!socialBox) return;
    var w = aktiv.w, istSeite = aktiv.schema.format !== "yaml";
    socialBox.hidden = !istSeite;
    if (!istSeite) return;
    var bild = w.social_media_preview_image || (!w.encrypted && ((!w.image_is_illustration && !/\.svg$/i.test(w.image || "") && w.image) || w.photo || erstesMarkdownBild(w.text))) || "/assets/images/og-preview.jpg";
    bild = direct.previewFor(bild); // photos not uploaded yet: show the local preview
    if (socialImg.getAttribute("src") !== bild) socialImg.src = bild;
    socialTitel.textContent = w.title || aktiv.schema.titel;
    var codeText = aktiv.felder.some(function (f) { return f.name === "text" && f.code; }); // HTML is no description
    socialBeschr.textContent = (w.summary || w.subtitle || w.role || w.lead || (codeText ? "" : ersteTextzeile(w.text)) || siteCfg().title || "").slice(0, 160);
  }

  function fehlt() {
    var leer = aktiv.felder.filter(function (f) { return isRequired(f) && f.typ === "chips" && !aktiv.w[f.name].length; })[0];
    if (leer) return t("form.fill_in", { field: leer.label.replace(/^\W+\s*/, "") }, "Bitte „" + leer.label.replace(/^\W+\s*/, "") + "“ ausfüllen.");
    if (aktiv.w.encrypted && aktiv.crypto && (!aktiv.crypto.wasEncrypted || aktiv.crypto.unlocked) && !aktiv.crypto.password) {
      var pwField = form && form.querySelector("[data-crypto-pw]");
      if (pwField) pwField.focus();
      return "Bitte ein Passwort für die Verschlüsselung eingeben.";
    }
    if (!aktiv.w.encrypted && aktiv.crypto && aktiv.crypto.wasEncrypted && !aktiv.crypto.unlocked) {
      return "Bitte zuerst den verschlüsselten Inhalt mit dem Passwort entsperren.";
    }
    return aktiv.schema.pruefe && aktiv.schema.pruefe(aktiv.w);
  }
  function anlegen() {
    var fehler = fehlt();
    if (fehler) { status.textContent = "⚠️ " + fehler; return; }
    var state = aktiv;
    function doSubmit() {
      if (aktiv !== state) return;
      if (direct.active()) { direct.submit(); return; }
      if (aktiv.edit) {
        var newText = dateiInhalt();
        if (newText === aktiv.edit.source) { status.textContent = t("form.unchanged", null, "Noch nichts geändert."); return; }
        F.kopierenUndOeffnen(newText, F.githubEdit(aktiv.path), status, function () { getSelection().selectAllChildren(vorschau); });
        var copiedMsg = t("form.copied_github", null, "Kopiert – GitHub ist in einem neuen Tab offen.");
        setTimeout(function () { if (status.textContent === copiedMsg) status.textContent = t("form.copied_paste", null, "Kopiert – im GitHub-Editor alles markieren (⌘A / Strg+A) und einfügen (⌘V / Strg+V)."); }, 50);
        aktiv.gesendet = true;
        return;
      }
      var s = aktiv.schema, inhaltText = dateiInhalt(), datei = aktiv.w.datei.trim();
      var url = F.githubNeu(s.ordner, datei, inhaltText), zuLang = url.length > 8000;
      if (zuLang) url = F.githubNeu(s.ordner, datei);
      F.kopierenUndOeffnen(inhaltText, url, status, function () { getSelection().selectAllChildren(vorschau); });
      if (zuLang) status.textContent = t("form.too_long", null, "Die Datei ist zu lang für die Adresse – sie ist kopiert, bitte im GitHub-Editor einfügen.");
      aktiv.gesendet = true;
    }
    var needsAsyncCrypto = state.w.encrypted && state.crypto && (!state.crypto.wasEncrypted || state.crypto.unlocked) && (!state.crypto.encryptedBlock || state.crypto.encryptedForText !== state.w.text || state.crypto.encryptedForPw !== state.crypto.password);
    if (!needsAsyncCrypto) {
      doSubmit();
      return;
    }
    submitBtn.disabled = true;
    scheduleCryptoEncrypt(state).then(function () {
      submitBtn.disabled = false;
      doSubmit();
    }, function (err) {
      submitBtn.disabled = false;
      status.textContent = "⚠️ " + ((err && err.message) || "Fehler beim Verschlüsseln.");
    });
  }


  // ---------- direct pull requests (prototype, assets/js/github-api.js + photo-editor.js) ----------
  // With a GitHub token the submit button creates the pull request itself: the file (new or only the changed lines,
  // like before) plus new photos in one commit on a new branch. Without a token everything stays as it was
  // (copy → GitHub's editor). Photos need the token, because they can't be pasted into GitHub's editor.
  // attachments ("📎 Datei"): 3D models, videos, audio – embedded where the cursor is, listed under the post
  // (_plugins/galerie.rb); videos bigger than 1080p or not MP4 are shrunk in the browser (video-verkleinern.js)
  var FILE_ACCEPT = ".stl,.3mf,.mp4,.m4v,.mov,.webm,.mp3,.m4a";
  var FILE_RE = /\.(stl|3mf|mp4|m4v|mov|webm|mp3|m4a)$/i, VIDEO_RE = /\.(mp4|m4v|mov|webm)$/i;
  var MAX_FILE_BYTES = 60 * 1024 * 1024;
  // a video the browser could not convert goes up as it is – up to just under GitHub's limit of 100 MB per file
  var MAX_ORIGINAL_BYTES = 95 * 1024 * 1024;
  // "♻️ PR recycling": the choice is remembered in this browser (only the checkbox, not the pull request)
  var RECYCLE_KEY = "ifsmb-pr-recycling";
  // the pull request this browser last saved into from a form – offered first for "♻️" (number only)
  var LAST_PR_KEY = "ifsmb-letzter-pr";
  var IMAGE_FOLDERS = { beitrag: "news", termin: "kalender", projekt: "projekte", "projekt-vergangen": "projekte", geraet: "ausstattung", team: "team", partner: "partner", presse: "presse", herausforderung: "herausforderungen", seite: "seiten", uebersicht: "seiten" };
  var direct = {
    active: function () { return !!(window.GitHubApi && GitHubApi.connected()); },
    // which folder new photos go into: assets/images/<area>/<slug>/ – posts without the date in front, like today
    folder: function () {
      var area = IMAGE_FOLDERS[aktiv.typ] || "news", name = String(aktiv.w.datei || "").replace(/\.(md|ya?ml)$/, "");
      if (area === "news") name = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      // pages are all called index.md: name the folder after the page's path (partners/rfflabs/index.md → partners-rfflabs)
      if (area === "seiten") name = String(aktiv.path || name).replace(/(^|\/)index\.(md|html)$/, "").replace(/\.(md|html)$/, "").replace(/\//g, "-");
      return "assets/images/" + area + "/" + (name || "neu") + "/";
    },
    // Error from GitHubApi (err.kind, see github-api.js): message in the status line, plus the matching next step
    showError: function (err) {
      status.textContent = (err.kind === "info" ? "ℹ️ " : "⚠️ ") + err.message + " ";
      if (err.kind === "auth") {
        var b = F.el('<button type="button" class="btn btn-small">' + esc(t("github.reconnect", null, "🔑 Neu verbinden")) + "</button>");
        b.addEventListener("click", function () { GitHubApi.logout(); direct.update(); direct.connectDialog(); });
        status.appendChild(b);
      }
    },
    // Editing: is there already an open pull request that changes this file? Then offer to continue there (same branch,
    // no second PR) – otherwise two people edit the same page in parallel and the second merge conflicts.
    checkOpenPulls: function () {
      var state = aktiv;
      if (!state || !state.edit || state.prBase || !direct.active()) return;
      Promise.all([GitHubApi.openPullsForFile(state.path, true), GitHubApi.whoAmI()]).then(function (res) {
        var prs = res[0].filter(function (pr) { return pr.status !== "removed"; }), me = res[1];
        if (aktiv !== state || state.prBase || !prs.length) return;
        state.openPulls = prs;
        var box = direct.noticeBox();
        var own = prs.filter(function (pr) { return pr.sameRepo && pr.user === me.login; })[0];
        if (own) { // your own open PR: carry on there instead of starting a second one
          direct.pickUp(own, "Du hast diese Seite schon in #" + own.number + " geändert – du arbeitest dort weiter.", true);
          return;
        }
        box.innerHTML = "<strong>⚠️ Diese Seite wird gerade schon geändert:</strong><ul>" + prs.map(function (pr, i) {
          return '<li><a href="' + esc(pr.url) + '" target="_blank" rel="noopener">#' + pr.number + " " + esc(pr.title) + "</a>"
            + (pr.user ? " von @" + esc(pr.user) : "")
            + (pr.sameRepo && me.canPush ? ' <button type="button" class="btn btn-small" data-pr-continue="' + i + '">In #' + pr.number + " mitschicken</button>" : pr.sameRepo ? "" : " (aus einem Fork – dort weiterarbeiten)") + "</li>";
        }).join("") + "</ul><span>Mit „mitschicken“ landet deine Änderung im selben Pull Request – was du schon eingetragen hast, wird übernommen. Sonst entsteht ein eigener Pull Request.</span>";
        box.onclick = function (e) {
          var b = e.target.closest("[data-pr-continue]"); if (b) direct.pickUp(prs[+b.getAttribute("data-pr-continue")]);
        };
      }, function () { /* no check possible – the normal path still works */ });
    },
    // one notice box under the hint line (open PRs, PR mode, carried-over drafts)
    noticeBox: function () {
      var box = d.querySelector(".form-pr-notice");
      if (!box) { box = F.el('<div class="form-pr-notice note small" role="status"></div>'); hinweisEl.after(box); }
      box.onclick = null;
      return box;
    },
    // PR mode: show which PR the form saves into, with a way out ("own pull request instead")
    showPrMode: function (text) {
      var pr = aktiv.prBase, box = direct.noticeBox();
      box.innerHTML = "<strong>✏️ " + esc(text || "Du arbeitest in #" + pr.number + " weiter.") + '</strong> <a href="' + esc(pr.url) + '" target="_blank" rel="noopener">#' + pr.number + " ansehen ↗</a>"
        + " – Speichern ergänzt diesen Pull Request um einen Commit."
        + (aktiv.sent ? "" : ' <button type="button" class="btn btn-small btn-ghost" data-pr-leave>Stattdessen eigener Pull Request</button>');
      box.onclick = function (e) {
        if (!e.target.closest("[data-pr-leave]")) return;
        // keep the form as it is; base stays the PR's state, so on submit only MY changes are merged onto main
        aktiv.prBase = null; box.remove(); direct.update(); speichereEntwurf();
        status.textContent = "Ok – es wird ein eigener Pull Request nur mit deinen Änderungen.";
      };
      direct.update();
    },
    // continue in an open PR: load the file from its branch and carry over what was already typed (merge, K07)
    pickUp: function (pr, text, quiet) {
      var state = aktiv, mine = dateiInhalt(), base = state.edit.source;
      if (state.pickingUp || (state.prBase && state.prBase.number === pr.number)) return; // already (being) picked up
      state.pickingUp = true;
      status.textContent = "Lade den Stand aus #" + pr.number + " …";
      Promise.all([GitHubApi.readFile(state.path, pr.branch), withMerge()]).then(function (res) {
        var theirs = res[0];
        if (aktiv !== state) return;
        if (theirs == null) throw new Error("Die Datei gibt es im Branch von #" + pr.number + " nicht.");
        state.prBase = { number: pr.number, url: pr.url, branch: pr.branch };
        var r = FileMerge.merge(base, mine, theirs);
        if (r.conflicts.length) { direct.showConflicts(r, theirs, "#" + pr.number); direct.showPrMode(text); return; }
        direct.rebase(theirs, r.build());
        direct.showPrMode(text);
        status.textContent = quiet ? "" : mine === base ? "Stand aus #" + pr.number + " geladen." : "Stand aus #" + pr.number + " geladen – deine Eingaben sind übernommen.";
      }).catch(function (err) { direct.showError(err); }).then(function () { state.pickingUp = false; });
    },
    // put the form onto a new base (the file as it is now on main or a PR branch) with values from result
    rebase: function (baseText, resultText) {
      var loaded = readSource(aktiv.schema, baseText, aktiv.path), res = readSource(aktiv.schema, resultText, aktiv.path);
      if (!loaded || !res) throw new Error("Die Datei hat kein Front Matter.");
      aktiv.edit = loaded; aktiv.beruehrt = allTouched();
      aktiv.w = JSON.parse(JSON.stringify(res.w0));
      baueFelder(); zeigeVorschau(); speichereEntwurf();
    },
    // a draft from earlier that doesn't fit the current file any more: merge it onto the current state (K14/K15)
    restoreDraft: function (draft) {
      var state = aktiv, when = draft.savedAt ? new Date(draft.savedAt) : null;
      var label = when ? when.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "früher";
      withMerge().then(function () {
        var old = readSource(state.schema, draft.source, state.path);
        if (!old || aktiv !== state) return;
        var mine = editedText(state.schema, old, Object.assign(JSON.parse(JSON.stringify(old.w0)), draft.w));
        if (mine === draft.source) return; // the draft had no changes
        if (draft.pr && direct.active()) { // draft belonged to an open PR: continue there
          state.edit = old;
          state.w = Object.assign(JSON.parse(JSON.stringify(old.w0)), draft.w);
          baueFelder(); zeigeVorschau();
          direct.pickUp(draft.pr, "Dein Entwurf vom " + label + " gehört zu #" + draft.pr.number + " – du arbeitest dort weiter.");
          return;
        }
        var r = FileMerge.merge(draft.source, mine, state.edit.source);
        if (r.conflicts.length) { direct.showConflicts(r, state.edit.source, "der Seite"); status.textContent = "Dein Entwurf vom " + label + " ist älter als die Seite – bitte die Konflikte unten lösen."; return; }
        direct.rebase(state.edit.source, r.build());
        status.textContent = "Dein Entwurf vom " + label + " wurde auf den neuen Stand der Seite übertragen.";
      });
    },
    // Conflict box: one entry per field/passage with the choices; "Übernehmen" puts the form onto theirs + choices
    showConflicts: function (r, theirs, where) {
      var state = aktiv, box = d.querySelector(".form-conflicts");
      if (box) box.remove();
      box = F.el('<section class="form-conflicts" role="alert"></section>');
      function label(c) {
        if (c.where === "text") return "Text";
        var f = state.felder.filter(function (x) { return x.name === c.key; })[0];
        return f ? f.label.replace(/^\W+\s*/, "") : c.key || "Feld";
      }
      function show(t) { return t === "" ? '<em class="muted">(leer / gelöscht)</em>' : "<pre>" + esc(t) + "</pre>"; }
      box.innerHTML = "<h3>⚠️ " + r.conflicts.length + (r.conflicts.length === 1 ? " Konflikt" : " Konflikte") + " – bitte entscheiden</h3>"
        + '<p class="small">Seit du angefangen hast, hat jemand in ' + esc(where) + " dieselben Stellen geändert. Was nicht überlappt, ist schon zusammengeführt.</p>"
        + r.conflicts.map(function (c) {
          return '<fieldset class="form-conflict"><legend>' + esc(label(c)) + "</legend>"
            + '<div class="form-conflict-versions"><div><strong>Deine Version</strong>' + show(c.mine) + "</div><div><strong>Neuere Version</strong>" + show(c.theirs) + "</div></div>"
            + '<label><input type="radio" name="' + c.id + '" value="mine" checked> Meine Version</label> '
            + '<label><input type="radio" name="' + c.id + '" value="theirs"> Neuere Version</label>'
            + (c.where === "text" ? ' <label><input type="radio" name="' + c.id + '" value="both"> Beide</label>' : "")
            + "</fieldset>";
        }).join("")
        + '<p><button type="button" class="btn" data-conflicts-apply>✅ Übernehmen</button> <span class="small muted">Danach kannst du alles im Formular noch anpassen und dann senden.</span></p>';
      links.parentNode.insertBefore(box, links);
      submitBtn.disabled = true; submitBtn.title = "Erst die Konflikte oben lösen";
      box.querySelector("[data-conflicts-apply]").addEventListener("click", function () {
        var choices = {};
        r.conflicts.forEach(function (c) { var x = box.querySelector('input[name="' + c.id + '"]:checked'); choices[c.id] = x ? x.value : "mine"; });
        try { direct.rebase(theirs, r.build(choices)); } catch (err) { direct.showError(err); return; }
        box.remove(); submitBtn.disabled = false; submitBtn.title = "";
        status.textContent = "Konflikte gelöst – bitte kurz prüfen und dann senden.";
      });
      box.scrollIntoView({ block: "nearest" });
    },
    // Where photos can be used in this form – derived from the fields the type has, so every resource gets its own
    // uses: gallery in the text, cover/device photo, profile photo, logo (partner card), social media preview.
    slots: function () {
      if (!aktiv) return [];
      var has = function (n) { return aktiv.felder.some(function (f) { return f.name === n; }) && !(aktiv.edit && aktiv.edit.rawFields[n]); };
      var s = [];
      if (!aktiv.schema.format && has("text") && aktiv.felder.some(function (f) { return f.name === "text" && f.markdown; })) {
        s.push({
          id: "gallery",
          label: (aktiv.w && aktiv.w.encrypted) ? "🖼️ Galerie im Text (verschlüsselt als .blob)" : "🖼️ Galerie im Text",
          hilfe: (aktiv.w && aktiv.w.encrypted) ? "Fotos werden im Browser als .blob-Dateien verschlüsselt" : "mehrere Fotos, erscheinen als Galerie"
        });
      }
      // On encrypted pages, content photos go into the encrypted gallery (.blob), while social_media_preview_image
      // remains available unencrypted with an explicit warning so link previews in messengers continue to work.
      if (!(aktiv.w && aktiv.w.encrypted)) {
        if (has("image")) s.push({ id: "image", label: aktiv.typ === "geraet" ? "📸 Foto des Geräts" : "📸 Titelbild", feld: "image", alt: has("image_alt") && "image_alt" });
        if (has("photo")) s.push({ id: "photo", label: "🙂 Profilfoto", feld: "photo" });
        if (has("logo")) s.push({ id: "logo", label: "🏷️ Logo / Bild auf der Partnerkarte", feld: "logo" });
      }
      if (has("social_media_preview_image")) s.push({
        id: "social",
        label: (aktiv.w && aktiv.w.encrypted) ? "📣 Social-Media-Vorschau (⚠️ unverschlüsselt)" : "📣 Social-Media-Vorschau",
        feld: "social_media_preview_image",
        social: true,
        hilfe: (aktiv.w && aktiv.w.encrypted)
          ? "⚠️ wird auf 1200×630 zugeschnitten und UNVERSCHLÜSSELT gespeichert (für Link-Vorschauen)"
          : "wird auf 1200×630 zugeschnitten"
      });
      return s;
    },
    previewFor: function (v) {
      var hit = null;
      (aktiv && aktiv.photos || []).forEach(function (p) {
        if (v === direct.url(p)) hit = p.preview;
        if (v === direct.url(p, "-social") && p.social) hit = p.social.preview;
      });
      return hit || v;
    },
    url: function (p, variant) { return "/" + p.folder + p.name.replace(/\.jpg$/, (variant || "") + ".jpg"); },
    uses: function (p, slot) {
      if (slot.id === "gallery") return String(aktiv.w.text || "").indexOf("](" + direct.url(p) + ")") >= 0;
      return aktiv.w[slot.feld] === direct.url(p, slot.social ? "-social" : "");
    },
    used: function (p) { return direct.slots().some(function (sl) { return direct.uses(p, sl); }); },
    setField: function (name, v) {
      aktiv.w[name] = v; aktiv.beruehrt[name] = v !== "";
      var input = form.elements[name];
      if (input) { input.value = v; if (mehrBox.contains(input) && v) mehrBox.open = true; }
      if (name === "social_media_preview_image" && aktiv.w.encrypted) {
        var oldWrap = form.querySelector(".form-crypto-wrap");
        var fEnc = aktiv.felder.filter(function (f) { return f.name === "encrypted"; })[0];
        if (oldWrap && fEnc) oldWrap.replaceWith(baueCryptoFeld(fEnc));
      }
      nachAenderung();
    },
    assign: function (p, slot) {
      if (direct.uses(p, slot)) return Promise.resolve();
      if (slot.id === "gallery") {
        var line = "![" + p.alt.replace(/[\[\]]/g, "") + "](" + direct.url(p) + ")", t = String(aktiv.w.text || "").replace(/\s+$/, "");
        // directly under a gallery at the end of the text → same gallery, otherwise a new one
        t = /\n\{: \.gallery[^}]*\}$/.test(t) && /\)\n\{: \.gallery[^}]*\}$/.test(t) ? t.replace(/\n(\{: \.gallery[^}]*\})$/, "\n" + line + "\n$1") : t + (t ? "\n\n" : "") + line + "\n{: .gallery}";
        setText(t + "\n");
        return Promise.resolve();
      }
      var ready = slot.social && !p.social ? window.ladeSkripte(["photo-editor.js"]).then(function () {
        return window.PhotoEditor.open(new File([p.full], p.name, { type: "image/jpeg" }), { size: [1200, 630], title: "📣 Ausschnitt für die Social-Media-Vorschau (1200×630)" });
      }).then(function (r) { if (r) p.social = r; return r; }) : Promise.resolve(true);
      return ready.then(function (ok) {
        if (!ok) return;
        direct.setField(slot.feld, direct.url(p, slot.social ? "-social" : ""));
        if (slot.alt) direct.setField(slot.alt, p.alt);
      });
    },
    unassign: function (p, slot) {
      if (slot.id === "gallery") {
        var lines = String(aktiv.w.text || "").split("\n").filter(function (l) { return l.indexOf("](" + direct.url(p) + ")") < 0; });
        // a gallery marker without images above it is left over → remove it
        lines = lines.filter(function (l, i) { return !/^\{: \.gallery/.test(l) || /^!\[/.test(lines[i - 1] || ""); });
        setText(lines.join("\n").replace(/\n{3,}/g, "\n\n"));
      } else {
        direct.setField(slot.feld, "");
        if (slot.alt) direct.setField(slot.alt, "");
      }
    },
    toggle: function (i, slotId) {
      var p = aktiv.photos[i], slot = direct.slots().filter(function (x) { return x.id === slotId; })[0];
      if (!p || !slot) return;
      (direct.uses(p, slot) ? Promise.resolve(direct.unassign(p, slot)) : direct.assign(p, slot))
        .then(direct.showPhotos, function (err) { direct.showError(err); });
    },
    update: function () {
      if (!d || !aktiv) return;
      var on = direct.active();
      githubBtn.textContent = on ? "🔑 GitHub ✓" : t("github.connect", null, "🔑 GitHub verbinden");
      if (on) GitHubApi.whoAmI().then(function (me) { if (direct.active()) githubBtn.textContent = "🔑 @" + me.login; }, function () {});
      githubBtn.title = on ? t("github.connected_title", null, "Mit GitHub verbunden – Pull Requests direkt von hier") : t("github.connect_title", null, "Mit einem GitHub-Token Pull Requests direkt von hier erstellen (mit Fotos)");
      fotosBtn.hidden = !direct.slots().length;
      filesBtn.hidden = !direct.canAttach();
      if (on) {
        var rc = direct.recycleTarget();
        submitBtn.textContent = aktiv.prBase ? t("form.submit_pr_into", { number: aktiv.prBase.number }, "🚀 In #" + aktiv.prBase.number + " speichern")
          : rc ? t("form.submit_pr_recycle", { number: rc.number }, "♻️ An #" + rc.number + " anhängen") : aktiv.edit ? t("form.submit_pr_edit", null, "🚀 Änderung als Pull Request") : t("form.submit_pr_new", null, "🚀 Als Pull Request anlegen");
        stepsEl.innerHTML = "<li>" + esc(aktiv.edit ? t("form.steps_pr_edit", null, "„Als Pull Request“ legt einen neuen Branch mit der geänderten Datei und allen verwendeten Fotos an und öffnet einen Pull Request.")
          : t("form.steps_pr_new", null, "„Als Pull Request“ legt einen neuen Branch mit der neuen Datei und allen verwendeten Fotos an und öffnet einen Pull Request.")) + "</li>"
          + "<li>" + esc(t("form.steps_pr_review", null, "Jemand aus dem Team sieht ihn durch und mergt ihn – dann ist alles nach ein paar Minuten auf der Website.")) + "</li>";
      }
      direct.showPhotos();
      direct.showFiles();
      direct.showRecycling();
    },
    // ---------- ♻️ PR recycling: add this change to your newest open pull request instead of opening another ----------
    recycleOn: function () {
      var box = recycleBox && recycleBox.querySelector("[data-recycle]");
      return !!(box && box.checked && !recycleBox.hidden);
    },
    // the pull request the form would add to (checkbox on, a candidate found, not already in a PR)
    recycleTarget: function () { return aktiv && !aktiv.prBase && direct.recycleOn() ? aktiv.recycleCandidate || null : null; },
    showRecycling: function () {
      if (!recycleBox || !aktiv) return;
      var state = aktiv, box = recycleBox.querySelector("[data-recycle]"), label = recycleBox.querySelector("[data-recycle-target]");
      if (!direct.active() || state.prBase) { recycleBox.hidden = true; return; }
      var c = state.recycleCandidate, list = state.recycleCandidates || [];
      recycleBox.hidden = !c;
      if (c) {
        // one candidate: its title; several: a choice (the one this browser last saved into is preselected)
        label.innerHTML = list.length > 1
          ? '→ <select data-recycle-select aria-label="' + esc(t("form.recycle_choose", null, "Pull Request auswählen")) + '">' + list.map(function (pr) {
            return '<option value="' + pr.number + '"' + (pr.number === c.number ? " selected" : "") + ">#" + pr.number + " " + esc(pr.title) + "</option>";
          }).join("") + '</select> <a href="' + esc(c.url) + '" target="_blank" rel="noopener" title="#' + c.number + '">↗</a>'
          : '→ <a href="' + esc(c.url) + '" target="_blank" rel="noopener">#' + c.number + "</a> " + esc(c.title);
        recycleBox.title = t("form.recycle_title", { number: c.number }, "Speichern hängt diese Änderung als weiteren Commit an deinen letzten offenen Pull Request #" + c.number + " an, statt einen neuen anzulegen.");
        try { box.checked = localStorage.getItem(RECYCLE_KEY) === "1"; } catch (x) { /* storage blocked */ }
      }
      if (state.recycleLooked) return;
      state.recycleLooked = true; // once per form; after sending the form is in the PR anyway
      GitHubApi.ownFormPulls().then(function (list) {
        if (aktiv !== state) return;
        var last = null;
        try { last = +localStorage.getItem(LAST_PR_KEY) || null; } catch (x) { /* storage blocked */ }
        state.recycleCandidates = list;
        state.recycleCandidate = list.filter(function (pr) { return pr.number === last; })[0] || list[0] || null;
        direct.update();
      }, function () { /* no candidate – the box stays hidden */ });
    },
    // just before sending: is the pull request still open? Then the form saves into it (prBase), else a new one
    applyRecycling: function (state) {
      var c = direct.recycleTarget();
      if (!c) return Promise.resolve();
      return GitHubApi.getPull(c.number).then(function (pr) {
        if (pr.state !== "open") {
          state.recycleCandidate = null; state.recycleLooked = false;
          status.textContent = "♻️ #" + c.number + " ist schon " + (pr.merged ? "gemergt" : "geschlossen") + " – es wird ein neuer Pull Request.";
          return;
        }
        state.prBase = { number: c.number, url: c.url, branch: pr.branch };
        state.recycled = true;
      });
    },
    // Media panel: one card per photo with a toggle per use; cards can also be dragged onto a use.
    // Above: the uses of this form with what is in them right now (also images already in the file).
    showPhotos: function () {
      var photos = aktiv.photos || [], slots = direct.slots();
      if (!photos.length) { fotosEl.innerHTML = ""; return; }
      function thumbFor(v) {
        var p = photos.filter(function (x) { return v && (v === direct.url(x) || v === direct.url(x, "-social")); })[0];
        return p ? (v === direct.url(p, "-social") && p.social ? p.social.preview : p.preview) : v;
      }
      var slotHtml = slots.map(function (sl) {
        var images = sl.id === "gallery"
          ? (String(aktiv.w.text || "").match(/!\[[^\]]*\]\(([^)\s]+\.(?:jpe?g|png|webp|gif))\)/gi) || []).map(function (m) { return m.replace(/^.*\(/, "").replace(/\)$/, ""); })
          : (aktiv.w[sl.feld] ? [aktiv.w[sl.feld]] : []);
        return '<li class="media-slot" data-slot="' + sl.id + '"><span class="media-slot-name">' + esc(sl.label) + "</span>"
          + (sl.hilfe ? '<small class="form-hilfe">' + esc(sl.hilfe) + "</small>" : "")
          + '<span class="media-slot-images">' + (images.length ? images.map(function (b) { return '<img src="' + esc(thumbFor(b)) + '" alt="">'; }).join("") : '<span class="muted small">hierher ziehen</span>') + "</span></li>";
      }).join("");
      var cards = photos.map(function (p, i) {
        var used = direct.used(p);
        return '<li class="media-photo' + (used ? "" : " media-unused") + '" draggable="true" data-photo="' + i + '">'
          + '<img src="' + p.preview + '" alt=""><div class="media-info small"><code>' + esc(p.name) + "</code> " + esc(p.alt)
          + (used ? "" : '<br><strong>Noch nicht verwendet</strong> – wird nicht hochgeladen') + '<div class="media-uses">'
          + slots.map(function (sl) { return '<button type="button" class="media-chip" data-toggle="' + sl.id + '" aria-pressed="' + direct.uses(p, sl) + '">' + esc(sl.label) + "</button>"; }).join("")
          + '</div></div><button type="button" class="btn btn-small btn-ghost" data-photo-remove="' + i + '" aria-label="Foto entfernen">✕</button></li>';
      }).join("");
      var socialWarn = (aktiv.w && aktiv.w.encrypted && aktiv.w.social_media_preview_image)
        ? '<p class="note small" data-crypto-social-warn style="margin: 0.35rem 0;">⚠️ <strong>Hinweis:</strong> Das Social-Media-Vorschaubild (<code>' + esc(aktiv.w.social_media_preview_image) + '</code>) wird <strong>unverschlüsselt</strong> veröffentlicht, damit Messenger (Signal, WhatsApp, Mastodon …) eine Link-Vorschau anzeigen können.</p>'
        : "";
      fotosEl.innerHTML = '<p class="media-title"><strong>📷 Fotos</strong> <span class="muted small">– antippen oder auf eine Verwendung ziehen</span></p>'
        + socialWarn
        + '<ul class="media-slots">' + slotHtml + '</ul><ul class="media-photos">' + cards + "</ul>";
    },
    clearPhotos: function () {
      (aktiv && aktiv.photos || []).forEach(function (p) { URL.revokeObjectURL(p.preview); if (p.social) URL.revokeObjectURL(p.social.preview); });
      if (aktiv) aktiv.photos = []; if (fotosEl) fotosEl.innerHTML = "";
      if (aktiv) aktiv.files = []; if (filesEl) filesEl.innerHTML = "";
    },
    removePhoto: function (i) {
      var p = aktiv.photos[i];
      direct.slots().forEach(function (sl) { if (direct.uses(p, sl)) direct.unassign(p, sl); });
      aktiv.photos.splice(i, 1);
      URL.revokeObjectURL(p.preview);
      direct.showPhotos();
    },
    // next free number NN in the folder: existing files on GitHub (incl. .blob) + photos added in this form
    nextNumber: function (folder) {
      var taken = (aktiv.photos || []).map(function (p) { return parseInt(p.name, 10); });
      return Promise.all([GitHubApi.listFolder(folder, aktiv.prBase && aktiv.prBase.branch), GitHubApi.namesInOpenPulls(folder)]).then(function (res) {
        res[0].concat(res[1]).forEach(function (n) { var m = n.match(/^(\d+)(-\w+)?\.(jpe?g|png|webp)(\.blob)?$/i); if (m) taken.push(+m[1]); });
        return taken.reduce(function (a, b) { return Math.max(a, b); }, 0) + 1;
      });
    },
    addPhotos: function () {
      if (!direct.active()) { direct.connectDialog(function () { direct.addPhotos(); }); return; }
      var input = F.el('<input type="file" accept="image/*" multiple hidden>');
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var files = Array.prototype.slice.call(input.files || []), folder = direct.folder(), added = [];
        input.remove();
        if (!files.length) return;
        window.ladeSkripte(["photo-editor.js"]).then(function () {
          return files.reduce(function (p, file) {
            return p.then(function () {
              return window.PhotoEditor.open(file).then(function (r) {
                if (!r) return;
                return direct.nextNumber(folder).then(function (nr) {
                  var photo = { folder: folder, name: F.zwei(nr) + ".jpg", full: r.full, thumb: r.thumb, alt: r.alt, preview: r.preview };
                  aktiv.photos.push(photo); added.push(photo);
                });
              }, function (err) { status.textContent = "⚠️ " + file.name + ": " + err.message; });
            });
          }, Promise.resolve());
        }).then(function () {
          if (!added.length) return;
          // with only one use there is nothing to choose; otherwise the photos wait in the panel
          var slots = direct.slots();
          var chain = slots.length === 1 ? added.reduce(function (pr, p) { return pr.then(function () { return direct.assign(p, slots[0]); }); }, Promise.resolve()) : Promise.resolve();
          return chain.then(function () {
            direct.showPhotos();
            status.textContent = added.length + " Foto(s) vorbereitet – " + (slots.length === 1 ? "eingefügt" : "jetzt eine Verwendung wählen") + ". Hochgeladen wird mit dem Pull Request (nicht im Entwurf gespeichert).";
          });
        }).catch(function (err) { direct.showError(err); });
      });
      input.click();
    },
    // ---------- attachments (📎) ----------
    fileFolder: function () { return direct.folder().replace(/^assets\/images\//, "assets/dateien/"); },
    fileUrl: function (f) { return "/" + f.folder + f.name; },
    fileUsed: function (f) { return String(aktiv.w.text || "").indexOf(direct.fileUrl(f)) >= 0; },
    // "Mein Modell (v2).3MF" → "mein-modell-v2.3mf"; videos that get shrunk become .mp4
    fileName: function (name, ext) {
      var m = String(name).match(/\.([a-z0-9]+)$/i), base = String(name).replace(/\.[^.]+$/, "");
      return F.slugify(base, "datei") + "." + (ext || (m ? m[1].toLowerCase() : "bin"));
    },
    // a free name in the folder: existing files on GitHub, in open PRs and added in this form → "-2", "-3" …
    freeFileName: function (folder, name) {
      return Promise.all([GitHubApi.listFolder(folder, aktiv.prBase && aktiv.prBase.branch), GitHubApi.namesInOpenPulls(folder)]).then(function (res) {
        var taken = res[0].concat(res[1]).concat((aktiv.files || []).filter(function (f) { return f.folder === folder; }).map(function (f) { return f.name; }));
        var base = name.replace(/\.[^.]+$/, ""), ext = name.slice(base.length), n = 1, out = name;
        while (taken.indexOf(out) >= 0) out = base + "-" + (++n) + ext;
        return out;
      });
    },
    // the Markdown text field (OverType's textarea or the plain one)
    textArea: function () {
      var ed = editors.filter(function (e) { return e.textarea && e.textarea.name === "text"; })[0];
      return ed ? ed.textarea : form.elements.text;
    },
    // put a block (an embed line) at the cursor as its own paragraph – at the end of the line the cursor is in;
    // without a cursor in the text (never clicked into it) at the end
    insertBlock: function (line) {
      var ta = direct.textArea(), text = String(aktiv.w.text || "");
      var pos = ta && ta.getAttribute("data-cursor") != null ? Math.min(+ta.getAttribute("data-cursor"), text.length) : text.length;
      var eol = text.indexOf("\n", pos); pos = eol < 0 ? text.length : eol;
      var before = text.slice(0, pos), after = text.slice(pos);
      var pre = !before.trim() ? "" : /\n\n$/.test(before) ? "" : /\n$/.test(before) ? "\n" : "\n\n";
      var post = /^\n\n/.test(after) ? "" : /^\n/.test(after) ? "\n" : "\n\n";
      var end0 = pos;
      if (!after.trim()) { post = "\n"; end0 = text.length; after = ""; } // at the end: replace trailing blank lines
      var ins = pre + line + post;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(pos, end0);
        // insertText keeps undo (⌘Z) working; fallback for browsers without it
        if (!(document.execCommand && document.execCommand("insertText", false, ins) && ta.value.indexOf(line) >= 0)) {
          ta.value = before + ins + after;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
        var end = before.length + ins.length - post.length;
        ta.setSelectionRange(end, end);
        ta.setAttribute("data-cursor", String(end));
        if (aktiv.w.text !== ta.value) { aktiv.w.text = ta.value; nachAenderung(); }
      } else setText(before + ins + after);
    },
    // on encrypted pages too (uploaded as .blob) – but only once the content is unlocked
    canAttach: function () {
      var c = aktiv.crypto;
      return direct.slots().some(function (sl) { return sl.id === "gallery"; }) && !(aktiv.w && aktiv.w.encrypted && c && c.wasEncrypted && !c.unlocked);
    },
    addFiles: function () {
      if (!direct.canAttach()) return;
      if (!direct.active()) { direct.connectDialog(function () { direct.addFiles(); }); return; }
      var input = F.el('<input type="file" accept="' + FILE_ACCEPT + '" multiple hidden>');
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var picked = Array.prototype.slice.call(input.files || []), folder = direct.fileFolder(), state = aktiv;
        input.remove();
        picked.reduce(function (chain, file) {
          return chain.then(function () { if (aktiv === state) return direct.addFile(file, folder); });
        }, Promise.resolve()).catch(function (err) { direct.showError(err); });
      });
      input.click();
    },
    addFile: function (file, folder) {
      if (!FILE_RE.test(file.name)) { status.textContent = "⚠️ " + file.name + ": " + t("form.file_type", null, "nur STL, 3MF, MP4 (oder MOV), MP3 oder M4A"); return Promise.resolve(); }
      var ready = VIDEO_RE.test(file.name) ? direct.prepareVideo(file) : Promise.resolve(file);
      return ready.then(function (blob) {
        if (!blob) return;
        var asIs = blob === file && VIDEO_RE.test(file.name), limit = asIs ? MAX_ORIGINAL_BYTES : MAX_FILE_BYTES;
        if (blob.size > limit) {
          throw Object.assign(new Error(file.name + ": " + Math.round(blob.size / 1048576) + " MB – höchstens " + Math.round(limit / 1048576) + " MB pro Datei"
            + (asIs ? " (GitHub nimmt keine Dateien über 100 MB; das Video ließ sich im Browser nicht verkleinern – bitte kürzen oder vorher verkleinern)." : ".")), { kind: "info" });
        }
        var name = direct.fileName(file.name, blob !== file ? "mp4" : null);
        return direct.freeFileName(folder, name).then(function (free) {
          var f = { folder: folder, name: free, blob: blob, size: blob.size, original: file.name, shrunk: blob !== file, asIs: asIs ? (direct.videoFailure || "nicht verkleinert") : "" };
          aktiv.files.push(f);
          var alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "");
          direct.insertBlock("![" + alt + "](" + direct.fileUrl(f) + ")");
          direct.showFiles();
          status.textContent = "📎 " + free + " " + t("form.file_added", null, "eingefügt – Beschreibung in [ ] gern anpassen. Hochgeladen wird mit dem Pull Request.")
            + (f.asIs ? " ⚠️ Video im Original (" + f.asIs + ") – evtl. mit Standort in den Metadaten." : "");
        });
      }).catch(function (err) { status.textContent = "⚠️ " + ((err && err.message) || err); });
    },
    // videos are always recorded again in the browser (takes as long as the video): at most 1080p, MP4, no metadata
    // (phones store the location in videos)
    // If anything goes wrong (browser can't open or record the video, encoder won't start …), the video goes up as it
    // is, 4K included – an upload never fails because of the conversion (direct.videoFailure says why, for the list).
    prepareVideo: function (file) {
      direct.videoFailure = "";
      return direct.convertVideo(file).catch(function (err) {
        filesBtn.disabled = submitBtn.disabled = false;
        direct.videoFailure = (err && err.message) || "Fehler beim Verkleinern";
        return file;
      });
    },
    convertVideo: function (file) {
      return window.ladeSkripte(["video-verkleinern.js"]).then(function () {
        var V = window.VideoVerkleinern;
        return V.check(file, MAX_FILE_BYTES).then(function (info) {
          if (!info.needed) return file;
          var label = "🎬 " + file.name + ": " + info.reason + " – wird als MP4 " + (function (s) { return s.width + "×" + s.height; })(V.targetSize(info.width, info.height)) + " neu aufgenommen";
          status.textContent = label + " … (Tab bitte offen lassen)";
          filesBtn.disabled = submitBtn.disabled = true;
          return V.shrink(file, {
            maxBytes: MAX_FILE_BYTES,
            onProgress: function (k) { status.textContent = label + " … " + Math.round(k * 100) + " % (Tab bitte offen lassen)"; },
            start: function (go) {
              status.textContent = label + ". ";
              var b = F.el('<button type="button" class="btn btn-small">▶ Verkleinern starten</button>');
              b.addEventListener("click", function () { b.remove(); go(); });
              status.appendChild(b);
            }
          }).then(function (blob) {
            filesBtn.disabled = submitBtn.disabled = false;
            return blob;
          }, function (err) { filesBtn.disabled = submitBtn.disabled = false; throw err; });
        });
      });
    },
    // Attachments the page already has (editing): every /assets/dateien/ file the loaded text points to.
    // own: in this page's folder – only those are deleted from the repository when their embed leaves the text
    // (files elsewhere may be used by other pages too; then only the embed goes).
    // Photos too: every image under /assets/images/ in the loaded text (kind "photo"); it counts as used while the
    // file still points to it anywhere (text or a field like image:), and deleting takes NN.jpg, -600w and -social.
    existingFiles: function () {
      if (!aktiv || !aktiv.edit || aktiv.w.encrypted) return [];
      var src = String(aktiv.edit.source || ""), text = String(aktiv.w.text || ""), whole = dateiInhalt(), seen = {}, out = [];
      var ownFiles = "/" + direct.fileFolder(), ownPhotos = "/" + direct.folder();
      var re = /!?\[[^\]]*\]\((\/assets\/(?:dateien\/[^)\s]+|images\/[^)\s]+\.(?:jpe?g|png|webp|gif)))\)/gi, m;
      while ((m = re.exec(src))) {
        var url = m[1], photo = /^\/assets\/images\//.test(url);
        if (seen[url]) continue;
        seen[url] = true;
        var line = src.split("\n").filter(function (l) { return l.indexOf("(" + url + ")") >= 0; })[0] || m[0];
        out.push({ url: url, name: url.split("/").pop(), kind: photo ? "photo" : "file", own: url.indexOf(photo ? ownPhotos : ownFiles) === 0,
          used: (photo ? whole : text).indexOf(url) >= 0, line: line.trim() });
      }
      return out;
    },
    // repository paths to delete for an existing entry: a photo with its -600w and -social versions, unless the
    // file still points to one of them (e.g. social_media_preview_image)
    deletePaths: function (f) {
      var rel = f.url.slice(1);
      if (f.kind !== "photo") return [rel];
      var whole = dateiInhalt(), base = rel.replace(/(-600w|-social)?(\.[a-z0-9]+)$/i, "$2");
      return [base, base.replace(/(\.[a-z0-9]+)$/i, "-600w$1"), base.replace(/(\.[a-z0-9]+)$/i, "-social$1")]
        .filter(function (p) { return whole.indexOf("/" + p) < 0; });
    },
    // existing own attachments whose embed is gone → deleted with the pull request
    filesToDelete: function () { return direct.existingFiles().filter(function (f) { return f.own && !f.used; }); },
    removeExisting: function (i) {
      var f = direct.existingFiles()[i]; if (!f) return;
      var lines = String(aktiv.w.text || "").split("\n").filter(function (l) { return l.indexOf("(" + f.url + ")") < 0; });
      // a gallery marker without images above it is left over → remove it
      lines = lines.filter(function (l, k) { return !/^\{: \.gallery/.test(l) || /^!\[/.test(lines[k - 1] || ""); });
      setText(lines.join("\n").replace(/\n{3,}/g, "\n\n"));
    },
    undoRemoveExisting: function (i) {
      var f = direct.existingFiles()[i]; if (!f || f.used) return;
      direct.insertBlock(f.kind === "photo" && /^!\[/.test(f.line) ? f.line + "\n{: .gallery}" : f.line);
    },
    showFiles: function () {
      var files = (aktiv && aktiv.files) || [], existing = direct.existingFiles();
      if (!files.length && !existing.length) { filesEl.innerHTML = ""; return; }
      filesEl.innerHTML = '<p class="media-title"><strong>📎 ' + esc(existing.some(function (f) { return f.kind === "photo"; }) ? t("form.files_photos_title", null, "Fotos und Dateien") : t("form.files_title", null, "Dateien")) + "</strong></p><ul class=\"media-files\">"
        + existing.map(function (f, i) {
          var label = f.used ? '<span class="muted small">' + esc(t("form.file_existing", null, "schon auf der Seite")) + "</span>"
            : '<strong class="small">' + esc(f.own ? t("form.file_will_delete", null, "🗑️ wird mit dem Pull Request gelöscht") : t("form.file_unlinked", null, "nicht mehr eingebunden (Datei bleibt, sie liegt nicht im Ordner dieser Seite)")) + "</strong>";
          return '<li class="media-file' + (f.used ? "" : " media-unused") + '" data-existing-file="' + esc(f.name) + '">'
            + (f.kind === "photo" ? '<img class="media-file-thumb" src="' + esc(f.url) + '" alt="" loading="lazy">' : "")
            + "<code>" + esc(f.name) + "</code> " + label
            + (f.used
              ? ' <button type="button" class="btn btn-small btn-ghost" data-existing-remove="' + i + '" aria-label="' + esc(t("form.file_delete", null, "Datei entfernen")) + '" title="' + esc(t("form.file_delete", null, "Datei entfernen")) + '">✕</button>'
              : ' <button type="button" class="btn btn-small btn-ghost" data-existing-undo="' + i + '">' + esc(t("form.file_undo", null, "↩︎ Zurückholen")) + "</button>")
            + "</li>";
        }).join("")
        + files.map(function (f, i) {
          var used = direct.fileUsed(f);
          return '<li class="media-file' + (used ? "" : " media-unused") + '"><code>' + esc(f.name) + "</code> <span class=\"muted small\">"
            + (f.size / 1048576).toFixed(1).replace(".", ",") + " MB" + (f.shrunk ? " · neu aufgenommen aus " + esc(f.original) : "") + "</span>"
            + (f.asIs ? ' <span class="small" title="' + esc(f.asIs) + '">⚠️ Original, nicht verkleinert</span>' : "")
            + (used ? "" : ' <strong class="small">Nicht mehr im Text – wird nicht hochgeladen</strong>')
            + ' <button type="button" class="btn btn-small btn-ghost" data-file-remove="' + i + '" aria-label="Datei entfernen">✕</button></li>';
        }).join("") + "</ul>";
    },
    removeFile: function (i) {
      var f = aktiv.files[i]; if (!f) return;
      var url = direct.fileUrl(f);
      var lines = String(aktiv.w.text || "").split("\n").filter(function (l) { return l.indexOf("](" + url + ")") < 0; });
      setText(lines.join("\n").replace(/\n{3,}/g, "\n\n"));
      aktiv.files.splice(i, 1);
      direct.showFiles();
    },
    submit: function () {
      var newText = dateiInhalt(), path, title, u;
      // sent already and nothing changed since → no second pull request with the same content
      if (aktiv.sent && aktiv.sent.text === newText) {
        status.innerHTML = 'Schon gesendet: <a href="' + esc(aktiv.sent.url) + '" target="_blank" rel="noopener">Pull Request #' + aktiv.sent.number + "</a>.";
        return;
      }
      if (aktiv.edit) {
        if (newText === aktiv.edit.source) { status.textContent = t("form.unchanged", null, "Noch nichts geändert."); return; }
        path = aktiv.path;
        title = aktiv.schema.titel + " geändert: " + (aktiv.w.title || aktiv.w.name || path.split("/").pop());
      } else {
        path = aktiv.schema.ordner + "/" + aktiv.w.datei.trim();
        title = "Neu: " + aktiv.schema.titel + " „" + (aktiv.w.title || aktiv.w.name || aktiv.w.medium || aktiv.w.datei) + "“";
      }
      // only photos that are used somewhere are uploaded (no orphans in assets/)
      var slots = direct.slots(), photos = aktiv.photos.filter(direct.used), unused = aktiv.photos.length - photos.length;
      var usage = photos.map(function (p) { return { p: p, plain: slots.some(function (sl) { return !sl.social && direct.uses(p, sl); }), social: slots.some(function (sl) { return sl.social && direct.uses(p, sl); }) }; });
      var folder = direct.folder(), files = [], parent = null, body = "";
      var attachments = (aktiv.files || []).filter(direct.fileUsed);
      var removedFiles = direct.filesToDelete();
      function buildFilesAsync() {
        files = [{ path: path, text: newText }];
        if (!state.w.encrypted) {
          attachments.forEach(function (f) { files.push({ path: direct.fileUrl(f).slice(1), blob: f.blob }); });
          usage.forEach(function (u) {
            var base = direct.url(u.p).slice(1);
            if (u.plain) { files.push({ path: base, blob: u.p.full }); files.push({ path: base.replace(/\.jpg$/, "-600w.jpg"), blob: u.p.thumb }); }
            if (u.social && u.p.social) files.push({ path: base.replace(/\.jpg$/, "-social.jpg"), blob: u.p.social.full });
          });
          if (!removedFiles.length) return Promise.resolve();
          // photos/attachments whose embed was removed: delete them too – only if they are (still) there on the target branch
          var paths = [].concat.apply([], removedFiles.map(direct.deletePaths)), byDir = {};
          paths.forEach(function (p) { var d0 = p.slice(0, p.lastIndexOf("/")); (byDir[d0] = byDir[d0] || []).push(p); });
          return Promise.all(Object.keys(byDir).map(function (d0) {
            return GitHubApi.listFolder(d0, state.prBase && state.prBase.branch).then(function (names) {
              byDir[d0].forEach(function (p) { if (names.indexOf(p.slice(d0.length + 1)) >= 0) files.push({ path: p, delete: true }); });
            });
          }));
        }
        // Encrypted page: encrypt all gallery photos as .blob files (never upload unencrypted .jpg/-600w.jpg),
        // upload social_media_preview_image (-social.jpg) unencrypted if chosen, and migrate any existing
        // unencrypted local gallery/title images referenced in the page to .blob files + delete their .jpg files.
        if (state.crypto && state.crypto.wasEncrypted && !state.crypto.unlocked) return Promise.resolve();
        return scheduleCryptoEncrypt(state).then(function () {
          newText = dateiInhalt();
          files[0].text = newText;
          var key = state.crypto && state.crypto.lastKey;
          if (!key) return;
          return withCrypto().then(function (CP) {
            var newPhotoUrls = {}, keptSocialRel = state.w.social_media_preview_image ? state.w.social_media_preview_image.replace(/^\//, "") : "";
            var newPhotoPromises = usage.map(function (u) {
              var fullUrl = direct.url(u.p), base = fullUrl.slice(1);
              if (u.social && u.p.social) {
                var socialPath = base.replace(/\.jpg$/, "-social.jpg");
                files.push({ path: socialPath, blob: u.p.social.full });
                keptSocialRel = socialPath;
              }
              if (!u.plain) return Promise.resolve();
              newPhotoUrls[fullUrl] = true;
              var blobPath = base + ".blob";
              return u.p.full.arrayBuffer().then(function (buf) {
                return CP.encryptBytesToBlob(buf, key);
              }).then(function (encBytes) {
                files.push({ path: blobPath, blob: new Blob([encBytes], { type: "application/octet-stream" }) });
              });
            });
            // 📎 attachments: encrypted like the photos (.blob next to where the file would be), never as plain files
            var newFilePromises = attachments.map(function (f) {
              var url = direct.fileUrl(f);
              newPhotoUrls[url] = true;
              return f.blob.arrayBuffer().then(function (buf) { return CP.encryptBytesToBlob(buf, key); }).then(function (encBytes) {
                files.push({ path: url.slice(1) + ".blob", blob: new Blob([encBytes], { type: "application/octet-stream" }) });
              });
            });
            return Promise.all(newPhotoPromises.concat(newFilePromises)).then(function () {
              var extraAtts = collectEncryptedAttachments(state).filter(function (a) { return !newPhotoUrls[a.name]; });
              var ref = state.prBase && state.prBase.branch;
              var toDeleteByDir = {};
              function markForDelete(imgUrl) {
                if (!imgUrl || !/^\/assets\/(images|dateien)\//.test(imgUrl) || /\/og-preview\.jpg$/.test(imgUrl)) return;
                var rel = imgUrl.slice(1), slash = rel.lastIndexOf("/");
                if (slash < 0) return;
                var dir = rel.slice(0, slash), fname = rel.slice(slash + 1);
                var baseName = fname.replace(/(-600w|-social)?(\.[a-zA-Z0-9]+)$/, "$2");
                var list = toDeleteByDir[dir] = toDeleteByDir[dir] || [];
                [fname, baseName, baseName.replace(/(\.[a-zA-Z0-9]+)$/, "-600w$1"), baseName.replace(/(\.[a-zA-Z0-9]+)$/, "-social$1")].forEach(function (cand) {
                  if (dir + "/" + cand === keptSocialRel) return;
                  if (list.indexOf(cand) < 0) list.push(cand);
                });
              }
              ((state.crypto && state.crypto.migratedPublicImages) || []).forEach(markForDelete);
              if (state.w.social_media_preview_image) markForDelete(state.w.social_media_preview_image);
              var migratePromises = extraAtts.map(function (att) {
                var relPath = att.name.slice(1);
                markForDelete(att.name);
                return GitHubApi.readBinaryFile(relPath, ref).then(function (bytes) {
                  if (!bytes) return;
                  return CP.encryptBytesToBlob(bytes, key).then(function (encBytes) {
                    files.push({ path: att.blob.slice(1), blob: new Blob([encBytes], { type: "application/octet-stream" }) });
                  });
                });
              });
              return Promise.all(migratePromises).then(function () {
                var dirs = Object.keys(toDeleteByDir);
                if (!dirs.length) return;
                return Promise.all(dirs.map(function (dir) {
                  return GitHubApi.listFolder(dir, ref).then(function (existingNames) {
                    toDeleteByDir[dir].forEach(function (cand) {
                      if (existingNames.indexOf(cand) >= 0) {
                        files.push({ path: dir + "/" + cand, delete: true });
                      }
                    });
                  });
                }));
              });
            });
          });
        });
      }
      if (unused) status.textContent = unused + " Foto(s) werden nirgends verwendet und nicht hochgeladen.";
      submitBtn.disabled = true;
      var label = submitBtn.textContent;
      submitBtn.textContent = "⏳ Wird gesendet …";
      var state = aktiv, step = function (t) { status.textContent = t; };
      // an earlier send was interrupted after the branch was created: finish that one first (K41/K42)
      if (state.pending) {
        GitHubApi.finishPullRequest(state.pending).then(function (pr) {
          var sentText = state.pending.text; state.pending = null;
          direct.sentOk(state, pr, sentText, path);
          if (sentText !== newText) status.innerHTML += " Deine neueren Änderungen bitte nochmal senden.";
        }).catch(function (err) { direct.showError(err); }).then(function () { submitBtn.disabled = false; submitBtn.textContent = label; direct.update(); });
        return;
      }
      direct.applyRecycling(state).then(function () { return GitHubApi.whoAmI(); }).then(function (me) {
        u = me;
        // photos follow the file name: if it changed after adding them, move them – with free numbers in the new folder (K26)
        return direct.relocate(photos, folder).then(function (moved) {
          moved.forEach(function (m) {
            ["", "-600w", "-social"].forEach(function (v) {
              newText = newText.split(direct.url(m.from, v)).join(direct.url(m.to, v));
              if (state.w.encrypted) state.w.text = String(state.w.text || "").split(direct.url(m.from, v)).join(direct.url(m.to, v));
            });
          });
          // attachments follow the file name too (same name, new folder; a free name if it is taken there)
          return direct.relocateFiles(attachments).then(function (fmoved) {
            fmoved.forEach(function (m) { newText = newText.split(m.from).join(m.to); });
          });
        }).then(function () {
          var checkTarget = state.w.encrypted ? state.w.text : newText;
          return direct.checkMissingImages(state, checkTarget, photos);
        });
      }).then(function () {
        return buildFilesAsync();
      }).then(function () {
        if (!state.edit) return Promise.all([GitHubApi.readFile(path), state.prBase ? GitHubApi.readFile(path, state.prBase.branch) : null]).then(function (cur) {
          if (cur[0] != null) throw new Error("Die Datei " + path + " gibt es schon – bitte den Dateinamen ändern.");
          if (cur[1] != null) throw new Error("Die Datei " + path + " gibt es in #" + state.prBase.number + " schon – bitte den Dateinamen ändern.");
          return GitHubApi.openPullsForFile(path);
        }).then(function (prs) {
          if (prs && prs.length) throw new Error("Pull Request #" + prs[0].number + " („" + prs[0].title + "“) legt " + path + " schon an – bitte dort weitermachen oder den Dateinamen ändern.");
        });
        return direct.prepareEdit(state, path, newText).then(function (prep) {
          if (prep.stop) throw prep.stop;
          files[0].text = newText = prep.text;
          parent = prep.parent;
        });
      }).then(function () {
        body = (state.edit ? "Änderung an `" + path + "`" : "Neue Datei `" + path + "`") + " – über das Formular auf " + siteHost() + " von @" + u.login
          + " ([Seite](" + location.origin + location.pathname + ")).\n\n"
          + (photos.length ? "**Fotos:** " + photos.length + " (im Browser vorbereitet: verkleinert auf max. 1600 px + 600w-Vorschau, ohne Metadaten/GPS)\n\n" : "")
          + (removedFiles.length ? "**Gelöschte Dateien:** " + removedFiles.map(function (f) { return "`" + f.name + "`"; }).join(", ") + "\n\n" : "")
          + (attachments.length ? "**Dateien:** " + attachments.map(function (f) { return "`" + f.name + "` (" + (f.size / 1048576).toFixed(1) + " MB" + (f.shrunk ? ", im Browser neu aufgenommen: max. 1080p, ohne Metadaten" : f.asIs ? ", ⚠️ Original – im Browser nicht verkleinert: " + f.asIs : "") + ")"; }).join(", ") + "\n\n" : "")
          + "### Vor dem Mergen prüfen\n\n- [ ] Text: Makespace statt Makerspace, keine Wohnadressen, keine fremden E-Mail-Adressen\n"
          + (photos.length ? "- [ ] Fotos: keine erkennbaren Kindergesichter, Kennzeichen, Namen oder Zugangscodes\n" : "")
          + (attachments.length ? "- [ ] Dateien: Videos ohne erkennbare Kindergesichter, keine fremden Dateien ohne Erlaubnis\n" : "")
          + (attachments.some(function (f) { return f.asIs; }) ? "- [ ] Video im Original hochgeladen: Standort in den Metadaten prüfen (z. B. `ffprobe`), ggf. mit ffmpeg verkleinern (`-map_metadata -1`)\n" : "")
          + "- [ ] Checks („Prüfen“) sind grün\n";
        return GitHubApi.createPullRequest({ title: title, body: body, files: files, branchHint: path.split("/").pop(), onStep: step, pr: state.prBase, parent: parent });
      }).then(function (pr) {
        if (aktiv !== state) return;
        direct.sentOk(state, pr, newText, path);
      }).catch(function (err) {
        if (aktiv !== state) return;
        // ♻️ nothing was sent: back to "own pull request" with the checkbox, so the next try decides again
        if (state.recycled && !err.conflicts && !(err.kind === "conflict" && /fast.forward/i.test(err.message))) { state.prBase = null; state.recycled = false; }
        // the branch with the commit exists, but the pull request didn't come back: next click finishes it (K41/K42)
        if (err.pendingBranch) {
          state.pending = { branch: err.pendingBranch, fork: err.pendingFork || null, title: title, body: body, text: newText };
          direct.showError(err);
          status.appendChild(document.createTextNode(" Nochmal senden setzt fort – es entsteht kein zweiter Pull Request."));
          return;
        }
        // someone pushed to the branch in between: fetch, merge and try again (max. 3×, K09)
        if (err.kind === "conflict" && /fast.forward/i.test(err.message) && (state.retries || 0) < 3) {
          state.retries = (state.retries || 0) + 1; status.textContent = "Inzwischen hat jemand gespeichert – führe zusammen …";
          setTimeout(function () { submitBtn.disabled = false; direct.submit(); }, 0);
          return;
        }
        state.retries = 0;
        if (err.prGone) { direct.prGone(err.prGone); return; }
        if (err.newPulls) { direct.newPulls(err.newPulls); return; }
        if (err.conflicts) return; // conflict box is open
        direct.showError(err);
      }).then(function () {
        submitBtn.disabled = !!d.querySelector(".form-conflicts"); // stays off while the conflict box is open
        if (submitBtn.textContent === "⏳ Wird gesendet …") { submitBtn.textContent = label; direct.update(); }
      });
    },
    // success: stay in this pull request – further changes become more commits there, not a second PR (K17–K19)
    sentOk: function (state, pr, text, path) {
      loescheEntwurf();
      state.recycled = false;
      state.gesendet = true; state.retries = 0;
      var savedPlain = state.crypto && state.crypto.unlocked ? state.w.text : null;
      var savedPw = state.crypto ? state.crypto.password : "";
      function syncEditAfterSave() {
        state.edit = readSource(state.schema, text, path) || state.edit;
        state.w = JSON.parse(JSON.stringify(state.edit.w0)); state.beruehrt = allTouched();
        initCryptoState(state, true);
        if (state.crypto.wasEncrypted && savedPlain != null && savedPw) {
          state.crypto.unlocked = true;
          state.crypto.password = savedPw;
          state.crypto.initialPassword = savedPw;
          state.crypto.initialPlaintext = savedPlain;
          state.crypto.encryptedForText = savedPlain;
          state.crypto.encryptedForPw = savedPw;
          state.w.text = savedPlain;
        }
      }
      // through the person's own fork (no push access, #186): the branch lives in the fork, so the next send starts a new
      // branch instead of reading this one from the repository; without a number GitHub's compare page opens the PR
      if (pr.fork) {
        state.sent = { text: text, url: pr.url || pr.compareUrl, number: pr.number || null };
        direct.clearPhotos();
        if (!state.edit) { state.path = path; dateiInput.readOnly = true; }
        syncEditAfterSave();
        baueFelder(); zeigeVorschau();
        status.innerHTML = pr.number
          ? "✅ " + t("github.sent_fork_html", { link: '<a href="' + esc(pr.url) + '" target="_blank" rel="noopener">Pull Request #' + pr.number + "</a>", fork: esc(pr.fork) }, '<a href="' + esc(pr.url) + '" target="_blank" rel="noopener">Pull Request #' + pr.number + "</a> ist angelegt (aus deinem Fork " + esc(pr.fork) + ") – danke!")
          : "✅ " + t("github.sent_fork_compare_html", { fork: esc(pr.fork), link: '<a href="' + esc(pr.compareUrl) + '" target="_blank" rel="noopener" data-compare-link>' + esc(t("github.compare_link", null, "Pull Request auf GitHub anlegen ↗")) + "</a>" }, "Deine Änderung liegt in deinem Fork " + esc(pr.fork) + '. Letzter Schritt: <a href="' + esc(pr.compareUrl) + '" target="_blank" rel="noopener" data-compare-link>Pull Request auf GitHub anlegen ↗</a> – dort „Create pull request“ klicken.');
        if (pr.forkStale) status.innerHTML += ' <span data-fork-stale>' + t("github.fork_stale_html", { fork: esc(pr.fork), url: esc("https://github.com/" + pr.fork) }, "⚠️ Dein Fork " + esc(pr.fork) + ' ließ sich nicht automatisch auf den neuesten Stand bringen. Deine Änderung baut trotzdem auf dem aktuellen Stand auf – für später auf <a href="https://github.com/' + esc(pr.fork) + '" target="_blank" rel="noopener">GitHub</a> „Sync fork“ klicken.') + "</span>";
        return;
      }
      state.sent = { text: text, url: pr.url, number: pr.number };
      try { localStorage.setItem(LAST_PR_KEY, String(pr.number)); } catch (x) { /* storage blocked */ }
      direct.clearPhotos();
      var branch = pr.branch || (state.prBase && state.prBase.branch);
      state.prBase = { number: pr.number, url: pr.url, branch: branch };
      if (!state.edit) { state.path = path; dateiInput.readOnly = true; }
      syncEditAfterSave();
      baueFelder(); zeigeVorschau();
      direct.showPrMode("Gespeichert in #" + pr.number + ".");
      status.innerHTML = '✅ <a href="' + esc(pr.url) + '" target="_blank" rel="noopener">Pull Request #' + pr.number + "</a> ist " + (pr.updated ? "ergänzt" : "angelegt") + " – danke! Weitere Änderungen landen im selben Pull Request.";
    },
    // photos whose folder changed (new file renamed after adding them): free numbers in the new folder → [{ from, to }]
    relocate: function (photos, folder) {
      var moving = photos.filter(function (p) { return p.folder !== folder; });
      if (!moving.length) return Promise.resolve([]);
      return Promise.all([GitHubApi.listFolder(folder, aktiv.prBase && aktiv.prBase.branch), GitHubApi.namesInOpenPulls(folder)]).then(function (res) {
        var taken = res[0].concat(res[1]).map(function (n) { return parseInt(n, 10); }).filter(function (n) { return n > 0; })
          .concat(photos.filter(function (p) { return p.folder === folder; }).map(function (p) { return parseInt(p.name, 10); }));
        var next = taken.reduce(function (a, b) { return Math.max(a, b); }, 0);
        return moving.map(function (p) {
          var from = { folder: p.folder, name: p.name }, nr = parseInt(p.name, 10);
          if (taken.indexOf(nr) >= 0) nr = ++next; else { taken.push(nr); next = Math.max(next, nr); }
          p.folder = folder; p.name = F.zwei(nr) + ".jpg";
          return { from: from, to: { folder: folder, name: p.name } };
        });
      });
    },
    relocateFiles: function (list) {
      var target = direct.fileFolder(), moving = list.filter(function (f) { return f.folder !== target; });
      return moving.reduce(function (chain, f) {
        return chain.then(function (out) {
          var from = direct.fileUrl(f);
          return direct.freeFileName(target, f.name).then(function (free) {
            f.folder = target; f.name = free;
            aktiv.w.text = String(aktiv.w.text || "").split(from).join(direct.fileUrl(f));
            return out.concat([{ from: from, to: direct.fileUrl(f) }]);
          });
        });
      }, Promise.resolve([]));
    },
    // images the text/fields newly point to must exist: in the photo pool, on the target branch or already before (K46 –
    // after a reload the pool is empty but the lines are still in the text)
    checkMissingImages: function (state, text, photos) {
      var before = state.edit ? state.edit.source : "", re = /\/(assets\/images\/[^\s)"'\]]+\.(?:jpe?g|png|webp|gif))/gi, m, refs = {};
      while ((m = re.exec(text))) if (before.indexOf(m[1]) < 0) refs[m[1]] = true;
      (photos || []).forEach(function (p) { ["", "-600w", "-social"].forEach(function (v) { delete refs[direct.url(p, v).slice(1)]; }); });
      var paths = Object.keys(refs);
      if (!paths.length) return Promise.resolve();
      var dirs = {}; paths.forEach(function (x) { var d0 = x.slice(0, x.lastIndexOf("/")); (dirs[d0] = dirs[d0] || []).push(x); });
      return Promise.all(Object.keys(dirs).map(function (d0) {
        return GitHubApi.listFolder(d0, state.prBase && state.prBase.branch).then(function (names) {
          return dirs[d0].filter(function (x) {
            var fn = x.slice(d0.length + 1);
            return names.indexOf(fn) < 0 && names.indexOf(fn + ".blob") < 0;
          });
        });
      })).then(function (lists) {
        var missing = [].concat.apply([], lists);
        if (missing.length) throw Object.assign(new Error("Diese Fotos stehen im Text, sind aber nicht mehr da (z. B. nach dem Neuladen der Seite): "
          + missing.map(function (x) { return x.split("/").pop(); }).join(", ") + ". Bitte neu hinzufügen oder die Zeilen entfernen."), { kind: "missing" });
      });
    },
    // Before an edit is sent: where does it go (main or the PR's branch), is that PR still open, and what is there NOW?
    // If the file changed since the form was loaded, merge (base = loaded, mine = form, theirs = now) – automatically
    // if nothing overlaps, otherwise open the conflict box and stop. → { text, parent } or { stop: Error }
    prepareEdit: function (state, path, mineText) {
      var check = state.prBase ? GitHubApi.getPull(state.prBase.number) : GitHubApi.openPullsForFile(path, true).then(function (prs) {
        var known = (state.openPulls || []).map(function (x) { return x.number; }).concat(state.ownPrOk || []);
        var fresh = prs.filter(function (x) { return x.status !== "removed" && known.indexOf(x.number) < 0; });
        if (fresh.length) { var e = new Error("newPulls"); e.newPulls = fresh; throw e; }
        return null;
      });
      return Promise.all([check, withMerge()]).then(function (res) {
        var pr = res[0];
        if (pr && (pr.state !== "open")) { var gone = new Error("gone"); gone.prGone = pr; throw gone; }
        return GitHubApi.headSha(state.prBase ? state.prBase.branch : null);
      }).then(function (head) {
        if (!head) { var gone = new Error("gone"); gone.prGone = { number: state.prBase.number, url: state.prBase.url, state: "closed", branchGone: true }; throw gone; }
        return GitHubApi.readFile(path, head).then(function (theirs) {
          var mine = mineText, base = state.edit.source;
          if (theirs == null) return { stop: new Error("Die Datei " + path + " gibt es dort nicht mehr – sie wurde inzwischen gelöscht oder umbenannt.") };
          if (theirs === base) return { text: mine, parent: head };
          var r = FileMerge.merge(base, mine, theirs);
          if (r.conflicts.length) {
            direct.showConflicts(r, theirs, state.prBase ? "#" + state.prBase.number : "der Seite");
            var stop = new Error("conflicts"); stop.conflicts = true; return { stop: stop };
          }
          var merged = r.build();
          direct.rebase(theirs, merged); // the form now shows the combined state
          if (merged === theirs) return { stop: Object.assign(new Error("Deine Änderungen sind dort schon enthalten – nichts zu senden."), { kind: "info" }) };
          status.textContent = "ℹ️ Die Seite wurde inzwischen geändert – deine Änderung wird auf den neuen Stand übertragen.";
          return { text: merged, parent: head };
        });
      });
    },
    // while the form was open, someone else opened a PR for the same file: send along there or own PR? (stale tab, K01/K06)
    newPulls: function (prs) {
      var box = direct.noticeBox();
      box.innerHTML = "<strong>⚠️ Während du geschrieben hast, hat jemand einen Pull Request zu dieser Seite angelegt:</strong><ul>" + prs.map(function (pr, i) {
        return '<li><a href="' + esc(pr.url) + '" target="_blank" rel="noopener">#' + pr.number + " " + esc(pr.title) + "</a>" + (pr.user ? " von @" + esc(pr.user) : "")
          + (pr.sameRepo && GitHubApi.canPushKnown() !== false ? ' <button type="button" class="btn btn-small" data-pr-continue="' + i + '">In #' + pr.number + " mitschicken</button>" : "") + "</li>";
      }).join("") + '</ul><button type="button" class="btn btn-small btn-ghost" data-pr-own>Trotzdem eigener Pull Request</button>';
      box.onclick = function (e) {
        var b = e.target.closest("[data-pr-continue]");
        if (b) { direct.pickUp(prs[+b.getAttribute("data-pr-continue")]); return; }
        if (e.target.closest("[data-pr-own]")) {
          aktiv.ownPrOk = (aktiv.ownPrOk || []).concat(prs.map(function (x) { return x.number; }));
          box.remove(); status.textContent = "Ok – nochmal senden legt einen eigenen Pull Request an.";
        }
      };
      status.textContent = "";
    },
    // the PR the form saves into was merged or closed meanwhile (or its branch is gone): offer a new PR (K10–K12)
    prGone: function (pr) {
      var box = direct.noticeBox(), merged = pr.merged;
      box.innerHTML = "<strong>" + (merged ? "✅ #" + pr.number + " ist inzwischen gemergt." : "⚠️ #" + pr.number + (pr.branchGone ? " gibt es so nicht mehr (Branch gelöscht)." : " wurde inzwischen geschlossen.")) + "</strong> "
        + "Deine Änderungen sind noch da. "
        + '<button type="button" class="btn btn-small" data-pr-new>Neuen Pull Request anlegen</button>';
      box.onclick = function (e) {
        if (!e.target.closest("[data-pr-new]")) return;
        // new PR from the current main: everything in the form (incl. what was in the old PR) counts as my change,
        // so the base becomes main as it is now – the form values stay as they are (K10/K11)
        var state = aktiv;
        GitHubApi.readFile(state.path).then(function (mainText) {
          if (aktiv !== state) return;
          if (mainText != null) { var loaded = readSource(state.schema, mainText, state.path); if (loaded) state.edit = loaded; }
          state.prBase = null; state.sent = null; box.remove(); direct.update(); zeigeVorschau(); speichereEntwurf();
          status.textContent = "Ok – beim Senden entsteht ein neuer Pull Request auf dem aktuellen Stand.";
        }).catch(function (err) { direct.showError(err); });
      };
      status.textContent = "";
    },
    // small dialog: paste a fine-grained token, check it, remember it (or not), disconnect
    // → Promise of the open <dialog> (the overview /mitmachen/offen/ listens for "close", assets/js/open-work.js)
    connectDialog: function (then) {
      return window.ladeSkripte(["github-api.js"]).then(function () {
        var g = document.getElementById("github-connect");
        if (!g) {
          // texts with <strong>/<code> come from the UI strings as HTML: they are our own strings, not user input
          g = F.dialog({ id: "github-connect", klasse: "github-dialog", titel: t("github.dialog_title", null, "🔑 Mit GitHub verbinden") });
          g.insertAdjacentHTML("beforeend", '<div class="github-body">'
            + "<p>" + t("github.intro_html", null, "Mit einem GitHub-Token legen die Formulare <strong>Pull Requests direkt an</strong> – mit Fotos, ohne Kopieren. Gemergt wird wie immer erst nach Durchsicht.") + "</p>"
            + '<ol class="small"><li><a data-token-link target="_blank" rel="noopener">' + esc(t("github.create_token", null, "Token auf GitHub erstellen ↗")) + "</a> – "
            + t("github.token_classic_html", { repo: "<code>" + esc(GitHubApi.repo()) + "</code>" }, "<em>public_repo</em> ist schon angehakt, kurzes Ablaufdatum wählen (der Token gilt für alle öffentlichen Repositories, in die du schreiben darfst), „Generate token“. Geht mit jedem GitHub-Konto: mit Schreibrechten auf " + esc(GitHubApi.repo()) + " direkt, sonst über deinen eigenen Fork – der wird beim ersten Senden angelegt.") + "</li>"
            + "<li>" + esc(t("github.paste_token", null, "Token hier einfügen. Er bleibt nur in diesem Browser und wird nur an api.github.com geschickt.")) + "</li></ol>"
            + '<p class="small muted">' + t("github.no_token_html", null, "Ganz ohne Token geht es mit jedem Konto auch: „📋 Auf GitHub speichern“ – GitHub legt dann selbst einen Fork an und bietet „Create pull request“ an. Hast du schon einen älteren Fork, dort vorher „Sync fork“ klicken.") + "</p>"
            + '<label class="form-feld"><span>Token</span><input type="password" autocomplete="off" spellcheck="false" placeholder="ghp_…"></label>'
            + '<label class="form-check"><input type="checkbox" data-remember><span>' + esc(t("github.remember", null, "Auf diesem Gerät merken")) + '</span><small class="form-hilfe">' + esc(t("github.remember_hint", null, "Sonst ist er weg, sobald der Tab zu ist. Auf fremden Geräten nicht anhaken.")) + "</small></label>"
            + '<p class="github-who small" aria-live="polite"></p>'
            + '<div class="form-fuss"><button type="button" class="btn btn-small btn-ghost" data-logout>' + esc(t("github.logout", null, "Abmelden")) + '</button><span class="muted small"></span><button type="button" class="btn" data-connect>' + esc(t("github.connect_button", null, "Verbinden")) + "</button></div></div>");
          g.querySelector("[data-token-link]").href = GitHubApi.tokenUrl();
        }
        var input = g.querySelector("input[type=password]"), who = g.querySelector(".github-who");
        function show() {
          if (!GitHubApi.connected()) { who.textContent = t("github.not_connected_short", null, "Nicht verbunden."); return; }
          who.textContent = t("github.checking", null, "Prüfe …");
          GitHubApi.whoAmI().then(function (me) {
            // one text element next to the avatar: .github-who is a flex row, loose text nodes would each wrap on their own
            var repoName = esc(GitHubApi.repo()), parts = [];
            if (me.canPush) parts.push(esc(t("github.can_push", null, "darf Pull Requests anlegen ✅")));
            else {
              if (me.collaboratorNeedsClassic) parts.push(t("github.collaborator_classic_html", { repo: repoName }, "du bist Collaborator auf " + repoName + ", aber dieser <strong>fine-grained Token</strong> gilt nur für deine eigenen Repositories. Für Pull Requests direkt im Repository oben einen neuen Token erstellen – mit diesem geht es über deinen Fork."));
              parts.push(me.fork ? t("github.cannot_push_fork_html", { repo: repoName, fork: esc(me.fork) }, "hat keine Schreibrechte auf " + repoName + " – Änderungen gehen über deinen Fork <strong>" + esc(me.fork) + "</strong> ✅")
                : t("github.cannot_push_html", { repo: repoName }, "hat keine Schreibrechte auf " + repoName + " – beim ersten Senden wird <strong>dein eigener Fork</strong> angelegt ✅"));
              if (me.fork && me.forkBehind) parts.push('<span data-fork-behind>' + esc(t("github.fork_behind", null, "Dein Fork ist nicht auf dem neuesten Stand – er wird vor dem Senden abgeglichen, deine Änderung baut auf dem aktuellen Stand auf.")) + "</span>");
            }
            // one text element next to the avatar: .github-who is a flex row, loose text nodes would each wrap on their own
            who.innerHTML = '<img src="' + esc(me.avatar) + '" alt="" width="24" height="24"><span>'
              + t("github.connected_as_html", { login: "<strong>@" + esc(me.login) + "</strong>" }, "Verbunden als <strong>@" + esc(me.login) + "</strong>")
              + " – " + parts.join(" ") + "</span>";
          }, function (err) { who.textContent = "⚠️ " + err.message; });
        }
        g.querySelector("[data-connect]").onclick = function () {
          if (!input.value.trim()) { input.focus(); return; }
          GitHubApi.setToken(input.value, g.querySelector("[data-remember]").checked);
          input.value = "";
          show(); direct.update();
          GitHubApi.whoAmI().then(function (me) { if (then) { g.close(); then(); } }, function () {});
        };
        g.querySelector("[data-logout]").onclick = function () { GitHubApi.logout(); show(); direct.update(); if (d) setMode(!!(aktiv && aktiv.edit)); };
        show();
        g.showModal();
        return g;
      });
    }
  };
  // three-way merge (assets/js/merge.js), loaded on first use
  function withMerge() { return window.FileMerge ? Promise.resolve(window.FileMerge) : window.ladeSkripte(["merge.js"]).then(function () { return window.FileMerge; }); }
  function setText(v) {
    aktiv.w.text = v;
    var ed = editors.filter(function (e) { return e.textarea && e.textarea.name === "text"; })[0];
    if (ed) ed.setValue(v); else if (form.elements.text) form.elements.text.value = v;
    nachAenderung();
  }

  // step lists shown in the dialog (UI strings form.steps_*, German fallback; they contain <strong>)
  function stepsNew() {
    return "<li>" + t("form.steps_new_1", null, "„Auf GitHub anlegen“ kopiert die Datei und öffnet GitHub mit dem fertigen Inhalt.") + "</li>"
      + "<li>" + t("form.steps_commit_html", null, "Dort „Commit changes …“ → <strong>„Create a new branch … and start a pull request“</strong>.") + "</li>"
      + "<li>" + t("form.steps_new_3", null, "Nach dem Merge erscheint die Seite nach ein paar Minuten auf der Website.") + "</li>";
  }
  function stepsEdit() {
    return "<li>" + t("form.steps_edit_1", null, "„Auf GitHub speichern“ kopiert die geänderte Datei und öffnet sie im GitHub-Editor.") + "</li>"
      + "<li>" + t("form.steps_edit_2", null, "Dort den ganzen Inhalt markieren (⌘A / Strg+A) und einfügen (⌘V / Strg+V).") + "</li>"
      + "<li>" + t("form.steps_edit_commit_html", null, "„Commit changes …“ → <strong>„Create a new branch … and start a pull request“</strong>.") + "</li>"
      + "<li>" + t("form.steps_edit_4", null, "Nach dem Merge ist die Änderung nach ein paar Minuten auf der Website.") + "</li>";
  }
  // switch the dialog between "new file" and "edit existing file"
  function setMode(editing) {
    d.querySelectorAll(".form-pr-notice, .form-conflicts").forEach(function (x) { x.remove(); });
    stepsEl.innerHTML = editing ? stepsEdit() : stepsNew();
    discardBtn.textContent = editing ? t("form.discard", null, "↩️ Änderungen verwerfen") : t("form.restart", null, "🗑️ Neu anfangen");
    submitBtn.textContent = editing ? t("form.submit_edit", null, "📋 Auf GitHub speichern") : t("form.submit_new", null, "📋 Auf GitHub anlegen");
    submitBtn.disabled = false; submitBtn.title = "";
    direct.update();
    dateiInput.readOnly = !!editing;
    d.querySelector(".neu-pfad").previousElementSibling.textContent = editing ? t("form.file", null, "Datei") : t("form.new_file", null, "Neue Datei");
    vorlageLink.textContent = editing ? t("form.view_on_github", null, "Auf GitHub ansehen ↗") : t("form.template_link", null, "Vorlage mit allen Feldern ↗");
  }
  function allTouched() { var touched = {}; aktiv.felder.forEach(function (f) { touched[f.name] = true; }); return touched; }

  // ---------- open ----------
  // link: an a[data-neu] from _includes/neu-button.html
  function oeffnen(link) {
    var daten = JSON.parse(link.getAttribute("data-neu"));
    var schema = TYPEN[daten.typ];
    if (!schema) { window.open(link.href, "_blank", "noopener"); return; }
    if (!d) baueDialog();
    aktiv = { typ: daten.typ, schema: schema, felder: alleFelder(schema), vorgabe: daten.werte, beruehrt: {}, gesendet: false, photos: [], files: [],
      schluessel: STORE + daten.typ + ":" + location.pathname };
    var entwurf = ladeEntwurf();
    aktiv.w = Object.assign(anfangswerte(schema, daten.werte), entwurf && entwurf.w);
    if (entwurf) aktiv.beruehrt = entwurf.beruehrt || {};
    initCryptoState(aktiv, false);
    folge();

    setMode(false);
    // label/hint of the ➕ button in the UI language (_includes/neu-button.html puts the keys into data-neu)
    if (daten.i18n && window.I18n) { daten.label = t(daten.i18n + ".label", daten.i18nParams); daten.hinweis = t(daten.i18n + ".hint", daten.i18nParams); }
    d.titel("➕ " + (daten.label || typeName(daten.typ, schema)));
    hinweisEl.textContent = daten.hinweis || "";
    hinweisEl.hidden = !daten.hinweis;
    vorlageLink.href = link.href;
    ordnerEl.textContent = schema.ordner + "/";
    baueFelder();
    zeigeVorschau();
    status.textContent = entwurf ? t("form.draft_restored", null, "Entwurf wiederhergestellt.") : "";
    if (!d.open) d.showModal();
    var erstes = form.querySelector(".neu-links input:not([type=checkbox]), .neu-links textarea");
    if (erstes) erstes.focus();
    F.ladeIndex();
  }

  // link: an a[data-edit] from _includes/edit-buttons.html, data = { type, path, source }. → Promise
  function edit(link) {
    var data = JSON.parse(link.getAttribute("data-edit")), schema = TYPEN[data.type];
    if (!schema) return Promise.reject(new Error("type"));
    return fetch(data.source, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (source) {
      var loaded = readSource(schema, source, data.path);
      if (!loaded) throw new Error("no front matter");
      if (!d) baueDialog();
      var folder = data.path.split("/").slice(0, -1).join("/");
      aktiv = { typ: data.type, schema: schema, felder: alleFelder(schema), gesendet: false, photos: [], files: [], edit: loaded, path: data.path,
        url: data.url || (typeof location !== "undefined" ? location.pathname : ""), schluessel: "ifsmb-edit:" + data.path };
      aktiv.beruehrt = allTouched(); // nothing is derived while editing (file name, event_tag, end …)
      var draft = ladeEntwurf(), draftFits = draft && draft.source === source && !draft.pr;
      aktiv.w = draftFits ? Object.assign(JSON.parse(JSON.stringify(loaded.w0)), draft.w) : JSON.parse(JSON.stringify(loaded.w0));
      initCryptoState(aktiv, true);
      // a draft that no longer fits (the page changed since, or it belongs to an open PR) is never thrown away: it is
      // carried over onto the current state below (direct.restoreDraft), with a conflict box if both changed the same thing
      setMode(true);
      d.titel(t("form.edit_title", { type: typeName(data.type, schema) }, "✏️ " + schema.titel + " bearbeiten"));
      hinweisEl.textContent = t("form.edit_hint", { path: data.path }, "Änderungen an " + data.path + " – nur geänderte Zeilen werden neu geschrieben, alles andere bleibt wie es ist.");
      hinweisEl.hidden = false;
      vorlageLink.href = F.githubFile(data.path);
      ordnerEl.textContent = folder + "/";
      baueFelder();
      zeigeVorschau();
      if (aktiv.crypto && aktiv.crypto.wasEncrypted) {
        var stateForUnlock = aktiv;
        withCrypto().then(function (CP) {
          if (aktiv !== stateForUnlock) return;
          var savedPw = CP.getUnlockedPassword(stateForUnlock.w.uuid) || CP.getUnlockedPassword(stateForUnlock.url);
          if (savedPw) return unlockCryptoForEdit(stateForUnlock, savedPw, true);
        }).catch(function () {});
      }
      status.textContent = draftFits ? t("form.draft_restored", null, "Entwurf wiederhergestellt.") : "";
      if (!d.open) d.showModal();
      if (draft && !draftFits && draft.source) direct.restoreDraft(draft);
      if (!EDIT_HASH.test(location.hash)) history.replaceState(history.state, "", location.pathname + location.search + "#bearbeiten");
      F.ladeIndex();
      var hasToken = false;
      try { hasToken = !!(sessionStorage.getItem("ifsmb-github-token") || localStorage.getItem("ifsmb-github-token")); } catch (e) { /* storage blocked */ }
      if (hasToken && window.ladeSkripte) window.ladeSkripte(["github-api.js"]).then(function () { direct.update(); direct.checkOpenPulls(); }).catch(function () {});
      else direct.checkOpenPulls();
    });
  }

  // Headless helpers for automated tests (_scripts/test_crypto.js):
  // 1) Decrypt an encrypted source file for editing in the form → Promise<{ values, plaintext, payload }>
  function decryptFileForEdit(type, source, password, path) {
    var schema = TYPEN[type], editObj = readSource(schema, source, path);
    if (!editObj) return Promise.reject(new Error("Kein Front Matter"));
    var payload = parseEncryptedBlock(editObj.w0.text);
    if (!payload) return Promise.reject(new Error("Kein verschlüsselter Block in der Datei"));
    return withCrypto().then(function (CP) {
      return CP.decryptMarkdown(payload, password).then(function (plain) {
        var norm = String(plain || "").replace(/^\n+/, "").replace(/\s+$/, "");
        var values = Object.assign({}, editObj.w0, { text: norm });
        return { values: values, plaintext: norm, payload: payload };
      });
    });
  }
  // 2) Encrypt an existing (unencrypted or already encrypted) file with changes and a password → Promise<{ content, payload }>
  function encryptEditedFile(type, source, changes, password, path) {
    var schema = TYPEN[type], editObj = readSource(schema, source, path);
    if (!editObj) return Promise.reject(new Error("Kein Front Matter"));
    var existingPayload = parseEncryptedBlock(editObj.w0.text);
    var w = Object.assign(JSON.parse(JSON.stringify(editObj.w0)), changes || {}, { encrypted: true });
    var keepKdf = !!existingPayload;
    return withCrypto().then(function (CP) {
      return CP.encryptMarkdownPayload(w.text, password, existingPayload, keepKdf).then(function (res) {
        var wOut = Object.assign({}, w, { text: res.block });
        return { content: editedText(schema, editObj, wOut), payload: res.payload };
      });
    });
  }

  return { oeffnen: oeffnen, edit: edit, datei: datei, editedFile: editedFile, decryptFileForEdit: decryptFileForEdit,
    encryptEditedFile: encryptEditedFile, TYPEN: TYPEN, THEMES: THEMES, alleFelder: alleFelder, checkHtml: checkHtml,
    connect: function () { return direct.connectDialog(); } };
})();
if (typeof module !== "undefined") module.exports = NeuFormular;
