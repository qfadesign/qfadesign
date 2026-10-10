/* Formulario de contacto: envía la consulta por mail a través de FormSubmit (sin servidor propio).
   La primera vez que alguien lo use, FormSubmit manda un mail de activación a la casilla de destino: hay que abrirlo y tocar "Activate".
   Si el envío falla (sin internet, bloqueador, etc.) se ofrece abrir la app de correo como plan B. */
(() => {
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
    const asunto = form.asunto.value.trim() || 'Consulta desde la web';
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
      const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(DESTINO), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: form.nombre.value.trim(),
          email: form.email.value.trim(),
          message: form.mensaje.value.trim(),
          _subject: (form.asunto.value.trim() || 'Consulta desde la web') + ' · qfadesign.com',
          _template: 'table',
          _captcha: 'false',
          _honey: '',
        }),
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && String(data.success) === 'true') {
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
