/* Libro interactivo (Heyzine): se muestra la tapa y el visor recién se carga al tocar "Abrir el libro" */
(()=>{
  document.querySelectorAll('[data-libro]').forEach(caja=>{
    const boton=caja.querySelector('.pr-libro-go');
    if(!boton)return;
    boton.addEventListener('click',()=>{
      const f=document.createElement('iframe');
      f.className='pr-libro-f';
      f.src=caja.dataset.libro;
      f.title=caja.dataset.titulo||'Libro interactivo';
      f.allow='fullscreen; clipboard-write';
      f.setAttribute('allowfullscreen','');
      f.setAttribute('scrolling','no');
      f.referrerPolicy='strict-origin-when-cross-origin';
      caja.classList.add('is-open');
      caja.replaceChildren(f);
      f.focus();
    });
  });
})();
