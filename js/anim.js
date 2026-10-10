document.documentElement.classList.add('js');

/* transición entre páginas (estilos en css/shared.css): la página que se va se desvanece, la nueva aparece de a poco */
(()=>{
  const root=document.documentElement;
  if(self!==top||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const OSCURAS=['','index','portfolio','jueguitos','ahorcado','adivina-el-color','adivina-la-tipografia']; // fondo base negro
  const AZULES=['acerca','herramientas','contacto','404','proyecto-arbol','proyecto-bleko','proyecto-dulcemente','proyecto-miga','proyecto-ros','proyecto-trazo','proyecto-f1']; // fondo base azul
  const seg=p=>p.replace(/\/+$/,'').split('/').pop().replace(/\.html$/,'');
  const flag=(k,v)=>{try{v===null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}};

  // stickers de título de las páginas de la barra: al ir a una, el sticker aparece grande en el centro; ya en la página nueva vuela hasta su lugar y se pega como título
  const STK={acerca:['titulo-acerca',493.04,102.69,0],portfolio:['portfolio',445.32,124.86,1],herramientas:['titulo-herramientas',672.35,107.44,0],jueguitos:['jueguitos',488.7,126.74,1],contacto:['titulo-contacto',453.24,98.03,0]}; // [archivo, ancho, alto, fondo negro]
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

  // 1) página que llega: arranca invisible (la barra no) y, cuando está lista, el degradé y el contenido aparecen suave
  let vino=false,st=null;try{vino=!!sessionStorage.getItem('qfa-t');st=JSON.parse(sessionStorage.getItem('qfa-st')||'null');sessionStorage.removeItem('qfa-st')}catch(e){}
  flag('qfa-t',null);
  if(!(st&&st.u&&st.s===seg(location.pathname)))st=null;
  if(vino&&!root.classList.contains('con-intro')){
    root.classList.add('vino','t-in','t-wait');
    const el=st?cartel(st.u,st.w,st.h):null; // el mismo sticker grande que quedó en el centro de la página anterior
    if(el){root.classList.add('qst-in');root.style.background=st.o?'#000':'#0847a3'}
    let listo=false;
    const abrir=()=>{if(listo)return;listo=true;if(el)volar(el);root.classList.remove('t-in','t-wait')};
    addEventListener('DOMContentLoaded',()=>{
      Promise.race([document.fonts?document.fonts.ready:0,new Promise(r=>setTimeout(r,600))]).then(()=>requestAnimationFrame(abrir));
    });
    setTimeout(abrir,2500); // por las dudas
  }

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
    if(document.body)document.body.style.setProperty('--fondo',oscura?'#000':'#0847a3');
    flag('qfa-t','1');
    let espera=320;
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
    setTimeout(()=>{location.href=a.href},espera);
  });
  // volver con el botón "atrás" (página guardada en memoria): devolver la página a su estado normal
  addEventListener('pageshow',e=>{if(e.persisted){root.classList.remove('sale','t-in','t-wait','qst-in');root.style.background='';document.querySelectorAll('.qst').forEach(n=>n.remove());flag('qfa-st',null);if(document.body)document.body.style.removeProperty('--fondo');flag('qfa-t',null)}});
})();
addEventListener('DOMContentLoaded',()=>{const n=document.querySelector('nav');if(!n)return;const set=()=>document.documentElement.style.setProperty('--navh',n.offsetHeight+'px');set();new ResizeObserver(set).observe(n)});
addEventListener('DOMContentLoaded',()=>{
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // orden escalonado
  document.querySelectorAll('.pj,.jg,.hg').forEach((el,i)=>el.style.setProperty('--i',i));
  if(still)return;
  // aparición al hacer scroll
  document.querySelectorAll('.sobre img,.mas,.ayuda,.gran').forEach(el=>el.classList.add('rv'));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.2});
  document.querySelectorAll('.rv').forEach(el=>{
    // la foto recortada con clip-path no "intersecta": observamos su contenedor
    if(el.matches('.sobre img')){const ob=new IntersectionObserver(es=>{if(es[0].isIntersecting){el.classList.add('in');ob.disconnect()}},{threshold:.25});ob.observe(el.parentElement)}
    else io.observe(el);
  });
  // textos de la home (menos el hero): se ven de entrada con poca opacidad y, al scrollear, se van poniendo blancos letra por letra
  const tw=[...document.querySelectorAll('.sobre .txt>*,.lema,.ayuda h3,.ayuda p,.hr-home p')];
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
  const hero=document.querySelector('.hero');
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
  const set=o=>{nav.classList.toggle('abierto',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')};
  b.addEventListener('click',()=>set(!nav.classList.contains('abierto')));
  nav.querySelectorAll('ul a').forEach(a=>a.addEventListener('click',()=>set(false)));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('abierto')){set(false);b.focus()}});
  document.addEventListener('click',e=>{if(!nav.contains(e.target))set(false)});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)set(false)});
});
