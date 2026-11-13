// Builds the address that creates a new todo on the todo page (handled by neuAusHash in assets/js/todos.js).
// Everything goes into the #fragment, which the browser never sends to the server.
// Shared by the service worker (importScripts) and the Node test (require).
var TODO_STANDARD = { basis: "https://ifsmb.de/", person: "", feld: "q2" };
var TODO_MAX_TEXT = 4000;

function todoLink(o) {
  var basis = String(o.basis || TODO_STANDARD.basis).trim().replace(/\/*$/, "/");
  var text = String(o.text || "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > TODO_MAX_TEXT) text = text.slice(0, TODO_MAX_TEXT) + " …";
  var p = new URLSearchParams();
  if (o.person) p.set("person", o.person);
  if (o.feld) p.set("feld", o.feld);
  if (o.titel) p.set("titel", o.titel);
  if (text) p.set("text", text);
  if (/^https?:\/\//i.test(o.quelle || "")) {
    p.set("quelle", o.quelle);
    if (o.quelleTitel) p.set("quelle_titel", o.quelleTitel);
  }
  return basis + "todos/#neu?" + p.toString();
}

if (typeof module !== "undefined") module.exports = { todoLink: todoLink, TODO_STANDARD: TODO_STANDARD };
