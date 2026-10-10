/* Portfolio del inicio: franjas angostas; la que se toca o se pasa con el mouse se abre y muestra el proyecto.
   Con el mouse abre al pasar; en pantallas táctiles el primer toque abre la franja y el segundo entra al proyecto. */
(()=>{
  const sec=document.querySelector('.pg'),fila=sec&&sec.querySelector('.pg-row');
  if(!fila)return;
  const f=[...fila.children];
  const poner=i=>f.forEach((e,k)=>e.classList.toggle('on',k===i));
  poner(0);
  f.forEach((e,k)=>{
    e.addEventListener('pointerenter',ev=>{if(ev.pointerType!=='touch')poner(k)});
    e.addEventListener('focus',()=>poner(k));
    e.addEventListener('click',ev=>{if(!e.classList.contains('on')){ev.preventDefault();poner(k)}});
  });
  new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){sec.classList.add('in');o.disconnect()}},{rootMargin:'0px 0px -12% 0px'}).observe(sec);
})();
