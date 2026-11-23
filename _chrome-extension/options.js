// Options page: site address, person and quadrant for new todos (chrome.storage.sync).
(function () {
  var form = document.getElementById("form");
  var felder = ["base", "person", "field"];
  chrome.storage.sync.get(TODO_STANDARD).then(function (e) {
    felder.forEach(function (k) { document.getElementById(k).value = e[k] || ""; });
  });
  // Open the todo page of the saved person (the toolbar popup replaces the former icon click).
  document.getElementById("oeffnen").addEventListener("click", function () {
    chrome.storage.sync.get(TODO_STANDARD).then(function (e) {
      chrome.tabs.create({ url: String(e.base || TODO_STANDARD.base).replace(/\/*$/, "/") + "todos/" + (e.person ? "#" + e.person : "") });
      window.close();
    });
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var e = {};
    felder.forEach(function (k) { e[k] = document.getElementById(k).value.trim(); });
    if (!/^https?:\/\//i.test(e.base)) e.base = "https://" + e.base;
    e.base = e.base.replace(/\/*$/, "/");
    e.person = e.person.toLowerCase();
    chrome.storage.sync.set(e).then(function () {
      document.getElementById("base").value = e.base;
      document.getElementById("status").textContent = "Gespeichert ✓";
      setTimeout(function () { document.getElementById("status").textContent = ""; }, 2000);
    });
  });
})();
