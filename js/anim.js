document.documentElement.classList.add('js');
addEventListener('DOMContentLoaded',()=>{const n=document.querySelector('nav');if(!n)return;const set=()=>document.documentElement.style.setProperty('--navh',n.offsetHeight+'px');set();new ResizeObserver(set).observe(n)});
addEventListener('DOMContentLoaded',()=>{
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // orden escalonado
  document.querySelectorAll('.pj,.jg,.hg').forEach((el,i)=>el.style.setProperty('--i',i));
  if(still)return;
  // aparición al hacer scroll
  document.querySelectorAll('.sobre .txt,.sobre img,.lema,.trabajos,.mas,.ayuda,.gran').forEach(el=>el.classList.add('rv'));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.2});
  document.querySelectorAll('.rv').forEach(el=>{
    // la foto recortada con clip-path no "intersecta": observamos su contenedor
    if(el.matches('.sobre img')){const ob=new IntersectionObserver(es=>{if(es[0].isIntersecting){el.classList.add('in');ob.disconnect()}},{threshold:.25});ob.observe(el.parentElement)}
    else io.observe(el);
  });
  // parallax del hero
  const hero=document.querySelector('.hero');
  if(hero){let t=false;addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{hero.style.setProperty('--py',Math.min(scrollY,600)*.15+'px');t=false})},{passive:true})}
  // botones: se acercan un poco al cursor (con elevación) y sale una onda al tocarlos
  document.querySelectorAll('.btn,.primary,.play-again').forEach(b=>{
    b.addEventListener('mousemove',e=>{if(b.disabled)return;const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.14}px,${(e.clientY-r.top-r.height/2)*.28-3}px)`});
    b.addEventListener('mouseleave',()=>b.style.transform='');
    b.addEventListener('pointerdown',e=>{
      if(b.disabled||e.button>0)return;
      const r=b.getBoundingClientRect(),d=Math.hypot(r.width,r.height)*2,o=document.createElement('span');
      o.className='rip';o.setAttribute('aria-hidden','true');
      o.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
      b.appendChild(o);setTimeout(()=>o.remove(),650);
    });
  });
});

/* menú hamburguesa */
addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('nav'),b=nav&&nav.querySelector('.burger');if(!b)return;
  const set=o=>{nav.classList.toggle('abierto',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')};
  b.addEventListener('click',()=>set(!nav.classList.contains('abierto')));
  nav.querySelectorAll('ul a').forEach(a=>a.addEventListener('click',()=>set(false)));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('abierto')){set(false);b.focus()}});
  document.addEventListener('click',e=>{if(!nav.contains(e.target))set(false)});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)set(false)});
});
