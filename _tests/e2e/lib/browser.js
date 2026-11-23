// Tiny browser driver: the locally installed Chrome (headless) over the Chrome DevTools Protocol (CDP), using Node's
// built-in WebSocket (Node ≥ 22). No npm packages – see DEPENDENCIES.md ("Google Chrome", "Node.js").
//
//   const browser = await launchChrome();
//   const ctx = await browser.newContext();   // separate cookies/storage = another person
//   const page = await ctx.newPage();
//   await page.goto(url); await page.click("a[data-edit]"); await page.waitFor(() => document.querySelector("#neu-dialog[open]"));
"use strict";
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"
  ];
  const hit = candidates.find((c) => fs.existsSync(c));
  if (!hit) throw new Error("Chrome nicht gefunden – Pfad mit CHROME=/pfad/zu/chrome angeben.");
  return hit;
}

class Connection {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map(); // "sessionId|event" → [fn]
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString("utf8"));
      if (msg.id && this.pending.has(msg.id)) {
        const { ok, fail, method } = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (msg.error) fail(new Error(method + ": " + msg.error.message + (msg.error.data ? " (" + msg.error.data + ")" : "")));
        else ok(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get((msg.sessionId || "") + "|" + msg.method) || []) fn(msg.params);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((ok, fail) => {
      // never wait forever (e.g. a crashed renderer): a CDP call that gets no answer fails after 30 s
      const t = setTimeout(() => { if (this.pending.delete(id)) fail(new Error(method + ": keine Antwort von Chrome nach 30 s")); }, 30000);
      t.unref();
      this.pending.set(id, { ok: (r) => { clearTimeout(t); ok(r); }, fail: (e) => { clearTimeout(t); fail(e); }, method });
      this.ws.send(JSON.stringify(Object.assign({ id, method, params }, sessionId ? { sessionId } : {})));
    });
  }
  on(sessionId, event, fn) {
    const k = (sessionId || "") + "|" + event;
    if (!this.listeners.has(k)) this.listeners.set(k, []);
    this.listeners.get(k).push(fn);
    return () => { const l = this.listeners.get(k); l.splice(l.indexOf(fn), 1); };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a timer that does not keep the process alive (for timeouts that usually never fire)
const timeout = (ms, message) => new Promise((_, fail) => setTimeout(() => fail(new Error(message)), ms).unref());

class Page {
  constructor(conn, sessionId, targetId) {
    this.conn = conn; this.sessionId = sessionId; this.targetId = targetId;
    this.logs = []; // console messages and uncaught exceptions – printed when a test fails
    this.fileQueue = []; // files for the next file chooser(s)
    this.opened = [];
  }
  send(method, params) { return this.conn.send(method, params, this.sessionId); }
  on(event, fn) { return this.conn.on(this.sessionId, event, fn); }
  async init() {
    this.on("Runtime.consoleAPICalled", (p) => this.logs.push("console." + p.type + ": " + p.args.map((a) => a.value ?? a.description ?? "").join(" ")));
    this.on("Runtime.exceptionThrown", (p) => this.logs.push("exception: " + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
    this.on("Page.javascriptDialogOpening", (p) => { this.logs.push("dialog " + p.type + ": " + p.message); this.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {}); });
    // file inputs: the page's own <input type=file>.click() opens a chooser → we answer it with queued files
    this.on("Page.fileChooserOpened", (p) => {
      const files = this.fileQueue.shift();
      if (!files) { this.logs.push("file chooser opened, but no files queued"); return; }
      this.send("DOM.setFileInputFiles", { files, backendNodeId: p.backendNodeId }).catch((e) => this.logs.push("setFileInputFiles: " + e.message));
    });
    await Promise.all([this.send("Page.enable"), this.send("Runtime.enable"), this.send("DOM.enable")]);
    await this.send("Page.setInterceptFileChooserDialog", { enabled: true });
    await this.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    // window.open (copy flow, links with target=_blank via JS) must not open tabs: record the calls instead
    await this.addInitScript("window.__opened = []; window.open = function (u) { window.__opened.push(String(u)); return null; };");
  }
  addInitScript(source) { return this.send("Page.addScriptToEvaluateOnNewDocument", { source }); }
  // browser languages like a visitor from another country: navigator.languages and Accept-Language ("fr-FR,fr")
  async emulateLanguages(acceptLanguage) {
    const { userAgent } = await this.conn.send("Browser.getVersion");
    await this.send("Emulation.setUserAgentOverride", { userAgent, acceptLanguage });
    await this.send("Emulation.setLocaleOverride", { locale: acceptLanguage.split(",")[0] }).catch(() => {});
  }
  async goto(url, { timeout: ms = 15000 } = {}) {
    const loaded = new Promise((ok) => { const off = this.on("Page.loadEventFired", () => { off(); ok(); }); });
    const r = await this.send("Page.navigate", { url });
    if (r.errorText) throw new Error("Navigation zu " + url + ": " + r.errorText);
    await Promise.race([loaded, timeout(ms, "Timeout beim Laden von " + url)]);
  }
  // evaluate a function in the page: page.evaluate((a, b) => a + b, 1, 2). Promises are awaited, the result is
  // returned by value (JSON). userGesture: true so that clicks may open file choosers.
  async evaluate(fn, ...args) {
    const expression = typeof fn === "function" ? "(" + fn.toString() + ")(..." + JSON.stringify(args) + ")" : String(fn);
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error("Im Browser: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  // poll until fn(...args) returns something truthy → that value
  async waitFor(fn, args = [], { timeout = 10000, interval = 50, message } = {}) {
    const end = Date.now() + timeout;
    let last;
    for (;;) {
      try { last = await this.evaluate(fn, ...args); if (last) return last; } catch (e) { last = e.message; }
      if (Date.now() > end) throw new Error((message || "Timeout: " + fn.toString().slice(0, 160)) + " (zuletzt: " + JSON.stringify(last) + ")");
      await sleep(interval);
    }
  }
  waitForSelector(sel, opts) {
    return this.waitFor((s) => { const e = document.querySelector(s); return !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); }, [sel], Object.assign({ message: "Element nicht sichtbar: " + sel }, opts));
  }
  async click(sel) {
    await this.waitForSelector(sel);
    return this.evaluate((s) => { const e = document.querySelector(s); e.scrollIntoView({ block: "center" }); e.click(); return true; }, sel);
  }
  // set a value like typing: native setter (works with frameworks/editors) + input and change events
  async fill(sel, value) {
    await this.waitFor((s) => !!document.querySelector(s), [sel], { message: "Feld fehlt: " + sel });
    return this.evaluate((s, v) => {
      const e = document.querySelector(s);
      const proto = e.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : e.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      if (e.type === "checkbox") e.checked = !!v; else Object.getOwnPropertyDescriptor(proto, "value").set.call(e, v);
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, sel, value);
  }
  text(sel) { return this.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel); }
  // the next <input type=file>.click() gets these files (absolute paths)
  queueFiles(files) { this.fileQueue.push(files.map((f) => path.resolve(f))); }
  async screenshot(file) {
    const r = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    return file;
  }
}

class Context {
  constructor(browser, id) { this.browser = browser; this.id = id; this.pages = []; }
  async newPage() {
    const conn = this.browser.conn;
    const { targetId } = await conn.send("Target.createTarget", { url: "about:blank", browserContextId: this.id });
    const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
    const page = new Page(conn, sessionId, targetId);
    await page.init();
    this.pages.push(page);
    return page;
  }
  async close() { await this.browser.conn.send("Target.disposeBrowserContext", { browserContextId: this.id }).catch(() => {}); }
}

async function launchChrome({ headless = process.env.HEADLESS !== "0" } = {}) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "ifsmb-e2e-chrome-"));
  const args = [
    "--remote-debugging-port=0", "--user-data-dir=" + userDir, "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-extensions",
    "--disable-features=Translate,MediaRouter,OptimizationHints", "--password-store=basic", "--use-mock-keychain",
    "--window-size=1280,900", "about:blank"
  ];
  if (headless) args.unshift("--headless=new");
  if (process.env.CI || process.getuid?.() === 0) args.unshift("--no-sandbox"); // CI runners: no user namespaces for the sandbox
  if (process.platform === "linux") args.unshift("--disable-dev-shm-usage"); // small /dev/shm in containers crashes renderers
  const proc = spawn(findChrome(), args, { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((ok, fail) => {
    let buf = "";
    const t = setTimeout(() => fail(new Error("Chrome hat keinen DevTools-Port gemeldet:\n" + buf)), 20000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); ok(m[1]); }
    });
    proc.on("exit", (code) => { clearTimeout(t); fail(new Error("Chrome beendet (" + code + "):\n" + buf)); });
  });
  proc.stderr.resume();
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", fail, { once: true }); });
  const conn = new Connection(ws);
  const browser = {
    conn, proc,
    async newContext() {
      const { browserContextId } = await conn.send("Target.createBrowserContext", { disposeOnDetach: true });
      return new Context(browser, browserContextId);
    },
    async close() {
      try { await Promise.race([conn.send("Browser.close"), timeout(3000, "close")]); } catch (e) { /* already gone or hanging */ }
      try { ws.close(); } catch (e) { /* closed */ }
      // Browser.close answers before the process is gone – wait for the exit (Chrome still writes its profile), then kill
      const exited = () => proc.exitCode !== null || proc.signalCode !== null;
      if (!exited()) await Promise.race([new Promise((r) => proc.once("exit", r)), new Promise((r) => setTimeout(r, 5000).unref())]);
      if (!exited()) { proc.kill("SIGKILL"); await new Promise((r) => proc.once("exit", r)); }
      try { fs.rmSync(userDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* temp dir – not worth failing a test run */ }
    }
  };
  return browser;
}

module.exports = { launchChrome, findChrome, sleep };
