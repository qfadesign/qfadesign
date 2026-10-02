/* qfadesign — calculadora de precios (herramientas). Sin dependencias.
   Los precios base están en pesos (baseArs); el dólar MEP se usa para mostrar el equivalente en USD.
   El MEP se pide a dolarapi.com al abrir la página; si falla, se usa el valor de referencia de abajo. */
(function () {
  "use strict";
  var raiz = document.getElementById("calculadora");
  if (!raiz) return;

  /* ---- Datos: editá acá precios, servicios y recargos ---- */
  var MEP = { value: 1542.1, fecha: new Date("2026-09-16T12:00:00"), vivo: false };
  var RECARGO_URGENTE = 0.3;

  var CLIENTES = [
    { id: "emprendimiento", label: "Emprendimiento / ONG", hint: "Recién empezando o sin fines de lucro", mult: 1 },
    { id: "pyme", label: "Pyme", hint: "Equipo chico, facturación estable", mult: 1.4 },
    { id: "empresa", label: "Empresa", hint: "Estructura grande, varias áreas", mult: 2 }
  ];

  var CATEGORIAS = [
    { id: "marca", name: "Identidad de marca", items: [
      { id: "branding-emprendedores", name: "Branding para emprendedores", desc: "Logotipo, paleta y tipografías, patrones básicos, mini guía de marca y archivos editables finales. Para proyectos que están empezando pero quieren verse profesionales.", unit: "por proyecto", baseArs: 460000 },
      { id: "rediseno-imagen", name: "Rediseño de imagen", desc: "Logo e isotipo, manual de identidad, análisis de competencia y aplicaciones listas para redes. Para marcas que crecieron y ya no se sienten representadas.", unit: "por proyecto", baseArs: 610000 },
      { id: "identidad-completa", name: "Identidad visual completa", desc: "Rediseño de imagen, aplicaciones de marca, plantillas para redes y usos correctos e incorrectos. Para proyectos que están consolidados.", unit: "por proyecto", baseArs: 870000 }
    ] },
    { id: "grafica", name: "Diseño gráfico y comunicación", items: [
      { id: "kit-redes", name: "Kit de plantillas para redes", desc: "Plantillas editables para feed, historias y destacadas.", unit: "por proyecto", baseArs: 250000 },
      { id: "pieza-unica", name: "Pieza gráfica única", desc: "Flyer, invitación, placa u otra pieza suelta.", unit: "por pieza", baseArs: 34000, qty: true },
      { id: "pitch-deck", name: "Presentación / pitch deck", desc: "Hasta 15 diapositivas con diseño a medida.", unit: "por proyecto", baseArs: 230000 },
      { id: "papeleria", name: "Papelería institucional", desc: "Tarjetas, membrete y firma de email con una identidad ya diseñada.", unit: "por proyecto", baseArs: 150000 }
    ] },
    { id: "cm", name: "Community management", items: [
      { id: "cm-basica", name: "Gestión básica de redes", desc: "8 piezas al mes, calendario de contenido y subida de contenido a redes.", unit: "por mes", baseArs: 340000, qty: true },
      { id: "cm-estandar", name: "Gestión estándar de redes", desc: "12 piezas al mes, calendario, copy y subida de contenido a redes.", unit: "por mes", baseArs: 490000, qty: true },
      { id: "cm-intensiva", name: "Gestión intensiva de redes", desc: "20 piezas al mes, historias, copywriting y subida de contenido a redes.", unit: "por mes", baseArs: 710000, qty: true },
      { id: "planificacion", name: "Planificación de contenido", desc: "Solo calendario editorial y copy, sin diseño de piezas ni subida de contenido.", unit: "por mes", baseArs: 145000, qty: true }
    ] },
    { id: "web", name: "Web (no-code)", items: [
      { id: "landing", name: "Landing page", desc: "Una página, diseño y publicación en plataforma no-code.", unit: "por proyecto", baseArs: 290000 },
      { id: "ecommerce", name: "E-commerce", desc: "Tienda online en Tiendup, Tienda Nube o Empretienda: diseño, configuración y carga inicial de productos.", unit: "por proyecto", baseArs: 600000 }
    ] },
    { id: "extras", name: "Extras", cerrada: true, items: [
      { id: "consultoria", name: "Consultoría por hora", desc: "Revisión, feedback o asesoría puntual.", unit: "por hora", baseArs: 54000, qty: true },
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
      var abierta = !cat.cerrada;
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
      '<div class="cp-inf"><label for="cpUrgente">Entrega urgente</label><p>Menos de 5 días hábiles.</p></div>' +
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
      lineas.appendChild(el("p", "cp-vacio", "Todavía no elegiste ningún servicio. Tildá lo que necesites y el total aparece acá."));
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
  pintarMep();
  actualizar();
  cargarMep();
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
