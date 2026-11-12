// Map of the network (/karte/): a small slippy map without libraries.
// Tiles come from tile.openstreetmap.org and are only requested after the visitor agrees.
(function () {
  "use strict";

  var dataEl = document.getElementById("karte-daten");
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);

  var TILE = 256;
  var MIN_Z = 3;
  var MAX_Z = 18;
  var TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var CONSENT_KEY = "ifsmb-karte-osm";

  var TYPES = [
    { key: "projekt", label: "Projekte", icon: "🔧" },
    { key: "termin", label: "Termine", icon: "📅" },
    { key: "beitrag", label: "Beiträge", icon: "📰" },
    { key: "ausstattung", label: "Ausstattung", icon: "🖨️" }
  ];

  // ---------- helpers ----------
  function list(v) {
    if (v === null || v === undefined || v === "") return [];
    return Array.isArray(v) ? v : [v];
  }
  var TODAY = new Date().toISOString().slice(0, 10);
  function datumDE(d) { var p = String(d).split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : d; }
  function lower(s) { return String(s || "").toLowerCase(); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function storageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function storageDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  // ---------- resolve resources to places ----------
  var places = DATA.orte.filter(function (o) { return typeof o.lat === "number" && typeof o.lon === "number"; });
  var byId = {};
  places.forEach(function (o) {
    o.items = { projekt: [], termin: [], beitrag: [], ausstattung: [] };
    o.seen = {};
    byId[o.id] = o;
  });
  var partnerInfo = {};
  DATA.partner.forEach(function (p) { partnerInfo[p.name] = p; });

  function byText(text) {
    var t = lower(text);
    if (!t) return [];
    return places.filter(function (o) {
      return list(o.finden).some(function (f) { return f && t.indexOf(lower(f)) !== -1; });
    });
  }
  function byPartner(names) {
    var n = list(names);
    return places.filter(function (o) { return o.partner && n.indexOf(o.partner) !== -1; });
  }
  function explicit(ids) {
    return list(ids).map(function (id) { return byId[id]; }).filter(Boolean);
  }

  var projectPlaces = {}; // project slug or event_tag -> places
  function placesFor(x) {
    var found = explicit(x.orte);
    if (!found.length) found = byText(x.text);
    if (!found.length && x.typ === "ausstattung") found = byPartner(x.standort_partner);
    if (!found.length && x.typ === "ausstattung" && !x.text) found = byPartner(x.owner_partner);
    if (!found.length && (x.typ === "projekt" || x.typ === "termin")) found = byPartner(x.partners);
    return found;
  }
  function add(o, x) {
    if (o.seen[x.url]) return;
    o.seen[x.url] = true;
    o.items[x.typ].push(x);
  }

  var seiten = DATA.seiten;
  // Projects first, so posts and events can inherit their places.
  seiten.forEach(function (x) {
    if (x.typ !== "projekt") return;
    var ps = placesFor(x);
    ps.forEach(function (o) { add(o, x); });
    var slug = x.url.replace(/\/$/, "").split("/").pop();
    projectPlaces["slug:" + slug] = ps;
    if (x.event_tag) projectPlaces["tag:" + x.event_tag] = (projectPlaces["tag:" + x.event_tag] || []).concat(ps);
  });
  function viaProjects(x) {
    var out = [];
    list(x.projekte).forEach(function (s) { out = out.concat(projectPlaces["slug:" + s] || []); });
    list(x.tags).forEach(function (t) { out = out.concat(projectPlaces["tag:" + t] || []); });
    return out;
  }
  seiten.forEach(function (x) {
    if (x.typ === "projekt") return;
    var ps = placesFor(x);
    // Posts have no address field: they sit where their project is. Events without a
    // location of their own (e.g. "Berlin") stay off the map rather than guessing.
    if (!ps.length && x.typ === "beitrag") ps = viaProjects(x);
    ps.forEach(function (o) { add(o, x); });
  });

  places.forEach(function (o) {
    TYPES.forEach(function (t) {
      o.items[t.key].sort(function (a, b) {
        if (t.key === "termin") {
          var fa = a.datum >= TODAY, fb = b.datum >= TODAY;
          if (fa !== fb) return fa ? -1 : 1;
          if (fa) return String(a.datum).localeCompare(String(b.datum)); // next one first
        }
        return String(b.datum || "").localeCompare(String(a.datum || ""));
      });
    });
  });

  // ---------- state ----------
  var showPersonal = true;
  var selected = null;

  function visibleItems(o, typ) {
    return o.items[typ].filter(function (x) { return showPersonal || !x.persoenlich; });
  }
  function count(o) {
    return TYPES.reduce(function (n, t) { return n + visibleItems(o, t.key).length; }, 0);
  }

  // ---------- side panel ----------
  var panel = document.getElementById("karte-panel");

  function renderList() {
    panel.innerHTML = "";
    panel.appendChild(el("h2", null, "Orte"));
    var ul = el("ul", "karte-liste");
    places.slice().sort(function (a, b) { return count(b) - count(a) || a.name.localeCompare(b.name, "de"); })
      .forEach(function (o) {
        var li = el("li");
        var b = el("button", "karte-ort-knopf");
        b.type = "button";
        b.appendChild(el("span", null, o.name));
        b.appendChild(el("span", "karte-zahl", String(count(o))));
        b.addEventListener("click", function () { select(o, true); });
        li.appendChild(b);
        ul.appendChild(li);
      });
    panel.appendChild(ul);
  }

  function renderPlace(o) {
    panel.innerHTML = "";
    var back = el("button", "btn btn-ghost karte-zurueck", "← Alle Orte");
    back.type = "button";
    back.addEventListener("click", function () { select(null, false); });
    panel.appendChild(back);
    panel.appendChild(el("h2", null, o.name));
    var addr = el("p", "muted", o.adresse + (o.ungefaehr ? " (ungefähre Lage)" : ""));
    panel.appendChild(addr);
    var osm = el("p", "karte-osm-link");
    var a = el("a", null, "Auf openstreetmap.org öffnen");
    a.href = "https://www.openstreetmap.org/?mlat=" + o.lat + "&mlon=" + o.lon + "#map=17/" + o.lat + "/" + o.lon;
    osm.appendChild(a);
    panel.appendChild(osm);

    if (o.partner && partnerInfo[o.partner]) {
      var p = partnerInfo[o.partner];
      panel.appendChild(el("h3", null, "Partner"));
      var pl = el("ul", "link-list");
      var pli = el("li");
      var pa = el("a", null, "🤝 " + p.name);
      pa.href = p.url;
      pli.appendChild(pa);
      pl.appendChild(pli);
      panel.appendChild(pl);
    }

    var any = false;
    TYPES.forEach(function (t) {
      var xs = visibleItems(o, t.key);
      if (!xs.length) return;
      any = true;
      panel.appendChild(el("h3", null, t.label + " (" + xs.length + ")"));
      var ul = el("ul", "link-list");
      xs.forEach(function (x) {
        var li = el("li");
        var la = el("a", null, t.icon + " " + x.titel);
        la.href = x.url;
        if (x.typ === "termin" && x.datum) {
          la.appendChild(document.createTextNode(" "));
          la.appendChild(el("span", "link-meta" + (x.datum >= TODAY ? " karte-kommt" : ""), x.datum >= TODAY ? "kommt · " + datumDE(x.datum) : datumDE(x.datum)));
        }
        if (x.persoenlich) {
          la.appendChild(document.createTextNode(" "));
          la.appendChild(el("span", "link-private", "persönlich"));
        }
        li.appendChild(la);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    });
    if (!any) panel.appendChild(el("p", "muted", "Hier ist (gerade) nichts sichtbar."));
  }

  function select(o, center) {
    selected = o;
    if (o) {
      renderPlace(o);
      if (history.replaceState) history.replaceState(null, "", "#ort=" + o.id);
      if (map && center) map.flyTo(o);
    } else {
      renderList();
      if (history.replaceState) history.replaceState(null, "", location.pathname);
    }
    if (map) map.updateMarkers();
  }

  // ---------- slippy map ----------
  var map = null;

  function project(lat, lon, z) {
    var s = TILE * Math.pow(2, z);
    var sin = Math.sin(lat * Math.PI / 180);
    return {
      x: (lon + 180) / 360 * s,
      y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s
    };
  }

  function SlippyMap(root) {
    var self = this;
    var tiles = el("div", "karte-kacheln");
    var markers = el("div", "karte-marker");
    root.appendChild(tiles);
    root.appendChild(markers);
    var cache = {};
    var z = 12;
    var cx = 0, cy = 0; // world pixel at the center of the view, at zoom z

    function size() { return { w: root.clientWidth, h: root.clientHeight }; }

    function render() {
      var s = size();
      var n = Math.pow(2, z);
      var x0 = cx - s.w / 2, y0 = cy - s.h / 2;
      var tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE);
      var tx1 = Math.floor((x0 + s.w) / TILE), ty1 = Math.floor((y0 + s.h) / TILE);
      var keep = {};
      for (var ty = ty0; ty <= ty1; ty++) {
        if (ty < 0 || ty >= n) continue;
        for (var tx = tx0; tx <= tx1; tx++) {
          var wx = ((tx % n) + n) % n;
          var key = z + "/" + wx + "/" + ty + "@" + tx;
          keep[key] = true;
          var img = cache[key];
          if (!img) {
            img = document.createElement("img");
            img.alt = "";
            img.draggable = false;
            img.decoding = "async";
            img.src = TILE_URL.replace("{z}", z).replace("{x}", wx).replace("{y}", ty);
            cache[key] = img;
            tiles.appendChild(img);
          }
          img.style.transform = "translate(" + Math.round(tx * TILE - x0) + "px," + Math.round(ty * TILE - y0) + "px)";
        }
      }
      Object.keys(cache).forEach(function (k) {
        if (!keep[k]) { tiles.removeChild(cache[k]); delete cache[k]; }
      });
      self.updateMarkers();
    }

    var markerEls = {};
    places.forEach(function (o) {
      var b = el("button", "karte-punkt");
      b.type = "button";
      b.setAttribute("aria-label", o.name);
      b.title = o.name;
      b.addEventListener("click", function (e) { e.stopPropagation(); select(o, false); });
      markers.appendChild(b);
      markerEls[o.id] = b;
    });

    this.updateMarkers = function () {
      var s = size();
      places.forEach(function (o) {
        var b = markerEls[o.id];
        var p = project(o.lat, o.lon, z);
        var n = count(o);
        b.textContent = n ? String(n) : "";
        b.classList.toggle("is-leer", !n);
        b.classList.toggle("is-aktiv", selected === o);
        b.classList.toggle("is-ungefaehr", !!o.ungefaehr);
        b.style.transform = "translate(" + Math.round(p.x - cx + s.w / 2) + "px," + Math.round(p.y - cy + s.h / 2) + "px)";
      });
    };

    function setView(lat, lon, zoom) {
      z = Math.max(MIN_Z, Math.min(MAX_Z, zoom));
      var p = project(lat, lon, z);
      cx = p.x; cy = p.y;
      render();
    }

    function zoomAt(dz, px, py) {
      var nz = Math.max(MIN_Z, Math.min(MAX_Z, z + dz));
      if (nz === z) return;
      var s = size();
      if (px === undefined) { px = s.w / 2; py = s.h / 2; }
      var f = Math.pow(2, nz - z);
      // keep the world point under (px, py) fixed
      var wx = cx - s.w / 2 + px, wy = cy - s.h / 2 + py;
      cx = wx * f - px + s.w / 2;
      cy = wy * f - py + s.h / 2;
      z = nz;
      render();
    }

    this.fit = function (list) {
      if (!list.length) return setView(52.52, 13.40, 11);
      var s = size();
      var pad = 48;
      for (var zz = 16; zz >= MIN_Z; zz--) {
        var xs = list.map(function (o) { return project(o.lat, o.lon, zz); });
        var minX = Math.min.apply(null, xs.map(function (p) { return p.x; }));
        var maxX = Math.max.apply(null, xs.map(function (p) { return p.x; }));
        var minY = Math.min.apply(null, xs.map(function (p) { return p.y; }));
        var maxY = Math.max.apply(null, xs.map(function (p) { return p.y; }));
        if (maxX - minX <= s.w - 2 * pad && maxY - minY <= s.h - 2 * pad) {
          z = zz; cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
          return render();
        }
      }
      setView(list[0].lat, list[0].lon, MIN_Z);
    };

    this.flyTo = function (o) { setView(o.lat, o.lon, Math.max(z, 15)); };
    this.zoomIn = function () { zoomAt(1); };
    this.zoomOut = function () { zoomAt(-1); };

    // --- dragging and pinching (pointer events) ---
    var pointers = {};
    var pinchStart = null;
    root.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".karte-punkt")) return;
      root.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      root.classList.add("is-ziehen");
    });
    root.addEventListener("pointermove", function (e) {
      var prev = pointers[e.pointerId];
      if (!prev) return;
      var ids = Object.keys(pointers);
      if (ids.length === 1) {
        cx -= e.clientX - prev.x;
        cy -= e.clientY - prev.y;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        render();
      } else if (ids.length === 2) {
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (!pinchStart) pinchStart = d;
        var r = root.getBoundingClientRect();
        var mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        if (d / pinchStart > 1.6) { zoomAt(1, mx, my); pinchStart = d; }
        else if (d / pinchStart < 0.62) { zoomAt(-1, mx, my); pinchStart = d; }
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinchStart = null;
      if (!Object.keys(pointers).length) root.classList.remove("is-ziehen");
    }
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);

    var wheelLock = 0;
    root.addEventListener("wheel", function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - wheelLock < 250) return;
      wheelLock = now;
      var r = root.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    root.addEventListener("dblclick", function (e) {
      if (e.target.closest(".karte-punkt")) return;
      var r = root.getBoundingClientRect();
      zoomAt(e.shiftKey ? -1 : 1, e.clientX - r.left, e.clientY - r.top);
    });
    root.addEventListener("keydown", function (e) {
      var step = 80;
      if (e.key === "ArrowLeft") cx -= step;
      else if (e.key === "ArrowRight") cx += step;
      else if (e.key === "ArrowUp") cy -= step;
      else if (e.key === "ArrowDown") cy += step;
      else if (e.key === "+" || e.key === "=") return zoomAt(1);
      else if (e.key === "-") return zoomAt(-1);
      else return;
      e.preventDefault();
      render();
    });
    window.addEventListener("resize", render);
  }

  // ---------- consent & start ----------
  var mapEl = document.getElementById("karte-map");
  var consentEl = document.getElementById("karte-zustimmung");
  var zoomEl = document.getElementById("karte-zoom");
  var attrEl = document.getElementById("karte-attribution");
  var home = places.filter(function (o) { return !o.fern; });

  function startMap() {
    if (map) return;
    consentEl.hidden = true;
    zoomEl.hidden = false;
    attrEl.hidden = false;
    mapEl.classList.add("is-geladen");
    map = new SlippyMap(mapEl);
    if (selected) map.flyTo(selected); else map.fit(home);
  }

  document.getElementById("karte-laden").addEventListener("click", function () {
    if (document.getElementById("karte-merken").checked) storageSet(CONSENT_KEY, "ja");
    startMap();
  });
  document.getElementById("karte-plus").addEventListener("click", function () { map && map.zoomIn(); });
  document.getElementById("karte-minus").addEventListener("click", function () { map && map.zoomOut(); });
  document.getElementById("karte-alle").addEventListener("click", function () { map && map.fit(home); });
  document.getElementById("karte-aus").addEventListener("click", function () {
    storageDel(CONSENT_KEY);
    location.reload();
  });
  document.getElementById("karte-persoenlich").addEventListener("change", function (e) {
    showPersonal = e.target.checked;
    if (selected) renderPlace(selected); else renderList();
    if (map) map.updateMarkers();
  });

  var m = /^#ort=(.+)$/.exec(location.hash);
  if (m && byId[decodeURIComponent(m[1])]) select(byId[decodeURIComponent(m[1])], false);
  else renderList();

  if (storageGet(CONSENT_KEY) === "ja") startMap();
})();
