/* Formulario de contacto: envía la consulta por mail sin servidor propio.
   Con Formspree: pegá abajo el ID de tu formulario (lo que va después de /f/ en https://formspree.io/f/XXXXXXXX).
   Si FORMSPREE_ID queda vacío, usa FormSubmit (la primera vez manda un mail de activación a la casilla de destino).
   Si el envío falla (sin internet, bloqueador, etc.) se ofrece abrir la app de correo como plan B. */
(() => {
  const FORMSPREE_ID = 'mwlvbvry';
  const DESTINO = 'qfadesignn@gmail.com';
  const form = document.getElementById('consulta');
  if (!form) return;
  const aviso = document.getElementById('aviso');
  const boton = form.querySelector('button[type=submit]');
  const textoBoton = boton.textContent;
  let enviando = false;

  const decir = (txt, tipo) => {
    aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
    aviso.textContent = txt;
  };
  const mailto = () => {
    const asunto = 'Consulta de ' + form.nombre.value.trim() + ' · qfadesign.com';
    const cuerpo = `${form.mensaje.value.trim()}\n\n— ${form.nombre.value.trim()}\n${form.email.value.trim()}`;
    return `mailto:${DESTINO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  };
  const planB = (msg) => {
    aviso.className = 'aviso err';
    aviso.textContent = msg + ' ';
    const a = document.createElement('a');
    a.href = mailto();
    a.textContent = 'Escribime desde tu app de correo';
    aviso.appendChild(a);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return;

    // Campo trampa para bots: si viene lleno, se simula éxito y no se envía nada.
    if (form._honey && form._honey.value) { decir('¡Gracias! Recibí tu consulta.', 'ok'); return; }

    const campos = [
      [form.nombre, !form.nombre.value.trim(), 'Escribí tu nombre.'],
      [form.email, !/^\S+@\S+\.\S+$/.test(form.email.value.trim()), 'Revisá tu mail, parece que le falta algo.'],
      [form.mensaje, !form.mensaje.value.trim(), 'Contame un poco tu consulta.'],
    ];
    campos.forEach(([c, mal]) => c.setAttribute('aria-invalid', mal ? 'true' : 'false'));
    const mal = campos.find(([, m]) => m);
    if (mal) { decir(mal[2], 'err'); mal[0].focus(); return; }

    enviando = true;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    decir('Enviando tu consulta…');

    const ctrl = new AbortController();
    const corte = setTimeout(() => ctrl.abort(), 15000);
    try {
      const nombre = form.nombre.value.trim(), email = form.email.value.trim(), mensaje = form.mensaje.value.trim();
      const asuntoMail = 'Consulta de ' + nombre + ' · qfadesign.com';
      const url = FORMSPREE_ID
        ? 'https://formspree.io/f/' + encodeURIComponent(FORMSPREE_ID)
        : 'https://formsubmit.co/ajax/' + encodeURIComponent(DESTINO);
      // _subject es el campo que Formspree y FormSubmit usan como asunto del mail (lleva el nombre de quien escribe)
      const cuerpo = FORMSPREE_ID
        ? { name: nombre, email, message: mensaje, _subject: asuntoMail, _replyto: email, _gotcha: '' }
        : { name: nombre, email, message: mensaje, _subject: asuntoMail, _template: 'table', _captcha: 'false', _honey: '' };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && (data.ok === true || String(data.success) === 'true')) {
        form.reset();
        campos.forEach(([c]) => c.removeAttribute('aria-invalid'));
        decir('¡Listo! Recibí tu consulta y te respondo por mail lo antes posible.', 'ok');
      } else {
        planB('No pude enviar la consulta desde acá.');
      }
    } catch (_) {
      planB('No pude enviar la consulta, revisá tu conexión.');
    } finally {
      clearTimeout(corte);
      enviando = false;
      boton.disabled = false;
      boton.textContent = textoBoton;
    }
  });
})();
