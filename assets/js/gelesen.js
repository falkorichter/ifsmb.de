// "Read" marker: remembers in the visitor's own browser (localStorage, nothing is sent anywhere) which pages
// were opened, and marks links to those pages with a ✓.
// - Every content page carries a uuid in its front matter (_scripts/uuids_ergaenzen.rb); _layouts/default.html
//   puts it into <body data-uuid>. Opening the page stores the key "gelesen_<uuid>" = "1".
// - /gelesen.json maps URL → uuid, so every link inside the page content can be checked.
// - An element .gelesen-fortschritt shows "X von Y gelesen" for the distinct pages linked inside its
//   data-bereich container (CSS selector; default: the parent element).
// The uuid (not the URL) is stored, so the marker survives renamed or moved files.
(function () {
  "use strict";
  var PREFIX = "gelesen_";

  function lesen(uuid) { try { return localStorage.getItem(PREFIX + uuid) === "1"; } catch (e) { return false; } }
  function merken(uuid) { try { localStorage.setItem(PREFIX + uuid, "1"); } catch (e) { /* storage blocked */ } }

  var eigene = document.body.getAttribute("data-uuid");
  if (eigene) merken(eigene);

  // links outside the page content (navigation, footer, edit bar, donate badge) are not marked
  var AUSSEN = ".site-header, .site-footer, .edit-page, .badge-donate, .lightbox-overlay";

  function pfad(a) {
    if (a.classList.contains("lightbox")) return null;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return null;
    var u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    // deep links into a section (e.g. the activity chips on project cards → #termine) are not "the page"
    if (u.origin !== location.origin || u.hash) return null;
    var p = u.pathname.replace(/index\.html$/, "");
    if (!/\/$/.test(p) && !/\.[a-z0-9]+$/i.test(p)) p += "/";
    return p;
  }

  function anwenden(karte) {
    var links = Array.prototype.slice.call(document.querySelectorAll("a[href]")).filter(function (a) {
      return !a.closest(AUSSEN);
    });
    links.forEach(function (a) {
      var p = pfad(a);
      var uuid = p && karte[p];
      if (!uuid) return;
      a.setAttribute("data-uuid", uuid);
      var gelesen = lesen(uuid);
      a.classList.toggle("gelesen", gelesen);
      var haken = a.querySelector(".gelesen-haken");
      if (gelesen && !haken) {
        haken = document.createElement("span");
        haken.className = "gelesen-haken";
        haken.title = "Schon gelesen (nur in diesem Browser gespeichert)";
        haken.innerHTML = '<span aria-hidden="true">✓</span><span class="visually-hidden"> (gelesen)</span>';
        a.appendChild(haken);
      } else if (!gelesen && haken) {
        haken.remove();
      }
    });

    document.querySelectorAll(".gelesen-fortschritt").forEach(function (box) {
      var sel = box.getAttribute("data-bereich");
      var bereich = (sel && document.querySelector(sel)) || box.parentElement;
      var alle = {}, gesamt = 0, gelesen = 0;
      bereich.querySelectorAll("a[data-uuid]").forEach(function (a) {
        var u = a.getAttribute("data-uuid");
        if (alle[u] || u === eigene) return;
        alle[u] = true;
        gesamt++;
        if (lesen(u)) gelesen++;
      });
      if (!gesamt) return;
      box.querySelector(".gelesen-fortschritt-balken span").style.width = (gelesen / gesamt * 100) + "%";
      box.querySelector(".gelesen-fortschritt-text").textContent = gelesen + " von " + gesamt + " gelesen";
      box.hidden = false;
    });
  }

  var karte = null;
  function start() {
    fetch(document.body.getAttribute("data-gelesen-index"))
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (k) { karte = k; anwenden(karte); })
      .catch(function () { /* no marker without index */ });
  }
  start();

  // back/forward cache and other tabs: refresh the marks without reloading
  window.addEventListener("pageshow", function (e) { if (e.persisted && karte) anwenden(karte); });
  window.addEventListener("storage", function (e) { if (karte && e.key && e.key.indexOf(PREFIX) === 0) anwenden(karte); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && karte) anwenden(karte); });

  // "Gelesen-Markierungen löschen" button (e.g. in the privacy section of the imprint)
  document.querySelectorAll("[data-gelesen-loeschen]").forEach(function (b) {
    b.hidden = false;
    b.addEventListener("click", function () {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k); });
      } catch (e) { /* storage blocked */ }
      if (karte) anwenden(karte);
      b.textContent = "✓ Gelöscht";
    });
  });
})();
