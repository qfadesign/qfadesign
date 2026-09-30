/* Páginas de proyecto: al tocar una imagen se abre ampliada, con flechas y Esc */
addEventListener('DOMContentLoaded',()=>{
  const imgs=[...document.querySelectorAll('.zoom img')];if(!imgs.length)return;
  const d=document.createElement('dialog');d.className='lb';d.setAttribute('aria-label','Imagen ampliada');
  d.innerHTML='<button class="lb-x" type="button" aria-label="Cerrar">✕</button><button class="lb-p" type="button" aria-label="Imagen anterior">←</button><img alt=""><button class="lb-n" type="button" aria-label="Imagen siguiente">→</button>';
  document.body.appendChild(d);
  const im=d.querySelector('img');let i=0;
  const show=n=>{i=(n+imgs.length)%imgs.length;im.src=imgs[i].currentSrc||imgs[i].src;im.alt=imgs[i].alt};
  const solo=imgs.length<2;if(solo)d.querySelectorAll('.lb-p,.lb-n').forEach(b=>b.hidden=true);
  imgs.forEach((x,n)=>x.closest('.zoom').addEventListener('click',()=>{show(n);d.showModal()}));
  d.querySelector('.lb-x').onclick=()=>d.close();
  d.querySelector('.lb-p').onclick=()=>show(i-1);d.querySelector('.lb-n').onclick=()=>show(i+1);
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  d.addEventListener('keydown',e=>{if(solo)return;if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
});
