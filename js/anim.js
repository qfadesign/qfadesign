document.documentElement.classList.add('js');

/* transición entre páginas (estilos en css/shared.css): la página que se va se desvanece, la nueva aparece de a poco */
(()=>{
  const root=document.documentElement;
  if(self!==top||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const OSCURAS=['','index','portfolio','herramientas','jueguitos','recursos','pack-de-3','pack-de-4','pack-de-5','pack-after','pack-illustrator','qfatype','qfamotion','qfasubtitulos','qfatransition','qfasound','qfabrandboard','qfaexport','qfacolor','qfaphoto','ahorcado','adivina-el-color','adivina-la-tipografia']; // fondo base negro
  const AZULES=['acerca','contacto','404','proyecto-arbol','proyecto-bleko','proyecto-dulcemente','proyecto-miga','proyecto-ros','proyecto-trazo','proyecto-f1','calculadora-de-precios','generador-de-paletas','contraste-de-color','convertidor-de-imagenes','conversor-de-unidades','brief','comprimir-pdf','preparador-para-imprenta','generador-de-qr','simulador-de-publicaciones']; // fondo base azul
  const PJB={'proyecto-arbol':'#3a1a0a','proyecto-bleko':'#82301b','proyecto-dulcemente':'#7a1c40','proyecto-miga':'#0a4aa8','proyecto-ros':'#14073d','proyecto-trazo':'#0b6fd0','proyecto-f1':'#5a0710'}; // fondo de cada proyecto mientras cambia la página
  const MODO='velo'; // transición al entrar a una herramienta: 'velo' (el color aparece y se desvanece) · 'glow' (resplandor, sin tapar la pantalla) · 'circulo' (el color se expande desde donde tocaste)
  const TC={'comprimir-pdf':'#ff1f2e','calculadora-de-precios':'#00e676','generador-de-qr':'#00f0d0','generador-de-paletas':'#ff2e93','contraste-de-color':'#ffd000','convertidor-de-imagenes':'#1e90ff','conversor-de-unidades':'#ff6a00','brief':'#7c3cff','preparador-para-imprenta':'#b6ff00','simulador-de-publicaciones':'#e01bff'}; // color de cada herramienta (el mismo de su tarjeta en Herramientas)
  const seg=p=>p.replace(/\/+$/,'').split('/').pop().replace(/\.html$/,'');
  const flag=(k,v)=>{try{v===null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}};

  // stickers de título de las páginas de la barra: al ir a una, el sticker aparece grande en el centro; ya en la página nueva vuela hasta su lugar y se pega como título
  const STK={acerca:['titulo-acerca',493.04,102.69,0],portfolio:['portfolio',445.32,124.86,1],herramientas:['herramientas',672.35,107.44,1],jueguitos:['jueguitos',488.7,126.74,1],contacto:['titulo-contacto',453.24,98.03,0],recursos:['recursos',444.23,81.77,1]}; // [archivo, ancho, alto, fondo negro]
  const SH0='drop-shadow(0 26px 16px rgba(0,0,0,.42)) drop-shadow(0 4px 6px rgba(0,0,0,.3))',SH1='drop-shadow(0 1px 0 rgba(0,0,0,.3)) drop-shadow(0 4px 6px rgba(0,0,0,.38))';
  const cartel=(u,w,h)=>{const i=new Image();i.className='qst';i.alt='';i.decoding='sync';i.setAttribute('aria-hidden','true');i.style.cssText='--qw:'+w+';--qa:'+(w/h);i.src=u;root.appendChild(i);return i};
  const volar=el=>{
    const img=document.querySelector('.st-h1 img');
    const fin=()=>{if(img)img.style.visibility='';el.remove();root.style.background=''};
    if(!img||!el.animate){if(el.animate)el.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'}).onfinish=fin;else fin();return}
    img.style.animation='none';img.style.visibility='hidden'; // el de la página espera escondido hasta que el sticker aterriza
    const a=el.getBoundingClientRect(),b=img.getBoundingClientRect();
    const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2),k=img.offsetWidth/el.offsetWidth;
    const T=s=>'translate('+dx+'px,'+dy+'px) scale('+s+') rotate(-2deg)';
    el.animate([
      {transform:'rotate(-2deg)',filter:SH0,offset:0,easing:'cubic-bezier(.6,0,.2,1)'},
      {transform:T(k*.9),filter:SH1,offset:.7},   // llega y se aplasta contra la página
      {transform:T(k*1.035),offset:.86},
      {transform:T(k),filter:SH1,offset:1}
    ],{duration:820,fill:'forwards'}).onfinish=fin;
  };

  // degradé de cada proyecto (el mismo que tiene de fondo su página) y proporción de su marca [ancho, alto]
  const PJG={'arbol': 'radial-gradient(90vw 66vw at 95% 0%,rgba(232,120,60,.8),transparent 64%),radial-gradient(60vw 50vw at -5% 58%,rgba(70,30,12,.85),transparent 62%),radial-gradient(50vw 38vw at 100% 94%,rgba(150,170,172,.32),transparent 62%),linear-gradient(#3a1a0a,#120804)', 'bleko': 'radial-gradient(90vw 66vw at 4% 0%,rgba(245,100,70,.8),transparent 64%),radial-gradient(60vw 48vw at 105% 55%,rgba(110,28,22,.75),transparent 62%),radial-gradient(50vw 36vw at 35% 100%,rgba(255,200,120,.26),transparent 60%),linear-gradient(#4a1710,#16080a)', 'dulcemente': 'radial-gradient(90vw 66vw at 94% 0%,rgba(245,120,150,.78),transparent 64%),radial-gradient(60vw 48vw at -5% 60%,rgba(92,46,34,.85),transparent 62%),radial-gradient(50vw 36vw at 70% 100%,rgba(255,225,200,.26),transparent 60%),linear-gradient(#4a2230,#1c0e12)', 'miga': 'radial-gradient(85vw 62vw at 6% 0%,rgba(60,140,255,.75),transparent 64%),radial-gradient(70vw 54vw at 104% 72%,rgba(120,56,22,.85),transparent 64%),radial-gradient(50vw 36vw at 20% 100%,rgba(8,60,150,.55),transparent 60%),linear-gradient(160deg,#0a4aa8,#1a1008 85%)', 'ros': 'radial-gradient(90vw 66vw at 94% 0%,rgba(125,65,255,.85),transparent 64%),radial-gradient(55vw 42vw at -5% 98%,rgba(95,235,45,.28),transparent 62%),radial-gradient(55vw 45vw at -5% 40%,rgba(40,20,110,.7),transparent 62%),linear-gradient(#2a1568,#0b0620)', 'trazo': 'radial-gradient(90vw 62vw at 50% -8%,rgba(40,205,255,.75),transparent 64%),radial-gradient(55vw 45vw at 104% 72%,rgba(2,30,100,.85),transparent 62%),radial-gradient(50vw 36vw at -5% 85%,rgba(60,140,255,.4),transparent 60%),linear-gradient(#0b6fd0,#052250)', 'f1': 'radial-gradient(90vw 66vw at 95% 0%,rgba(235,40,55,.75),transparent 64%),radial-gradient(55vw 45vw at -5% 52%,rgba(2,25,90,.9),transparent 60%),radial-gradient(50vw 36vw at 92% 94%,rgba(70,160,255,.3),transparent 60%),linear-gradient(#4a0c15,#070b1a)'};
  const PJM={"arbol": [876.26, 331.76], "bleko": [539.83, 530.37], "dulcemente": [666.38, 238.25], "miga": [473.14, 202.94], "ros": [752.51, 269.63], "trazo": [705.83, 152.6], "f1": [840.75, 177.83]};
  // tarjeta del portfolio → proyecto: el degradé con los colores del proyecto crece desde la tarjeta hasta cubrir la pantalla y la marca se agranda en el centro;
  // en la página nueva el degradé se funde con el fondo de la página y la marca se achica hasta quedar como título
  const pjAncho=m=>Math.min(root.clientWidth*.8,640,root.clientHeight*.4*m[0]/m[1]);
  const pjCartel=(s,base)=>{
    const n=s.replace('proyecto-',''),g=PJG[n],m=PJM[n];if(!g||!m)return null;
    const W=pjAncho(m),H=W*m[1]/m[0],o=document.createElement('div');o.className='qpj';o.setAttribute('aria-hidden','true');o.style.background=g;
    const l=new Image();l.className='qpj-l'+(n==='f1'?' b':'');l.alt='';l.decoding='sync';l.setAttribute('aria-hidden','true');
    l.style.cssText='width:'+W+'px;height:'+H+'px;margin:'+(-H/2)+'px 0 0 '+(-W/2)+'px';l.src=new URL('img/marcas/'+n+'.svg',base||location.href).href;
    root.appendChild(o);root.appendChild(l);return{o,l,W,H};
  };
  const volarPj=ov=>{
    const{o,l,W}=ov,real=document.querySelector('.pr-t .logo');
    const fin=()=>{o.remove();l.remove();if(real){real.style.visibility=''}root.style.background=''}; // la marca real queda con animation:none: si se reiniciara, desaparecería un rato y volvería a animarse
    if(!real||!o.animate){[o,l].forEach(x=>x.animate?x.animate([{opacity:1},{opacity:0}],{duration:400,fill:'forwards'}):0);setTimeout(fin,420);return}
    scrollTo(0,0);real.style.animation='none';real.style.visibility='hidden'; // la marca de la página espera escondida hasta que la grande aterriza
    const b=real.getBoundingClientRect(),dx=b.left+b.width/2-root.clientWidth/2,dy=b.top+b.height/2-root.clientHeight/2,k=b.width/W;
    l.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale('+k+')'}],{duration:900,delay:80,easing:'cubic-bezier(.65,0,.2,1)',fill:'forwards'}).onfinish=fin;
    o.animate([{opacity:1},{opacity:1,offset:.3},{opacity:0}],{duration:900,delay:80,easing:'ease-out',fill:'forwards'});
  };

  // herramienta: el color de la tarjeta se expande desde donde tocaste hasta cubrir la pantalla; en la página nueva se recoge hacia la esquina de luz de la herramienta
  const tinta=(c,clip)=>{const o=document.createElement('div');o.className='qtc';o.setAttribute('aria-hidden','true');o.style.cssText='position:fixed;inset:0;z-index:41;pointer-events:none;background-color:'+c+';background-image:linear-gradient(135deg,'+c+',color-mix(in srgb,'+c+' 55%,#000));clip-path:'+clip;root.appendChild(o);return o};
  const volarTc=o=>{
    const fin=()=>{o.remove();root.style.background=''};
    if(!o.animate){fin();return}
    if(MODO==='velo'){o.animate([{opacity:1},{opacity:0}],{duration:650,easing:'ease-out',fill:'forwards'}).onfinish=fin;return}
    const x=innerWidth*.92,R=Math.hypot(innerWidth,innerHeight)+20;
    o.animate([{clipPath:'circle('+R+'px at '+x+'px 0px)'},{clipPath:'circle(0px at '+x+'px 0px)'}],{duration:850,delay:60,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'}).onfinish=fin;
  };

  // 1) página que llega: arranca invisible (la barra no) y, cuando está lista, el degradé y el contenido aparecen suave
  const navT=((performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{}).type,histo=navT==='back_forward'||navT==='reload'; // con "atrás", "adelante" o recargar no hay transición
  let vino=false,st=null;try{const t=+sessionStorage.getItem('qfa-t')||0;vino=!histo&&Date.now()-t<8000;st=JSON.parse(sessionStorage.getItem('qfa-st')||'null');sessionStorage.removeItem('qfa-st')}catch(e){} // la bandera vale 8 s: una vieja que quedó guardada no cuenta
  flag('qfa-t',null);if(!vino){st=null;flag('qfa-pj',null);flag('qfa-tc',null)}
  if(!(st&&st.u&&st.s===seg(location.pathname)))st=null;
  if(vino&&!root.classList.contains('con-intro')){
    root.classList.add('vino','t-in','t-wait');
    const el=st?cartel(st.u,st.w,st.h):null;
    let pj=null;try{pj=JSON.parse(sessionStorage.getItem('qfa-pj')||'null');sessionStorage.removeItem('qfa-pj')}catch(e){}
    const po=pj&&pj.s===seg(location.pathname)?pjCartel(pj.s):null;
    if(po){root.classList.add('qst-in');root.style.background=PJB[pj.s]||'#0847a3'} // el mismo sticker grande que quedó en el centro de la página anterior
    if(el){root.classList.add('qst-in');root.style.background=st.o?'#000':'#0847a3'}
    let tc=null;try{tc=JSON.parse(sessionStorage.getItem('qfa-tc')||'null');sessionStorage.removeItem('qfa-tc')}catch(e){}
    const to=!po&&!el&&tc&&tc.s===seg(location.pathname)&&TC[tc.s]&&MODO!=='glow'?tinta(TC[tc.s],MODO==='velo'?'none':'circle('+(Math.hypot(innerWidth,innerHeight)+20)+'px at '+innerWidth*.92+'px 0px)'):null; // herramienta: llega cubierta con el color de su tarjeta
    if(to)root.style.background=TC[tc.s];
    let listo=false;
    const abrir=()=>{if(listo)return;listo=true;if(el)volar(el);if(po)volarPj(po);if(to)volarTc(to);root.classList.remove('t-in','t-wait')};
    addEventListener('DOMContentLoaded',()=>{
      Promise.race([document.fonts?document.fonts.ready:0,new Promise(r=>setTimeout(r,600))]).then(()=>requestAnimationFrame(abrir));
    });
    setTimeout(abrir,2500); // por las dudas
  }

  let irA=0;
  const limpiar=()=>{root.classList.remove('sale','t-in','t-wait','qst-in');root.style.background='';document.querySelectorAll('.qst,.qpj,.qpj-l,.qtc').forEach(n=>n.remove());flag('qfa-st',null);flag('qfa-pj',null);flag('qfa-tc',null);flag('qfa-t',null);if(document.body)document.body.style.removeProperty('--fondo')};
  // 2) página que se va: al tocar un link interno se desvanece y recién ahí cambia de página
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest&&e.target.closest('a[href]');
    if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download')||a.origin!==location.origin||a.pathname===location.pathname)return;
    const s=seg(a.pathname),oscura=OSCURAS.includes(s);
    if(!oscura&&!AZULES.includes(s))return;
    if(root.classList.contains('sale')){e.preventDefault();return}
    if(s===''||s==='index'){ // al inicio, la primera vez de la visita, va la pantalla de entrada: sin transición
      let vista=false;try{vista=!!sessionStorage.getItem('qfa-intro')}catch(_){}
      if(!vista&&!a.hash)return;
    }
    e.preventDefault();
    root.classList.add('sale');
    if(document.body)document.body.style.setProperty('--fondo',oscura?'#000':(TC[s]?(MODO==='glow'?'#000':TC[s]):(PJB[s]||'#0847a3')));
    flag('qfa-t',String(Date.now()));
    let espera=320;
    const pjc=a.closest('.pj,.pg-s,.fd-paper,.pf-c,.dc,.pr-sig'),pim=pjc&&pjc.querySelector('img'),hoja=pjc&&pjc.classList.contains('fd-paper'),sig=!!pjc&&pjc.classList.contains('pr-sig'),pr=(pim||sig)&&(sig?a:(hoja?pim:pjc)).getBoundingClientRect(),rr=pjc&&!sig&&parseFloat(getComputedStyle(hoja?pim:pjc).borderTopLeftRadius),rad=sig?Math.round(pr.height/2)+'px':(hoja?'6px':(rr>0?Math.round(rr)+'px':'28px')); // "Próximo proyecto": el degradé del siguiente nace desde ese link // tarjeta del portfolio, de la home o de Acerca: el degradé nace de la que se tocó, con su mismo redondeo
    const ov=pr&&pr.width>60&&root.animate&&/^proyecto-/.test(s)?pjCartel(s,a.href):null;
    if(ov){ // tarjeta u hoja del portfolio: el degradé del proyecto crece desde ahí hasta cubrir la pantalla y la marca se agranda en el centro
      const cw=root.clientWidth,ch=root.clientHeight,cx=pr.left+pr.width/2-cw/2,cy=pr.top+pr.height/2-ch/2;
      const c0='inset('+Math.round(pr.top)+'px '+Math.round(cw-pr.right)+'px '+Math.round(ch-pr.bottom)+'px '+Math.round(pr.left)+'px round '+rad+')',c1='inset(0px 0px 0px 0px round 0px)',D=760,E='cubic-bezier(.72,0,.16,1)';
      // la foto de la tarjeta viaja dentro del degradé y se disuelve despacio: así el color no "pisa" la foto de golpe (la página que se va se desvanece, la foto queda hasta que el degradé la cubre)
      const conFoto=!!pim&&pjc.matches('.pj,.pg-s,.fd-paper')&&getComputedStyle(pim).display!=='none'; // la foto viaja solo si ocupa toda la tarjeta (no en la vista Lista, ni en tarjetas con texto, ni en el link "Próximo proyecto")
      if(conFoto){
        const fo=(pjc.querySelector('.alt')||pim),cs=getComputedStyle(fo),ph=new Image();ph.alt='';ph.src=fo.currentSrc||fo.src;
        ph.style.cssText='position:absolute;max-width:none;left:'+pr.left+'px;top:'+pr.top+'px;width:'+pr.width+'px;height:'+pr.height+'px;object-fit:'+(cs.objectFit||'cover')+';object-position:'+(cs.objectPosition||'50% 50%');
        ov.o.appendChild(ph);ph.animate([{opacity:1},{opacity:1,offset:.18},{opacity:0}],{duration:D*.6,easing:'ease-out',fill:'forwards'});
      }
      ov.o.animate([{clipPath:c0},{clipPath:c1}],{duration:D,easing:E,fill:'forwards'});
      // la marca aparece cuando el degradé ya va ganando pantalla, se pasa un poquito de tamaño y se asienta (termina igual que en la página nueva)
      ov.l.animate([{transform:'translate('+cx+'px,'+cy+'px) scale('+Math.min(pr.width*.5,ov.W)/ov.W+')',opacity:0},{opacity:1,offset:.38},{transform:'translate(0,0) scale(1.04)',opacity:1,offset:.84},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:D,delay:60,easing:E,fill:'both'});
      flag('qfa-pj',JSON.stringify({s}));espera=D+110;
    }else if(hoja){espera=300} // hoja de la carpeta: ya hizo su propio zoom
    if(TC[s]&&espera===320&&root.animate&&MODO!=='glow'){ // herramienta: el color de su tarjeta cubre la pantalla (en 'glow' alcanza con el desvanecido de siempre)
      if(MODO==='velo'){
        const o=tinta(TC[s],'none');o.style.opacity=0;
        o.animate([{opacity:0},{opacity:1}],{duration:300,easing:'ease-out',fill:'forwards'});espera=340;
      }else{
        const r=a.getBoundingClientRect();let x=e.clientX,y=e.clientY;if(!e.detail||(!x&&!y)){x=r.left+r.width/2;y=r.top+r.height/2}
        const R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+20,c0='circle(0px at '+x+'px '+y+'px)';
        tinta(TC[s],c0).animate([{clipPath:c0},{clipPath:'circle('+R+'px at '+x+'px '+y+'px)'}],{duration:520,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'});espera=560;
      }
      flag('qfa-tc',JSON.stringify({s}));
    }
    const k=STK[s];
    if(k&&!a.hash&&root.animate){ // página de la barra: sticker grande en el centro (se pega como título en la página nueva)
      const u=new URL('img/stickers/'+k[0]+'.svg',a.href).href;
      cartel(u,k[1],k[2]).animate([
        {opacity:0,transform:'translateY(40px) scale(.45) rotate(-16deg)'},
        {opacity:1,offset:.5},
        {transform:'scale(1.06) rotate(-1deg)',offset:.78},
        {opacity:1,transform:'rotate(-2deg)'}
      ],{duration:520,delay:140,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
      flag('qfa-st',JSON.stringify({s,u,w:k[1],h:k[2],o:k[3]}));
      const bg=document.querySelector('.burger[aria-expanded=true]');if(bg)bg.click(); // en celu, cierra el menú para que se vea el sticker
      espera=660;
    }
    clearTimeout(irA);irA=setTimeout(()=>{location.href=a.href},espera);
    setTimeout(()=>{if(root.classList.contains('sale')&&!document.hidden)limpiar()},espera+3500); // si la página nueva no llegó a abrirse, esta vuelve a la normalidad y los links no quedan trabados
  });
  // volver con "atrás" mientras la salida estaba en marcha: se cancela el viaje y la página queda normal
  addEventListener('popstate',()=>{clearTimeout(irA);limpiar()});
  // volver con el botón "atrás" (página guardada en memoria): devolver la página a su estado normal
  addEventListener('pageshow',e=>{if(e.persisted)limpiar()});
})();
addEventListener('DOMContentLoaded',()=>{const n=document.querySelector('nav');if(!n)return;const set=()=>document.documentElement.style.setProperty('--navh',(n.offsetHeight+(parseFloat(getComputedStyle(n).marginTop)||0))+'px');set();new ResizeObserver(set).observe(n)});
addEventListener('DOMContentLoaded',()=>{
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // orden escalonado
  document.querySelectorAll('.pj,.jg,.hg,.ah-chips li').forEach((el,i)=>el.style.setProperty('--i',i));
  if(still)return;
  // aparición al hacer scroll
  document.querySelectorAll('.sobre img:not(.f),.mas,.ayuda,.gran,.foto-band,.qh .vid,.apps-col,.cta>*').forEach(el=>el.classList.add('rv'));
  // aparición por POSICIÓN (no por intersección): apenas el borde de arriba pasa la línea del 92% de la pantalla el elemento ya cuenta como visto,
  // así que si scrolleás rápido y lo pasás de largo igual queda en su lugar (antes se quedaba invisible)
  const base=el=>el.matches('.sobre img:not(.f),.foto-band')?(el.parentElement||el):el; // la foto recortada con clip-path no ocupa lugar propio: se mide su contenedor
  let pend=[...document.querySelectorAll('.rv')],rvT=false;
  const barrer=()=>{
    rvT=false;const lim=innerHeight*.92;
    pend=pend.filter(el=>{if(base(el).getBoundingClientRect().top<lim){el.classList.add('in');return false}return true});
  };
  addEventListener('scroll',()=>{if(!rvT&&pend.length){rvT=true;requestAnimationFrame(barrer)}},{passive:true});
  addEventListener('resize',barrer);addEventListener('load',barrer);barrer();
  // textos de la home (menos el hero): se ven de entrada con poca opacidad y, al scrollear, se van poniendo blancos letra por letra
  const tw=[...document.querySelectorAll('.sobre .txt>*,.banda p,.ayuda h3,.ayuda p,.hr-home p,.ah-a p,.qh p,.foto-band p')];
  if(tw.length){
    const partir=(nodo,out)=>{
      [...nodo.childNodes].forEach(n=>{
        if(n.nodeType===3){
          const f=document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t=>{
            if(!t)return;
            if(/^\s+$/.test(t)){f.appendChild(document.createTextNode(t));return}
            const w=document.createElement('span');w.className='tw-w';
            [...t].forEach(ch=>{const c=document.createElement('span');c.className='tw-c';c.textContent=ch;w.appendChild(c);out.push(c)});
            f.appendChild(w);
          });
          n.replaceWith(f);
        }else if(n.nodeType===1&&n.tagName!=='BR')partir(n,out);
      });
    };
    const datos=new Map();
    tw.forEach(el=>{
      const letras=[];
      const lector=document.createElement('span');lector.className='sr-only';
      while(el.firstChild)lector.appendChild(el.firstChild);          // el texto real queda para lectores de pantalla
      const vis=document.createElement('span');vis.className='tw-vis';vis.setAttribute('aria-hidden','true');
      vis.innerHTML=lector.innerHTML;partir(vis,letras);
      // la puntuación pegada a una palabra (ej. la coma después de un subrayado) viaja con ella: nunca queda sola al inicio del renglón
      vis.querySelectorAll('.tw-w').forEach(w=>{
        if(!/^[,.;:!?…)»”]+$/.test(w.textContent))return;
        const a=w.previousSibling;if(!a||a.nodeType!==1)return;
        const prev=a.classList.contains('tw-w')?a:[...a.querySelectorAll('.tw-w')].pop();
        if(!prev)return;while(w.firstChild)prev.appendChild(w.firstChild);w.remove();
      });
      el.append(lector,vis);el.classList.add('tw');
      datos.set(el,{letras,k:0});
    });
    let tkT=false;
    const pintar=()=>{
      tkT=false;const h=innerHeight;
      tw.forEach(el=>{
        const d=datos.get(el),r=el.getBoundingClientRect();
        // 0 cuando el texto asoma por abajo de la pantalla, 1 cuando ya subió a la mitad (se puede volver atrás scrolleando para arriba)
        const p=Math.max(0,Math.min(1,(h*.92-r.top)/(r.height*.8+h*.25)));
        const n=Math.round(p*d.letras.length);
        if(n>d.k)for(let i=d.k;i<n;i++)d.letras[i].classList.add('on');
        else if(n<d.k)for(let i=n;i<d.k;i++)d.letras[i].classList.remove('on');
        d.k=n;
      });
    };
    addEventListener('scroll',()=>{if(!tkT){tkT=true;requestAnimationFrame(pintar)}},{passive:true});
    addEventListener('resize',pintar);pintar();
  }
  // portfolio de la home: la sección queda pegada a la pantalla y, mientras se scrollea, cambia el proyecto que se ve
  const pf=document.querySelector('.pf');
  if(pf){
    const stage=pf.querySelector('.pf-stage'),slides=[...pf.querySelectorAll('.pf-slide')],btns=[...pf.querySelectorAll('.pf-nav button')],n=slides.length;
    pf.style.setProperty('--n',n);
    let cur=-1,tk=false;
    const poner=i=>{
      if(i===cur)return;cur=i;
      slides.forEach((s,k)=>{s.classList.toggle('on',k<=i);s.classList.toggle('act',k===i);if(k===i)s.removeAttribute('inert');else s.setAttribute('inert','')});
      btns.forEach((b,k)=>b.setAttribute('aria-current',k===i?'true':'false'));
    };
    const medir=()=>{
      tk=false;
      const r=pf.getBoundingClientRect(),rango=r.height-stage.offsetHeight,top0=parseFloat(getComputedStyle(stage).top)||0;
      const p=rango>0?Math.max(0,Math.min(1,(top0-r.top)/rango)):0;
      const i=Math.min(n-1,Math.floor(p*n));
      poner(i);pf.style.setProperty('--lp',(p*n-i).toFixed(3));
    };
    addEventListener('scroll',()=>{if(!tk){tk=true;requestAnimationFrame(medir)}},{passive:true});
    addEventListener('resize',medir);medir();
    btns.forEach((b,k)=>b.addEventListener('click',()=>{
      const rango=pf.offsetHeight-stage.offsetHeight,top0=parseFloat(getComputedStyle(stage).top)||0,top=pf.getBoundingClientRect().top+scrollY;
      scrollTo({top:top-top0+rango*(k+.5)/n,behavior:'smooth'});
    }));
    new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){pf.classList.add('in');o.disconnect()}},{rootMargin:'0px 0px -12% 0px'}).observe(pf);
  }
  // parallax del hero
  const hero=document.querySelector('.hero,.ah');
  if(hero){let t=false;addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{hero.style.setProperty('--py',Math.min(scrollY,600)*.15+'px');t=false})},{passive:true})}
  // botones: se acercan un poco al cursor (con elevación) y sale una onda al tocarlos
  document.querySelectorAll('.btn,.primary,.play-again').forEach(b=>{
    b.addEventListener('mousemove',e=>{if(b.disabled)return;const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.14}px,${(e.clientY-r.top-r.height/2)*.28-3}px)`});
    b.addEventListener('mouseleave',()=>b.style.transform='');
    b.addEventListener('pointerdown',e=>{
      if(b.disabled||e.button>0)return;
      const r=b.getBoundingClientRect(),d=Math.hypot(r.width,r.height)*2,o=document.createElement('span');
      o.className='rip';o.setAttribute('aria-hidden','true');
      o.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
      b.appendChild(o);setTimeout(()=>o.remove(),650);
    });
  });
});

/* menú hamburguesa */
addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('nav'),b=nav&&nav.querySelector('.burger');if(!b)return;
  const logo=nav.querySelector(':scope>a:first-child'),ul=nav.querySelector('ul'),lis=[...nav.querySelectorAll('ul li')];
  /* distancias que usa el CSS: --ly (cuánto baja el logo hasta el borde de abajo) y --up (desde dónde caen los stickers) */
  const medir=()=>{
    if(!logo||!ul)return;
    const bb=b.getBoundingClientRect(),barY=bb.top+bb.height/2,
      pad=parseFloat(getComputedStyle(ul).paddingBottom)||96,
      destino=innerHeight-pad/2; // centro del logo, en el espacio reservado abajo del panel
    nav.style.setProperty('--ly',Math.max(0,destino-barY)+'px');
    const ur=ul.getBoundingClientRect();
    lis.forEach(li=>{const cy=ur.top+li.offsetTop+li.offsetHeight/2;li.style.setProperty('--up',(barY-cy)+'px')});
  };
  const set=o=>{if(o&&!nav.classList.contains('abierto'))medir();nav.classList.toggle('abierto',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')};
  addEventListener('resize',()=>{if(nav.classList.contains('abierto'))medir()});
  b.addEventListener('click',()=>set(!nav.classList.contains('abierto')));
  nav.querySelectorAll('ul a').forEach(a=>a.addEventListener('click',()=>set(false)));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('abierto')){set(false);b.focus()}});
  document.addEventListener('click',e=>{if(!nav.contains(e.target))set(false)});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)set(false)});
});
