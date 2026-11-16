/* "Un poco de qfadesign": la sección se queda fija (sticky) y, mientras scrolleás, las fotos cambian de a una.
   Cada foto nueva entra con una cortina que sube (o baja si scrolleás para atrás), tapando a la anterior,
   que se corre un poco. Las barras de abajo marcan en qué foto estás y se pueden tocar. */
(function(){
  const box=document.getElementById('so-fotos');
  if(!box)return;
  const fs=[...box.querySelectorAll('img.f')];
  const N=fs.length;
  if(N<2)return;
  const sec=box.closest('.sobre')||box;
  const bars=[...sec.querySelectorAll('.so-b')];
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const DUR=1000,EASE='cubic-bezier(.76,0,.24,1)';
  sec.style.setProperty('--n',N);

  let cur=0,t=false,tm=0;
  fs.forEach((f,i)=>{f.classList.toggle('on',i===0)});
  pintarBarras();

  function pintarBarras(){
    bars.forEach((b,i)=>{
      b.classList.toggle('on',i===cur);b.classList.toggle('past',i<cur);
      if(i===cur)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
    });
  }
  // cuando la foto nueva ya tapó todo, se sueltan las anteriores
  function limpiar(){
    fs.forEach((f,i)=>{
      if(i===cur)return;
      f.getAnimations().forEach(a=>a.cancel());
      f.classList.remove('on','under');
    });
  }
  function ir(i){
    if(i===cur)return;
    const dir=i>cur?1:-1,prev=fs[cur],nueva=fs[i];
    prev.classList.remove('on');prev.classList.add('under');
    fs.forEach((f,j)=>{if(j!==i&&j!==cur&&f.classList.contains('on'))f.classList.replace('on','under')});
    nueva.classList.remove('under');nueva.classList.add('on');
    cur=i;pintarBarras();
    clearTimeout(tm);
    if(still){limpiar();return}
    const desde=dir>0?'inset(100% 0 0 0)':'inset(0 0 100% 0)';
    nueva.animate([{clipPath:desde,transform:'scale(1.16)'},{clipPath:'inset(0)',transform:'scale(1)'}],{duration:DUR,easing:EASE});
    prev.animate([{transform:'translateY(0) scale(1)'},{transform:`translateY(${dir>0?-7:7}%) scale(1.06)`}],{duration:DUR,easing:EASE,fill:'forwards'});
    tm=setTimeout(limpiar,DUR+60);
  }
  function calc(){
    t=false;
    const total=sec.offsetHeight-innerHeight;
    if(total<=0)return;
    const p=Math.max(0,Math.min(.9999,-sec.getBoundingClientRect().top/total));
    ir(Math.floor(p*N));
  }
  bars.forEach((b,i)=>b.addEventListener('click',()=>{
    const total=sec.offsetHeight-innerHeight;
    const y=scrollY+sec.getBoundingClientRect().top+((i+.5)/N)*total;
    scrollTo({top:y,behavior:still?'auto':'smooth'});
  }));
  addEventListener('scroll',()=>{if(!t){t=true;requestAnimationFrame(calc)}},{passive:true});
  addEventListener('resize',calc);
  calc();
})();
