/* HERO (inicio): le pasa a css/hero-botones-luz.css dónde está el cursor dentro de cada botón (--lx / --ly),
   así la luz azul lo sigue. Con "reducir movimiento" la luz queda centrada. */
(function(){
  var bs=document.querySelectorAll('.hero .acciones .btn');
  if(!bs.length)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  function pos(b,e){
    var r=b.getBoundingClientRect();
    b.style.setProperty('--lx',(e.clientX-r.left).toFixed(1)+'px');
    b.style.setProperty('--ly',(e.clientY-r.top).toFixed(1)+'px');
  }
  Array.prototype.forEach.call(bs,function(b){
    ['pointerenter','pointermove','pointerdown'].forEach(function(t){b.addEventListener(t,function(e){pos(b,e)},{passive:true})});
    b.addEventListener('blur',function(){b.style.removeProperty('--lx');b.style.removeProperty('--ly')});
  });
})();
