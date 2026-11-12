// Dialogs from _includes/kalender-abo.html and _includes/feed-abo.html.
// Each opener is a link (to the .ics file or the feed) with data-abo="<dialog id>";
// with <dialog> support it opens that dialog instead. Included once per dialog, so guard.
(function () {
  if (window.ifsmbAbo) return;
  window.ifsmbAbo = true;
  document.querySelectorAll('[data-abo]').forEach(function (a) {
    var d = document.getElementById(a.dataset.abo);
    if (!d || typeof d.showModal !== 'function') return;
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      d.showModal();
    });
  });
  document.querySelectorAll('dialog.abo-dialog').forEach(function (d) {
    if (typeof d.showModal !== 'function') return;
    // close on a click on the backdrop
    d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
    // <page>#<dialog id> opens the dialog right away
    if (location.hash === '#' + d.id) d.showModal();
  });
  // "Kopieren" buttons: copy the feed address
  document.querySelectorAll('[data-kopieren]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = b.textContent;
      var done = function () {
        b.textContent = 'Kopiert ✓';
        setTimeout(function () { b.textContent = label; }, 2000);
      };
      var fallback = function () {
        var input = b.parentNode.querySelector('input');
        if (input) { input.select(); if (document.execCommand('copy')) done(); }
      };
      if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.kopieren).then(done, fallback);
      else fallback();
    });
  });
})();
