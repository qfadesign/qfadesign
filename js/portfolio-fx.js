/* Portfolio: filtros, tinte del fondo con el color de cada marca, vista Grilla/Lista con imagen que sigue al cursor */
(()=>{
  const box=document.getElementById('pjs');if(!box)return;
  const cards=[...box.children],root=document.documentElement;
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches,still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // filtros
  const fb=[...document.querySelectorAll('.filtros [data-f]')];
  fb.forEach(b=>b.addEventListener('click',()=>{
    fb.forEach(x=>x.setAttribute('aria-pressed',x===b));
    const f=b.dataset.f;box.classList.toggle('f',f!=='todos');
    cards.forEach(c=>{c.hidden=f!=='todos'&&c.dataset.cat!==f;c.classList.remove('solo')});
    const vis=cards.filter(c=>!c.hidden);if(f!=='todos'&&vis.length%2)vis[vis.length-1].classList.add('solo');
  }));
  // en celu los filtros son un desplegable
  const fbtn=document.querySelector('.fd-btn');
  if(fbtn){
    const abrir=v=>fbtn.setAttribute('aria-expanded',v);
    fbtn.addEventListener('click',e=>{e.stopPropagation();abrir(fbtn.getAttribute('aria-expanded')!=='true')});
    document.addEventListener('click',()=>abrir(false));
    addEventListener('keydown',e=>{if(e.key==='Escape')abrir(false)});
    fb.forEach(b=>b.addEventListener('click',()=>{fbtn.firstElementChild.textContent=b.dataset.t;abrir(false)}));
  }
  // tinte: el fondo toma el color de la marca de la tarjeta (mouse: hover · celu: la tarjeta que está en el centro)
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
  // vista Grilla / Lista
  const vb=[...document.querySelectorAll('[data-v]')];
  const setV=v=>{box.classList.toggle('lista',v==='lista');root.classList.toggle('lista-on',v==='lista');vb.forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===v));try{sessionStorage.setItem('qfa-vista',v)}catch(e){}};
  vb.forEach(b=>b.addEventListener('click',()=>setV(b.dataset.v)));
  try{if(sessionStorage.getItem('qfa-vista')==='lista')setV('lista')}catch(e){}
  // en la lista, una vista previa sigue al cursor
  if(fine&&!still){
    const pv=document.createElement('div');pv.className='lv';pv.setAttribute('aria-hidden','true');pv.innerHTML='<img alt="">';document.body.appendChild(pv);
    const im=pv.firstChild;let x=0,y=0,tx=0,ty=0;
    box.addEventListener('pointermove',e=>{tx=e.clientX+40;ty=e.clientY});
    cards.forEach(c=>{
      c.addEventListener('pointerenter',e=>{if(!box.classList.contains('lista'))return;const s=c.querySelector('.alt')||c.querySelector('img');im.src=s.currentSrc||s.src;x=tx=e.clientX+40;y=ty=e.clientY;pv.classList.add('on')});
      c.addEventListener('pointerleave',()=>pv.classList.remove('on'));
    });
    (function loop(){x+=(tx-x)*.14;y+=(ty-y)*.14;pv.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) translate(0,-50%) rotate('+((tx-x)*.05).toFixed(2)+'deg)';requestAnimationFrame(loop)})();
  }
})();
