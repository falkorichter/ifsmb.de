// Three-way merge of content files (front matter + Markdown) in the browser – no dependencies.
//
// base   = the file as it was when the form was loaded
// mine   = the file the form would write now
// theirs = the file as it is now on main or on an open pull request's branch
//
// Front matter is merged per key (blocks from Formular.splitFile), the body line by line (diff3). Changes that don't
// overlap are combined automatically; overlapping ones become conflicts the form can show with options.
//
// FileMerge.merge(base, mine, theirs) → {
//   conflicts: [{ id, where: "field" | "text", key?, base, mine, theirs }],   // strings (raw YAML block or lines)
//   build(choices) → merged file text; choices = { <id>: "mine" | "theirs" | "both" } (default "mine")
// }
// Runs in Node too (for tests): FileMerge = require("./assets/js/merge.js") with Formular required before.
var FileMerge = (function () {
  "use strict";
  var F = typeof Formular !== "undefined" ? Formular : (typeof require !== "undefined" ? require("./formular.js") : null);

  function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }

  // longest common subsequence of two line arrays → Map(indexInA → indexInB), increasing in both
  function lcs(a, b) {
    var n = a.length, m = b.length, w = m + 1, dp = new Uint32Array((n + 1) * w), i, j;
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
    var map = new Map();
    for (i = 0, j = 0; i < n && j < m;) {
      if (a[i] === b[j]) { map.set(i, j); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
      else j++;
    }
    return map;
  }

  // one region where base, mine and theirs differ → resolved lines or a conflict
  function resolve(B, A, T) {
    if (same(A, B)) return { lines: T };
    if (same(T, B) || same(A, T)) return { lines: A };
    return { conflict: { base: B, mine: A, theirs: T } };
  }

  // diff3 on lines → list of parts: { lines } or { conflict }
  function diff3(base, mine, theirs) {
    var m1 = lcs(base, mine), m2 = lcs(base, theirs), parts = [], i = 0, a = 0, b = 0;
    for (;;) {
      var k = i;
      while (k < base.length && !(m1.has(k) && m2.has(k))) k++; // next line unchanged in all three
      var am = k < base.length ? m1.get(k) : mine.length, bm = k < base.length ? m2.get(k) : theirs.length;
      var B = base.slice(i, k), A = mine.slice(a, am), T = theirs.slice(b, bm);
      if (B.length || A.length || T.length) parts.push(resolve(B, A, T));
      if (k >= base.length) break;
      parts.push({ lines: [base[k]] });
      i = k + 1; a = am + 1; b = bm + 1;
    }
    return parts;
  }

  // two raw blocks of the same key mean the same (e.g. `title: "A"` and `title: A`)?
  function sameValue(a, b) {
    var x = F.yamlValue(a), y = F.yamlValue(b);
    return x !== undefined && y !== undefined && JSON.stringify(x) === JSON.stringify(y);
  }

  // List fields (tags, team, partners …) changed on both sides: merge as sets – theirs + what I added − what I removed.
  // → raw block, or null if it's not a list or one side adds what the other removes (then it stays a conflict).
  function mergeList(key, B, A, T) {
    function list(raw) { if (raw === "") return []; var v = F.yamlValue(raw); return Array.isArray(v) ? v : v === "" ? [] : null; }
    var b = list(B), a = list(A), t = list(T);
    if (!b || !a || !t) return null;
    var added = a.filter(function (x) { return b.indexOf(x) < 0; }), removed = b.filter(function (x) { return a.indexOf(x) < 0; });
    var theirsAdded = t.filter(function (x) { return b.indexOf(x) < 0; }), theirsRemoved = b.filter(function (x) { return t.indexOf(x) < 0; });
    if (added.some(function (x) { return theirsRemoved.indexOf(x) >= 0; }) || removed.some(function (x) { return theirsAdded.indexOf(x) >= 0; })) return null;
    var out = t.filter(function (x) { return removed.indexOf(x) < 0; });
    added.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    return out.length ? key + ": " + F.yamlListe(out) : "";
  }

  // front matter blocks → ordered keys + Map(key → raw); comments and other unkeyed blocks get a key from their text
  function blocks(text) {
    var f = F.splitFile(text);
    if (!f) return null;
    var keys = [], map = new Map();
    f.blocks.forEach(function (bl) {
      var k = bl.key || "#" + bl.raw;
      if (map.has(k)) k += "#" + keys.length;
      keys.push(k); map.set(k, bl.raw);
    });
    return { keys: keys, map: map, body: f.rest };
  }

  // plain YAML data files (_data/partner/*.yml …): merge per top-level key like front matter
  var YAML_START = /^[A-Za-z_][\w-]*\s*:/;
  function isYamlData(t) { return !/^---\n/.test(t) && (t === "" || YAML_START.test(t)); }
  function wrap(t) { return "---\n" + (t === "" || /\n$/.test(t) ? t : t + "\n") + "---\n"; }
  function unwrap(t) { return t.replace(/^---\n/, "").replace(/---\n$/, "").replace(/^---\n?$/, ""); }

  function merge(base, mine, theirs) {
    if (isYamlData(base) && isYamlData(mine) && isYamlData(theirs) && (base + mine + theirs).trim() !== "") {
      var r = mergeFile(wrap(base), wrap(mine), wrap(theirs));
      return { conflicts: r.conflicts, build: function (choices) { return unwrap(r.build(choices)); } };
    }
    return mergeFile(base, mine, theirs);
  }

  function mergeFile(base, mine, theirs) {
    var fb = blocks(base), fm = blocks(mine), ft = blocks(theirs), conflicts = [], parts = [], n = 0;
    function add(c) { c.id = "k" + (++n); conflicts.push(c); parts.push({ conflict: c }); }
    var body = { base: base, mine: mine, theirs: theirs };
    if (fb && fm && ft) {
      // order: theirs, then keys only mine added (placed after the key before them in mine)
      var order = ft.keys.slice();
      fm.keys.forEach(function (k, idx) {
        if (order.indexOf(k) >= 0 || fb.map.has(k)) return; // exists already, or deleted by theirs (decided below)
        var prev = fm.keys.slice(0, idx).reverse().filter(function (p) { return order.indexOf(p) >= 0; })[0];
        order.splice(prev ? order.indexOf(prev) + 1 : order.length, 0, k);
      });
      fb.keys.forEach(function (k) { if (order.indexOf(k) < 0 && fm.map.has(k) && fm.map.get(k) !== fb.map.get(k)) order.push(k); }); // theirs deleted, mine changed
      order.forEach(function (k) {
        var B = fb.map.has(k) ? [fb.map.get(k)] : [], A = fm.map.has(k) ? [fm.map.get(k)] : [], T = ft.map.has(k) ? [ft.map.get(k)] : [];
        var r = resolve(B, A, T);
        if (r.conflict && k.charAt(0) !== "#" && A.length && T.length && sameValue(A[0], T[0])) {
          parts.push({ field: T }); return; // same value, only written differently (quotes, list style) → keep theirs
        }
        if (r.conflict && k.charAt(0) !== "#") {
          var merged = mergeList(k, B.join(""), A.join(""), T.join(""));
          if (merged !== null) { parts.push({ field: merged === "" ? [] : [merged] }); return; }
        }
        if (r.conflict) add({ where: "field", key: k.charAt(0) === "#" ? null : k, base: B.join(""), mine: A.join(""), theirs: T.join("") });
        else parts.push({ field: r.lines });
      });
      body = { base: fb.body, mine: fm.body, theirs: ft.body };
    }
    var frontParts = parts; parts = [];
    diff3(body.base.split("\n"), body.mine.split("\n"), body.theirs.split("\n")).forEach(function (p) {
      if (p.conflict) add({ where: "text", base: p.conflict.base.join("\n"), mine: p.conflict.mine.join("\n"), theirs: p.conflict.theirs.join("\n") });
      else parts.push(p);
    });
    var bodyParts = parts;

    function pick(c, choice) {
      if (choice === "theirs") return c.theirs;
      if (choice === "both" && c.where === "text") return [c.theirs, c.mine].filter(function (x) { return x !== ""; }).join("\n");
      return c.mine;
    }
    function build(choices) {
      choices = choices || {};
      var lines = [];
      bodyParts.forEach(function (p) {
        if (!p.conflict) { lines = lines.concat(p.lines); return; }
        var t = pick(p.conflict, choices[p.conflict.id]);
        if (t !== "" || p.conflict.base === "") lines = lines.concat(t === "" ? [] : t.split("\n"));
      });
      var bodyText = lines.join("\n");
      if (!(fb && fm && ft)) return bodyText;
      var raws = [];
      frontParts.forEach(function (p) {
        var raw = p.conflict ? pick(p.conflict, choices[p.conflict.id]) : p.field.join("");
        if (raw !== "") raws.push(raw);
      });
      return F.joinFile(raws, bodyText);
    }
    return { conflicts: conflicts, build: build };
  }

  return { merge: merge, diff3: diff3 };
})();
if (typeof module !== "undefined") module.exports = FileMerge;
