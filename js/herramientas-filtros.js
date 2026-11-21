/* Herramientas (índice): filtros por tipo. Los botones .hf-b muestran u ocultan las tarjetas según su data-g.
   Sin JavaScript se ven todas las tarjetas (los botones de filtro quedan sin efecto). */
(()=>{
  const bar=document.querySelector('.hf');if(!bar)return;
  const cards=[...document.querySelectorAll('#hgs .tl[data-g]')];if(!cards.length)return;
  const grilla=document.getElementById('hgs');
  const btns=[...bar.querySelectorAll('.hf-b')];
  const live=document.querySelector('.hf-live');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function aplicar(f){
    let k=0;
    grilla.classList.toggle('hf-f',f!=='todas');
    cards.forEach(c=>{
      const ver=f==='todas'||c.dataset.g===f;
      c.hidden=!ver;
      c.classList.remove('hf-in');
      if(ver&&!reduce){c.style.setProperty('--k',k);void c.offsetWidth;c.classList.add('hf-in');}
      if(ver)k++;
    });
    btns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===f)));
    if(live)live.textContent=f==='todas'?'Mostrando las '+k+' herramientas':'Mostrando '+k+(k===1?' herramienta':' herramientas');
  }
  btns.forEach(b=>b.addEventListener('click',()=>aplicar(b.dataset.f)));
})();
