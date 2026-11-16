/* Frase de abajo del "sobre mí": cada palabra sube desde una máscara y las palabras clave se resaltan estirando el ANCHO
   de la tipografía (eje variable wdth de Podium Soft, ver css/home-nuevo.css), sin bloques de color.
   Cada renglón se ajusta para ocupar todo el ancho. Entra cuando la frase asoma en pantalla y se repite si salís y volvés a pasar por ahí. */
(function(){
  const el=document.querySelector('.lema');
  if(!el||el.querySelector('.lema-vis'))return;
  // palabras clave: se ensanchan mucho más que el resto (n y c se ven igual, quedan por si querés diferenciarlas)
  const CLAVE={proyectos:'n',recursos:'n',jugar:'n',cotidiano:'c'};

  const lineas=[];let act=[];
  el.childNodes.forEach(n=>{
    if(n.nodeType===1&&n.tagName==='BR'){lineas.push(act.join(' '));act=[]}
    else if(n.nodeType===3)act.push(n.textContent);
  });
  lineas.push(act.join(' '));
  const texto=el.textContent.replace(/\s+/g,' ').trim();

  const vis=document.createElement('span');
  vis.className='lema-vis';vis.setAttribute('aria-hidden','true');
  let i=0,k=0;
  const pal=(t,cls,kk)=>{
    const w=document.createElement('span');w.className='lw'+(cls?' k-'+cls:'');
    if(kk!=null)w.style.setProperty('--k',kk);
    const d=document.createElement('span');d.className='lw-i';d.textContent=t;
    w.style.setProperty('--i',i);w.appendChild(d);return w;
  };
  lineas.forEach(l=>{
    const ln=document.createElement('span');ln.className='lema-l';
    l.trim().split(/\s+/).filter(Boolean).forEach((w,j)=>{
      if(j)ln.appendChild(document.createTextNode(' '));
      const g=document.createElement('span');g.className='lww';
      const m=w.match(/^([^\p{L}]*)([\p{L}]+)([^\p{L}]*)$/u);
      const cls=m&&CLAVE[m[2].toLowerCase()];
      // la puntuación pegada a una palabra clave la acompaña
      g.appendChild(cls?pal(w,cls,k++):pal(w));
      ln.appendChild(g);i++;
    });
    vis.appendChild(ln);
  });

  const lector=document.createElement('span');lector.className='sr-only';lector.textContent=texto;
  el.textContent='';el.append(lector,vis);
  el.classList.add('pre');

  // cada renglón se agranda hasta ocupar todo el ancho disponible (en celu fluye normal, sin ajuste)
  const ren=[...vis.querySelectorAll('.lema-l')];
  function ajustar(){
    if(matchMedia('(max-width:760px)').matches){ren.forEach(l=>l.style.removeProperty('--lfs'));return}
    el.classList.add('medir');
    const cs=getComputedStyle(el);
    const disp=el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    ren.forEach(l=>{
      l.style.setProperty('--lfs','100px');
      const w=l.getBoundingClientRect().width;
      if(w>0)l.style.setProperty('--lfs',Math.min(170,100*disp/w*.995).toFixed(2)+'px');
    });
    el.classList.remove('medir');
  }
  ajustar();
  if(document.fonts&&document.fonts.load)document.fonts.load('1em "Podium Var"').then(ajustar,()=>{});
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(ajustar,120)});

  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(still||!('IntersectionObserver' in window)){el.classList.add('in');return}
  // entra cuando se ve buena parte de la frase; se reinicia recién cuando salió por completo de la pantalla
  new IntersectionObserver(es=>es.forEach(e=>{if(e.intersectionRatio>=.45)el.classList.add('in')}),{threshold:[.45]}).observe(el);
  new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)el.classList.remove('in')}),{threshold:0}).observe(el);
})();
