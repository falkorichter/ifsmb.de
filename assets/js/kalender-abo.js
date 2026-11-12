// Calendar dialog from _includes/kalender-abo.html.
// The opener is a link to the .ics file; with <dialog> support it opens the dialog instead.
(function () {
  var d = document.getElementById('abonnieren');
  if (!d || typeof d.showModal !== 'function') return;
  document.querySelectorAll('[data-abo]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      d.showModal();
    });
  });
  // close on a click on the backdrop
  d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
  // <page>#abonnieren opens the dialog right away
  if (location.hash === '#abonnieren') d.showModal();
})();
