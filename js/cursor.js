/* Cursor propio: un círculo "Ver" / "Ampliar" que sigue al mouse sobre tarjetas e imágenes. Solo con mouse y sin "reducir movimiento". */
(()=>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const c=document.createElement('div');c.className='qcur';c.setAttribute('aria-hidden','true');c.innerHTML='<span></span>';
  document.body.appendChild(c);document.documentElement.classList.add('qc');
  const t=c.firstChild;let x=-200,y=-200,cx=x,cy=y,lab='';
  addEventListener('pointermove',e=>{
    x=e.clientX;y=e.clientY;
    const el=e.target.closest&&e.target.closest('.pj,.zoom'),l=el?(el.classList.contains('zoom')?'Ampliar':'Ver'):'';
    if(l!==lab){lab=l;if(l)t.textContent=l;c.classList.toggle('on',!!l)}
  },{passive:true});
  document.addEventListener('pointerleave',()=>{lab='';c.classList.remove('on')});
  (function loop(){cx+=(x-cx)*.2;cy+=(y-cy)*.2;c.style.transform='translate('+cx.toFixed(1)+'px,'+cy.toFixed(1)+'px)';requestAnimationFrame(loop)})();
})();
