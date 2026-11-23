// Minimal static file server for the built site (_site/) – no `jekyll serve` needed. No dependencies.
// Serves /dir/ → /dir/index.html, /dir → redirect to /dir/, unknown paths → 404.html with status 404.
// Also /__blank: an empty page on the site's origin (to set sessionStorage/localStorage before a test opens a page).
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".ics": "text/calendar; charset=utf-8",
  ".md": "text/markdown; charset=utf-8", ".yml": "text/yaml; charset=utf-8", ".yaml": "text/yaml; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".mp4": "video/mp4", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".obj": "text/plain; charset=utf-8", ".stl": "model/stl", ".3mf": "model/3mf"
};

function createStaticServer(root) {
  root = path.resolve(root);
  let server = null, url = null;
  function handle(req, res) {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/__blank") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end("<!doctype html><title>blank</title>"); return; }
    let rel;
    try { rel = decodeURIComponent(u.pathname); } catch (e) { res.writeHead(400); res.end(); return; }
    let file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    let st = fs.statSync(file, { throwIfNoEntry: false });
    if (st && st.isDirectory()) {
      if (!rel.endsWith("/")) { res.writeHead(301, { Location: u.pathname + "/" + u.search }); res.end(); return; }
      file = path.join(file, "index.html"); st = fs.statSync(file, { throwIfNoEntry: false });
    }
    if (!st && !path.extname(file)) { const html = file + ".html"; st = fs.statSync(html, { throwIfNoEntry: false }); if (st) file = html; }
    if (!st || !st.isFile()) {
      const nf = path.join(root, "404.html");
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  }
  return {
    get url() { return url; },
    listen(port = 0, host = "127.0.0.1") {
      server = http.createServer(handle);
      return new Promise((ok) => server.listen(port, host, () => { url = "http://" + host + ":" + server.address().port; ok(url); }));
    },
    close() { return new Promise((ok) => (server ? (server.closeAllConnections && server.closeAllConnections(), server.close(() => ok())) : ok())); }
  };
}

module.exports = { createStaticServer };
