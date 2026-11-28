// #299: "🪞 Dieselbe Sache auf einer anderen Instanz" (same_as) in the ✏️ form of a device – takes absolute https
// addresses of other sites only (no http, no address of this site itself) and writes them as a list.
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv, editPage } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

const PEER = "https://35services.ifsmb.de/equipment/snapmaker-u1/";

// Types into the same_as field → the offered values
async function offered(person, text) {
  await person.page.evaluate(() => {
    const field = [...document.querySelectorAll("#neu-dialog .form-chips-feld")].find((f) => /Dieselbe Sache/.test(f.textContent));
    field.closest("details").open = true;
    field.querySelector("input").setAttribute("data-test-same-as", "");
  });
  const sel = "#neu-dialog [data-test-same-as]";
  await person.page.evaluate((s) => document.querySelector(s).focus(), sel);
  await person.page.fill(sel, text);
  return person.page.evaluate((s) => [...document.querySelector(s).closest(".form-ac").querySelectorAll("[role=option]")]
    .map((o) => o.getAttribute("data-wert")), sel);
}

test("✏️ Gerät: same_as nimmt nur https-Adressen anderer Websites und schreibt eine Liste", async () => {
  const page = editPage("geraet");
  env.seedSource([page.path]);
  const alice = await env.person("token-alice");
  await alice.openEdit(page.url);

  assert.deepEqual(await offered(alice, "http://35services.ifsmb.de/equipment/x/"), [], "http wird nicht angeboten");
  assert.deepEqual(await offered(alice, "https://ifsmb.de/equipment/x/"), [], "eigene Website wird nicht angeboten");
  assert.deepEqual(await offered(alice, "/equipment/x/"), [], "relative Adresse wird nicht angeboten");
  assert.deepEqual(await offered(alice, PEER), [PEER]);
  await alice.page.evaluate(() => document.querySelector("#neu-dialog [data-test-same-as]")
    .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));

  await alice.submit();
  await alice.waitStatus(/Pull Request #1.*angelegt/);
  const pr = env.control.state().pulls[0];
  const text = env.control.readFile({ ref: pr.head.ref, path: page.path }).text;
  assert.match(text, new RegExp("^same_as: \\[" + PEER.replace(/[./]/g, "\\$&") + "\\]$|^same_as:\\n  - " + PEER.replace(/[./]/g, "\\$&") + "$", "m"), text);
});
