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
