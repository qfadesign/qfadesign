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
  // fondo: la portada, apagada y con degradé, detrás del título. Es adonde llega la tarjeta del portfolio (css/transicion.css)
  (()=>{
    const main=document.querySelector('main'),im=document.querySelector('.pr-portada img'),vd=document.querySelector('.pr-portada video');
    const src=im?(im.currentSrc||im.src):(vd&&vd.poster);
    if(!main||!src)return;
    const f=document.createElement('div');f.className='pr-fondo';f.setAttribute('aria-hidden','true');
    const i=new Image();i.alt='';i.decoding='async';i.src=src;f.appendChild(i);
    main.prepend(f);
  })();
  // tablero: la portada y la galería pasan a ser UNA sola pieza (panel de vidrio) con las imágenes encastradas en mosaico
  (()=>{
    const gal=document.querySelector('.pr-gal'),por=document.querySelector('.pr-portada');
    if(!gal||!por||por.classList.contains('pr-video'))return;
    const figs=[...gal.children].filter(f=>f.tagName==='FIGURE');if(!figs.length)return;
    const tab=document.createElement('div');tab.className='pr-board';
    por.before(tab);tab.append(por,gal);gal.classList.add('mosaico');
    tab.style.setProperty('--tot','"'+String(figs.length+1).padStart(2,'0')+'"');
    const ratio=f=>{const i=f.querySelector('img'),w=i&&+i.getAttribute('width'),h=i&&+i.getAttribute('height');return w&&h?w/h:1.78};
    // ritmo: de a dos, una entera, de a dos, de a dos, una entera… Las imágenes muy anchas (banners) van siempre enteras
    const PAT=['p','f','p','p','f'];let n=0,i=0;
    while(i<figs.length){
      const f=figs[i],sig=figs[i+1];
      if(ratio(f)>2.4){f.classList.add('g-f','g-b');i++;continue}
      if(PAT[n++%PAT.length]==='p'&&sig&&ratio(sig)<=2.4){f.classList.add('g-m');sig.classList.add('g-m');sig.style.setProperty('--d','.14s');i+=2}
      else{f.classList.add('g-f');i++}
    }
  })();
  if(still)return;
  const items=[...document.querySelectorAll('.pr-portada,.pr-gal figure')].map(f=>({f,i:f.querySelector('img')})).filter(o=>o.i);
  if(!items.length||!('IntersectionObserver' in window))return;
  items.forEach(o=>o.i.classList.add('px'));
  const vis=new Set();
  const io=new IntersectionObserver(es=>es.forEach(e=>{const o=items.find(o=>o.f===e.target);if(o)e.isIntersecting?vis.add(o):vis.delete(o)}),{rootMargin:'10% 0px'});
  items.forEach(o=>io.observe(o.f));
  let tick=false;
  const upd=()=>{tick=false;vis.forEach(o=>{const r=o.f.getBoundingClientRect(),p=(r.top+r.height/2-innerHeight/2)/innerHeight;o.i.style.transform='translateY('+(Math.max(-1,Math.min(1,p))*-2.4).toFixed(2)+'%) scale(1.05)'})};
  addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});
  addEventListener('resize',upd);
})();
