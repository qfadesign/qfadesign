/* FolderFloat en JS puro (sin React). Uso:
   <div class="ff" data-label="Portfolio" data-sublabel="7 proyectos" data-spread="520" data-lift="26" data-tilt="8">
     <a href="..." data-c="#color"><img src="..." alt=""><b>Título</b><small>Subtítulo</small></a> ...
   </div>
   Opciones (data-*): spread (ancho total del abanico, px) · lift · tilt (grados) · flap (ángulo abierta) · rest (ángulo en reposo)
   · duration (ms) · stagger (ms entre hojas) · bounce (0–1) · drift (0–1) · trigger (hover | click).
   En pantallas táctiles (sin hover) la carpeta se abre sola mientras se scrollea; con mouse, al pasar el cursor.
   Los tamaños (--w, --h, --pw, --ph) y los colores están en css/folder-float.css. */
(() => {
  const num = (v, d) => (v === undefined || v === '' || isNaN(+v)) ? d : +v;
  const canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const tinte = () => document.querySelector('.tinte');

  function init(el) {
    const d = el.dataset;
    const o = { spread: num(d.spread, 520), lift: num(d.lift, 26), tilt: num(d.tilt, 8), flap: num(d.flap, 34), rest: num(d.rest, 16),
      duration: num(d.duration, 520), stagger: num(d.stagger, 45), bounce: num(d.bounce, .3), drift: num(d.drift, .5),
      trigger: d.trigger === 'click' ? 'click' : 'hover' };
    const items = [...el.querySelectorAll(':scope > a')];
    if (!items.length) return;

    const back = document.createElement('div'); back.className = 'ff-back'; back.setAttribute('aria-hidden', 'true');
    const papers = document.createElement('div'); papers.className = 'ff-papers';
    const front = document.createElement('button'); front.type = 'button'; front.className = 'ff-front'; front.setAttribute('aria-expanded', 'false');
    front.innerHTML = '<span class="ff-label"></span><span class="ff-sub"></span>';
    front.querySelector('.ff-label').textContent = d.label || 'Carpeta';
    front.querySelector('.ff-sub').textContent = d.sublabel || items.length + ' elementos';
    front.setAttribute('aria-label', (d.label || 'Carpeta') + ', ' + (d.sublabel || items.length + ' elementos') + '. Abrir o cerrar la carpeta');

    items.forEach((a, i) => {
      a.classList.add('ff-paper'); a.tabIndex = -1;
      const inner = document.createElement('span'); inner.className = 'ff-in';
      while (a.firstChild) inner.appendChild(a.firstChild);
      a.appendChild(inner);
      a.style.setProperty('--i', i);
      inner.style.setProperty('--dd', (4 + (i * 1.7) % 3).toFixed(2) + 's');
      inner.style.setProperty('--dl', (-(i * 0.9) % 4).toFixed(2) + 's');
      inner.style.setProperty('--sx', i % 2 ? -1 : 1);
      papers.appendChild(a);
    });
    el.append(back, papers, front);

    el.style.setProperty('--rest', o.rest); el.style.setProperty('--flap', o.flap);
    el.style.setProperty('--dur', o.duration + 'ms'); el.style.setProperty('--stag', o.stagger); el.style.setProperty('--drift', o.drift);
    el.style.setProperty('--ease', 'cubic-bezier(.34,' + (1 + o.bounce * 1.8).toFixed(2) + ',.64,1)');
    el.classList.add('ff-ok');
    const pista = el.parentElement.querySelector('.ff-hint');
    if (pista && !canHover) pista.textContent = 'Scrolleá y elegí un proyecto';

    // abanico: las hojas salen hacia arriba, abiertas en arco
    const pos = []; let repintar = () => {};
    function layout() {
      const pw = items[0].offsetWidth, ph = items[0].offsetHeight, n = items.length;
      const avail = Math.min(el.parentElement.clientWidth || innerWidth, innerWidth) - 24;
      const span = Math.max(0, Math.min(o.spread, avail - pw));
      const step = n > 1 ? span / (n - 1) : 0;
      items.forEach((a, i) => {
        const c = i - (n - 1) / 2, norm = n > 1 ? c / ((n - 1) / 2) : 0;
        const x = c * step, y = -(ph * 0.5 + o.lift * (1 - norm * norm)), rot = norm * o.tilt;
        pos[i] = { x, y, rot };
        a.style.setProperty('--x', x.toFixed(1) + 'px');
        a.style.setProperty('--y', y.toFixed(1) + 'px');
        a.style.setProperty('--rot', rot.toFixed(2) + 'deg');
      });
      repintar();
    }
    layout();
    new ResizeObserver(layout).observe(el.parentElement);

    let t;
    const setTab = v => items.forEach(a => a.tabIndex = v ? 0 : -1);
    const abrir = () => { clearTimeout(t); el.classList.add('open'); front.setAttribute('aria-expanded', 'true'); setTab(true); };
    const cerrar = () => { clearTimeout(t); el.classList.remove('open'); front.setAttribute('aria-expanded', 'false'); setTab(false); const x = tinte(); if (x) x.classList.remove('on'); };
    const cerrarLuego = () => { clearTimeout(t); t = setTimeout(cerrar, 180); };

    if (!canHover) {
      // celu / tablet: la carpeta se abre a medida que se scrollea (las hojas salen una tras otra)
      el.classList.add('ff-scroll');
      const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const clamp = v => Math.max(0, Math.min(1, v));
      const ease = v => 1 - Math.pow(1 - v, 3);
      let tk = false;
      const pintar = () => {
        tk = false;
        const r = el.getBoundingClientRect(), vh = innerHeight;
        let p = clamp((vh * 0.92 - r.top) / (vh * 0.45));
        if (quieto) p = p > 0.5 ? 1 : 0;
        items.forEach((a, i) => {
          const q = pos[i]; if (!q) return;
          const k = quieto ? p : ease(clamp((p - i * 0.05) / 0.65));
          a.style.transform = 'translate(' + (q.x * k).toFixed(1) + 'px,' + (q.y * k).toFixed(1) + 'px) rotate(' + (q.rot * k).toFixed(2) + 'deg) scale(' + (0.94 + 0.06 * k).toFixed(3) + ')';
        });
        front.style.transform = 'rotateX(' + (-(o.rest + (o.flap - o.rest) * ease(p))).toFixed(2) + 'deg)';
        const abierta = p > 0.5;
        if (abierta !== el.classList.contains('open')) {
          el.classList.toggle('open', abierta);
          front.setAttribute('aria-expanded', abierta ? 'true' : 'false');
          setTab(abierta);
        }
      };
      repintar = pintar;
      const pedir = () => { if (!tk) { tk = true; requestAnimationFrame(pintar); } };
      addEventListener('scroll', pedir, { passive: true });
      addEventListener('resize', pedir);
      pintar();
    } else {
      if (o.trigger === 'hover' && canHover) {
        el.addEventListener('mouseenter', abrir);
        el.addEventListener('mouseleave', cerrarLuego);
      }
      el.addEventListener('focusin', () => { if (o.trigger === 'hover' && canHover) abrir(); });
      el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) cerrar(); });
      // click / toque / teclado: abre y cierra (con mouse en modo hover, el click no hace nada para no cerrarla de golpe)
      front.addEventListener('click', e => {
        if (o.trigger === 'hover' && canHover && e.detail !== 0) return;
        el.classList.contains('open') ? cerrar() : abrir();
      });
      addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('open')) { cerrar(); front.focus(); } });
      document.addEventListener('click', e => { if (!el.contains(e.target)) cerrar(); });
    }

    // el fondo toma el color del proyecto sobre el que estás (igual que la grilla del portfolio)
    items.forEach(a => {
      const on = () => { const x = tinte(); if (x && a.dataset.c) { x.style.setProperty('--tc', a.dataset.c); x.classList.add('on'); } };
      const off = () => { const x = tinte(); if (x) x.classList.remove('on'); };
      a.addEventListener('mouseenter', on); a.addEventListener('mouseleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });
  }
  const arrancar = () => document.querySelectorAll('.ff[data-label]').forEach(init);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', arrancar) : arrancar();
})();
