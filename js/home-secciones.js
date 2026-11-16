/* HOME: carrusel del portfolio (carpeta-cajón) + brillo que sigue al cursor en las tarjetas */
(function () {
  var pr = document.getElementById('pr');
  if (pr) {
    var tr = pr.querySelector('.pr-track'), cards = [].slice.call(tr.children), bp = pr.querySelector('[data-pr=prev]'), bn = pr.querySelector('[data-pr=next]'),
      bar = pr.querySelector('.pr-bar i'), num = pr.querySelector('.pr-num'), raf = 0, reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    pr.classList.add('pr-js');
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { pr.classList.add('in'); io.disconnect(); } }, { threshold: .3 });
      io.observe(pr);
    } else pr.classList.add('in');
    var step = function () { return cards[0].offsetWidth + (parseFloat(getComputedStyle(tr).columnGap) || 16); };
    var upd = function () {
      raf = 0; var max = tr.scrollWidth - tr.clientWidth, p = max > 0 ? tr.scrollLeft / max : 1, i = Math.min(cards.length, Math.round(tr.scrollLeft / step()) + 1);
      if (bar) bar.style.transform = 'scaleX(' + (0.14 + 0.86 * p).toFixed(3) + ')';
      if (num) num.textContent = (i < 10 ? '0' : '') + i + ' / 0' + cards.length;
      bp.disabled = tr.scrollLeft < 4; bn.disabled = tr.scrollLeft > max - 4;
    };
    tr.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); upd();
    bp.addEventListener('click', function () { tr.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
    bn.addEventListener('click', function () { tr.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
    tr.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); bn.click(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); bp.click(); }
    });
    // arrastrar con el mouse (en el celu y el trackpad ya funciona el deslizar normal)
    var down = null, moved = false;
    tr.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button) return; down = { x: e.clientX, l: tr.scrollLeft }; moved = false; });
    addEventListener('pointermove', function (e) {
      if (!down) return; var dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; tr.classList.add('drag'); }
      if (moved) tr.scrollLeft = down.l - dx;
    });
    addEventListener('pointerup', function () {
      if (!down) return; down = null;
      if (moved) { tr.classList.remove('drag'); tr.scrollTo({ left: Math.round(tr.scrollLeft / step()) * step(), behavior: 'smooth' }); setTimeout(function () { moved = false; }, 0); }
    });
    tr.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  // brillo que sigue al cursor
  document.querySelectorAll('.hx-c,.rcs-c').forEach(function (c) {
    c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  });
})();
