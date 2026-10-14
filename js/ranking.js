/* qfadesign — ranking de los jueguitos (Supabase).
   Uso: QFARanking.montar(elementoReferencia, {juego:'color', modo:'Fácil', titulo:'Adivina el color', puntos:1234})
   Inserta el bloque de ranking justo antes del elemento de referencia.
   Identidad: apodo + código de identificación (el número después del #) + contraseña de 4 dígitos que elige cada jugador (con eso se arma el secreto,
   así puede recuperar su nombre desde cualquier dispositivo). */
(function(){
  'use strict';
  var CFG = window.QFA_RANKING || {};
  var LS = 'qfa-jugador';
  var VERSION = String(CFG.version || '');
  var sesion = null; /* quién juega: se explica más abajo, en quien() */

  function activo(){
    var s = String(CFG.url || '') + String(CFG.key || '');
    return !!(CFG.url && CFG.key) && !/TU-PROYECTO|PEGA-ACA/i.test(s);
  }
  function leer(){
    try {
      var j = JSON.parse(localStorage.getItem(LS));
      if (!(j && j.apodo && j.tag && j.token)) return null;
      /* si el ranking se reinició (cambió CFG.version), el nombre guardado ya no sirve: se descarta */
      if (String(j.v || '') !== VERSION) { localStorage.removeItem(LS); return null; }
      return j;
    } catch(e){ return null; }
  }
  function guardar(j){ try { j.v = VERSION; localStorage.setItem(LS, JSON.stringify(j)); } catch(e){} sesion = { modo: 'yo', yo: j }; }
  function borrar(){ try { localStorage.removeItem(LS); } catch(e){} if (sesion && sesion.modo === 'yo') sesion = null; }

  function azar(n){
    var a = new Uint32Array(1);
    if (window.crypto && crypto.getRandomValues) { crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function nuevoTag(){ return ('0000' + azar(10000)).slice(-4); }
  function nuevoToken(){
    var s = '';
    if (window.crypto && crypto.getRandomValues) {
      var b = new Uint8Array(24); crypto.getRandomValues(b);
      for (var i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2);
    } else {
      for (var j = 0; j < 48; j++) s += Math.floor(Math.random() * 16).toString(16);
    }
    return s;
  }

  /* el secreto sale del apodo + número + código del jugador: en otro dispositivo se vuelve a armar igual */
  function sha(txt){
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve(null);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function(b){
      var a = new Uint8Array(b), h = '';
      for (var i = 0; i < a.length; i++) h += ('0' + a[i].toString(16)).slice(-2);
      return h;
    });
  }
  function tokenDe(apodo, tag, pin){
    return sha('qfa|' + apodo.toLowerCase() + '|' + tag + '|' + pin).then(function(h){ return h || nuevoToken(); });
  }

  function rpc(nombre, args){
    var cab = { 'Content-Type': 'application/json', 'apikey': CFG.key };
    /* las claves nuevas (sb_publishable_...) no son JWT: van solo en apikey; las viejas (anon, eyJ...) van también como Bearer */
    if (!/^sb_/.test(CFG.key)) cab['Authorization'] = 'Bearer ' + CFG.key;
    return fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: cab,
      body: JSON.stringify(args)
    }).then(function(r){
      return r.json().catch(function(){ return null; }).then(function(j){
        if (!r.ok) throw new Error((j && (j.message || j.error)) || ('http' + r.status));
        return j;
      });
    });
  }

  function el(tag, cls, txt){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function limpiarApodo(v){
    return String(v || '').replace(/#/g, '').replace(/\s+/g, ' ').trim();
  }
  function apodoValido(v){
    return /^[\p{L}\p{N} _.\-]{2,16}$/u.test(v);
  }

  function campoNum(ph, etiqueta, max){
    max = max || 4;
    var i = el('input', 'rank-pin');
    i.type = 'text'; i.inputMode = 'numeric'; i.maxLength = max; i.autocomplete = 'off';
    i.placeholder = ph; i.setAttribute('aria-label', etiqueta);
    i.addEventListener('input', function(){ i.value = i.value.replace(/\D/g, '').slice(0, max); });
    return i;
  }
  function campoApodo(){
    var i = el('input');
    i.type = 'text'; i.maxLength = 16; i.autocomplete = 'nickname';
    i.placeholder = 'Tu apodo'; i.setAttribute('aria-label', 'Tu apodo (2 a 16 caracteres)');
    return i;
  }
  function aviso_(err, txt){ err.textContent = txt; err.hidden = false; }
  function conEnter(campos, fn){
    campos.forEach(function(c){ c.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); fn(); } }); });
  }


  function msg(txt, esError){
    var p = el('p', 'rank-msg' + (esError ? ' rank-error' : ''), txt);
    p.setAttribute('role', esError ? 'alert' : 'status');
    return p;
  }

  /* QUIÉN JUEGA. Se pregunta ANTES de jugar y la respuesta queda en "sesion" mientras la página esté abierta.
     Al terminar la partida el puntaje se guarda SOLO con ese jugador (nunca se reenvía a otro).
       { modo:'yo', yo:{apodo,tag,token,pin} }  usuario que ya existe (el de este navegador o uno recuperado)
       { modo:'nuevo', apodo, pin }              usuario nuevo: se crea al terminar la partida, con su puntaje
       { modo:'invitado' }                       juega sin usuario: el puntaje no se guarda */
  function quien(host, o){
    o = o || {};
    var guardado = leer();
    function boton(txt, cls, fn){
      var b = el('button', cls, txt); b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    }
    function link(txt, fn){ return boton(txt, 'rank-link', fn); }
    function listo(s){
      sesion = s;
      host.textContent = '';
      var linea = el('p', 'rank-yo');
      if (s.modo === 'yo') {
        linea.appendChild(document.createTextNode('Jugás como '));
        linea.appendChild(el('strong', null, s.yo.apodo + '#' + s.yo.tag));
      } else if (s.modo === 'nuevo') {
        linea.appendChild(document.createTextNode('Jugás como '));
        linea.appendChild(el('strong', null, s.apodo));
        linea.appendChild(document.createTextNode(' (tu usuario se crea cuando termines la partida)'));
      } else {
        linea.appendChild(document.createTextNode('Jugás sin usuario: tu puntaje no se va a guardar.'));
      }
      host.appendChild(linea);
      host.appendChild(link('Cambiar de jugador', opciones));
      if (o.alResolver) o.alResolver(s);
    }
    function pregunta(){
      host.textContent = '';
      host.appendChild(el('strong', 'rank-quien-t', '¿Quién va a jugar?'));
      var p = el('p', 'rank-msg');
      p.appendChild(document.createTextNode('La última vez se jugó como '));
      p.appendChild(el('strong', null, guardado.apodo + '#' + guardado.tag));
      p.appendChild(document.createTextNode('.'));
      host.appendChild(p);
      var fila = el('div', 'rank-quien-bt');
      fila.appendChild(boton('Soy ' + guardado.apodo + '#' + guardado.tag, 'rank-guardar', function(){ listo({ modo: 'yo', yo: guardado }); }));
      fila.appendChild(boton('Soy otra persona', 'rank-sec', opciones));
      host.appendChild(fila);
    }
    function opciones(){
      host.textContent = '';
      host.appendChild(el('strong', 'rank-quien-t', '¿Cómo querés jugar?'));
      var fila = el('div', 'rank-quien-bt rank-quien-col');
      fila.appendChild(boton('Crear un usuario nuevo', 'rank-guardar', crear));
      fila.appendChild(boton('Ya tengo usuario', 'rank-sec', existente));
      fila.appendChild(boton('Jugar sin usuario', 'rank-sec', function(){ listo({ modo: 'invitado' }); }));
      host.appendChild(fila);
      if (o.alVolver) host.appendChild(link('Volver', o.alVolver));
      else if (guardado && !sesion) host.appendChild(link('Volver', pregunta));
      else if (sesion) host.appendChild(link('Volver', function(){ listo(sesion); }));
    }
    function crear(){
      host.textContent = '';
      host.appendChild(el('strong', 'rank-quien-t', 'Tu usuario nuevo'));
      host.appendChild(msg('Elegí un apodo (2 a 16 caracteres). Si querés poder recuperarlo en otro dispositivo, sumá una contraseña de 4 dígitos (opcional). El usuario se crea cuando termines la partida, junto con tu puntaje.'));
      var fila = el('div', 'rank-form');
      var ap = campoApodo();
      var pin = campoNum('Contraseña (opcional)', 'Contraseña de 4 dígitos, opcional: sirve para recuperar tu nombre en otro dispositivo');
      var ok = el('button', 'rank-guardar', 'Listo');
      ok.type = 'button';
      fila.appendChild(ap); fila.appendChild(pin); fila.appendChild(ok);
      host.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      host.appendChild(err);
      host.appendChild(link('Volver', opciones));
      function ir(){
        var apodo = limpiarApodo(ap.value);
        if (!apodoValido(apodo)) return aviso_(err, 'Usá entre 2 y 16 caracteres: letras, números, espacio, punto, guion o guion bajo.');
        if (pin.value && !/^\d{4}$/.test(pin.value)) return aviso_(err, 'La contraseña tiene que ser de 4 dígitos (o dejala vacía). Anotala: la vas a necesitar para recuperar tu nombre.');
        listo({ modo: 'nuevo', apodo: apodo, pin: pin.value });
      }
      ok.addEventListener('click', ir);
      conEnter([ap, pin], ir);
    }
    function existente(){
      host.textContent = '';
      host.appendChild(el('strong', 'rank-quien-t', 'Ya tengo usuario'));
      host.appendChild(msg('Poné tu apodo, tu código de identificación (el número que aparece después del #) y tu contraseña de 4 dígitos.'));
      var fila = el('div', 'rank-form');
      var ap = campoApodo(), tg = campoNum('Código (#)', 'Tu código de identificación, el número que aparece después del #', 6), pn = campoNum('Contraseña', 'Tu contraseña de 4 dígitos');
      var ok = el('button', 'rank-guardar', 'Entrar');
      ok.type = 'button';
      fila.appendChild(ap); fila.appendChild(tg); fila.appendChild(pn); fila.appendChild(ok);
      host.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      host.appendChild(err);
      host.appendChild(link('Volver', opciones));
      function ir(){
        var apodo = limpiarApodo(ap.value);
        if (!apodoValido(apodo) || !/^\d{1,6}$/.test(tg.value) || !/^\d{4}$/.test(pn.value)) return aviso_(err, 'Revisá los datos: apodo, código de identificación (el de después del #) y contraseña de 4 dígitos.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Buscando…';
        tokenDe(apodo, tg.value, pn.value).then(function(token){
          return rpc('verificar_jugador', { p_apodo: apodo, p_tag: tg.value, p_token: token }).then(function(sirve){
            if (!sirve) throw new Error('nada');
            var yo = { apodo: apodo, tag: tg.value, token: token, pin: 1 };
            guardar(yo);
            listo({ modo: 'yo', yo: yo });
          });
        }).catch(function(e){
          if (!host.isConnected) return;
          ok.disabled = false; ok.textContent = 'Entrar';
          aviso_(err, e.message === 'nada' ? 'No encontramos ese nombre con esa contraseña. Revisá el apodo, el código de identificación y la contraseña.' : 'No se pudo verificar ahora. Probá de nuevo en un rato.');
        });
      }
      ok.addEventListener('click', ir);
      conEnter([ap, tg, pn], ir);
    }
    if (guardado && !o.sinPregunta) pregunta(); else opciones();
  }

  /* Pantalla de inicio de cada juego: antes de poder empezar hay que decir quién juega */
  function iniciarPuerta(){
    if (!activo()) return;
    var btn = document.getElementById('startBtn');
    if (!btn || !btn.parentNode || !btn.parentNode.parentNode) return;
    var host = el('section', 'rank-quien');
    host.setAttribute('aria-label', '¿Quién va a jugar?');
    btn.parentNode.parentNode.insertBefore(host, btn.parentNode);
    btn.disabled = true;
    btn.setAttribute('aria-describedby', 'rank-quien-nota');
    var nota = el('p', 'rank-quien-nota', 'Primero elegí quién juega para poder empezar.');
    nota.id = 'rank-quien-nota';
    btn.parentNode.appendChild(nota);
    quien(host, { alResolver: function(){ btn.disabled = false; nota.hidden = true; } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarPuerta);
  else iniciarPuerta();

  function montar(ref, d){
    if (!activo() || !ref || !ref.parentNode) return;
    var viejo = ref.parentNode.querySelector('.rank-box');
    if (viejo) viejo.remove();

    var box = el('section', 'rank-box');
    box.setAttribute('aria-label', 'Ranking de ' + d.titulo);
    ref.parentNode.insertBefore(box, ref);

    var cabecera = el('div', 'rank-cab');
    cabecera.appendChild(el('span', 'rank-tag', 'Ranking'));
    cabecera.appendChild(el('strong', 'rank-tit', d.titulo));
    var cuerpo = el('div', 'rank-cuerpo');
    box.appendChild(cabecera);
    box.appendChild(cuerpo);

    function vivo(){ return box.isConnected; }
    function estado(txt, esError){
      var p = el('p', 'rank-msg' + (esError ? ' rank-error' : ''), txt);
      p.setAttribute('role', esError ? 'alert' : 'status');
      return p;
    }

    /* dentro del navegador de Instagram/Facebook lo guardado no se comparte con Chrome o Safari */
    var enApp = /Instagram|FBAN|FBAV/i.test(navigator.userAgent || '');
    function avisoApp(){
      return estado('Estás en el navegador de Instagram: tu nombre puede no guardarse. Abrí esta página en Chrome o Safari (menú ⋯ → "Abrir en el navegador").');
    }

    /* copiar al portapapeles (con plan B para navegadores viejos) */
    function copiar(t){
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(function(){ return true; }, function(){ return viejo(t); });
      return Promise.resolve(viejo(t));
    }
    function viejo(t){
      var a = document.createElement('textarea'), ok = false;
      a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;opacity:0';
      document.body.appendChild(a); a.select(); a.setSelectionRange(0, 99);
      try { ok = document.execCommand('copy'); } catch(e){}
      a.remove();
      return ok;
    }
    /* se muestra una sola vez, justo al guardar el código: después el código ya no se puede volver a ver */
    function cajaDatos(yo, pin){
      var texto = 'Mi nombre en qfadesign.com\nApodo: ' + yo.apodo + '\nCódigo de identificación: #' + yo.tag + '\nContraseña: ' + pin;
      var caja = el('div', 'rank-datos');
      caja.appendChild(estado('Tu nombre quedó guardado. Copiá tus datos ahora: la contraseña no se vuelve a mostrar.'));
      caja.appendChild(el('p', 'rank-datos-txt', yo.apodo + '#' + yo.tag + ' · contraseña ' + pin));
      var btn = el('button', 'rank-guardar', 'Copiar mis datos');
      btn.type = 'button';
      btn.addEventListener('click', function(){
        copiar(texto).then(function(ok){
          btn.textContent = ok ? '¡Copiado! Pegalo en tus notas' : 'No se pudo copiar: anotalos';
          setTimeout(function(){ btn.textContent = 'Copiar mis datos'; }, 2600);
        });
      });
      caja.appendChild(btn);
      if (navigator.share) {
        var sh = el('button', 'rank-link', 'Guardarlos en mis notas o enviármelos');
        sh.type = 'button';
        sh.addEventListener('click', function(){ navigator.share({ text: texto }).catch(function(){}); });
        caja.appendChild(sh);
      }
      return caja;
    }

    function mostrarTop(yo, mejor, pinNuevo, extra){
      rpc('top_ranking', { p_juego: d.juego, p_modo: d.modo, p_limite: 10 }).then(function(filas){
        if (!vivo()) return;
        cuerpo.textContent = '';
        if (yo) {
          var linea = el('p', 'rank-yo');
          linea.appendChild(document.createTextNode('Jugás como '));
          linea.appendChild(el('strong', null, yo.apodo + '#' + yo.tag));
          if (mejor != null) linea.appendChild(document.createTextNode(' · tu mejor acá: ' + mejor + ' pts'));
          cuerpo.appendChild(linea);
          if (enApp && !yo.pin) cuerpo.appendChild(avisoApp());
          if (yo.pin && pinNuevo) cuerpo.appendChild(cajaDatos(yo, pinNuevo));
          else if (yo.pin) cuerpo.appendChild(el('p', 'rank-msg', 'Para recuperar tu nombre en otro dispositivo necesitás tu apodo, tu código de identificación (#' + yo.tag + ') y tu contraseña de 4 dígitos.'));
        }
        if (!filas || !filas.length) {
          cuerpo.appendChild(estado('Todavía no hay puntajes. Sé el primero.'));
        } else {
          var ol = el('ol', 'rank-lista');
          filas.forEach(function(f){
            var li = el('li', (yo && f.apodo.toLowerCase() === yo.apodo.toLowerCase() && f.tag === yo.tag) ? 'rank-yo-fila' : '');
            li.appendChild(el('span', 'rank-nom', f.apodo + '#' + f.tag));
            li.appendChild(el('span', 'rank-pts', f.puntaje + ' pts'));
            ol.appendChild(li);
          });
          cuerpo.appendChild(ol);
        }
        if (yo && !yo.pin) {
          var poner = el('button', 'rank-link', 'Ponerle una contraseña a mi nombre para no perderlo');
          poner.type = 'button';
          poner.addEventListener('click', function(){ ponerCodigo(yo, mejor); });
          cuerpo.appendChild(poner);
        }
        if (extra) extra(cuerpo);
        if (yo) {
          var cambiar = el('button', 'rank-link', '¿Va a jugar otra persona? Cambiar de jugador');
          cambiar.type = 'button';
          cambiar.addEventListener('click', function(){ cambiarJugador(yo, mejor); });
          cuerpo.appendChild(cambiar);
        }
      }).catch(function(){
        if (!vivo()) return;
        cuerpo.textContent = '';
        cuerpo.appendChild(estado('No pudimos cargar el ranking ahora. Probá de nuevo en un rato.', true));
      });
    }

    function enviarComoYo(yo){
      cuerpo.textContent = '';
      cuerpo.appendChild(estado('Guardando tu puntaje…'));
      rpc('enviar_puntaje', { p_juego: d.juego, p_modo: d.modo, p_apodo: yo.apodo, p_tag: yo.tag, p_token: yo.token, p_puntaje: d.puntos })
        .then(function(mejor){ if (vivo()) mostrarTop(yo, mejor); })
        .catch(function(err){
          if (!vivo()) return;
          if (/identidad/.test(err.message)) {
            borrar();
            formulario('No pudimos verificar tu jugador. Elegí un apodo de nuevo.');
          } else {
            cuerpo.textContent = '';
            cuerpo.appendChild(estado('No se pudo guardar el puntaje ahora.', true));
            var b = el('button', 'rank-link', 'Reintentar');
            b.type = 'button';
            b.addEventListener('click', function(){ enviarComoYo(yo); });
            cuerpo.appendChild(b);
          }
        });
    }

    /* el número después del # lo da el servidor en orden (1, 2, 3…); si no responde, usa uno al azar para no frenar el juego */
    function registrar(apodo, pin, intento){
      var token0 = nuevoToken(), tag;
      return rpc('nuevo_numero', {}).then(function(n){ return String(n); }, function(){ return nuevoTag(); }).then(function(t){
        tag = t;
        return rpc('enviar_puntaje', { p_juego: d.juego, p_modo: d.modo, p_apodo: apodo, p_tag: tag, p_token: token0, p_puntaje: d.puntos });
      }).then(function(mejor){
        var yo = { apodo: apodo, tag: tag, token: token0, pin: 0 };
        if (!pin) return { yo: yo, mejor: mejor };
        /* con código: se cambia el secreto del nombre recién creado por uno armado con apodo + número + código */
        return tokenDe(apodo, tag, pin).then(function(nuevo){
          return rpc('poner_codigo', { p_apodo: apodo, p_tag: tag, p_token: token0, p_token_nuevo: nuevo }).then(function(ok){
            if (ok) yo = { apodo: apodo, tag: tag, token: nuevo, pin: 1 };
            return { yo: yo, mejor: mejor };
          });
        }).catch(function(){ return { yo: yo, mejor: mejor }; });
      }).catch(function(err){
        if (/identidad/.test(err.message) && intento < 6) return registrar(apodo, pin, intento + 1);
        throw err;
      });
    }

    function formulario(aviso){
      cuerpo.textContent = '';
      if (aviso) cuerpo.appendChild(estado(aviso, true));
      if (enApp) cuerpo.appendChild(avisoApp());
      cuerpo.appendChild(el('p', 'rank-msg', 'Guardá tu puntaje (' + d.puntos + ' pts) con un apodo. Al guardar, la web te da un código de identificación (el número que aparece después del #). Si querés recuperar tu nombre en otro dispositivo, sumá una contraseña de 4 dígitos (opcional).'));
      var fila = el('div', 'rank-form');
      var input = campoApodo();
      var pin = campoNum('Contraseña (opcional)', 'Contraseña de 4 dígitos, opcional: sirve para recuperar tu nombre en otro dispositivo');
      var ok = el('button', 'rank-guardar', 'Guardar');
      ok.type = 'button';
      fila.appendChild(input); fila.appendChild(pin); fila.appendChild(ok);
      cuerpo.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      cuerpo.appendChild(err);
      var ya = el('button', 'rank-link', 'Ya jugué antes: recuperar mi nombre');
      ya.type = 'button';
      ya.addEventListener('click', function(){ recuperar(); });
      cuerpo.appendChild(ya);
      var ver = el('button', 'rank-link', 'Solo ver el ranking');
      ver.type = 'button';
      ver.addEventListener('click', function(){ mostrarTop(null, null); });
      cuerpo.appendChild(ver);

      function enviar(){
        var apodo = limpiarApodo(input.value);
        if (!apodoValido(apodo)) return aviso_(err, 'Usá entre 2 y 16 caracteres: letras, números, espacio, punto, guion o guion bajo.');
        if (pin.value && !/^\d{4}$/.test(pin.value)) return aviso_(err, 'La contraseña tiene que ser de 4 dígitos (o dejala vacía). Anotala: la vas a necesitar para recuperar tu nombre.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Guardando…';
        registrar(apodo, pin.value, 0).then(function(r){
          guardar(r.yo);
          if (vivo()) mostrarTop(r.yo, r.mejor, r.yo.pin ? pin.value : null);
        }).catch(function(e){
          if (!vivo()) return;
          ok.disabled = false; ok.textContent = 'Guardar';
          aviso_(err, /apodo_no_permitido/.test(e.message) ? 'Ese apodo no está permitido. Probá con otro.' : 'No se pudo guardar ahora. Probá de nuevo.');
        });
      }
      ok.addEventListener('click', enviar);
      conEnter([input, pin], enviar);
    }

    /* para quien ya jugó sin código: elige uno y cambia el secreto de su nombre (necesita tenerlo guardado en este navegador) */
    function ponerCodigo(yo, mejor){
      cuerpo.textContent = '';
      cuerpo.appendChild(el('p', 'rank-msg', 'Elegí una contraseña de 4 dígitos para ' + yo.apodo + '#' + yo.tag + '. Con tu apodo, tu código de identificación (#' + yo.tag + ') y la contraseña recuperás tu nombre desde cualquier dispositivo.'));
      var fila = el('div', 'rank-form');
      var pn = campoNum('Tu contraseña', 'Tu contraseña de 4 dígitos');
      var ok = el('button', 'rank-guardar', 'Guardar contraseña');
      ok.type = 'button';
      fila.appendChild(pn); fila.appendChild(ok);
      cuerpo.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      cuerpo.appendChild(err);
      var volver = el('button', 'rank-link', 'Volver');
      volver.type = 'button';
      volver.addEventListener('click', function(){ mostrarTop(yo, mejor); });
      cuerpo.appendChild(volver);

      function ir(){
        if (!/^\d{4}$/.test(pn.value)) return aviso_(err, 'La contraseña tiene que ser de 4 dígitos.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Guardando…';
        tokenDe(yo.apodo, yo.tag, pn.value).then(function(nuevo){
          return rpc('poner_codigo', { p_apodo: yo.apodo, p_tag: yo.tag, p_token: yo.token, p_token_nuevo: nuevo }).then(function(sirve){
            if (!sirve) throw new Error('nada');
            var y2 = { apodo: yo.apodo, tag: yo.tag, token: nuevo, pin: 1 };
            guardar(y2);
            if (vivo()) mostrarTop(y2, mejor, pn.value);
          });
        }).catch(function(e){
          if (!vivo()) return;
          ok.disabled = false; ok.textContent = 'Guardar contraseña';
          aviso_(err, e.message === 'nada' ? 'No pudimos verificar tu nombre. Probá jugar de nuevo y repetirlo.' : 'No se pudo guardar la contraseña ahora. Probá de nuevo en un rato.');
        });
      }
      ok.addEventListener('click', ir);
      conEnter([pn], ir);
    }

    function recuperar(){
      cuerpo.textContent = '';
      cuerpo.appendChild(el('p', 'rank-msg', 'Poné tu apodo, tu código de identificación (el número que aparece después del #) y tu contraseña de 4 dígitos.'));
      var fila = el('div', 'rank-form');
      var ap = campoApodo(), tg = campoNum('Código (#)', 'Tu código de identificación, el número que aparece después del #', 6), pn = campoNum('Contraseña', 'Tu contraseña de 4 dígitos');
      var ok = el('button', 'rank-guardar', 'Recuperar');
      ok.type = 'button';
      fila.appendChild(ap); fila.appendChild(tg); fila.appendChild(pn); fila.appendChild(ok);
      cuerpo.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      cuerpo.appendChild(err);
      var volver = el('button', 'rank-link', 'Volver');
      volver.type = 'button';
      volver.addEventListener('click', function(){ formulario(); });
      cuerpo.appendChild(volver);

      function ir(){
        var apodo = limpiarApodo(ap.value);
        if (!apodoValido(apodo) || !/^\d{1,6}$/.test(tg.value) || !/^\d{4}$/.test(pn.value)) return aviso_(err, 'Revisá los datos: apodo, código de identificación (el de después del #) y contraseña de 4 dígitos.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Buscando…';
        tokenDe(apodo, tg.value, pn.value).then(function(token){
          return rpc('verificar_jugador', { p_apodo: apodo, p_tag: tg.value, p_token: token }).then(function(sirve){
            if (!sirve) throw new Error('nada');
            var yo = { apodo: apodo, tag: tg.value, token: token, pin: 1 };
            guardar(yo);
            if (vivo()) enviarComoYo(yo);
          });
        }).catch(function(e){
          if (!vivo()) return;
          ok.disabled = false; ok.textContent = 'Recuperar';
          aviso_(err, e.message === 'nada' ? 'No encontramos ese nombre con esa contraseña. Revisá el apodo, el código de identificación y la contraseña.' : 'No se pudo verificar ahora. Probá de nuevo en un rato.');
        });
      }
      ok.addEventListener('click', ir);
      conEnter([ap, tg, pn], ir);
    }

    /* cambiar de jugador DESPUÉS de jugar: el puntaje de esta partida ya quedó con quien jugó; no se reenvía.
       Solo cambia quién juega la próxima. */
    function cambiarJugador(yo, mejor){
      cuerpo.textContent = '';
      cuerpo.appendChild(estado('El puntaje de esta partida ya quedó guardado con ' + yo.apodo + '#' + yo.tag + '. Esto solo cambia quién juega la próxima.'));
      var h = el('div', 'rank-quien-in');
      cuerpo.appendChild(h);
      quien(h, {
        sinPregunta: true,
        alVolver: function(){ mostrarTop(yo, mejor); },
        alResolver: function(s){
          mostrarTop(s.modo === 'yo' ? s.yo : null, null, null, function(c){
            if (s.modo === 'nuevo') c.appendChild(estado('La próxima partida jugás como ' + s.apodo + '. El usuario se crea cuando termines.'));
            else if (s.modo === 'invitado') c.appendChild(estado('La próxima partida jugás sin usuario.'));
          });
        }
      });
    }

    /* usuario nuevo elegido antes de jugar: se crea ahora, con el puntaje real */
    function crearYEnviar(s){
      cuerpo.textContent = '';
      cuerpo.appendChild(estado('Creando tu usuario y guardando tu puntaje…'));
      registrar(s.apodo, s.pin, 0).then(function(r){
        guardar(r.yo);
        if (vivo()) mostrarTop(r.yo, r.mejor, r.yo.pin ? s.pin : null);
      }).catch(function(e){
        if (!vivo()) return;
        if (/apodo_no_permitido/.test(e.message)) { sesion = null; return formulario('Ese apodo no está permitido. Elegí otro para guardar tu puntaje.'); }
        cuerpo.textContent = '';
        cuerpo.appendChild(estado('No se pudo guardar el puntaje ahora.', true));
        var b = el('button', 'rank-link', 'Reintentar');
        b.type = 'button';
        b.addEventListener('click', function(){ crearYEnviar(s); });
        cuerpo.appendChild(b);
      });
    }

    /* jugó sin usuario: se muestra el ranking y se ofrece guardar (todavía no se había guardado en ningún lado) */
    function comoInvitado(){
      cuerpo.textContent = '';
      cuerpo.appendChild(estado('Cargando el ranking…'));
      mostrarTop(null, null, null, function(c){
        c.insertBefore(estado('Jugaste sin usuario, así que este puntaje (' + d.puntos + ' pts) no se guardó.'), c.firstChild);
        var g = el('button', 'rank-link', 'Guardar este puntaje con un usuario');
        g.type = 'button';
        g.addEventListener('click', function(){ formulario(); });
        c.appendChild(g);
      });
    }

    /* sin pregunta previa (por ejemplo, se llegó directo al resultado): se pregunta antes de guardar nada */
    function preguntarAntesDeGuardar(g){
      cuerpo.textContent = '';
      var p = el('p', 'rank-msg');
      p.appendChild(document.createTextNode('Tu puntaje (' + d.puntos + ' pts) se guarda con el nombre de quien juega. ¿Sos '));
      p.appendChild(el('strong', null, g.apodo + '#' + g.tag));
      p.appendChild(document.createTextNode('?'));
      cuerpo.appendChild(p);
      var fila = el('div', 'rank-quien-bt');
      var si = el('button', 'rank-guardar', 'Sí, guardar mi puntaje'); si.type = 'button';
      si.addEventListener('click', function(){ enviarComoYo(g); });
      var no = el('button', 'rank-sec', 'No, soy otra persona'); no.type = 'button';
      no.addEventListener('click', function(){ formulario(); });
      fila.appendChild(si); fila.appendChild(no);
      cuerpo.appendChild(fila);
    }

    var s0 = sesion;
    if (s0 && s0.modo === 'yo') enviarComoYo(s0.yo);
    else if (s0 && s0.modo === 'nuevo') crearYEnviar(s0);
    else if (s0 && s0.modo === 'invitado') comoInvitado();
    else { var g0 = leer(); if (g0) preguntarAntesDeGuardar(g0); else formulario(); }
  }

  /* Top 3 para las pantallas de inicio: <aside data-rank-top data-juego="color" data-modo="Estándar"> */
  function montarTop3(box){
    var juego = box.getAttribute('data-juego');
    var modo = box.getAttribute('data-modo') || 'Estándar';
    var wrap = box.closest ? box.closest('.inicio') : null;
    if (!activo()) { box.remove(); if (wrap) wrap.classList.add('sin-rank'); return; }
    box.textContent = '';
    box.classList.remove('abierto');
    var etiqueta = el('span', 'rank-tag', 'Los 3 mejores');
    box.appendChild(etiqueta);
    var cuerpo = el('div', 'rank-podio-cuerpo');
    box.appendChild(cuerpo);
    cuerpo.appendChild(el('p', 'rank-msg', 'Cargando…'));
    var yo = leer();
    rpc('top_ranking', { p_juego: juego, p_modo: modo, p_limite: 50 }).then(function(filas){
      cuerpo.textContent = '';
      if (!filas || !filas.length) {
        cuerpo.appendChild(el('p', 'rank-msg', 'Todavía no hay puntajes. Podés ser el primero.'));
        return;
      }
      var ol = el('ol', 'rank-podio');
      ol.id = 'rank-lista-' + juego;
      filas.forEach(function(f, i){
        var propio = yo && f.apodo.toLowerCase() === yo.apodo.toLowerCase() && f.tag === yo.tag;
        var li = el('li', ((i > 2 ? 'rank-extra ' : '') + (propio ? 'rank-yo-fila' : '')).trim());
        li.appendChild(el('span', 'pos', String(i + 1)));
        li.appendChild(el('span', 'nom', f.apodo + '#' + f.tag));
        li.appendChild(el('span', 'pts', f.puntaje + ' pts'));
        ol.appendChild(li);
      });
      cuerpo.appendChild(ol);
      if (filas.length > 3) {
        var btn = el('button', 'rank-link rank-ver', 'Ver ranking completo ↓');
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', ol.id);
        btn.addEventListener('click', function(){
          var abierto = box.classList.toggle('abierto');
          btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
          btn.textContent = abierto ? 'Ver solo el top 3 ↑' : 'Ver ranking completo ↓';
          etiqueta.textContent = abierto ? 'Ranking completo' : 'Los 3 mejores';
        });
        cuerpo.appendChild(btn);
      }
    }).catch(function(){
      cuerpo.textContent = '';
      cuerpo.appendChild(el('p', 'rank-msg', 'No pudimos cargar el ranking ahora.'));
    });
  }
  function iniciarTop3(){
    var cajas = document.querySelectorAll('[data-rank-top]');
    for (var i = 0; i < cajas.length; i++) montarTop3(cajas[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarTop3);
  else iniciarTop3();

  window.QFARanking = { montar: montar, top3: montarTop3, quien: quien };
})();
