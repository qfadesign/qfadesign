/* qfadesign — ranking de los jueguitos (Supabase).
   Uso: QFARanking.montar(elementoReferencia, {juego:'color', modo:'Fácil', titulo:'Adivina el color', puntos:1234})
   Inserta el bloque de ranking justo antes del elemento de referencia.
   Identidad: apodo + número de 4 cifras al azar + código de 4 números que elige cada jugador (con eso se arma el secreto,
   así puede recuperar su nombre desde cualquier dispositivo). */
(function(){
  'use strict';
  var CFG = window.QFA_RANKING || {};
  var LS = 'qfa-jugador';

  function activo(){
    var s = String(CFG.url || '') + String(CFG.key || '');
    return !!(CFG.url && CFG.key) && !/TU-PROYECTO|PEGA-ACA/i.test(s);
  }
  function leer(){
    try { var j = JSON.parse(localStorage.getItem(LS)); return (j && j.apodo && j.tag && j.token) ? j : null; } catch(e){ return null; }
  }
  function guardar(j){ try { localStorage.setItem(LS, JSON.stringify(j)); } catch(e){} }
  function borrar(){ try { localStorage.removeItem(LS); } catch(e){} }

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

    function mostrarTop(yo, mejor){
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
          if (yo.pin) cuerpo.appendChild(el('p', 'rank-msg', 'Para recuperar tu nombre en otro dispositivo necesitás tu apodo, el #' + yo.tag + ' y tu código de 4 números.'));
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
          var poner = el('button', 'rank-link', 'Ponerle un código a mi nombre para no perderlo');
          poner.type = 'button';
          poner.addEventListener('click', function(){ ponerCodigo(yo, mejor); });
          cuerpo.appendChild(poner);
        }
        if (yo) {
          var cambiar = el('button', 'rank-link', 'No soy ' + yo.apodo + '#' + yo.tag);
          cambiar.type = 'button';
          cambiar.addEventListener('click', function(){ borrar(); formulario(); });
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

    function registrar(apodo, pin, intento){
      var tag = nuevoTag();
      return (pin ? tokenDe(apodo, tag, pin) : Promise.resolve(nuevoToken())).then(function(token){
        return rpc('enviar_puntaje', { p_juego: d.juego, p_modo: d.modo, p_apodo: apodo, p_tag: tag, p_token: token, p_puntaje: d.puntos })
          .then(function(mejor){ return { yo: { apodo: apodo, tag: tag, token: token, pin: pin ? 1 : 0 }, mejor: mejor }; });
      }).catch(function(err){
        if (/identidad/.test(err.message) && intento < 6) return registrar(apodo, pin, intento + 1);
        throw err;
      });
    }

    function campoNum(ph, etiqueta){
      var i = el('input', 'rank-pin');
      i.type = 'text'; i.inputMode = 'numeric'; i.maxLength = 4; i.autocomplete = 'off';
      i.placeholder = ph; i.setAttribute('aria-label', etiqueta);
      i.addEventListener('input', function(){ i.value = i.value.replace(/\D/g, '').slice(0, 4); });
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

    function formulario(aviso){
      cuerpo.textContent = '';
      if (aviso) cuerpo.appendChild(estado(aviso, true));
      if (enApp) cuerpo.appendChild(avisoApp());
      cuerpo.appendChild(el('p', 'rank-msg', 'Guardá tu puntaje (' + d.puntos + ' pts) con un apodo. Si querés recuperar tu nombre en otro dispositivo, sumá un código de 4 números (opcional).'));
      var fila = el('div', 'rank-form');
      var input = campoApodo();
      var pin = campoNum('Código (opcional)', 'Código de 4 números, opcional: sirve para recuperar tu nombre en otro dispositivo');
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
        if (pin.value && !/^\d{4}$/.test(pin.value)) return aviso_(err, 'El código tiene que ser de 4 números (o dejalo vacío). Anotalo: lo vas a necesitar para recuperar tu nombre.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Guardando…';
        registrar(apodo, pin.value, 0).then(function(r){
          guardar(r.yo);
          if (vivo()) mostrarTop(r.yo, r.mejor);
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
      cuerpo.appendChild(el('p', 'rank-msg', 'Elegí un código de 4 números para ' + yo.apodo + '#' + yo.tag + '. Con tu apodo, ese número y el código recuperás tu nombre desde cualquier dispositivo.'));
      var fila = el('div', 'rank-form');
      var pn = campoNum('Tu código', 'Tu código de 4 números');
      var ok = el('button', 'rank-guardar', 'Guardar código');
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
        if (!/^\d{4}$/.test(pn.value)) return aviso_(err, 'El código tiene que ser de 4 números.');
        err.hidden = true; ok.disabled = true; ok.textContent = 'Guardando…';
        tokenDe(yo.apodo, yo.tag, pn.value).then(function(nuevo){
          return rpc('poner_codigo', { p_apodo: yo.apodo, p_tag: yo.tag, p_token: yo.token, p_token_nuevo: nuevo }).then(function(sirve){
            if (!sirve) throw new Error('nada');
            var y2 = { apodo: yo.apodo, tag: yo.tag, token: nuevo, pin: 1 };
            guardar(y2);
            if (vivo()) mostrarTop(y2, mejor);
          });
        }).catch(function(e){
          if (!vivo()) return;
          ok.disabled = false; ok.textContent = 'Guardar código';
          aviso_(err, e.message === 'nada' ? 'No pudimos verificar tu nombre. Probá jugar de nuevo y repetirlo.' : 'No se pudo guardar el código ahora. Probá de nuevo en un rato.');
        });
      }
      ok.addEventListener('click', ir);
      conEnter([pn], ir);
    }

    function recuperar(){
      cuerpo.textContent = '';
      cuerpo.appendChild(el('p', 'rank-msg', 'Poné tu apodo, tu número (los 4 dígitos después del #) y tu código de 4 números.'));
      var fila = el('div', 'rank-form');
      var ap = campoApodo(), tg = campoNum('# número', 'Tu número, los 4 dígitos después del #'), pn = campoNum('Tu código', 'Tu código de 4 números');
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
        if (!apodoValido(apodo) || !/^\d{4}$/.test(tg.value) || !/^\d{4}$/.test(pn.value)) return aviso_(err, 'Revisá los datos: apodo, número de 4 cifras y código de 4 números.');
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
          aviso_(err, e.message === 'nada' ? 'No encontramos ese nombre con ese código. Revisá el apodo, el número y el código.' : 'No se pudo verificar ahora. Probá de nuevo en un rato.');
        });
      }
      ok.addEventListener('click', ir);
      conEnter([ap, tg, pn], ir);
    }

    var yo = leer();
    if (yo) enviarComoYo(yo); else formulario();
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

  window.QFARanking = { montar: montar, top3: montarTop3 };
})();
