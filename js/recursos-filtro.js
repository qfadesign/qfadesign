/* Recursos: filtro Ver todo / After Effects / Illustrator (sin JS se ve todo) */
(function(){
  var barra=document.querySelector('.rc-filtro');
  if(!barra) return;
  var chips=[].slice.call(barra.querySelectorAll('.rc-chip'));
  var grupos=[].slice.call(document.querySelectorAll('.rc-grupo'));
  var hashes={'after-effects':'ae','illustrator':'ai'};
  barra.hidden=false;
  function aplicar(f,actualizarHash){
    chips.forEach(function(c){c.setAttribute('aria-pressed',String(c.dataset.f===f));});
    grupos.forEach(function(g){
      var ver=(f==='todo'||g.dataset.g===f);
      g.hidden=!ver;
      var t=g.querySelector('.rc-sec');
      if(t) t.hidden=(f!=='todo'); // con un solo filtro no hace falta el subtítulo
    });
    if(actualizarHash && history.replaceState){
      var h=f==='ae'?'#after-effects':f==='ai'?'#illustrator':location.pathname+location.search;
      history.replaceState(null,'',f==='todo'?location.pathname+location.search:h);
    }
  }
  chips.forEach(function(c){c.addEventListener('click',function(){aplicar(c.dataset.f,true);});});
  var inicial=hashes[location.hash.slice(1)]||'todo';
  aplicar(inicial,false);
})();
