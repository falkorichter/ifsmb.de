// Test helpers: start the fake GitHub + a static server for _site/ + Chrome, and drive the ➕/✏️ forms like a person.
//
//   const env = await startEnv();                 // once per test file (before)
//   env.reset();                                  // per test: empty repo, default users (token-alice, token-bob, token-carol)
//   env.seedSource(["_posts/2026-…md"]);          // copy files of this working tree onto main of the fake
//   const alice = await env.person("token-alice");
//   await alice.openEdit("/news/…/");  await alice.fill({ title: "Neu" });  await alice.submit();
//   await alice.waitStatus(/angelegt/);  env.fake.control.state().pulls …
//   await env.close();                            // after
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { createFakeGitHub } = require("./fake-github.js");
const { createStaticServer } = require("./static-server.js");
const { launchChrome } = require("./browser.js");

const ROOT = path.resolve(__dirname, "../../..");
const SITE = path.join(ROOT, "_site");
const TOKEN_KEY = "ifsmb-github-token", API_KEY = "ifsmb-github-api", LANGUAGE_KEY = "ifsmb-language";

function decodeEntities(s) { return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }

// All pages of the built site with a ✏️ form: [{ url, type, path }], sorted by path (deterministic).
let editPages = null;
function findEditPages() {
  if (editPages) return editPages;
  if (!fs.existsSync(SITE)) throw new Error("_site/ fehlt – erst `bundle exec jekyll build` ausführen.");
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!["assets", "source", "pagefind"].includes(e.name)) walk(p); continue; }
      if (e.name !== "index.html") continue;
      const m = fs.readFileSync(p, "utf8").match(/<a [^>]*data-edit="([^"]+)"/);
      if (!m) continue;
      const data = JSON.parse(decodeEntities(m[1]));
      out.push({ url: "/" + path.relative(SITE, path.dirname(p)).split(path.sep).join("/") + "/", type: data.type, path: data.path });
    }
  })(SITE);
  editPages = out.sort((a, b) => a.path.localeCompare(b.path));
  return editPages;
}
// first page of a type whose source file exists in the working tree (e.g. "beitrag" → a post)
function editPage(type, filter) {
  const hit = findEditPages().find((p) => p.type === type && fs.existsSync(path.join(ROOT, p.path)) && (!filter || filter(p)));
  if (!hit) throw new Error("Keine Seite vom Typ " + type + " mit ✏️ gefunden.");
  return hit;
}

// A small PNG (solid colour with a stripe) written to a temp file – test photos without binary fixtures in the repo.
function makePng(file, { width = 320, height = 240, rgb = [200, 80, 40] } = {}) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const o = y * (width * 3 + 1) + 1 + x * 3, stripe = Math.abs(x - y) < 8;
    raw[o] = stripe ? 255 : rgb[0]; raw[o + 1] = stripe ? 255 : rgb[1]; raw[o + 2] = stripe ? 255 : rgb[2];
  }
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  return file;
}
// width/height of a JPEG (SOF marker) – to check what the photo editor produced
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return null;
}

class Person {
  constructor(env, page, context, token) { this.env = env; this.page = page; this.context = context; this.token = token; }
  // open a page of the site (path like "/news/")
  async open(urlPath) {
    await this.page.goto(this.env.siteUrl + urlPath);
    if (this.token) await this.page.waitFor(() => !!window.ladeSkripte);
  }
  // ✏️ on the current or given page → the edit dialog is open and filled
  async openEdit(urlPath) {
    if (urlPath) await this.open(urlPath);
    // with a token, edit-buttons.html loads github-api.js on DOMContentLoaded; wait so the form knows it is connected
    if (this.token) await this.page.waitFor(() => !!window.GitHubApi);
    await this.page.click("a[data-edit]");
    await this.waitDialog();
  }
  // ➕ on the current or given page; typ selects the button (data-neu typ), default: the first one
  async openNew(urlPath, typ) {
    if (urlPath) await this.open(urlPath);
    const ok = await this.page.evaluate((t) => {
      const a = [...document.querySelectorAll("a[data-neu]")].find((x) => !t || JSON.parse(x.getAttribute("data-neu")).typ === t);
      if (!a) return false;
      a.scrollIntoView(); a.click(); return true;
    }, typ || null);
    if (!ok) throw new Error("Kein ➕-Button" + (typ ? " für " + typ : "") + " auf " + urlPath);
    await this.waitDialog();
  }
  async waitDialog() {
    await this.page.waitFor(() => { const d = document.querySelector("#neu-dialog"); return d && d.open && d.querySelector("[data-submit]").textContent; });
    // with a token: wait until the form switched to "pull request" mode (github-api.js loaded, direct.update())
    if (this.token) await this.page.waitFor(() => /🚀/.test(document.querySelector("#neu-dialog [data-submit]").textContent), [], { message: "Formular nicht im Pull-Request-Modus" });
  }
  // fields by name: { title: "…", text: "…" }; the Markdown text may be an OverType editor (its textarea has the name)
  async fill(values) {
    for (const [name, v] of Object.entries(values)) await this.page.fill('#neu-dialog [name="' + name + '"]', v);
  }
  value(name) { return this.page.evaluate((n) => { const e = document.querySelector('#neu-dialog [name="' + n + '"]'); return e ? e.value : null; }, name); }
  preview() { return this.page.text("#neu-dialog .neu-vorschau"); }
  // 📷 → file chooser → photo editor: alt text + ✅ (files: absolute paths; one editor round per file)
  async addPhotos(files, alts) {
    this.page.queueFiles(files);
    await this.page.click("#neu-dialog [data-photos]");
    for (let n = 0; n < files.length; n++) await this.acceptPhoto(alts && alts[n] != null ? alts[n] : "Testfoto " + (n + 1));
  }
  // the photo editor is open: type the alt text (unless a fixed size crop without alt text) and click ✅
  async acceptPhoto(alt) {
    await this.page.waitFor(() => { const d = document.querySelector("#photo-editor"); return d && d.open && !document.querySelector("#photo-editor [data-status]").textContent.startsWith("Speichern"); });
    if (alt != null) await this.page.fill("#photo-editor textarea", alt);
    await this.page.click("#photo-editor [data-ok]");
    await this.page.waitFor(() => !document.querySelector("#photo-editor").open, [], { message: "Foto-Editor schließt nicht" });
  }
  // photo card n: toggle a use ("gallery", "social", "image", …)
  async toggleUse(n, slot) {
    await this.page.click('#neu-dialog [data-photo="' + n + '"] [data-toggle="' + slot + '"]');
  }
  async submit() { await this.page.click("#neu-dialog [data-submit]"); }
  status() { return this.page.text("#neu-dialog [data-status]"); }
  // wait until the status line matches (string or RegExp) → the text
  waitStatus(re, opts) {
    const src = re instanceof RegExp ? re.source : re.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags = re instanceof RegExp ? re.flags : "";
    return this.page.waitFor((s, f) => { const t = document.querySelector("#neu-dialog [data-status]").textContent; return new RegExp(s, f).test(t) && t; }, [src, flags],
      Object.assign({ message: "Status passt nicht zu " + re }, opts));
  }
  // the "⚠️ Diese Seite wird gerade schon geändert" box in the form → its text, or null
  notice() { return this.page.text("#neu-dialog .form-pr-notice"); }
  async close() { await this.context.close(); }
}

async function startEnv({ site = SITE } = {}) {
  if (!fs.existsSync(path.join(site, "index.html"))) throw new Error(site + " fehlt – erst `bundle exec jekyll build` ausführen.");
  const fake = createFakeGitHub();
  const apiUrl = await fake.listen(0);
  const staticServer = createStaticServer(site);
  const siteUrl = await staticServer.listen(0);
  const browser = await launchChrome();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ifsmb-e2e-"));
  const people = [];
  const env = {
    fake, apiUrl, siteUrl, browser, tmp, root: ROOT,
    control: fake.control,
    reset() { fake.control.reset(); },
    // files of this working tree onto main (paths relative to the repository root)
    seedSource(paths) { return fake.control.seed({ fromDir: { root: ROOT, paths } }); },
    // a person in their own browser context (own storage); token = null → not connected.
    // language: the UI language stored as this person's choice (assets/js/i18n.js) – German by default, because the
    // tests check German texts and headless Chrome may report another language; null = no choice (detection).
    // locale: browser languages to emulate (navigator.languages), e.g. "fr-FR,fr"
    async person(token, { remember = false, language = "de", locale = null } = {}) {
      const context = await browser.newContext();
      const page = await context.newPage();
      if (locale) await page.emulateLanguages(locale);
      // storage lives per origin: set token and API override on an empty page of the site first
      await page.goto(siteUrl + "/__blank");
      await page.evaluate((k, v, ak, av, rem, lk, lv) => {
        localStorage.setItem(ak, av);
        if (v) (rem ? localStorage : sessionStorage).setItem(k, v);
        if (lv) localStorage.setItem(lk, lv);
      }, TOKEN_KEY, token, API_KEY, apiUrl, remember, LANGUAGE_KEY, language);
      const p = new Person(env, page, context, token);
      people.push(p);
      return p;
    },
    // console output of all pages so far (for failing tests)
    logs() { return people.flatMap((p, i) => p.page.logs.map((l) => "[" + (p.token || "ohne Token") + "] " + l)); },
    async closePeople() { while (people.length) await people.pop().close(); },
    makePng(name, o) { return makePng(path.join(tmp, name), o); },
    async close() {
      // always stop the servers, even if Chrome fails to close – otherwise the test process never ends
      try { await env.closePeople().catch(() => {}); await browser.close(); }
      finally {
        await staticServer.close();
        await fake.close();
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  };
  return env;
}

module.exports = { startEnv, findEditPages, editPage, makePng, jpegSize, ROOT, SITE };
