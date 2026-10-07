/* qfadesign — PDF del presupuesto de la calculadora.
   Arma el documento en el navegador con jsPDF (js/vendor/jspdf.umd.min.js, se carga recién al apretar el botón).
   Usa las tipografías de /fonts (en /fonts/pdf, versiones TrueType livianas de Articulat para el PDF) y el logo de /img; si algo no carga, cae a Helvetica y el PDF sale igual.
   Las referencias de mercado salen de js/calculadora-refs.js. El presupuesto entra en UNA hoja: se prueban distintos niveles de compactación (NIVELES). */
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
  var TITULO = "img/pdf-titulo-presupuesto.png";     /* sticker del título de la portada */
  var TITULO_RATIO = 290 / 1600;
  var STICKER = "img/pdf-sticker-qfadesign.png";     /* sticker de la marca, arriba a la derecha */
  var STICKER_RATIO = 184 / 700;
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
    var rec = { fonts: null, logo: null, titulo: null, sticker: null };
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
    tareas.push(pedir(BASE + TITULO).then(function (buf) { rec.titulo = "data:image/png;base64," + aBase64(buf); }).catch(function () { rec.titulo = null; }));
    tareas.push(pedir(BASE + STICKER).then(function (buf) { rec.sticker = "data:image/png;base64," + aBase64(buf); }).catch(function () { rec.sticker = null; }));
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
  function rangoCorto(r, mep) { return rangoTexto(r, mep).replace(/\.$/, ""); }
  function posCorta(v, r, mep) {
    var c = aPesos(r, mep);
    if (r.min === r.max) {
      var d = (v / c.min - 1) * 100;
      if (Math.abs(d) <= 10) return "En línea con la referencia.";
      return Math.abs(Math.round(d)) + " % " + (d < 0 ? "por debajo" : "por encima") + " de la referencia.";
    }
    if (v < c.min) return "Por debajo del rango.";
    if (v > c.max && !r.mas) return r.minimo ? "Por encima de la banda mínima." : "Por encima del rango.";
    return "Dentro del rango.";
  }

  /* ---- Armado del documento ---- */
  /* Niveles de compactación: se prueba del más amplio al más compacto hasta que todo entre en UNA hoja.
     Si ni así entra (muchísimos servicios), se usa el nivel 1 y el resto sigue en una segunda hoja. */
  var NIVELES = [
    { ts: 46, ty: 112, sub: 24, gapT: 52, np: 42, strip: 54, sd: 26, hd: 16, hdy: 20, rowPad: 10, nm: 10.5, jf: 7.8, jl: 9.6, tg: 20, bh: 76, tf: 26, cond: 7, cg: 22 },
    { ts: 38, ty: 98,  sub: 22, gapT: 42, np: 34, strip: 52, sd: 20, hd: 15, hdy: 18, rowPad: 8,  nm: 10,   jf: 7.5, jl: 9.1, tg: 16, bh: 74, tf: 24, cond: 6.8, cg: 18 },
    { ts: 30, ty: 86,  sub: 20, gapT: 36, np: 32, strip: 50, sd: 14, hd: 14, hdy: 16, rowPad: 6,  nm: 9.5,  jf: 7,   jl: 8.5, tg: 12, bh: 71, tf: 21, cond: 6.6, cg: 14 },
    { ts: 26, ty: 76,  sub: 18, gapT: 30, np: 30, strip: 48, sd: 10, hd: 13, hdy: 14, rowPad: 4,  nm: 9,    jf: 6.6, jl: 8,   tg: 10, bh: 69, tf: 19, cond: 6.4, cg: 10 }
  ];

  function construir(jsPDF, d, rec, nivel) {
    var P = NIVELES[nivel];
    var R = root.QFA_REFS || { fuentes: {}, servicios: {}, porHora: [], urgente: [], clientes: {} };
    var mep = d.mep.value;
    var doc = new jsPDF({ unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
    var PW = 595.28, PH = 841.89, ML = 46, CW = PW - ML * 2, TOP = 46, BOT = PH - 62;
    var y = TOP;

    /* tipografías: las de la marca si cargaron, Helvetica si no */
    var conMarca = !!(rec && rec.fonts && rec.fonts.AR && rec.fonts.AR.normal && rec.fonts.AR.italic && rec.fonts.ARH && rec.fonts.POD);
    if (conMarca) {
      Object.keys(rec.fonts).forEach(function (fam) {
        Object.keys(rec.fonts[fam]).forEach(function (estilo) {
          var fo = rec.fonts[fam][estilo];
          doc.addFileToVFS(fo.file, fo.b64);
          doc.addFont(fo.file, fam, estilo);
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
    function logo(x, yy, w) { if (rec && rec.logo) { doc.addImage(rec.logo, "PNG", x, yy, w, w * LOGO_RATIO); return true; } return false; }

    /* párrafo con estilos mezclados: segs = [{t, k, c}]. Mide y, si draw, dibuja. Devuelve el alto */
    function rico(segs, x, y0, w, size, lh, draw) {
      var lines = [[]], cx = 0;
      segs.forEach(function (s) {
        f(s.k, size, s.c);
        (s.t.match(/\S+|\s+/g) || []).forEach(function (t) {
          var esp = /^\s/.test(t), tw = doc.getTextWidth(t);
          if (esp) { if (cx === 0) return; lines[lines.length - 1].push({ t: t, k: s.k, c: s.c, x: cx, sp: true }); cx += tw; return; }
          if (cx + tw > w && cx > 0) { lines.push([]); cx = 0; }
          lines[lines.length - 1].push({ t: t, k: s.k, c: s.c, x: cx });
          cx += tw;
        });
      });
      if (draw) lines.forEach(function (ln, i) {
        ln.forEach(function (tk) {
          if (tk.sp) return;
          f(tk.k, size, tk.c);
          doc.text(tk.t, x + tk.x, y0 + size + i * lh - 1);
        });
      });
      return lines.length * lh;
    }

    /* sticker de la marca pegado al borde derecho; si no cargó, cae al logo azul */
    function marcaDer(yy, w) {
      if (rec && rec.sticker) { doc.addImage(rec.sticker, "PNG", PW - ML - w, yy, w, w * STICKER_RATIO); return true; }
      return logo(PW - ML - w, yy, w);
    }
    function cabeceraInterna() {
      marcaDer(26, 76);
      f("p", 7, C.gris);
      doc.text(mayus("Presupuesto estimado · " + d.ref), ML, 42, { charSpace: 0.7 });
      trazo(C.linea, 0.75);
      doc.line(ML, 58, PW - ML, 58);
      y = 80;
    }
    function nuevaPagina() { doc.addPage(); cabeceraInterna(); }
    function asegurar(h) { if (y + h > BOT) nuevaPagina(); }

    /* ===== Portada: marca, título y datos ===== */
    if (!marcaDer(TOP, 120)) { f("h", 20, C.azulV); doc.text("qfadesign", PW - ML, TOP + 18, { align: "right" }); }
    f("p", 8, C.azul);
    doc.text(mayus("Presupuesto estimado"), ML, TOP + 10, { charSpace: 1.2 });
    f("b", 8.5, C.gris);
    doc.text("N.º " + d.ref, ML, TOP + 24);
    trazo(C.linea, 0.75);
    doc.line(ML, TOP + 40, PW - ML, TOP + 40);

    /* título: la mitad rellena y la otra "hueca", como en el sitio */
    y = TOP + P.ty;
    var TS = P.ts, cs = -TS * 0.03;
    if (rec && rec.titulo) {
      var th = TS * 1.15, tw = th / TITULO_RATIO;           /* sticker del título (con su borde negro) */
      doc.addImage(rec.titulo, "PNG", ML - 3, y - TS * 1.0, tw, th);
    } else {
      f("h", TS, C.azul);
      doc.text("Presu", ML, y, { charSpace: cs });
      var w1 = doc.getTextWidth("Presu") + cs * 5;
      trazo(C.azul, 1.3);
      doc.text("puesto", ML + w1, y, { renderingMode: "stroke", charSpace: cs });
    }
    f("b", 11, C.gris);
    doc.text("Detalle de lo seleccionado y fundamentos de cada valor.", ML, y + P.sub);
    y += P.gapT;

    if (d.nombre) {
      f("p", 7, C.gris); doc.text(mayus("Preparado para"), ML, y + 7, { charSpace: 0.9 });
      f("h", nivel === 0 ? 16 : 14, C.navy); doc.text(d.nombre, ML, y + (nivel === 0 ? 26 : 22), { maxWidth: CW });
      y += P.np;
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
    y += P.strip;
    doc.line(ML, y, PW - ML, y);
    y += P.sd + 10;

    /* ===== Detalle y fundamentos ===== */
    f("h", P.hd, C.navy);
    doc.text("Detalle del presupuesto y por qué estos valores", ML, y + 4, { charSpace: -0.2 });
    y += P.hdy;

    var intro = "Cada valor parte de un precio base en pesos, definido por el alcance de cada servicio, que se ajusta por tipo de cliente y, si hace falta, por urgencia. Después se contrasta con referencias públicas de mercado (argentinas, en pesos, e internacionales, en dólares al MEP del día). Son datos para dimensionar el valor, no una tarifa oficial.";
    var segsIntro = [{ t: intro + " ", k: "b", c: C.gris }];
    var txtCli = R.clientes && R.clientes[d.cliente.id];
    if (txtCli) {
      segsIntro.push({ t: "Tipo de cliente · " + d.cliente.label + ": ", k: "h", c: C.navy });
      segsIntro.push({ t: txtCli, k: "b", c: C.gris });
    }
    y += rico(segsIntro, ML, y, CW, Math.min(8, P.jf + 0.4), Math.min(10.8, P.jl + 1), true) + 8;

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

    /* texto de justificación de cada fila (sin nombrar fuentes) */
    function segsServicio(l) {
      var segs = [{ t: (d.cliente.mult === 1 ? "Base " + ars(l.baseArs) + " (sin coeficiente). " : "Base " + ars(l.baseArs) + " × coeficiente " + coef(d.cliente.mult) + ". "), k: "b", c: C.gris }];
      var refs = R.servicios && R.servicios[l.id];
      if (refs && refs.length) {
        refs.forEach(function (r) {
          segs.push({ t: (r.c || r.l) + ": " + rangoCorto(r, mep) + ". ", k: "b", c: C.navy });
          segs.push({ t: posCorta(l.unitArs, r, mep) + " ", k: "h", c: C.azul });
        });
      } else {
        var ph = (R.porHora || []).map(function (r) { return rangoCorto(r, mep); });
        segs.push({ t: "Sin tarifa comparable relevada: el valor responde al alcance incluido y al tiempo de trabajo." + (ph.length ? " Referencia por hora: " + ph.join("; ") + "." : ""), k: "b", c: C.gris });
      }
      return segs;
    }
    function segsUrgente() {
      var pct = d.recargo * 100;
      var segs = [{ t: "Para entregas en menos de 5 días hábiles; se calcula sobre el subtotal. ", k: "b", c: C.gris }];
      (R.urgente || []).forEach(function (r) {
        segs.push({ t: (r.c || r.l) + ": entre " + r.min + " % y " + r.max + " %. ", k: "b", c: C.navy });
        segs.push({ t: (pct < r.min ? "Por debajo del rango." : pct > r.max ? "Por encima del rango." : "Dentro del rango.") + " ", k: "h", c: C.azul });
      });
      return segs;
    }

    function fila(nombre, cant, unidad, unit, total, segs) {
      f("h", P.nm, C.navy);
      var ln = doc.splitTextToSize(nombre, W[0] - 12);
      var topH = Math.max(ln.length * (P.nm + 2), P.nm + 9);
      var hj = rico(segs, ML, 0, CW, P.jf, P.jl, false);
      var h = P.rowPad + topH + 2 + hj + P.rowPad * 0.8 + 2;
      if (y + h > BOT) { nuevaPagina(); cabeceraTabla(); }
      var ty = y + P.rowPad + P.nm;
      f("h", P.nm, C.navy);
      ln.forEach(function (l, i) { doc.text(l, ML, ty + i * (P.nm + 2)); });
      var by = ty - 0.5;
      f("h", P.nm - 0.5, C.navy);
      doc.text(String(cant), XC, by, { align: "center" });
      if (unidad) { f("bi", 7, C.gris); doc.text(unidad, XC, by + 9, { align: "center" }); }
      if (unit != null) { f("b", 9.5, C.navy); doc.text(ars(unit), X1, by, { align: "right" }); }
      f("h", P.nm - 0.5, C.navy);
      doc.text(ars(total), X2, by, { align: "right" });
      f("b", 9, C.gris);
      doc.text(usd(total / mep), X3, by, { align: "right" });
      rico(segs, ML, y + P.rowPad + topH + 2, CW, P.jf, P.jl, true);
      y += h;
      trazo(C.linea, 0.6);
      doc.line(ML, y, PW - ML, y);
    }
    d.lineas.forEach(function (l) { fila(l.name, l.qty, l.unit, l.unitArs, l.totalArs, segsServicio(l)); });
    if (d.urgente) fila("Entrega urgente (+" + Math.round(d.recargo * 100) + " %)", "—", "", null, d.recargoArs, segsUrgente());

    /* ===== Total + alcance y condiciones, lado a lado ===== */
    y += P.tg;
    var BW = 244, BX = PW - ML - BW;
    var cond = "Valores de referencia en pesos argentinos; el equivalente en dólares se calcula con el dólar MEP" + (d.mep.vivo ? " del " : " de referencia al ") + fechaCorta(d.mep.fecha) + ". Se ajustan según el contexto económico y el presupuesto final se confirma según el alcance real del proyecto, los plazos y el tipo de vínculo con la marca. No incluye pauta publicitaria, producción externa (impresión, fotografía profesional, etc.), licencias de software, dominio ni hosting.";
    var hCond = rico([{ t: cond, k: "b", c: C.gris }], ML, 0, BX - ML - 22, P.cond, P.cond + 1.9, false);
    var BH = Math.max(P.bh, hCond + 16);
    asegurar(BH + (d.urgente ? 14 : 0) + 80);
    if (d.urgente) {
      f("b", 7.5, C.gris);
      doc.text("Subtotal " + ars(d.subtotal) + "  +  Urgencia " + ars(d.recargoArs), PW - ML, y + 8, { align: "right" });
      y += 14;
    }
    relleno(C.azul);
    doc.roundedRect(BX, y, BW, BH, 12, 12, "F");
    var cy = y + (BH - P.bh) / 2;
    f("p", 7.5, C.blanco); doc.text(mayus("Total estimado"), BX + 18, cy + 17, { charSpace: 1.2 });
    f("h", P.tf, C.blanco);
    var tTxt = ars(d.total);
    var ty2 = cy + 17 + P.tf + 6;
    doc.text(tTxt, BX + 18, ty2, { charSpace: -0.5 });
    var tw = doc.getTextWidth(tTxt) - 0.5 * tTxt.length;
    f("p", 8.5, C.blanco); doc.text("ARS", BX + 18 + tw + 6, ty2);
    f("h", 11, C.blanco); doc.text(usd(d.total / mep), BX + 18, ty2 + 16);
    f("p", 6.8, C.azul); doc.text(mayus("Alcance y condiciones"), ML, y + 9, { charSpace: 1 });
    rico([{ t: cond, k: "b", c: C.gris }], ML, y + 14, BX - ML - 22, P.cond, P.cond + 1.9, true);
    y += BH + P.cg;

    /* ===== Contacto ===== */
    asegurar(44);
    trazo(C.linea, 0.75);
    doc.line(ML, y, PW - ML, y);
    y += 22;
    f("h", 14, C.navy); doc.text("¿Charlamos tu proyecto?", ML, y, { charSpace: -0.2 });
    var sep = "  ·  ", ig = "@qfadesign";
    f("b", 9, C.azul);
    var wE = doc.getTextWidth(EMAIL), wI = doc.getTextWidth(ig), wS = doc.getTextWidth(sep);
    var xe = PW - ML - (wE + wS + wI);
    doc.textWithLink(EMAIL, xe, y, { url: "mailto:" + EMAIL });
    f("b", 9, C.gris); doc.text(sep, xe + wE, y);
    f("b", 9, C.azul); doc.textWithLink(ig, xe + wE + wS, y, { url: INSTAGRAM });

    /* pie de todas las páginas: la marca (logo) y el sitio */
    var total = doc.getNumberOfPages();
    for (var p = 1; p <= total; p++) {
      doc.setPage(p);
      trazo(C.linea, 0.75);
      doc.line(ML, PH - 44, PW - ML, PH - 44);
      logo(ML, PH - 38, 62);
      f("b", 7.5, C.gris);
      doc.text(total > 1 ? "Página " + p + " de " + total + "  ·  " + SITIO : SITIO, PW - ML, PH - 27, { align: "right" });
    }

    doc.setProperties({
      title: "Presupuesto estimado — qfadesign",
      subject: "Presupuesto estimado N.º " + d.ref,
      author: "qfadesign",
      creator: SITIO
    });
    return doc;
  }

  /* Prueba del nivel más amplio al más compacto hasta que entre en una hoja */
  function armar(jsPDF, d, rec) {
    for (var i = 0; i < NIVELES.length; i++) {
      var doc = construir(jsPDF, d, rec, i);
      if (doc.getNumberOfPages() === 1) return doc;
    }
    return construir(jsPDF, d, rec, 1);
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
      var doc = armar(root.jspdf.jsPDF, d, r[1]);
      doc.save(nombreArchivo(d));
    });
  }

  root.QFAPdf = { descargar: descargar, _construir: armar, _nombreArchivo: nombreArchivo };
})(typeof window !== "undefined" ? window : globalThis);
