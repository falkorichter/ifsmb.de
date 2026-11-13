// Options page: site address, person and quadrant for new todos (chrome.storage.sync).
(function () {
  var form = document.getElementById("form");
  var felder = ["basis", "person", "feld"];
  chrome.storage.sync.get(TODO_STANDARD).then(function (e) {
    felder.forEach(function (k) { document.getElementById(k).value = e[k] || ""; });
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var e = {};
    felder.forEach(function (k) { e[k] = document.getElementById(k).value.trim(); });
    if (!/^https?:\/\//i.test(e.basis)) e.basis = "https://" + e.basis;
    e.basis = e.basis.replace(/\/*$/, "/");
    e.person = e.person.toLowerCase();
    chrome.storage.sync.set(e).then(function () {
      document.getElementById("basis").value = e.basis;
      document.getElementById("status").textContent = "Gespeichert ✓";
      setTimeout(function () { document.getElementById("status").textContent = ""; }, 2000);
    });
  });
})();
