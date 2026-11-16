/* "Un poco de qfadesign": la sección se queda fija (sticky) y las fotos van pasando mientras scrolleás.
   Ahora el paso está atado al scroll (no es una animación con tiempo): cada foto nueva entra con una cortina que sube
   a medida que scrolleás, y la anterior se corre y se oscurece un poco. El recorrido es corto (ver css/home-nuevo.css)
   y si scrolleás rápido o volvés atrás, las fotos siempre están en el lugar que corresponde. */
(function(){
  const box=document.getElementById('so-fotos');
  if(!box)return;
  const fs=[...box.querySelectorAll('img.f')];
  const N=fs.length;
  if(N<2)return;
  const sec=box.closest('.sobre')||box;
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=k=>k*k*(3-2*k);
  sec.style.setProperty('--n',N);
  fs.forEach((f,i)=>{f.style.zIndex=i+1}); // cada foto nueva tapa a la anterior

  let t=false;
  function dibujar(){
    t=false;
    const total=sec.offsetHeight-innerHeight;
    if(total<=0)return;
    const p=clamp(-sec.getBoundingClientRect().top/total,0,1),q=p*(N-1);
    fs.forEach((f,i)=>{
      let e=i===0?1:clamp(q-(i-1),0,1),l=i===N-1?0:clamp(q-i,0,1); // e: cuánto entró · l: cuánto se fue (la tapó la siguiente)
      if(still){e=Math.round(e);l=Math.round(l)}else{e=ease(e);l=ease(l)}
      f.style.clipPath='inset('+((1-e)*100).toFixed(2)+'% 0 0 0)';
      f.style.transform='translateY('+(-6*l).toFixed(2)+'%) scale('+((1.12-.12*e)*(1+.06*l)).toFixed(4)+')';
      f.style.filter=l>0?'brightness('+(1-.4*l).toFixed(3)+')':'';
    });
  }
  const pedir=()=>{if(!t){t=true;requestAnimationFrame(dibujar)}};
  addEventListener('scroll',pedir,{passive:true});
  addEventListener('resize',pedir);addEventListener('load',pedir);
  dibujar();
})();
