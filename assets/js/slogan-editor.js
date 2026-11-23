/*
  Slogan editor (_includes/slogan-editor.html): live preview of a proposed homepage slogan and
  "copy and open on GitHub" – the current _data/slogans.yml (from /source/…) plus the new entry
  goes to the clipboard, GitHub's editor for the file opens in a new tab. Format as in _data/slogans.yml:
  one line per line, **bold** = highlighted.
*/
(function () {
  var box = document.getElementById('slogan-vorschlagen');
  if (!box) return;
  var feld = box.querySelector('#slogan-text');
  var vorschau = box.querySelector('.slogan-preview');
  var hinweis = box.querySelector('.slogan-editor-hinweis');
  var status = box.querySelector('.slogan-editor-status');
  var fallback = box.querySelector('.slogan-editor-fallback');
  var github = box.querySelector('[data-aktion="github"]');
  var beispiele = [];
  try { beispiele = JSON.parse(document.getElementById('slogan-beispiele').textContent); } catch (e) {}

  var MAX_ZEILE = 25; // longer lines wrap on phones

  function zeilen() {
    return feld.value.split('\n').map(function (z) { return z.trim(); }).filter(Boolean);
  }

  // One line -> DOM nodes, **bold** parts as span.hl
  function zeileRendern(ziel, zeile) {
    zeile.split('**').forEach(function (teil, i) {
      if (!teil) return;
      if (i % 2 === 1) {
        var s = document.createElement('span');
        s.className = 'hl';
        s.textContent = teil;
        ziel.appendChild(s);
      } else ziel.appendChild(document.createTextNode(teil));
    });
  }

  function pruefen(z) {
    var probleme = [];
    if (z.some(function (l) { return (l.split('**').length - 1) % 2 === 1; })) probleme.push('Ein ** ist nicht geschlossen – Hervorhebungen brauchen ** davor und dahinter.');
    if (z.length > 3) probleme.push('Mehr als drei Zeilen werden auf der Startseite sehr hoch.');
    if (z.some(function (l) { return l.replace(/\*\*/g, '').length > MAX_ZEILE; })) probleme.push('Eine Zeile ist länger als ' + MAX_ZEILE + ' Zeichen und bricht auf dem Handy um.');
    if (z.length && !/\*\*/.test(z.join(''))) probleme.push('Tipp: Mit **…** wird ein Teil gelb hervorgehoben.');
    return probleme;
  }

  function aktualisieren() {
    var z = zeilen();
    vorschau.innerHTML = '';
    if (!z.length) {
      vorschau.innerHTML = '<span class="muted">Hier erscheint dein Slogan.</span>';
    } else {
      z.forEach(function (zeile, i) {
        if (i) vorschau.appendChild(document.createElement('br'));
        zeileRendern(vorschau, zeile);
      });
    }
    var p = pruefen(z);
    hinweis.hidden = !p.length;
    hinweis.textContent = p.join(' ');
    status.textContent = '';
    fallback.hidden = true;
  }

  // YAML entry in the format of _data/slogans.yml
  function eintrag(z) {
    return '- text: |\n' + z.map(function (l) { return '    ' + l + '\n'; }).join('');
  }

  function cfg() {
    try { return JSON.parse(document.getElementById('formular-daten').textContent); } catch (e) { return null; }
  }

  function kopieren(text, url) {
    function oeffnen(msg) { status.textContent = msg; window.open(url, '_blank', 'noopener'); }
    function manuell(msg) { fallback.textContent = text; fallback.hidden = false; oeffnen(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { oeffnen(text.indexOf('- text:') === 0
          ? 'Kopiert: dein Eintrag. Auf GitHub ganz unten in der Datei einfügen und „Propose changes“ klicken.'
          : 'Kopiert: die ganze Datei mit deinem Slogan. Auf GitHub alles markieren, einfügen und „Propose changes“ klicken.'); },
        function () { manuell('Kopieren ging nicht – bitte den Text unten kopieren und auf GitHub einfügen.'); });
    } else manuell('Bitte den Text unten kopieren und auf GitHub einfügen.');
  }

  // Load the current file right away: the clipboard write must happen directly in the click (Safari)
  var dateiInhalt = null;
  if (window.fetch) {
    fetch(box.dataset.source, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { dateiInhalt = t; })
      .catch(function () {});
  }

  github.addEventListener('click', function (e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // plain link to GitHub
    e.preventDefault();
    var z = zeilen();
    if (!z.length) { status.textContent = 'Schreib zuerst deinen Slogan ins Feld.'; feld.focus(); return; }
    var c = cfg(), url = github.href;
    if (c) url = c.github + '/edit/' + c.branch + '/' + box.dataset.datei;
    var neu = eintrag(z);
    // Without the current file (still loading or failed) only the entry is copied
    kopieren(dateiInhalt ? dateiInhalt.replace(/\s*$/, '\n') + neu : neu, url);
  });

  // Wrap the selection in ** (or remove it)
  function fett() {
    var a = feld.selectionStart, b = feld.selectionEnd, v = feld.value;
    if (a === b) { // no selection: whole current line
      a = v.lastIndexOf('\n', a - 1) + 1;
      b = v.indexOf('\n', b); if (b < 0) b = v.length;
    }
    var sel = v.slice(a, b);
    var neu = /^\*\*[\s\S]*\*\*$/.test(sel) ? sel.slice(2, -2) : '**' + sel + '**';
    feld.value = v.slice(0, a) + neu + v.slice(b);
    feld.focus();
    feld.setSelectionRange(a, a + neu.length);
    aktualisieren();
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-aktion]');
    if (!b) return;
    if (b.dataset.aktion === 'fett') fett();
    if (b.dataset.aktion === 'zufall' && beispiele.length) {
      feld.value = String(beispiele[Math.floor(Math.random() * beispiele.length)]).trim();
      aktualisieren();
    }
  });
  feld.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); fett(); }
  });
  feld.addEventListener('input', aktualisieren);
  aktualisieren();
})();
