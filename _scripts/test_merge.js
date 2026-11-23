// Tests for assets/js/merge.js (three-way merge of content files). Run: node _scripts/test_merge.js
"use strict";
const assert = require("node:assert/strict");
global.Formular = require("../assets/js/formular.js");
const FileMerge = require("../assets/js/merge.js");

const base = `---
title: "Herbstfest beim Zazza"
start: 2026-10-10 14:00
summary: Herbstfest mit Kastanienbasteln.
team: [falko-richter]
uuid: abc
---

Erster Absatz.

Zweiter Absatz.

Dritter Absatz.
`;
const set = (text, from, to) => { assert.ok(text.includes(from), "fixture contains " + from); return text.replace(from, to); };
let ok = 0;
function test(name, fn) { fn(); ok++; console.log("✓ " + name); }

test("nichts geändert → unverändert", () => {
  const r = FileMerge.merge(base, base, base);
  assert.equal(r.conflicts.length, 0); assert.equal(r.build(), base);
});
test("nur ich habe geändert → meine Version", () => {
  const mine = set(base, "Zweiter Absatz.", "Zweiter Absatz, länger.");
  const r = FileMerge.merge(base, mine, base);
  assert.equal(r.conflicts.length, 0); assert.equal(r.build(), mine);
});
test("nur die anderen haben geändert → ihre Version", () => {
  const theirs = set(base, "summary: Herbstfest mit Kastanienbasteln.", "summary: Herbstfest mit Waffeln.");
  const r = FileMerge.merge(base, base, theirs);
  assert.equal(r.conflicts.length, 0); assert.equal(r.build(), theirs);
});
test("verschiedene Felder → automatisch zusammengeführt", () => {
  const mine = set(base, "team: [falko-richter]", "team: [falko-richter, anton]");
  const theirs = set(base, 'title: "Herbstfest beim Zazza"', 'title: "Herbstfest im Zazza"');
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 0);
  const out = r.build();
  assert.ok(out.includes("team: [falko-richter, anton]") && out.includes('title: "Herbstfest im Zazza"'));
});
test("Feld und Text getrennt geändert → automatisch", () => {
  const mine = set(base, "Dritter Absatz.", "Dritter Absatz mit Fotos.");
  const theirs = set(base, "start: 2026-10-10 14:00", "start: 2026-10-10 15:00");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 0);
  assert.ok(r.build().includes("Dritter Absatz mit Fotos.") && r.build().includes("start: 2026-10-10 15:00"));
});
test("verschiedene Absätze im Text → automatisch", () => {
  const mine = set(base, "Erster Absatz.", "Erster Absatz (ich).");
  const theirs = set(base, "Dritter Absatz.", "Dritter Absatz (andere).");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 0);
  assert.ok(r.build().includes("Erster Absatz (ich).") && r.build().includes("Dritter Absatz (andere)."));
});
test("dasselbe Feld unterschiedlich → Konflikt mit Wahl", () => {
  const mine = set(base, "summary: Herbstfest mit Kastanienbasteln.", "summary: Mit Bratwurst.");
  const theirs = set(base, "summary: Herbstfest mit Kastanienbasteln.", "summary: Mit Waffeln.");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 1);
  const c = r.conflicts[0];
  assert.equal(c.where, "field"); assert.equal(c.key, "summary");
  assert.ok(r.build({ [c.id]: "mine" }).includes("summary: Mit Bratwurst."));
  assert.ok(r.build({ [c.id]: "theirs" }).includes("summary: Mit Waffeln."));
});
test("dieselbe Textstelle unterschiedlich → Konflikt, „Beide“ behält beide", () => {
  const mine = set(base, "Zweiter Absatz.", "Zweiter Absatz von mir.");
  const theirs = set(base, "Zweiter Absatz.", "Zweiter Absatz von den anderen.");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 1); assert.equal(r.conflicts[0].where, "text");
  const both = r.build({ [r.conflicts[0].id]: "both" });
  assert.ok(both.includes("Zweiter Absatz von mir.") && both.includes("Zweiter Absatz von den anderen."));
  assert.ok(both.includes("Erster Absatz.") && both.includes("Dritter Absatz."));
});
test("gleiche Änderung auf beiden Seiten → kein Konflikt", () => {
  const mine = set(base, "Dritter Absatz.", "Dritter Absatz!");
  const r = FileMerge.merge(base, mine, mine);
  assert.equal(r.conflicts.length, 0); assert.equal(r.build(), mine);
});
test("neues Feld bei mir, anderes Feld bei ihnen → beide drin, Reihenfolge stabil", () => {
  const mine = set(base, "team: [falko-richter]\n", "team: [falko-richter]\npartners: [\"Zazza\"]\n");
  const theirs = set(base, "summary: Herbstfest mit Kastanienbasteln.\n", "summary: Herbstfest mit Kastanienbasteln.\nlocation: Zazza\n");
  const out = FileMerge.merge(base, mine, theirs).build();
  assert.ok(/team: \[falko-richter\]\npartners: \["Zazza"\]/.test(out) && out.includes("location: Zazza"));
});
test("Feld bei ihnen gelöscht, bei mir unverändert → gelöscht", () => {
  const theirs = set(base, "summary: Herbstfest mit Kastanienbasteln.\n", "");
  const r = FileMerge.merge(base, base, theirs);
  assert.equal(r.conflicts.length, 0); assert.ok(!r.build().includes("summary:"));
});
test("Feld bei ihnen gelöscht, bei mir geändert → Konflikt", () => {
  const mine = set(base, "summary: Herbstfest mit Kastanienbasteln.", "summary: Neu.");
  const theirs = set(base, "summary: Herbstfest mit Kastanienbasteln.\n", "");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 1); assert.equal(r.conflicts[0].theirs, "");
  assert.ok(!r.build({ [r.conflicts[0].id]: "theirs" }).includes("summary:"));
});
test("Datei ohne Front Matter (YAML-Partner) → pro Feld", () => {
  const b = "name: Zazza\nurl: https://a.de/\ndescription: alt\n";
  const r = FileMerge.merge(b, b.replace("alt", "neu"), b.replace("https://a.de/", "https://b.de/"));
  assert.equal(r.conflicts.length, 0); assert.equal(r.build(), "name: Zazza\nurl: https://b.de/\ndescription: neu\n");
});
test("Listen: beide fügen Stichworte hinzu → Menge, kein Konflikt", () => {
  const b = set(base, "team: [falko-richter]", "team: [falko-richter]\ntags: [ktg, zazza]");
  const mine = set(b, "tags: [ktg, zazza]", "tags: [ktg, zazza, herbst]");
  const theirs = set(b, "tags: [ktg, zazza]", "tags: [ktg, 3d-drucker, zazza]");
  const r = FileMerge.merge(b, mine, theirs);
  assert.equal(r.conflicts.length, 0); assert.ok(r.build().includes("tags: [ktg, 3d-drucker, zazza, herbst]"));
});
test("Listen: ich entferne, andere fügen hinzu → beides", () => {
  const mine = set(base, "team: [falko-richter]", "team: []");
  const theirs = set(base, "team: [falko-richter]", "team: [falko-richter, anton]");
  const r = FileMerge.merge(base, mine, theirs);
  assert.equal(r.conflicts.length, 0); assert.ok(r.build().includes("team: [anton]"));
});
test("Listen: verschiedene Einträge hinzugefügt bzw. entfernt → beides", () => {
  const b = set(base, "team: [falko-richter]", "team: [falko-richter, anton]");
  const mine = set(b, "team: [falko-richter, anton]", "team: [falko-richter, anton, jan]");
  const theirs = set(b, "team: [falko-richter, anton]", "team: [falko-richter]");
  const r = FileMerge.merge(b, mine, theirs);
  assert.equal(r.conflicts.length, 0, "jan hinzu + anton weg überschneiden sich nicht");
  assert.ok(r.build().includes("team: [falko-richter, jan]"));
});
test("gleicher Wert, anders geschrieben (Anführungszeichen) → kein Konflikt, Schreibweise der anderen", () => {
  const b = set(base, 'title: "Herbstfest beim Zazza"', 'title: "Alter Titel"');
  const mine = set(base, 'title: "Herbstfest beim Zazza"', "title: Herbstfest beim Zazza");
  const r = FileMerge.merge(b, mine, base);
  assert.equal(r.conflicts.length, 0); assert.ok(r.build().includes('title: "Herbstfest beim Zazza"'));
});
test("alle echten Inhaltsdateien: mit sich selbst und mit einer fremden Änderung unverändert bzw. sauber", () => {
  const fs = require("node:fs"), path = require("node:path"), root = path.join(__dirname, "..");
  const dirs = ["_posts", "_events", "_projects", "_equipment", "_team", "_challenges", "_press", "_data/partner"];
  let n = 0;
  for (const d of dirs) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /\.(md|ya?ml)$/.test(x))) {
      const t = fs.readFileSync(path.join(dir, f), "utf8");
      assert.equal(FileMerge.merge(t, t, t).build(), t, d + "/" + f + " (selbst)");
      const theirs = t + "\nZeile von anderen.\n";
      const r = FileMerge.merge(t, t, theirs);
      assert.equal(r.conflicts.length, 0, d + "/" + f + " (Konflikt)"); assert.equal(r.build(), theirs, d + "/" + f + " (fremd)");
      n++;
    }
  }
  assert.ok(n > 100, "genug Dateien geprüft: " + n);
});
console.log(`\n${ok} Tests ok`);
