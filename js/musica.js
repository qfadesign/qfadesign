/* Reproductor de música de qfadesign. Las canciones están en /audio. Para sumar o cambiar una, editá la lista LISTA.
   Recuerda en qué canción y en qué segundo ibas, y si estaba sonando, para seguir al pasar de una página a otra
   (el navegador no deja arrancar música solo: la primera vez empieza cuando tocás el botón). */
(()=>{
  const ART='Milo J';
  const LISTA=[
    ['Vitalicio','01-vitalicio.mp3'],
    ['Olimpo','02-olimpo.mp3'],
    ['Cuando El Agua Hirviendo','03-cuando-el-agua-hirviendo.mp3'],
    ['Recordé','04-recorde.mp3'],
    ['Ama De Mi Sol','05-ama-de-mi-sol.mp3'],
    ['En Día Portación De Rostro','06-en-dia-portacion-de-rostro.mp3'],
    ['Alioli','07-alioli.mp3']
  ];
  const cs=document.currentScript;
  const base=new URL('../audio/',cs?cs.src:location.href).href;
  const K='qfa-musica';
  let st={i:0,t:0,p:false,o:false,v:.2,m:false}; // v: volumen (0 a 1), arranca bajo
  try{Object.assign(st,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
  if(!(st.i>=0&&st.i<LISTA.length))st.i=0;
  if(!(st.v>=0&&st.v<=1))st.v=.2;
  st.o=false; // en cada página arranca escondido
  const guardar=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};

  const IC={
    prev:'<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>',
    next:'<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5l10.5 7L4 19z"/></svg>',
    vol:'<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path class="w" d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="x" d="M15 9.5l5 5M20 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    play:'<svg class="i1" viewBox="0 0 24 24"><path d="M7 4.5v15L19.5 12z"/></svg><svg class="i2" viewBox="0 0 24 24"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>'
  };
  const el=document.createElement('div');el.className='mp';el.setAttribute('role','region');el.setAttribute('aria-label','Música');
  el.innerHTML='<button class="mp-fab" type="button" aria-label="Música" aria-expanded="false"><svg class="mp-nota" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></button>'+
    '<div class="mp-panel"><div class="mp-txt"><span class="mp-t"></span><span class="mp-a"></span></div>'+
    '<button class="mp-c mp-pv" type="button" aria-label="Canción anterior">'+IC.prev+'</button>'+
    '<button class="mp-c mp-pp" type="button" aria-label="Reproducir">'+IC.play+'</button>'+
    '<button class="mp-c mp-n" type="button" aria-label="Canción siguiente">'+IC.next+'</button>'+
    '<div class="mp-v"><button class="mp-c mp-m" type="button" aria-label="Silenciar">'+IC.vol+'</button><input class="mp-r" type="range" min="0" max="100" step="1" aria-label="Volumen"></div>'+
    '<div class="mp-bar" aria-hidden="true"><i></i></div></div>';
  const q=s=>el.querySelector(s);
  const rng=q('.mp-r'),mute=q('.mp-m'),vbox=q('.mp-v');
  const fab=q('.mp-fab'),pp=q('.mp-pp'),tit=q('.mp-t'),art=q('.mp-a'),bar=q('.mp-bar'),fill=q('.mp-bar i');

  const au=new Audio();au.preload='metadata';
  let quiere=st.p,iniciado=false;
  // algunos celulares (iPhone) no dejan cambiar el volumen desde la web: ahí se oculta el control y se usan los botones del teléfono
  au.volume=.5;const volOk=Math.abs(au.volume-.5)<.01;
  if(!volOk)vbox.style.display='none';
  const aplicarVol=()=>{au.muted=!!st.m||st.v===0;rng.value=Math.round(st.v*100);rng.style.setProperty('--p',(st.m?0:st.v*100)+'%');el.classList.toggle('mudo',au.muted);mute.setAttribute('aria-label',au.muted?'Activar sonido':'Silenciar')};
  au.volume=st.v;

  const ui=()=>{
    const [n]=LISTA[st.i];
    tit.textContent=n;art.textContent=ART;
    el.classList.toggle('on',!au.paused);
    el.classList.toggle('abierto',!!st.o);
    fab.setAttribute('aria-expanded',!!st.o);
    pp.setAttribute('aria-label',au.paused?'Reproducir':'Pausar');
    if('mediaSession' in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:n,artist:ART})}catch(e){}}
  };
  const cargar=(i,t)=>{
    st.i=(i+LISTA.length)%LISTA.length;st.t=t||0;
    au.src=base+LISTA[st.i][1];
    if(st.t)au.addEventListener('loadedmetadata',()=>{try{au.currentTime=st.t}catch(e){}},{once:true});
    fill.style.width=(st.t?'':'0')||'';
    ui();guardar();
  };
  const fade=()=>{ // entrada suave al retomar
    au.volume=0;let v=0;const id=setInterval(()=>{v=Math.min(st.v,v+st.v*.1+.005);au.volume=v;if(v>=st.v)clearInterval(id)},40);
  };
  const tocar=(suave)=>{
    quiere=true;st.p=true;guardar();
    if(suave)fade();else au.volume=st.v;
    const r=au.play();
    if(r&&r.catch)r.catch(()=>{ // bloqueado por el navegador: arranca con el primer toque en la página
      au.volume=st.v;
      const go=()=>{removeEventListener('pointerdown',go,true);removeEventListener('keydown',go,true);if(quiere)au.play().catch(()=>{})};
      addEventListener('pointerdown',go,true);addEventListener('keydown',go,true);
    });
  };
  const pausar=()=>{quiere=false;st.p=false;au.pause();guardar()};
  const cambiar=d=>{const sigue=quiere||!au.paused;cargar(st.i+d,0);if(sigue)tocar(false);ui()};

  // se esconde solo a los 4 segundos sin tocarlo (mientras estés encima o usando el volumen, no)
  let idle=0;
  const esconder=()=>{clearTimeout(idle);idle=setTimeout(()=>{if(el.matches(':hover')||el.contains(document.activeElement)&&el.matches(':focus-within')&&document.activeElement.matches(':focus-visible')){esconder();return}st.o=false;ui()},4000)};
  el.addEventListener('pointerdown',()=>{if(st.o)esconder()});
  el.addEventListener('input',()=>{if(st.o)esconder()});
  fab.addEventListener('click',()=>{
    if(!st.o){st.o=true;esconder();if(au.paused&&!iniciado&&!quiere){iniciado=true;tocar(false)}}
    else{st.o=false;clearTimeout(idle)}
    ui();
  });
  pp.addEventListener('click',()=>{iniciado=true;au.paused?tocar(false):pausar()});
  q('.mp-pv').addEventListener('click',()=>{ // si ya pasaron unos segundos, vuelve al inicio de la canción
    if(au.currentTime>3){au.currentTime=0}else cambiar(-1);
  });
  q('.mp-n').addEventListener('click',()=>cambiar(1));
  bar.addEventListener('click',e=>{
    const r=bar.getBoundingClientRect();if(au.duration)au.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*au.duration;
  });
  rng.addEventListener('input',()=>{st.v=rng.value/100;st.m=false;au.volume=st.v;aplicarVol();guardar()});
  mute.addEventListener('click',()=>{if(st.v===0){st.v=.2;au.volume=st.v}else st.m=!st.m;aplicarVol();guardar()});
  au.addEventListener('play',ui);au.addEventListener('pause',ui);
  au.addEventListener('ended',()=>cambiar(1));
  let ult=0;
  au.addEventListener('timeupdate',()=>{
    if(au.duration)fill.style.width=(au.currentTime/au.duration*100)+'%';
    const n=Date.now();if(n-ult>1000){ult=n;st.t=au.currentTime;guardar()}
  });
  addEventListener('pagehide',()=>{st.t=au.currentTime||st.t;guardar()});
  // si abrís otra pestaña de la web y le das play ahí, esta se pausa
  addEventListener('storage',e=>{if(e.key===K&&e.newValue){try{const o=JSON.parse(e.newValue);if(o.p&&!au.paused&&document.hidden){quiere=false;st.p=false;au.pause()}}catch(x){}}});

  if('mediaSession' in navigator){
    const m=navigator.mediaSession;
    try{m.setActionHandler('play',()=>tocar(false));m.setActionHandler('pause',pausar);m.setActionHandler('previoustrack',()=>cambiar(-1));m.setActionHandler('nexttrack',()=>cambiar(1))}catch(e){}
  }

  const montar=()=>{
    document.body.appendChild(el);
    cargar(st.i,st.t);aplicarVol();
    if(st.p){iniciado=true;tocar(true)}
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('ok')));
  };
  if(document.body)montar();else addEventListener('DOMContentLoaded',montar);
})();
