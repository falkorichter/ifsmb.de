// #128: while editing a page, "🔗 Verknüpft" never offers the page itself – neither from the index nor as a typed
// address. A new page started from that page may still link to it.
"use strict";
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv, editPage } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
beforeEach(() => env.reset());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

// Types into the "Verknüpft" field and returns the offered values once the search index is loaded.
async function offered(person, query) {
  await person.page.evaluate(() => {
    const field = [...document.querySelectorAll("#neu-dialog .form-chips-feld")].find((f) => /Verknüpft/.test(f.textContent));
    field.querySelector("input").setAttribute("data-test-linked", "");
  });
  const sel = "#neu-dialog [data-test-linked]";
  await person.page.evaluate((s) => document.querySelector(s).focus(), sel);
  // "/" matches every page: once options show up, the index is loaded
  await person.page.fill(sel, "/");
  await person.page.waitFor((s) => document.querySelector(s).closest(".form-ac").querySelectorAll("[role=option]").length > 0, [sel]);
  await person.page.fill(sel, query);
  return person.page.evaluate((s) => [...document.querySelector(s).closest(".form-ac").querySelectorAll("[role=option]")]
    .map((o) => o.getAttribute("data-wert")), sel);
}

const variants = (url) => [url, url.replace(/\/$/, ""), "https://ifsmb.de" + url];

test("✏️ Bearbeiten: die eigene Seite steht nicht in den Vorschlägen für „Verknüpft“", async () => {
  const page = editPage("herausforderung");
  const alice = await env.person(null);
  await alice.openEdit(page.url);
  for (const query of [page.url, page.url.replace(/\/$/, ""), "https://ifsmb.de" + page.url]) {
    const values = await offered(alice, query);
    assert.ok(!values.some((v) => variants(page.url).includes(v)), `${query} → ${JSON.stringify(values)}`);
  }
  const title = await alice.value("title");
  const byTitle = await offered(alice, title);
  assert.ok(!byTitle.includes(page.url), `Titel „${title}“ → ${JSON.stringify(byTitle)}`);
});

test("➕ Neue Seite, angelegt auf dieser Seite, darf sie verknüpfen", async () => {
  const page = editPage("herausforderung");
  const alice = await env.person(null);
  // „Weitere Herausforderung“ starts with an empty „Verknüpft“ („Beitrag dazu“ already fills in this page)
  await alice.openNew(page.url, "herausforderung");
  assert.ok((await offered(alice, page.url)).includes(page.url));
});
