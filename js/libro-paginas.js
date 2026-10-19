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
    let single=mq.matches,cur=1,s=0,stage,sheets=[],track,ov,zL,zR,hitL,hitR,bedL,sticky=0;

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
        bedL=el('div','lp-bed l');shift.append(bedL,el('div','lp-bed r'));
        for(let k=0;k<=maxS;k++){
          const sh=el('div','lp-sheet');
          const f=el('div','lp-face f'),b=el('div','lp-face b');
          f.append(page(2*k+1,k<2).firstChild);
          if(2*k+2<=N)b.append(page(2*k+2,k<2).firstChild);
          sh.append(f,b);shift.append(sh);sheets.push(sh);
        }
        zL=el('button','lp-z l',SV.z);zL.type='button';zL.dataset.cursor='Ampliar';
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
      ui();warm();
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
    function place(k){const sh=sheets[k];sh.style.transform=flipped(k)?'rotateY(-180deg)':'rotateY(0deg)';sh.style.zIndex=zFinal(k)}

    /* ---------- pasar páginas ---------- */
    function goS(ns){
      ns=clamp(ns,0,maxS);if(ns===s)return;
      const from=s,fwd=ns>from;s=ns;cur=firstOf(s);
      const ks=[];for(let k=Math.min(from,ns);k<Math.max(from,ns);k++)ks.push(k);if(!fwd)ks.reverse();
      const step=reduce?0:Math.min(130,1000/ks.length);
      ks.forEach((k,i)=>{
        const sh=sheets[k];sh.style.transition='';sh.style.removeProperty('--sh');
        sh.style.zIndex=300+(fwd?maxS-k:k);sh.style.transitionDelay=(i*step)+'ms';
        sh.classList.add('vol');
        sh.style.transform=flipped(k)?'rotateY(-180deg)':'rotateY(0deg)';
        setTimeout(()=>{sh.classList.remove('vol');sh.style.transitionDelay='';sh.style.zIndex=zFinal(k)},DUR+i*step+60);
      });
      ui();
    }
    function goP(n){n=clamp(Math.round(n),1,N);if(single){cur=n;track.style.setProperty('--i',cur-1);ui()}else goS(sOf(n))}
    const turn=d=>single?goP(cur+d):goS(s+d);

    function bindHit(btn,next){
      let st=null,block=false;
      btn.addEventListener('pointerdown',e=>{if(e.button>0)return;st={x:e.clientX,y:e.clientY,id:e.pointerId,drag:false,p:0,t:performance.now(),k:next?s:s-1}});
      btn.addEventListener('pointermove',e=>{
        if(!st||e.pointerId!==st.id)return;
        const dx=e.clientX-st.x,dy=e.clientY-st.y;
        if(!st.drag){
          if(Math.abs(dx)<8)return;
          if(Math.abs(dx)<Math.abs(dy)||(next&&dx>0)||(!next&&dx<0)){st=null;return}
          st.drag=true;btn.setPointerCapture(e.pointerId);
          const sh=sheets[st.k];sh.style.transition='none';sh.style.zIndex=300;
        }
        const w=stage.clientWidth/2;st.p=clamp(Math.abs(dx)/(w*1.05),0,1);
        const sh=sheets[st.k];
        sh.style.transform='rotateY('+(next?-180*st.p:-180+180*st.p)+'deg)';
        sh.style.setProperty('--sh',(Math.sin(st.p*Math.PI)*.3).toFixed(3));
      });
      const end=e=>{
        if(!st||e.pointerId!==st.id)return;
        const d=st;st=null;if(!d.drag)return;
        block=true;setTimeout(()=>block=false,60);
        const v=d.p/Math.max(1,performance.now()-d.t);
        const sh=sheets[d.k];sh.style.transition='';sh.style.removeProperty('--sh');
        if(d.p>.28||(v>.0012&&d.p>.08))goS(next?s+1:s-1);
        else{sh.style.transform=flipped(d.k)?'rotateY(-180deg)':'rotateY(0deg)';setTimeout(()=>sh.style.zIndex=zFinal(d.k),DUR+40)}
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
        hitL.disabled=s===0;hitR.disabled=s>=maxS;
        zL.hidden=s===0;zL.dataset.n=2*s;zL.setAttribute('aria-label','Ampliar la página '+(2*s));
        const r=s===0?1:2*s+1;zR.hidden=r>N;zR.dataset.n=r;zR.setAttribute('aria-label','Ampliar la página '+r);
      }else{
        track.style.setProperty('--i',cur-1);
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
      let d,v,im,tt,bp,bn,pg=1,bw=0,bh=0,vw=0,vh=0,opener=null;
      const S={s:1,x:0,y:0},P=new Map();let pinch=null,lastTap=0,lastTapXY=[0,0],moved=0,swipe=null;
      const MAX=6;
      function make(){
        d=el('dialog','lp-lb');d.setAttribute('aria-label','Página ampliada');
        const top=el('div','lp-lb-top');
        tt=el('p','lp-lb-t');
        const tools=el('div','lp-lb-tools');
        const mk=(c,ic,lab,fn)=>{const b=el('button','lp-lb-b '+c,ic);b.type='button';b.setAttribute('aria-label',lab);b.title=lab;b.addEventListener('click',fn);return b};
        tools.append(mk('mz',SV.m,'Alejar',()=>zoomAt(0,0,S.s/1.6)),mk('pz',SV.p,'Acercar',()=>zoomAt(0,0,S.s*1.6)),mk('fit','<span>Ajustar</span>','Ajustar a la pantalla',()=>{S.s=1;S.x=S.y=0;apply()}),mk('cl',SV.x,'Cerrar',()=>d.close()));
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
          else if(e.key==='+'||e.key==='='){zoomAt(0,0,S.s*1.6);e.preventDefault()}
          else if(e.key==='-'){zoomAt(0,0,S.s/1.6);e.preventDefault()}
          else if(e.key==='0'){S.s=1;S.x=S.y=0;apply();e.preventDefault()}
        });
        d.addEventListener('close',()=>{ROOT.classList.remove('lp-open');goP(pg);if(opener&&opener.focus)opener.focus({preventScroll:true})});
        addEventListener('resize',()=>{if(d.open)layout()});
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
        s2=clamp(s2,1,MAX);const k=s2/S.s;
        S.x=px-k*(px-S.x);S.y=py-k*(py-S.y);S.s=s2;
        if(S.s<1.001){S.s=1;S.x=S.y=0}
        clampXY();apply();
      }
      const rel=e=>{const r=v.getBoundingClientRect();return[e.clientX-r.left-vw/2,e.clientY-r.top-vh/2]};
      function down(e){
        if(e.button>0)return;
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
              if(S.s>1){S.s=1;S.x=S.y=0;apply()}else zoomAt(x,y,2.6);
              lastTap=0;
            }else{lastTap=now;lastTapXY=[x,y]}
          }else if(swipe&&S.s===1){
            const sx=e.clientX-swipe.x,sy=e.clientY-swipe.y;
            if(Math.abs(sx)>70&&Math.abs(sx)>Math.abs(sy)*1.5)go(sx<0?1:-1);
          }
          swipe=null;
        }
      }
      function setPage(n){
        pg=clamp(n,1,N);
        tt.textContent='Página '+pg+' de '+N;
        bp.disabled=pg<=1;bn.disabled=pg>=N;
        im.alt=titulo+', página '+pg;
        im.src=url(pg);
        const hi=new Image(),mine=pg;hi.onload=()=>{if(pg===mine)im.src=hi.src};hi.src=url(pg,true);
        [pg-1,pg+1].forEach(k=>{if(k>=1&&k<=N)new Image().src=url(k)});
        S.s=1;S.x=S.y=0;if(vw)layout();
      }
      function go(dl){const n=pg+dl;if(n<1||n>N)return;setPage(n)}
      return{open(n,from){
        if(!d)make();opener=from||null;
        ROOT.classList.add('lp-open');d.showModal();
        setPage(n);layout();bn.focus({preventScroll:true});
      }};
    })();

    build();
  }
})();
