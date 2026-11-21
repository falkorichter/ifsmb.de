// /ausstattung/?owner=<key> / ?location=<key> (assets/js/equipment-filter.js) and the links from a partner page.
"use strict";
const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(() => env.close());
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

// visible cards: [href, data-owners, data-locations]
const visible = (p) => p.page.evaluate(() => [...document.querySelectorAll(".equipment-card")]
  .filter((c) => c.style.display !== "none").map((c) => [c.getAttribute("href"), c.dataset.owners, c.dataset.locations]));
const total = (p) => p.page.evaluate(() => document.querySelectorAll(".equipment-card").length);

test("Ausstattung ohne Filter: alle Geräte, Filterleiste mit Besitz und Standort", async () => {
  const p = await env.person(null);
  await p.open("/ausstattung/");
  await p.page.waitFor(() => !document.querySelector("[data-equipment-filter]").hidden);
  assert.equal((await visible(p)).length, await total(p));
  const bar = await p.page.text("[data-equipment-filter]");
  assert.match(bar, /Gehört:.*35 services e\. V\. \(\d+\)/s);
  assert.match(bar, /Steht bei:.*35 services e\. V\. \(\d+\)/s);
});

test("?owner=35services zeigt nur Geräte von 35services, „Alle zeigen“ hebt den Filter auf", async () => {
  const p = await env.person(null);
  await p.open("/ausstattung/?owner=35services");
  await p.page.waitFor(() => !!document.querySelector(".equipment-filter-status"));
  const shown = await visible(p);
  assert.ok(shown.length > 0 && shown.length < await total(p));
  assert.ok(shown.every(([, owners]) => owners.split(" ").includes("35services")), JSON.stringify(shown));
  assert.match(await p.page.text(".equipment-filter-status"), new RegExp("Geräte von 35 services e\\. V\\. – " + shown.length + " Geräte?"));
  // counts in the jump links follow the filter; empty groups are hidden
  const counts = await p.page.evaluate(() => [...document.querySelectorAll("[data-equipment-count]")].map((c) => Number(c.textContent)));
  assert.equal(counts.reduce((a, b) => a + b, 0), shown.length);
  await p.page.click(".equipment-filter-status a");
  await p.page.waitFor(() => !document.querySelector(".equipment-filter-status"));
  assert.equal((await visible(p)).length, await total(p));
});

test("?location=35services zeigt die Geräte, die bei 35services stehen", async () => {
  const p = await env.person(null);
  await p.open("/ausstattung/?location=35services");
  await p.page.waitFor(() => !!document.querySelector(".equipment-filter-status"));
  const shown = await visible(p);
  assert.ok(shown.length > 0);
  assert.ok(shown.every(([, , locations]) => locations.split(" ").includes("35services")), JSON.stringify(shown));
  assert.match(await p.page.text(".equipment-filter-status"), /Geräte bei 35 services e\. V\./);
});

test("Partnerseite 35services verlinkt die gefilterte Ausstattung, Zahl stimmt", async () => {
  const p = await env.person(null);
  await p.open("/partner/35services/");
  const links = await p.page.evaluate(() => [...document.querySelectorAll(".equipment-links a")].map((a) => [a.getAttribute("href"), a.nextSibling ? a.nextSibling.textContent : ""]));
  assert.deepEqual(links.map(([h]) => h), ["/ausstattung/?owner=35services", "/ausstattung/?location=35services"]);
  const owned = Number(/\((\d+)\)/.exec(links[0][1])[1]);
  await p.page.click(".equipment-links a");
  await p.page.waitFor(() => location.pathname === "/ausstattung/" && !!document.querySelector(".equipment-filter-status"));
  assert.equal((await visible(p)).length, owned);
});

test("Filter auf Französisch: Beschriftung übersetzt, Namen bleiben", async () => {
  const p = await env.person(null, { language: "fr" });
  await p.open("/ausstattung/?owner=35services");
  await p.page.waitFor(() => /Équipement de 35 services e\. V\./.test((document.querySelector(".equipment-filter-status") || {}).textContent || ""));
  assert.match(await p.page.text("[data-equipment-filter]"), /Appartient à :/);
});

test("Links neben der Überschrift „Ausstattung“: Partnerseite und Teamprofil", async () => {
  const p = await env.person(null);
  const headingLinks = () => p.page.evaluate(() => [...document.querySelectorAll(".heading-row .heading-links a")].map((a) => [a.getAttribute("href"), a.textContent]));
  await p.open("/partner/35services/");
  const partner = await headingLinks();
  assert.deepEqual(partner.map(([h]) => h), ["/ausstattung/?owner=35services", "/ausstattung/?location=35services"]);
  assert.match(partner[0][1], /^Eigene Geräte \(\d+\)$/);
  assert.match(partner[1][1], /^Geräte vor Ort \(\d+\)$/);
  await p.open("/team/falko-richter/");
  const member = await headingLinks();
  assert.deepEqual(member.map(([h]) => h), ["/ausstattung/?owner=falko-richter"]);
  const n = Number(/\((\d+)\)/.exec(member[0][1])[1]);
  await p.page.click(".heading-row .heading-links a");
  await p.page.waitFor(() => location.pathname === "/ausstattung/" && !!document.querySelector(".equipment-filter-status"));
  assert.equal((await visible(p)).length, n, "Zahl neben der Überschrift = gefilterte Geräte");
});
