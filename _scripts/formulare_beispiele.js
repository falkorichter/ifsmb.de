// Prints sample files of every "➕ new" form (assets/js/neu.js) as JSON, for _scripts/test_formulare.rb.
// Per type: "minimal" (only required fields), "voll" (every field, one value per list), "mehrere" (two values per
// list, tricky text) and one case per option of every select field.
"use strict";
const path = require("path");
const Neu = require(path.join(__dirname, "..", "assets", "js", "neu.js"));
const Formular = require(path.join(__dirname, "..", "assets", "js", "formular.js"));

const KNIFFLIG = "Test: „Zitat“ #1 – \"quotes\" & 'apostroph'";
const BEISPIEL_CHIPS = {
  personen: ["falko-richter", "jan"],
  projekte: ["3d-druck-ag-ktg", "ktg-orca-slicer-hardware"],
  stichworte: ["ktg", "3d-drucker"],
  seiten: ["/projekte/3d-druck-ag-ktg/", "/kalender/"],
  partner: ["Kurt-Tucholsky-Grundschule", "35services e.V."]
};

function wert(f, fall) {
  const mehrere = fall === "mehrere";
  switch (f.typ) {
    case "chips": return BEISPIEL_CHIPS[f.quelle].slice(0, mehrere && !f.einzeln ? 2 : 1);
    case "haken": return true;
    case "auswahl": return f.optionen[f.optionen.length - 1][0];
    case "datum": return "2026-11-13";
    case "zeit": return "2026-11-13T16:30";
    case "zahl": return "42";
    case "adresse": return "https://example.org/pfad?x=1";
    case "langtext": return mehrere ? "Erste Zeile: mit Doppelpunkt\n\n- Punkt # mit Raute\n- true\n" : "Ein Absatz Text.";
    default:
      if (mehrere) return f.name === "title" || f.name === "titel" || f.name === "name" ? KNIFFLIG : "- beginnt mit Strich: und Doppelpunkt";
      return f.name === "title" || f.name === "titel" || f.name === "name" ? "Beispiel Titel" : "Beispiel";
  }
}

const proben = [];
Object.keys(Neu.TYPEN).forEach(function (typ) {
  const felder = Neu.alleFelder(Neu.TYPEN[typ]).filter((f) => f.typ);
  function probe(fall, werte) {
    const d = Neu.datei(typ, werte);
    proben.push({ typ, fall, ordner: d.ordner, datei: d.datei, format: d.format, inhalt: d.inhalt, werte: d.werte });
  }
  const minimal = {};
  felder.filter((f) => f.pflicht).forEach((f) => { minimal[f.name] = wert(f, "voll"); });
  probe("minimal", minimal);
  ["voll", "mehrere"].forEach(function (fall) {
    const w = {};
    felder.forEach((f) => { w[f.name] = wert(f, fall); });
    probe(fall, w);
  });
  felder.filter((f) => f.typ === "auswahl").forEach(function (f) {
    f.optionen.forEach(function (o) { probe("auswahl " + f.name + "=" + o[0], Object.assign({}, minimal, { [f.name]: o[0] })); });
  });
});

// Metadata the test needs besides the files: field definitions and the sources the chip fields use.
const typen = {};
Object.keys(Neu.TYPEN).forEach(function (typ) {
  typen[typ] = {
    ordner: Neu.TYPEN[typ].ordner,
    felder: Neu.alleFelder(Neu.TYPEN[typ]).filter((f) => f.typ && !f.intern).map((f) => ({ name: f.name, typ: f.typ, quelle: f.quelle || null, optionen: (f.optionen || []).map((o) => o[0]) }))
  };
});
process.stdout.write(JSON.stringify({ proben, typen, quellen: Object.keys(Formular.QUELLEN) }));
