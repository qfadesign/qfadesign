/* Cursor azul de qfadesign: un punto azul redondo que reemplaza al mouse.
   Sobre links y botones se agranda un poco; sobre proyectos (.pj, .pg-s) y fotos ampliables (.zoom) se vuelve un
   círculo grande con texto ("Ver" / "Ampliar"). Para sumar otro elemento: data-cursor="Texto" (o data-cursor="" sin texto).
   En campos de texto y en las pantallas de juego se queda el mouse normal. Solo con mouse (no en celulares).
   Si el fondo que hay debajo es azul (o muy parecido al azul del cursor), el punto cambia solo a blanco o negro para que no se pierda. */
(()=>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  const root=document.documentElement;
  const c=document.createElement('div');c.className='qa-cur';c.setAttribute('aria-hidden','true');
  c.innerHTML='<div class="qa-dot"><span></span></div>';
  document.body.appendChild(c);
  const txt=c.querySelector('span');

  const SEL='a[href],button,[data-cursor],.pj,.pg-s,.zoom,.sv li';
  const NATIVO='input,textarea,select,[contenteditable],svg.stage,.kw,canvas';
  function etiqueta(el){
    if(el.dataset&&el.dataset.cursor!==undefined)return el.dataset.cursor;
    if(el.matches('.zoom'))return 'Ampliar';
    if(el.matches('.pj,.pg-s'))return 'Ver';
    return '';
  }

  // ---- color automático: sobre fondo azul el cursor pasa a blanco o negro ----
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const ratio=(a,b)=>{const A=lum(a),B=lum(b);return (Math.max(A,B)+.05)/(Math.min(A,B)+.05)};
  const rgba=s=>{const m=s&&s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);return p.length>=3?[p[0],p[1],p[2],p.length>3?p[3]:1]:null};
  const AZUL=(()=>{ // el azul de la web (--azul), leído tal como lo ve el navegador
    const t=document.createElement('i');t.style.cssText='color:var(--azul,#0b75f4);position:absolute;visibility:hidden';
    document.body.appendChild(t);const v=rgba(getComputedStyle(t).color);t.remove();return v||[11,117,244,1];
  })();
  // color de fondo real debajo de un elemento: junta las capas semitransparentes hasta dar con una opaca y las mezcla
  function fondoDe(el){
    const capas=[];
    for(let e=el;e&&e.nodeType===1;e=e.parentElement){
      const k=rgba(getComputedStyle(e).backgroundColor);
      if(k&&k[3]>0){capas.push(k);if(k[3]>=.99)break}
    }
    let base=[255,255,255];
    if(capas.length&&capas[capas.length-1][3]>=.99)base=capas.pop().slice(0,3);
    else if(!capas.length)base=[8,71,163];   // sin nada: se ve el azul de fondo de la web
    while(capas.length){const k=capas.pop(),a=k[3];base=[base[0]*(1-a)+k[0]*a,base[1]*(1-a)+k[1]*a,base[2]*(1-a)+k[2]*a]}
    return base;
  }
  let tono='';
  function colorCursor(el){
    if(!el)return;
    const bg=fondoDe(el);
    let t='';                                   // '' = azul de siempre
    const azulado=bg[2]>bg[0]*1.25&&bg[2]>bg[1]*1.05&&bg[2]>40;   // fondo con tono azul (incluye azules oscuros)
    const r=ratio(bg,AZUL);
    if(r<2.6||(azulado&&r<4.5)){                // azul sobre azul (o casi): no se ve
      t=ratio(bg,[255,255,255])>=3?'b':'n';     // blanco si el fondo es oscuro/medio, negro si es claro
    }
    if(t===tono)return;
    tono=t;
    c.style.setProperty('--qa-c',t==='b'?'#fff':t==='n'?'#000':'');
    c.style.setProperty('--qa-t',t==='b'?'#000':'#fff');
  }

  let x=-100,y=-100,visible=false,raf=0,lab=null,nat=false,ult=null,tCol=0;
  const render=()=>{raf=0;c.style.transform='translate('+x+'px,'+y+'px)'};
  const modal=()=>!!document.querySelector('dialog[open]');
  function sync(){
    const mostrar=visible&&!nat&&!modal();
    root.classList.toggle('qa',mostrar);
    c.classList.toggle('vis',mostrar);
  }
  function estado(el){
    const activo=!!el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';
    const l=activo?etiqueta(el):null;
    if(l===lab)return;
    lab=l;
    c.classList.toggle('on',activo);
    c.classList.toggle('hay',activo&&!!l);
    if(l)txt.textContent=l;
    root.classList.toggle('qa-on',activo);   // los stickers del inicio dejan de salir
  }
  addEventListener('pointermove',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    x=e.clientX;y=e.clientY;visible=true;
    const t=e.target;
    nat=!!(t&&t.closest&&t.closest(NATIVO));
    estado(!nat&&t&&t.closest?t.closest(SEL):null);
    if(t!==ult||e.timeStamp-tCol>200){ult=t;tCol=e.timeStamp;colorCursor(t)}
    sync();
    if(!raf)raf=requestAnimationFrame(render);
  },{passive:true});
  addEventListener('pointerdown',()=>c.classList.add('down'));
  addEventListener('pointerup',()=>c.classList.remove('down'));
  document.addEventListener('mouseleave',()=>{visible=false;sync()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){visible=false;sync()}});
  addEventListener('scroll',()=>{
    if(!visible)return;
    const t=document.elementFromPoint(x,y);
    colorCursor(t);
    if(!(t&&t.closest&&t.closest(SEL))&&lab!==null){lab=null;c.classList.remove('on','hay');root.classList.remove('qa-on')}
  },{passive:true});
})();
