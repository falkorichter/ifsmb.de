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
    reheat(0.5);
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
  var selected = null, hover = null, anim = null;
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
    var focus = selected ? [selected].concat(selected.links) : null;
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
  function select(n, center) {
    selected = n;
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
    var groups = {};
    n.links.forEach(function (m) { (groups[m.type] = groups[m.type] || []).push(m); });
    Object.keys(TYPES).forEach(function (type) {
      if (!groups[type]) return;
      html += '<h3>' + TYPES[type].label + '</h3><ul class="link-list link-list-connections">';
      groups[type].sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title); })
        .forEach(function (m) {
          var role = n.kinds[m.id], roleTxt = role === 'besitz' || role === 'standort' ? ' <span class="link-meta">' + KIND[role].label + '</span>' : '';
          html += '<li><a href="' + esc(m.url || '#') + '" data-node="' + esc(m.id) + '"><span aria-hidden="true">' + TYPES[type].icon + '</span> ' + esc(m.title) +
            (m.persoenlich ? ' <span class="link-private">persönlich</span>' : '') + roleTxt + '</a></li>';
        });
      html += '</ul>';
    });
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

  // ---------- start ----------
  resize();
  refilter();
  for (var i = 0; i < 300; i++) step();      // settle before the first frame
  alpha = 0.1;
  fit();
  var start = location.hash && byId[norm(decodeURIComponent(location.hash.slice(1)))];
  if (start) { select(start); view.x = start.x; view.y = start.y; view.k = 1.3; draw(); }
})();
