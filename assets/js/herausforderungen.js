// Drag & drop priorities on /herausforderungen/ – without libraries.
// Cards are moved by their handle (mouse, touch via pointer events, or arrow keys).
// A static site cannot write files, so the new order is turned into the YAML for
// _data/herausforderungen_reihenfolge.yml: copied to the clipboard and the GitHub
// editor for that file opens. Unsaved orders are kept in localStorage per browser.
(function () {
  "use strict";

  var lists = Array.prototype.slice.call(document.querySelectorAll("[data-sortable]"));
  var bar = document.getElementById("sort-bar");
  if (!lists.length || !bar) return;

  var DRAFT_KEY = "ifsmb-herausforderungen-reihenfolge";
  var saveBtn = document.getElementById("sort-save");
  var resetBtn = document.getElementById("sort-reset");
  var yamlBox = document.getElementById("sort-yaml");
  var statusEl = document.getElementById("sort-status");

  function items(list) { return Array.prototype.slice.call(list.querySelectorAll(":scope > .sortable-item")); }
  function slugs(list) { return items(list).map(function (el) { return el.getAttribute("data-slug"); }); }
  function allSlugs() { return lists.reduce(function (acc, l) { return acc.concat(slugs(l)); }, []); }

  var original = allSlugs();

  function storeGet() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; } }
  function storeSet(v) { try { if (v) localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* storage blocked */ } }

  function yaml(order) {
    return [
      "# Priority of the open challenges (Herausforderungen): first = most important.",
      "# Entries are file names from _herausforderungen/ without \".md\".",
      "# Challenges missing here come after the listed ones (sorted by title).",
      "# Easiest way to change it: drag the cards on /herausforderungen/ and save.",
      "reihenfolge:"
    ].concat(order.map(function (s) { return "  - " + s; })).join("\n") + "\n";
  }

  function renumber() {
    lists.forEach(function (list) {
      items(list).forEach(function (el, i) {
        var nr = el.querySelector(".prio-nr");
        if (nr) nr.textContent = String(i + 1);
      });
    });
  }

  function update(announce) {
    renumber();
    var order = allSlugs();
    var changed = order.join("|") !== original.join("|");
    bar.hidden = !changed;
    yamlBox.value = yaml(order);
    storeSet(changed ? order : null);
    if (announce) statusEl.textContent = announce;
  }

  // Put the cards of each list into the order given by `order` (unknown slugs keep their place at the end).
  function applyOrder(order) {
    lists.forEach(function (list) {
      var els = items(list);
      els.sort(function (a, b) {
        var ia = order.indexOf(a.getAttribute("data-slug"));
        var ib = order.indexOf(b.getAttribute("data-slug"));
        return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
      });
      els.forEach(function (el) { list.appendChild(el); });
    });
  }

  // ---------- pointer dragging ----------
  var drag = null;

  function onDown(e) {
    var handle = e.target.closest(".drag-handle");
    if (!handle || e.button > 0) return;
    var item = handle.closest(".sortable-item");
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = { item: item, list: item.parentNode, handle: handle, id: e.pointerId, y: e.clientY };
    item.classList.add("dragging");
    document.body.classList.add("is-sorting");
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.y = e.clientY;
    var target = null;
    items(drag.list).forEach(function (el) {
      if (el === drag.item) return;
      var r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) target = el;
    });
    if (!target) return;
    var els = items(drag.list);
    if (els.indexOf(target) > els.indexOf(drag.item)) target.after(drag.item);
    else target.before(drag.item);
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.item.classList.remove("dragging");
    document.body.classList.remove("is-sorting");
    var pos = items(drag.list).indexOf(drag.item) + 1;
    drag = null;
    update("Verschoben auf Platz " + pos + ".");
  }

  // Scroll the page while dragging near the top/bottom edge of the window.
  function autoScroll() {
    if (drag) {
      var edge = 70, h = window.innerHeight;
      if (drag.y < edge) window.scrollBy(0, -Math.ceil((edge - drag.y) / 5));
      else if (drag.y > h - edge) window.scrollBy(0, Math.ceil((drag.y - (h - edge)) / 5));
    }
    window.requestAnimationFrame(autoScroll);
  }
  window.requestAnimationFrame(autoScroll);

  // ---------- keyboard ----------
  function onKey(e) {
    var handle = e.target.closest(".drag-handle");
    if (!handle) return;
    var item = handle.closest(".sortable-item");
    var els = items(item.parentNode);
    var i = els.indexOf(item);
    var to = i;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = i - 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") to = i + 1;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = els.length - 1;
    else return;
    e.preventDefault();
    if (to < 0 || to >= els.length || to === i) return;
    if (to > i) els[to].after(item); else els[to].before(item);
    handle.focus();
    update("„" + item.querySelector("h3").textContent.trim() + "“ jetzt auf Platz " + (to + 1) + ".");
  }

  lists.forEach(function (list) {
    list.addEventListener("pointerdown", onDown);
    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerup", onUp);
    list.addEventListener("pointercancel", onUp);
    list.addEventListener("keydown", onKey);
  });

  // ---------- save / reset ----------
  saveBtn.addEventListener("click", function () {
    var text = yamlBox.value;
    var url = bar.getAttribute("data-edit-url");
    function open(msg) {
      statusEl.textContent = msg;
      window.open(url, "_blank", "noopener");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        open("Kopiert! Im GitHub-Editor den ganzen Inhalt ersetzen (Strg/⌘+A, dann einfügen) und speichern.");
      }, function () {
        bar.querySelector(".sort-bar-yaml").open = true;
        yamlBox.select();
        open("Kopieren ging nicht – bitte den Text unten markieren, kopieren und im GitHub-Editor einfügen.");
      });
    } else {
      bar.querySelector(".sort-bar-yaml").open = true;
      yamlBox.select();
      open("Bitte den Text unten kopieren und im GitHub-Editor einfügen.");
    }
  });

  resetBtn.addEventListener("click", function () {
    applyOrder(original);
    update("Reihenfolge zurückgesetzt.");
  });

  // Restore an unsaved draft from an earlier visit.
  var draft = storeGet();
  if (Array.isArray(draft)) {
    applyOrder(draft);
    update("Deine ungespeicherte Reihenfolge von vorhin ist wiederhergestellt.");
  } else {
    update();
  }
})();
