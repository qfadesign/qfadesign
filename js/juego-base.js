/* qfadesign — flujo común de los jueguitos nuevos (Kerning, Alinear, La pluma).
   QFAJ.init({nombre,total,ronda(n,consigna),medir()->{pts,txt}|null,detalle()->[[etiqueta,valor]],reset()}) */
window.QFAJ={init:function(o){
  var $=function(i){return document.getElementById(i)},n=0,score=0,sc=$('scoreText'),ok=$('okBtn'),nx=$('nextBtn'),ms=$('message');
  function ronda(){ok.hidden=false;nx.hidden=true;ms.textContent='';var r=$('roundText');r.innerHTML='';r.setAttribute('aria-label','Ronda '+n+' de '+o.total);for(var i=1;i<=o.total;i++){var d=document.createElement('i');d.className='dot'+(i<n?' ok':i==n?' on':'');r.appendChild(d)}sc.textContent=score+' pts';o.ronda(n,$('consigna'))}
  function start(){n=1;score=0;if(o.reset)o.reset();$('startScreen').hidden=true;$('finalScreen').classList.remove('show');$('gameContent').style.display='';ronda()}
  function fin(){$('gameContent').style.display='none';$('finalScreen').classList.add('show');$('finalScore').textContent=score+' pts';
    var b=$('shareBox');b.innerHTML='';if(window.QFAResultado)QFAResultado.montar(b,function(){return{juego:o.nombre,puntos:score,detalle:o.detalle()}})}
  ok.onclick=function(){var r=o.medir();if(!r)return;score+=r.pts;sc.textContent=score+' pts';ms.textContent='+'+r.pts+' pts · '+r.txt;ok.hidden=true;nx.hidden=false;nx.textContent=n>=o.total?'Ver resultado':'Siguiente'};
  nx.onclick=function(){if(n>=o.total)return fin();n++;ronda()};
  $('startBtn').onclick=start;$('playAgain').onclick=start}};
