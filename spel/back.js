// Liten "← Spel"-knapp i nedre vänstra hörnet som leder tillbaka till spelsidan.
// Laddas av varje spel med <script src="/spel/back.js" defer></script> före </body>.
// Ligger något av spelets egna knappar i hörnet flyttas den upp precis ovanför.
(function () {
  if (window.top !== window) return; // inte inuti en iframe
  var a = document.createElement('a');
  a.href = '/spel/';
  a.textContent = '← Spel';
  a.setAttribute('aria-label', 'Tillbaka till spelsidan på chriswhippit.com');
  a.style.cssText = [
    'position:fixed', 'left:8px', 'bottom:8px', 'z-index:2147483000',
    'padding:5px 10px', 'border-radius:0', 'font:600 12px/1.2 system-ui,-apple-system,sans-serif',
    'color:#fff', 'background:rgba(20,18,40,.6)', 'border:1px solid rgba(255,255,255,.25)',
    'text-decoration:none', 'opacity:.85', '-webkit-backdrop-filter:blur(6px)', 'backdrop-filter:blur(6px)'
  ].join(';');
  a.addEventListener('mouseenter', function () { a.style.opacity = '1'; });
  a.addEventListener('mouseleave', function () { a.style.opacity = '.85'; });
  document.body.appendChild(a);

  function blockers(r) {
    var els = document.querySelectorAll('button, a, input, select, [role=button]');
    var out = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === a || el.offsetParent === null) continue;
      var b = el.getBoundingClientRect();
      if (b.width && b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) out.push(b);
    }
    return out;
  }
  function place() {
    var bottom = 8;
    for (var i = 0; i < 6; i++) {
      a.style.bottom = bottom + 'px';
      var hit = blockers(a.getBoundingClientRect());
      if (!hit.length) return;
      var top = Math.min.apply(null, hit.map(function (b) { return b.top; }));
      bottom = Math.max(bottom + 4, Math.round(window.innerHeight - top + 6));
    }
  }
  place();
  window.addEventListener('resize', place);
  setTimeout(place, 800);
  setInterval(place, 2000); // spelens menyer öppnas och stängs
})();
