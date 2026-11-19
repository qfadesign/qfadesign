/* Libro de páginas (qfadesign): hojea un manual como libro real.
   · Computadora: dos páginas abiertas, se pasan arrastrando, tocando una página o con las flechas del teclado.
   · Celular: una sola página (más grande), se pasa deslizando.
   · Cada página se amplía con la lupa: zoom con rueda / pellizco / doble toque y arrastre para recorrerla.
   Uso: <div data-lp data-lp-base="img/proyectos/bleko-m" data-lp-n="37" data-lp-ratio="1.4142" data-lp-titulo="..." data-lp-sec='[["Índice",3,4]]'></div>
   Las imágenes son bleko-m01.webp … (para ver) y bleko-m01-z.webp (alta, solo al ampliar). */
(()=>{
  const ROOT=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const DUR=reduce?0:1050;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  /* curva de giro: arranca suave, acelera y frena largo (sin tirones) */
  const bez=(x1,y1,x2,y2)=>{const f=(t,a,b)=>3*a*t*(1-t)*(1-t)+3*b*t*t*(1-t)+t*t*t;return x=>{if(x<=0)return 0;if(x>=1)return 1;let t=x;for(let i=0;i<8;i++){const e=f(t,x1,x2)-x,d=(f(t+1e-4,x1,x2)-f(t,x1,x2))/1e-4;if(Math.abs(e)<1e-4||!d)break;t-=e/d}return f(clamp(t,0,1),y1,y2)}};
  const EASE=bez(.42,0,.2,1);
  /* pose de una hoja: además de girar, se levanta un poco y se tuerce apenas, como papel real */
  const pose=a=>{const b=Math.sin(Math.min(1,Math.abs(a)/180)*Math.PI);return 'rotateY('+a+'deg) translateZ('+(b*34).toFixed(2)+'px) rotateZ('+(-b*.6).toFixed(3)+'deg)'};
  const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
  const SV={
    l:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    r:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    z:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    m:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    p:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'
  };
  document.querySelectorAll('[data-lp]').forEach(init);

  function init(host){
    const base=host.dataset.lpBase,N=+host.dataset.lpN,R=+host.dataset.lpRatio||1.4142;
    const titulo=host.dataset.lpTitulo||'Libro';
    let SEC=[];try{SEC=JSON.parse(host.dataset.lpSec||'[]')}catch(e){}
    const url=(n,z)=>base+String(n).padStart(2,'0')+(z?'-z':'')+'.webp';
    const mq=matchMedia('(max-width:760px)');
    const maxS=Math.floor(N/2);
    let single=mq.matches,cur=1,s=0,stage,sheets=[],track,ov,zL,zR,hitL,hitR,bedL,bedR,castL,castR,peeked=null,hov=null,dragging=0,intro=0;

    host.classList.add('lp');host.textContent='';
    const wrap=el('div','lp-wrap');
    const bar=el('div','lp-bar');
    const bPrev=el('button','lp-b lp-prev',SV.l+'<span>Anterior</span>');bPrev.type='button';bPrev.setAttribute('aria-label','Página anterior');
    const rng=el('input','lp-rng');rng.type='range';rng.min=1;rng.max=N;rng.value=1;rng.setAttribute('aria-label','Ir a la página');
    const bNext=el('button','lp-b lp-next','<span>Siguiente</span>'+SV.r);bNext.type='button';bNext.setAttribute('aria-label','Página siguiente');
    bar.append(bPrev,rng,bNext);
    const meta=el('div','lp-meta');
    const cont=el('p','lp-cont');cont.setAttribute('aria-live','polite');
    const secs=el('div','lp-sec');secs.setAttribute('role','group');secs.setAttribute('aria-label','Ir a una sección');
    SEC.forEach(([t,a,b,full])=>{const c=el('button','lp-c',t);c.type='button';c.dataset.a=a;c.dataset.b=b;c.title=full||t;c.addEventListener('click',()=>goP(a));secs.append(c)});
    meta.append(cont,secs);
    const hint=el('p','lp-hint');
    host.append(wrap,bar,meta,hint);

    const sOf=n=>n<=1?0:Math.floor(n/2);
    const firstOf=k=>k===0?1:2*k;
    const visible=()=>{if(single)return[cur];if(s===0)return[1];const v=[2*s];if(2*s+1<=N)v.push(2*s+1);return v};
    const page=(n,eager)=>{const f=el('div','lp-pg-w');const i=new Image();i.alt=titulo+', página '+n;i.decoding='async';i.draggable=false;i.dataset.src=url(n);if(eager)i.src=i.dataset.src;f.append(i);return f};
    const load=(root,a,b)=>root.querySelectorAll('img[data-src]').forEach(i=>{const n=+i.dataset.src.match(/(\d+)\.webp$/)[1];if(n>=a&&n<=b&&!i.src){i.src=i.dataset.src;if(i.decode)i.decode().catch(()=>{})}});
    function ensure(){const v=visible();if(single)load(wrap,cur-2,cur+3);else load(wrap,v[0]-4,v[v.length-1]+5)}

    /* ---------- construcción según el modo ---------- */
    function build(){
      wrap.textContent='';sheets=[];
      stage=el('div','lp-stage '+(single?'lp-1':'lp-2'));
      stage.style.setProperty('--ar',single?R:2*R);
      ov=el('div','lp-ov');
      zR=el('button','lp-z r',SV.z);zR.type='button';zR.dataset.cursor='Ampliar';
      zR.addEventListener('click',()=>zoom.open(+zR.dataset.n,zR));
      if(single){
        const win=el('div','lp-win');track=el('div','lp-track');
        for(let n=1;n<=N;n++){const f=el('figure','lp-pg');const i=new Image();i.alt=titulo+', página '+n;i.decoding='async';i.draggable=false;i.dataset.src=url(n);f.append(i);track.append(f)}
        win.append(track);stage.append(win);ov.append(zR);stage.append(ov);bindSwipe(win);
        hint.textContent='Deslizá para pasar de página · Con la lupa ampliás la página';
      }else{
        const shift=el('div','lp-shift');
        bedL=el('div','lp-bed l');bedR=el('div','lp-bed r');shift.append(bedL,bedR);
        for(let k=0;k<=maxS;k++){
          const sh=el('div','lp-sheet');
          const f=el('div','lp-face f'),b=el('div','lp-face b');
          f.append(page(2*k+1,k<2).firstChild);
          if(2*k+2<=N)b.append(page(2*k+2,k<2).firstChild);
          sh.append(f,b);sh._r=0;shift.append(sh);sheets.push(sh);
        }
        castL=el('div','lp-cast l');castR=el('div','lp-cast r');shift.append(castL,castR);zL=el('button','lp-z l',SV.z);zL.type='button';zL.dataset.cursor='Ampliar';
        zL.addEventListener('click',()=>zoom.open(+zL.dataset.n,zL));
        hitL=el('button','lp-hit l');hitR=el('button','lp-hit r');
        [hitL,hitR].forEach(h=>h.type='button');
        hitL.dataset.cursor='Anterior';hitR.dataset.cursor='Siguiente';
        hitL.setAttribute('aria-label','Página anterior');hitR.setAttribute('aria-label','Página siguiente');
        ov.append(hitL,hitR,zL,zR);stage.append(shift,ov);
        bindHit(hitR,true);bindHit(hitL,false);
        hint.textContent='Arrastrá una página, tocala o usá las flechas del teclado · Con la lupa ampliás cada página';
      }
      wrap.append(stage);
      s=sOf(cur);
      if(!single){cur=firstOf(s);sheets.forEach((sh,k)=>{sh.style.transition='none';place(k);sh.offsetWidth;sh.style.transition=''})}
      ui();warm();introPeek();
    }
    /* precarga el resto de las páginas de a una, cuando el navegador está libre, para que ningún giro espere una imagen */
    function warm(){
      if(navigator.connection&&navigator.connection.saveData)return;
      const imgs=[...wrap.querySelectorAll('img[data-src]')].filter(i=>!i.src);let k=0;
      const idle=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:800}):f=>setTimeout(f,120);
      const next=()=>{if(k>=imgs.length)return;const i=imgs[k++];if(!i.src){i.src=i.dataset.src;if(i.decode)i.decode().catch(()=>{})}idle(next)};
      setTimeout(next,1500);
    }
    const flipped=k=>k<s;
    const zFinal=k=>flipped(k)?k+1:maxS+1-k;
    const rest=k=>flipped(k)?-180:0;
    function place(k){const sh=sheets[k];sh._an&&sh._an.cancel();sh._an=null;sh._r=rest(k);sh.style.transform=pose(sh._r);sh.style.zIndex=zFinal(k)}
    /* ángulo actual de una hoja (también si está en pleno giro), para poder interrumpirla sin saltos */
    function angleOf(sh){const m=sh._m;if(!sh._an||!m)return sh._r;const t=(performance.now()-m.t0-m.dl)/m.d;return t<=0?m.a0:t>=1?m.a1:m.a0+(m.a1-m.a0)*EASE(t)}
    function flip(sh,to,dur,dl){
      const a0=angleOf(sh);sh._an&&sh._an.cancel();sh._an=null;sh._r=to;sh.style.transform=pose(to);
      if(a0===to||reduce)return 0;
      const d=Math.max(380,dur*Math.abs(to-a0)/180),fr=[];
      for(let i=0;i<=24;i++)fr.push({transform:pose(a0+(to-a0)*EASE(i/24))});
      const an=sh.animate(fr,{duration:d,delay:dl||0,easing:'linear',fill:'backwards'});
      sh._an=an;sh._m={a0,a1:to,t0:performance.now(),dl:dl||0,d};
      an.onfinish=()=>{if(sh._an===an)sh._an=null};
      return d;
    }
    /* al pasar el mouse por el borde, la hoja se despega un poquito (invita a pasarla) */
    function peek(sd){
      if(dragging||reduce||single)return;
      const k=sd==='r'?s:s-1;
      if(k<0||k>=sheets.length||(sd==='r'&&s>=maxS))return;
      const sh=sheets[k];if(sh._an)return;
      peeked=k;flip(sh,sd==='r'?-9:-171,380);
    }
    function unpeek(){if(peeked==null||dragging)return;const k=peeked;peeked=null;flip(sheets[k],rest(k),520)}
    function introPeek(){
      if(single||intro||reduce||!('IntersectionObserver' in window))return;
      const io=new IntersectionObserver(es=>{
        if(!es[0].isIntersecting)return;io.disconnect();intro=1;
        setTimeout(()=>{if(s===0&&!hov&&!dragging&&!sheets[0]._an){flip(sheets[0],-17,620);setTimeout(()=>{if(s===0&&peeked==null&&!hov&&!dragging)flip(sheets[0],0,820)},900)}},500);
      },{threshold:.6});
      io.observe(stage);
    }
    /* sombra que la hoja en movimiento proyecta sobre las páginas de abajo */
    function cast(fwd,from,ns,end){
      if(reduce||!castR)return;
      const run=(c,a)=>c.animate([{opacity:0,offset:0},{opacity:.34,offset:a},{opacity:0,offset:1}],{duration:Math.max(end,300),easing:'ease-in-out'});
      run(castR,fwd?.3:.78);
      if(fwd?from>0:ns>0)run(castL,fwd?.78:.3);
    }

    /* ---------- pasar páginas ---------- */
    function goS(ns){
      ns=clamp(ns,0,maxS);if(ns===s)return;
      const from=s,fwd=ns>from;s=ns;cur=firstOf(s);peeked=null;
      const ks=[];for(let k=Math.min(from,ns);k<Math.max(from,ns);k++)ks.push(k);if(!fwd)ks.reverse();
      const n=ks.length,step=reduce||n<2?0:Math.min(110,560/(n-1)),base=n>2?600:n>1?820:DUR;let end=0;
      ks.forEach((k,i)=>{
        const sh=sheets[k];sh.style.removeProperty('--sh');sh.style.zIndex=300+(fwd?maxS-k:k);
        const d=flip(sh,rest(k),n>2?base*(1+.4*Math.pow(i/(n-1),2)):base,i*step),tot=i*step+d;end=Math.max(end,tot);
        sh.style.setProperty('--vd',d+'ms');sh.style.setProperty('--vl',(i*step)+'ms');sh.classList.add('vol');
        setTimeout(()=>{if(sh._an)return;sh.classList.remove('vol');sh.style.zIndex=zFinal(k)},tot+60);
      });
      cast(fwd,from,ns,end);
      setTimeout(()=>{if(hov)peek(hov)},end+90);
      ui();
    }
    function goP(n){n=clamp(Math.round(n),1,N);if(single){cur=n;track.style.setProperty('--i',cur-1);ui()}else goS(sOf(n))}
    const turn=d=>single?goP(cur+d):goS(s+d);

    function bindHit(btn,next){
      let st=null,block=false,raf=0;
      const ang=p=>next?-180*p:-180+180*p,me=next?'r':'l';
      /* el arrastre se suaviza cuadro a cuadro, así la hoja sigue al dedo/mouse sin saltos */
      const tick=()=>{raf=0;if(!st||!st.drag)return;st.c+=(st.p-st.c)*.38;if(Math.abs(st.p-st.c)<.002)st.c=st.p;const sh=sheets[st.k];sh.style.transform=pose(ang(st.c));sh.style.setProperty('--sh',(Math.sin(st.c*Math.PI)*.3).toFixed(3));if(st.c!==st.p)raf=requestAnimationFrame(tick)};
      btn.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hov=me;peek(me)}});
      btn.addEventListener('pointerleave',()=>{if(hov===me)hov=null;unpeek()});
      btn.addEventListener('pointerdown',e=>{if(e.button>0)return;st={x:e.clientX,y:e.clientY,id:e.pointerId,drag:false,p:0,c:0,t:performance.now(),k:next?s:s-1}});
      btn.addEventListener('pointermove',e=>{
        if(!st||e.pointerId!==st.id)return;
        const dx=e.clientX-st.x,dy=e.clientY-st.y;
        if(!st.drag){
          if(Math.abs(dx)<8)return;
          if(Math.abs(dx)<Math.abs(dy)||(next&&dx>0)||(!next&&dx<0)){st=null;return}
          st.drag=true;dragging=1;peeked=null;btn.setPointerCapture(e.pointerId);
          const sh=sheets[st.k],a=angleOf(sh);sh._an&&sh._an.cancel();sh._an=null;sh._r=a;sh.style.zIndex=300;
          st.c=next?-a/180:(a+180)/180;
        }
        const w=stage.clientWidth/2;st.p=clamp(Math.abs(dx)/(w*1.05),0,1);
        if(!raf)raf=requestAnimationFrame(tick);
      });
      const end=e=>{
        if(!st||e.pointerId!==st.id)return;
        const d=st;st=null;cancelAnimationFrame(raf);raf=0;if(!d.drag)return;
        dragging=0;block=true;setTimeout(()=>block=false,60);
        const sh=sheets[d.k];sh._r=ang(d.c);sh.style.transform=pose(sh._r);sh.style.removeProperty('--sh');
        const v=d.p/Math.max(1,performance.now()-d.t);
        if(d.p>.28||(v>.0012&&d.p>.08))goS(next?s+1:s-1);
        else{const dd=flip(sh,rest(d.k),DUR*.8);setTimeout(()=>{if(!sh._an)sh.style.zIndex=zFinal(d.k)},dd+60)}
      };
      btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);
      btn.addEventListener('click',e=>{if(block){e.preventDefault();return}turn(next?1:-1)});
    }
    function bindSwipe(win){
      let st=null;
      win.addEventListener('pointerdown',e=>{if(e.button>0)return;st={x:e.clientX,y:e.clientY,id:e.pointerId,drag:false,t:performance.now(),dx:0}});
      win.addEventListener('pointermove',e=>{
        if(!st||e.pointerId!==st.id)return;
        const dx=e.clientX-st.x,dy=e.clientY-st.y;
        if(!st.drag){if(Math.abs(dx)<8)return;if(Math.abs(dx)<Math.abs(dy)){st=null;return}st.drag=true;win.setPointerCapture(e.pointerId);track.classList.add('drag')}
        let o=dx;if((cur===1&&dx>0)||(cur===N&&dx<0))o=dx*.3;
        st.dx=dx;track.style.setProperty('--dx',o+'px');
        const goal=Math.abs(dx)>win.clientWidth*.2?cur-1+(dx<0?1:-1):cur-1;[cur-2,cur-1,cur].forEach(i=>track.children[i]&&track.children[i].classList.toggle('on',i===goal));
      });
      const end=e=>{
        if(!st||e.pointerId!==st.id)return;
        const d=st;st=null;if(!d.drag)return;
        track.classList.remove('drag');track.style.setProperty('--dx','0px');
        const w=win.clientWidth,v=Math.abs(d.dx)/Math.max(1,performance.now()-d.t);
        if(Math.abs(d.dx)>w*.2||(v>.5&&Math.abs(d.dx)>30))goP(cur+(d.dx<0?1:-1));
      };
      win.addEventListener('pointerup',end);win.addEventListener('pointercancel',end);
    }

    /* ---------- interfaz ---------- */
    function ui(){
      const v=visible();
      if(!single){
        stage.style.setProperty('--sx',s===0?'-25%':'0%');
        bedL.style.opacity=s>0?1:0;
        const th=s/maxS;bedL.style.setProperty('--t',(1.2+4.2*th).toFixed(2));bedR.style.setProperty('--t',(1.2+4.2*(1-th)).toFixed(2));
        hitL.disabled=s===0;hitR.disabled=s>=maxS;
        zL.hidden=s===0;zL.dataset.n=2*s;zL.setAttribute('aria-label','Ampliar la página '+(2*s));
        const r=s===0?1:2*s+1;zR.hidden=r>N;zR.dataset.n=r;zR.setAttribute('aria-label','Ampliar la página '+r);
      }else{
        track.style.setProperty('--i',cur-1);
        [...track.children].forEach((f,i)=>f.classList.toggle('on',i===cur-1));
        zR.dataset.n=cur;zR.setAttribute('aria-label','Ampliar la página '+cur);
      }
      bPrev.disabled=single?cur<=1:s<=0;bNext.disabled=single?cur>=N:s>=maxS;
      const txt=v.length>1?'Páginas '+v[0]+'–'+v[1]+' de '+N:'Página '+v[0]+' de '+N;
      cont.textContent=txt;rng.value=v[v.length-1];
      const last=v[v.length-1];
      secs.querySelectorAll('.lp-c').forEach(c=>c.setAttribute('aria-pressed',last>=+c.dataset.a&&last<=+c.dataset.b?'true':'false'));
      ensure();
    }
    bPrev.addEventListener('click',()=>turn(-1));bNext.addEventListener('click',()=>turn(1));
    rng.addEventListener('input',()=>{cont.textContent='Ir a la página '+rng.value});
    rng.addEventListener('change',()=>goP(+rng.value));
    host.addEventListener('keydown',e=>{
      if(e.target.matches&&e.target.matches('input'))return;
      if(e.key==='ArrowRight'){turn(1);e.preventDefault()}
      else if(e.key==='ArrowLeft'){turn(-1);e.preventDefault()}
      else if(e.key==='Home'){goP(1);e.preventDefault()}
      else if(e.key==='End'){goP(N);e.preventDefault()}
    });
    mq.addEventListener('change',()=>{single=mq.matches;build()});

    /* ---------- ampliar una página ---------- */
    const zoom=(()=>{
      let tw=0,d,v,im,tt,bp,bn,pg=1,bw=0,bh=0,vw=0,vh=0,opener=null;
      const S={s:1,x:0,y:0},P=new Map();let pinch=null,lastTap=0,lastTapXY=[0,0],moved=0,swipe=null;
      const MAX=6;
      function make(){
        d=el('dialog','lp-lb');d.setAttribute('aria-label','Página ampliada');
        const top=el('div','lp-lb-top');
        tt=el('p','lp-lb-t');
        const tools=el('div','lp-lb-tools');
        const mk=(c,ic,lab,fn)=>{const b=el('button','lp-lb-b '+c,ic);b.type='button';b.setAttribute('aria-label',lab);b.title=lab;b.addEventListener('click',fn);return b};
        tools.append(mk('mz',SV.m,'Alejar',()=>tweenTo(0,0,S.s/1.6)),mk('pz',SV.p,'Acercar',()=>tweenTo(0,0,S.s*1.6)),mk('fit','<span>Ajustar</span>','Ajustar a la pantalla',()=>tweenTo(0,0,1)),mk('cl',SV.x,'Cerrar',()=>shut()));
        top.append(tt,tools);
        v=el('div','lp-lb-v');im=el('img','lp-lb-i');im.draggable=false;v.append(im);
        bp=mk('lp-lb-p',SV.l,'Página anterior',()=>go(-1));bn=mk('lp-lb-n',SV.r,'Página siguiente',()=>go(1));
        bp.classList.remove('lp-lb-b');bn.classList.remove('lp-lb-b');bp.classList.add('lp-lb-a');bn.classList.add('lp-lb-a');
        d.append(top,v,bp,bn);document.body.append(d);
        v.addEventListener('wheel',e=>{e.preventDefault();const r=v.getBoundingClientRect();zoomAt(e.clientX-r.left-vw/2,e.clientY-r.top-vh/2,S.s*Math.exp(-e.deltaY*(e.ctrlKey?.01:.0018)))},{passive:false});
        v.addEventListener('pointerdown',down);v.addEventListener('pointermove',move);
        v.addEventListener('pointerup',up);v.addEventListener('pointercancel',up);
        d.addEventListener('keydown',e=>{
          if(e.key==='ArrowRight'){go(1);e.preventDefault()}
          else if(e.key==='ArrowLeft'){go(-1);e.preventDefault()}
          else if(e.key==='+'||e.key==='='){tweenTo(0,0,S.s*1.6);e.preventDefault()}
          else if(e.key==='-'){tweenTo(0,0,S.s/1.6);e.preventDefault()}
          else if(e.key==='0'){tweenTo(0,0,1);e.preventDefault()}
        });
        d.addEventListener('cancel',e=>{e.preventDefault();shut()});
        d.addEventListener('close',()=>{ROOT.classList.remove('lp-open');goP(pg);if(opener&&opener.focus)opener.focus({preventScroll:true})});
        addEventListener('resize',()=>{if(d.open)layout()});
      }
      /* cerrar con un fundido corto en vez de cortar de golpe */
      function shut(){if(!d.open||d.classList.contains('out'))return;if(reduce){d.close();return}d.classList.add('out');setTimeout(()=>{d.classList.remove('out');d.close()},230)}
      /* zoom con transición suave (botones, teclado y doble toque) */
      function tweenTo(px,py,s2){
        s2=clamp(s2,1,MAX);const k=s2/S.s;let tx=px-k*(px-S.x),ty=py-k*(py-S.y);
        if(s2<1.001){s2=1;tx=ty=0}
        const mw=Math.max(0,(bw*s2-vw)/2),mh=Math.max(0,(bh*s2-vh)/2);
        tx=mw?clamp(tx,-mw,mw):0;ty=mh?clamp(ty,-mh,mh):0;
        cancelAnimationFrame(tw);
        if(reduce){S.s=s2;S.x=tx;S.y=ty;apply();return}
        const f={s:S.s,x:S.x,y:S.y},t0=performance.now();
        const step=now=>{const t=clamp((now-t0)/280,0,1),e=EASE(t);S.s=f.s+(s2-f.s)*e;S.x=f.x+(tx-f.x)*e;S.y=f.y+(ty-f.y)*e;apply();if(t<1)tw=requestAnimationFrame(step)};
        tw=requestAnimationFrame(step);
      }
      function layout(){
        vw=v.clientWidth;vh=v.clientHeight;
        bw=Math.min(vw-16,(vh-16)*R);bh=bw/R;
        im.style.width=bw+'px';im.style.height=bh+'px';
        im.style.left=(vw-bw)/2+'px';im.style.top=(vh-bh)/2+'px';
        clampXY();apply();
      }
      function clampXY(){
        const mw=Math.max(0,(bw*S.s-vw)/2),mh=Math.max(0,(bh*S.s-vh)/2);
        S.x=mw?clamp(S.x,-mw,mw):0;S.y=mh?clamp(S.y,-mh,mh):0;
      }
      function apply(){
        im.style.transform='translate('+S.x+'px,'+S.y+'px) scale('+S.s+')';
        v.classList.toggle('zoomed',S.s>1.001);
      }
      function zoomAt(px,py,s2){
        cancelAnimationFrame(tw);s2=clamp(s2,1,MAX);const k=s2/S.s;
        S.x=px-k*(px-S.x);S.y=py-k*(py-S.y);S.s=s2;
        if(S.s<1.001){S.s=1;S.x=S.y=0}
        clampXY();apply();
      }
      const rel=e=>{const r=v.getBoundingClientRect();return[e.clientX-r.left-vw/2,e.clientY-r.top-vh/2]};
      function down(e){
        if(e.button>0)return;cancelAnimationFrame(tw);
        v.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(P.size===1){moved=0;swipe={x:e.clientX,y:e.clientY,t:performance.now()}}
        if(P.size===2){const[a,b]=[...P.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,s:S.s};swipe=null}
        v.classList.add('grabbing');
      }
      function move(e){
        const p=P.get(e.pointerId);if(!p)return;
        const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
        if(P.size===2&&pinch){
          const[a,b]=[...P.values()];const dist=Math.hypot(a.x-b.x,a.y-b.y)||1;
          const r=v.getBoundingClientRect();
          zoomAt((a.x+b.x)/2-r.left-vw/2,(a.y+b.y)/2-r.top-vh/2,pinch.s*dist/pinch.d);
        }else if(P.size===1&&S.s>1){S.x+=dx;S.y+=dy;clampXY();apply()}
      }
      function up(e){
        const had=P.delete(e.pointerId);if(!had)return;
        if(P.size<2)pinch=null;
        if(P.size===0){
          v.classList.remove('grabbing');
          if(moved<10){
            const now=performance.now(),[x,y]=rel(e);
            if(now-lastTap<320&&Math.hypot(x-lastTapXY[0],y-lastTapXY[1])<40){
              if(S.s>1)tweenTo(0,0,1);else tweenTo(x,y,2.6);
              lastTap=0;
            }else{lastTap=now;lastTapXY=[x,y]}
          }else if(swipe&&S.s===1){
            const sx=e.clientX-swipe.x,sy=e.clientY-swipe.y;
            if(Math.abs(sx)>70&&Math.abs(sx)>Math.abs(sy)*1.5)go(sx<0?1:-1);
          }
          swipe=null;
        }
      }
      function setPage(n,dir){
        cancelAnimationFrame(tw);pg=clamp(n,1,N);
        tt.textContent='Página '+pg+' de '+N;
        bp.disabled=pg<=1;bn.disabled=pg>=N;
        im.alt=titulo+', página '+pg;
        im.src=url(pg);
        const hi=new Image(),mine=pg;hi.onload=()=>{if(pg===mine)im.src=hi.src};hi.src=url(pg,true);
        [pg-1,pg+1].forEach(k=>{if(k>=1&&k<=N)new Image().src=url(k)});
        S.s=1;S.x=S.y=0;if(vw)layout();
        if(dir&&!reduce)im.animate([{opacity:0,translate:(dir*28)+'px 0'},{opacity:1,translate:'0 0'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      function go(dl){const n=pg+dl;if(n<1||n>N)return;setPage(n,dl)}
      return{open(n,from){
        if(!d)make();opener=from||null;
        ROOT.classList.add('lp-open');d.showModal();
        setPage(n);layout();bn.focus({preventScroll:true});
      }};
    })();

    build();
  }
})();
