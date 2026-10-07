/* qfadesign — calculadora de precios (herramientas). Sin dependencias.
   Los precios base están en pesos (baseArs); el dólar MEP se usa para mostrar el equivalente en USD.
   El MEP se pide a dolarapi.com al abrir la página; si falla, se usa el valor de referencia de abajo.
   El PDF del presupuesto y sus referencias de mercado viven en js/calculadora-pdf.js y js/calculadora-refs.js. */
(function () {
  "use strict";
  var raiz = document.getElementById("calculadora");
  if (!raiz) return;

  /* ---- Datos: editá acá precios, servicios y recargos ---- */
  var MEP = { value: 1542.1, fecha: new Date("2026-09-16T12:00:00"), vivo: false };
  var RECARGO_URGENTE = 0.3;

  var CLIENTES = [
    { id: "emprendimiento", label: "Emprendimiento / ONG", hint: "Estás arrancando o es un proyecto sin fines de lucro", mult: 1 },
    { id: "pyme", label: "Pyme", hint: "Un equipo chico y una marca que ya camina", mult: 1.4 },
    { id: "empresa", label: "Empresa", hint: "Varias áreas y una marca con más estructura", mult: 2 }
  ];

  var CATEGORIAS = [
    { id: "marca", name: "Identidad de marca", items: [
      { id: "branding-emprendedores", name: "Branding para emprendedores", desc: "Logotipo, paleta y tipografías, patrones básicos, mini guía de marca y archivos editables. Para ideas que están arrancando y quieren verse profesionales desde el primer día.", unit: "por proyecto", baseArs: 460000 },
      { id: "rediseno-imagen", name: "Rediseño de imagen", desc: "Logo e isotipo, manual de identidad, análisis de competencia y aplicaciones listas para redes. Para marcas que crecieron y ya no se ven reflejadas en su imagen.", unit: "por proyecto", baseArs: 610000 },
      { id: "identidad-completa", name: "Identidad visual completa", desc: "Rediseño de imagen, aplicaciones de marca, plantillas para redes y usos correctos e incorrectos. Para marcas consolidadas que quieren ser coherentes en todos lados.", unit: "por proyecto", baseArs: 870000 }
    ] },
    { id: "grafica", name: "Diseño gráfico y comunicación", items: [
      { id: "kit-redes", name: "Kit de plantillas para redes", desc: "Plantillas editables para feed, historias y destacadas, para que publiques con coherencia.", unit: "por proyecto", baseArs: 250000 },
      { id: "pieza-unica", name: "Pieza gráfica única", desc: "Flyer, invitación, placa u otra pieza suelta, pensada para comunicar de verdad.", unit: "por pieza", baseArs: 34000, qty: true },
      { id: "pitch-deck", name: "Presentación / pitch deck", desc: "Hasta 15 diapositivas diseñadas a medida para contar tu idea con claridad.", unit: "por proyecto", baseArs: 230000 },
      { id: "papeleria", name: "Papelería institucional", desc: "Tarjetas, membrete y firma de email, sobre una identidad que ya existe.", unit: "por proyecto", baseArs: 150000 }
    ] },
    { id: "cm", name: "Community management", items: [
      { id: "cm-basica", name: "Gestión básica de redes", desc: "8 piezas al mes, calendario de contenido y subida a redes.", unit: "por mes", baseArs: 340000, qty: true },
      { id: "cm-estandar", name: "Gestión estándar de redes", desc: "12 piezas al mes, calendario, copy y subida a redes.", unit: "por mes", baseArs: 490000, qty: true },
      { id: "cm-intensiva", name: "Gestión intensiva de redes", desc: "20 piezas al mes, historias, copywriting y subida a redes.", unit: "por mes", baseArs: 710000, qty: true },
      { id: "planificacion", name: "Planificación de contenido", desc: "Solo calendario editorial y copy: te ordeno qué decir y cuándo, sin diseño de piezas ni subida a redes.", unit: "por mes", baseArs: 145000, qty: true }
    ] },
    { id: "web", name: "Web sin código", items: [
      { id: "landing", name: "Landing page", desc: "Una página con diseño y publicación en una plataforma sin código.", unit: "por proyecto", baseArs: 290000 },
      { id: "ecommerce", name: "E-commerce", desc: "Tu tienda online en Tiendup, Tienda Nube o Empretienda: diseño, configuración y carga inicial de productos.", unit: "por proyecto", baseArs: 600000 }
    ] },
    { id: "webcode", name: "Web con código", items: [
      { id: "landing-codigo", name: "Landing page con código", desc: "Una página hecha a mano en HTML, CSS y JavaScript: clara, rápida y pensada para verse bien en cualquier pantalla. Incluye diseño, desarrollo y publicación.", unit: "por proyecto", baseArs: 460000 },
      { id: "web-codigo", name: "Sitio web a medida", desc: "Hasta 5 páginas diseñadas y programadas a medida, para que tu marca funcione online tal como la pensaste.", unit: "por proyecto", baseArs: 780000 },
      { id: "mantenimiento-web", name: "Mantenimiento de tu web", desc: "Cambios de contenido, ajustes y actualizaciones de tu web con código.", unit: "por mes", baseArs: 90000, qty: true }
    ] },
    { id: "extras", name: "Extras", items: [
      { id: "consultoria", name: "Consultoría por hora", desc: "Revisión, feedback o asesoría puntual sobre tu marca o tu proyecto.", unit: "por hora", baseArs: 54000, qty: true },
      { id: "revision-extra", name: "Ronda de revisión extra", desc: "Una tanda adicional de cambios fuera de las incluidas.", unit: "por unidad", baseArs: 38000, qty: true }
    ] }
  ];

  /* ---- Estado ---- */
  var estado = { cliente: "emprendimiento", sel: {}, cant: {}, urgente: false };
  var filas = [];      // { item, row, chk, qEl, nEl, ars, usd }
  var cats = [];       // { cat, count }
  var clienteBtns = [];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function ars(n) { return "$ " + Math.round(n).toLocaleString("es-AR"); }
  function usd(n) { return "USD " + Math.round(n).toLocaleString("es-AR"); }
  function mult() { return CLIENTES.filter(function (c) { return c.id === estado.cliente; })[0].mult; }
  function precio(item) { return item.baseArs * mult(); }
  function cantidad(item) { return item.qty ? (estado.cant[item.id] || 1) : 1; }
  function fecha(d) { return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }); }

  /* ---- Tipo de cliente ---- */
  function armarClientes() {
    var wrap = $("cpClientes");
    CLIENTES.forEach(function (c, i) {
      var b = el("button", "cp-cli", "<strong>" + c.label + "</strong><span>" + c.hint + "</span>");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.addEventListener("click", function () { estado.cliente = c.id; actualizar(); });
      b.addEventListener("keydown", function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        var n = clienteBtns[(i + d + CLIENTES.length) % CLIENTES.length];
        n.click(); n.focus();
      });
      clienteBtns.push(b);
      wrap.appendChild(b);
    });
  }

  /* ---- Servicios ---- */
  function armarCategorias() {
    var wrap = $("cpCats");
    CATEGORIAS.forEach(function (cat) {
      var abierta = false; // todas las secciones arrancan cerradas
      var box = el("div", "cp-cat" + (abierta ? " open" : ""));
      var hd = el("h4", "cp-chd");
      var btn = el("button", "cp-ch",
        '<span class="cp-cn">' + cat.name + '</span>' +
        '<span class="cp-cc"><span class="cp-count"></span><span class="cp-pm" aria-hidden="true"></span></span>');
      btn.type = "button";
      btn.id = "cpch-" + cat.id;
      btn.setAttribute("aria-controls", "cpcb-" + cat.id);
      btn.setAttribute("aria-expanded", abierta ? "true" : "false");
      btn.addEventListener("click", function () {
        var o = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", o ? "true" : "false");
        box.classList.toggle("open", o);
      });
      hd.appendChild(btn);
      box.appendChild(hd);

      var bd = el("div", "cp-bd");
      bd.id = "cpcb-" + cat.id;
      bd.setAttribute("role", "region");
      bd.setAttribute("aria-labelledby", btn.id);
      var inner = el("div", "cp-bdi");

      cat.items.forEach(function (item) {
        var row = el("div", "cp-row");
        var chk = el("input");
        chk.type = "checkbox";
        chk.id = "cpk-" + item.id;
        var info = el("div", "cp-inf");
        var lab = el("label", null, item.name);
        lab.setAttribute("for", chk.id);
        info.appendChild(lab);
        info.appendChild(el("p", null, item.desc));
        info.appendChild(el("span", "cp-u", item.unit));

        var qEl = null, nEl = null;
        if (item.qty) {
          qEl = el("div", "cp-q");
          qEl.hidden = true;
          var menos = el("button", null, "–"); menos.type = "button";
          menos.setAttribute("aria-label", "Restar una unidad: " + item.name);
          nEl = el("span", "cp-n", "1"); nEl.setAttribute("aria-live", "polite");
          var mas = el("button", null, "+"); mas.type = "button";
          mas.setAttribute("aria-label", "Sumar una unidad: " + item.name);
          menos.addEventListener("click", function () { estado.cant[item.id] = Math.max(1, cantidad(item) - 1); actualizar(); });
          mas.addEventListener("click", function () { estado.cant[item.id] = Math.min(99, cantidad(item) + 1); actualizar(); });
          qEl.appendChild(menos); qEl.appendChild(nEl); qEl.appendChild(mas);
          info.appendChild(qEl);
        }

        var pr = el("div", "cp-pr", '<b></b><small></small>');
        row.appendChild(chk); row.appendChild(info); row.appendChild(pr);

        chk.addEventListener("change", function () {
          if (chk.checked) { estado.sel[item.id] = true; if (!estado.cant[item.id]) estado.cant[item.id] = 1; }
          else delete estado.sel[item.id];
          actualizar();
        });
        // tocar en cualquier parte de la fila también tilda (útil en el celular)
        row.addEventListener("click", function (e) {
          if (e.target.closest("button,input,label")) return;
          chk.click();
        });

        filas.push({ item: item, row: row, chk: chk, qEl: qEl, nEl: nEl, ars: pr.firstChild, usd: pr.lastChild });
        inner.appendChild(row);
      });

      bd.appendChild(inner);
      box.appendChild(bd);
      wrap.appendChild(box);
      cats.push({ cat: cat, count: btn.querySelector(".cp-count") });
    });

    var urg = el("div", "cp-cat cp-urg");
    urg.innerHTML =
      '<div class="cp-row"><input type="checkbox" id="cpUrgente">' +
      '<div class="cp-inf"><label for="cpUrgente">Entrega urgente</label><p>Para cuando lo necesitás en menos de 5 días hábiles.</p></div>' +
      '<div class="cp-pr"><b>+' + Math.round(RECARGO_URGENTE * 100) + '%</b></div></div>';
    urg.querySelector("input").addEventListener("change", function (e) { estado.urgente = e.target.checked; actualizar(); });
    urg.querySelector(".cp-row").addEventListener("click", function (e) {
      if (e.target.closest("input,label")) return;
      urg.querySelector("input").click();
    });
    wrap.appendChild(urg);
  }

  /* ---- Actualizar pantalla ---- */
  function actualizar() {
    CLIENTES.forEach(function (c, i) {
      var on = c.id === estado.cliente;
      clienteBtns[i].classList.toggle("on", on);
      clienteBtns[i].setAttribute("aria-checked", on ? "true" : "false");
      clienteBtns[i].tabIndex = on ? 0 : -1;
    });

    filas.forEach(function (f) {
      var p = precio(f.item), on = !!estado.sel[f.item.id];
      f.ars.textContent = ars(p);
      f.usd.textContent = usd(p / MEP.value);
      f.chk.checked = on;
      f.row.classList.toggle("on", on);
      if (f.qEl) { f.qEl.hidden = !on; f.nEl.textContent = cantidad(f.item); }
    });

    cats.forEach(function (c) {
      var n = c.cat.items.filter(function (it) { return estado.sel[it.id]; }).length;
      c.count.textContent = n ? n + (n > 1 ? " elegidos" : " elegido") : c.cat.items.length + " servicios";
    });

    resumen();
    var bp = $("cpPdf");
    if (bp) bp.disabled = !Object.keys(estado.sel).length;
  }

  function montos(n) {
    var m = el("span", "cp-m");
    var a = el("b", "cp-ars"); a.textContent = ars(n);
    var u = el("small"); u.textContent = usd(n / MEP.value);
    m.appendChild(a); m.appendChild(u);
    return m;
  }

  function resumen() {
    var lineas = $("cpLineas");
    var elegidos = filas.filter(function (f) { return estado.sel[f.item.id]; });
    var subtotal = 0;
    lineas.innerHTML = "";

    if (!elegidos.length) {
      lineas.appendChild(el("p", "cp-vacio", "Todavía no elegiste nada. Tildá lo que necesites y el total aparece acá."));
    } else {
      elegidos.forEach(function (f) {
        var q = cantidad(f.item), t = precio(f.item) * q;
        subtotal += t;
        var l = el("div", "cp-lin");
        var a = el("span"); a.textContent = f.item.name + (q > 1 ? " ×" + q : "");
        l.appendChild(a); l.appendChild(montos(t));
        lineas.appendChild(l);
      });
      if (estado.urgente) {
        var u = el("div", "cp-lin");
        var ua = el("span"); ua.textContent = "Entrega urgente (+" + Math.round(RECARGO_URGENTE * 100) + "%)";
        u.appendChild(ua); u.appendChild(montos(subtotal * RECARGO_URGENTE));
        lineas.appendChild(u);
      }
    }

    var total = subtotal * (estado.urgente ? 1 + RECARGO_URGENTE : 1);
    $("cpTotal").textContent = ars(total);
    $("cpTotalUsd").textContent = usd(total / MEP.value);
    $("cpBarTotal").textContent = ars(total);
    $("cpBarUsd").textContent = usd(total / MEP.value);
  }

  /* ---- PDF del presupuesto ---- */
  function datosPdf() {
    var cli = CLIENTES.filter(function (c) { return c.id === estado.cliente; })[0];
    var subtotal = 0;
    var lineas = filas.filter(function (f) { return estado.sel[f.item.id]; }).map(function (f) {
      var q = cantidad(f.item), u = precio(f.item);
      subtotal += u * q;
      return { id: f.item.id, name: f.item.name, desc: f.item.desc, unit: f.item.unit, qty: q, baseArs: f.item.baseArs, unitArs: u, totalArs: u * q };
    });
    var recargo = estado.urgente ? subtotal * RECARGO_URGENTE : 0;
    return {
      nombre: ($("cpNombre").value || "").trim(),
      cliente: { id: cli.id, label: cli.label, mult: cli.mult },
      lineas: lineas, urgente: estado.urgente, recargo: RECARGO_URGENTE,
      subtotal: subtotal, recargoArs: recargo, total: subtotal + recargo,
      mep: { value: MEP.value, fecha: MEP.fecha, vivo: MEP.vivo }
    };
  }

  function armarPdf() {
    var btn = $("cpPdf"), msg = $("cpPdfMsg");
    if (!btn) return;
    var textoBtn = btn.textContent, textoMsg = msg.textContent;
    btn.addEventListener("click", function () {
      if (btn.disabled || !window.QFAPdf) { if (!window.QFAPdf) msg.textContent = "No se pudo preparar el PDF. Recargá la página e intentá de nuevo."; return; }
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Armando tu PDF…";
      msg.textContent = "";
      window.QFAPdf.descargar(datosPdf())
        .then(function () { msg.textContent = "Listo: se descargó tu presupuesto."; })
        .catch(function () { msg.textContent = "No pude armar el PDF. Probá de nuevo en un momento."; })
        .then(function () {
          btn.removeAttribute("aria-busy");
          btn.textContent = textoBtn;
          btn.disabled = !Object.keys(estado.sel).length;
        });
    });
    $("cpNombre").addEventListener("input", function () { if (msg.textContent !== textoMsg) msg.textContent = textoMsg; });
  }

  /* ---- Fuentes (se leen de js/calculadora-refs.js) ---- */
  function armarFuentes() {
    var ul = $("cpFuentes"), R = window.QFA_REFS;
    if (!ul || !R || !R.fuentes) return;
    Object.keys(R.fuentes).forEach(function (id) {
      var s = R.fuentes[id];
      var li = el("li");
      var a = el("a"); a.href = s.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.t;
      var sp = el("span"); sp.textContent = s.o + ". " + s.n;
      li.appendChild(a); li.appendChild(sp);
      ul.appendChild(li);
    });
  }

  /* ---- Dólar MEP ---- */
  function pintarMep() {
    $("cpMep").textContent = "$ " + MEP.value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $("cpMepFecha").textContent = (MEP.vivo ? "Actualizado el " : "Valor de referencia al ") + fecha(MEP.fecha);
  }

  function cargarMep() {
    if (!window.fetch) return;
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    fetch("https://dolarapi.com/v1/dolares/bolsa", ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
      .then(function (d) {
        var v = Number(d && d.venta);
        if (!(v > 200 && v < 100000)) return;
        var f = d.fechaActualizacion ? new Date(d.fechaActualizacion) : new Date();
        MEP.value = v; MEP.fecha = isNaN(f) ? new Date() : f; MEP.vivo = true;
        pintarMep(); actualizar();
      })
      .catch(function () { /* sin conexión o API caída: queda el valor de referencia */ })
      .then(function () { clearTimeout(t); });
  }

  /* ---- Abrir directo con herramientas#calculadora ---- */
  function abrirSiHash() {
    if (location.hash !== "#calculadora") return;
    var b = $("hbc");
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }

  armarClientes();
  armarCategorias();
  armarPdf();
  armarFuentes();
  pintarMep();
  actualizar();
  cargarMep();
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
