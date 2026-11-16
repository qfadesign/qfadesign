/* Jueguitos y Recursos: el fondo toma el color del juego / recurso (mouse: hover · celu: el que está en el centro) */
(()=>{
  const COL={ae:'#9a7bff',ai:'#ff9b3d',ps:'#2fb8ff'}; // recursos: color del programa (After Effects, Illustrator, Photoshop)
  const items=[...document.querySelectorAll('.jg[data-c],.dd-banner[data-c],.rc')];if(!items.length)return;
  items.forEach(el=>{
    if(!el.dataset.c){const g=el.closest('[data-g]');el.dataset.c=COL[g&&g.dataset.g]||'#0b75f4'}
    el.style.setProperty('--c',el.dataset.c);
  });
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const tinte=document.createElement('div');tinte.className='tinte';tinte.setAttribute('aria-hidden','true');document.body.prepend(tinte);
  const tint=c=>{if(c)tinte.style.setProperty('--tc',c.dataset.c);tinte.classList.toggle('on',!!c)};
  items.forEach(c=>{
    c.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')tint(c)});c.addEventListener('pointerleave',()=>tint(null));
    c.addEventListener('focusin',()=>{const a=document.activeElement;if(a&&a.matches(':focus-visible'))tint(c)});c.addEventListener('focusout',()=>tint(null));
  });
  if(!fine&&'IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tint(e.target)}),{rootMargin:'-45% 0px -45% 0px'});
    items.forEach(c=>io.observe(c));
  }
})();
