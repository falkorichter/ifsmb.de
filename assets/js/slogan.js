/*
  Rotating slogan on the homepage.
  <h1 class="slogan" data-slogans='["Line 1\n**Line 2**", …]'>
  Slogans are maintained in _data/slogans.yml; index.html renders them as a JSON list into data-slogans.
  Each slogan: one line per "\n", **bold** = highlighted (.hl), anywhere in the text.
  The first slogan is plain HTML inside the <h1> (search engines, no JavaScript).
  "Scramble" effect (like jugendhackt.org): letters flicker briefly as random glyphs, then the new text settles.
*/
(function () {
  var h1 = document.querySelector('h1.slogan');
  if (!h1 || !h1.dataset.slogans) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var texts;
  try { texts = JSON.parse(h1.dataset.slogans); } catch (e) { return; }
  if (!Array.isArray(texts) || texts.length < 2) return;

  // "Line 1\n**Line 2**" -> [[{ch, hl}, …], …] (one array of characters per line)
  function parse(text) {
    return String(text).trim().split('\n').map(function (line) {
      var cells = [];
      line.split('**').forEach(function (part, i) {
        part.split('').forEach(function (ch) { cells.push({ ch: ch, hl: i % 2 === 1 }); });
      });
      return cells;
    });
  }

  var slogans = texts.map(parse);
  var HOLD = 4000;            // how long a slogan stays (ms)
  var current = 0;

  h1.setAttribute('aria-live', 'polite');

  // Reserve the height of the tallest slogan so the page doesn't jump
  function reserveHeight() {
    var html = h1.innerHTML, max = 0;
    h1.style.minHeight = '';
    slogans.forEach(function (s) { render(s); max = Math.max(max, h1.offsetHeight); });
    h1.innerHTML = html;
    h1.style.minHeight = max + 'px';
  }

  // Final state: consecutive characters with the same highlight become one text node / span.hl
  function render(lines) {
    h1.innerHTML = '';
    lines.forEach(function (cells, i) {
      if (i) h1.appendChild(document.createElement('br'));
      var run = '', hl = false;
      function flush() {
        if (!run) return;
        if (hl) {
          var span = document.createElement('span');
          span.className = 'hl';
          span.textContent = run;
          h1.appendChild(span);
        } else {
          h1.appendChild(document.createTextNode(run));
        }
        run = '';
      }
      cells.forEach(function (c) {
        if (c.hl !== hl) { flush(); hl = c.hl; }
        run += c.ch;
      });
      flush();
    });
  }

  var BLANK = { ch: ' ', hl: false };
  function pad(cells, n) { cells = cells.slice(); while (cells.length < n) cells.push(BLANK); return cells; }

  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?!<>/_';

  function animate(from, to, done) {
    var nLines = Math.max(from.length, to.length), lines = [];
    h1.innerHTML = '';
    for (var l = 0; l < nLines; l++) {
      var f = from[l] || [], t = to[l] || [], n = Math.max(f.length, t.length);
      f = pad(f, n); t = pad(t, n);
      if (l) h1.appendChild(document.createElement('br'));
      var lineEl = document.createElement('span'), cells = [], word = null;
      for (var i = 0; i < n; i++) {
        // Word boundaries follow the target text
        if (!word || t[i].ch === ' ' || (i && t[i - 1].ch === ' ')) {
          word = document.createElement('span'); word.className = 'slogan-word'; lineEl.appendChild(word);
        }
        var c = document.createElement('span');
        c.className = 'slogan-char' + (t[i].hl ? ' hl-char' : '');
        c.textContent = f[i].ch;
        word.appendChild(c);
        cells.push(c);
      }
      h1.appendChild(lineEl);
      lines.push({ from: f, to: t, cells: cells });
    }

    var start = null, total = 0, idx = 0;
    // Per character: start time (left to right) and duration
    lines.forEach(function (ln) {
      ln.plan = ln.cells.map(function (c, i) {
        var p = { t0: idx * 35 };
        idx++;
        p.dur = ln.from[i].ch === ln.to[i].ch && ln.to[i].ch === ' ' ? 0 : 350 + Math.random() * 300;
        total = Math.max(total, p.t0 + p.dur);
        return p;
      });
    });

    function frame(ts) {
      if (start === null) start = ts;
      var t = ts - start;
      lines.forEach(function (ln) {
        ln.plan.forEach(function (p, i) {
          var cell = ln.cells[i], target = ln.to[i].ch, ch;
          if (t < p.t0) return;
          if (t >= p.t0 + p.dur) { ch = target; cell.classList.remove('scrambling'); }
          else {
            ch = target === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            cell.classList.add('scrambling');
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
      setTimeout(next, HOLD);
    });
  }

  reserveHeight();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { h1.style.minHeight = ''; }, 100); });
  setTimeout(next, HOLD);
})();
