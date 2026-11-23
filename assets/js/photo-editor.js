// Prepare a photo in the browser before it goes into a pull request (prototype).
//
// Does what we otherwise do by hand with Pillow (see CLAUDE.md "Bilder und Videos", "Privatsphäre bei Inhalten"):
// - turn the photo upright (EXIF orientation), rotate in 90° steps, crop
// - make areas unrecognisable: faces of children, licence plates, names, access codes – drawn by hand as rectangles,
//   pixelated so coarsely that nothing can be recovered; where the browser can, faces (FaceDetector) and QR codes
//   (BarcodeDetector) are suggested automatically – suggestions must always be checked by a person
// - save as JPEG in two sizes: NN.jpg (max. 1600 px) and NN-600w.jpg (max. 600 px). Re-encoding through a canvas
//   drops ALL metadata (EXIF, GPS, XMP) – nothing of the original file is copied.
// - a description (alt text) is required, like in _plugins/galerie.rb
//
// PhotoEditor.open(file) → Promise<null | { full: Blob, thumb: Blob, alt: string, preview: objectURL, width, height }>
// PhotoEditor.open(file, { size: [1200, 630], title }) → fixed format (social media preview): the crop keeps the aspect
//   ratio, the result is exactly that size, no alt text → Promise<null | { full: Blob, preview, width, height }>
var PhotoEditor = (function () {
  "use strict";
  var F = window.Formular, esc = F.esc;
  var FULL = 1600, THUMB = 600, QUALITY = 0.82;
  var d, canvas, ctx, statusEl, altEl, modeBtns, detectBtn, listEl, state, resolveFn;

  function build() {
    d = F.dialog({ id: "photo-editor", klasse: "photo-dialog", titel: "📷 Foto vorbereiten" });
    d.insertAdjacentHTML("beforeend",
      '<div class="photo-body"><div class="photo-main">'
      + '<div class="photo-tools" role="toolbar" aria-label="Werkzeuge">'
      + '<button type="button" class="btn btn-small btn-ghost" data-rotate>↻ Drehen</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-mode="crop" aria-pressed="false">✂️ Zuschneiden</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-mode="blur" aria-pressed="true">🔲 Unkenntlich machen</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-detect>🔍 Gesichter &amp; QR-Codes suchen</button>'
      + '<button type="button" class="btn btn-small btn-ghost" data-reset>↩️ Zurücksetzen</button></div>'
      + '<div class="photo-canvas"><canvas></canvas></div>'
      + '<p class="muted small photo-tip">Rechteck aufziehen: im Modus „Unkenntlich machen“ wird der Bereich verpixelt, ein Klick auf ein Rechteck entfernt es wieder. Im Modus „Zuschneiden“ legt das Rechteck den Ausschnitt fest.</p></div>'
      + '<aside class="photo-side">'
      + '<label class="form-feld"><span>Was ist zu sehen? (Alt-Text) <span class="form-pflicht" aria-hidden="true">*</span></span>'
      + '<textarea rows="4" required placeholder="z. B. Der Drucker steht aufgebaut auf dem Werkstatttisch, daneben eine Rolle grünes Filament"></textarea>'
      + '<small class="form-hilfe">Für Menschen, die das Bild nicht sehen können – und für die Suche.</small></label>'
      + '<div class="photo-check small"><strong>Vor dem Hochladen prüfen:</strong><ul>'
      + '<li>Gesichter von Kindern (auch Profile und Hinterköpfe)</li><li>Autokennzeichen</li>'
      + '<li>Namen, Zugangscodes, QR-Codes, Classroom-Links</li><li>Wohnadressen, Straßenschilder vor Wohnhäusern</li></ul>'
      + '<p class="muted">Standortdaten (GPS) und alle anderen Metadaten werden beim Speichern automatisch entfernt.</p></div>'
      + '<ul class="photo-areas small" aria-label="Unkenntlich gemachte Bereiche"></ul>'
      + '<div class="form-fuss"><span class="muted small" data-status aria-live="polite"></span>'
      + '<button type="button" class="btn btn-small btn-ghost" data-cancel>Abbrechen</button>'
      + '<button type="button" class="btn" data-ok>✅ Foto übernehmen</button></div>'
      + "</aside></div>");
    canvas = d.querySelector("canvas"); ctx = canvas.getContext("2d");
    statusEl = d.querySelector("[data-status]"); altEl = d.querySelector("textarea"); listEl = d.querySelector(".photo-areas");
    modeBtns = d.querySelectorAll("[data-mode]"); detectBtn = d.querySelector("[data-detect]");
    d.querySelector("[data-rotate]").addEventListener("click", function () { rotate(); });
    d.querySelector("[data-reset]").addEventListener("click", function () { state.crop = startCrop(); state.blurs = []; render(); });
    modeBtns.forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); }); });
    detectBtn.addEventListener("click", detect);
    d.querySelector("[data-cancel]").addEventListener("click", function () { d.close(); });
    d.querySelector("[data-ok]").addEventListener("click", accept);
    listEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-remove]"); if (!b) return;
      state.blurs.splice(+b.getAttribute("data-remove"), 1); render();
    });
    d.addEventListener("close", function () { if (resolveFn) { var r = resolveFn; resolveFn = null; r(null); } });
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", function () { state.drag = null; render(); });
  }

  // ---------- image ----------
  // <img> instead of createImageBitmap: browsers apply the EXIF orientation, Safari also opens HEIC.
  function loadImage(file) {
    return new Promise(function (ok, fail) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("Dieses Bildformat kann der Browser nicht öffnen (HEIC? → bitte als JPG exportieren).")); };
      img.src = url;
    });
  }
  // upright image rotated by state.rot × 90° as a canvas (cached)
  function base() {
    if (state.base && state.baseRot === state.rot) return state.base;
    var img = state.img, w = img.naturalWidth, h = img.naturalHeight, turn = state.rot % 2 === 1;
    var c = document.createElement("canvas"); c.width = turn ? h : w; c.height = turn ? w : h;
    var x = c.getContext("2d");
    x.translate(c.width / 2, c.height / 2); x.rotate(state.rot * Math.PI / 2); x.drawImage(img, -w / 2, -h / 2);
    state.base = c; state.baseRot = state.rot;
    return c;
  }
  // coarse mosaic: about 10 blocks across the longer side, never finer than 1/60 of the photo
  function pixelate(c, r) {
    var x = c.getContext("2d"), block = Math.max(Math.round(Math.max(r.w, r.h) / 10), Math.round(Math.max(c.width, c.height) / 60), 6);
    var t = document.createElement("canvas"); t.width = Math.max(1, Math.ceil(r.w / block)); t.height = Math.max(1, Math.ceil(r.h / block));
    var tx = t.getContext("2d"); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = "high";
    tx.drawImage(c, r.x, r.y, r.w, r.h, 0, 0, t.width, t.height);
    x.save(); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, t.width, t.height, r.x, r.y, r.w, r.h); x.restore();
  }
  // full-size result: rotated, anonymised, cropped
  function result() {
    var b = base(), work = document.createElement("canvas"); work.width = b.width; work.height = b.height;
    work.getContext("2d").drawImage(b, 0, 0);
    state.blurs.forEach(function (r) { pixelate(work, clip(r, work)); });
    var cr = state.crop ? clip(state.crop, work) : { x: 0, y: 0, w: work.width, h: work.height };
    var out = document.createElement("canvas"); out.width = cr.w; out.height = cr.h;
    out.getContext("2d").drawImage(work, cr.x, cr.y, cr.w, cr.h, 0, 0, cr.w, cr.h);
    return out;
  }
  function scaled(c, max) {
    var s = Math.min(1, max / Math.max(c.width, c.height));
    if (s === 1) return c;
    var o = document.createElement("canvas"); o.width = Math.round(c.width * s); o.height = Math.round(c.height * s);
    var x = o.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }
  function jpeg(c) { return new Promise(function (ok) { c.toBlob(ok, "image/jpeg", QUALITY); }); }
  function clip(r, c) {
    var x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
    return { x: x, y: y, w: Math.max(1, Math.min(c.width - x, Math.round(r.w))), h: Math.max(1, Math.min(c.height - y, Math.round(r.h))) };
  }

  // fixed format: the largest centred rectangle with the wanted aspect ratio
  function aspect() { var z = state.opts.size; return z ? z[0] / z[1] : 0; }
  function startCrop() {
    var a = aspect(); if (!a) return null;
    var b = base(), w = b.width, h = w / a;
    if (h > b.height) { h = b.height; w = h * a; }
    return { x: (b.width - w) / 2, y: (b.height - h) / 2, w: w, h: h };
  }

  // ---------- drawing ----------
  function render() {
    var b = base(), box = canvas.parentElement.getBoundingClientRect();
    var maxW = Math.max(200, box.width || 800), maxH = Math.max(200, window.innerHeight * 0.62);
    var s = Math.min(maxW / b.width, maxH / b.height, 1);
    canvas.width = Math.round(b.width * s); canvas.height = Math.round(b.height * s); state.scale = s;
    // preview: work on a small copy, so pixelating stays fast while dragging
    var p = document.createElement("canvas"); p.width = canvas.width; p.height = canvas.height;
    p.getContext("2d").drawImage(b, 0, 0, p.width, p.height);
    state.blurs.forEach(function (r) { pixelate(p, clip(mul(r, s), p)); });
    ctx.drawImage(p, 0, 0);
    ctx.lineWidth = 2;
    state.blurs.forEach(function (r, i) { var q = mul(r, s); ctx.strokeStyle = r.auto ? "#ff9f1c" : "#ffd400"; ctx.strokeRect(q.x, q.y, q.w, q.h); label(q, String(i + 1)); });
    var crop = state.drag && state.mode === "crop" ? state.drag : state.crop;
    if (crop) {
      var c = mul(norm(crop), s);
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(0, 0, canvas.width, c.y); ctx.fillRect(0, c.y + c.h, canvas.width, canvas.height - c.y - c.h);
      ctx.fillRect(0, c.y, c.x, c.h); ctx.fillRect(c.x + c.w, c.y, canvas.width - c.x - c.w, c.h);
      ctx.strokeStyle = "#fff"; ctx.setLineDash([6, 4]); ctx.strokeRect(c.x, c.y, c.w, c.h); ctx.setLineDash([]);
    }
    if (state.drag && state.mode === "blur") { var q2 = mul(norm(state.drag), s); ctx.strokeStyle = "#ffd400"; ctx.setLineDash([4, 3]); ctx.strokeRect(q2.x, q2.y, q2.w, q2.h); ctx.setLineDash([]); }
    listEl.innerHTML = state.blurs.map(function (r, i) {
      return '<li><span>' + (i + 1) + ". " + esc(r.auto || "von Hand") + '</span> <button type="button" class="btn btn-small btn-ghost" data-remove="' + i + '" aria-label="Bereich ' + (i + 1) + ' entfernen">✕</button></li>';
    }).join("");
  }
  function label(q, t) { ctx.fillStyle = "#ffd400"; ctx.fillRect(q.x, q.y, 18, 18); ctx.fillStyle = "#000"; ctx.font = "bold 12px sans-serif"; ctx.fillText(t, q.x + 5, q.y + 13); }
  function mul(r, s) { return { x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s }; }
  function norm(r) { return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) }; }
  function point(e) { var b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) / state.scale * (canvas.width / b.width), y: (e.clientY - b.top) / state.scale * (canvas.height / b.height) }; }
  function down(e) { canvas.setPointerCapture(e.pointerId); var p = point(e); state.drag = { x: p.x, y: p.y, w: 0, h: 0 }; }
  function move(e) {
    if (!state.drag) return;
    var p = point(e), a = state.mode === "crop" && aspect();
    state.drag.w = p.x - state.drag.x;
    state.drag.h = a ? (p.y - state.drag.y < 0 ? -1 : 1) * Math.abs(state.drag.w) / a : p.y - state.drag.y;
    render();
  }
  function up(e) {
    if (!state.drag) return;
    var r = norm(state.drag); state.drag = null;
    var tiny = r.w * state.scale < 6 && r.h * state.scale < 6;
    if (tiny) {
      if (state.mode === "blur") { // click on a rectangle → remove it
        var p = point(e), i = state.blurs.findIndex(function (b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
        if (i >= 0) state.blurs.splice(i, 1);
      } else if (!aspect()) state.crop = null;
    } else if (state.mode === "blur") state.blurs.push(r);
    else state.crop = r;
    render();
  }
  function setMode(m) {
    state.mode = m;
    modeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m)); });
  }
  function rotate() {
    var H = base().height; // rotate rectangles clockwise with the photo: (x, y) → (H - y - h, x)
    function turn(r) { return { x: H - r.y - r.h, y: r.x, w: r.h, h: r.w, auto: r.auto }; }
    state.blurs = state.blurs.map(turn); if (state.crop) state.crop = turn(norm(state.crop));
    state.rot = (state.rot + 1) % 4;
    if (aspect()) state.crop = startCrop(); // a rotated crop would have the wrong format
    render();
  }

  // ---------- automatic suggestions ----------
  // FaceDetector: Chrome only with chrome://flags/#enable-experimental-web-platform-features; BarcodeDetector: Chrome
  // on macOS/Android/ChromeOS. Suggestions are marked orange and listed – they never replace looking yourself.
  function detect() {
    var b = base(), found = [], jobs = [], pad = function (r, f) { return { x: r.x - r.width * f, y: r.y - r.height * f, w: r.width * (1 + 2 * f), h: r.height * (1 + 2 * f) }; };
    if ("FaceDetector" in window) {
      jobs.push(new window.FaceDetector({ fastMode: false, maxDetectedFaces: 50 }).detect(b).then(function (faces) {
        faces.forEach(function (f) { var r = pad(f.boundingBox, 0.35); r.auto = "Gesicht (automatisch)"; found.push(r); });
      }).catch(function () {}));
    }
    if ("BarcodeDetector" in window) {
      jobs.push(new window.BarcodeDetector().detect(b).then(function (codes) {
        codes.forEach(function (c) { var r = pad(c.boundingBox, 0.15); r.auto = (c.format === "qr_code" ? "QR-Code" : "Barcode") + " (automatisch)"; found.push(r); });
      }).catch(function () {}));
    }
    if (!jobs.length) { statusEl.textContent = "Dieser Browser kann keine Gesichter oder QR-Codes erkennen – bitte selbst markieren."; return; }
    statusEl.textContent = "Suche …";
    Promise.all(jobs).then(function () {
      state.blurs = state.blurs.concat(found); render();
      var missing = []; if (!("FaceDetector" in window)) missing.push("Gesichter"); if (!("BarcodeDetector" in window)) missing.push("QR-Codes");
      statusEl.textContent = found.length + " Vorschlag/Vorschläge" + (missing.length ? " – " + missing.join(" und ") + " kann dieser Browser nicht erkennen" : "") + ". Bitte trotzdem selbst prüfen.";
    });
  }

  function accept() {
    if (state.opts.size) { // fixed format: exactly size[0] × size[1]
      var src = result(), out = document.createElement("canvas"); out.width = state.opts.size[0]; out.height = state.opts.size[1];
      var ox = out.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(src, 0, 0, out.width, out.height);
      return jpeg(out).then(function (b) {
        var r = resolveFn; resolveFn = null; URL.revokeObjectURL(state.img.src);
        r({ full: b, preview: URL.createObjectURL(b), width: out.width, height: out.height }); d.close();
      });
    }
    var alt = altEl.value.trim();
    if (!alt) { statusEl.textContent = "⚠️ Bitte beschreiben, was auf dem Foto zu sehen ist."; altEl.focus(); return; }
    statusEl.textContent = "Speichern …";
    var full = scaled(result(), FULL), thumb = scaled(full, THUMB);
    Promise.all([jpeg(full), jpeg(thumb)]).then(function (b) {
      var r = resolveFn; resolveFn = null;
      URL.revokeObjectURL(state.img.src);
      r({ full: b[0], thumb: b[1], alt: alt, preview: URL.createObjectURL(b[1]), width: full.width, height: full.height });
      d.close();
    });
  }

  function open(file, opts) {
    if (/^video\//.test(file.type)) return Promise.reject(new Error("Videos gehen hier (noch) nicht – bitte an Falko schicken."));
    if (!d) build();
    return loadImage(file).then(function (img) {
      state = { img: img, rot: 0, crop: null, blurs: [], mode: "blur", drag: null, opts: opts || {} };
      altEl.value = ""; statusEl.textContent = "";
      altEl.closest(".form-feld").style.display = state.opts.size ? "none" : ""; // [hidden] loses against .form-feld { display: flex }
      d.titel(state.opts.title || "📷 " + file.name);
      state.crop = startCrop();
      setMode(state.opts.size ? "crop" : "blur");
      detectBtn.hidden = !("FaceDetector" in window) && !("BarcodeDetector" in window);
      if (!d.open) d.showModal();
      requestAnimationFrame(render);
      return new Promise(function (ok) { resolveFn = ok; });
    });
  }

  return { open: open };
})();
