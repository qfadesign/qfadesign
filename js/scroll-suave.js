/* Scroll suave de la home (solo mouse / trackpad): la rueda mueve un "objetivo" y la página lo sigue con una inercia corta,
   en vez de dar saltos. En celu / táctil y con "reducir movimiento" no hace nada (queda el scroll nativo).
   Usa el scroll real de la página, así que las secciones fijas y las animaciones atadas al scroll siguen igual. */
(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  const root=document.documentElement,TAU=95; // ms: menos = más directo, más = más flotante
  let target=scrollY,cur=scrollY,raf=0,last=0;
  const max=()=>Math.max(0,root.scrollHeight-innerHeight),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  // si el mouse está sobre algo con su propio scroll (menú, caja con barra), la rueda se la dejamos a ese elemento
  function propio(el,dy){
    for(;el&&el!==document.body&&el!==root;el=el.parentElement){
      const o=getComputedStyle(el).overflowY;
      if((o==='auto'||o==='scroll')&&el.scrollHeight>el.clientHeight+1){
        if(dy<0?el.scrollTop>0:el.scrollTop+el.clientHeight<el.scrollHeight-1)return true;
      }
    }
    return false;
  }
  function tick(now){
    const dt=Math.min(50,now-last||16);last=now;
    const d=target-cur;
    if(Math.abs(d)<.3){cur=target;scrollTo({top:cur,behavior:'instant'});raf=0;return}
    cur+=d*(1-Math.exp(-dt/TAU));
    scrollTo({top:cur,behavior:'instant'}); // 'instant' porque la página tiene scroll-behavior:smooth
    raf=requestAnimationFrame(tick);
  }
  addEventListener('wheel',e=>{
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return; // zoom o scroll horizontal: nativo
    if(propio(e.target,e.deltaY))return;
    e.preventDefault();
    let dy=e.deltaY;if(e.deltaMode===1)dy*=34;else if(e.deltaMode===2)dy*=innerHeight;
    if(!raf){cur=target=scrollY;last=0}
    target=clamp(target+dy,0,max());
    if(!raf)raf=requestAnimationFrame(tick);
  },{passive:false});
  // scroll que no viene de la rueda (teclado, barra, links de ancla): el objetivo se pone al día
  addEventListener('scroll',()=>{if(!raf){cur=target=scrollY}},{passive:true});
  addEventListener('resize',()=>{target=clamp(target,0,max())});
  // al tocar la barra o arrastrar, se corta la inercia
  addEventListener('pointerdown',()=>{if(raf){cancelAnimationFrame(raf);raf=0;cur=target=scrollY}},{passive:true});
})();
