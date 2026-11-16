/* HOME v2: (1) carpeta -> se abre -> desaparece -> los proyectos pasan con el scroll. (2) herramientas / jueguitos / recursos de a uno con el scroll */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches, clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp = function (a, b, k) { return a + (b - a) * k; }, ease = function (k) { return k * k * (3 - 2 * k); }, N = function (v) { return (v < 10 ? '0' : '') + v; };
  function prog(sec) { var r = sec.getBoundingClientRect(), d = sec.offsetHeight - innerHeight; return d > 0 ? clamp(-r.top / d, 0, 1) : 0; }

  var pf = document.getElementById('portfolio');
  if (pf && !reduce) {
    var cards = [].slice.call(pf.querySelectorAll('.pf-c')), n = cards.length, back = pf.querySelector('.pf-back'), front = pf.querySelector('.pf-front'),
      hud = pf.querySelector('.pf-hud'), num = pf.querySelector('.pf-num'), bar = pf.querySelector('.pf-bar i'), hint = pf.querySelector('.pf-hint'), raf = 0;
    pf.classList.add('pf-on'); pf.style.setProperty('--pfd', (n + 1.5) * 52 + 'svh');
    var A = .13, B = .27;
    var draw = function () {
      raf = 0; var p = prog(pf), W = cards[0].offsetWidth, G = Math.max(14, W * .08), S = W + G;
      var ka = ease(clamp(p / A, 0, 1)), kb = ease(clamp((p - A) / (B - A), 0, 1)), T = clamp((p - B) / (1 - B), 0, 1) * (n - 1) * S, fo = 1 - kb;
      var lid = 'translateY(' + (kb * 90).toFixed(1) + 'px) scale(' + (1 - kb * .1).toFixed(3) + ')';
      back.style.opacity = front.style.opacity = fo.toFixed(3); back.style.transform = lid;
      front.style.transform = lid + ' perspective(900px) rotateX(' + (-(14 + 38 * ka)).toFixed(1) + 'deg)';
      cards.forEach(function (c, i) {
        var m = i - (n - 1) / 2, sx = m * 9 * ka, sy = lerp(W * .3, -W * .42, ka) - Math.abs(m) * 2 * ka, sr = m * 3.2 * ka, ss = lerp(.42, .6, ka);
        var rx = i * S - T - (n - 1) / 2 * 0, ki = ease(clamp(kb * (1 + .06 * (n - 1)) - i * .06, 0, 1));
        var d = Math.abs(rx) / S, rs = 1 - .1 * Math.min(1, d), ro = 1 - .4 * Math.min(1, d / 1.7);
        var x = lerp(sx, rx, ki), y = lerp(sy, 0, ki), r = lerp(sr, 0, ki), s = lerp(ss, rs, ki);
        c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
        c.style.opacity = (ka > .02 ? lerp(1, ro, ki) : 0).toFixed(3);
        c.classList.toggle('go', kb > .95 && d < 1.2);
      });
      var cur = clamp(Math.round(T / S) + 1, 1, n);
      num.textContent = N(cur) + ' / ' + N(n); bar.style.transform = 'scaleX(' + clamp(T / ((n - 1) * S), 0, 1).toFixed(3) + ')';
      hud.style.opacity = kb > .9 ? 1 : 0; hint.style.opacity = p < .03 ? 1 : 0;
    };
    var ask = function () { if (!raf) raf = requestAnimationFrame(draw); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); draw();
    // teclado: con foco en un proyecto, las flechas mueven el scroll
  }

  var ex = document.getElementById('ex');
  if (ex) {
    var ps = [].slice.call(ex.querySelectorAll('.ex-p')), tabs = [].slice.call(ex.querySelectorAll('.ex-tab')), cur = -1;
    if (!reduce) {
      ex.classList.add('ex-on');
      var set = function (i) {
        if (i === cur) return; cur = i;
        ps.forEach(function (p, k) { p.classList.toggle('on', k === i); p.classList.toggle('pv', k < i); });
        tabs.forEach(function (t, k) { t.classList.toggle('on', k === i); t.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      };
      var upd = function () {
        var p = prog(ex), i = Math.min(ps.length - 1, Math.floor(p * ps.length + .001));
        set(i); tabs.forEach(function (t, k) { t.firstElementChild.style.transform = 'scaleX(' + clamp(p * ps.length - k, 0, 1).toFixed(3) + ')'; });
      };
      var raf2 = 0; addEventListener('scroll', function () { if (!raf2) raf2 = requestAnimationFrame(function () { raf2 = 0; upd(); }); }, { passive: true }); addEventListener('resize', upd); upd();
      tabs.forEach(function (t, k) {
        t.addEventListener('click', function () { var top = ex.getBoundingClientRect().top + scrollY, d = ex.offsetHeight - innerHeight; scrollTo({ top: top + d * (k + .5) / ps.length, behavior: 'smooth' }); });
      });
    }
  }
})();
