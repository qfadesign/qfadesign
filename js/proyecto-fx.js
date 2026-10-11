/* Páginas de proyecto: título que aparece letra por letra y galería con parallax suave al scrollear */
(()=>{
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const h=document.querySelector('.pr-t');
  // marca del proyecto en lugar del título de texto (el texto queda como etiqueta para lectores de pantalla)
  const L={arbol:[876.26,331.76,'m'],bleko:[539.83,530.37,'t'],dulcemente:[666.38,238.25,'m'],miga:[473.14,202.94,'m'],ros:[752.51,269.63,'m'],trazo:[705.83,152.6,'w'],f1:[840.75,177.83,'w']};
  const m=location.pathname.match(/proyecto-(\w+)/),lg=m&&L[m[1]];
  if(h&&lg){
    const txt=h.textContent.trim(),i=new Image();
    i.className='logo '+lg[2];i.alt='';i.width=lg[0];i.height=lg[1];i.src='img/marcas/'+m[1]+'.svg';
    h.setAttribute('aria-label',txt);h.textContent='';h.appendChild(i);
  }else if(h&&!still){
    const txt=h.textContent;h.setAttribute('aria-label',txt);h.textContent='';
    [...txt].forEach((ch,i)=>{if(ch===' '){h.appendChild(document.createTextNode(' '));return}const s=document.createElement('span');s.className='lt';s.setAttribute('aria-hidden','true');s.style.setProperty('--i',i);s.textContent=ch;h.appendChild(s)});
  }
  if(still)return;
  const items=[...document.querySelectorAll('.pr-portada,.pr-gal figure')].map(f=>({f,i:f.querySelector('img')})).filter(o=>o.i);
  if(!items.length||!('IntersectionObserver' in window))return;
  items.forEach(o=>o.i.classList.add('px'));
  const vis=new Set();
  const io=new IntersectionObserver(es=>es.forEach(e=>{const o=items.find(o=>o.f===e.target);if(o)e.isIntersecting?vis.add(o):vis.delete(o)}),{rootMargin:'10% 0px'});
  items.forEach(o=>io.observe(o.f));
  let tick=false;
  const upd=()=>{tick=false;vis.forEach(o=>{const r=o.f.getBoundingClientRect(),p=(r.top+r.height/2-innerHeight/2)/innerHeight;o.i.style.transform='translateY('+(p*-5).toFixed(2)+'%) scale(1.1)'})};
  addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});
  addEventListener('resize',upd);
})();
