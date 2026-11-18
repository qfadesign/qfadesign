/* HERO (inicio): parte el titular en palabras para la animación de css/hero-texto.css.
   Cada palabra lleva dos capas: la final (Articulat Heavy, la que ocupa el lugar) y una de Podium Soft estirada al mismo ancho
   que se desvanece mientras la palabra sube. La capa final además se parte en letras: cada una se "revela" con un pequeño retraso
   (efecto ola de izquierda a derecha). En celu agrega cortes de renglón (<br class="br-m">) para apilar el titular en 4 líneas.
   Se llama desde index.html justo después del hero. */
(function(){
  var el=document.querySelector('.hero .intro .titular');
  if(!el||el.classList.contains('tx-pre'))return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;

  // OPCIÓN DEL TITULAR (se puede cambiar acá o definiendo window.qfaHeroOpcion antes de este script):
  //  'sticker' = el titular entra normal con "Facundo" y al final se pega el sticker de qfadesign, torcido, tapando el nombre
  //  'qfa'     = dice "Facundo" y después "CUNDO" se va y entra la Q: queda "QFA"
  var OPCION=window.qfaHeroOpcion==='sticker'?'sticker':'qfa';
  var logo=document.querySelector('.hero .marca img');
  var words=[],n=0,gameIdx=-1,gq=null,gc=null,stWord=null;
  (function split(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(c){
      if(c.nodeType===1){split(c);return}
      if(c.nodeType!==3)return;
      var frag=document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(function(t){
        if(!t)return;
        if(/^\s+$/.test(t)){frag.appendChild(document.createTextNode(' '));return}
        var w=document.createElement('span'),i=document.createElement('span'),f=document.createElement('span'),p=document.createElement('span');
        w.className='hw';w.style.setProperty('--i',n++);
        i.className='hw-i';f.className='hw-f';p.className='hw-p';
        var game=OPCION==='qfa'&&/^facundo,?$/i.test(t);
        function letra(ch,c,extra){var l=document.createElement('span');l.className='hl';l.style.setProperty('--c',c);if(extra!=null)l.style.setProperty('--k',extra);l.textContent=ch;return l}
        if(game){
          // JUEGO: dice "FACUNDO" y se convierte en "QFA": "CUNDO" se va y la Q (azul) entra delante de "FA"
          var q=document.createElement('span'),qi=document.createElement('span'),c=document.createElement('span'),ci=document.createElement('span');
          q.className='gq';qi.className='gi';q.setAttribute('aria-hidden','true');qi.appendChild(letra('Q',0));q.appendChild(qi);
          c.className='gc';ci.className='gi';
          f.appendChild(q);f.appendChild(letra(t[0],0));f.appendChild(letra(t[1],1));
          t.slice(2,7).split('').forEach(function(ch,k){ci.appendChild(letra(ch,2+k,k))});c.appendChild(ci);f.appendChild(c);
          if(t.length>7)f.appendChild(letra(t[7],7));
          w.classList.add('hw-game');gameIdx=n-1;gq=qi;gc=ci;
        }else{
          // letras de la capa final (spans en línea, así se conserva el kerning de la palabra)
          Array.prototype.forEach.call(t,function(ch,k){f.appendChild(letra(ch,k))});
          if(OPCION==='sticker'&&/^facundo,?$/i.test(t))stWord=w;
        }
        w.style.setProperty('--n',t.length);
        p.textContent=game?'':t;p.setAttribute('aria-hidden','true');
        i.appendChild(f);i.appendChild(p);w.appendChild(i);frag.appendChild(w);
        words.push({w:w,f:f,p:p,game:game});
        if(gameIdx>=0&&n-1>gameIdx)w.style.setProperty('--gx','1.5s');
        // corte de renglón solo en celu: después de la palabra con coma y después de la primera palabra de .sub
        if(/,$/.test(t)||(node.classList&&node.classList.contains('sub')&&!node.querySelector('.br-m'))){
          var br=document.createElement('br');br.className='br-m';frag.appendChild(br);
        }
      });
      node.replaceChild(frag,c);
    });
  })(el);
  el.classList.add('tx-pre');

  // STICKER: el mismo sticker azul que aparece al pasar el mouse por el logo de la barra (img/stickers/logo-hover.svg), absoluto sobre el titular; place() la centra sobre la palabra "Facundo,"
  var st=null;
  if(stWord&&logo){
    st=document.createElement('span');st.className='qfa-sticker';st.setAttribute('aria-hidden','true');
    var im=document.createElement('img');im.src=window.qfaHeroSticker||'img/stickers/logo-hover.svg';im.alt='';im.width=579;im.height=152;
    st.appendChild(im);el.appendChild(st);el.classList.add('tx-b');
  }
  function place(){
    if(!st)return;
    var tr=el.getBoundingClientRect(),wr=stWord.getBoundingClientRect(),fs=parseFloat(getComputedStyle(el).fontSize)||40;
    var w=wr.width*1.2;st.style.setProperty('--sw',w.toFixed(1)+'px');
    var h=st.offsetHeight;
    st.style.setProperty('--sl',(wr.left-tr.left+wr.width/2-w/2).toFixed(1)+'px');
    st.style.setProperty('--st',(wr.top-tr.top+wr.height/2+.05*fs-h/2).toFixed(1)+'px');
  }

  // la capa de Podium se estira (scaleX) hasta ocupar el mismo ancho que la palabra final
  function fit(){
    place();
    if(gq&&gc){ // anchos naturales de la Q y de "CUNDO" para animar el cambio
      gq.parentNode.style.setProperty('--wq',gq.getBoundingClientRect().width.toFixed(1)+'px');
      gc.parentNode.style.setProperty('--wc',gc.getBoundingClientRect().width.toFixed(1)+'px');
    }
    words.forEach(function(o){
      if(o.game)return;
      var a=o.f.offsetWidth,b=o.p.offsetWidth;
      if(a&&b)o.w.style.setProperty('--sx',(a/b).toFixed(4));
    });
  }
  function go(){el.classList.remove('tx-go');void el.offsetWidth;el.classList.add('tx-go')}
  window.qfaHeroTexto={replay:go};

  var fs=document.fonts,listas=[];
  if(fs&&fs.load){
    listas=[fs.load('900 1em "articulat-heavy-cf"'),fs.load('300 1em "Podium Var"')].map(function(p){return p.catch(function(){})});
    if(fs.ready)listas.push(fs.ready);
  }
  Promise.race([Promise.all(listas),new Promise(function(r){setTimeout(r,2500)})]).then(function(){fit();go()});

  var rz=0;
  addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(fit,100)});
  addEventListener('load',fit);
})();
