/* Home: brillo del portfolio con el color de la marca abierta, vista previa en servicios y botón de copiar mail */
(()=>{
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches,still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const pg=document.querySelector('.pg'),row=pg&&pg.querySelector('.pg-row');
  // frase de la banda: se subrayan las ideas clave al entrar en pantalla
  const banda=document.querySelector('.banda');
  if(banda){if(still||!('IntersectionObserver' in window))banda.classList.add('in');else new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){banda.classList.add('in');o.disconnect()}},{threshold:.45}).observe(banda)}
  if(row){
    const glow=document.createElement('div');glow.className='pg-glow';glow.setAttribute('aria-hidden','true');pg.prepend(glow);
    const sync=()=>{const on=row.querySelector('.pg-s.on');if(on)pg.style.setProperty('--tc',on.dataset.c)};
    new MutationObserver(sync).observe(row,{subtree:true,attributes:true,attributeFilter:['class']});sync();
    [...row.children].forEach(s=>{const i=new Image();i.src='img/marcas/'+s.dataset.l+'.svg'}); // logos listos para el título
  }
  // servicios: al pasar por cada fila, el fondo toma el color del proyecto y salen sus portadas siguiendo al cursor
  const PJ={arbol:['img/arbol.webp','#e8783c'],bleko:['img/bleko.webp','#f56446'],dulcemente:['img/dulcemente.webp','#f57896'],miga:['img/miga.webp','#2f8cff'],ros:['img/ros.webp','#7d41ff'],trazo:['img/trazo.webp','#28cdff'],f1:['img/f1.webp','#eb2837']};
  const sv=document.querySelectorAll('.sv li[data-p],.qh .vid[data-p],.svc-l li[data-p]');
  if(sv.length&&fine){
    const tinte=document.createElement('div');tinte.className='tinte';tinte.setAttribute('aria-hidden','true');document.body.prepend(tinte);
    let fan=null,x=0,y=0,tx=0,ty=0;
    if(!still){
      fan=document.createElement('div');fan.className='lf';fan.setAttribute('aria-hidden','true');document.body.appendChild(fan);
      addEventListener('pointermove',e=>{tx=e.clientX+60;ty=e.clientY},{passive:true});
      (function loop(){x+=(tx-x)*.14;y+=(ty-y)*.14;fan.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) rotate('+((tx-x)*.03).toFixed(2)+'deg)';requestAnimationFrame(loop)})();
    }
    Object.values(PJ).forEach(v=>{const i=new Image();i.src=v[0]});
    sv.forEach(li=>{
      const ps=li.dataset.p.split(',').map(k=>PJ[k]).filter(Boolean);
      li.addEventListener('pointerenter',e=>{
        if(e.pointerType&&e.pointerType!=='mouse')return;
        tinte.style.setProperty('--tc',ps[0][1]);tinte.classList.add('on');
        if(!fan)return;
        x=tx=e.clientX+60;y=ty=e.clientY;
        const n=ps.length;fan.textContent='';fan.className='lf'+(n===1?' uno':'');
        ps.forEach((v,i)=>{
          const c=document.createElement('img');c.alt='';c.src=v[0];
          const k=i-(n-1)/2;
          c.style.cssText='--dx:'+(k*58)+'%;--r:'+(k*9)+'deg;--d:'+(i*70)+'ms;z-index:'+(n-Math.abs(Math.round(k)));
          fan.appendChild(c);
        });
        requestAnimationFrame(()=>fan.classList.add('on'));
      });
      li.addEventListener('pointerleave',()=>{tinte.classList.remove('on');if(fan)fan.classList.remove('on')});
    });
  }
  const cp=document.querySelector('[data-copy]');
  if(cp)cp.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(cp.dataset.copy);cp.textContent='¡Copiado!'}catch(_){cp.textContent=cp.dataset.copy}
    setTimeout(()=>{cp.textContent='Copiar mail'},2200);
  });
})();
