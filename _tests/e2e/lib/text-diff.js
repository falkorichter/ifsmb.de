// Line diff and three-way merge (diff3) for the fake GitHub and the test assertions. No dependencies.
"use strict";

// "a\nb\n" → ["a\n", "b\n"]; keeps the line endings so joining gives back the exact text
function split(text) { return String(text).match(/[^\n]*\n|[^\n]+$/g) || []; }

// For every line of X the index of the matching line in Y (longest common subsequence), or -1.
function lcsMap(X, Y) {
  const m = new Array(X.length).fill(-1);
  let s = 0;
  while (s < X.length && s < Y.length && X[s] === Y[s]) { m[s] = s; s++; }
  let e = 0;
  while (e < X.length - s && e < Y.length - s && X[X.length - 1 - e] === Y[Y.length - 1 - e]) { m[X.length - 1 - e] = Y.length - 1 - e; e++; }
  const xs = X.slice(s, X.length - e), ys = Y.slice(s, Y.length - e), n = xs.length, k = ys.length;
  if (!n || !k) return m;
  const L = new Int32Array((n + 1) * (k + 1)), w = k + 1;
  for (let i = n - 1; i >= 0; i--) for (let j = k - 1; j >= 0; j--)
    L[i * w + j] = xs[i] === ys[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
  let i = 0, j = 0;
  while (i < n && j < k) {
    if (xs[i] === ys[j]) { m[s + i] = s + j; i++; j++; }
    else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) i++;
    else j++;
  }
  return m;
}

// → { added: [lines], removed: [lines], ops: [{ t: " " | "-" | "+", line }], patch } (lines without "\n")
function diffLines(a, b) {
  const A = split(a), B = split(b), m = lcsMap(A, B), ops = [];
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && m[i] === j) { ops.push({ t: " ", line: A[i], a: i, b: j }); i++; j++; }
    else if (i < A.length && m[i] === -1) { ops.push({ t: "-", line: A[i], a: i, b: j }); i++; }
    else { ops.push({ t: "+", line: B[j], a: i, b: j }); j++; }
  }
  const strip = (l) => l.replace(/\n$/, "");
  return {
    added: ops.filter((o) => o.t === "+").map((o) => strip(o.line)),
    removed: ops.filter((o) => o.t === "-").map((o) => strip(o.line)),
    ops: ops.map((o) => ({ t: o.t, line: strip(o.line) })),
    patch: patch(ops, strip)
  };
}

// unified diff hunks with 3 lines of context, like the "patch" field of GitHub's PR files
function patch(ops, strip) {
  const changed = ops.map((o, n) => (o.t !== " " ? n : -1)).filter((n) => n >= 0);
  if (!changed.length) return "";
  const hunks = [];
  let start = Math.max(0, changed[0] - 3), end = Math.min(ops.length, changed[0] + 4);
  for (const n of changed.slice(1)) {
    if (n - 3 <= end) end = Math.min(ops.length, n + 4);
    else { hunks.push([start, end]); start = Math.max(0, n - 3); end = Math.min(ops.length, n + 4); }
  }
  hunks.push([start, end]);
  return hunks.map(([s, e]) => {
    const part = ops.slice(s, e);
    const aLen = part.filter((o) => o.t !== "+").length, bLen = part.filter((o) => o.t !== "-").length;
    return "@@ -" + (ops[s].a + 1) + "," + aLen + " +" + (ops[s].b + 1) + "," + bLen + " @@\n" + part.map((o) => o.t + strip(o.line)).join("\n");
  }).join("\n");
}

// Three-way merge like git: changes on both sides merge if they touch different lines (with a stable line in
// between); overlapping or adjacent changes conflict. → { text } or { conflict: true }
function merge3(o, a, b) {
  const O = split(o), A = split(a), B = split(b), ma = lcsMap(O, A), mb = lcsMap(O, B), out = [];
  const eq = (x, y) => x.length === y.length && x.every((l, n) => l === y[n]);
  let i = 0, j = 0, k = 0;
  for (;;) {
    while (i < O.length && ma[i] === j && mb[i] === k) { out.push(O[i]); i++; j++; k++; }
    if (i >= O.length && j >= A.length && k >= B.length) break;
    let i2 = i;
    while (i2 < O.length && (ma[i2] < 0 || mb[i2] < 0)) i2++;
    const j2 = i2 < O.length ? ma[i2] : A.length, k2 = i2 < O.length ? mb[i2] : B.length;
    const oc = O.slice(i, i2), ac = A.slice(j, j2), bc = B.slice(k, k2);
    if (eq(ac, oc)) out.push(...bc);
    else if (eq(bc, oc) || eq(ac, bc)) out.push(...ac);
    else return { conflict: true };
    i = i2; j = j2; k = k2;
  }
  return { text: out.join("") };
}

module.exports = { split, diffLines, merge3 };
