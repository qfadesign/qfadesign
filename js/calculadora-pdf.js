/* qfadesign — PDF del presupuesto de la calculadora.
   Arma el documento en el navegador con jsPDF (js/vendor/jspdf.umd.min.js, se carga recién al apretar el botón).
   Usa las tipografías de /fonts (en /fonts/pdf, versiones TrueType livianas de Articulat para el PDF) y el logo de /img; si algo no carga, cae a Helvetica y el PDF sale igual.
   Las referencias de mercado salen de js/calculadora-refs.js. */
(function (root) {
  "use strict";

  /* ---- Rutas (relativas a este archivo, así funciona en cualquier carpeta) ---- */
  var BASE = "";
  try {
    var cs = typeof document !== "undefined" && document.currentScript;
    if (cs && cs.src) BASE = new URL("../", cs.src).href;
  } catch (e) { /* queda vacío */ }

  var FUENTES_TTF = {
    AR:  { normal: "fonts/pdf/ArticulatCF-Regular.ttf", italic: "fonts/pdf/ArticulatCF-Italic.ttf" },
    ARH: { italic: "fonts/pdf/ArticulatCF-HeavyItalic.ttf" },
    POD: { normal: "fonts/PodiumSoft.ttf" }
  };
  var LOGO = "img/pdf-logo-azul.png";
  var LOGO_RATIO = 223 / 1000;
  var SITIO = "qfadesign.com";
  var EMAIL = "qfadesignn@gmail.com";
  var INSTAGRAM = "https://www.instagram.com/qfadesign/";

  /* ---- Colores de la marca ---- */
  var C = {
    azul: [10, 92, 192], azulV: [11, 117, 244], navy: [6, 33, 77],
    gris: [74, 90, 117], linea: [208, 220, 238], suave: [240, 246, 255], blanco: [255, 255, 255]
  };

  /* ---- Formatos ---- */
  function num(n) { return Math.round(n).toLocaleString("es-AR"); }
  function ars(n) { return "$ " + num(n); }
  function usd(n) { return "USD " + num(n); }
  function dec(n) { return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fechaCorta(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function coef(n) { return String(n).replace(".", ","); }

  /* ---- Carga de recursos ---- */
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { mal(new Error("No cargó " + src)); };
      document.head.appendChild(s);
    });
  }
  function aBase64(buf) {
    var b = new Uint8Array(buf), s = "", paso = 0x8000;
    for (var i = 0; i < b.length; i += paso) s += String.fromCharCode.apply(null, b.subarray(i, i + paso));
    return btoa(s);
  }
  function pedir(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.arrayBuffer(); });
  }
  var cacheRecursos = null;
  function cargarRecursos() {
    if (cacheRecursos) return cacheRecursos;
    var rec = { fonts: null, logo: null };
    var tareas = [];
    var fuentes = {}, pend = [];
    Object.keys(FUENTES_TTF).forEach(function (fam) {
      Object.keys(FUENTES_TTF[fam]).forEach(function (estilo) {
        var ruta = FUENTES_TTF[fam][estilo];
        pend.push(pedir(BASE + ruta).then(function (buf) {
          (fuentes[fam] = fuentes[fam] || {})[estilo] = { file: ruta.split("/").pop(), b64: aBase64(buf) };
        }));
      });
    });
    tareas.push(Promise.all(pend).then(function () { rec.fonts = fuentes; }).catch(function () { rec.fonts = null; }));
    tareas.push(pedir(BASE + LOGO).then(function (buf) { rec.logo = "data:image/png;base64," + aBase64(buf); }).catch(function () { rec.logo = null; }));
    cacheRecursos = Promise.all(tareas).then(function () { return rec; });
    return cacheRecursos;
  }

  /* ---- Referencias: comparación del valor aplicado con cada fuente ---- */
  function aPesos(r, mep) {
    var k = r.mon === "USD" ? mep : 1;
    return { min: r.min * k, max: r.max * k };
  }
  function rangoTexto(r, mep) {
    var esUsd = r.mon === "USD", pre = esUsd ? "USD " : "$ ", t;
    if (r.min === r.max) t = pre + num(r.min);
    else if (esUsd) t = "USD " + num(r.min) + " – " + num(r.max) + (r.mas ? " o más" : "");
    else t = "$ " + num(r.min) + " – $ " + num(r.max);
    if (r.p) t += " " + r.p;
    if (esUsd) {
      var c = aPesos(r, mep);
      t += " (equivale a " + (r.min === r.max ? ars(c.min) : ars(c.min) + " – " + ars(c.max)) + (r.mas ? " o más" : "") + ")";
    }
    return t + ".";
  }
  function posicion(v, r, mep) {
    var c = aPesos(r, mep);
    if (r.min === r.max) {
      var d = (v / c.min - 1) * 100;
      if (Math.abs(d) <= 10) return "El valor aplicado está en línea con la referencia.";
      return "El valor aplicado queda un " + Math.abs(Math.round(d)) + " % " + (d < 0 ? "por debajo" : "por encima") + " de la referencia.";
    }
    if (v < c.min) return "El valor aplicado queda por debajo del rango de referencia.";
    if (v > c.max && !r.mas) return r.minimo ? "El valor aplicado queda por encima de la banda mínima de referencia." : "El valor aplicado queda por encima del rango de referencia.";
    return "El valor aplicado está dentro del rango de referencia.";
  }

  /* ---- Armado del documento ---- */
  function construir(jsPDF, d, rec) {
    var R = root.QFA_REFS || { fuentes: {}, servicios: {}, porHora: [], urgente: [], clientes: {} };
    var mep = d.mep.value;
    var doc = new jsPDF({ unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
    var PW = 595.28, PH = 841.89, ML = 46, CW = PW - ML * 2, TOP = 46, BOT = PH - 62;
    var y = TOP, pagina = 1;

    /* tipografías: las de la marca si cargaron, Helvetica si no */
    var conMarca = !!(rec && rec.fonts && rec.fonts.AR && rec.fonts.AR.normal && rec.fonts.AR.italic && rec.fonts.ARH && rec.fonts.POD);
    if (conMarca) {
      Object.keys(rec.fonts).forEach(function (fam) {
        Object.keys(rec.fonts[fam]).forEach(function (estilo) {
          var f = rec.fonts[fam][estilo];
          doc.addFileToVFS(f.file, f.b64);
          doc.addFont(f.file, fam, estilo);
        });
      });
    }
    var FUENTE = conMarca
      ? { b: ["AR", "normal"], bi: ["AR", "italic"], h: ["ARH", "italic"], p: ["POD", "normal"] }
      : { b: ["helvetica", "normal"], bi: ["helvetica", "italic"], h: ["helvetica", "bolditalic"], p: ["helvetica", "bold"] };
    function f(k, size, color) {
      doc.setFont(FUENTE[k][0], FUENTE[k][1]);
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || C.navy);
    }
    function trazo(color, w) { doc.setDrawColor.apply(doc, color); doc.setLineWidth(w); }
    function relleno(color) { doc.setFillColor.apply(doc, color); }
    function mayus(s) { return s.toUpperCase(); }

    /* citas: cada fuente recibe su número la primera vez que se menciona */
    var orden = [];
    function cita(fid) {
      var i = orden.indexOf(fid);
      if (i < 0) { orden.push(fid); i = orden.length - 1; }
      return i + 1;
    }

    /* párrafo: mide y, si draw, dibuja. Devuelve el alto */
    function parrafo(texto, x, w, k, size, color, lh, draw) {
      f(k, size, color);
      var ls = doc.splitTextToSize(texto, w);
      if (draw) ls.forEach(function (l, i) { doc.text(l, x, y + size + i * lh - 1); });
      return ls.length * lh;
    }

    function cabeceraInterna() {
      if (rec && rec.logo) doc.addImage(rec.logo, "PNG", ML, 30, 70, 70 * LOGO_RATIO);
      f("p", 7, C.gris);
      doc.text(mayus("Presupuesto estimado · " + d.ref), PW - ML, 42, { align: "right", charSpace: 0.7 });
      trazo(C.linea, 0.75);
      doc.line(ML, 58, PW - ML, 58);
      y = 80;
    }
    function nuevaPagina() { doc.addPage(); pagina++; cabeceraInterna(); }
    function asegurar(h) { if (y + h > BOT) nuevaPagina(); }

    function titulo(kicker, texto) {
      asegurar(64);
      f("p", 7.5, C.azul);
      doc.text(mayus(kicker), ML, y + 8, { charSpace: 1 });
      y += 14;
      f("h", 21, C.navy);
      doc.text(texto, ML, y + 18, { charSpace: -0.4 });
      y += 30;
    }

    /* ===== Portada: marca, título y datos ===== */
    if (rec && rec.logo) doc.addImage(rec.logo, "PNG", ML, TOP - 2, 118, 118 * LOGO_RATIO);
    else { f("h", 20, C.azulV); doc.text("qfadesign", ML, TOP + 18); }
    f("p", 8, C.azul);
    doc.text(mayus("Presupuesto estimado"), PW - ML, TOP + 10, { align: "right", charSpace: 1.2 });
    f("b", 8.5, C.gris);
    doc.text("N.º " + d.ref, PW - ML, TOP + 24, { align: "right" });
    trazo(C.linea, 0.75);
    doc.line(ML, TOP + 40, PW - ML, TOP + 40);

    /* título: la mitad rellena y la otra "hueca", como en el sitio */
    y = TOP + 112;
    var TS = 46, cs = -1.4;
    f("h", TS, C.azul);
    doc.text("Presu", ML, y, { charSpace: cs });
    var w1 = doc.getTextWidth("Presu") + cs * 5;
    trazo(C.azul, 1.3);
    doc.text("puesto", ML + w1, y, { renderingMode: "stroke", charSpace: cs });
    f("b", 11, C.gris);
    doc.text("Detalle de lo seleccionado y fundamentos de cada valor.", ML, y + 24);
    y += 52;

    if (d.nombre) {
      f("p", 7, C.gris); doc.text(mayus("Preparado para"), ML, y + 7, { charSpace: 0.9 });
      f("h", 16, C.navy); doc.text(d.nombre, ML, y + 26, { maxWidth: CW });
      y += 42;
    }

    /* franja de datos */
    trazo(C.linea, 0.75);
    doc.line(ML, y, PW - ML, y);
    var cols = [
      ["Fecha", fechaCorta(d.ahora), ""],
      ["Referencia", d.ref, ""],
      ["Tipo de cliente", d.cliente.label, ""],
      ["Dólar MEP", "$ " + dec(mep), (d.mep.vivo ? "al " : "referencia al ") + fechaCorta(d.mep.fecha)]
    ];
    var cw = CW / 4;
    cols.forEach(function (c, i) {
      var x = ML + i * cw;
      f("p", 6.8, C.gris); doc.text(mayus(c[0]), x, y + 16, { charSpace: 0.8 });
      f("b", 9.5, C.navy); doc.text(c[1], x, y + 31, { maxWidth: cw - 8 });
      if (c[2]) { f("b", 7.5, C.gris); doc.text(c[2], x, y + 42); }
    });
    y += 54;
    doc.line(ML, y, PW - ML, y);
    y += 30;

    /* ===== Detalle ===== */
    f("h", 16, C.navy);
    doc.text("Detalle del presupuesto", ML, y + 4, { charSpace: -0.2 });
    y += 20;

    var W = [214, 56, 76, 84, 73];
    var X1 = ML + W[0] + W[1] + W[2];            // borde derecho de "Valor unitario"
    var X2 = X1 + W[3];                           // borde derecho de "Subtotal"
    var X3 = X2 + W[4];                           // borde derecho de USD
    var XC = ML + W[0] + W[1] / 2;                // centro de "Cant."
    function cabeceraTabla() {
      f("p", 6.8, C.azul);
      doc.text(mayus("Servicio"), ML, y + 8, { charSpace: 0.9 });
      doc.text(mayus("Cant."), XC, y + 8, { align: "center", charSpace: 0.9 });
      doc.text(mayus("Valor unit."), X1, y + 8, { align: "right", charSpace: 0.9 });
      doc.text(mayus("Subtotal"), X2, y + 8, { align: "right", charSpace: 0.9 });
      doc.text(mayus("En USD"), X3, y + 8, { align: "right", charSpace: 0.9 });
      trazo(C.azul, 1);
      doc.line(ML, y + 15, PW - ML, y + 15);
      y += 15;
    }
    cabeceraTabla();

    function fila(nombre, desc, cant, unidad, unit, total) {
      f("h", 10.5, C.navy);
      var ln = doc.splitTextToSize(nombre, W[0] - 12);
      f("b", 8, C.gris);
      var ld = desc ? doc.splitTextToSize(desc, W[0] - 12) : [];
      var h = 11 + ln.length * 12.5 + (ld.length ? 3 + ld.length * 10.4 : 0) + 11;
      if (y + h > BOT) { nuevaPagina(); cabeceraTabla(); }
      var ty = y + 11 + 10;
      f("h", 10.5, C.navy);
      ln.forEach(function (l, i) { doc.text(l, ML, ty + i * 12.5); });
      var dy = ty + (ln.length - 1) * 12.5 + 3;
      f("b", 8, C.gris);
      ld.forEach(function (l, i) { doc.text(l, ML, dy + 10 + i * 10.4 - 2); });
      var by = y + 11 + 9.5;
      f("h", 10, C.navy);
      doc.text(String(cant), XC, by, { align: "center" });
      if (unidad) { f("bi", 7, C.gris); doc.text(unidad, XC, by + 10, { align: "center" }); }
      if (unit != null) { f("b", 9.5, C.navy); doc.text(ars(unit), X1, by, { align: "right" }); }
      f("h", 10, C.navy);
      doc.text(ars(total), X2, by, { align: "right" });
      f("b", 9, C.gris);
      doc.text(usd(total / mep), X3, by, { align: "right" });
      y += h;
      trazo(C.linea, 0.6);
      doc.line(ML, y, PW - ML, y);
    }
    d.lineas.forEach(function (l) { fila(l.name, l.desc, l.qty, l.unit, l.unitArs, l.totalArs); });
    if (d.urgente) fila("Entrega urgente (+" + Math.round(d.recargo * 100) + " %)", "Para entregas en menos de 5 días hábiles. Se calcula sobre el subtotal.", "—", "", null, d.recargoArs);

    /* total */
    y += 22;
    asegurar(96);
    var BW = 244, BX = PW - ML - BW, BH = 78;
    relleno(C.azul);
    doc.roundedRect(BX, y, BW, BH, 12, 12, "F");
    f("p", 7.5, C.blanco); doc.text(mayus("Total estimado"), BX + 18, y + 20, { charSpace: 1.2 });
    f("h", 26, C.blanco);
    var tTxt = ars(d.total);
    doc.text(tTxt, BX + 18, y + 49, { charSpace: -0.5 });
    var tw = doc.getTextWidth(tTxt) - 0.5 * tTxt.length;
    f("p", 8.5, C.blanco); doc.text("ARS", BX + 18 + tw + 6, y + 49);
    f("h", 11, C.blanco); doc.text(usd(d.total / mep), BX + 18, y + 67);
    var phn = parrafo("Valores en pesos argentinos. El equivalente en dólares se calcula con el dólar MEP" + (d.mep.vivo ? " del " : " de referencia al ") + fechaCorta(d.mep.fecha) + ".", ML, BX - ML - 22, "b", 8, C.gris, 11, true);
    if (d.urgente) {
      f("b", 8, C.gris);
      doc.text("Subtotal: " + ars(d.subtotal) + "  ·  Urgencia: " + ars(d.recargoArs), ML, y + phn + 14);
    }
    y += BH + 30;

    /* ===== Fundamentos ===== */
    titulo("Fundamentos", "¿Por qué estos valores?");
    var intro = "Cada valor parte de un precio base en pesos, definido por el alcance de cada servicio. Ese precio se ajusta según el tipo de cliente y, si hace falta, por urgencia. Después se contrasta con referencias públicas de mercado: algunas argentinas, en pesos, y otras internacionales, en dólares, que se pasan a pesos con el dólar MEP del día. Son datos para dimensionar el valor, no una tarifa oficial.";
    y += parrafo(intro, ML, CW, "b", 9.5, C.gris, 13.8, true) + 12;

    /* bloque con barra de acento: contenido(draw) -> alto */
    function bloque(contenido) {
      var y0 = y;
      var h = contenido(false);
      y = y0;
      asegurar(h + 14);
      y0 = y;
      contenido(true);
      trazo(C.azulV, 2.4);
      doc.line(ML, y0 + 1, ML, y0 + h - 4);
      y = y0 + h + 14;
    }

    /* tipo de cliente */
    bloque(function (draw) {
      var x = ML + 14, w = CW - 14, yo = y, h = 0;
      function avanzar(n) { h += n; y = yo + h; }
      if (draw) { f("h", 11.5, C.navy); doc.text("Tipo de cliente: " + d.cliente.label, x, y + 11); }
      avanzar(18);
      var txt = R.clientes && R.clientes[d.cliente.id] ? R.clientes[d.cliente.id] : "";
      if (txt) avanzar(parrafo(txt, x, w, "b", 9, C.gris, 12.6, draw));
      return h + 2;
    });

    /* un bloque por servicio */
    function bloqueServicio(l) {
      bloque(function (draw) {
        var x = ML + 14, w = CW - 14, yo = y, h = 0;
        function avanzar(n) { h += n; y = yo + h; }
        /* título y valor */
        if (draw) {
          f("h", 11.5, C.navy); doc.text(l.name, x, y + 11, { maxWidth: w - 150 });
          f("h", 11.5, C.azul); doc.text(ars(l.unitArs) + " " + l.unit.replace("por ", "/ "), PW - ML, y + 11, { align: "right" });
        }
        f("h", 11.5, C.navy);
        var nl = doc.splitTextToSize(l.name, w - 150).length;
        avanzar(Math.max(nl, 1) * 14 + 4);
        /* cómo se llega al valor */
        var formula = d.cliente.mult === 1
          ? "Precio base " + ars(l.baseArs) + " (sin coeficiente: cliente " + d.cliente.label + "). Equivale a " + usd(l.unitArs / mep) + "."
          : "Precio base " + ars(l.baseArs) + " × coeficiente de cliente " + coef(d.cliente.mult) + " = " + ars(l.unitArs) + ". Equivale a " + usd(l.unitArs / mep) + ".";
        avanzar(parrafo(formula, x, w, "b", 8.5, C.gris, 12, draw) + 4);
        /* referencias */
        var refs = R.servicios[l.id];
        if (refs && refs.length) {
          refs.forEach(function (r) {
            var n = draw ? cita(r.f) : (orden.indexOf(r.f) >= 0 ? orden.indexOf(r.f) + 1 : orden.length + 1);
            var lab = "[" + n + "]";
            if (draw) { f("h", 8.5, C.azul); doc.text(lab, x, y + 9.5); }
            var t = r.l + ": " + rangoTexto(r, mep);
            var a = parrafo(t, x + 20, w - 20, "b", 8.5, C.navy, 12, draw);
            avanzar(a);
            if (draw) { f("h", 8.5, C.azul); }
            var pos = posicion(l.unitArs, r, mep);
            f("h", 8.5, C.azul);
            var lp = doc.splitTextToSize(pos, w - 20);
            if (draw) lp.forEach(function (s, i) { doc.text(s, x + 20, y + 9.5 + i * 12); });
            avanzar(lp.length * 12 + 4);
          });
        } else {
          var ph = R.porHora || [];
          var partes = ph.map(function (r) {
            var n = draw ? cita(r.f) : (orden.indexOf(r.f) >= 0 ? orden.indexOf(r.f) + 1 : orden.length + 1);
            return rangoTexto(r, mep).replace(/\.$/, "") + " [" + n + "]";
          });
          var t = "No se relevó una tarifa de mercado comparable para este servicio puntual. El valor se define por el alcance incluido y el tiempo de trabajo, tomando como base las tarifas horarias de referencia: " + partes.join(" y ") + ".";
          avanzar(parrafo(t, x, w, "b", 8.5, C.navy, 12, draw) + 2);
        }
        return h;
      });
    }
    d.lineas.forEach(bloqueServicio);

    /* urgencia */
    if (d.urgente) {
      bloque(function (draw) {
        var x = ML + 14, w = CW - 14, yo = y, h = 0;
        function avanzar(n) { h += n; y = yo + h; }
        if (draw) {
          f("h", 11.5, C.navy); doc.text("Entrega urgente (+" + Math.round(d.recargo * 100) + " %)", x, y + 11);
          f("h", 11.5, C.azul); doc.text(ars(d.recargoArs), PW - ML, y + 11, { align: "right" });
        }
        avanzar(18);
        avanzar(parrafo("Recargo por entregar en menos de 5 días hábiles: obliga a reordenar la agenda y a priorizar el proyecto por sobre otros trabajos.", x, w, "b", 8.5, C.gris, 12, draw) + 4);
        (R.urgente || []).forEach(function (r) {
          var n = draw ? cita(r.f) : (orden.indexOf(r.f) >= 0 ? orden.indexOf(r.f) + 1 : orden.length + 1);
          if (draw) { f("h", 8.5, C.azul); doc.text("[" + n + "]", x, y + 9.5); }
          avanzar(parrafo(r.l + ": entre " + r.min + " % y " + r.max + " %.", x + 20, w - 20, "b", 8.5, C.navy, 12, draw));
          var pos = d.recargo * 100 < r.min ? "El recargo aplicado (" + Math.round(d.recargo * 100) + " %) queda por debajo del rango de referencia."
            : d.recargo * 100 > r.max ? "El recargo aplicado (" + Math.round(d.recargo * 100) + " %) queda por encima del rango de referencia."
            : "El recargo aplicado (" + Math.round(d.recargo * 100) + " %) está dentro del rango de referencia.";
          f("h", 8.5, C.azul);
          var lp = doc.splitTextToSize(pos, w - 20);
          if (draw) lp.forEach(function (s, i) { doc.text(s, x + 20, y + 9.5 + i * 12); });
          avanzar(lp.length * 12 + 4);
        });
        return h;
      });
    }

    /* ===== Fuentes ===== */
    y += 8;
    titulo("Referencias", "Fuentes consultadas");
    orden.forEach(function (fid, i) {
      var s = R.fuentes[fid];
      if (!s) return;
      var w = CW - 24;
      var alto = function (draw) {
        var h = 0, yo = y;
        function avanzar(n) { h += n; y = yo + h; }
        avanzar(parrafo(s.t, ML + 24, w, "h", 9, C.navy, 12, draw));
        avanzar(parrafo(s.o + ". Consultado el " + R.consulta + ".", ML + 24, w, "b", 8, C.gris, 11, draw));
        avanzar(parrafo(s.n, ML + 24, w, "b", 8, C.gris, 11, draw));
        f("b", 8, C.azul);
        var lu = doc.splitTextToSize(s.u, w);
        lu.forEach(function (u, k) { if (draw) doc.textWithLink(u, ML + 24, y + 8 + k * 11, { url: s.u }); });
        avanzar(lu.length * 11);
        return h;
      };
      var yy = y, h = alto(false);
      y = yy;
      asegurar(h + 12);
      yy = y;
      f("h", 9, C.azul); doc.text("[" + (i + 1) + "]", ML, yy + 9);
      alto(true);
      y = yy + h + 10;
    });

    /* ===== Alcance y condiciones ===== */
    y += 4;
    var cond = "Los valores son de referencia: están calculados en pesos y se muestran también en dólares con la cotización del MEP del día. Se ajustan según el contexto económico. El presupuesto final se confirma según el alcance real del proyecto, los plazos y el tipo de vínculo con la marca. No incluye pauta publicitaria, producción externa (impresión, fotografía profesional, etc.), licencias de software, dominio ni hosting.";
    var hc = parrafo(cond, ML + 16, CW - 32, "b", 8.5, C.gris, 12.2, false);
    asegurar(hc + 50);
    relleno(C.suave);
    doc.roundedRect(ML, y, CW, hc + 40, 10, 10, "F");
    f("p", 7.5, C.azul); doc.text(mayus("Alcance y condiciones"), ML + 16, y + 20, { charSpace: 1 });
    y += 26;
    parrafo(cond, ML + 16, CW - 32, "b", 8.5, C.gris, 12.2, true);
    y += hc + 28;

    /* ===== Contacto ===== */
    asegurar(70);
    trazo(C.linea, 0.75);
    doc.line(ML, y, PW - ML, y);
    y += 28;
    f("h", 17, C.navy); doc.text("¿Charlamos tu proyecto?", ML, y, { charSpace: -0.3 });
    y += 20;
    f("b", 9.5, C.azul);
    doc.textWithLink(EMAIL, ML, y, { url: "mailto:" + EMAIL });
    var xe = ML + doc.getTextWidth(EMAIL);
    f("b", 9.5, C.gris); doc.text("  ·  ", xe, y);
    xe += doc.getTextWidth("  ·  ");
    f("b", 9.5, C.azul); doc.textWithLink(SITIO, xe, y, { url: "https://" + SITIO });
    xe += doc.getTextWidth(SITIO);
    f("b", 9.5, C.gris); doc.text("  ·  ", xe, y);
    xe += doc.getTextWidth("  ·  ");
    f("b", 9.5, C.azul); doc.textWithLink("@qfadesign", xe, y, { url: INSTAGRAM });

    /* pie de todas las páginas */
    var total = doc.getNumberOfPages();
    for (var p = 1; p <= total; p++) {
      doc.setPage(p);
      trazo(C.linea, 0.75);
      doc.line(ML, PH - 44, PW - ML, PH - 44);
      f("b", 7.5, C.gris);
      doc.text("qfadesign  ·  " + SITIO, ML, PH - 30);
      doc.text("Página " + p + " de " + total, PW - ML, PH - 30, { align: "right" });
    }

    doc.setProperties({
      title: "Presupuesto estimado — qfadesign",
      subject: "Presupuesto estimado N.º " + d.ref,
      author: "qfadesign",
      creator: SITIO
    });
    return doc;
  }

  /* ---- API pública ---- */
  function nombreArchivo(d) {
    var f = d.ahora;
    var base = "presupuesto-qfadesign-" + f.getFullYear() + pad(f.getMonth() + 1) + pad(f.getDate());
    if (d.nombre) {
      var slug = d.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      if (slug) base += "-" + slug;
    }
    return base + ".pdf";
  }
  function descargar(datos) {
    var d = datos;
    d.ahora = d.ahora || new Date();
    d.ref = d.ref || ("QFA-" + d.ahora.getFullYear() + pad(d.ahora.getMonth() + 1) + pad(d.ahora.getDate()) + "-" + pad(d.ahora.getHours()) + pad(d.ahora.getMinutes()));
    var lib = root.jspdf && root.jspdf.jsPDF ? Promise.resolve() : cargarScript(BASE + "js/vendor/jspdf.umd.min.js");
    return Promise.all([lib, cargarRecursos()]).then(function (r) {
      var doc = construir(root.jspdf.jsPDF, d, r[1]);
      doc.save(nombreArchivo(d));
    });
  }

  root.QFAPdf = { descargar: descargar, _construir: construir, _nombreArchivo: nombreArchivo };
})(typeof window !== "undefined" ? window : globalThis);
