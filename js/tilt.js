/* Portfolio: las tarjetas se inclinan en 3D siguiendo el mouse y un reflejo de luz las recorre.
   Solo con mouse (no en pantallas táctiles) y si la persona no pidió reducir el movimiento. */
(()=>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  document.querySelectorAll('.pj').forEach(c=>{
    c.classList.add('tilt');
    c.addEventListener('pointermove',e=>{
      const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      c.style.setProperty('--ry',((x-.5)*14).toFixed(2)+'deg');
      c.style.setProperty('--rx',((.5-y)*14).toFixed(2)+'deg');
      c.style.setProperty('--mx',(x*100).toFixed(1)+'%');
      c.style.setProperty('--my',(y*100).toFixed(1)+'%');
    });
    c.addEventListener('pointerleave',()=>['--rx','--ry'].forEach(k=>c.style.removeProperty(k)));
  });
})();
