/* Home: cinta infinita + carrusel "Últimos trabajos" infinito (flechas, puntos, arrastre con mouse y efecto de profundidad) */

/* ---- cinta: repite el texto hasta cubrir la pantalla y gira sin cortes ---- */
(()=>{
  const pista=document.querySelector('.cinta .pista');if(!pista)return;
  const tandas=[...pista.querySelectorAll('.tanda')];
  const base=tandas[0].innerHTML;
  const ajustar=()=>{
    tandas.forEach(t=>t.innerHTML=base);
    let n=0;while(tandas[0].scrollWidth<innerWidth*1.1&&n++<30)tandas.forEach(t=>t.insertAdjacentHTML('beforeend',base));
    pista.style.setProperty('--dur',(tandas[0].scrollWidth/70).toFixed(1)+'s'); // ~70px por segundo
  };
  ajustar();
  let r;addEventListener('resize',()=>{clearTimeout(r);r=setTimeout(ajustar,200)});
  document.fonts&&document.fonts.ready.then(ajustar);
})();

/* ---- carrusel infinito: 5 copias en fila, siempre se vuelve en silencio a la del medio ---- */
(()=>{
  const rail=document.querySelector('.rail');if(!rail)return;
  const orig=[...rail.querySelectorAll('.card')],n=orig.length,wrap=rail.parentElement;
  const prev=wrap.querySelector('[data-d="-1"]'),next=wrap.querySelector('[data-d="1"]'),dots=wrap.querySelector('.puntos');
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const SETS=5,MID=2;
  // copias antes y después (ocultas para lectores y teclado)
  const mk=()=>orig.map(c=>{const k=c.cloneNode(true);k.setAttribute('aria-hidden','true');k.tabIndex=-1;return k});
  for(let s=0;s<MID;s++)rail.insertBefore((()=>{const f=document.createDocumentFragment();mk().forEach(k=>f.appendChild(k));return f})(),rail.firstChild);
  for(let s=MID+1;s<SETS;s++)mk().forEach(k=>rail.appendChild(k));
  const cards=[...rail.querySelectorAll('.card')];
  const setW=()=>cards[n].offsetLeft-cards[0].offsetLeft;
  const pos=i=>{const c=cards[i];return c.offsetLeft-(rail.clientWidth-c.offsetWidth)/2};
  const go=(i,instant)=>rail.scrollTo({left:pos(i),behavior:(still||instant)?'auto':'smooth'});
  orig.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Ir a '+c.textContent.trim());
    b.onclick=()=>{ // va a la copia más cercana de ese trabajo
      let t=cur-(cur%n)+i;if(t-cur>n/2)t-=n;else if(cur-t>n/2)t+=n;go(t)};dots.appendChild(b)});
  let cur=n*MID,t=false,touching=false,timer;
  const update=()=>{
    t=false;const mid=rail.scrollLeft+rail.clientWidth/2;let best=0,bd=1e9;
    cards.forEach((c,i)=>{
      const d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid),k=Math.min(d/c.offsetWidth,1);
      c.style.setProperty('--s',(1-k*.12).toFixed(3));c.style.setProperty('--o',(1-k*.45).toFixed(3));
      if(d<bd){bd=d;best=i}
    });
    cur=best;
    [...dots.children].forEach((b,i)=>i===cur%n?b.setAttribute('aria-current','true'):b.removeAttribute('aria-current'));
  };
  // al frenar, si estamos en una copia de los costados, saltamos (sin que se note) a la del medio
  const recentrar=()=>{
    if(touching||rail.classList.contains('arrastrando'))return;
    const set=Math.floor(cur/n);if(set===MID)return;
    const d=(MID-set)*setW();
    rail.style.scrollSnapType='none';rail.scrollLeft+=d;
    void rail.offsetWidth;rail.style.scrollSnapType='';
    update();
  };
  rail.addEventListener('scroll',()=>{if(!t){t=true;requestAnimationFrame(update)}clearTimeout(timer);timer=setTimeout(recentrar,140)},{passive:true});
  rail.addEventListener('touchstart',()=>{touching=true},{passive:true});
  const fin=()=>{touching=false;clearTimeout(timer);timer=setTimeout(recentrar,200)};
  rail.addEventListener('touchend',fin,{passive:true});rail.addEventListener('touchcancel',fin,{passive:true});
  addEventListener('resize',()=>{go(cur,true);update()});
  prev.onclick=()=>go(cur-1);next.onclick=()=>go(cur+1);
  rail.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();go(cur+1)}if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1)}});
  // arrastrar con el mouse (el touch ya desliza solo)
  let down=false,sx=0,sl=0,moved=0;
  rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;down=true;moved=0;sx=e.clientX;sl=rail.scrollLeft});
  addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));if(moved>6)rail.classList.add('arrastrando');rail.scrollLeft=sl-dx});
  addEventListener('pointerup',()=>{if(!down)return;down=false;if(rail.classList.contains('arrastrando')){rail.classList.remove('arrastrando');go(cur)}});
  rail.addEventListener('click',e=>{if(moved>6){e.preventDefault();moved=0}},true);
  rail.addEventListener('dragstart',e=>e.preventDefault());
  // arranca con el primer trabajo centrado, en la copia del medio
  const start=()=>{go(n*MID,true);update()};
  start();addEventListener('load',start);
})();
