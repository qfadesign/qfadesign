/* proyecto-miga: escala el sitio de Miga (390 x 844) para que entre en la pantalla del teléfono */
(() => {
  const pantalla = document.querySelector('.pr-phone-s');
  if (!pantalla) return;
  const f = pantalla.querySelector('iframe');
  const w = +pantalla.dataset.w, h = +pantalla.dataset.h;
  const ajustar = () => {
    const s = pantalla.clientWidth / w;
    f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = 'scale(' + s + ')';
  };
  ajustar();
  if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(pantalla);
  else addEventListener('resize', ajustar);
})();
