/* HOME v2: (1) carpeta -> las fichas salen DE ADENTRO de la carpeta (quedan entre el fondo y la tapa) y se acomodan un poco superpuestas; al pasar el mouse una ficha se muestra entera y el fondo toma el color de su marca.
   (2) herramientas / jueguitos / recursos van pasando de a uno con el scroll (sin barra de títulos arriba) */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches, fine = matchMedia('(hover:hover) and (pointer:fine)').matches,
    clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp = function (a, b, k) { return a + (b - a) * k; }, ease = function (k) { return k * k * (3 - 2 * k); }, N = function (v) { return (v < 10 ? '0' : '') + v; };

  /* fondo que toma el color de la marca: es el mismo .tinte que usan el portfolio y la lista de servicios */
  function tint(color) {
    var t = document.querySelector('.tinte');
    if (!t) { if (!color) return; t = document.createElement('div'); t.className = 'tinte'; t.setAttribute('aria-hidden', 'true'); document.body.prepend(t); }
    if (color) t.style.setProperty('--tc', color);
    t.classList.toggle('on', !!color);
  }

  var pf = document.getElementById('portfolio');
  if (pf) {
    var cards = [].slice.call(pf.querySelectorAll('.pf-c')), n = cards.length;
    cards.forEach(function (c) { c.dataset.c = c.style.getPropertyValue('--c').trim(); });
    // hover (mouse) y foco (teclado): el fondo cambia al color de la ficha
    if (fine) cards.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { if (!e.pointerType || e.pointerType === 'mouse') tint(c.dataset.c); });
      c.addEventListener('pointerleave', function () { tint(null); });
    });
    cards.forEach(function (c) {
      c.addEventListener('focus', function () { if (c.matches(':focus-visible')) tint(c.dataset.c); });
      c.addEventListener('blur', function () { tint(null); });
    });
  }

  if (pf && !reduce) {
    var back = pf.querySelector('.pf-back'), front = pf.querySelector('.pf-front'), fd = pf.querySelector('.pf-fd'), stk = pf.querySelector('.pf-sticky'), stage = pf.querySelector('.pf-stage'),
      hud = pf.querySelector('.pf-hud'), num = pf.querySelector('.pf-num'), bar = pf.querySelector('.pf-bar i'), hint = pf.querySelector('.pf-hint'),
      raf = 0, L = {}, lw = 0, lh = 0, hintTxt = '', lastTint = null,
      ROT = [-1.6, 1.2, -.8, 1.5, -1.3, .9, -1.4], DY = [4, -6, 2, -5, 6, -2, 4],     // desorden leve de las fichas ya abiertas
      HINT0 = 'Scrolleá para abrir la carpeta', HINT1 = 'Pasá el mouse por las fichas para verlas';
    pf.classList.add('pf-on');

    /* medidas: si las 7 fichas entran en pantalla (compu) quedan en fila, centradas y superpuestas, sin recorrido lateral.
       Si no entran (celu / pantallas angostas) se superponen igual y el scroll las va pasando de a una. */
    var layout = function () {
      lw = innerWidth; lh = innerHeight;
      var vw = document.documentElement.clientWidth, vh = innerHeight, W = cards[0].offsetWidth, CH = cards[0].offsetHeight, avail = vw - 2 * Math.max(16, vw * .04), fitS = (avail - W) / (n - 1),
        fit = fitS >= W * .55, S = fit ? Math.min(fitS, W * .7) : W * .58, Tmax = (n - 1) * S;
      // las fichas arrancan chicas y TODAS adentro de la carpeta (apoyadas abajo, la tapa las cubre); al abrir suben y salen por arriba
      var Fw = fd.offsetWidth, Fh = fd.offsetHeight, s0 = Fw * .42 / W, y0 = Fh * .45 - s0 * CH / 2, y1 = -W * .42;
      // el indicador y el texto de ayuda van pegados abajo de las fichas, y lo que sigue sube hasta ahí (sin vacío)
      var cardB = stage.offsetTop + stage.offsetHeight / 2 + CH / 2 + 10, trim = Math.max(0, stk.offsetHeight - cardB - 46 - 24);
      pf.style.setProperty('--hudtop', (cardB + 12).toFixed(0) + 'px'); pf.style.marginBottom = (-trim).toFixed(0) + 'px';
      var a1 = vh * .55, a2 = vh * 1.15, trav = fit ? 0 : Math.max(vh * .8, Tmax * 1.1), hold = fit ? vh * .2 : vh * .15;
      L = { W: W, S: S, fit: fit, vw: vw, Tmax: Tmax, a1: a1, a2: a2, trav: trav, s0: s0, y0: y0, y1: y1 };
      pf.style.setProperty('--pfd', (a2 + trav + hold).toFixed(0) + 'px');
    };

    var draw = function () {
      raf = 0;
      var y = clamp(-pf.getBoundingClientRect().top, 0, Math.max(1, pf.offsetHeight - stk.offsetHeight)), W = L.W, S = L.S, fit = L.fit;
      var ka = ease(clamp(y / L.a1, 0, 1)), kb = ease(clamp((y - L.a1) / (L.a2 - L.a1), 0, 1)), pt = L.trav ? clamp((y - L.a2) / L.trav, 0, 1) : 0, fo = 1 - kb;
      var lid = 'translateY(' + (kb * 90).toFixed(1) + 'px) scale(' + (1 - kb * .1).toFixed(3) + ')';
      back.style.opacity = front.style.opacity = fo.toFixed(3); back.style.transform = lid;
      front.style.transform = lid + ' perspective(900px) rotateX(' + (-(14 + 38 * ka)).toFixed(1) + 'deg)';
      var best = 0, bestD = 1e9;
      cards.forEach(function (c, i) {
        // 1) salen de la carpeta en abanico (desde adentro, por detrás de la tapa)
        var m = i - (n - 1) / 2, sx = m * 9 * ka, sy = lerp(L.y0, L.y1, ka) - Math.abs(m) * 2 * ka, sr = m * 3.2 * ka, ss = lerp(L.s0, .6, ka);
        // 2) se acomodan en fila, superpuestas: centradas si entran, o con recorrido si no
        var rx = i * S - (fit ? L.Tmax / 2 : pt * L.Tmax), ki = ease(clamp(kb * (1 + .06 * (n - 1)) - i * .06, 0, 1));
        var d = Math.abs(rx) / W, rs = fit ? 1 : 1 - .1 * Math.min(1, d / 1.2), ry = (DY[i % 7]) * (fit ? 1 : .5), rr = ROT[i % 7] * (fit ? 1 : .6);
        var x = lerp(sx, rx, ki), yy = lerp(sy, ry, ki), r = lerp(sr, rr, ki), s = lerp(ss, rs, ki);
        // --h (0→1 al pasar el mouse) endereza la ficha, la sube y la agranda, sin pelear con este transform
        c.style.transform = 'translate(' + x.toFixed(1) + 'px,calc(' + yy.toFixed(1) + 'px - 22px*var(--h))) rotate(calc(' + r.toFixed(2) + 'deg*(1 - var(--h)))) scale(calc(' + s.toFixed(3) + ' + .07*var(--h)))';
        // capas: fondo de la carpeta (1) < fichas (2 a 60) < tapa de la carpeta (100)
        c.style.zIndex = fit ? i + 2 : Math.round(50 - Math.min(5, Math.abs(rx) / S) * 8);
        c.classList.toggle('go', kb > .95 && (fit || Math.abs(rx) < L.vw / 2 + W * .3));
        if (Math.abs(rx) < bestD) { bestD = Math.abs(rx); best = i; }
      });
      // indicador: solo cuando hay recorrido lateral
      num.textContent = N(best + 1) + ' / ' + N(n); bar.style.transform = 'scaleX(' + clamp(pt, 0, 1).toFixed(3) + ')';
      hud.style.opacity = (!fit && kb > .9) ? 1 : 0;
      // texto de ayuda: antes de abrir invita a scrollear; ya abierta (con mouse) invita a pasar por las fichas
      var ht = y < L.a1 * .08 ? HINT0 : (fine && fit && kb > .95 ? HINT1 : '');
      if (ht && ht !== hintTxt) { hint.textContent = ht; } hintTxt = ht || hintTxt;
      hint.style.opacity = ht ? 1 : 0;
      // celu / táctil: sin hover, el fondo toma el color de la ficha que pasa por el centro
      if (!fine) { var tc = (!fit && kb > .95) ? cards[best].dataset.c : null; if (tc !== lastTint) { lastTint = tc; tint(tc); } }
    };

    var ask = function () { if (!raf) raf = requestAnimationFrame(draw); };
    var relayout = function () { if (innerWidth !== lw || Math.abs(innerHeight - lh) > 150) { layout(); } ask(); };
    layout(); draw();
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', relayout); addEventListener('load', function () { layout(); ask(); });
    // teclado: al enfocar una ficha con Tab, la carpeta ya está abierta
    cards.forEach(function (c) {
      c.addEventListener('focus', function () {
        if (!c.matches(':focus-visible')) return;
        var top = pf.getBoundingClientRect().top + scrollY;
        if (scrollY < top + L.a2) scrollTo({ top: top + L.a2 + 2, behavior: 'auto' });
      });
    });
  }

  var ex = document.getElementById('ex');
  if (ex && !reduce) {
    var ps = [].slice.call(ex.querySelectorAll('.ex-p')), cur = -1, EH = 0, T0 = 0, ew = 0, eh = 0;
    ex.classList.add('ex-on');
    /* la caja que queda fija mide lo mismo que el contenido más más un poco de aire: así no hay vacío antes ni después */
    var exLayout = function () {
      ew = innerWidth; eh = innerHeight;
      var vh = innerHeight, navp = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navh')) || 58) + 14, pad = clamp(vh * .05, 24, 56), h = 0;
      ps.forEach(function (p) { p.classList.add('meas'); h = Math.max(h, p.offsetHeight); p.classList.remove('meas'); });
      EH = Math.min(h + 2 * pad, vh - navp); T0 = Math.max(navp, (vh - EH) / 2);
      ex.style.setProperty('--exh', EH.toFixed(0) + 'px'); ex.style.setProperty('--ext', T0.toFixed(0) + 'px');
    };
    var set = function (i) {
      if (i === cur) return; cur = i;
      ps.forEach(function (p, k) { p.classList.toggle('on', k === i); p.classList.toggle('pv', k < i); });
    };
    var upd = function () {
      var d = ex.offsetHeight - EH, p = d > 0 ? clamp((T0 - ex.getBoundingClientRect().top) / d, 0, 1) : 0;
      set(Math.min(ps.length - 1, Math.floor(p * ps.length + .001)));
    };
    var raf2 = 0, ask2 = function () { if (!raf2) raf2 = requestAnimationFrame(function () { raf2 = 0; upd(); }); };
    exLayout(); upd();
    addEventListener('scroll', ask2, { passive: true });
    addEventListener('resize', function () { if (innerWidth !== ew || Math.abs(innerHeight - eh) > 150) exLayout(); ask2(); });
    addEventListener('load', function () { exLayout(); ask2(); });
  }
})();
