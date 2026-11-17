/* qfadesign — Contacto rápido: al tocar "Contacto" en la barra se abre una ventana flotante en el medio de la pantalla
   con un mini formulario para dejar la consulta sin salir de la página (se envía con Formspree, igual que el de /contacto).
   Abajo: para quien necesita ayuda para contar lo que necesita, un botón que lleva a la página de Contacto (que lo guía
   con opciones y preguntas) y, después, otras formas rápidas (mail, Instagram, copiar mail) (con ctrl/cmd + clic o clic del medio
   en "Contacto" abre esa página directo). El brief sigue estando en Herramientas.
   En la propia página de Contacto no hace nada (ya estás ahí). */
(function(){
  'use strict';
  var nav=document.querySelector('nav');
  if(!nav||document.body.classList.contains('f-contacto'))return;
  var links=[].slice.call(nav.querySelectorAll('ul a[href$="contacto"]'));
  if(!links.length)return;
  var pagina=links[0].getAttribute('href');                 // "contacto" o "../contacto" según la carpeta
  var base=pagina.replace(/contacto$/,'');                  // "" o "../"
  var MAIL='qfadesignn@gmail.com',FORMSPREE_ID='mwlvbvry';

  var ov=document.createElement('div');
  ov.id='cr';ov.setAttribute('aria-hidden','true');
  ov.innerHTML=
   '<div class="cr-v" role="dialog" aria-modal="true" aria-label="Contacto" tabindex="-1">'+
    '<img class="cr-yo" src="'+base+'img/stickers/titulo-contacto.svg" alt="Contacto" width="453.24" height="98.03">'+
    '<button class="cr-x" type="button" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
    '<div class="cr-in">'+
     '<p class="cr-p"><strong>Contacto rápido.</strong> Dejame tu mail y una consulta corta, y te respondo lo antes posible.</p>'+
     '<form class="cr-f" novalidate>'+
      '<input class="cr-hp" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">'+
      '<div class="cr-fila">'+
       '<label>Nombre<input name="nombre" type="text" autocomplete="name" required placeholder="Tu nombre"></label>'+
       '<label>Tu mail<input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label>'+
      '</div>'+
      '<label>Consulta<textarea name="mensaje" rows="3" required placeholder="¿Qué necesitás y para cuándo?"></textarea></label>'+
      '<button class="cr-enviar" type="submit">Enviar consulta</button>'+
      '<p class="cr-aviso" role="status" aria-live="polite"></p>'+
     '</form>'+
     '<div class="cr-ayuda"><p class="cr-ayuda-t">¿Necesitás ayuda para contarme lo que necesitás?</p><a class="cr-ayuda-b" href="'+pagina+'">Armar mi consulta con opciones <span aria-hidden="true">→</span></a></div>'+
     '<div class="cr-otras"><span class="cr-o">O escribime por</span>'+
      '<div class="cr-bs">'+
       '<a href="mailto:'+MAIL+'">Mail</a>'+
       '<a href="https://www.instagram.com/qfadesign/" target="_blank" rel="noopener">Instagram</a>'+
       '<button class="cr-copiar" type="button" aria-live="polite">Copiar mail</button>'+
      '</div>'+
     '</div>'+
    '</div>'+
   '</div>';
  document.body.appendChild(ov);
  var v=ov.querySelector('.cr-v'),form=ov.querySelector('.cr-f'),aviso=ov.querySelector('.cr-aviso'),
      enviar=ov.querySelector('.cr-enviar'),copiar=ov.querySelector('.cr-copiar'),previo=null,tcopia=0,enviando=false;

  // la consulta se estira sola a medida que se escribe (sin barra de scroll)
  function estirar(){var t=form.mensaje;t.style.height='auto';t.style.height=(t.scrollHeight+(t.offsetHeight-t.clientHeight))+'px'}
  form.mensaje.addEventListener('input',estirar);
  function foco(){return [].slice.call(v.querySelectorAll('a[href],button,input:not(.cr-hp),textarea')).filter(function(e){return e.offsetParent!==null})}
  function decir(t,tipo){aviso.className='cr-aviso'+(tipo?' '+tipo:'');aviso.textContent=t}
  function abrir(origen){
    if(ov.classList.contains('cr-on'))return;
    previo=origen||document.activeElement;
    var bg=document.querySelector('.burger[aria-expanded=true]');if(bg)bg.click();   // en celu cierra el menú hamburguesa
    ov.setAttribute('aria-hidden','false');
    ov.classList.add('cr-on');
    document.documentElement.classList.add('cr-bloq');
    var coarse=window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;   // en celu no, para que no salte el teclado
    estirar();
    setTimeout(function(){(coarse?v:(form.nombre.value?form.mensaje:form.nombre)).focus()},60);
  }
  function cerrar(){
    if(!ov.classList.contains('cr-on'))return;
    ov.classList.remove('cr-on');ov.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('cr-bloq');
    copiar.textContent='Copiar mail';copiar.classList.remove('ok');
    if(previo&&previo.focus)previo.focus();
  }

  links.forEach(function(a){
    a.addEventListener('click',function(e){
      // ctrl/cmd/shift/alt o clic del medio: se comporta como un link normal (abre la página)
      if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      e.preventDefault();abrir(a);
    });
  });
  ov.addEventListener('click',function(e){if(e.target===ov)cerrar()});
  ov.querySelector('.cr-x').addEventListener('click',cerrar);
  document.addEventListener('keydown',function(e){
    if(!ov.classList.contains('cr-on'))return;
    if(e.key==='Escape'){e.preventDefault();cerrar();return}
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&form.contains(document.activeElement)){e.preventDefault();form.requestSubmit?form.requestSubmit():enviar.click();return}
    if(e.key==='Tab'){                                        // el foco queda adentro de la ventana
      var f=foco();if(!f.length)return;
      var p=f[0],u=f[f.length-1];
      if(e.shiftKey&&(document.activeElement===p||document.activeElement===v)){e.preventDefault();u.focus()}
      else if(!e.shiftKey&&document.activeElement===u){e.preventDefault();p.focus()}
    }
  });

  copiar.addEventListener('click',function(){
    var ok=function(){copiar.textContent='¡Copiado!';copiar.classList.add('ok');clearTimeout(tcopia);tcopia=setTimeout(function(){copiar.textContent='Copiar mail';copiar.classList.remove('ok')},2000)};
    var plan=function(){var t=document.createElement('textarea');t.value=MAIL;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy');ok()}catch(_){}document.body.removeChild(t)};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(MAIL).then(ok,plan);else plan();
  });

  function mailto(){
    var n=form.nombre.value.trim(),m=form.mensaje.value.trim(),e=form.email.value.trim();
    return 'mailto:'+MAIL+'?subject='+encodeURIComponent('Consulta de '+n+' · qfadesign.com')+'&body='+encodeURIComponent(m+'\n\n— '+n+'\n'+e);
  }
  function planB(msg){
    aviso.className='cr-aviso err';aviso.textContent=msg+' ';
    var a=document.createElement('a');a.href=mailto();a.textContent='Escribime desde tu app de correo';aviso.appendChild(a);
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(enviando)return;
    if(form._honey&&form._honey.value){decir('¡Gracias! Recibí tu consulta.','ok');return}   // campo trampa para bots
    var campos=[
      [form.nombre,!form.nombre.value.trim(),'Escribí tu nombre.'],
      [form.email,!/^\S+@\S+\.\S+$/.test(form.email.value.trim()),'Revisá tu mail, parece que le falta algo.'],
      [form.mensaje,!form.mensaje.value.trim(),'Contame un poco tu consulta.']
    ];
    campos.forEach(function(c){c[0].setAttribute('aria-invalid',c[1]?'true':'false')});
    var mal=campos.filter(function(c){return c[1]})[0];
    if(mal){decir(mal[2],'err');mal[0].focus();return}
    enviando=true;enviar.disabled=true;enviar.textContent='Enviando…';decir('');
    var ctrl=new AbortController(),corte=setTimeout(function(){ctrl.abort()},15000),nombre=form.nombre.value.trim(),
        email=form.email.value.trim(),mensaje=form.mensaje.value.trim(),asunto='Consulta de '+nombre+' · qfadesign.com',exito=false;
    fetch('https://formspree.io/f/'+encodeURIComponent(FORMSPREE_ID),{
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},signal:ctrl.signal,
      body:JSON.stringify({name:nombre,email:email,message:mensaje,_subject:asunto,_replyto:email,_gotcha:''})
    }).then(function(r){return r.json().catch(function(){return {}}).then(function(d){return [r.ok,d]})})
    .then(function(x){
      if(x[0]&&(x[1].ok===true||String(x[1].success)==='true')){
        exito=true;form.reset();estirar();campos.forEach(function(c){c[0].removeAttribute('aria-invalid')});
        form.classList.add('cr-listo');decir('¡Listo! Recibí tu consulta y te respondo por mail lo antes posible.','ok');
        setTimeout(function(){form.classList.remove('cr-listo');decir('')},6000);
      }else planB('No pude enviar la consulta desde acá.');
    }).catch(function(){planB('No pude enviar la consulta, revisá tu conexión.')})
    .then(function(){clearTimeout(corte);enviando=false;enviar.disabled=false;enviar.textContent='Enviar consulta'});
  });
})();
