/* Miga: menú móvil, sombra del encabezado y aparición suave al scrollear */
(() => {
  const cab = document.querySelector('.cab');
  const btn = document.querySelector('.cab-btn');
  const nav = document.getElementById('nav');

  // menú móvil
  const cerrar = () => { btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir menú de navegación'); cab.classList.remove('abierto'); };
  btn.addEventListener('click', () => {
    const abrir = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(abrir));
    btn.setAttribute('aria-label', abrir ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    cab.classList.toggle('abierto', abrir);
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrar(); btn.focus(); } });
  matchMedia('(min-width:821px)').addEventListener('change', cerrar);

  // sombra al bajar
  const sombra = () => cab.classList.toggle('sombra', scrollY > 8);
  sombra(); addEventListener('scroll', sombra, { passive: true });

  // aparición
  const items = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches) {
    items.forEach(el => el.classList.add('in')); return;
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  items.forEach(el => io.observe(el));
})();
