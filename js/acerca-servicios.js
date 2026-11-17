/* qfadesign — Acerca de, "Mis servicios" en celular: cada servicio se toca y se abre su definición (la misma que se ve en compu),
   con una tarjeta de vidrio teñida con el color de sus proyectos y sus portadas en abanico (como al pasar el mouse en compu).
   Agrega un botón adentro de cada título solo cuando la pantalla es de celular; en compu no cambia nada. */
(function(){
  'use strict';
  var mq=window.matchMedia('(max-width:760px)');
  var items=[].slice.call(document.querySelectorAll('.svc-l li'));
  if(!items.length)return;
  var PJ={arbol:'#e8783c',bleko:'#f56446',dulcemente:'#f57896',miga:'#2f8cff',ros:'#7d41ff',trazo:'#28cdff',f1:'#eb2837'};
  function portadas(li){
    if(li.querySelector('.svc-ph'))return;
    var ks=(li.getAttribute('data-p')||'').split(',').filter(function(k){return PJ[k]});
    if(!ks.length)return;
    var ph=document.createElement('div');ph.className='svc-ph';ph.setAttribute('aria-hidden','true');
    ks.forEach(function(k,i){
      var im=document.createElement('img');im.alt='';im.decoding='async';im.src='img/'+k+'.webp';
      var d=i-(ks.length-1)/2;
      im.style.cssText='--r:'+(d*7)+'deg;--y:'+(Math.abs(d)*3)+'px;z-index:'+(ks.length-Math.abs(Math.round(d)));
      ph.appendChild(im);
    });
    li.appendChild(ph);
  }
  function armar(){
    if(!mq.matches)return;
    items.forEach(function(li,i){
      var h=li.querySelector('h3');if(!h||h.querySelector('.svc-b'))return;
      var p=li.querySelector('.svc-x p');if(!p)return;
      if(!p.id)p.id='svc-d'+(i+1);
      var k=(li.getAttribute('data-p')||'').split(',')[0];
      li.style.setProperty('--c',PJ[k]||'#0b75f4');
      var b=document.createElement('button');
      b.type='button';b.className='svc-b';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',p.id);
      b.innerHTML='<span class="svc-n">'+h.textContent+'</span><i class="svc-m" aria-hidden="true"></i>';
      h.textContent='';h.appendChild(b);
      b.addEventListener('click',function(){
        var abrir=!li.classList.contains('abierto');
        items.forEach(function(o){o.classList.remove('abierto');var x=o.querySelector('.svc-b');if(x)x.setAttribute('aria-expanded','false')});
        if(abrir){portadas(li);requestAnimationFrame(function(){li.classList.add('abierto')});b.setAttribute('aria-expanded','true')}
      });
    });
  }
  armar();
  if(mq.addEventListener)mq.addEventListener('change',armar);
})();
