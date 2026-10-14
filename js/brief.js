/* qfadesign — Brief interactivo.
   8 preguntas (de a una), un paso para los datos de contacto y un resumen final con dos salidas:
   · bajar el brief en PDF (mismo motor que el presupuesto de la calculadora: QFAPdf.descargarBrief)
   · mandármelo por mail (mismo formulario que Contacto: Formspree; si falla, ofrece abrir la app de correo).
   Las respuestas se guardan como borrador en el navegador para no perder lo escrito (si el navegador no deja guardar, anda igual). */
(function () {
  "use strict";
  var raiz = document.getElementById("br");
  if (!raiz) return;

  var FORMSPREE_ID = "mwlvbvry";
  var DESTINO = "qfadesignn@gmail.com";
  var LS = "qfa-brief";

  var PREGUNTAS = [
    { id: "hace", t: "¿Qué hace tu marca o proyecto?", ayuda: "Contámelo como se lo contarías a un amigo: qué ofrecés y qué te hace distinto.", tipo: "texto", ph: "Ej.: Somos una panadería de barrio que hace pan de masa madre…" },
    { id: "publico", t: "¿A quién le habla?", ayuda: "Edad, intereses, dónde están y qué les importa.", tipo: "texto", ph: "Ej.: Gente de 25 a 40 que cuida lo que come y compra cerca de casa…" },
    { id: "necesita", t: "¿Qué necesitás?", ayuda: "Marcá todo lo que aplique.", tipo: "multi", op: ["Logo", "Identidad completa", "Redes sociales", "Packaging", "Motion graphics", "Diseño editorial", "Web", "No lo sé todavía"] },
    { id: "sentir", t: "¿Cómo querés que se sienta tu marca?", ayuda: "Elegí hasta 3 palabras.", tipo: "multi", max: 3, op: ["Cercana", "Seria", "Divertida", "Elegante", "Minimalista", "Audaz", "Artesanal", "Tecnológica", "Cálida", "Premium"] },
    { id: "refs", t: "¿Qué referencias te gustan?", ayuda: "Marcas, cuentas, links o cosas que ni siquiera son de diseño. Pegá lo que tengas.", tipo: "texto", ph: "Ej.: me gusta cómo se ve @cuenta, la marca X, esta web…" },
    { id: "evitar", t: "¿Hay algo que NO querés?", ayuda: "Colores, estilos o cosas que ya probaste y no te cerraron. Si no se te ocurre nada, seguí.", tipo: "texto", opcional: true, ph: "Ej.: nada de rojo, nada demasiado infantil…" },
    { id: "plazo", t: "¿Para cuándo lo necesitás?", ayuda: "Si hay una fecha puntual (un lanzamiento, un evento), contámela abajo.", tipo: "uno", op: ["Urgente (menos de 5 días hábiles)", "En 2 a 4 semanas", "En 1 a 3 meses", "Sin apuro"], extra: "Fecha puntual (opcional)" },
    { id: "presu", t: "¿Tenés un presupuesto en mente?", ayuda: "Sirve para proponerte un alcance realista. Podés usar la calculadora de esta misma página.", tipo: "uno", op: ["Todavía no, necesito que me orientes", "Tengo un monto o rango definido", "Ya armé un presupuesto en la calculadora"], extra: "Monto o rango (opcional)" }
  ];
  var TOTAL = PREGUNTAS.length;
  /* pasos: 0..TOTAL-1 preguntas, TOTAL = datos de contacto, TOTAL+1 = resumen */
  var PASO_DATOS = TOTAL, PASO_FIN = TOTAL + 1;

  var estado = { paso: 0, r: {}, nombre: "", email: "" };
  try {
    var g = JSON.parse(localStorage.getItem(LS));
    if (g && g.r) { estado.r = g.r; estado.nombre = g.nombre || ""; estado.email = g.email || ""; }
  } catch (e) { /* sin borrador */ }
  function guardar() { try { localStorage.setItem(LS, JSON.stringify({ r: estado.r, nombre: estado.nombre, email: estado.email })); } catch (e) {} }
  function borrarBorrador() { try { localStorage.removeItem(LS); } catch (e) {} }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function vacio(v) { return v == null || (Array.isArray(v) ? v.length === 0 : !String(v).trim()); }

  /* respuesta de una pregunta como texto legible */
  function textoRespuesta(p) {
    var v = estado.r[p.id], extra = estado.r[p.id + "_x"];
    if (p.tipo === "multi") return Array.isArray(v) && v.length ? v.join(", ") : "";
    if (p.tipo === "uno") {
      var base = v || "";
      if (extra && String(extra).trim()) base += (base ? " — " : "") + String(extra).trim();
      return base;
    }
    return v ? String(v).trim() : "";
  }
  function secciones() { return PREGUNTAS.map(function (p) { return { t: p.t.replace(/^¿|\?$/g, "").replace(/^./, function (c) { return c.toUpperCase(); }), v: textoRespuesta(p) }; }); }
  function textoPlano() {
    var l = ["BRIEF DE PROYECTO", "Nombre: " + estado.nombre, "Mail: " + estado.email, ""];
    PREGUNTAS.forEach(function (p, i) { l.push((i + 1 < 10 ? "0" : "") + (i + 1) + " · " + p.t); l.push(textoRespuesta(p) || "(sin responder)"); l.push(""); });
    return l.join("\n").trim();
  }

  /* ---- Pantalla ---- */
  var cabeza = el("div", "br-cab");
  var progreso = el("div", "br-prog"); progreso.setAttribute("aria-hidden", "true");
  var barra = el("span"); progreso.appendChild(barra);
  var contador = el("p", "br-cont");
  cabeza.appendChild(contador); cabeza.appendChild(progreso);
  var cuerpo = el("div", "br-cuerpo");
  var aviso = el("p", "br-aviso"); aviso.setAttribute("role", "status"); aviso.setAttribute("aria-live", "polite");
  var nav = el("div", "br-nav");
  var btnAtras = el("button", "br-atras", "Atrás"); btnAtras.type = "button";
  var btnSig = el("button", "btn br-sig", "Siguiente"); btnSig.type = "button";
  nav.appendChild(btnAtras); nav.appendChild(btnSig);
  raiz.appendChild(cabeza); raiz.appendChild(cuerpo); raiz.appendChild(aviso); raiz.appendChild(nav);

  function decir(t, err) { aviso.textContent = t || ""; aviso.className = "br-aviso" + (err ? " err" : ""); }

  function titulo(txt, ayuda) {
    var h = el("h3", "br-t", txt); h.tabIndex = -1; h.id = "br-t";
    var fr = document.createDocumentFragment(); fr.appendChild(h);
    if (ayuda) fr.appendChild(el("p", "br-ay", ayuda));
    return fr;
  }

  function campoTexto(p) {
    var ta = el("textarea", "br-ta"); ta.rows = 5; ta.maxLength = 900; ta.placeholder = p.ph || "";
    ta.setAttribute("aria-labelledby", "br-t"); ta.value = estado.r[p.id] || "";
    var c = el("span", "br-n", ta.value.length + " / 900");
    ta.addEventListener("input", function () { estado.r[p.id] = ta.value; c.textContent = ta.value.length + " / 900"; guardar(); decir(""); });
    var w = el("div", "br-campo"); w.appendChild(ta); w.appendChild(c);
    return { nodo: w, foco: ta };
  }

  function campoOpciones(p) {
    var multi = p.tipo === "multi";
    var grupo = el("div", "br-ops"); grupo.setAttribute("role", multi ? "group" : "radiogroup"); grupo.setAttribute("aria-labelledby", "br-t");
    var sel = multi ? (Array.isArray(estado.r[p.id]) ? estado.r[p.id].slice() : []) : (estado.r[p.id] || "");
    var primero = null;
    p.op.forEach(function (o, i) {
      var lab = el("label", "br-op");
      var inp = document.createElement("input");
      inp.type = multi ? "checkbox" : "radio"; inp.name = "br-" + p.id; inp.value = o; inp.className = "sr-only";
      var txt = el("span", null, o);
      lab.appendChild(inp); lab.appendChild(txt);
      var marcado = multi ? sel.indexOf(o) > -1 : sel === o;
      inp.checked = marcado; lab.classList.toggle("on", marcado);
      inp.addEventListener("change", function () {
        decir("");
        if (multi) {
          var k = sel.indexOf(o);
          if (inp.checked && k < 0) {
            if (p.max && sel.length >= p.max) { inp.checked = false; decir("Podés elegir hasta " + p.max + ". Sacá una para cambiarla.", true); return; }
            sel.push(o);
          }
          if (!inp.checked && k > -1) sel.splice(k, 1);
          estado.r[p.id] = sel.slice();
          lab.classList.toggle("on", inp.checked);
        } else {
          sel = o; estado.r[p.id] = o;
          [].forEach.call(grupo.children, function (x) { x.classList.toggle("on", x === lab); });
        }
        guardar();
      });
      grupo.appendChild(lab);
      if (!primero) primero = inp;
    });
    var w = el("div", "br-campo"); w.appendChild(grupo);
    if (p.extra) {
      var l = el("label", "br-ex", p.extra);
      var i2 = el("input", "br-in"); i2.type = "text"; i2.maxLength = 80; i2.value = estado.r[p.id + "_x"] || "";
      i2.addEventListener("input", function () { estado.r[p.id + "_x"] = i2.value; guardar(); });
      l.appendChild(i2); w.appendChild(l);
    }
    return { nodo: w, foco: null };
  }

  function pasoDatos() {
    var fr = document.createDocumentFragment();
    fr.appendChild(titulo("¿A nombre de quién lo armo?", "Con tu nombre queda identificado el brief. El mail lo necesito solo si querés que te lo mande."));
    var w = el("div", "br-campo br-datos");
    function fila(rot, name, tipo, auto, val, ph) {
      var l = el("label", "br-ex", rot); var i = el("input", "br-in"); i.type = tipo; i.name = name; i.autocomplete = auto; i.value = val; i.placeholder = ph; i.maxLength = 80;
      i.addEventListener("input", function () { estado[name] = i.value; guardar(); decir(""); });
      l.appendChild(i); w.appendChild(l); return i;
    }
    var n = fila("Nombre (de la persona o de la marca)", "nombre", "text", "name", estado.nombre, "Tu nombre");
    fila("Tu mail", "email", "email", "email", estado.email, "nombre@correo.com");
    fr.appendChild(w);
    return { nodo: fr, foco: null, enfocar: n };
  }

  function pasoFin() {
    var fr = document.createDocumentFragment();
    fr.appendChild(titulo("Tu brief está listo", "Revisalo. Si algo no te cierra, volvé atrás y cambialo."));
    var lista = el("div", "br-res");
    PREGUNTAS.forEach(function (p, i) {
      var f = el("div", "br-res-f");
      var q = el("strong", null, (i + 1 < 10 ? "0" : "") + (i + 1) + " · " + p.t);
      var r = textoRespuesta(p);
      var a = el("p", r ? "" : "br-res-vacio", r || "Sin responder");
      var ed = el("button", "br-ed", "Editar"); ed.type = "button"; ed.setAttribute("aria-label", "Editar: " + p.t);
      ed.addEventListener("click", function () { ir(i); });
      f.appendChild(q); f.appendChild(a); f.appendChild(ed); lista.appendChild(f);
    });
    fr.appendChild(lista);
    var acc = el("div", "br-acc");
    var bp = el("button", "b-peel", "Descargar brief en PDF"); bp.type = "button";
    var bm = el("button", "btn", "Enviármelo por mail"); bm.type = "button";
    var msg = el("p", "br-m"); msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    acc.appendChild(bp); acc.appendChild(bm);
    fr.appendChild(acc); fr.appendChild(msg);

    function datos() { return { nombre: estado.nombre.trim(), email: estado.email.trim(), secciones: secciones() }; }
    function dec(t, err) { msg.textContent = t; msg.className = "br-m" + (err ? " err" : ""); }

    bp.addEventListener("click", function () {
      if (!window.QFAPdf || !QFAPdf.descargarBrief) { dec("No se pudo preparar el PDF. Probá recargando la página.", true); return; }
      bp.disabled = true; bp.textContent = "Armando el PDF…"; dec("");
      QFAPdf.descargarBrief(datos()).then(function () { dec("Listo, se descargó tu brief."); })
        .catch(function () { dec("No se pudo armar el PDF ahora. Podés mandármelo por mail.", true); })
        .then(function () { bp.disabled = false; bp.textContent = "Descargar brief en PDF"; });
    });

    var enviando = false, enviado = false;
    bm.addEventListener("click", function () {
      if (enviando || enviado) return;
      var d = datos();
      if (!d.nombre) { dec("Poné tu nombre para poder enviarlo.", true); return; }
      if (!/^\S+@\S+\.\S+$/.test(d.email)) { dec("Para mandártelo necesito un mail válido. Volvé al paso anterior para completarlo.", true); return; }
      enviando = true; bm.disabled = true; bm.textContent = "Enviando…"; dec("");
      var ctrl = new AbortController(), corte = setTimeout(function () { ctrl.abort(); }, 15000);
      var asunto = "Brief de " + d.nombre + " · qfadesign.com";
      fetch("https://formspree.io/f/" + encodeURIComponent(FORMSPREE_ID), {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ name: d.nombre, email: d.email, message: textoPlano(), _subject: asunto, _replyto: d.email, _gotcha: "" })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) throw new Error("envio"); }); })
        .then(function () { enviado = true; bm.textContent = "Enviado"; dec("¡Gracias! Recibí tu brief. Te respondo a " + d.email + "."); borrarBorrador(); })
        .catch(function () {
          bm.disabled = false; bm.textContent = "Enviármelo por mail"; enviando = false;
          msg.className = "br-m err"; msg.textContent = "No se pudo enviar. ";
          var a = el("a", null, "Mandalo desde tu app de correo");
          a.href = "mailto:" + DESTINO + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(textoPlano());
          msg.appendChild(a);
        }).then(function () { clearTimeout(corte); enviando = false; });
    });
    var nuevo = el("button", "br-link", "Empezar un brief nuevo"); nuevo.type = "button";
    nuevo.addEventListener("click", function () { estado.r = {}; estado.nombre = ""; estado.email = ""; borrarBorrador(); ir(0); });
    fr.appendChild(nuevo);
    return { nodo: fr, foco: null };
  }

  /* ---- Navegación ---- */
  function validar() {
    if (estado.paso < TOTAL) {
      var p = PREGUNTAS[estado.paso];
      if (!p.opcional && vacio(estado.r[p.id]) ) {
        decir(p.tipo === "texto" ? "Escribí algo, aunque sea corto." : "Elegí una opción para seguir.", true);
        return false;
      }
    } else if (estado.paso === PASO_DATOS) {
      if (!estado.nombre.trim()) { decir("Poné tu nombre para seguir.", true); return false; }
      if (estado.email.trim() && !/^\S+@\S+\.\S+$/.test(estado.email.trim())) { decir("Revisá tu mail, parece que le falta algo.", true); return false; }
    }
    return true;
  }

  function ir(n) {
    estado.paso = Math.max(0, Math.min(PASO_FIN, n));
    decir(""); cuerpo.textContent = "";
    var p = estado.paso, r;
    if (p < TOTAL) {
      var q = PREGUNTAS[p];
      cuerpo.appendChild(titulo(q.t, q.ayuda));
      r = q.tipo === "texto" ? campoTexto(q) : campoOpciones(q);
      cuerpo.appendChild(r.nodo);
    } else if (p === PASO_DATOS) { r = pasoDatos(); cuerpo.appendChild(r.nodo); }
    else { r = pasoFin(); cuerpo.appendChild(r.nodo); }

    var ultimo = p === PASO_FIN;
    nav.hidden = ultimo;
    btnAtras.hidden = p === 0;
    btnSig.textContent = p === PASO_DATOS ? "Ver mi brief" : "Siguiente";
    contador.textContent = p < TOTAL ? "Pregunta " + (p + 1) + " de " + TOTAL : p === PASO_DATOS ? "Último paso" : "Resumen";
    barra.style.width = Math.round(((p + 1) / (TOTAL + 2)) * 100) + "%";
    var h = document.getElementById("br-t");
    if (h && ir.mover) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    ir.mover = true;
  }

  btnSig.addEventListener("click", function () { if (validar()) ir(estado.paso + 1); });
  btnAtras.addEventListener("click", function () { ir(estado.paso - 1); });

  ir(0);

  /* abrir directo con herramientas#brief */
  function abrirSiHash() {
    if (location.hash !== "#brief") return;
    var b = document.getElementById("hbb");
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
