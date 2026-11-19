// "➕ new" forms: one pop-up per resource type, built from the schemas in TYPEN with the building blocks of
// assets/js/formular.js (chip fields with autocomplete, dialog, YAML). Loaded on the first click on a ➕ link
// (_includes/neu-buttons.html). Each link carries data-neu = { typ, label, hinweis, werte } – werte is the connection
// to the current page (author, team, tags, projekte …). Without JS the link opens GitHub with the full template.
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

  // fields that many types share
  var stichworte = function (x) { return chips("tags", "🏷️ Stichworte", "stichworte", Object.assign({ platzhalter: "Stichwort suchen oder neu …" }, x)); };
  var verlinkt = function () { return chips("verlinkt", "🔗 Verknüpft (Termine, Beiträge, Geräte, Seiten …)", "seiten", { platzhalter: "Seite suchen oder /adresse/ …" }); };
  var leute = function (name, label, x) { return chips(name, label, "personen", Object.assign({ platzhalter: "Name aus dem Team …" }, x)); };
  var partner = function (name, label, x) { return chips(name, label, "partner", Object.assign({ platzhalter: "Partner suchen …" }, x)); };
  var projekte = function (name, label, x) { return chips(name, label, "projekte", Object.assign({ platzhalter: "Projekt suchen …" }, x)); };
  var persoenlich = function (hilfe) { return haken("persoenlich", "Persönlich", { hilfe: hilfe }); };
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
  // one value as a plain scalar, several as a list (author, standort_partner – single-value fields in .pages.yml)
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
        text("zeitraum", "Zeitraum", { platzhalter: "z. B. Herbst 2026", folgt: function (w) { return w.status === "abgeschlossen" || !w.start ? "" : "seit " + w.start.slice(0, 4); } })],
      [text("ort", "Ort", { platzhalter: "z. B. Kurt-Tucholsky-Grundschule, Moabit – keine Wohnadressen" }),
        text("event_tag", "Eigenes Stichwort (event_tag)", { folgt: function (w) { return F.slugify(w.title); }, hilfe: "Beiträge und Termine mit diesem Stichwort erscheinen auf der Projektseite – nie ein allgemeines wie 35services" })],
      leute("team", "👥 Beteiligte"),
      partner("partners", "🤝 Partner"),
      projekte("teil_von", "🧩 Teil von", { hilfe: "Nur für Teilprojekte – erscheinen dann nicht in den Übersichten" }),
      projekte("verwandt", "↔️ Verwandte Projekte", { mehr: true }),
      verlinkt(),
      persoenlich("Privates Projekt aus dem Team: nur im Teamprofil, nicht in den Listen des Instituts"),
      inhalt("Ziel, Stand, was gebraucht wird …"),
      text("image", "Titelbild", { mehr: true, platzhalter: "/assets/images/projekte/<name>/01.jpg – ohne Metadaten" }),
      socialBild()
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
        inhalt("Text in Markdown. Fotos als Galerie: ![Was zu sehen ist](/assets/images/news/<dateiname>/01.jpg) und darunter {: .gallery}"),
        adresse("original_url", "Original-Adresse", { mehr: true, hilfe: "nur bei übernommenen Beiträgen" }),
        text("original_site", "Original-Website", { mehr: true, platzhalter: "z. B. 35services.de" }),
        socialBild()
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
        projekte("projekte", "🔧 Projekte"),
        stichworte(),
        partner("partners", "🤝 Partner"),
        verlinkt(),
        [persoenlich("Privater Termin aus dem Team (braucht „Dabei“): nur im Teamprofil"),
          haken("nur_projekt", "Nur auf der Projektseite", { hilfe: "interner Termin: vorher nicht im Kalender, danach normal" })],
        inhalt("Was passiert, wer kann kommen, was mitbringen …"),
        text("date_label", "Text statt Datum", { mehr: true, platzhalter: "z. B. „Januar 2027 – genauer Termin folgt“" }),
        socialBild()
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
        [text("kategorie", "Kategorie", { liste: "kategorien", platzhalter: "z. B. 3D-Drucker" }),
          auswahl("status", "Status", [["", "Im Einsatz"], ["in-aussicht", "🔭 In Aussicht"], ["im-test", "🧪 Im Test"], ["in-reparatur", "🔧 In Reparatur"]])],
        text("summary", "Kurzbeschreibung", { platzhalter: "Was das Gerät kann und wofür wir es nutzen" }),
        leute("owner_team", "🔑 Gehört (Team)"),
        partner("owner_partner", "🔑 Gehört (Partner)"),
        text("owner_name", "🔑 Gehört (andere)", { platzhalter: "freier Name", ausgabe: alsEintrag }),
        [text("standort", "Standort", { platzhalter: "z. B. KTG, Raum 101" }),
          partner("standort_partner", "📍 Steht bei Partner", { einzeln: true, ausgabe: einerOderListe })],
        stichworte({ hilfe: "Gerät, Gerätetyp, Besitzer*in, z. B. bambu-lab-a1-mini, 3d-drucker" }),
        verlinkt(),
        inhalt("Was das Gerät kann, Erfahrungen, Tipps …"),
        text("image", "Foto", { mehr: true, platzhalter: "eigenes Foto ohne Metadaten – keine Hersteller- oder Shopfotos" }),
        text("image_alt", "Beschreibung des Fotos", { mehr: true }),
        haken("image_is_illustration", "Foto ist eine eigene SVG-Illustration", { mehr: true }),
        socialBild()
      ],
      pruefe: function (w) {
        if (!(w.owner_team || []).length && !(w.owner_partner || []).length && !w.owner_name) return "Wem gehört das Gerät? Bitte mindestens eine Besitzer*in eintragen – das Institut besitzt selbst nichts.";
      }
    },
    herausforderung: {
      titel: "Herausforderung", ordner: "_herausforderungen",
      datei: function (w) { return F.slugify(w.title, "kurzer-name") + ".md"; },
      felder: [
        titel("Was ist die Herausforderung? (kurz, gern als Frage)"),
        text("summary", "Kurz (ein Satz für die Karte)"),
        [auswahl("art", "Art", [["frage", "❓ Frage"], ["aufgabe", "📋 Aufgabe"], ["problem", "⚠️ Problem"]]),
          auswahl("status", "Status", [["offen", "Offen"], ["in-arbeit", "In Arbeit"], ["geloest", "Gelöst"]]),
          datum("seit", "Seit", { standard: F.heute })],
        [haken("wichtig", "Wichtig", { hilfe: "allein 📌 einplanen, mit dringend 🔥 sofort" }),
          haken("dringend", "Dringend", { hilfe: "allein 🤝 abgeben, keins von beiden 💤 später" })],
        leute("team", "👥 Zuständig"),
        projekte("projekte", "🔧 Projekte"),
        stichworte(),
        verlinkt(),
        persoenlich("Aus einem privaten Projekt im Team"),
        inhalt("Was ist das Problem, was wurde schon probiert, was wird gebraucht?"),
        datum("geloest_am", "Gelöst am", { mehr: true }),
        feld("langtext", "loesung", "Lösung (Markdown)", { mehr: true, markdown: true, zeilen: 4 }),
        socialBild()
      ]
    },
    team: {
      titel: "Teamprofil", ordner: "_team",
      datei: function (w) { return F.slugify(w.title, "vorname-nachname") + ".md"; },
      felder: [
        text("title", "Name", { pflicht: true, platzhalter: "Vorname Nachname", klasse: "form-feld-titel", hilfe: "Der Dateiname wird das Team-Kürzel für team, author, owner_team" }),
        [text("role", "Rolle", { platzhalter: "z. B. hilft in der KTG-AG" }), zahl("order", "Reihenfolge", { standard: "50", hilfe: "kleiner = weiter vorne" })],
        verlinkt(),
        haken("nicht_im_team", "Nicht auf /team/ auflisten (nur eigene Seite zum Verlinken)"),
        inhalt("Was die Person macht und womit sie im Makespace hilft – keine Wohnadresse, keine privaten E-Mail-Adressen"),
        text("photo", "Foto", { mehr: true, platzhalter: "/assets/images/team/<kürzel>-480w.jpg – nur mit Erlaubnis" }),
        text("photo_credit", "Bildnachweis", { mehr: true, hilfe: "Pflicht bei Fremdfotos (Presse, Agentur)" }),
        socialBild()
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
        inhalt("**Berlin, Datum** – Erster Absatz mit dem Wichtigsten: wer, was, wann, wo, warum."),
        text("contact_name", "Pressekontakt", { mehr: true, hilfe: "leer = Pressekontakt aus _data/presse.yml" }),
        socialBild()
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
        text("page", "Eigene Partnerseite", { mehr: true, platzhalter: "/partner/<name>/", hilfe: "Nur unsere eigene Unterseite (partner/<name>/index.md) – die Website des Partners gehört oben in „Website“." })
      ]
    },
    pressebericht: {
      titel: "Wir in der Presse", ordner: "_data/pressebericht", format: "yaml",
      datei: function (w) { return (w.datum ? w.datum + "-" : "") + F.slugify(w.medium, "medium") + ".yml"; },
      felder: [
        text("titel", "Überschrift des Berichts", { pflicht: true, klasse: "form-feld-titel" }),
        [text("medium", "Medium", { pflicht: true, platzhalter: "Zeitung, Website oder Kanal" }), datum("datum", "Erschienen am", { standard: F.heute })],
        adresse("url", "Link zum Bericht", { pflicht: true, hilfe: "ohne Tracking-Parameter (?si=, utm_ …)" }),
        chips("anlass", "🔗 Anlass (eigene Seite)", "seiten", { einzeln: true, ausgabe: einerOderListe, platzhalter: "Termin oder Beitrag suchen …" }),
        text("hinweis", "Hinweis", { platzhalter: "erscheint in Klammern hinter dem Eintrag" })
      ]
    }
  };

  // ---------- state ----------
  var STORE = "ifsmb-neu:";
  var EDIT_HASH = /^#(bearbeiten|edit)$/; // <page>#bearbeiten opens the edit form directly (_includes/edit-buttons.html)
  var d = null, form, links, mehrBox, vorschau, socialBox, socialImg, socialTitel, socialBeschr, dateiInput, ordnerEl, status, hinweisEl, vorlageLink;
  var aktiv = null; // { typ, schema, w (values), beruehrt (edited by hand), schluessel, gesendet, felder, edit, path }
  var stepsEl, discardBtn, submitBtn, githubBtn, fotosBtn, fotosEl;

  function alleFelder(schema) {
    return schema.felder.reduce(function (a, z) { return a.concat(z); }, []).concat([{ name: "datei", intern: true, folgt: schema.datei }]);
  }
  // Values of a new form: field defaults, then the type's defaults, then the prefill from the page (vorgabe).
  function anfangswerte(schema, vorgabe) {
    var felder = alleFelder(schema), w = {};
    felder.forEach(function (f) {
      var s = typeof f.standard === "function" ? f.standard() : f.standard;
      w[f.name] = f.typ === "chips" ? alsListe(s) : f.typ === "haken" ? !!s : s == null ? "" : String(s);
    });
    Object.assign(w, schema.standard);
    Object.keys(vorgabe || {}).forEach(function (k) {
      var v = vorgabe[k], f = felder.filter(function (x) { return x.name === k; })[0];
      if (!f || v == null || v === "") return;
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
    try { localStorage.setItem(aktiv.schluessel, JSON.stringify({ w: aktiv.w, beruehrt: aktiv.beruehrt, source: aktiv.edit && aktiv.edit.source, pr: aktiv.prBase || null, savedAt: Date.now() })); } catch (e) { /* storage blocked */ }
  }
  function ladeEntwurf() {
    try { return JSON.parse(localStorage.getItem(aktiv.schluessel) || "null"); } catch (e) { return null; }
  }
  function loescheEntwurf() { try { localStorage.removeItem(aktiv.schluessel); } catch (e) { /* storage blocked */ } }

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
  function dateiInhalt() { return aktiv.edit ? editedText(aktiv.schema, aktiv.edit, aktiv.w) : dateiText(aktiv.schema, aktiv.w); }

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
  function readSource(schema, source, path) {
    var file = F.splitFile(source);
    if (!file) return null;
    var fields = alleFelder(schema), w = anfangswerte(schema), rawFields = {};
    fields.forEach(function (f) { if (f.typ) w[f.name] = f.typ === "chips" ? [] : f.typ === "haken" ? false : ""; });
    file.blocks.forEach(function (block) {
      if (block.key === "uuid") { w.uuid = F.yamlValue(block.raw); return; }
      var f = block.key && fields.filter(function (x) { return x.name === block.key && x.typ && !x.intern; })[0];
      if (!f) return;
      var v = F.yamlValue(block.raw), value = v === undefined ? undefined : toFieldValue(f, v);
      if (value === undefined) rawFields[f.name] = true; else w[f.name] = value;
    });
    w.text = file.rest.replace(/^\n+/, "").replace(/\s+$/, "");
    w.datei = path ? path.split("/").pop() : "";
    return { source: source, file: file, w0: JSON.parse(JSON.stringify(w)), rawFields: rawFields };
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
    var rest = w.text === edit.w0.text ? edit.file.rest : "\n" + (String(w.text).trim() ? "\n" + String(w.text).trim() + "\n" : "");
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
    d = F.dialog({ id: "neu-dialog", klasse: "neu-dialog", kopf: '<a class="neu-vorlage small" data-vorlage target="_blank" rel="noopener">Vorlage mit allen Feldern ↗</a>' });
    d.insertAdjacentHTML("beforeend",
      '<form class="neu-form" autocomplete="off">'
      + '<div class="neu-spalten"><div class="neu-links"><p class="neu-hinweis muted small"></p><div class="neu-felder"></div>'
      + '<details class="neu-mehr"><summary>Weitere Felder</summary><div class="neu-felder"></div></details></div>'
      + '<aside class="neu-rechts"><label class="form-feld"><span>Neue Datei</span><span class="neu-pfad"><code></code><input name="datei" type="text" required spellcheck="false"></span></label>'
      + '<pre class="neu-vorschau" aria-label="Vorschau der Datei"></pre>'
      + '<details class="neu-social" open><summary>Social-Media-Vorschau (WhatsApp, Signal, X …)</summary>'
      + '<div class="neu-social-karte"><img class="neu-social-bild" src="/assets/images/og-preview.jpg" alt="" loading="lazy">'
      + '<div class="neu-social-text"><span class="neu-social-domain">ifsmb.de</span><strong class="neu-social-titel"></strong><span class="neu-social-beschr"></span></div></div></details>'
      + '<div class="form-photos" aria-label="Neue Fotos"></div>'
      + '<ol class="neu-schritte small"></ol></aside></div>'
      + '<div class="form-fuss"><button type="button" class="btn btn-small btn-ghost" data-verwerfen></button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-github>🔑 GitHub verbinden</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-photos hidden>📷 Fotos hinzufügen</button>'
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
    githubBtn.addEventListener("click", function () { direct.connectDialog(); });
    fotosBtn.addEventListener("click", function () { direct.addPhotos(); });
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
    // Enter in a one-line field must not send the form
    form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "submit") e.preventDefault(); });
    form.addEventListener("submit", function (e) { e.preventDefault(); anlegen(); });
    discardBtn.addEventListener("click", function () {
      loescheEntwurf();
      direct.clearPhotos();
      if (aktiv.edit) { aktiv.w = JSON.parse(JSON.stringify(aktiv.edit.w0)); aktiv.beruehrt = allTouched(); }
      else { aktiv.w = anfangswerte(aktiv.schema, aktiv.vorgabe); aktiv.beruehrt = {}; }
      folge(); baueFelder(); zeigeVorschau();
      status.textContent = aktiv.edit ? "Änderungen verworfen." : "Neu angefangen.";
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
    var hosts = ["https://ifsmb.de"].concat(typeof location !== "undefined" && location.origin ? [location.origin] : []);
    return forms.concat.apply(forms, hosts.map(function (h) { return forms.map(function (x) { return h + x; }); }));
  }

  // in edit mode a required field only stays required if the file had a value (old posts without date: …)
  function isRequired(f) { return f.pflicht && !(aktiv.edit && F.leer(aktiv.edit.w0[f.name])); }
  function baueFeld(f) {
    if (aktiv.edit && aktiv.edit.rawFields[f.name]) {
      return F.el('<label class="form-feld"><span>' + esc(f.label) + '</span><input type="text" disabled value="(in der Datei als Liste/Objekt – bitte auf GitHub bearbeiten)"></label>');
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
    if (f.typ === "haken") {
      return F.el('<label class="form-check"><input type="checkbox" name="' + f.name + '"' + (w ? " checked" : "") + "><span>" + label + "</span>" + hilfe + "</label>");
    }
    var attr = ' name="' + f.name + '"' + (isRequired(f) ? " required" : "") + (f.platzhalter ? ' placeholder="' + esc(f.platzhalter) + '"' : "");
    var eingabe;
    if (f.typ === "auswahl") {
      eingabe = "<select" + attr + ">" + f.optionen.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === w ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    } else if (f.typ === "langtext") {
      eingabe = "<textarea" + attr + ' rows="' + (f.zeilen || 8) + '">' + esc(w) + "</textarea>";
    } else {
      var typ = { text: "text", adresse: "url", datum: "date", zeit: "datetime-local", zahl: "number" }[f.typ];
      eingabe = '<input type="' + typ + '"' + attr + (f.liste ? ' list="neu-liste-' + f.liste + '"' : "") + ' value="' + esc(w) + '">';
    }
    return F.el('<label class="form-feld' + (f.klasse ? " " + f.klasse : "") + '"><span>' + label + "</span>" + eingabe + hilfe + "</label>");
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
    var i = buttons.indexOf(T.italic);
    buttons.splice(i < 0 ? 2 : i + 1, 0, T.strikethrough, underline);
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
    folge(t);
    nachAenderung();
  }
  function nachAenderung() {
    folge();
    zeigeVorschau();
    speichereEntwurf();
    aktiv.gesendet = false;
    status.textContent = "";
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
      submitBtn.disabled = !count;
      submitBtn.title = count ? "" : "Noch nichts geändert";
    } else vorschau.textContent = text;
    if (!socialBox) return;
    var w = aktiv.w, istSeite = aktiv.schema.format !== "yaml";
    socialBox.hidden = !istSeite;
    if (!istSeite) return;
    var bild = w.social_media_preview_image || (!w.image_is_illustration && !/\.svg$/i.test(w.image || "") && w.image) || w.photo || erstesMarkdownBild(w.text) || "/assets/images/og-preview.jpg";
    bild = direct.previewFor(bild); // photos not uploaded yet: show the local preview
    if (socialImg.getAttribute("src") !== bild) socialImg.src = bild;
    socialTitel.textContent = w.title || aktiv.schema.titel;
    socialBeschr.textContent = (w.summary || w.subtitle || w.role || ersteTextzeile(w.text) || "Institut für spontane Makespace Buildung").slice(0, 160);
  }

  function fehlt() {
    var leer = aktiv.felder.filter(function (f) { return isRequired(f) && f.typ === "chips" && !aktiv.w[f.name].length; })[0];
    if (leer) return "Bitte „" + leer.label.replace(/^\W+\s*/, "") + "“ ausfüllen.";
    return aktiv.schema.pruefe && aktiv.schema.pruefe(aktiv.w);
  }
  function anlegen() {
    var fehler = fehlt();
    if (fehler) { status.textContent = "⚠️ " + fehler; return; }
    if (direct.active()) { direct.submit(); return; }
    if (aktiv.edit) {
      var newText = dateiInhalt();
      if (newText === aktiv.edit.source) { status.textContent = "Noch nichts geändert."; return; }
      F.kopierenUndOeffnen(newText, F.githubEdit(aktiv.path), status, function () { getSelection().selectAllChildren(vorschau); });
      setTimeout(function () { if (/^Kopiert/.test(status.textContent)) status.textContent = "Kopiert – im GitHub-Editor alles markieren (⌘A / Strg+A) und einfügen (⌘V / Strg+V)."; }, 50);
      aktiv.gesendet = true;
      return;
    }
    var s = aktiv.schema, inhaltText = dateiInhalt(), datei = aktiv.w.datei.trim();
    var url = F.githubNeu(s.ordner, datei, inhaltText), zuLang = url.length > 8000;
    if (zuLang) url = F.githubNeu(s.ordner, datei);
    F.kopierenUndOeffnen(inhaltText, url, status, function () { getSelection().selectAllChildren(vorschau); });
    if (zuLang) status.textContent = "Die Datei ist zu lang für die Adresse – sie ist kopiert, bitte im GitHub-Editor einfügen.";
    aktiv.gesendet = true;
  }


  // ---------- direct pull requests (prototype, assets/js/github-api.js + photo-editor.js) ----------
  // With a GitHub token the submit button creates the pull request itself: the file (new or only the changed lines,
  // like before) plus new photos in one commit on a new branch. Without a token everything stays as it was
  // (copy → GitHub's editor). Photos need the token, because they can't be pasted into GitHub's editor.
  var IMAGE_FOLDERS = { beitrag: "news", termin: "kalender", projekt: "projekte", "projekt-vergangen": "projekte", geraet: "ausstattung", team: "team", partner: "partner", presse: "presse", herausforderung: "herausforderungen" };
  var direct = {
    active: function () { return !!(window.GitHubApi && GitHubApi.connected()); },
    // which folder new photos go into: assets/images/<area>/<slug>/ – posts without the date in front, like today
    folder: function () {
      var area = IMAGE_FOLDERS[aktiv.typ] || "news", name = String(aktiv.w.datei || "").replace(/\.(md|ya?ml)$/, "");
      if (area === "news") name = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return "assets/images/" + area + "/" + (name || "neu") + "/";
    },
    // Error from GitHubApi (err.kind, see github-api.js): message in the status line, plus the matching next step
    showError: function (err) {
      status.textContent = (err.kind === "info" ? "ℹ️ " : "⚠️ ") + err.message + " ";
      if (err.kind === "auth") {
        var b = F.el('<button type="button" class="btn btn-small">🔑 Neu verbinden</button>');
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
            + (pr.sameRepo ? ' <button type="button" class="btn btn-small" data-pr-continue="' + i + '">In #' + pr.number + " mitschicken</button>" : " (aus einem Fork – dort weiterarbeiten)") + "</li>";
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
      if (!aktiv.schema.format && has("text")) s.push({ id: "gallery", label: "🖼️ Galerie im Text", hilfe: "mehrere Fotos, erscheinen als Galerie" });
      if (has("image")) s.push({ id: "image", label: aktiv.typ === "geraet" ? "📸 Foto des Geräts" : "📸 Titelbild", feld: "image", alt: has("image_alt") && "image_alt" });
      if (has("photo")) s.push({ id: "photo", label: "🙂 Profilfoto", feld: "photo" });
      if (has("logo")) s.push({ id: "logo", label: "🏷️ Logo / Bild auf der Partnerkarte", feld: "logo" });
      if (has("social_media_preview_image")) s.push({ id: "social", label: "📣 Social-Media-Vorschau", feld: "social_media_preview_image", social: true, hilfe: "wird auf 1200×630 zugeschnitten" });
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
      githubBtn.textContent = on ? "🔑 GitHub ✓" : "🔑 GitHub verbinden";
      if (on) GitHubApi.whoAmI().then(function (me) { if (direct.active()) githubBtn.textContent = "🔑 @" + me.login; }, function () {});
      githubBtn.title = on ? "Mit GitHub verbunden – Pull Requests direkt von hier" : "Mit einem GitHub-Token Pull Requests direkt von hier erstellen (mit Fotos)";
      fotosBtn.hidden = !direct.slots().length;
      if (on) {
        submitBtn.textContent = aktiv.prBase ? "🚀 In #" + aktiv.prBase.number + " speichern" : aktiv.edit ? "🚀 Änderung als Pull Request" : "🚀 Als Pull Request anlegen";
        stepsEl.innerHTML = "<li>„Als Pull Request“ legt einen neuen Branch mit "
          + (aktiv.edit ? "der geänderten Datei" : "der neuen Datei") + " und allen verwendeten Fotos an und öffnet einen Pull Request.</li>"
          + "<li>Jemand aus dem Team sieht ihn durch und mergt ihn – dann ist alles nach ein paar Minuten auf der Website.</li>";
      }
      direct.showPhotos();
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
      fotosEl.innerHTML = '<p class="media-title"><strong>📷 Fotos</strong> <span class="muted small">– antippen oder auf eine Verwendung ziehen</span></p>'
        + '<ul class="media-slots">' + slotHtml + '</ul><ul class="media-photos">' + cards + "</ul>";
    },
    clearPhotos: function () {
      (aktiv && aktiv.photos || []).forEach(function (p) { URL.revokeObjectURL(p.preview); if (p.social) URL.revokeObjectURL(p.social.preview); });
      if (aktiv) aktiv.photos = []; if (fotosEl) fotosEl.innerHTML = "";
    },
    removePhoto: function (i) {
      var p = aktiv.photos[i];
      direct.slots().forEach(function (sl) { if (direct.uses(p, sl)) direct.unassign(p, sl); });
      aktiv.photos.splice(i, 1);
      URL.revokeObjectURL(p.preview);
      direct.showPhotos();
    },
    // next free number NN in the folder: existing files on GitHub + photos added in this form
    nextNumber: function (folder) {
      var taken = (aktiv.photos || []).map(function (p) { return parseInt(p.name, 10); });
      return Promise.all([GitHubApi.listFolder(folder, aktiv.prBase && aktiv.prBase.branch), GitHubApi.namesInOpenPulls(folder)]).then(function (res) {
        res[0].concat(res[1]).forEach(function (n) { var m = n.match(/^(\d+)(-\w+)?\.(jpe?g|png|webp)$/i); if (m) taken.push(+m[1]); });
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
    submit: function () {
      var newText = dateiInhalt(), path, title, u;
      // sent already and nothing changed since → no second pull request with the same content
      if (aktiv.sent && aktiv.sent.text === newText) {
        status.innerHTML = 'Schon gesendet: <a href="' + esc(aktiv.sent.url) + '" target="_blank" rel="noopener">Pull Request #' + aktiv.sent.number + "</a>.";
        return;
      }
      if (aktiv.edit) {
        if (newText === aktiv.edit.source) { status.textContent = "Noch nichts geändert."; return; }
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
      function buildFiles() { // after relocating: the file itself + every used variant of every used photo
        files = [{ path: path, text: newText }];
        usage.forEach(function (u) {
          var base = direct.url(u.p).slice(1);
          if (u.plain) { files.push({ path: base, blob: u.p.full }); files.push({ path: base.replace(/\.jpg$/, "-600w.jpg"), blob: u.p.thumb }); }
          if (u.social && u.p.social) files.push({ path: base.replace(/\.jpg$/, "-social.jpg"), blob: u.p.social.full });
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
      GitHubApi.whoAmI().then(function (me) {
        u = me;
        // photos follow the file name: if it changed after adding them, move them – with free numbers in the new folder (K26)
        return direct.relocate(photos, folder).then(function (moved) {
          moved.forEach(function (m) { ["", "-600w", "-social"].forEach(function (v) { newText = newText.split(direct.url(m.from, v)).join(direct.url(m.to, v)); }); });
          return direct.checkMissingImages(state, newText, photos);
        });
      }).then(function () {
        buildFiles();
        if (!state.edit) return GitHubApi.readFile(path).then(function (cur) {
          if (cur != null) throw new Error("Die Datei " + path + " gibt es schon – bitte den Dateinamen ändern.");
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
        body = (state.edit ? "Änderung an `" + path + "`" : "Neue Datei `" + path + "`") + " – über das Formular auf ifsmb.de von @" + u.login
          + " ([Seite](" + location.origin + location.pathname + ")).\n\n"
          + (photos.length ? "**Fotos:** " + photos.length + " (im Browser vorbereitet: verkleinert auf max. 1600 px + 600w-Vorschau, ohne Metadaten/GPS)\n\n" : "")
          + "### Vor dem Mergen prüfen\n\n- [ ] Text: Makespace statt Makerspace, keine Wohnadressen, keine fremden E-Mail-Adressen\n"
          + (photos.length ? "- [ ] Fotos: keine erkennbaren Kindergesichter, Kennzeichen, Namen oder Zugangscodes\n" : "")
          + "- [ ] Checks („Prüfen“) sind grün\n";
        return GitHubApi.createPullRequest({ title: title, body: body, files: files, branchHint: path.split("/").pop(), onStep: step, pr: state.prBase, parent: parent });
      }).then(function (pr) {
        if (aktiv !== state) return;
        direct.sentOk(state, pr, newText, path);
      }).catch(function (err) {
        if (aktiv !== state) return;
        // the branch with the commit exists, but the pull request didn't come back: next click finishes it (K41/K42)
        if (err.pendingBranch) {
          state.pending = { branch: err.pendingBranch, title: title, body: body, text: newText };
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
      state.gesendet = true; state.retries = 0;
      state.sent = { text: text, url: pr.url, number: pr.number };
      direct.clearPhotos();
      var branch = pr.branch || (state.prBase && state.prBase.branch);
      state.prBase = { number: pr.number, url: pr.url, branch: branch };
      if (!state.edit) { state.path = path; dateiInput.readOnly = true; }
      state.edit = readSource(state.schema, text, path) || state.edit;
      state.w = JSON.parse(JSON.stringify(state.edit.w0)); state.beruehrt = allTouched();
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
          return dirs[d0].filter(function (x) { return names.indexOf(x.slice(d0.length + 1)) < 0; });
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
          + (pr.sameRepo ? ' <button type="button" class="btn btn-small" data-pr-continue="' + i + '">In #' + pr.number + " mitschicken</button>" : "") + "</li>";
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
    connectDialog: function (then) {
      window.ladeSkripte(["github-api.js"]).then(function () {
        var g = document.getElementById("github-connect");
        if (!g) {
          g = F.dialog({ id: "github-connect", klasse: "github-dialog", titel: "🔑 Mit GitHub verbinden" });
          g.insertAdjacentHTML("beforeend", '<div class="github-body">'
            + '<p>Mit einem GitHub-Token legen die Formulare <strong>Pull Requests direkt an</strong> – mit Fotos, ohne Kopieren. Gemergt wird wie immer erst nach Durchsicht.</p>'
            + '<ol class="small"><li><a data-token-link target="_blank" rel="noopener">Token auf GitHub erstellen ↗</a> – Name, Laufzeit (30 Tage) und die Berechtigungen <em>Contents</em> und <em>Pull requests</em> („Read and write“) sind schon ausgefüllt. Unter „Repository access“ bitte <strong>„Only select repositories“</strong> und <code>' + esc(GitHubApi.repo()) + '</code> wählen, dann „Generate token“.</li>'
            + "<li>Token hier einfügen. Er bleibt nur in diesem Browser und wird nur an api.github.com geschickt.</li></ol>"
            + '<label class="form-feld"><span>Token</span><input type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label>'
            + '<label class="form-check"><input type="checkbox" data-remember><span>Auf diesem Gerät merken</span><small class="form-hilfe">Sonst ist er weg, sobald der Tab zu ist. Auf fremden Geräten nicht anhaken.</small></label>'
            + '<p class="github-who small" aria-live="polite"></p>'
            + '<div class="form-fuss"><button type="button" class="btn btn-small btn-ghost" data-logout>Abmelden</button><span class="muted small"></span><button type="button" class="btn" data-connect>Verbinden</button></div></div>');
          g.querySelector("[data-token-link]").href = GitHubApi.tokenUrl();
        }
        var input = g.querySelector("input[type=password]"), who = g.querySelector(".github-who");
        function show() {
          if (!GitHubApi.connected()) { who.textContent = "Nicht verbunden."; return; }
          who.textContent = "Prüfe …";
          GitHubApi.whoAmI().then(function (me) {
            who.innerHTML = '<img src="' + esc(me.avatar) + '" alt="" width="24" height="24"> Verbunden als <strong>@' + esc(me.login) + "</strong>"
              + (me.canPush ? " – darf Pull Requests anlegen ✅" : " – hat <strong>keine Schreibrechte</strong> auf " + esc(GitHubApi.repo()) + " (Pull Requests aus Forks kommen später)");
          }, function (err) { who.textContent = "⚠️ " + err.message; });
        }
        g.querySelector("[data-connect]").onclick = function () {
          if (!input.value.trim()) { input.focus(); return; }
          GitHubApi.setToken(input.value, g.querySelector("[data-remember]").checked);
          input.value = "";
          show(); direct.update();
          GitHubApi.whoAmI().then(function (me) { if (me.canPush && then) { g.close(); then(); } }, function () {});
        };
        g.querySelector("[data-logout]").onclick = function () { GitHubApi.logout(); show(); direct.update(); setMode(!!(aktiv && aktiv.edit)); };
        show();
        g.showModal();
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

  // step lists shown in the dialog (German UI text)
  var STEPS_NEW = '<li>„Auf GitHub anlegen“ kopiert die Datei und öffnet GitHub mit dem fertigen Inhalt.</li>'
    + "<li>Dort „Commit changes …“ → <strong>„Create a new branch … and start a pull request“</strong>.</li>"
    + "<li>Nach dem Merge erscheint die Seite nach ein paar Minuten auf der Website.</li>";
  var STEPS_EDIT = "<li>„Auf GitHub speichern“ kopiert die geänderte Datei und öffnet sie im GitHub-Editor.</li>"
    + "<li>Dort den ganzen Inhalt markieren (⌘A / Strg+A) und einfügen (⌘V / Strg+V).</li>"
    + "<li>„Commit changes …“ → <strong>„Create a new branch … and start a pull request“</strong>.</li>"
    + "<li>Nach dem Merge ist die Änderung nach ein paar Minuten auf der Website.</li>";
  // switch the dialog between "new file" and "edit existing file"
  function setMode(editing) {
    d.querySelectorAll(".form-pr-notice, .form-conflicts").forEach(function (x) { x.remove(); });
    stepsEl.innerHTML = editing ? STEPS_EDIT : STEPS_NEW;
    discardBtn.textContent = editing ? "↩️ Änderungen verwerfen" : "🗑️ Neu anfangen";
    submitBtn.textContent = editing ? "📋 Auf GitHub speichern" : "📋 Auf GitHub anlegen";
    submitBtn.disabled = false; submitBtn.title = "";
    direct.update();
    dateiInput.readOnly = !!editing;
    d.querySelector(".neu-pfad").previousElementSibling.textContent = editing ? "Datei" : "Neue Datei";
    vorlageLink.textContent = editing ? "Auf GitHub ansehen ↗" : "Vorlage mit allen Feldern ↗";
  }
  function allTouched() { var touched = {}; aktiv.felder.forEach(function (f) { touched[f.name] = true; }); return touched; }

  // ---------- open ----------
  // link: an a[data-neu] from _includes/neu-button.html
  function oeffnen(link) {
    var daten = JSON.parse(link.getAttribute("data-neu"));
    var schema = TYPEN[daten.typ];
    if (!schema) { window.open(link.href, "_blank", "noopener"); return; }
    if (!d) baueDialog();
    aktiv = { typ: daten.typ, schema: schema, felder: alleFelder(schema), vorgabe: daten.werte, beruehrt: {}, gesendet: false, photos: [],
      schluessel: STORE + daten.typ + ":" + location.pathname };
    var entwurf = ladeEntwurf();
    aktiv.w = Object.assign(anfangswerte(schema, daten.werte), entwurf && entwurf.w);
    if (entwurf) aktiv.beruehrt = entwurf.beruehrt || {};
    folge();

    setMode(false);
    d.titel("➕ " + (daten.label || schema.titel));
    hinweisEl.textContent = daten.hinweis || "";
    hinweisEl.hidden = !daten.hinweis;
    vorlageLink.href = link.href;
    ordnerEl.textContent = schema.ordner + "/";
    baueFelder();
    zeigeVorschau();
    status.textContent = entwurf ? "Entwurf wiederhergestellt." : "";
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
      aktiv = { typ: data.type, schema: schema, felder: alleFelder(schema), gesendet: false, photos: [], edit: loaded, path: data.path,
        url: data.url || (typeof location !== "undefined" ? location.pathname : ""), schluessel: "ifsmb-edit:" + data.path };
      aktiv.beruehrt = allTouched(); // nothing is derived while editing (file name, event_tag, end …)
      var draft = ladeEntwurf(), draftFits = draft && draft.source === source && !draft.pr;
      aktiv.w = draftFits ? Object.assign(JSON.parse(JSON.stringify(loaded.w0)), draft.w) : JSON.parse(JSON.stringify(loaded.w0));
      // a draft that no longer fits (the page changed since, or it belongs to an open PR) is never thrown away: it is
      // carried over onto the current state below (direct.restoreDraft), with a conflict box if both changed the same thing
      setMode(true);
      d.titel("✏️ " + schema.titel + " bearbeiten");
      hinweisEl.textContent = "Änderungen an " + data.path + " – nur geänderte Zeilen werden neu geschrieben, alles andere bleibt wie es ist.";
      hinweisEl.hidden = false;
      vorlageLink.href = F.githubFile(data.path);
      ordnerEl.textContent = folder + "/";
      baueFelder();
      zeigeVorschau();
      status.textContent = draftFits ? "Entwurf wiederhergestellt." : "";
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

  return { oeffnen: oeffnen, edit: edit, datei: datei, editedFile: editedFile, TYPEN: TYPEN, alleFelder: alleFelder };
})();
if (typeof module !== "undefined") module.exports = NeuFormular;
