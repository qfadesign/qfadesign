/* qfadesign — burbuja bajo la barra de navegación: al pasar el mouse (o con el foco del teclado)
   por una página del menú aparece una burbuja de vidrio con un resumen de lo que hay ahí.
   Al pasar el mouse por el logo qfadesign aparece una frase sobre diseño (cambia cada vez, sin repetir la anterior).
   Solo en pantallas con mouse; en el celu el menú (hamburguesa) sigue igual. */
(function(){
  'use strict';
  var TEXTOS={
    acerca:{d:'Quién soy, cómo trabajo y un recorrido por mi forma de entender el diseño.'},
    portfolio:{d:'Identidades, motion y editorial: Árbol, Bleko, Miga, ROS.exe, Trazo y más.'},
    herramientas:{d:'Calculadora de precios, brief, paletas, contraste, QR, preparador para imprenta y más.'},
    jueguitos:{d:'Juegos rápidos para entrenar el ojo: color, tipografía, kerning, ahorcado y más.'},
    recursos:{d:'Paneles y extensiones para After Effects, Illustrator y Photoshop, con guía en español.'},
    contacto:{d:'Contame tu proyecto: escribime por mail o por redes y lo charlamos.'}
  };
  // frases del logo: se elige una al azar cada vez que se pasa el mouse (nunca la misma dos veces seguidas)
  var FRASES=[
    'Diseñar es elegir qué se queda y qué se va.',
    'Si todo grita, nada se escucha.',
    'Lo simple no es fácil: es lo que queda después de sacar lo que sobra.',
    'Una marca es lo que dicen de vos cuando no estás.',
    'El espacio en blanco también es una decisión.',
    'Un buen diseño no se nota: se entiende.',
    'Detrás de cada logo hay alguien que cambió la tipografía diez veces.',
    'Cada pixel fue una decisión. Casi todos, a propósito.',
    'La tipografía es la voz de una marca.',
    'Mirá lo cotidiano dos veces: ahí se esconde el diseño.',
    'Una idea clara vale más que mil efectos.',
    'Hecho con mucho mate y paciencia.'
  ];
  var ultima=-1;
  function fraseNueva(){var i;do{i=Math.floor(Math.random()*FRASES.length)}while(FRASES.length>1&&i===ultima);ultima=i;return FRASES[i]}
  var nav=document.querySelector('nav');
  if(!nav||!window.matchMedia)return;
  // al scrollear, el vidrio de la barra se oscurece un poco (CSS: nav.nav-scroll)
  var sc=function(){nav.classList.toggle('nav-scroll',(window.pageYOffset||document.documentElement.scrollTop||0)>40)};
  sc();window.addEventListener('scroll',sc,{passive:true});
  var mq=window.matchMedia('(min-width:761px) and (hover:hover)');
  var links=[].slice.call(nav.querySelectorAll('ul a'));
  if(!links.length)return;
  // el logo es el link de la barra que está fuera de la lista del menú
  var logo=[].slice.call(nav.querySelectorAll('a')).filter(function(a){return !a.closest('ul')})[0]||null;
  if(logo)links.push(logo);

  var b=document.createElement('div');
  b.id='nav-burbuja';b.setAttribute('role','tooltip');b.setAttribute('aria-hidden','true');
  b.innerHTML='<span class="nb-punta" aria-hidden="true"></span><span class="nb-d"></span>';
  document.body.appendChild(b);
  var dd=b.querySelector('.nb-d');
  var actual=null,cerrar=0,abierta=false;

  function clave(a){var h=(a.getAttribute('href')||'').toLowerCase();for(var k in TEXTOS){if(h.indexOf(k)>-1)return k}return null}

  function colocar(){
    if(!actual)return;
    var r=actual.getBoundingClientRect(),n=nav.getBoundingClientRect(),w=b.offsetWidth,vw=document.documentElement.clientWidth,m=12;
    var cx=r.left+r.width/2,x=Math.max(m,Math.min(cx-w/2,vw-w-m));
    b.style.setProperty('--nb-x',Math.round(x)+'px');
    b.style.setProperty('--nb-y',Math.round(n.bottom+10)+'px');
    b.style.setProperty('--nb-punta',Math.round(Math.max(20,Math.min(cx-x,w-20)))+'px');
  }

  function abrir(a){
    var esLogo=(a===logo),k=esLogo?'logo':clave(a);if(!k||!mq.matches||nav.classList.contains('abierto'))return;
    clearTimeout(cerrar);
    if(actual===a&&abierta){colocar();return} // ya está abierta para este link (ej.: mouse + foco): no cambiar la frase
    if(actual&&actual!==a)actual.removeAttribute('aria-describedby');
    actual=a;
    dd.textContent=esLogo?fraseNueva():TEXTOS[k].d;
    b.classList.toggle('nb-frase',esLogo);
    a.setAttribute('aria-describedby','nav-burbuja');
    b.setAttribute('aria-hidden','false');
    colocar();
    if(!abierta){b.classList.add('nb-nueva');void b.offsetWidth;b.classList.add('nb-on');abierta=true;requestAnimationFrame(function(){b.classList.remove('nb-nueva')})}
  }
  function cerrarYa(){
    clearTimeout(cerrar);abierta=false;
    b.classList.remove('nb-on');b.setAttribute('aria-hidden','true');
    if(actual){actual.removeAttribute('aria-describedby');actual=null}
  }
  function cerrarLuego(){clearTimeout(cerrar);cerrar=setTimeout(cerrarYa,120)}

  links.forEach(function(a){
    a.addEventListener('mouseenter',function(){abrir(a)});
    a.addEventListener('focus',function(){abrir(a)});
    a.addEventListener('mouseleave',cerrarLuego);
    a.addEventListener('blur',cerrarLuego);
    a.addEventListener('click',cerrarYa);
  });
  b.addEventListener('mouseenter',function(){clearTimeout(cerrar)});
  b.addEventListener('mouseleave',cerrarLuego);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')cerrarYa()});
  window.addEventListener('scroll',function(){if(abierta)colocar()},{passive:true});
  window.addEventListener('resize',function(){if(abierta){if(!mq.matches)cerrarYa();else colocar()}});
})();
