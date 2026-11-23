// Builds the address that creates a new todo on the todo page (handled by neuAusHash in assets/js/todos.js).
// Everything goes into the #fragment, which the browser never sends to the server.
// Shared by the service worker (importScripts) and the Node test (require).
var TODO_STANDARD = { base: "https://ifsmb.de/", person: "", field: "q2" };
var TODO_MAX_TEXT = 4000;

function todoLink(o) {
  var base = String(o.base || TODO_STANDARD.base).trim().replace(/\/*$/, "/");
  var text = String(o.text || "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > TODO_MAX_TEXT) text = text.slice(0, TODO_MAX_TEXT) + " …";
  var p = new URLSearchParams();
  if (o.person) p.set("person", o.person);
  if (o.field) p.set("field", o.field);
  if (o.title) p.set("title", o.title);
  if (text) p.set("text", text);
  if (/^https?:\/\//i.test(o.source || "")) {
    p.set("source", o.source);
    if (o.sourceTitle) p.set("source_title", o.sourceTitle);
  }
  return base + "todos/#new?" + p.toString();
}

if (typeof module !== "undefined") module.exports = { todoLink: todoLink, TODO_STANDARD: TODO_STANDARD };
