/* Cursor azul de qfadesign: un punto azul redondo que reemplaza al mouse.
   Sobre links y botones se agranda un poco; sobre proyectos (.pj, .pg-s) y fotos ampliables (.zoom) se vuelve un
   círculo grande con texto ("Ver" / "Ampliar"). Para sumar otro elemento: data-cursor="Texto" (o data-cursor="" sin texto).
   En campos de texto y en las pantallas de juego se queda el mouse normal. Solo con mouse (no en celulares). */
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
    if(!(t&&t.closest&&t.closest(SEL))&&lab!==null){lab=null;c.classList.remove('on','hay');root.classList.remove('qa-on')}
  },{passive:true});
})();
