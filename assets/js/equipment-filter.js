// Filter on /equipment/ (equipment/index.html): ?owner=<key> shows the devices someone owns, ?location=<key> the
// devices located at a partner. Keys: _includes/equipment-keys.html (partner: last part of its page, e.g. 35services;
// team members: their slug). Builds a small bar with every owner/location and its count. Without JS all devices show.
(function () {
  "use strict";
  var bar = document.querySelector("[data-equipment-filter]");
  if (!bar) return;
  var labels = {};
  try { labels = JSON.parse(document.getElementById("equipment-filter-labels").textContent); } catch (e) { /* no labels: keys */ }
  var cards = Array.prototype.slice.call(document.querySelectorAll(".equipment-card"));
  // [URL parameter, data attribute, label key, German fallback, status key, status fallback]
  var FILTERS = [
    ["owner", "owners", "equipment.filter_owner", "Gehört:", "equipment.filter_active_owner", "Geräte von {name}"],
    ["location", "locations", "equipment.filter_location", "Steht bei:", "equipment.filter_active_location", "Geräte bei {name}"]
  ];

  function tr(key, params, fallback) {
    var s = window.I18n && window.I18n.t ? window.I18n.t(key, params) : key;
    if (s === key) s = fallback.replace(/\{(\w+)\}/g, function (m, n) { return params && params[n] != null ? String(params[n]) : m; });
    return s;
  }
  function count(n) { return tr("equipment.filter_count", { n: n }, n === 1 ? "1 Gerät" : n + " Geräte"); }
  function keysOf(card, attr) { return (card.getAttribute("data-" + attr) || "").split(/\s+/).filter(Boolean); }
  function esc(s) { var x = document.createElement("span"); x.textContent = s; return x.innerHTML; }

  function active() {
    var params = new URLSearchParams(location.search);
    for (var i = 0; i < FILTERS.length; i++) {
      var v = params.get(FILTERS[i][0]);
      if (v) return { filter: FILTERS[i], key: v.toLowerCase() };
    }
    return null;
  }

  function apply(current) {
    var shown = 0;
    cards.forEach(function (card) {
      var ok = !current || keysOf(card, current.filter[1]).indexOf(current.key) >= 0;
      card.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    // groups (3D printers, scanners, others): hide empty ones with their heading, update the jump links' counts
    Array.prototype.forEach.call(document.querySelectorAll("[data-equipment-group]"), function (group) {
      var id = group.getAttribute("data-equipment-group");
      var n = Array.prototype.filter.call(group.querySelectorAll(".equipment-card"), function (c) { return c.style.display !== "none"; }).length;
      group.style.display = n ? "" : "none";
      var heading = document.getElementById(id);
      if (heading) heading.style.display = n ? "" : "none";
      var c = document.querySelector('[data-equipment-count="' + id + '"]');
      if (c) { c.textContent = n; c.closest("a").hidden = !n; }
    });
    return shown;
  }

  function render() {
    var current = active(), shown = apply(current), html = "";
    if (current) {
      var name = labels[current.key] || current.key;
      html += '<p class="equipment-filter-status" role="status"><strong>' + esc(tr(current.filter[4], { name: name }, current.filter[5])) + "</strong> – "
        + esc(shown ? count(shown) : tr("equipment.filter_none", null, "keine Geräte für diesen Filter"))
        + ' · <a href="' + esc(location.pathname) + '">' + esc(tr("equipment.filter_reset", null, "Alle zeigen")) + "</a></p>";
    }
    FILTERS.forEach(function (f) {
      var counts = {};
      cards.forEach(function (card) { keysOf(card, f[1]).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; }); });
      var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || String(labels[a] || a).localeCompare(String(labels[b] || b), "de"); });
      if (!keys.length) return;
      html += '<p class="equipment-filter-row"><span class="equipment-filter-label">' + esc(tr(f[2], null, f[3])) + "</span> " + keys.map(function (k) {
        var on = current && current.filter === f && current.key === k;
        return '<a href="?' + f[0] + "=" + encodeURIComponent(k) + '"' + (on ? ' aria-current="true"' : "") + ">" + esc(labels[k] || k) + " (" + counts[k] + ")</a>";
      }).join(" · ") + "</p>";
    });
    bar.innerHTML = html;
    bar.hidden = !html;
  }

  render();
  document.addEventListener("i18n:change", render);
})();
