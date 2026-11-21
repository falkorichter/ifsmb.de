// Edit forms (NeuFormular.edit in assets/js/neu.js) against every real page, for _scripts/test_formulare.rb.
// Per file: unchanged (open + save without changes must give the same bytes), fields the form can't show
// (rawFields), and the file after changing the title, a list and the body – the test reads them as YAML.
"use strict";
const fs = require("fs");
const path = require("path");
const Neu = require(path.join(__dirname, "..", "assets", "js", "neu.js"));
const ROOT = path.join(__dirname, "..");
// collection folder → form type (same map as _includes/edit-buttons.html)
const FOLDERS = { _posts: "beitrag", _events: "termin", _projects: "projekt", _equipment: "geraet",
  _herausforderungen: "herausforderung", _team: "team", _press: "presse" };

// Plain pages with `layout: page` (or `default`, the start page) outside the collections – same rule as _plugins/source_files.rb (#154):
// Markdown → "seite", HTML → "uebersicht".
function plainPages(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()) return /^[_.]|^(node_modules|vendor|assets)$/.test(e.name) ? [] : plainPages(rel);
    const type = /\.(md|markdown)$/.test(e.name) ? "seite" : /\.html$/.test(e.name) ? "uebersicht" : null;
    if (!type) return [];
    const fm = fs.readFileSync(path.join(ROOT, rel), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return fm && /^layout:\s*(page|default)\s*$/m.test(fm[1]) && !/^edit_form:/m.test(fm[1]) ? [[rel, type]] : [];
  });
}

const files = [];
Object.keys(FOLDERS).forEach((folder) => {
  fs.readdirSync(path.join(ROOT, folder)).filter((f) => /\.(md|markdown|html)$/.test(f)).sort()
    .forEach((file) => files.push([folder + "/" + file, FOLDERS[folder]]));
});
plainPages("").sort().forEach((x) => files.push(x));

const results = [];
files.forEach(([filePath, type]) => {
  {
    const source = fs.readFileSync(path.join(ROOT, filePath), "utf8");
    const unchanged = Neu.editedFile(type, source, {}, filePath);
    if (!unchanged) { results.push({ path: filePath, type, no_front_matter: true }); return; }
    const fields = Neu.alleFelder(Neu.TYPEN[type]);
    const hasTitle = fields.some((f) => f.name === "title");
    const listField = fields.find((f) => f.typ === "chips" && !f.einzeln && unchanged.rawFields.indexOf(f.name) < 0);
    const changes = { text: "Neuer Text: mit Doppelpunkt\n\n- Punkt" };
    if (hasTitle && unchanged.rawFields.indexOf("title") < 0) changes.title = "Geänderter Titel: „mit“ #Raute";
    if (listField) changes[listField.name] = (unchanged.values[listField.name] || []).concat(["neu-eintrag"]);
    const changed = Neu.editedFile(type, source, changes, filePath);
    results.push({ path: filePath, type, unchanged: unchanged.content === source.replace(/\r\n/g, "\n"),
      raw_fields: unchanged.rawFields, changes, list_field: listField ? listField.name : null,
      changed: changed.content, original: source });
  }
});
process.stdout.write(JSON.stringify(results));
