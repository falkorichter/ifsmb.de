// UI languages (assets/js/i18n.js): detection from the browser languages, the switch in the footer (stored in
// localStorage, survives a reload), ?lang=, the content staying German with lang="de", and the ➕ form chrome.
// French strings use a non-breaking space (\u00a0) before : ? ! (see _data/i18n/fr.yml).
"use strict";
const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv, findEditPages } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });
after(async () => { if (env) await env.close(); });
afterEach(async (t) => {
  if (t.passed === false || process.env.E2E_LOGS) for (const l of env.logs()) console.log("    " + l);
  await env.closePeople();
});

const POST = () => findEditPages().find((p) => p.type === "beitrag" && p.url.startsWith("/news/"));
// waits until i18n.js ran (the pending class is gone) → { lang, nav, h1, pressed, stored, mainLang }
async function state(person) {
  await person.page.waitFor(() => window.I18n && !document.documentElement.classList.contains("i18n-pending"));
  return person.page.evaluate(() => {
    let stored = null;
    try { stored = localStorage.getItem("ifsmb-language"); } catch (e) { /* blocked */ }
    const pressed = document.querySelector('[data-language][aria-pressed="true"]');
    return {
      lang: document.documentElement.lang,
      nav: document.querySelector('.site-nav [data-i18n="nav.news"]').textContent.trim(),
      h1: (document.querySelector("main h1") || {}).textContent,
      pressed: pressed && pressed.getAttribute("data-language"),
      stored,
      mainLang: document.querySelector("main").getAttribute("lang"),
      switchVisible: !document.querySelector("[data-language-switch]").hidden
    };
  });
}
// the same element as in the HTML the server sent (= what visitors without JavaScript see)
function serverText(person, selector) {
  return person.page.evaluate((sel) => fetch(location.href).then((r) => r.text()).then((html) => {
    const el = new DOMParser().parseFromString(html, "text/html").querySelector(sel);
    return el ? el.textContent : null;
  }), selector);
}

test("🌐 Browser auf Französisch → Bedienung französisch, Inhalte bleiben deutsch", async () => {
  const fr = await env.person(null, { language: null, locale: "fr-FR,fr" });
  await fr.open("/news/");
  const s = await state(fr);
  assert.equal(s.lang, "fr");
  assert.equal(s.nav, "Actualités");
  assert.equal(s.h1, "Actualités", "Übersichtsseite: Titel aus i18n_title");
  assert.equal(s.pressed, "fr");
  assert.equal(s.stored, null, "erkannte Sprache wird nicht gespeichert – nur eine eigene Wahl");
  assert.equal(s.mainLang, "de", "Inhaltsbereich bleibt lang=de");
  assert.ok(s.switchVisible);
  // the h1 is UI → its own lang inside the German content area
  assert.equal(await fr.page.evaluate(() => document.querySelector("main h1").lang), "fr");
  // post titles in the list stay German, dates are written the French way
  const list = await fr.page.evaluate(() => {
    const li = document.querySelector(".post-list-full li");
    return { title: li.querySelector("a").textContent, date: li.querySelector("time").textContent };
  });
  assert.equal(list.title, await serverText(fr, ".post-list-full li a"));
  assert.match(list.date, /^\d{1,2} [a-zéû]+\.? \d{4}$/, "Datum auf Französisch: " + list.date);

  const post = POST();
  await fr.open(post.url);
  await state(fr);
  assert.equal(await fr.page.evaluate(() => document.querySelector(".prose").textContent), await serverText(fr, ".prose"), "Beitragstext unverändert deutsch");
  assert.equal(await fr.page.evaluate(() => document.querySelector("main h1").textContent), await serverText(fr, "main h1"), "Beitragstitel bleibt deutsch");
  assert.equal(await fr.page.text(".back-link"), "← Toutes les actualités");
  assert.equal(await fr.page.evaluate(() => document.querySelector(".back-link").lang), "fr");
});

test("🌐 Browser in einer anderen Sprache (Spanisch) → Englisch", async () => {
  const es = await env.person(null, { language: null, locale: "es-ES,es" });
  await es.open("/");
  const s = await state(es);
  assert.equal(s.lang, "en");
  assert.equal(s.nav, "News");
  assert.equal(await es.page.text('[data-i18n="home.next_events"]'), "Upcoming events");
});

test("🌐 Browser auf Deutsch → bleibt Deutsch wie ohne JavaScript", async () => {
  const de = await env.person(null, { language: null, locale: "de-DE,de" });
  await de.open("/projects/");
  const s = await state(de);
  assert.equal(s.lang, "de");
  assert.equal(s.nav, "Neuigkeiten");
  assert.equal(s.mainLang, null, "kein extra lang auf main, wenn alles deutsch ist");
});

test("🌐 Umschalter DE/EN/FR: Wahl bleibt nach dem Neuladen, zurück auf Deutsch zeigt den Text der Seite", async () => {
  const p = await env.person(null); // stored choice: German
  await p.open("/projects/");
  const german = await p.page.evaluate(() => [...document.querySelectorAll("[data-i18n]")].map((e) => e.textContent));
  assert.equal((await state(p)).nav, "Neuigkeiten");

  await p.page.click('[data-language="en"]');
  let s = await state(p);
  assert.equal(s.lang, "en");
  assert.equal(s.nav, "News");
  assert.equal(s.pressed, "en");
  assert.equal(s.stored, "en");
  assert.equal(await p.page.text('.site-nav [data-i18n="nav.projects"]'), "Projects");

  await p.page.goto(env.siteUrl + "/projects/");
  s = await state(p);
  assert.equal(s.lang, "en", "nach dem Neuladen weiter Englisch");
  assert.equal(s.nav, "News");
  assert.equal(s.h1, "Projects");

  await p.page.click('[data-language="de"]');
  s = await state(p);
  assert.equal(s.lang, "de");
  assert.equal(s.stored, "de");
  assert.equal(s.mainLang, null);
  assert.deepEqual(await p.page.evaluate(() => [...document.querySelectorAll("[data-i18n]")].map((e) => e.textContent)), german,
    "alle übersetzten Stellen wieder genau wie im HTML");
});

test("🌐 ?lang=fr wählt Französisch und merkt es sich", async () => {
  const p = await env.person(null);
  await p.open("/calendar/?lang=fr");
  let s = await state(p);
  assert.equal(s.lang, "fr");
  assert.equal(s.stored, "fr");
  await p.page.goto(env.siteUrl + "/calendar/");
  s = await state(p);
  assert.equal(s.lang, "fr");
  assert.equal(await p.page.text('[data-i18n="calendar.upcoming"]'), "Prochains rendez-vous");
});

test("🌐 ➕-Formular: Titel, Hinweis und Knöpfe in der gewählten Sprache (auch aus der Eisenhower-Matrix)", async () => {
  const en = await env.person(null, { language: "en" });
  await en.openNew("/news/", "beitrag");
  assert.equal(await en.page.text("#neu-dialog h2"), "➕ Post");
  assert.equal(await en.page.text("#neu-dialog .neu-hinweis"), "New post with all fields");
  assert.equal(await en.page.text("#neu-dialog [data-submit]"), "📋 Create on GitHub");
  assert.equal(await en.page.text("#neu-dialog [data-github]"), "🔑 Connect GitHub");

  const fr = await env.person(null, { language: "fr" });
  await fr.open("/challenges/");
  await fr.page.evaluate(() => document.querySelector(".hm-q1 .neu-btn-klein").click());
  await fr.waitDialog();
  assert.equal(await fr.page.text("#neu-dialog h2"), "➕ Nouveau défi\u00a0: À faire tout de suite");
  assert.equal(await fr.page.evaluate(() => document.querySelector(".hm-q1 .neu-btn-klein").getAttribute("aria-label")), "Nouveau défi\u00a0: À faire tout de suite");
});
