/* Folder en JS puro (sin React). Versión de <Folder .../> adaptada a esta web.
   Uso: <div class="fd" data-label="Portfolio" data-sublabel="7 proyectos" data-size="1.3" ...>
          <a href="proyecto-x" data-c="#color"><img src="..." alt=""><b>Título</b><small>Subtítulo</small></a> ...
        </div>
   Props (como data-*): mode (flap) · variant (solid | glass) · layout (spread) · color · paper-color · tab-position (left | right)
   · open-on (click | hover) · size · frost (0–1) · tilt (0–1) · speed · bounce (0–1) · peek · intro · draggable · zoom-on-click · theme (dark | light)
   · deck (true): la carpeta queda abierta y fija en pantalla y los proyectos van pasando con el scroll (home)
   También: Folder.init(el, { onItemClick(item, index) { ... } }) — si devolvés false, no navega. */
(() => {
  const num = (v, d) => (v === undefined || v === '' || isNaN(+v)) ? d : +v;
  const bool = (v, d) => v === undefined ? d : !(v === 'false' || v === '0');
  const canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tinte = () => document.querySelector('.tinte');

  function init(el, extra) {
    if (el.classList.contains('fd-ok')) return;
    const d = el.dataset;
    const o = Object.assign({
      mode: d.mode || 'flap', variant: d.variant === 'glass' ? 'glass' : 'solid', layout: d.layout || 'spread',
      color: d.color || '#3d8bff', backColor: d.backColor || '', paperColor: d.paperColor || '#ffffff', tabPosition: d.tabPosition === 'left' ? 'left' : 'right',
      openOn: d.openOn === 'hover' ? 'hover' : 'click', size: num(d.size, 1.3), frost: num(d.frost, .25), tilt: num(d.tilt, .5),
      speed: Math.max(.2, num(d.speed, 1)), bounce: num(d.bounce, .4), peek: bool(d.peek, true), intro: bool(d.intro, true),
      draggable: bool(d.draggable, true), zoomOnClick: bool(d.zoomOnClick, true), theme: d.theme === 'light' ? 'light' : 'dark',
      onItemClick: null
    }, extra || {});
    const items = [...el.querySelectorAll(':scope > a')];
    if (!items.length) return;
    const deckOn = bool(d.deck, false) && !quieto && items.length > 1; // modo "pasar con el scroll"
    let deckA = 0, deckGo = () => {}; const poses = [];
    if (deckOn) o.draggable = false;
    const label = d.label || 'Carpeta', sub = d.sublabel || items.length + ' elementos';

    el.dataset.variant = o.variant; el.dataset.tabPosition = o.tabPosition; el.dataset.theme = o.theme; el.dataset.draggable = String(o.draggable);
    el.style.setProperty('--color', o.color); if (o.backColor) el.style.setProperty('--back', o.backColor); el.style.setProperty('--paper', o.paperColor);
    el.style.setProperty('--frost', o.frost); el.style.setProperty('--blur', (o.frost * 40).toFixed(1) + 'px');
    el.style.setProperty('--dur', (520 / o.speed).toFixed(0) + 'ms'); el.style.setProperty('--stag', (45 / o.speed).toFixed(0) + 'ms');
    el.style.setProperty('--speed', o.speed);
    el.style.setProperty('--ease', 'cubic-bezier(.34,' + (1 + o.bounce * 1.8).toFixed(2) + ',.64,1)');

    const back = document.createElement('div'); back.className = 'fd-back'; back.setAttribute('aria-hidden', 'true');
    const papers = document.createElement('div'); papers.className = 'fd-papers';
    const front = document.createElement('button'); front.type = 'button'; front.className = 'fd-front'; front.setAttribute('aria-expanded', 'false');
    front.innerHTML = '<span class="fd-label"></span><span class="fd-sub"></span>';
    front.querySelector('.fd-label').textContent = label; front.querySelector('.fd-sub').textContent = sub;
    front.setAttribute('aria-label', d.href ? label + ', ' + sub + '. Ir a la página de ' + label : label + ', ' + sub + '. Abrir o cerrar la carpeta');
    const dim = document.createElement('div'); dim.className = 'fd-dim'; dim.setAttribute('aria-hidden', 'true');

    items.forEach((a, i) => {
      a.classList.add('fd-paper'); a.tabIndex = -1; a.draggable = false;
      a.querySelectorAll('img').forEach(im => { im.loading = 'eager'; im.decoding = 'auto'; }); // que las fotos ya estén cargadas cuando caen
      const card = document.createElement('span'); card.className = 'fd-card';
      while (a.firstChild) card.appendChild(a.firstChild);
      a.appendChild(card);
      a.style.setProperty('--i', i);
      card.style.setProperty('--dd', (4 + (i * 1.7) % 3).toFixed(2) + 's');
      card.style.setProperty('--dl', (-(i * 0.9) % 4).toFixed(2) + 's');
      card.style.setProperty('--sx', i % 2 ? -1 : 1);
      papers.appendChild(a);
    });
    el.append(dim, back, papers, front);
    el.classList.add('fd-ok');
    const hint = el.parentElement.querySelector('.fd-hint');
    if (hint && d.href) hint.textContent = canHover ? 'Hacé clic en un proyecto, o en la carpeta para ver todo el portfolio' : 'Tocá un proyecto, o la carpeta para ver todo el portfolio';
    if (hint && deckOn) hint.textContent = canHover ? 'Scrolleá para ver cada proyecto · clic en uno para entrar, o en la carpeta para ver todo' : 'Deslizá para ver cada proyecto · tocá uno para entrar, o la carpeta para ver todo';
    else if (hint) hint.textContent = o.openOn === 'hover' && canHover ? 'Pasá el mouse por la carpeta y elegí un proyecto' : (canHover ? 'Hacé clic en la carpeta y elegí un proyecto' : 'Tocá la carpeta y elegí un proyecto');

    // ---- layout: abanico (spread) ----
    const pos = []; let repintar = () => {};
    function layout() {
      const parentW = el.parentElement.clientWidth || innerWidth;
      const avail = Math.min(parentW, innerWidth) - 24;
      // en pantallas angostas la carpeta se achica para entrar
      el.style.setProperty('--s', Math.min(o.size, Math.max(.7, avail / 300)).toFixed(3));
      const s = parseFloat(getComputedStyle(el).getPropertyValue('--s')) || o.size;
      const pw = items[0].offsetWidth, ph = items[0].offsetHeight, n = items.length;
      const span = Math.max(0, Math.min(520 * s, avail - pw));
      const step = n > 1 ? span / (n - 1) : 0;
      const lift = 26 * s, tiltDeg = o.tilt * 16;
      items.forEach((a, i) => {
        const c = i - (n - 1) / 2, norm = n > 1 ? c / ((n - 1) / 2) : 0;
        const x = c * step, y = -(ph * 0.5 + lift * (1 - norm * norm)), rot = norm * tiltDeg;
        a.style.setProperty('--x', x.toFixed(1) + 'px'); a.style.setProperty('--y', y.toFixed(1) + 'px'); a.style.setProperty('--rot', rot.toFixed(2) + 'deg');
        pos[i] = { x, y, rot, norm: Math.abs(norm), cx: o.peek ? x * 0.1 : 0, cy: o.peek ? -8 * s * (1 - norm * norm) : ph * 0.45, cr: o.peek ? norm * o.tilt * 4 : 0, ph, s };
        // cerrada: hojas asomando (peek) o escondidas
        a.style.setProperty('--cx', (o.peek ? x * 0.1 : 0).toFixed(1) + 'px');
        a.style.setProperty('--cy', (o.peek ? -8 * s * (1 - norm * norm) : ph * 0.45).toFixed(1) + 'px');
        a.style.setProperty('--cr', (o.peek ? norm * o.tilt * 4 : 0).toFixed(2) + 'deg');
      });
      el.style.marginTop = Math.round(ph * 0.5 + lift + 28 * s + (deckOn ? ph * 0.22 : 0)) + 'px';
      repintar();
    }
    layout();
    new ResizeObserver(layout).observe(el.parentElement);

    // ---- abrir / cerrar ----
    let t;
    const setTab = v => items.forEach(a => a.tabIndex = v ? 0 : -1);
    const abrir = () => { clearTimeout(t); el.classList.add('open'); front.setAttribute('aria-expanded', 'true'); setTab(true); };
    const cerrar = () => { if (deckOn) return; clearTimeout(t); el.classList.remove('open'); front.setAttribute('aria-expanded', 'false'); setTab(false); const x = tinte(); if (x) x.classList.remove('on'); };
    if (o.openOn === 'hover' && canHover) {
      el.addEventListener('mouseenter', abrir);
      el.addEventListener('mouseleave', () => { clearTimeout(t); t = setTimeout(cerrar, 180); });
    }
    const destino = d.href; // carpeta del inicio: al tocarla va a la página del portfolio (las hojas siguen yendo a su proyecto)
    const irA = h => { const l = document.createElement('a'); l.href = h; l.hidden = true; document.body.appendChild(l); l.click(); l.remove(); };
    front.addEventListener("click", e => {
      if (destino) { e.preventDefault(); irA(destino); return; }
      if (o.openOn === "hover" && canHover && el.classList.contains("open") && e.detail !== 0) return;
      if (!latched && scrub) { latch(); return; }
      el.classList.contains('open') ? cerrar() : abrir();
    });
    el.addEventListener('focusin', () => { if (o.openOn === 'hover' && canHover) abrir(); });
    el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget) && !el.classList.contains('fd-zoomed')) cerrar(); });
    addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (el.classList.contains('fd-zoomed')) return deszoom();
      if (el.classList.contains('open')) { cerrar(); front.focus(); }
    });
    document.addEventListener('click', e => { if (!el.contains(e.target) && !el.classList.contains('fd-zoomed')) cerrar(); });

    // ---- zoom al tocar una hoja y después ir al proyecto ----
    let zoomed = null;
    function deszoom() {
      if (!zoomed) return;
      zoomed.classList.remove('fd-zoom'); el.classList.remove('fd-zoomed'); zoomed = null;
    }
    dim.addEventListener('click', deszoom);
    // al irse a un proyecto la hoja queda en zoom y el fondo oscuro encendido; si el navegador guarda la página y la restaura al volver ("atrás"),
    // esa pantalla oscura quedaba tapando todo hasta que la tocabas. Se limpia al salir y al volver.
    const reiniciarZoom = () => {
      items.forEach(a => { a.classList.remove('fd-zoom', 'fd-dive', 'fd-measure'); delete a.dataset.fdGo; });
      el.classList.remove('fd-zoomed'); zoomed = null;
    };
    addEventListener('pagehide', reiniciarZoom);
    addEventListener('pageshow', e => { if (e.persisted) reiniciarZoom(); });
    function ir(a, i) {
      if (o.onItemClick && o.onItemClick({ href: a.getAttribute('href'), title: (a.querySelector('b') || {}).textContent || '', el: a }, i) === false) return false;
      return true;
    }
    function zoom(a) {
      a.classList.add('fd-measure');
      const r = a.getBoundingClientRect();
      const pw = a.offsetWidth, ph = a.offsetHeight;
      const zs = Math.min(Math.min(innerWidth * .8, 520) / pw, (innerHeight * .78) / ph);
      a.style.setProperty('--zx', (innerWidth / 2 - (r.left + r.width / 2)).toFixed(1) + 'px');
      // las hojas escalan desde el borde de abajo, así que se compensa para que queden centradas
      a.style.setProperty('--zy', (innerHeight / 2 - (r.top + r.height / 2 + ph / 2 - ph * zs / 2)).toFixed(1) + 'px');
      a.style.setProperty('--zs', zs.toFixed(3));
      void a.offsetWidth;
      a.classList.remove('fd-measure'); a.classList.add('fd-zoom'); el.classList.add('fd-zoomed'); zoomed = a;
    }

    // ---- arrastrar hojas (vuelven solas a su lugar) + click ----
    let moved = false;
    items.forEach((a, i) => {
      let sx = 0, sy = 0, down = false, pid = null;
      a.addEventListener('pointerdown', e => {
        if (!el.classList.contains('open') || !o.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
        down = true; moved = false; sx = e.clientX; sy = e.clientY; pid = e.pointerId;
      });
      a.addEventListener('pointermove', e => {
        if (!down || e.pointerId !== pid) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        if (!moved) { moved = true; a.classList.add('fd-drag'); try { a.setPointerCapture(pid); } catch (_) {} }
        a.style.setProperty('--dx', dx + 'px'); a.style.setProperty('--dy', dy + 'px');
      });
      const soltar = e => {
        if (!down || (e && e.pointerId !== pid)) return;
        down = false;
        if (a.classList.contains('fd-drag')) {
          a.classList.remove('fd-drag'); a.style.setProperty('--dx', '0px'); a.style.setProperty('--dy', '0px');
          setTimeout(() => { moved = false; }, 60); // las clicks que vienen justo después de arrastrar no cuentan
        }
      };
      a.addEventListener('pointerup', soltar); a.addEventListener('pointercancel', soltar);

      a.addEventListener('click', e => {
        if (a.dataset.fdGo) { delete a.dataset.fdGo; return; } // segundo paso: ya hizo zoom, que navegue (anim.js)
        if (moved) { e.preventDefault(); e.stopPropagation(); return; }
        if (deckOn) { // solo entra la hoja del medio; las de los costados llevan el scroll hasta ellas
          if (Math.abs(i - deckA) > 0.6) { e.preventDefault(); e.stopPropagation(); deckGo(i); return; }
          const q = poses[i]; if (q) { a.style.setProperty('--x', q.x.toFixed(1) + 'px'); a.style.setProperty('--y', q.y.toFixed(1) + 'px'); a.style.setProperty('--rot', '0deg'); }
        }
        if (!el.classList.contains('open')) { e.preventDefault(); e.stopPropagation(); return; }
        if (!ir(a, i)) { e.preventDefault(); e.stopPropagation(); return; }
        if (o.zoomOnClick && !quieto && !zoomed) {
          e.preventDefault(); e.stopPropagation();
          zoom(a);
          setTimeout(() => { a.dataset.fdGo = '1'; a.classList.add('fd-dive'); a.click(); }, 300);
        }
      });
    });

    // el fondo toma el color del proyecto sobre el que estás
    items.forEach(a => {
      const on = () => { const x = tinte(); if (x && a.dataset.c) { x.style.setProperty('--tc', a.dataset.c); x.classList.add('on'); } };
      const off = () => { const x = tinte(); if (x) x.classList.remove('on'); };
      a.addEventListener('mouseenter', on); a.addEventListener('mouseleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });

    // ---- intro con scroll: las hojas salen desde adentro de la carpeta y se abren en abanico ----
    // (con prefers-reduced-motion o intro="false" la carpeta queda cerrada y se abre con clic)
    const scrub = o.intro && !quieto && !deckOn;
    let latched = !scrub, auto = null, rafId = 0;
    const clamp = v => Math.max(0, Math.min(1, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const easeOut = k => 1 - Math.pow(1 - k, 3);
    const suave = k => k * k * (3 - 2 * k); // arranca y frena de a poco
    let cur = null; // progreso "amortiguado": sigue al scroll con un poco de inercia
    function latch() { // la secuencia terminó: pasa a modo normal (clic abre/cierra)
      latched = true; auto = null;
      el.classList.remove('fd-scrub');
      items.forEach(a => { a.style.transform = ''; a.style.opacity = ''; }); front.style.transform = '';
      abrir();
    }
    function progreso() {
      const r = el.getBoundingClientRect();
      let p = clamp((innerHeight * 0.97 - r.top) / (innerHeight * 0.6));
      if (p > 0.3 && innerHeight + scrollY >= document.documentElement.scrollHeight - 4) p = 1; // fin de la página: que termine igual
      return p;
    }
    function pintar(pr) {
      rafId = 0;
      if (!scrub) return;
      const p = pr === undefined ? progreso() : pr;
      if (latched) { if (progreso() <= 0.02 && !auto) { latched = false; el.classList.add('fd-scrub'); cerrar(); pintar(0); } return; }
      if (p >= 1) return latch();
      el.classList.add('fd-scrub');
      items.forEach((a, i) => {
        const q = pos[i]; if (!q) return;
        const k = suave(clamp((p - q.norm * 0.2) / 0.6)); // salen desde adentro de la carpeta, las del centro primero, y las de los costados las siguen de a una
        const x = lerp(0, q.x, k), y = lerp(q.ph * 0.45, q.y, k), r = lerp(0, q.rot, k);
        a.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg) scale(' + (0.94 + 0.06 * k).toFixed(3) + ')';
      });
      front.style.transform = 'perspective(' + (1700 * (parseFloat(el.style.getPropertyValue('--s')) || o.size)).toFixed(0) + 'px) rotateX(' + (-(16 + 18 * suave(clamp(p / 0.75)))).toFixed(2) + 'deg)';
    }
    if (scrub) {
      repintar = () => { if (!latched) pintar(auto === null ? undefined : auto); };
      let tPrev = 0;
      const seguir = ts => {
        rafId = 0;
        const t = progreso();
        // el seguimiento depende del tiempo y no de los cuadros: igual de suave en 60 o 120 Hz y no se arrastra si un cuadro tarda
        const dt = Math.min(64, Math.max(8, ts && tPrev ? ts - tPrev : 16.7)); tPrev = ts || 0;
        if (cur === null || latched) cur = t;
        else { cur += (t - cur) * (1 - Math.pow(1 - 0.13, dt / 16.7)); if (Math.abs(t - cur) < 0.003) cur = t; }
        pintar(cur);
        if (!latched && !auto && cur !== t) rafId = requestAnimationFrame(seguir);
      };
      const pedir = () => { if (!rafId && !auto) rafId = requestAnimationFrame(seguir); };
      addEventListener('scroll', pedir, { passive: true }); addEventListener('resize', pedir);
      const p0 = progreso();
      if (p0 >= 0.3) { // ya está a la vista al cargar: la secuencia corre sola (2,4 s)
        const t0 = performance.now(); auto = 0; pintar(0);
        const paso = now => { if (latched) return; auto = clamp((now - t0) / (2400 / o.speed)); if (auto >= 1) { auto = null; latch(); } else { pintar(auto); requestAnimationFrame(paso); } };
        setTimeout(() => requestAnimationFrame(paso), 350);
      } else { cur = p0; pintar(p0); }
    }

    // ---- modo deck: carpeta abierta y fija; los proyectos pasan de a uno con el scroll ----
    if (deckOn) {
      const sec = el.closest('.pg') || el.parentElement, n = items.length;
      sec.classList.add('fd-pinned'); sec.style.setProperty('--n', n);
      el.classList.add('fd-deck'); abrir();
      const IN = 0.1, OUT = 0.92; // tramo inicial (salen de la carpeta) y tramo final (queda el último)
      let g = { s: 1, pw: 138, ph: 178, step: 150, avail: 600 }, cur = null, rid = 0, tintIdx = -1;
      const medirDeck = () => {
        const s = parseFloat(getComputedStyle(el).getPropertyValue('--s')) || o.size;
        const pw = items[0].offsetWidth, ph = items[0].offsetHeight;
        const avail = Math.min(el.parentElement.clientWidth || innerWidth, innerWidth) - 24;
        g = { s, pw, ph, avail, step: Math.min(pw * 0.98, Math.max(pw * 0.4, (avail - pw * 1.3) / 4.4)) };
      };
      const prog = () => { const tot = sec.offsetHeight - innerHeight; return tot > 0 ? clamp(-sec.getBoundingClientRect().top / tot) : 0; };
      deckGo = i => {
        const tot = sec.offsetHeight - innerHeight, top = scrollY + sec.getBoundingClientRect().top;
        scrollTo({ top: top + (IN + (OUT - IN) * (i / (n - 1))) * tot, behavior: 'smooth' });
      };
      function pintarDeck(p) {
        const e = suave(clamp(p / IN)), A = (n - 1) * clamp((p - IN) / (OUT - IN));
        deckA = A;
        const { s, pw, ph, step } = g, lift = 26 * s, tilt = o.tilt * 7;
        items.forEach((a, i) => {
          const dd = i - A, ad = Math.abs(dd), k = Math.max(0, 1 - ad), t = Math.min(1, ad / 2.4);
          const x = dd * step + Math.sign(dd) * Math.min(1, ad) * pw * 0.2;
          const y = -(ph * 0.36 + lift * (1 - t * t)) - ph * 0.31 * k;
          const rot = Math.max(-2.4, Math.min(2.4, dd)) * tilt, sc = 0.9 + 0.4 * k;
          const op = clamp(1 - (ad - 1.7) / 0.7, 0, 1);
          poses[i] = { x, y, rot };
          a.style.transform = 'translate(' + lerp(0, x, e).toFixed(1) + 'px,' + lerp(ph * 0.45, y, e).toFixed(1) + 'px) rotate(' + (rot * e).toFixed(2) + 'deg) scale(' + lerp(0.94, sc, e).toFixed(3) + ')';
          a.style.opacity = lerp(1, op, e).toFixed(3);
          a.style.zIndex = String(100 - Math.round(ad * 10));
          a.style.pointerEvents = (op > 0.35 && e > 0.9) ? 'auto' : 'none';
        });
        // el fondo toma el color del proyecto que está al frente mientras la sección está en pantalla
        const r = sec.getBoundingClientRect(), x = tinte(), idx = Math.round(A);
        const visible = r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.6 && e > 0.5;
        if (x) {
          if (visible && (idx !== tintIdx || !x.classList.contains('on')) && items[idx].dataset.c) { x.style.setProperty('--tc', items[idx].dataset.c); x.classList.add('on'); tintIdx = idx; }
          else if (!visible && tintIdx !== -1) { x.classList.remove('on'); tintIdx = -1; }
        }
      }
      repintar = () => { medirDeck(); pintarDeck(cur === null ? prog() : cur); };
      const seguirDeck = () => {
        rid = 0; const t = prog();
        if (cur === null) cur = t; else { cur += (t - cur) * 0.14; if (Math.abs(t - cur) < 0.0008) cur = t; }
        pintarDeck(cur);
        if (cur !== t) rid = requestAnimationFrame(seguirDeck);
      };
      const pedirDeck = () => { if (!rid) rid = requestAnimationFrame(seguirDeck); };
      addEventListener('scroll', pedirDeck, { passive: true }); addEventListener('resize', pedirDeck);
      medirDeck(); cur = prog(); pintarDeck(cur);
      addEventListener('pageshow', () => { cur = null; pedirDeck(); });
    }
    // ---- la flotación de las hojas solo corre mientras el mouse está sobre la carpeta (y se ve, y no se scrollea) ----
    // una animación infinita obliga a redibujar toda la pantalla en cada cuadro aunque nadie la mire: eso era lo que la dejaba trabada
    let enVista = true, scrolleando = false, sobre = false, tq;
    const calma = () => el.classList.toggle('fd-quiet', !(canHover && sobre && enVista && !scrolleando));
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { enVista = es[es.length - 1].isIntersecting; calma(); }).observe(el);
    el.addEventListener('pointerenter', () => { sobre = true; calma(); });
    el.addEventListener('pointerleave', () => { sobre = false; calma(); });
    addEventListener('scroll', () => { if (!scrolleando) { scrolleando = true; calma(); } clearTimeout(tq); tq = setTimeout(() => { scrolleando = false; calma(); }, 160); }, { passive: true });
    calma();
  }

  window.Folder = { init };
  const arrancar = () => document.querySelectorAll('.fd[data-label]').forEach(el => init(el));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', arrancar) : arrancar();
})();
