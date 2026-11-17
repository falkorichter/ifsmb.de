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

const results = [];
Object.keys(FOLDERS).forEach((folder) => {
  const type = FOLDERS[folder];
  fs.readdirSync(path.join(ROOT, folder)).filter((f) => /\.(md|markdown|html)$/.test(f)).sort().forEach((file) => {
    const filePath = folder + "/" + file;
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
  });
});
process.stdout.write(JSON.stringify(results));
