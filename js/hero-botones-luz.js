/* INICIO: le pasa a css/hero-botones-luz.css dónde está el cursor dentro de cada botón (.btn → --lx / --ly),
   así la luz azul lo sigue. Con "reducir movimiento" la luz queda centrada. */
(function(){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  function boton(e){return e.target&&e.target.closest?e.target.closest('.btn,.primary,.play-again,.cd-copiar,.res-bajar,.rank-guardar,.rank-sec'):null}
  function pos(e){
    var b=boton(e);if(!b)return;
    var r=b.getBoundingClientRect();
    b.style.setProperty('--lx',(e.clientX-r.left).toFixed(1)+'px');
    b.style.setProperty('--ly',(e.clientY-r.top).toFixed(1)+'px');
  }
  ['pointerover','pointermove','pointerdown'].forEach(function(t){document.addEventListener(t,pos,{passive:true})});
  document.addEventListener('focusout',function(e){
    var b=boton(e);if(!b)return;
    b.style.removeProperty('--lx');b.style.removeProperty('--ly');
  });
})();
