/* Pantalla de entrada del inicio: una pantalla azul de la marca con "qfadesign" recortado en el medio (se ve la web por las letras);
   después un zoom hacia adentro de las letras hasta que aparece la web completa.
   Se muestra una vez por visita (sessionStorage). Se salta con un click. No corre si la persona prefiere menos movimiento. */
(()=>{
  const root=document.documentElement;
  let salto=matchMedia('(prefers-reduced-motion:reduce)').matches||!!location.hash;
  try{if(sessionStorage.getItem('qfa-intro'))salto=true;else if(!salto)sessionStorage.setItem('qfa-intro','1')}catch(e){}
  if(salto)return;

  const PATHS=["M614.84,117.55c-15.31-18.07-43.63-26.85-86.59-26.85-46.45,0-79.45,10.17-99.63,30.87l4.15-26.58h-39.07c4.34-6.58,10.66-6.58,13.2-6.58h28.22l12.26-77.48h-49.48c-57.73,0-93.27,28.99-102.91,84.06h-120.71l-1.85,10.47c-11.08-8.45-27.86-14.76-49.41-14.76C52.88,90.7,0,156.31,0,243.3c0,71.41,44.49,96.85,86.13,96.85,19.41,0,37.19-5.48,50.42-12.97l-13.15,90.16h97.3l38.49-244.02h23.14l-26.16,162.54h97.48l25.3-162.54h26.64l-2.57,18.01h68.45c-61.6,11.91-92.81,40.48-92.81,84.99,0,40.56,25.3,63.83,69.4,63.83,18.78,0,42.45-4.47,61.53-22.46l-3.03,18.16h93.64l26.07-163.14c3.85-23.11,0-41.67-11.42-55.17ZM486.73,252.06l18.87-3.86,1.03-.28c1.26-.42,3.33-.78,5.51-1.16,1.82-.32,3.82-.67,5.91-1.13l-.3,1.64c-2.31,12.52-16.42,19.27-28.53,19.27-11.22,0-11.22-3.68-11.22-6.94,0-1.93,0-5.14,8.73-7.54ZM497.6,178.76c.57-3.36,2.32-13.58,21.21-13.58,6.93,0,10.64,1.61,11.72,2.99.54.69.61,1.87.2,3.5l-.54,3.42c-.7,2.59-2.43,5.98-19.95,8.84l-13.96,2.72,1.31-7.88ZM158.25,205.99c0,24.47-15.71,50.68-39.1,50.68-16.13,0-25.37-11.44-25.37-31.38,0-24.58,14.78-51.11,38.67-51.11,16.4,0,25.8,11.59,25.8,31.81Z", "M1903.43,116.97c-13.1-15.36-32.8-23.48-56.97-23.48-27.41,0-48.89,11.14-63.42,26.52l3.57-22.23h-192.06l-1.42,10.43c-9.9-8.47-25.31-14.72-47.39-14.72-58.53,0-98.76,42.57-113.83,93.55l14.08-89.27h-27.54c20.96-6.05,36.32-25.13,36.32-47.68,0-27.16-23.14-50.1-50.53-50.1s-50.96,22.48-50.96,50.1c0,22.54,15.48,41.62,36.62,47.68h-41.33l-23.02,145.99c-3.45-30.58-23.33-44.55-43.5-51.79h44.77l1.31-7.36c4.32-24.19-.41-45.35-13.68-61.2-16.39-19.58-44.81-29.92-82.17-29.92-62.91,0-106.09,31.51-110.17,79.13-7.77-51.22-43.92-79.13-103.81-79.13-68.06,0-119.16,39.83-134.99,100.78l27.54-173.69h-97.42l-14,87.42c-11.02-8.32-27.55-14.51-48.71-14.51-70.13,0-123.01,65.6-123.01,152.6,0,71.41,44.49,96.85,86.13,96.85,19.49,0,37.32-5.52,50.57-13.05l-1.23,8.77h97.24l18.14-114.38c-.25,3.79-.41,7.62-.41,11.52,0,69.18,39.36,108.86,108,108.86,52.97,0,93.54-23.16,116.6-65.7,1.65,13.07,6.59,24.48,14.8,34.08,16.73,19.56,46.32,29.9,85.58,29.9,57.56,0,99.32-20.92,115.52-55.36l-8.05,51.08h97.43l17.38-110.21c-.03,1.31-.08,2.62-.08,3.93,0,60.1,33.32,95.99,89.13,95.99,20.64,0,35.35-5.14,45.72-11.77l-.08.53c-4.08,24.86-13.9,34.11-36.21,34.11-14.08,0-19.16-3.19-20.93-5.1-.96-1.03-2.2-2.9-1.89-7.21l.68-9.57h-88.64l-1.36,7.3c-4.72,25.38-.6,46.09,12.26,61.55,16.58,19.96,46.58,30.07,89.16,30.07s117.83-12.21,139.81-89.63h95.62l21.3-134.13c6.01-24.79,19.09-27.98,29.83-27.98,5.15,0,12.09.96,15.91,5.53,4.56,5.45,4.01,15.05,2.71,22.33l-20.9,134.25h97.42l23.47-151.19c4.67-29.21-.48-53.59-14.89-70.49ZM785.96,208.78c0,24.47-15.71,50.68-39.1,50.68-16.13,0-25.37-11.44-25.37-31.38,0-24.58,14.78-51.11,38.67-51.11,16.4,0,25.8,11.59,25.8,31.81ZM977.88,188.27c6.04-11.75,16.11-17.3,30.99-17.3,9.16,0,15.81,2.11,19.76,6.28,2.82,2.98,4.23,6.99,4.85,11.02h-55.6ZM1026.76,249.59c-4.3,10.54-7.69,18.88-29.89,18.88-12.64,0-22.16-1.72-25.6-21.58h56.6l-1.1,2.7ZM1212.48,172.33c0-2.08,6.36-5.22,15.94-5.22,7.23,0,12.41,1.5,14.97,4.34,2.01,2.22,2.79,5.83,2.3,10.71l-.09.95-10-2.1c-15.71-3.32-23.12-5.26-23.12-8.67ZM1228.5,264.53c0,1.23-4.14,4.79-16.8,4.79-18.98,0-21.02-7.21-21.53-15.23l-.05-.7,26.09,5.72c10.56,2.32,12.25,4.95,12.28,5.43ZM1116.08,241.62c4.77-10.56,7.3-25.2,7.6-43.46,4.04,17.82,15.23,36.15,41.45,47.57h-48.65l.59-1.72h-2.07l1.08-2.4ZM1519.08,218.65c0-20.91,13.18-42.53,35.24-42.53,17.41,0,26.23,9.55,26.23,28.38,0,21.56-12.84,43.39-37.38,43.39-16.21,0-24.09-9.56-24.09-29.24Z"];
  const vw=innerWidth,vh=innerHeight;
  // la marca ocupa ~70% del ancho (86% en celular), centrada
  const W0=Math.min(vw*(vw<761?.86:.7),1100),b=W0/1920,tx=(vw-W0)/2,ty=(vh-428.28*b)/2;
  // punto de la letra más "gorda" cerca del centro: el zoom entra por ahí y la pantalla termina adentro de la letra
  const PX=830,PY=157,R=58;
  const px=tx+PX*b,py=ty+PY*b;
  const lejos=Math.max(Math.hypot(px,py),Math.hypot(vw-px,py),Math.hypot(px,vh-py),Math.hypot(vw-px,vh-py));
  const K=Math.max(8,1.12*lejos/(R*b));

  // el azul de la marca ya no es plano: degradé diagonal + una luz celeste que cruza la pantalla + una sombra profunda que va en sentido contrario
  const RM=Math.max(vw,vh);
  const DEFS='<linearGradient id="qfa-b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0847a3"/><stop offset=".5" stop-color="#0b75f4"/><stop offset="1" stop-color="#3fa0ff"/></linearGradient>'+
    '<radialGradient id="qfa-l" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="'+RM*.75+'"><stop offset="0" stop-color="#9ad6ff" stop-opacity=".9"/><stop offset=".45" stop-color="#5db4ff" stop-opacity=".35"/><stop offset="1" stop-color="#0b75f4" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="qfa-d" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="'+RM*.65+'"><stop offset="0" stop-color="#03225e" stop-opacity=".85"/><stop offset="1" stop-color="#03225e" stop-opacity="0"/></radialGradient>';
  const CAPAS=['qfa-b','qfa-l','qfa-d'].map(id=>'<rect width="'+vw+'" height="'+vh+'" fill="url(#'+id+')"/>').join('');

  const c=document.createElement('div');c.className='carga';c.setAttribute('aria-hidden','true');
  c.innerHTML='<svg width="100%" height="100%" viewBox="0 0 '+vw+' '+vh+'" preserveAspectRatio="none"><defs>'+
    '<mask id="qfa-m" maskUnits="userSpaceOnUse" x="0" y="0" width="'+vw+'" height="'+vh+'"><rect width="'+vw+'" height="'+vh+'" fill="#fff"/>'+
    '<g id="qfa-g">'+PATHS.map(d=>'<path d="'+d+'" fill="#000"/>').join('')+'</g></mask>'+DEFS+'</defs>'+
    '<g mask="url(#qfa-m)">'+CAPAS+'</g></svg>';
  root.classList.add('cargando','pausa','con-intro');
  root.appendChild(c);
  const g=c.querySelector('#qfa-g'),gl=c.querySelector('#qfa-l'),gd=c.querySelector('#qfa-d');
  const tinte=t=>{const p=Math.min(1,t/4200),e=p*p*(3-2*p),w=Math.sin(t/700)*.04;
    gl.setAttribute('cx',vw*(.05+.9*e));gl.setAttribute('cy',vh*(1-.95*e+w));
    gd.setAttribute('cx',vw*(.95-.9*e));gd.setAttribute('cy',vh*(.95*e-w))};
  tinte(0);
  // z = zoom alrededor del punto (cx,cy)
  const set=(z,cx,cy)=>{const s=b*z;g.setAttribute('transform','matrix('+s+' 0 0 '+s+' '+(cx*(1-z)+z*tx)+' '+(cy*(1-z)+z*ty)+')')};
  set(.78,vw/2,vh/2);

  let fin=false;
  const terminar=()=>{if(fin&&!c.isConnected)return;fin=true;root.classList.remove('cargando','pausa');c.remove()};
  c.addEventListener('click',()=>{fin=true;c.style.transition='opacity .3s';c.style.opacity=0;setTimeout(terminar,320)});
  addEventListener('pageshow',e=>{if(e.persisted)terminar()});
  setTimeout(terminar,8000); // por las dudas

  const T1=800,HOLD=350,T2=1800;
  const salida=t=>1-Math.pow(1-t,4),zoom=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  let listo=document.readyState==='complete',t0=null,zs=null,libre=false;
  addEventListener('load',()=>{listo=true});setTimeout(()=>{listo=true},3500);
  const frame=now=>{
    if(fin)return;
    if(t0===null)t0=now;
    const t=now-t0;
    tinte(t);
    if(t<T1)set(.78+.22*salida(t/T1),vw/2,vh/2);
    else if(t<T1+HOLD||!listo)set(1,vw/2,vh/2);
    else{
      if(zs===null)zs=now;
      const u=Math.min((now-zs)/T2,1);
      set(Math.pow(K,zoom(u)),px,py);
      if(!libre&&u>.35){libre=true;root.classList.remove('pausa')} // arrancan las animaciones del inicio
      if(u>.9)c.style.opacity=String(Math.max(0,1-(u-.9)/.1));
      if(u>=1){terminar();return}
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
