/* Estela de stickers al mover el mouse, SOLO sobre el hero (solo con mouse; no en celulares ni con "reducir movimiento").
   Los stickers están en img/mouse-stickers/. Para cambiar cuántos salen o cuánto duran, tocá las constantes de abajo. */
(()=>{
  if(self!==top)return;
  if(matchMedia('(hover:none),(pointer:coarse),(prefers-reduced-motion:reduce)').matches)return;

  const DIST=46;        // px de recorrido del mouse entre sticker y sticker (menos = más stickers)
  const PAUSA=32;       // ms mínimos entre stickers
  const DURA=5200;      // ms que dura cada sticker en pantalla
  const MAX=70;         // máximo de stickers a la vez
  // todos los stickers: los 5 de mouse (img/mouse-stickers/*.png) y los de la web (img/stickers/*.svg). [archivo, ancho en px]
  const LISTA={
    qfadesign:['mouse-stickers/qfadesign.png',104],branding:['mouse-stickers/branding.png',100],designer:['mouse-stickers/designer.png',100],
    imposible_de_ignorar:['mouse-stickers/imposible_de_ignorar.png',112],motion_graphics:['mouse-stickers/motion_graphics.png',108],
    acerca:['stickers/acerca.svg',120],portfolio:['stickers/portfolio.svg',116],herramientas:['stickers/herramientas.svg',140],
contacto:['stickers/contacto.svg',114],logo:['stickers/logo-hover.svg',128]
  };
  const ARCHIVOS=Object.keys(LISTA);

  const src=document.currentScript&&document.currentScript.src;
  if(!src)return;
  const hero=document.querySelector('.hero');
  if(!hero)return; // sin hero no hay stickers
  const base=new URL('../img/',src).href;

  const capa=document.createElement('div');
  capa.setAttribute('aria-hidden','true');
  capa.style.cssText='position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden'; // vive dentro del hero: se va con él al scrollear

  let bolsa=[],ultimo=null,acum=0,tPrev=0,vivos=0,prev=null;
  const sacar=()=>{ // baraja: salen todos antes de repetir, sin repetir el mismo dos veces seguidas
    if(!bolsa.length){
      bolsa=ARCHIVOS.slice().sort(()=>Math.random()-.5);
      if(bolsa[bolsa.length-1]===ultimo&&bolsa.length>1)bolsa.unshift(bolsa.pop());
    }
    return ultimo=bolsa.pop();
  };

  function lanzar(x,y){
    if(vivos>=MAX)return;
    const n=sacar(),w=LISTA[n][1]*(.8+Math.random()*.4),rot=(Math.random()*2-1)*18;
    const im=new Image();
    im.src=base+LISTA[n][0];im.alt='';im.draggable=false;
    im.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:auto;margin:${-w*.15}px 0 0 ${-w/2}px;will-change:transform,opacity;filter:drop-shadow(0 4px 6px rgba(0,0,0,.4));user-select:none`;
    capa.appendChild(im);vivos++;
    const a=im.animate([
      {opacity:0,transform:`translateY(10px) scale(.25) rotate(${rot-14}deg)`,offset:0},
      {opacity:1,transform:`translateY(0) scale(1.1) rotate(${rot+2}deg)`,offset:.05,easing:'ease-out'},
      {opacity:1,transform:`translateY(0) scale(1) rotate(${rot}deg)`,offset:.09},
      {opacity:1,transform:`translateY(-4px) scale(1) rotate(${rot}deg)`,offset:.84},
      {opacity:0,transform:`translateY(-18px) scale(.9) rotate(${rot+5}deg)`,offset:1}
    ],{duration:DURA,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    a.onfinish=()=>{im.remove();vivos--};
  }

  hero.addEventListener('pointermove',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    const t=e.target;
    // no en la barra (ahí ya hay stickers), ni sobre campos de texto, ni sobre nada que active el cursor azul (links, botones)
    if(t&&t.closest&&t.closest('nav,input,textarea,select,[contenteditable],.md-on,.pg-s,.pj,.zoom,.sv,a[href],button,[data-cursor]')){acum=0;prev=null;return}
    if(prev){acum+=Math.hypot(e.clientX-prev.x,e.clientY-prev.y)}
    prev={x:e.clientX,y:e.clientY};
    const ahora=performance.now();
    if(acum>=DIST&&ahora-tPrev>=PAUSA){
      acum=0;tPrev=ahora;
      const r=hero.getBoundingClientRect();
      lanzar(e.clientX-r.left,e.clientY-r.top);
    }
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{prev=null;acum=0}); // al salir del hero los que quedaron se terminan solos
  document.addEventListener('visibilitychange',()=>{if(document.hidden){capa.textContent='';vivos=0;prev=null}});

  const montar=()=>{hero.appendChild(capa);
    // precarga para que el primer sticker no parpadee
    (self.requestIdleCallback||setTimeout)(()=>ARCHIVOS.forEach(n=>{new Image().src=base+LISTA[n][0]}));
  };
  document.body?montar():addEventListener('DOMContentLoaded',montar);
})();
