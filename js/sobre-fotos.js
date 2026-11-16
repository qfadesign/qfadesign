/* "Un poco de qfadesign": la foto cambia sola mientras scrolleás la sección (de a una, con fundido). */
(function(){
  const box=document.getElementById('so-fotos');
  if(!box)return;
  const fs=[...box.querySelectorAll('img.f')];
  if(fs.length<2)return;
  const sec=box.closest('.sobre')||box;
  let cur=0,t=false;
  function act(i){
    if(i===cur)return;
    fs[cur].classList.remove('on');fs[i].classList.add('on');cur=i;
  }
  function calc(){
    t=false;
    const r=sec.getBoundingClientRect(),vh=innerHeight;
    const p=Math.max(0,Math.min(.9999,(vh*.8-r.top)/(vh*1.1+r.height*.6)));
    act(Math.floor(p*fs.length));
  }
  addEventListener('scroll',()=>{if(!t){t=true;requestAnimationFrame(calc)}},{passive:true});
  addEventListener('resize',calc);
  calc();
})();
