/* qfadesign — flujo común de los jueguitos nuevos (Kerning, Alinear, La pluma).
   QFAJ.init({nombre,juego,total,ronda(n,consigna),medir()->{pts,txt}|null,detalle()->[[etiqueta,valor]],reset()})
   QFAJ.sortear(id, banco, total) -> elige una pieza por nivel (1..total) del banco, de menos a más difícil.
   Cada pieza del banco es {k:'clave', n:nivel, ...}. Se evitan las ya vistas (se guardan en el navegador) hasta agotar el nivel. */
window.QFAJ={
sortear:function(id,banco,total){
  var key='qfa-vistos-'+id,vistos=[],mem=QFAJ._mem=QFAJ._mem||{};
  try{vistos=JSON.parse(localStorage.getItem(key))||[]}catch(e){vistos=mem[key]||[]}
  if(!Array.isArray(vistos))vistos=[];
  var out=[];
  for(var n=1;n<=total;n++){
    var nivel=banco.filter(function(x){return x.n===n});
    if(!nivel.length)nivel=banco.filter(function(x){return Math.abs(x.n-n)===Math.min.apply(null,banco.map(function(y){return Math.abs(y.n-n)}))});
    var libres=nivel.filter(function(x){return vistos.indexOf(x.k)<0});
    if(!libres.length){vistos=vistos.filter(function(k){return!nivel.some(function(x){return x.k===k})});libres=nivel}
    var p=libres[Math.floor(Math.random()*libres.length)];
    vistos.push(p.k);out.push(p)}
  mem[key]=vistos;try{localStorage.setItem(key,JSON.stringify(vistos))}catch(e){}
  return out},
init:function(o){
  var $=function(i){return document.getElementById(i)},n=0,score=0,sc=$('scoreText'),ok=$('okBtn'),nx=$('nextBtn'),ms=$('message');
  function ronda(){ok.hidden=false;nx.hidden=true;ms.textContent='';var r=$('roundText');r.innerHTML='';r.setAttribute('aria-label','Ronda '+n+' de '+o.total);for(var i=1;i<=o.total;i++){var d=document.createElement('i');d.className='dot'+(i<n?' ok':i==n?' on':'');r.appendChild(d)}sc.textContent=score+' pts';o.ronda(n,$('consigna'))}
  function start(){n=1;score=0;if(o.reset)o.reset();$('startScreen').hidden=true;$('finalScreen').classList.remove('show');$('gameContent').style.display='';ronda()}
  function fin(){$('gameContent').style.display='none';$('finalScreen').classList.add('show');$('finalScore').textContent=score+' pts';
    var b=$('shareBox');b.innerHTML='';
    if(window.QFARanking&&o.juego)QFARanking.montar(b,{juego:o.juego,modo:'Estándar',titulo:o.nombre,puntos:score});
    if(window.QFAResultado)QFAResultado.montar(b,function(){return{juego:o.nombre,puntos:score,detalle:o.detalle()}})}
  ok.onclick=function(){var r=o.medir();if(!r)return;score+=r.pts;sc.textContent=score+' pts';ms.textContent='+'+r.pts+' pts · '+r.txt;ok.hidden=true;nx.hidden=false;nx.textContent=n>=o.total?'Ver resultado':'Siguiente'};
  nx.onclick=function(){if(n>=o.total)return fin();n++;ronda()};
  $('startBtn').onclick=start;$('playAgain').onclick=function(){$('finalScreen').classList.remove('show');start()}}};
