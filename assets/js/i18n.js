// UI language (German, English, French) for the site chrome – not for the content, which stays German.
// - The small inline script in _layouts/default.html picks the language before the first paint: ?lang=<de|en|fr>
//   (stored as the visitor's choice), else the stored choice (localStorage "ifsmb-language"), else the first entry of
//   navigator.languages that starts with de/en/fr, else English. It sets <html lang> and data-ui-language, and while
//   the language is not German it hides the elements to translate (class i18n-pending) until this script ran.
// - German is in the HTML (rendered at build time from _data/i18n/de.yml by _plugins/i18n.rb). Here the elements
//   with data-i18n get the strings of the chosen language from window.I18N_STRINGS (assets/js/i18n-strings.js):
//     data-i18n="key"                    text; with element children, {0}, {1} … in the string stand for them
//     data-i18n-attr="title:key;aria-label:key2"   attributes
//     data-i18n-params='{"n":3}'         parameters {n} (a { one, other } value picks the plural form by n;
//                                        "@key" as a value = that UI string)
//     data-i18n-date (on <time datetime>), data-i18n-event='{"s":…,"e":…,"a":true}'   dates of posts and events
// - The content area (main) gets lang="de" when the UI language differs, translated elements inside it the UI
//   language – for screen readers and hyphenation.
// - JS-made UI calls I18n.t(key, params) and listens to the "i18n:change" event on document.
// The choice stays in this browser; nothing is sent anywhere, no cookie (see /impressum/#datenschutz).
(function () {
  "use strict";
  var KEY = "ifsmb-language", LANGUAGES = ["de", "en", "fr"];
  var LOCALES = { de: "de-DE", en: "en-GB", fr: "fr-FR" };
  var STRINGS = window.I18N_STRINGS || {};
  var root = document.documentElement;
  var current = root.getAttribute("data-ui-language");
  if (LANGUAGES.indexOf(current) < 0) current = "de";
  var originals = typeof WeakMap === "function" ? new WeakMap() : null; // German date texts as rendered

  function lookup(language, key) {
    var node = STRINGS[language];
    String(key).split(".").forEach(function (part) { node = node && typeof node === "object" ? node[part] : undefined; });
    return node;
  }

  function t(key, params) {
    params = params || {};
    var v = lookup(current, key);
    if (v == null) v = lookup("de", key);
    if (v == null) return key;
    if (typeof v === "object") {
      var form = "other";
      try { form = new Intl.PluralRules(LOCALES[current]).select(Number(params.n)); } catch (e) { form = Number(params.n) === 1 ? "one" : "other"; }
      v = v[form] != null ? v[form] : v.other;
    }
    // a parameter "@key" is itself a UI string (e.g. the quadrant name in the matrix ➕ buttons)
    return String(v).replace(/\{(\w+)\}/g, function (m, name) {
      var p = params[name];
      if (p == null) return m;
      return typeof p === "string" && p.charAt(0) === "@" ? t(p.slice(1)) : String(p);
    });
  }

  function paramsOf(el) {
    var p = el.getAttribute("data-i18n-params");
    if (!p) return {};
    try { return JSON.parse(p); } catch (e) { return {}; }
  }

  // text with {0}, {1} … → the element's children (kept from the first run) in that order
  function fillWithChildren(el, s) {
    if (!el.i18nChildren) el.i18nChildren = Array.prototype.slice.call(el.children);
    var kids = el.i18nChildren;
    while (el.firstChild) el.removeChild(el.firstChild);
    s.split(/(\{\d+\})/).forEach(function (part) {
      var m = part.match(/^\{(\d+)\}$/);
      if (m && kids[+m[1]]) el.appendChild(kids[+m[1]]);
      else if (part) el.appendChild(document.createTextNode(part));
    });
  }

  // a translated element inside the German content area gets the UI language as its own lang
  function markLanguage(el) {
    var near = el.parentElement && el.parentElement.closest("[lang]");
    if (current !== "de" && near && near.lang !== current) { el.lang = current; el.setAttribute("data-i18n-lang", ""); }
    else if (el.hasAttribute("data-i18n-lang")) { el.removeAttribute("lang"); el.removeAttribute("data-i18n-lang"); }
  }

  function formatDate(iso, kind) {
    var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00Z" : iso);
    if (isNaN(d)) return null;
    var o = kind === "month" ? { month: "short" } : current === "de" ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" };
    o.timeZone = "Europe/Berlin";
    return new Intl.DateTimeFormat(LOCALES[current], o).format(d);
  }
  function formatEvent(ev) {
    var tz = "Europe/Berlin", s = new Date(ev.s), e = ev.e ? new Date(ev.e) : null;
    if (isNaN(s)) return null;
    if (e && isNaN(e)) e = null;
    var day = new Intl.DateTimeFormat(LOCALES[current], { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: tz });
    var time = new Intl.DateTimeFormat(LOCALES[current], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    var sameDay = !e || day.format(s) === day.format(e);
    if (ev.a) return day.format(s) + (sameDay ? "" : " – " + day.format(e));
    if (!sameDay) return day.format(s) + ", " + time.format(s) + " – " + day.format(e) + ", " + time.format(e);
    return day.format(s) + " · " + time.format(s) + (e ? "–" + time.format(e) : "");
  }
  // dates: German stays exactly as rendered, the other languages are formatted with Intl
  function setDateText(el, make) {
    if (originals && !originals.has(el)) originals.set(el, el.textContent);
    var text = current === "de" && originals ? originals.get(el) : make();
    if (text) el.textContent = text;
  }

  function each(scope, selector, fn) {
    var list = scope.querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) fn(list[i]);
    if (scope.matches && scope.matches(selector)) fn(scope);
  }

  // Translate everything below scope (default: the whole page); JS UIs call it for elements they create.
  function apply(scope) {
    scope = scope || document;
    if (scope === document) {
      root.lang = current;
      root.setAttribute("data-ui-language", current);
      // the content stays German
      each(document, "main, [data-pagefind-body]", function (el) {
        if (current === "de") { if (el.hasAttribute("data-i18n-content")) { el.removeAttribute("lang"); el.removeAttribute("data-i18n-content"); } }
        else if (!el.hasAttribute("lang") || el.hasAttribute("data-i18n-content")) { el.lang = "de"; el.setAttribute("data-i18n-content", ""); }
      });
    }
    each(scope, "[data-i18n]", function (el) {
      var s = t(el.getAttribute("data-i18n"), paramsOf(el));
      if (el.children.length || el.i18nChildren) fillWithChildren(el, s); else el.textContent = s;
      markLanguage(el);
    });
    each(scope, "[data-i18n-attr]", function (el) {
      var p = paramsOf(el);
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var i = pair.indexOf(":");
        if (i > 0) el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim(), p));
      });
    });
    each(scope, "[data-i18n-date]", function (el) {
      setDateText(el, function () { return formatDate(el.getAttribute("datetime") || el.getAttribute("data-i18n-date"), el.getAttribute("data-i18n-date-format")); });
    });
    each(scope, "[data-i18n-event]", function (el) {
      setDateText(el, function () { try { return formatEvent(JSON.parse(el.getAttribute("data-i18n-event"))); } catch (e) { return null; } });
    });
    each(scope, "[data-language]", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-language") === current)); });
  }

  function setLanguage(language) {
    if (LANGUAGES.indexOf(language) < 0) return;
    try { localStorage.setItem(KEY, language); } catch (e) { /* storage blocked: only for this page */ }
    if (language === current) return;
    current = language;
    apply();
    var ev;
    try { ev = new CustomEvent("i18n:change", { detail: { language: current } }); } catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("i18n:change", false, false, { language: current }); }
    document.dispatchEvent(ev);
  }

  window.I18n = {
    t: t, apply: apply, set: setLanguage, languages: LANGUAGES,
    language: function () { return current; },
    locale: function () { return LOCALES[current]; },
    formatDate: function (iso, kind) { return formatDate(iso, kind); }
  };

  function start() {
    if (current !== "de") apply();
    else each(document, "[data-language]", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-language") === current)); });
    root.classList.remove("i18n-pending");
    each(document, "[data-language-switch]", function (box) {
      box.hidden = false;
      box.addEventListener("click", function (e) {
        var b = e.target.closest("[data-language]");
        if (b) setLanguage(b.getAttribute("data-language"));
      });
    });
  }
  // deferred: the document is parsed already
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
