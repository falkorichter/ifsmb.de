/*
  Wechselnder Slogan auf der Startseite.
  <h1 class="slogan" data-effekt="scramble|fallblatt" data-slogans="Zeile 1|Zeile 2;;Zeile 1|Zeile 2">
  Die Slogans stehen in data-slogans (";;" trennt Slogans, "|" trennt die Zeilen; Zeile 2 ist hervorgehoben).
  Der erste Slogan steht als normales HTML im <h1> (für Suchmaschinen und ohne JavaScript).
  Zum Ausprobieren: ?effekt=scramble oder ?effekt=fallblatt an die URL hängen.
*/
(function () {
  var h1 = document.querySelector('h1.slogan');
  if (!h1 || !h1.dataset.slogans) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var slogans = h1.dataset.slogans.split(';;').map(function (s) { return s.split('|'); });
  var m = location.search.match(/[?&]effekt=(scramble|fallblatt)/);
  var effekt = m ? m[1] : (h1.dataset.effekt || 'scramble');
  var HALTEN = 4000;          // so lange bleibt ein Slogan stehen (ms)
  var current = 0;

  h1.setAttribute('aria-live', 'polite');
  h1.classList.add('slogan-' + effekt);

  // Höhe für den längsten Slogan reservieren, damit die Seite nicht springt
  function reserveHeight() {
    var html = h1.innerHTML, max = 0;
    h1.style.minHeight = '';
    slogans.forEach(function (s) { render(s); max = Math.max(max, h1.offsetHeight); });
    h1.innerHTML = html;
    h1.style.minHeight = max + 'px';
  }

  function render(lines) {
    h1.innerHTML = '';
    lines.forEach(function (text, i) {
      if (i) h1.appendChild(document.createElement('br'));
      var span = document.createElement('span');
      if (i === lines.length - 1 && lines.length > 1) span.className = 'hl';
      span.textContent = text;
      h1.appendChild(span);
    });
  }

  // Leere Zeichen-Spans für eine Zeile (Wortgruppen setzt animate)
  function buildLine(len, hl) {
    var line = document.createElement('span'), cells = [];
    if (hl) line.className = 'hl';
    for (var i = 0; i < len; i++) {
      var c = document.createElement('span');
      c.className = 'slogan-char';
      cells.push(c);
    }
    return { el: line, cells: cells };
  }

  function pad(s, n) { while (s.length < n) s += ' '; return s; }

  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?!<>/_';
  var FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789.,-!?';

  function flapSteps(from, to) {
    var a = FLAPS.indexOf(from), b = FLAPS.indexOf(to), seq = [];
    if (a < 0) a = 0;
    if (b < 0) return [to];
    var dist = (b - a + FLAPS.length) % FLAPS.length;
    var skip = Math.max(1, Math.ceil(dist / 9));   // höchstens ~9 Klappen pro Buchstabe
    for (var k = skip; k < dist; k += skip) seq.push(FLAPS[(a + k) % FLAPS.length]);
    seq.push(to);
    return seq;
  }

  function animate(from, to, done) {
    var nLines = Math.max(from.length, to.length), lines = [];
    h1.innerHTML = '';
    for (var l = 0; l < nLines; l++) {
      var f = from[l] || '', t = to[l] || '', n = Math.max(f.length, t.length);
      f = pad(f, n); t = pad(t, n);
      if (l) h1.appendChild(document.createElement('br'));
      var line = buildLine(n, l === nLines - 1 && nLines > 1);
      // Wortgrenzen nach dem Ziel-Text setzen
      var word = null;
      for (var i = 0; i < n; i++) {
        if (!word || t[i] === ' ' || (i && t[i - 1] === ' ')) {
          word = document.createElement('span'); word.className = 'slogan-word'; line.el.appendChild(word);
        }
        word.appendChild(line.cells[i]);
        line.cells[i].textContent = f[i];
      }
      h1.appendChild(line.el);
      lines.push({ from: f, to: t, cells: line.cells });
    }

    var start = null, total = 0, idx = 0;
    // Pro Zeichen: Startzeit (von links nach rechts) und Schritte
    lines.forEach(function (ln) {
      ln.plan = ln.cells.map(function (c, i) {
        var p = { t0: idx * (effekt === 'fallblatt' ? 45 : 35) };
        idx++;
        if (effekt === 'fallblatt') {
          p.steps = ln.from[i] === ln.to[i] ? [] : flapSteps(ln.from[i], ln.to[i]);
          p.dur = p.steps.length * 55;
        } else {
          p.dur = ln.from[i] === ln.to[i] && ln.to[i] === ' ' ? 0 : 350 + Math.random() * 300;
        }
        p.last = -1;
        total = Math.max(total, p.t0 + p.dur);
        return p;
      });
    });

    function frame(ts) {
      if (start === null) start = ts;
      var t = ts - start;
      lines.forEach(function (ln) {
        ln.plan.forEach(function (p, i) {
          var cell = ln.cells[i], ch;
          if (t < p.t0) return;
          if (effekt === 'fallblatt') {
            var k = Math.min(p.steps.length - 1, Math.floor((t - p.t0) / 55));
            if (k < 0 || k === p.last) return;
            p.last = k;
            ch = p.steps[k];
            cell.classList.remove('flip'); void cell.offsetWidth; cell.classList.add('flip');
          } else {
            if (t >= p.t0 + p.dur) { ch = ln.to[i]; cell.classList.remove('scrambling'); }
            else {
              ch = ln.to[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              cell.classList.add('scrambling');
            }
          }
          if (cell.textContent !== ch) cell.textContent = ch;
        });
      });
      if (t < total + 60) requestAnimationFrame(frame);
      else { render(to); done(); }
    }
    requestAnimationFrame(frame);
  }

  function next() {
    var from = slogans[current];
    current = (current + 1) % slogans.length;
    animate(from, slogans[current], function () {
      if (!h1.style.minHeight) reserveHeight();
      setTimeout(next, HALTEN);
    });
  }

  reserveHeight();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { h1.style.minHeight = ''; }, 100); });
  setTimeout(next, HALTEN);
})();
