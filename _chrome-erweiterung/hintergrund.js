// Service worker: right-click menu "Neues Todo aus Auswahl" on selected text.
// Opens the todo page with the selection, the page address (quelle) and its title; the page creates the todo
// in the browser draft and opens the editor. Settings (site, person, quadrant) come from optionen.html.
importScripts("todo-link.js");

var MENU_ID = "ifsmb-todo-aus-auswahl";

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({ id: MENU_ID, title: "Neues Todo aus „%s“", contexts: ["selection"] });
  });
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});

function einstellungen() {
  return chrome.storage.sync.get(TODO_STANDARD);
}

// Chrome's selectionText drops line breaks; read the selection from the page when allowed (activeTab),
// otherwise (PDF viewer, chrome:// pages) fall back to selectionText.
function auswahlLesen(tab, info) {
  if (!tab || tab.id == null || !chrome.scripting) return Promise.resolve(info.selectionText || "");
  return chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: info.frameId != null ? [info.frameId] : undefined },
    func: function () { var s = window.getSelection(); return s ? s.toString() : ""; }
  }).then(function (res) {
    var t = res && res[0] && res[0].result;
    return t && t.trim() ? t : (info.selectionText || "");
  }).catch(function () { return info.selectionText || ""; });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId !== MENU_ID) return;
  Promise.all([einstellungen(), auswahlLesen(tab, info)]).then(function (r) {
    var e = r[0];
    var url = todoLink({
      basis: e.basis, person: e.person, feld: e.feld, text: r[1],
      quelle: info.pageUrl,   // the tab's address, also when the text sits in an iframe
      quelleTitel: tab && tab.title
    });
    chrome.tabs.create({ url: url, index: tab ? tab.index + 1 : undefined, openerTabId: tab ? tab.id : undefined });
  });
});

// Toolbar button: open the todo page of the configured person.
chrome.action.onClicked.addListener(function () {
  einstellungen().then(function (e) {
    chrome.tabs.create({ url: String(e.basis || TODO_STANDARD.basis).replace(/\/*$/, "/") + "todos/" + (e.person ? "#" + e.person : "") });
  });
});
