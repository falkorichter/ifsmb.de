/*
 * Network view of all connections (/netzwerk/).
 * No libraries: a small force-directed layout drawn on a canvas.
 * Node data comes from the JSON rendered by Jekyll in netzwerk/index.html; edges are derived here
 * with the same rules as _includes/verbindungen.html.
 */
(function () {
  'use strict';

  var TYPES = {
    projekt:     { label: 'Projekte', one: 'Projekt',     color: '#ffcc00', icon: '🔧' },
    termin:      { label: 'Termine', one: 'Termin',      color: '#2f5bea', icon: '📅' },
    beitrag:     { label: 'Beiträge', one: 'Beitrag',     color: '#2bb673', icon: '📰' },
    person:      { label: 'Personen', one: 'Person',     color: '#ff5a36', icon: '👤' },
    partner:     { label: 'Partner', one: 'Partner',      color: '#9b6bd1', icon: '🤝' },
    ausstattung: { label: 'Ausstattung', one: 'Ausstattung',  color: '#6b6b78', icon: '🛠️' },
    presse:      { label: 'Presse', one: 'Presse',       color: '#13a3b5', icon: '🗞️' },
    ort:         { label: 'Orte', one: 'Ort',             color: '#ffffff', icon: '📍' },
    name:        { label: 'Weitere Besitzer*innen', one: 'Besitzer*in', color: '#e5e1d8', icon: '🏷️' }
  };
  var INK = '#16161d', LINE = 'rgba(22,22,29,.18)', BG = '#faf8f3';
  // special relations of equipment: owner and location
  var KIND = {
    besitz:   { color: '#ff5a36', dash: [],     label: 'gehört' },
    standort: { color: '#2f5bea', dash: [6, 4], label: 'steht bei' },
    teil:     { color: INK,       dash: [],     label: 'Teilprojekt' },
    link:     { color: INK,       dash: [],     label: '' }
  };

  var raw = JSON.parse(document.getElementById('netz-daten').textContent);
  var canvas = document.getElementById('netz-canvas');
  var ctx = canvas.getContext('2d');
  var panel = document.getElementById('netz-panel');

  // ---------- build graph ----------
  var nodes = raw.map(function (d) { d.url = d.url || d.id; return d; });
  var byId = {}, projectBySlug = {}, personBySlug = {}, partnerByName = {}, projectByTag = {};
  nodes.forEach(function (n) {
    byId[norm(n.id)] = n;
    if (n.type === 'projekt') { projectBySlug[n.slug] = n; if (n.event_tag) projectByTag[n.event_tag] = n; }
    if (n.type === 'person') personBySlug[n.slug] = n;
    if (n.type === 'partner') partnerByName[n.title] = n;
  });

  function norm(u) {
    if (!u) return u;
    u = String(u).trim();
    if (/^[a-z]+:/.test(u)) return u;   // partner:, ort:, name:, http(s):
    if (u.charAt(0) !== '/') u = '/' + u;
    if (u.slice(-1) !== '/' && u.indexOf('.') === -1) u += '/';
    return u;
  }
  function list(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

  // free-text owners and locations become their own nodes (shared when the text is the same)
  var extra = {};
  function textNode(type, text) {
    var id = type + ':' + text;
    if (!extra[id]) { extra[id] = { id: id, type: type, title: text, url: null }; nodes.push(extra[id]); byId[id] = extra[id]; }
    return extra[id];
  }
  raw.filter(function (n) { return n.type === 'ausstattung'; }).forEach(function (n) {
    list(n.owner_name).forEach(function (s) { n._owners = (n._owners || []).concat(textNode('name', s)); });
    if (n.standort && !list(n.standort_partner).length) n._location = textNode('ort', n.standort);
  });

  var edges = [], seen = {};
  var RANK = { besitz: 3, standort: 2, teil: 1, link: 0 };
  function link(a, b, kind) {
    if (!a || !b || a === b) return;
    kind = kind || 'link';
    var k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
    if (seen[k]) { if (RANK[kind] > RANK[seen[k].kind]) seen[k].kind = kind; return; }
    var e = { source: a, target: b, kind: kind || 'link' };
    if (kind === 'teil') { e.source = b; e.target = a; } // parent -> child
    seen[k] = e; edges.push(e);
  }
  nodes.forEach(function (n) {
    list(n.verlinkt).forEach(function (u) { link(n, byId[norm(u)]); });
    list(n.team).forEach(function (s) { link(n, personBySlug[s]); });
    list(n.author).forEach(function (s) { link(n, personBySlug[s]); });
    list(n.partners).forEach(function (s) { link(n, partnerByName[s]); });
    if (n.type === 'ausstattung') {
      list(n.owner_partner).forEach(function (s) { link(n, partnerByName[s], 'besitz'); });
      list(n.owner_team).forEach(function (s) { link(n, personBySlug[s], 'besitz'); });
      (n._owners || []).forEach(function (o) { link(n, o, 'besitz'); });
      list(n.standort_partner).forEach(function (s) { link(n, partnerByName[s], 'standort'); });
      if (n._location) link(n, n._location, 'standort');
    }
    if (n.type === 'projekt') {
      list(n.teil_von).forEach(function (s) { link(n, projectBySlug[s], 'teil'); });
      list(n.verwandt).forEach(function (s) { link(n, projectBySlug[s]); });
    } else {
      list(n.projekte).forEach(function (s) { link(n, projectBySlug[s]); });
      list(n.tags).forEach(function (t) { link(n, projectByTag[t]); });
    }
  });
  nodes.forEach(function (n) { n.links = []; n.kinds = {}; });
  edges.forEach(function (e) {
    e.source.links.push(e.target); e.target.links.push(e.source);
    e.source.kinds[e.target.id] = e.kind; e.target.kinds[e.source.id] = e.kind;
  });
  nodes.forEach(function (n) { n.r = 5 + Math.min(14, Math.sqrt(n.links.length) * 2.6); });

  // ---------- filters ----------
  var shownTypes = {}; Object.keys(TYPES).forEach(function (t) { shownTypes[t] = true; });
  var showPersonal = true, showLonely = false, query = '';
  var filterBox = document.getElementById('netz-filter');
  Object.keys(TYPES).forEach(function (t) {
    var count = nodes.filter(function (n) { return n.type === t; }).length;
    if (!count) return;
    var l = document.createElement('label');
    l.className = 'netz-chip';
    l.innerHTML = '<input type="checkbox" checked> <span class="netz-dot" style="background:' + TYPES[t].color + '"></span> ' +
      TYPES[t].label + ' <span class="link-meta">' + count + '</span>';
    l.querySelector('input').addEventListener('change', function (ev) { shownTypes[t] = ev.target.checked; refilter(); });
    filterBox.appendChild(l);
  });
  var lonely = document.createElement('label');
  lonely.className = 'netz-chip';
  lonely.innerHTML = '<input type="checkbox"> Ohne Verbindung';
  lonely.querySelector('input').addEventListener('change', function (ev) { showLonely = ev.target.checked; refilter(); });
  filterBox.appendChild(lonely);
  document.getElementById('netz-persoenlich').addEventListener('change', function (ev) { showPersonal = ev.target.checked; refilter(); });
  document.getElementById('netz-suche').addEventListener('input', function (ev) { query = ev.target.value.trim().toLowerCase(); draw(); });
  document.getElementById('netz-suche').addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var hit = visible.filter(matches)[0];
    if (hit) select(hit, true);
  });
  document.getElementById('netz-reset').addEventListener('click', function () { select(null); fit(); });

  var visible = [], visibleEdges = [];
  function isVisible(n) {
    if (!shownTypes[n.type]) return false;
    if (!showPersonal && n.persoenlich) return false;
    return true;
  }
  function refilter() {
    visible = nodes.filter(isVisible);
    visibleEdges = edges.filter(function (e) { return isVisible(e.source) && isVisible(e.target); });
    if (!showLonely) {
      var deg = {};
      visibleEdges.forEach(function (e) { deg[e.source.id] = 1; deg[e.target.id] = 1; });
      visible = visible.filter(function (n) { return deg[n.id] || n === selected; });
    }
    if (selected && visible.indexOf(selected) === -1) select(null);
    if (period) period.nodes.forEach(function (n) { if (isVisible(n) && visible.indexOf(n) === -1) visible.push(n); });
    reheat(0.5);
    renderTimeline();
  }
  function matches(n) { return query && n.title.toLowerCase().indexOf(query) !== -1; }

  // ---------- layout ----------
  var W = 0, H = 0, dpr = window.devicePixelRatio || 1;
  var view = { x: 0, y: 0, k: 1 };
  nodes.forEach(function (n, i) {
    var a = i * 2.39996, r = 30 * Math.sqrt(i + 1);
    n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; n.vx = 0; n.vy = 0;
  });
  var alpha = 1, running = false;
  function reheat(a) { alpha = Math.max(alpha, a); if (!running) { running = true; requestAnimationFrame(tick); } }

  function step() {
    var vs = visible, n = vs.length, i, j, a, b, dx, dy, d2, d, f;
    for (i = 0; i < n; i++) {               // repulsion
      a = vs[i];
      for (j = i + 1; j < n; j++) {
        b = vs[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 640000) continue;
        f = 2600 * alpha / d2; d = Math.sqrt(d2);
        dx = dx / d * f; dy = dy / d * f;
        a.vx -= dx; a.vy -= dy; b.vx += dx; b.vy += dy;
      }
    }
    visibleEdges.forEach(function (e) {     // springs
      a = e.source; b = e.target; dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      var len = e.kind === 'teil' ? 80 : 130;
      f = (d - len) * 0.03 * alpha;
      dx = dx / d * f; dy = dy / d * f;
      a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
    });
    vs.forEach(function (p) {               // gravity + integrate
      p.vx -= p.x * 0.002 * alpha; p.vy -= p.y * 0.002 * alpha;
      if (p === dragNode) { p.vx = p.vy = 0; return; }
      p.vx *= 0.6; p.vy *= 0.6; p.x += p.vx; p.y += p.vy;
    });
    alpha *= 0.985;
  }
  function tick() {
    step(); step();
    if (anim) animate();
    draw();
    if (alpha > 0.02 || dragNode || anim) requestAnimationFrame(tick); else running = false;
  }

  // ---------- drawing ----------
  var selected = null, hover = null, anim = null, period = null;
  function resize() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }
  function toScreen(p) { return { x: (p.x - view.x) * view.k + W / 2, y: (p.y - view.y) * view.k + H / 2 }; }
  function toWorld(sx, sy) { return { x: (sx - W / 2) / view.k + view.x, y: (sy - H / 2) / view.k + view.y }; }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * (W / 2 - view.x * view.k), dpr * (H / 2 - view.y * view.k));
    var focus = selected ? [selected].concat(selected.links) : (period ? period.nodes : null);
    var lw = 1 / view.k;
    visibleEdges.forEach(function (e) {
      var on = selected && (e.source === selected || e.target === selected), K = KIND[e.kind];
      var special = e.kind === 'besitz' || e.kind === 'standort';
      ctx.globalAlpha = focus && !on ? 0.12 : (special ? 0.75 : 1);
      ctx.strokeStyle = special ? K.color : (on ? INK : LINE);
      ctx.lineWidth = (on ? 2.2 : 1) * lw * (e.kind === 'teil' ? 2 : 1) * (special ? 1.4 : 1);
      ctx.setLineDash(K.dash.map(function (v) { return v * lw; }));
      ctx.beginPath(); ctx.moveTo(e.source.x, e.source.y); ctx.lineTo(e.target.x, e.target.y); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    visible.forEach(function (n) {
      var dim = focus && focus.indexOf(n) === -1;
      var hit = matches(n);
      ctx.globalAlpha = dim && !hit ? 0.15 : 1;
      ctx.beginPath();
      if (n.type === 'ort' || n.type === 'name') ctx.rect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);   // text nodes: squares
      else ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = TYPES[n.type].color; ctx.fill();
      ctx.lineWidth = (n === selected || hit ? 3 : 1.5) * lw;
      ctx.strokeStyle = n === selected || hit ? INK : 'rgba(22,22,29,.55)';
      if (n.persoenlich) ctx.setLineDash([3 * lw, 2 * lw]);
      ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.globalAlpha = 1;
    // labels in screen space so they stay readable
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    visible.forEach(function (n) {
      var show = n === hover || n === selected || matches(n) ||
        (focus && focus.indexOf(n) !== -1) ||
        (!focus && (view.k > 1.6 || (view.k > 0.7 && (n.type === 'projekt' || n.type === 'partner') && n.links.length > 2)));
      if (!show) return;
      var s = toScreen(n), t = n.title.length > 42 ? n.title.slice(0, 40) + '…' : n.title;
      var x = s.x + n.r * view.k + 4, w = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(250,248,243,.85)'; ctx.fillRect(x - 2, s.y - 8, w + 4, 16);
      ctx.fillStyle = INK; ctx.fillText(t, x, s.y);
    });
  }

  // ---------- selection & panel ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // grouped button list of nodes, used for a node's connections and for a timeline month
  function groupedList(items, roleOf) {
    var html = '', groups = {};
    items.forEach(function (m) { (groups[m.type] = groups[m.type] || []).push(m); });
    Object.keys(TYPES).forEach(function (type) {
      if (!groups[type]) return;
      html += '<h3>' + TYPES[type].label + '</h3><ul class="link-list link-list-connections">';
      groups[type].sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title); })
        .forEach(function (m) {
          var role = roleOf && roleOf(m), roleTxt = role === 'besitz' || role === 'standort' ? ' <span class="link-meta">' + KIND[role].label + '</span>' : '';
          html += '<li><a href="' + esc(m.url || '#') + '" data-node="' + esc(m.id) + '"><span aria-hidden="true">' + TYPES[type].icon + '</span> ' + esc(m.title) +
            (m.persoenlich ? ' <span class="link-private">persönlich</span>' : '') + roleTxt + '</a></li>';
        });
      html += '</ul>';
    });
    return html;
  }
  function select(n, center) {
    selected = n;
    period = null;
    renderTimeline();
    if (!n) {
      panel.innerHTML = '<p class="muted">Klicke auf einen Punkt, um seine Verbindungen zu sehen. Mit dem Mausrad zoomen, den Hintergrund ziehen zum Verschieben.</p>';
      if (location.hash) history.replaceState(null, '', location.pathname);
      draw(); return;
    }
    if (visible.indexOf(n) === -1) { visible.push(n); }
    var t = TYPES[n.type];
    var html = '<p class="meta"><span class="netz-dot" style="background:' + t.color + '"></span> ' + t.one +
      (n.date ? ' · ' + n.date.split('-').reverse().join('.') : '') + (n.persoenlich ? ' · <span class="link-private">persönlich</span>' : '') + '</p>' +
      '<h2>' + esc(n.title) + '</h2>' +
      (n.url ? '<p><a class="btn" href="' + esc(n.url) + '"' + (n.extern ? ' target="_blank" rel="noopener"' : '') + '>Seite öffnen →</a></p>' : '');
    html += groupedList(n.links, function (m) { return n.kinds[m.id]; });
    if (!n.links.length) html += '<p class="muted">Noch keine Verbindungen.</p>';
    panel.innerHTML = html;
    history.replaceState(null, '', '#' + n.id);
    if (center) flyTo(n);
    draw();
  }
  panel.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[data-node]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;   // modifier keys: open the page
    ev.preventDefault();
    select(byId[norm(a.getAttribute('data-node'))] || null, true);
  });

  function flyTo(n) {
    anim = { from: { x: view.x, y: view.y, k: view.k }, to: { x: n.x, y: n.y, k: Math.max(view.k, 1.2) }, t: 0 };
    reheat(0.05);
  }
  function animate() {
    anim.t = Math.min(1, anim.t + 0.06);
    var e = 1 - Math.pow(1 - anim.t, 3);
    view.x = anim.from.x + (anim.to.x - anim.from.x) * e;
    view.y = anim.from.y + (anim.to.y - anim.from.y) * e;
    view.k = anim.from.k + (anim.to.k - anim.from.k) * e;
    if (anim.t >= 1) anim = null;
  }
  function fit() {
    if (!visible.length) return;
    // ignore the outermost 5 % so a lone far-away pair does not shrink everything
    var xs = visible.map(function (n) { return n.x; }).sort(function (a, b) { return a - b; });
    var ys = visible.map(function (n) { return n.y; }).sort(function (a, b) { return a - b; });
    var lo = Math.floor(xs.length * 0.05), hi = Math.max(lo, Math.ceil(xs.length * 0.95) - 1);
    var x0 = xs[lo], x1 = xs[hi], y0 = ys[lo], y1 = ys[hi];
    view.x = (x0 + x1) / 2; view.y = (y0 + y1) / 2;
    view.k = Math.min(2, 0.9 * Math.min(W / (x1 - x0 + 60), H / (y1 - y0 + 60)));
    draw();
  }

  // ---------- pointer input ----------
  function nodeAt(sx, sy) {
    var p = toWorld(sx, sy), best = null, bd = Infinity;
    visible.forEach(function (n) {
      var dx = n.x - p.x, dy = n.y - p.y, d = dx * dx + dy * dy, r = n.r + 4 / view.k;
      if (d < r * r && d < bd) { bd = d; best = n; }
    });
    return best;
  }
  var dragNode = null, panning = null, moved = false, pointers = {}, pinch = null;
  function pos(ev) { var r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  canvas.addEventListener('pointerdown', function (ev) {
    canvas.setPointerCapture(ev.pointerId);
    var p = pos(ev); pointers[ev.pointerId] = p; moved = false; anim = null;
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k }; dragNode = null; panning = null; return;
    }
    dragNode = nodeAt(p.x, p.y);
    if (dragNode) reheat(0.3); else panning = { x: p.x, y: p.y, vx: view.x, vy: view.y };
  });
  canvas.addEventListener('pointermove', function (ev) {
    var p = pos(ev);
    if (pointers[ev.pointerId]) pointers[ev.pointerId] = p;
    if (pinch) {
      var ids = Object.keys(pointers); if (ids.length < 2) return;
      var a = pointers[ids[0]], b = pointers[ids[1]];
      view.k = Math.max(0.15, Math.min(5, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); moved = true; draw(); return;
    }
    if (dragNode) { var w = toWorld(p.x, p.y); dragNode.x = w.x; dragNode.y = w.y; moved = true; reheat(0.3); return; }
    if (panning) {
      if (Math.abs(p.x - panning.x) + Math.abs(p.y - panning.y) > 3) moved = true;
      view.x = panning.vx - (p.x - panning.x) / view.k; view.y = panning.vy - (p.y - panning.y) / view.k; draw(); return;
    }
    var h = nodeAt(p.x, p.y);
    if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; draw(); }
  });
  function up(ev) {
    var p = pos(ev);
    delete pointers[ev.pointerId];
    if (pinch) { if (Object.keys(pointers).length < 2) pinch = null; return; }
    if (!moved) { var n = nodeAt(p.x, p.y); select(n === selected ? null : n); }
    dragNode = null; panning = null;
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('dblclick', function (ev) {
    var p = pos(ev), n = nodeAt(p.x, p.y);
    if (n && n.url) window.location.href = n.url;
  });
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault(); anim = null;
    var p = pos(ev), before = toWorld(p.x, p.y);
    view.k = Math.max(0.15, Math.min(5, view.k * Math.exp(-ev.deltaY * 0.0015)));
    var after = toWorld(p.x, p.y);
    view.x += before.x - after.x; view.y += before.y - after.y;
    draw();
  }, { passive: false });
  window.addEventListener('resize', resize);

  // ---------- timeline (stacked bars per month, below the graph) ----------
  // stack order bottom -> top; chosen so similar hues (green/teal) never touch
  var TL_TYPES = ['projekt', 'beitrag', 'termin', 'presse'];
  var TL_LABEL = { projekt: 'Projektstarts', beitrag: 'Beiträge', termin: 'Termine', presse: 'Presse' };
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var SVGNS = 'http://www.w3.org/2000/svg';
  var tlSvg = document.getElementById('netz-zeit-svg');
  var tlBox = document.getElementById('netz-zeit');
  var tlScroll = document.getElementById('netz-zeit-scroll');
  var tlAxis = document.getElementById('netz-zeit-achse');
  var tlTip = document.getElementById('netz-zeit-tip');
  var tlTable = document.getElementById('netz-zeit-tabelle');
  var tlLegend = document.getElementById('netz-zeit-legende');
  var dated = nodes.filter(function (n) { return TL_TYPES.indexOf(n.type) !== -1 && /^\d{4}-\d{2}/.test(n.date || ''); });
  function monthKey(n) { return n.date.slice(0, 7); }
  function monthName(key) { return MONTHS[+key.slice(5, 7) - 1] + ' ' + key.slice(0, 4); }
  var today = new Date();
  var todayKey = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2);

  // columns are computed once from all dated items so the frame stays put while filtering;
  // runs of 4+ empty months collapse into a narrow break
  var tlCols = (function () {
    if (!dated.length) return [];
    var keys = dated.map(monthKey).sort(), used = {};
    keys.forEach(function (k) { used[k] = 1; });
    var first = keys[0], last = keys[keys.length - 1] < todayKey ? todayKey : keys[keys.length - 1];
    var y = +first.slice(0, 4), m = +first.slice(5, 7), all = [];
    for (;;) {
      var k = y + '-' + ('0' + m).slice(-2);
      all.push(k);
      if (k >= last) break;
      if (++m > 12) { m = 1; y++; }
    }
    var cols = [], run = [];
    function flush() {
      if (run.length >= 4 && run.indexOf(todayKey) === -1) cols.push({ gap: true, from: run[0], to: run[run.length - 1] });
      else run.forEach(function (k) { cols.push({ key: k }); });
      run = [];
    }
    all.forEach(function (k) { if (used[k] || k === todayKey) { flush(); cols.push({ key: k }); } else run.push(k); });
    flush();
    return cols;
  })();

  if (tlLegend) {
    TL_TYPES.forEach(function (t) {
      if (!dated.some(function (n) { return n.type === t; })) return;
      var s = document.createElement('span');
      s.className = 'netz-zeit-key';
      s.innerHTML = '<span class="netz-zeit-swatch" style="background:' + TYPES[t].color + '"></span>';
      s.appendChild(document.createTextNode(TL_LABEL[t]));
      tlLegend.appendChild(s);
    });
    var f = document.createElement('span');
    f.className = 'netz-zeit-key';
    f.innerHTML = '<span class="netz-zeit-swatch netz-zeit-swatch-future"></span>';
    f.appendChild(document.createTextNode('geplant (nach heute)'));
    tlLegend.appendChild(f);
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    Object.keys(attrs).forEach(function (a) { e.setAttribute(a, attrs[a]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  // bar segment with optional 4px rounded top, square at the bottom
  function segPath(x, y, w, h, round) {
    var r = round ? Math.min(4, h, w / 2) : 0;
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + (r ? 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y : '') +
      'H' + (x + w - r) + (r ? 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) : '') + 'V' + (y + h) + 'Z';
  }
  function niceStep(max) {
    var steps = [1, 2, 5, 10, 20, 50, 100];
    for (var i = 0; i < steps.length; i++) if (max / steps[i] <= 4) return steps[i];
    return 200;
  }

  function renderTimeline() {
    if (!tlSvg) return;
    if (!tlCols.length) { tlBox.hidden = true; return; }
    var focusIds = null;
    if (selected) { focusIds = {}; [selected].concat(selected.links).forEach(function (m) { focusIds[m.id] = 1; }); }
    else if (period) { focusIds = {}; period.nodes.forEach(function (m) { focusIds[m.id] = 1; }); }

    // counts per month and type: [focused, other]
    var bins = {};
    dated.forEach(function (n) {
      if (!isVisible(n)) return;
      var b = bins[monthKey(n)] = bins[monthKey(n)] || { total: 0 };
      b.total++;
      var c = b[n.type] = b[n.type] || [0, 0];
      c[focusIds && !focusIds[n.id] ? 1 : 0]++;
    });
    var maxV = 1;
    Object.keys(bins).forEach(function (k) { maxV = Math.max(maxV, bins[k].total); });
    var step = niceStep(maxV), top = Math.ceil(maxV / step) * step;

    var PAD_L = 6, PAD_T = 18, PLOT_H = 150, AXIS_H = 36, COL = 24, BAR = 16, GAP_COL = 20, AXIS_W = 28;
    var width = PAD_L + tlCols.reduce(function (s, c) { return s + (c.gap ? GAP_COL : COL); }, 0) + 30;
    var height = PAD_T + PLOT_H + AXIS_H, base = PAD_T + PLOT_H, unit = PLOT_H / top;
    [tlSvg, tlAxis].forEach(function (s) { while (s.firstChild) s.removeChild(s.firstChild); });
    tlSvg.setAttribute('width', width); tlSvg.setAttribute('height', height);
    tlSvg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    // y axis lives in its own svg outside the scroll area so the ticks never scroll away
    tlAxis.setAttribute('width', AXIS_W); tlAxis.setAttribute('height', height);
    tlAxis.setAttribute('viewBox', '0 0 ' + AXIS_W + ' ' + height);

    for (var v = 0; v <= top; v += step) {      // recessive grid + y ticks
      var gy = base - v * unit;
      el('line', { x1: 0, x2: width - 4, y1: gy, y2: gy, class: v ? 'tl-grid' : 'tl-base' }, tlSvg);
      el('text', { x: AXIS_W - 6, y: gy, class: 'tl-ytick' }, tlAxis).textContent = v;
    }
    var behind = el('g', {}, tlSvg);             // today marker sits behind the bars

    var x = PAD_L, lastYear = null;
    tlCols.forEach(function (c) {
      if (c.gap) {                               // collapsed empty stretch
        var gx = x + GAP_COL / 2;
        el('path', { d: 'M' + (gx - 5) + ',' + (base + 4) + 'l3,-8 m4,8 l3,-8', class: 'tl-break' }, tlSvg);
        var g = el('g', {}, tlSvg);
        el('title', {}, g).textContent = 'Keine Einträge von ' + monthName(c.from) + ' bis ' + monthName(c.to);
        el('rect', { x: x, y: PAD_T, width: GAP_COL, height: PLOT_H + 18, class: 'tl-hit-gap' }, g);
        x += GAP_COL; return;
      }
      var k = c.key, b = bins[k], bx = x + (COL - BAR) / 2, y = base, future = k > todayKey;
      var segs = [];
      if (b) TL_TYPES.forEach(function (t) {
        if (!b[t]) return;
        if (b[t][0]) segs.push({ t: t, n: b[t][0], dim: false });
        if (b[t][1]) segs.push({ t: t, n: b[t][1], dim: true });
      });
      segs.forEach(function (s, i) {
        var h = s.n * unit, gapPx = i ? 2 : 0;      // 2px surface gap between segments
        el('path', {
          d: segPath(bx, y - h, BAR, Math.max(1, h - gapPx), i === segs.length - 1),
          fill: TYPES[s.t].color,
          class: 'tl-seg' + (s.dim ? ' tl-dim' : '') + (future ? ' tl-future' : '')
        }, tlSvg);
        y -= h;
      });
      // x axis: month initial, year under January and under the first column
      var yr = k.slice(0, 4), mo = +k.slice(5, 7);
      el('text', { x: x + COL / 2, y: base + 14, class: 'tl-xtick' + (k === todayKey ? ' tl-now' : '') }, tlSvg).textContent = MONTHS[mo - 1].charAt(0);
      if (yr !== lastYear) {
        if (lastYear) el('line', { x1: x, x2: x, y1: base, y2: base + 34, class: 'tl-grid' }, tlSvg);
        el('text', { x: x + 3, y: base + 31, class: 'tl-year' }, tlSvg).textContent = yr;
        lastYear = yr;
      }
      if (k === todayKey) {
        var tx = x + (COL - BAR) / 2 + BAR * (today.getDate() / 31);
        el('line', { x1: tx, x2: tx, y1: PAD_T - 4, y2: base, class: 'tl-today' }, behind);
        el('text', { x: tx + 3, y: PAD_T - 6, class: 'tl-today-label' }, tlSvg).textContent = 'heute';
      }
      // hit target: the whole column, keyboard reachable
      var label = monthName(k) + ': ' + (b ? TL_TYPES.filter(function (t) { return b[t]; }).map(function (t) {
        return (b[t][0] + b[t][1]) + ' ' + TL_LABEL[t];
      }).join(', ') : 'nichts');
      var hit = el('rect', {
        x: x, y: PAD_T, width: COL, height: PLOT_H + 18, class: 'tl-hit' + (period && period.key === k ? ' tl-active' : ''),
        role: 'button', 'aria-label': label + (b ? ' – im Netzwerk markieren' : '')
      }, tlSvg);
      if (b) hit.setAttribute('tabindex', '0'); else hit.setAttribute('aria-disabled', 'true');
      hit._bin = b; hit._key = k;
      x += COL;
    });

    // table view: same numbers, reachable without hovering
    if (tlTable) {
      var keys = Object.keys(bins).sort().reverse();
      var html = '<table class="netz-zeit-table"><thead><tr><th scope="col">Monat</th>' +
        TL_TYPES.map(function (t) { return '<th scope="col">' + TL_LABEL[t] + '</th>'; }).join('') + '<th scope="col">Summe</th></tr></thead><tbody>';
      keys.forEach(function (k) {
        var b = bins[k];
        html += '<tr><th scope="row"><a href="#zeit:' + k + '" data-month="' + k + '">' + monthName(k) + '</a>' + (k > todayKey ? ' <span class="link-meta">geplant</span>' : '') + '</th>' +
          TL_TYPES.map(function (t) { return '<td>' + (b[t] ? b[t][0] + b[t][1] : '') + '</td>'; }).join('') + '<td>' + b.total + '</td></tr>';
      });
      tlTable.innerHTML = html + '</tbody></table>';
    }
  }

  function showTip(hit) {
    var b = hit._bin;
    if (!b) { tlTip.hidden = true; return; }
    tlTip.textContent = '';
    var h = document.createElement('p'); h.className = 'netz-zeit-tip-title';
    h.textContent = monthName(hit._key) + (hit._key > todayKey ? ' (geplant)' : '');
    tlTip.appendChild(h);
    TL_TYPES.slice().reverse().forEach(function (t) {    // same order as the stack, top first
      if (!b[t]) return;
      var row = document.createElement('p'); row.className = 'netz-zeit-tip-row';
      var key = document.createElement('span'); key.className = 'netz-zeit-tip-key'; key.style.borderTopColor = TYPES[t].color;
      var val = document.createElement('strong'); val.textContent = b[t][0] + b[t][1];
      row.appendChild(key); row.appendChild(val); row.appendChild(document.createTextNode(' ' + TL_LABEL[t]));
      tlTip.appendChild(row);
    });
    tlTip.hidden = false;
    var r = hit.getBoundingClientRect(), box = tlBox.getBoundingClientRect();
    var left = r.right - box.left + 6;
    if (left + tlTip.offsetWidth > box.width) left = r.left - box.left - tlTip.offsetWidth - 6;
    tlTip.style.left = Math.max(0, left) + 'px';
    tlTip.style.top = (r.top - box.top) + 'px';
  }
  function selectPeriod(key) {
    if (period && period.key === key) { select(null); return; }
    var items = dated.filter(function (n) { return monthKey(n) === key && isVisible(n); });
    if (!items.length) return;
    selected = null;
    period = { key: key, nodes: items };
    items.forEach(function (n) { if (visible.indexOf(n) === -1) visible.push(n); });
    panel.innerHTML = '<p class="meta">Zeitleiste' + (key > todayKey ? ' · geplant' : '') + '</p><h2>' + esc(monthName(key)) + '</h2>' +
      '<p class="muted">' + items.length + (items.length === 1 ? ' Eintrag' : ' Einträge') + ' – im Netzwerk hervorgehoben.</p>' + groupedList(items);
    history.replaceState(null, '', '#zeit:' + key);
    renderTimeline();
    // pan the graph to the middle of the month's nodes
    var cx = 0, cy = 0;
    items.forEach(function (n) { cx += n.x; cy += n.y; });
    anim = { from: { x: view.x, y: view.y, k: view.k }, to: { x: cx / items.length, y: cy / items.length, k: view.k }, t: 0 };
    reheat(0.05);
  }
  function scrollTimeline() {
    var mark = tlSvg && tlSvg.querySelector('.tl-today');
    if (mark) tlScroll.scrollLeft = Math.max(0, +mark.getAttribute('x1') + 100 - tlScroll.clientWidth);   // keep today and a few planned months in view
  }
  if (tlSvg) {
    tlSvg.addEventListener('pointerover', function (ev) { if (ev.target._key) showTip(ev.target); });
    tlSvg.addEventListener('pointerleave', function () { tlTip.hidden = true; });
    tlSvg.addEventListener('focusin', function (ev) { if (ev.target._key) showTip(ev.target); });
    tlSvg.addEventListener('focusout', function () { tlTip.hidden = true; });
    tlSvg.addEventListener('click', function (ev) { if (ev.target._bin) selectPeriod(ev.target._key); });
    tlSvg.addEventListener('keydown', function (ev) {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target._bin) { ev.preventDefault(); selectPeriod(ev.target._key); }
    });
    tlScroll.addEventListener('scroll', function () { tlTip.hidden = true; });
  }
  if (tlTable) tlTable.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[data-month]');
    if (!a) return;
    ev.preventDefault();
    selectPeriod(a.getAttribute('data-month'));
    document.getElementById('netz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- start ----------
  resize();
  refilter();
  for (var i = 0; i < 300; i++) step();      // settle before the first frame
  alpha = 0.1;
  fit();
  var hash = decodeURIComponent(location.hash.slice(1));
  var start = hash && byId[norm(hash)];
  if (start) { select(start); view.x = start.x; view.y = start.y; view.k = 1.3; draw(); }
  else if (/^zeit:\d{4}-\d{2}$/.test(hash)) selectPeriod(hash.slice(5));
  scrollTimeline();
})();
