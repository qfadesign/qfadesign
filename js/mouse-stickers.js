/* Estela de stickers al mover el mouse (solo con mouse; no en celulares ni con "reducir movimiento").
   Los stickers están en img/mouse-stickers/. Para cambiar cuántos salen o cuánto duran, tocá las constantes de abajo. */
(()=>{
  if(self!==top)return;
  if(matchMedia('(hover:none),(pointer:coarse),(prefers-reduced-motion:reduce)').matches)return;

  const DIST=95;        // px de recorrido del mouse entre sticker y sticker
  const PAUSA=70;       // ms mínimos entre stickers
  const DURA=1250;      // ms que dura cada sticker en pantalla
  const MAX=14;         // máximo de stickers a la vez
  const ARCHIVOS=['qfadesign','branding','designer','imposible_de_ignorar','motion_graphics'];
  // ancho en px de cada sticker (los más altos, un poco más angostos)
  const ANCHO={qfadesign:104,branding:100,designer:100,imposible_de_ignorar:112,motion_graphics:108};

  const src=document.currentScript&&document.currentScript.src;
  if(!src)return;
  const base=new URL('../img/mouse-stickers/',src).href;

  const capa=document.createElement('div');
  capa.setAttribute('aria-hidden','true');
  capa.style.cssText='position:fixed;inset:0;z-index:40;pointer-events:none;overflow:hidden';

  let bolsa=[],ultimo=null,acum=0,tPrev=0,vivos=0,prev=null;
  const sacar=()=>{ // baraja: salen los 5 antes de repetir, sin repetir el mismo dos veces seguidas
    if(!bolsa.length){
      bolsa=ARCHIVOS.slice().sort(()=>Math.random()-.5);
      if(bolsa[bolsa.length-1]===ultimo&&bolsa.length>1)bolsa.unshift(bolsa.pop());
    }
    return ultimo=bolsa.pop();
  };

  function lanzar(x,y){
    if(vivos>=MAX)return;
    const n=sacar(),w=ANCHO[n]*(.85+Math.random()*.3),rot=(Math.random()*2-1)*16;
    const im=new Image();
    im.src=base+n+'.png';im.alt='';im.draggable=false;
    im.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:auto;margin:${-w*.15}px 0 0 ${-w/2}px;will-change:transform,opacity;filter:drop-shadow(0 1px 0 rgba(0,0,0,.3)) drop-shadow(0 5px 7px rgba(0,0,0,.35));user-select:none`;
    capa.appendChild(im);vivos++;
    const a=im.animate([
      {opacity:0,transform:`translateY(10px) scale(.25) rotate(${rot-14}deg)`,offset:0},
      {opacity:1,transform:`translateY(0) scale(1.1) rotate(${rot+2}deg)`,offset:.13,easing:'ease-out'},
      {opacity:1,transform:`translateY(0) scale(1) rotate(${rot}deg)`,offset:.22},
      {opacity:1,transform:`translateY(-3px) scale(1) rotate(${rot}deg)`,offset:.68},
      {opacity:0,transform:`translateY(-16px) scale(.88) rotate(${rot+5}deg)`,offset:1}
    ],{duration:DURA,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    a.onfinish=()=>{im.remove();vivos--};
  }

  addEventListener('pointermove',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    const t=e.target;
    // no en la barra (ahí ya hay stickers) ni sobre campos de texto
    if(t&&t.closest&&t.closest('nav,input,textarea,select,[contenteditable],dialog[open]')){acum=0;prev=null;return}
    if(prev){acum+=Math.hypot(e.clientX-prev.x,e.clientY-prev.y)}
    prev={x:e.clientX,y:e.clientY};
    const ahora=performance.now();
    if(acum>=DIST&&ahora-tPrev>=PAUSA){acum=0;tPrev=ahora;lanzar(e.clientX,e.clientY)}
  },{passive:true});
  document.addEventListener('mouseleave',()=>{prev=null;acum=0});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){capa.textContent='';vivos=0;prev=null}});

  const montar=()=>{document.body.appendChild(capa);
    // precarga para que el primer sticker no parpadee
    (self.requestIdleCallback||setTimeout)(()=>ARCHIVOS.forEach(n=>{new Image().src=base+n+'.png'}));
  };
  document.body?montar():addEventListener('DOMContentLoaded',montar);
})();
