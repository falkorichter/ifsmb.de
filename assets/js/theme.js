// Theme picker in the footer (_layouts/default.html, themes from _data/themes.yml, styles in assets/css/themes.css).
// The choice overrides the page's `theme:` and is kept in localStorage["ifsmb-theme"] – no cookie, nothing is sent.
// An inline script in <head> applies it before the first paint; this file only wires up the <select>.
(function () {
  "use strict";
  var KEY = "ifsmb-theme";
  var root = document.documentElement;
  var picker = document.querySelector("[data-theme-picker]");
  if (!picker) return;
  var select = picker.querySelector("select");

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function isTheme(id) {
    return !!id && Array.prototype.some.call(select.options, function (o) { return o.value === id; });
  }

  var current = stored();
  // ?theme=… with blocked storage: show what the head script applied
  if (!isTheme(current) && root.getAttribute("data-theme") !== root.getAttribute("data-page-theme")) current = root.getAttribute("data-theme");
  select.value = isTheme(current) ? current : "";
  picker.hidden = false;

  select.addEventListener("change", function () {
    var id = select.value;
    try {
      if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY);
    } catch (e) { /* storage blocked: the choice still applies to this page */ }
    root.setAttribute("data-theme", id || root.getAttribute("data-page-theme") || "ifsmb");
  });
})();
