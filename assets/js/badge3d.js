/* 3D view of the IfsMB badges – WebGL, no library and no external resources.
 *
 * <figure class="badge-3d" data-model="/assets/badge/ifsmb-badge-falko.obj">
 *   <img src="…-oben.png" alt="…">      preview image, stays when there is no JS/WebGL
 * </figure>
 *
 * Loads the OBJ (groups "gelb" and "schwarz" from _logo/badge/export_colored.py), turns the badge
 * slowly around the vertical axis and lets people rotate it by dragging (mouse/finger). Only runs
 * while visible; with "reduce motion" it stands still (dragging still works).
 */
(function () {
  "use strict";
  if (window.Badge3D) return;
  window.Badge3D = true;

  // object names in the OBJ files (German, as people see them in the slicer) → RGB
  var COLORS = { gelb: [1, 0.8, 0], schwarz: [0.086, 0.086, 0.114] };
  var DEFAULT_COLOR = [0.6, 0.6, 0.6];
  var REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- OBJ -> flat triangles with normals and colours -----------------------------------
  function parseObj(text) {
    var vertices = [], pos = [], nor = [], col = [], color = DEFAULT_COLOR;
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    text.split("\n").forEach(function (line) {
      var t = line.trim().split(/\s+/);
      if (t[0] === "v") {
        var p = [+t[1], +t[2], +t[3]];
        vertices.push(p);
        for (var k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
      } else if (t[0] === "o" || t[0] === "g" || t[0] === "usemtl") {
        color = COLORS[t[1]] || color;
      } else if (t[0] === "f") {
        var ix = t.slice(1).map(function (s) { return parseInt(s, 10) - 1; });
        for (var i = 1; i + 1 < ix.length; i++) {      // split polygons into triangles
          var a = vertices[ix[0]], b = vertices[ix[i]], c = vertices[ix[i + 1]];
          var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          var n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
          var l = Math.hypot(n[0], n[1], n[2]) || 1;
          [a, b, c].forEach(function (p) {
            pos.push(p[0], p[1], p[2]);
            nor.push(n[0] / l, n[1] / l, n[2] / l);
            col.push(color[0], color[1], color[2]);
          });
        }
      }
    });
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), min: min, max: max };
  }

  // ---- matrices (column-major, like WebGL) ------------------------------------------------
  function mul(a, b) {
    var r = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      r[i * 4 + j] = s;
    }
    return r;
  }
  function translate(x, y, z) { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); }
  function rotateX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
  function rotateY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
  function perspective(fov, aspect, near, far) {
    var f = 1 / Math.tan(fov / 2), d = 1 / (near - far);
    return new Float32Array([f / aspect,0,0,0, 0,f,0,0, 0,0,(near + far) * d,-1, 0,0,2 * near * far * d,0]);
  }

  var VS =
    "attribute vec3 p; attribute vec3 n; attribute vec3 c;" +
    "uniform mat4 mvp; uniform mat4 m;" +
    "varying vec3 vn; varying vec3 vc;" +
    "void main() { gl_Position = mvp * vec4(p, 1.0); vn = (m * vec4(n, 0.0)).xyz; vc = c; }";
  var FS =
    "precision mediump float; varying vec3 vn; varying vec3 vc;" +
    "void main() {" +
    "  vec3 N = normalize(vn); if (!gl_FrontFacing) N = -N;" +
    "  vec3 L = normalize(vec3(0.45, 0.65, 1.0));" +
    "  float diff = max(dot(N, L), 0.0);" +
    "  float spec = pow(max(dot(N, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 48.0);" +
    "  gl_FragColor = vec4(vc * (0.38 + 0.7 * diff) + vec3(0.35 * spec), 1.0);" +
    "}";

  function compileShader(gl, type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function attribute(gl, prog, name, data) {
    var buffer = gl.createBuffer(), location = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  }

  function start(fig, model) {
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    attribute(gl, prog, "p", model.pos);
    attribute(gl, prog, "n", model.nor);
    attribute(gl, prog, "c", model.col);
    var uMvp = gl.getUniformLocation(prog, "mvp"), uM = gl.getUniformLocation(prog, "m");
    var count = model.pos.length / 3;
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    var center = [0, 1, 2].map(function (k) { return (model.min[k] + model.max[k]) / 2; });
    // distance from half width/height: turning around the vertical axis never makes the badge wider than from the front
    var halfW = (model.max[0] - model.min[0]) / 2, halfH = (model.max[1] - model.min[1]) / 2;
    var FOV = 0.5, MARGIN = 1.25;   // margin so the near edge isn't cut off while turning (perspective)

    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", (fig.querySelector("img") || {}).alt || "3D-Modell des Badges");
    canvas.title = "Zum Drehen ziehen";
    fig.classList.add("badge-3d-active");
    fig.appendChild(canvas);

    var angle = REDUCED_MOTION ? -0.45 : 0, tilt = -0.12, running = false, visible = true;
    var drag = null, pauseUntil = 0, last = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      return w / Math.max(h, 1);
    }

    function draw() {
      var aspect = resize();
      var m = mul(rotateX(tilt), mul(rotateY(angle), translate(-center[0], -center[1], -center[2])));
      var d = Math.max(halfW / aspect, halfH) / Math.tan(FOV / 2) * MARGIN;
      var mvp = mul(perspective(FOV, aspect, d / 10, d * 3), mul(translate(0, 0, -d), m));
      gl.uniformMatrix4fv(uMvp, false, mvp);
      gl.uniformMatrix4fv(uM, false, m);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }

    function frame(t) {
      if (!running) return;
      var dt = last ? Math.min(t - last, 100) : 0;
      last = t;
      if (!REDUCED_MOTION && !drag && t > pauseUntil) angle += dt * 0.0006;   // one turn in ~10 s
      draw();
      requestAnimationFrame(frame);
    }
    function play() { if (!running && visible) { running = true; last = 0; requestAnimationFrame(frame); } }
    function stop() { running = false; }

    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, angle: angle, tilt: tilt };
      canvas.setPointerCapture(e.pointerId);
      play();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      angle = drag.angle + (e.clientX - drag.x) * 0.01;
      tilt = Math.max(-1.2, Math.min(1.2, drag.tilt + (e.clientY - drag.y) * 0.01));
      if (REDUCED_MOTION) draw();
    });
    function release() { drag = null; pauseUntil = performance.now() + 2500; }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !REDUCED_MOTION) play(); else stop();
        if (visible && REDUCED_MOTION) draw();
      }).observe(canvas);
    }
    window.addEventListener("resize", function () { if (!running) draw(); });
    draw();
    if (!REDUCED_MOTION) play();
  }

  function init() {
    var figs = document.querySelectorAll(".badge-3d[data-model]");
    Array.prototype.forEach.call(figs, function (fig) {
      fetch(fig.getAttribute("data-model"))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (text) { start(fig, parseObj(text)); })
        .catch(function () { /* preview image stays */ });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
