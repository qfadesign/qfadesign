/* Cursor azul de qfadesign: un punto azul redondo que reemplaza al mouse.
   Sobre links y botones se agranda un poco; sobre proyectos (.pj, .pg-s) y fotos ampliables (.zoom) se vuelve un
   círculo grande con texto ("Ver" / "Ampliar"). Para sumar otro elemento: data-cursor="Texto" (o data-cursor="" sin texto).
   En campos de texto y en las pantallas de juego se queda el mouse normal. Solo con mouse (no en celulares).
   Color automático: si lo que hay debajo del punto es azul (fondo, degradé o foto azulada), el punto pasa a blanco para no perderse. */
(()=>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  const root=document.documentElement;
  const c=document.createElement('div');c.className='qa-cur';c.setAttribute('aria-hidden','true');
  c.innerHTML='<div class="qa-dot"><span></span></div>';
  document.body.appendChild(c);
  const txt=c.querySelector('span');

  const SEL='a[href],button,[data-cursor],.pj,.pg-s,.zoom,.sv li,.qh .vid[data-p]';
  const NATIVO='input,textarea,select,[contenteditable],svg.stage,.kw,canvas';
  function etiqueta(el){
    if(el.dataset&&el.dataset.cursor!==undefined)return el.dataset.cursor;
    if(el.matches('.zoom'))return 'Ampliar';
    if(el.matches('.pj,.pg-s'))return 'Ver';
    return '';
  }

  /* ---------- color según el fondo ---------- */
  const cv=document.createElement('canvas');cv.width=cv.height=8;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  const imgCache=new Map();
  function promImg(im){                       // color promedio de una foto (cacheado); null si no se puede leer
    const k=im.currentSrc||im.src;
    if(imgCache.has(k))return imgCache.get(k);
    let r=null;
    if(im.complete&&im.naturalWidth){
      try{cx.clearRect(0,0,8,8);cx.drawImage(im,0,0,8,8);
        const d=cx.getImageData(0,0,8,8).data;let R=0,G=0,B=0,n=0;
        for(let i=0;i<d.length;i+=4){if(d[i+3]<40)continue;R+=d[i];G+=d[i+1];B+=d[i+2];n++}
        if(n)r=[R/n,G/n,B/n,1];
      }catch(_){}
      imgCache.set(k,r);
    }
    return r;
  }
  function parse(str){                         // "rgb(...)" / "rgba(...)" -> [r,g,b,a]
    const m=str.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?/);
    if(!m)return null;
    let a=m[4]===undefined?1:(m[4].endsWith('%')?parseFloat(m[4])/100:parseFloat(m[4]));
    return [+m[1],+m[2],+m[3],a];
  }
  function fondo(el){                          // color de lo que se ve detrás del punto
    for(let n=el,i=0;n&&n.nodeType===1&&i<14;n=n.parentElement,i++){
      if(n===c||c.contains(n))continue;
      if(n.tagName==='IMG'){const p=promImg(n);if(p)return p}
      const cs=getComputedStyle(n);
      const bi=cs.backgroundImage;
      if(bi&&bi!=='none'){
        if(bi.indexOf('gradient')>-1){         // degradé: promedio de sus colores
          const cols=(bi.match(/rgba?\([^)]*\)/g)||[]).map(parse).filter(x=>x&&x[3]>.5);
          if(cols.length){const t=[0,0,0];cols.forEach(q=>{t[0]+=q[0];t[1]+=q[1];t[2]+=q[2]});return [t[0]/cols.length,t[1]/cols.length,t[2]/cols.length,1]}
        }else return null;                     // foto de fondo (CSS): no se puede leer, se deja el color normal
      }
      const bg=parse(cs.backgroundColor);
      if(bg&&bg[3]>=.6)return bg;
    }
    return [255,255,255,1];
  }
  function esAzul(q){
    if(!q)return false;
    const r=q[0]/255,g=q[1]/255,b=q[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
    const l=(mx+mn)/2;if(d<.12)return false;                 // grises: no
    const s=d/(1-Math.abs(2*l-1));
    let h;if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;
    h=(h*60+360)%360;
    return h>=190&&h<=260&&s>.35&&l>.08&&l<.8;
  }
  let inv=false,tUlt=0,elUlt=null;
  function tono(el,fuerza){
    const t=performance.now();
    if(!fuerza&&el===elUlt&&t-tUlt<160)return;
    elUlt=el;tUlt=t;
    const v=!!el&&esAzul(fondo(el));
    if(v!==inv){inv=v;c.classList.toggle('inv',v)}
  }

  let x=-100,y=-100,visible=false,raf=0,lab=null,nat=false;
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
    tono(t);
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
    tono(t,true);
    if(!(t&&t.closest&&t.closest(SEL))&&lab!==null){lab=null;c.classList.remove('on','hay');root.classList.remove('qa-on')}
  },{passive:true});
})();
