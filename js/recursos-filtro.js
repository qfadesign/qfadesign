/* Recursos: Destacados (todos mezclados) / After Effects / Illustrator / Photoshop (sin JS se ve todo por programa) */
(function(){
  var barra=document.querySelector('.rc-filtro');
  if(!barra) return;
  var chips=[].slice.call(barra.querySelectorAll('.rc-chip'));
  var grupos=[].slice.call(document.querySelectorAll('.rc-grupo'));
  var hashes={'after-effects':'ae','illustrator':'ai','photoshop':'ps'};
  barra.hidden=false;

  /* Destacados: todos los recursos mezclados (uno de cada programa, por turnos) */
  var lista=barra.parentNode;
  var mix=document.createElement('div');
  mix.className='rc-grid rc-mix';
  mix.hidden=true;
  var colas=grupos.map(function(g){return [].slice.call(g.querySelectorAll('.rc-grid > article.rc'));});
  var packs=grupos.map(function(g){return g.querySelector(':scope > article.rc-pack');}).filter(Boolean);
  var cards=[];
  var quedan=true;
  while(quedan){
    quedan=false;
    colas.forEach(function(q){
      if(q.length){cards.push(q.shift());quedan=true;}
    });
  }
  /* un pack arriba y el otro a mitad, con los recursos sueltos mezclados entre medio */
  function sumar(n){n.cloneNode&&mix.appendChild(n.cloneNode(true));}
  if(packs[0]) sumar(packs[0]);
  cards.slice(0,3).forEach(sumar);
  if(packs[1]) sumar(packs[1]);
  cards.slice(3).forEach(sumar);
  packs.slice(2).forEach(sumar);
  var pie=lista.querySelector('.rc-pie');
  lista.insertBefore(mix,pie||null);

  /* en celu las opciones van en un desplegable */
  var sel=document.createElement('button');
  sel.type='button';
  sel.className='rc-sel';
  sel.setAttribute('aria-expanded','false');
  sel.innerHTML='<span class="rc-sel-t"></span><span class="rc-sel-f" aria-hidden="true"></span>';
  barra.insertBefore(sel,barra.firstChild);
  function abrir(si){
    barra.classList.toggle('abierto',si);
    sel.setAttribute('aria-expanded',String(si));
  }
  sel.addEventListener('click',function(e){e.stopPropagation();abrir(!barra.classList.contains('abierto'));});
  document.addEventListener('click',function(e){if(!barra.contains(e.target)) abrir(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') abrir(false);});

  function aplicar(f,actualizarHash){
    chips.forEach(function(c){
      var on=c.dataset.f===f;
      c.setAttribute('aria-pressed',String(on));
      if(on) sel.querySelector('.rc-sel-t').textContent=c.textContent;
    });
    mix.hidden=(f!=='todo');
    grupos.forEach(function(g){
      g.hidden=(f==='todo')||g.dataset.g!==f;
      var t=g.querySelector('.rc-sec');
      if(t) t.hidden=true; // con un solo filtro no hace falta el subtítulo
    });
    abrir(false);
    if(actualizarHash && history.replaceState){
      var h=f==='ae'?'#after-effects':f==='ai'?'#illustrator':f==='ps'?'#photoshop':'';
      history.replaceState(null,'',location.pathname+location.search+h);
    }
  }
  chips.forEach(function(c){c.addEventListener('click',function(){aplicar(c.dataset.f,true);});});
  var inicial=hashes[location.hash.slice(1)]||'todo';
  aplicar(inicial,false);
})();

/* al plegar el video de instalación, se pausa */
[].slice.call(document.querySelectorAll('details.rc-video')).forEach(function(d){
  d.addEventListener('toggle',function(){
    var v=d.querySelector('video');
    if(!d.open&&v&&!v.paused) v.pause();
  });
});
