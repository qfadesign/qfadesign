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
  let enviando = false;
  // Pregunta 6: según elijas Mail o Instagram, se muestra (y se pide) uno u otro casillero
  const cMail = form.querySelector('.gf-c-mail'), cIg = form.querySelector('.gf-c-ig');
  const porIg = () => (form.querySelector('input[name="respuesta"]:checked') || {}).value === 'Instagram';
  const aplicarRespuesta = () => {
    const ig = porIg();
    cMail.hidden = ig; cIg.hidden = !ig;
    form.email.required = !ig; form.instagram.required = ig;
    form.email.removeAttribute('aria-invalid'); form.instagram.removeAttribute('aria-invalid');
  };
  form.querySelectorAll('input[name="respuesta"]').forEach((i) => i.addEventListener('change', aplicarRespuesta));
  const usuarioIg = () => form.instagram.value.trim().replace(/^@+/, '');
  // Desplegables: se abre uno a la vez, cada uno muestra lo elegido y, al elegir una opción única, pasa a la siguiente pregunta
  const acc = [...form.querySelectorAll('details.gf-acc')];
  const resumen = (d) => {
    const q = d.dataset.q;
    let t = '';
    if (q === 'mensaje') t = form.mensaje.value.trim().replace(/\s+/g, ' ');
    else t = marcadas(q).join(' · ');
    d.querySelector('.gf-res').textContent = t || 'Sin elegir';
    d.classList.toggle('gf-hecho', !!t);
  };
  const refrescar = () => acc.forEach(resumen);
  acc.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) acc.forEach((o) => { if (o !== d) o.open = false; });
  }));
  form.addEventListener('change', (e) => {
    const d = e.target.closest && e.target.closest('details.gf-acc');
    if (!d) return;
    resumen(d);
    if (e.target.type === 'radio') {
      setTimeout(() => {
        const sig = acc[acc.indexOf(d) + 1];
        if (sig) sig.open = true; else d.open = false;
      }, 280);
    }
  });
  form.mensaje.addEventListener('input', () => resumen(form.mensaje.closest('details')));

  const decir = (txt, tipo) => {
    aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
    aviso.textContent = txt;
  };
  // Junta lo que se eligió en las preguntas y lo que se escribió, en un mensaje ordenado para el mail
  const marcadas = (n) => [...form.querySelectorAll(`input[name="${n}"]:checked`)].map((i) => i.value);
  const respuestas = () => {
    const r = {
      necesita: marcadas('necesita').join(', '),
      etapa: marcadas('etapa')[0] || '',
      plazo: marcadas('plazo')[0] || '',
      presupuesto: marcadas('presupuesto')[0] || '',
      detalles: form.mensaje.value.trim(),
    };
    const l = ['Responder por: ' + (porIg() ? 'Instagram (@' + usuarioIg() + ')' : 'Mail')];
    if (r.necesita) l.push('Necesita: ' + r.necesita);
    if (r.etapa) l.push('Punto del proyecto: ' + r.etapa);
    if (r.plazo) l.push('Plazo: ' + r.plazo);
    if (r.presupuesto) l.push('Presupuesto: ' + r.presupuesto);
    if (r.detalles) l.push('', 'Detalles:', r.detalles);
    r.texto = l.join('\n');
    return r;
  };
  const mailto = () => {
    const asunto = 'Consulta de ' + form.nombre.value.trim() + ' · qfadesign.com';
    const cuerpo = `${respuestas().texto}\n\n— ${form.nombre.value.trim()}\n${porIg() ? '@' + usuarioIg() + ' (Instagram)' : form.email.value.trim()}`;
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
      porIg()
        ? [form.instagram, !/^[A-Za-z0-9._]{1,30}$/.test(usuarioIg()), 'Revisá tu usuario de Instagram, por ejemplo @tuusuario.']
        : [form.email, !/^\S+@\S+\.\S+$/.test(form.email.value.trim()), 'Revisá tu mail, parece que le falta algo.'],
      [form.querySelector('details.gf-acc'), !(marcadas('necesita').length || form.mensaje.value.trim()), 'Elegí qué necesitás o contame un poco tu consulta.'],
    ];
    campos.forEach(([c, mal]) => c.setAttribute && c.tagName !== 'DETAILS' && c.setAttribute('aria-invalid', mal ? 'true' : 'false'));
    const mal = campos.find(([, m]) => m);
    if (mal) { decir(mal[2], 'err'); if (mal[0].tagName === 'DETAILS') mal[0].open = true; (mal[0].tagName === 'DETAILS' ? mal[0].querySelector('input') : mal[0]).focus(); return; }

    enviando = true;
    let exito = false;
    boton.classList.add('go');            // el botón se achica a un círculo
    boton.setAttribute('aria-busy', 'true');
    decir('Enviando tu consulta…');

    const ctrl = new AbortController();
    const corte = setTimeout(() => ctrl.abort(), 15000);
    try {
      const R = respuestas(), ig = porIg(), nombre = form.nombre.value.trim(), email = ig ? '' : form.email.value.trim(), mensaje = R.texto;
      const asuntoMail = 'Consulta de ' + nombre + ' · qfadesign.com';
      const url = FORMSPREE_ID
        ? 'https://formspree.io/f/' + encodeURIComponent(FORMSPREE_ID)
        : 'https://formsubmit.co/ajax/' + encodeURIComponent(DESTINO);
      // _subject es el campo que Formspree y FormSubmit usan como asunto del mail (lleva el nombre de quien escribe)
      const cuerpo = FORMSPREE_ID
        ? { name: nombre, email, message: mensaje, necesita: R.necesita, etapa: R.etapa, plazo: R.plazo, presupuesto: R.presupuesto, responder_por: ig ? 'Instagram' : 'Mail', instagram: ig ? '@' + usuarioIg() : '', _subject: asuntoMail, _replyto: email, _gotcha: '' }
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
        campos.forEach(([c]) => c.removeAttribute && c.removeAttribute('aria-invalid'));
        setTimeout(() => { aplicarRespuesta(); refrescar(); acc.forEach((d, i) => { d.open = i === 0; }); }, 0);
        exito = true;
        decir(ig ? '¡Listo! Recibí tu consulta y te escribo por Instagram lo antes posible.' : '¡Listo! Recibí tu consulta y te respondo por mail lo antes posible.', 'ok');
      } else {
        planB('No pude enviar la consulta desde acá.');
      }
    } catch (_) {
      planB('No pude enviar la consulta, revisá tu conexión.');
    } finally {
      clearTimeout(corte);
      boton.removeAttribute('aria-busy');
      if (exito) {
        boton.classList.add('ok');         // aparece el tilde y, a los 2,4 s, vuelve a ser botón
        setTimeout(() => { boton.classList.remove('go', 'ok'); enviando = false; }, 2400);
      } else {
        boton.classList.remove('go', 'ok');
        enviando = false;
      }
    }
  });
  refrescar();
})();
