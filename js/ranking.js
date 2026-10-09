/* qfadesign — ranking de los jueguitos (Supabase).
   Uso: QFARanking.montar(elementoReferencia, {juego:'color', modo:'Fácil', titulo:'Adivina el color', puntos:1234})
   Inserta el bloque de ranking justo antes del elemento de referencia.
   Identidad: apodo + número de 4 cifras al azar + código secreto guardado en este navegador. */
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
    cabecera.appendChild(el('strong', 'rank-tit', d.titulo + ' · ' + d.modo));
    var cuerpo = el('div', 'rank-cuerpo');
    box.appendChild(cabecera);
    box.appendChild(cuerpo);

    function vivo(){ return box.isConnected; }
    function estado(txt, esError){
      var p = el('p', 'rank-msg' + (esError ? ' rank-error' : ''), txt);
      p.setAttribute('role', esError ? 'alert' : 'status');
      return p;
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

    function registrar(apodo, intento, token){
      var tag = nuevoTag();
      return rpc('enviar_puntaje', { p_juego: d.juego, p_modo: d.modo, p_apodo: apodo, p_tag: tag, p_token: token, p_puntaje: d.puntos })
        .then(function(mejor){ return { yo: { apodo: apodo, tag: tag, token: token }, mejor: mejor }; })
        .catch(function(err){
          if (/identidad/.test(err.message) && intento < 6) return registrar(apodo, intento + 1, token);
          throw err;
        });
    }

    function formulario(aviso){
      cuerpo.textContent = '';
      if (aviso) cuerpo.appendChild(estado(aviso, true));
      cuerpo.appendChild(el('p', 'rank-msg', 'Guardá tu puntaje (' + d.puntos + ' pts) con un apodo. Te asignamos un número para distinguirte de otros iguales.'));
      var fila = el('div', 'rank-form');
      var input = el('input');
      input.type = 'text'; input.maxLength = 16; input.autocomplete = 'nickname';
      input.placeholder = 'Tu apodo'; input.setAttribute('aria-label', 'Tu apodo (2 a 16 caracteres)');
      var ok = el('button', 'rank-guardar', 'Guardar');
      ok.type = 'button';
      fila.appendChild(input); fila.appendChild(ok);
      cuerpo.appendChild(fila);
      var err = el('p', 'rank-msg rank-error'); err.hidden = true; err.setAttribute('role', 'alert');
      cuerpo.appendChild(err);
      var ver = el('button', 'rank-link', 'Solo ver el ranking');
      ver.type = 'button';
      ver.addEventListener('click', function(){ mostrarTop(null, null); });
      cuerpo.appendChild(ver);

      function enviar(){
        var apodo = limpiarApodo(input.value);
        if (!apodoValido(apodo)) {
          err.textContent = 'Usá entre 2 y 16 caracteres: letras, números, espacio, punto, guion o guion bajo.';
          err.hidden = false; return;
        }
        err.hidden = true; ok.disabled = true; ok.textContent = 'Guardando…';
        registrar(apodo, 0, nuevoToken()).then(function(r){
          guardar(r.yo);
          if (vivo()) mostrarTop(r.yo, r.mejor);
        }).catch(function(e){
          if (!vivo()) return;
          ok.disabled = false; ok.textContent = 'Guardar';
          err.textContent = /apodo_no_permitido/.test(e.message) ? 'Ese apodo no está permitido. Probá con otro.' : 'No se pudo guardar ahora. Probá de nuevo.';
          err.hidden = false;
        });
      }
      ok.addEventListener('click', enviar);
      input.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
    }

    var yo = leer();
    if (yo) enviarComoYo(yo); else formulario();
  }

  window.QFARanking = { montar: montar };
})();
