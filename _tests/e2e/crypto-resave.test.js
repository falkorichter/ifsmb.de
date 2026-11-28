// Encrypted page: after the first save, a change must go into the same pull request – not end in "already saved"
// because the encrypted block (recomputed asynchronously, PBKDF2 with 600 000 iterations) is still the old one (#298).
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

test("🔒 verschlüsseltes Projekt: gespeichert, Text geändert, sofort nochmal speichern → Commit im selben PR", async () => {
  const alice = await env.person("token-alice");
  await alice.openNew("/projects/", "projekt");
  await alice.fill({ title: "E2E Geheimes Projekt", text: "Erste Fassung.\n", encrypted: true });
  await alice.page.waitForSelector("#neu-dialog [data-crypto-pw]");
  await alice.page.fill("#neu-dialog [data-crypto-pw]", "pidgeonhole");
  await alice.addPhotos([env.makePng("a.png")], ["Foto eins"]);
  await alice.page.waitForSelector('#neu-dialog [data-photo="0"]');
  await alice.toggleUse(0, "gallery");
  await alice.page.waitFor(() => /01\.jpg\.blob/.test(document.querySelector("#neu-dialog .neu-vorschau").textContent));
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 30000 });

  // change the text and save as soon as the button is active again (the new text is encrypted in the background)
  await alice.fill({ text: "Zweite Fassung mit mehr Notizen.\n\n![Foto eins](" + (await alice.page.evaluate(() => (document.querySelector('#neu-dialog [name="text"]').value.match(/\(([^)]+01\.jpg)\)/) || [])[1])) + ")\n{: .gallery}\n" });
  await alice.page.waitFor(() => !document.querySelector("#neu-dialog [data-submit]").disabled, [], { timeout: 20000, message: "Speichern-Knopf bleibt aus" });
  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*ergänzt|schon in/, { timeout: 30000 }).catch(async (e) => { e.message += " – Status: " + await alice.status() + " – Knopf: " + await alice.page.text("#neu-dialog [data-submit]"); throw e; });
  assert.doesNotMatch(await alice.status(), /schon in/, "Änderung wurde nicht gesendet");
  const st = env.control.state();
  assert.equal(st.pulls.length, 1);
  assert.equal(st.pulls[0].commits, 2);
});

// Encryption switched off: the page becomes plain Markdown AND its .blob attachments become normal files again
// (NN.jpg + NN-600w.jpg), the .blob files are deleted (#298: the blobs stayed, the images were broken).
test("🔓 Verschlüsselung ausschalten → Klartext, Fotos wieder als NN.jpg + NN-600w.jpg, .blob-Dateien gelöscht", async () => {
  const fs = require("node:fs"), path = require("node:path");
  const { editPage, ROOT } = require("./lib/helpers.js");
  const CP = require("../../assets/js/crypto-page.js");
  const page = editPage("projekt", (p) => !/^encrypted: true$/m.test(fs.readFileSync(path.join(ROOT, p.path), "utf8")));
  const slug = page.path.replace(/^_projects\/|\.md$/g, "");
  const dir = "assets/images/projekte/" + slug + "/";
  const photo = fs.readFileSync(env.makePng("geheim.png", { width: 900, height: 600 }));
  const body = "Geheimer Text.\n\n![Foto eins](/" + dir + "01.jpg)\n{: .gallery}\n";
  const res = await CP.encryptPage(body, "pidgeonhole", [{ name: "/" + dir + "01.jpg", data: photo, mime: "image/jpeg" }]);
  const original = fs.readFileSync(path.join(ROOT, page.path), "utf8");
  const fm = original.match(/^---\n([\s\S]*?)\n---\n/)[1].split("\n").filter((l) => !/^(encrypted|search):/.test(l)).join("\n");
  const seeded = "---\n" + fm + "\nencrypted: true\nsearch: false\n---\n\n" + CP.formatEncryptedBody(res.payload) + "\n";
  const blob = res.blobs[0];
  env.control.seed({ files: { [page.path]: seeded, [blob.filename.slice(1)]: { base64: Buffer.from(blob.data).toString("base64") } } });
  const sitePath = path.join(ROOT, "_site/source", page.path), before = fs.readFileSync(sitePath, "utf8");
  fs.writeFileSync(sitePath, seeded);
  try {
    const alice = await env.person("token-alice");
    await alice.openEdit(page.url);
    await alice.page.waitForSelector("#neu-dialog [data-crypto-unlock-pw]");
    await alice.page.fill("#neu-dialog [data-crypto-unlock-pw]", "pidgeonhole");
    await alice.page.click("#neu-dialog [data-crypto-unlock-btn]");
    await alice.page.waitFor(() => /Geheimer Text/.test(document.querySelector('#neu-dialog [name="text"]').value));
    await alice.page.evaluate(() => { const c = document.querySelector('#neu-dialog [name="encrypted"]'); if (c.checked) c.click(); });
    await alice.page.waitFor(() => /Geheimer Text/.test(document.querySelector("#neu-dialog .neu-vorschau").textContent), [], { message: "Vorschau zeigt keinen Klartext" });
    await alice.submit();
    await alice.waitStatus(/Pull Request #1.*angelegt/, { timeout: 30000 });
    const pr = env.control.state().pulls[0];
    const got = pr.files.map((f) => [f.filename, f.status]).sort();
    assert.deepEqual(got, [[dir + "01-600w.jpg", "added"], [dir + "01.jpg", "added"], [dir + "01.jpg.blob", "removed"], [page.path, "modified"]].sort());
    const md = env.control.readFile({ ref: pr.head.ref, path: page.path }).text;
    assert.match(md, /Geheimer Text\./);
    assert.doesNotMatch(md, /encrypted-data|^encrypted: true$/m);
    assert.ok(Buffer.from(env.control.readFile({ ref: pr.head.ref, path: dir + "01.jpg" }).base64, "base64").equals(photo), "Foto unverändert entschlüsselt");
  } finally {
    fs.writeFileSync(sitePath, before);
  }
});
