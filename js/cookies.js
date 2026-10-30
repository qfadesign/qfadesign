/* qfadesign: aviso de cookies.
   · Google Analytics (estadísticas) NO se carga hasta que la persona acepta. Si rechaza, no se carga nunca.
   · La elección se guarda en el navegador (localStorage "qfa-cookies") y se puede cambiar desde el link "Cookies" del pie.
   · Para cambiar el ID de Google o los textos, editá las constantes de abajo. */
(function () {
  'use strict';
  var GA_ID = 'G-GRQW2ECVME', KEY = 'qfa-cookies';

  function leer() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  var cargado = false;
  function activarGoogle() {
    window['ga-disable-' + GA_ID] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (cargado) return;
    cargado = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  function apagarGoogle() {
    window['ga-disable-' + GA_ID] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    /* borra las cookies de Analytics que hubiera */
    var host = location.hostname.split('.'), doms = [location.hostname, '.' + location.hostname];
    if (host.length > 2) doms.push('.' + host.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid' || n === '_gat') {
        document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        doms.forEach(function (d) { document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + d; });
      }
    });
  }

  function decidir(ok) {
    guardar(ok ? 'granted' : 'denied');
    if (ok) activarGoogle(); else apagarGoogle();
  }

  /* si ya había aceptado antes, arranca Analytics enseguida */
  var previo = leer();
  if (previo === 'granted') activarGoogle();

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

  function iniciar() {
    var banner, modal, sw, ultimoFoco;

    /* ---------- tarjeta ---------- */
    banner = el('section', 'ck',
      '<h2 id="ck-t">Un poco de privacidad<span>.</span></h2>' +
      '<p>Utilizamos cookies para entender cómo se usa qfadesign y mejorar la experiencia. Vos decidís si nos permitís recopilar estadísticas de navegación. <strong>Si las aceptás, me ayudás a saber qué mejorar.</strong></p>' +
      '<div class="ck-b"><button type="button" class="ck-btn ok">Aceptar</button><button type="button" class="ck-btn no">Rechazar</button><button type="button" class="ck-btn ver">Ver qué hace</button></div>');
    banner.setAttribute('role', 'region'); banner.setAttribute('aria-labelledby', 'ck-t');

    /* ---------- pantalla flotante ---------- */
    modal = el('div', 'ck-m',
      '<div class="ck-m-c" role="dialog" aria-modal="true" aria-labelledby="ck-mt">' +
      '<button type="button" class="ck-x" aria-label="Cerrar">×</button>' +
      '<h2 id="ck-mt">Cookies, sin vueltas<span>.</span></h2>' +
      '<p>Acá ves qué hace cada una y elegís. Podés cambiarlo cuando quieras desde “Cookies” al pie de la web.</p>' +
      '<div class="ck-o"><div><b>Necesarias</b><p>No uso ninguna cookie para que la web funcione. Solo se guardan en tu dispositivo datos mínimos, como si ya viste la animación de entrada o tu elección acá.</p></div><em>Siempre</em></div>' +
      '<div class="ck-o"><div><b>Estadísticas</b><p>Google Analytics me cuenta qué páginas se visitan, desde qué tipo de dispositivo y de qué país aproximado, para mejorar la web. <strong>Aceptarlas me sirve un montón para saber qué arreglar o sumar.</strong> Son datos agregados, no sirven para identificarte. No uso cookies de publicidad.</p></div>' +
      '<label class="ck-sw"><input type="checkbox" aria-label="Permitir cookies de estadísticas"><i></i></label></div>' +
      '<div class="ck-b"><button type="button" class="ck-btn ok guardar">Guardar elección</button><button type="button" class="ck-btn todo">Aceptar</button></div>' +
      '<small class="ck-mas">Más detalle en la <a href="/privacidad">política de privacidad</a>.</small></div>');
    sw = modal.querySelector('input');

    document.body.appendChild(banner);
    document.body.appendChild(modal);

    function mostrarBanner() { requestAnimationFrame(function () { banner.classList.add('on'); }); }
    function ocultarBanner() { banner.classList.remove('on'); }

    function abrirModal(desde) {
      ultimoFoco = desde || document.activeElement;
      sw.checked = leer() === 'granted';
      modal.classList.add('on');
      document.documentElement.style.overflow = 'hidden';
      setTimeout(function () { modal.querySelector('.guardar').focus(); }, 50);
    }
    function cerrarModal() {
      modal.classList.remove('on');
      document.documentElement.style.overflow = '';
      if (ultimoFoco && ultimoFoco.focus) try { ultimoFoco.focus(); } catch (e) {}
    }
    function resolver(ok) { decidir(ok); ocultarBanner(); cerrarModal(); }

    banner.querySelector('.ok').onclick = function () { resolver(true); };
    banner.querySelector('.no').onclick = function () { resolver(false); };
    banner.querySelector('.ver').onclick = function (e) { abrirModal(e.currentTarget); };
    modal.querySelector('.guardar').onclick = function () { resolver(sw.checked); };
    modal.querySelector('.todo').onclick = function () { resolver(true); };
    modal.querySelector('.ck-x').onclick = cerrarModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) cerrarModal(); });
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('on')) return;
      if (e.key === 'Escape') cerrarModal();
      if (e.key === 'Tab') {                       /* el foco se queda dentro de la pantalla */
        var f = modal.querySelectorAll('button,input,a[href]'); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });

    /* link "Cookies" del pie (y cualquier [data-cookies]) */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-cookies]');
      if (!a) return;
      e.preventDefault(); abrirModal(a);
    });

    /* primera visita: mostrar la tarjeta cuando termine la animación de entrada */
    if (previo !== 'granted' && previo !== 'denied') {
      var t0 = Date.now();
      (function esperar() {
        var carga = document.querySelector('.carga');
        if (carga && Date.now() - t0 < 8000) return setTimeout(esperar, 400);
        setTimeout(mostrarBanner, 900);
      })();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
