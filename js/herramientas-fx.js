/* Herramientas: el fondo toma el color de la tarjeta (mouse: hover · celu: la tarjeta que está en el centro) */
(()=>{
  const cards=[...document.querySelectorAll('.tl[data-c]')];if(!cards.length)return;
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const tinte=document.createElement('div');tinte.className='tinte';tinte.setAttribute('aria-hidden','true');document.body.prepend(tinte);
  const tint=c=>{if(c)tinte.style.setProperty('--tc',c.dataset.c);tinte.classList.toggle('on',!!c)};
  cards.forEach(c=>{
    c.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')tint(c)});c.addEventListener('pointerleave',()=>tint(null));
    c.addEventListener('focus',()=>tint(c));c.addEventListener('blur',()=>tint(null));
  });
  if(!fine&&'IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tint(e.target)}),{rootMargin:'-45% 0px -45% 0px'});
    cards.forEach(c=>io.observe(c));
  }
})();
