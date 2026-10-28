/* qfadesign — Preparador de archivos para imprenta (Herramientas).
   Lista de verificación interactiva + análisis técnico opcional de un PDF.
   Todo ocurre en el navegador: el PDF no se sube a ningún servidor y no se modifica.
   Qué analiza (con pdf-lib y pdf.js): tamaño de página, TrimBox/BleedBox, resolución efectiva de las imágenes, espacios de color,
   colores directos, tipografías incrustadas, transparencias, capas y declaración PDF/X.
   Qué NO puede comprobar (y lo dice): si el diseño llega hasta el sangrado, márgenes de seguridad, negros, cobertura de tinta,
   líneas finas, tamaño mínimo del texto. Esos puntos quedan como «No pude comprobarlo» para que los revise la persona. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("ipDrop")) return;
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "") + "vendor/";
  var MM = 25.4 / 72, MAX_BYTES = 150 * 1024 * 1024, MAX_PAG_PPI = 150, PRESUPUESTO = 60 * 1024 * 1024;
  var FORMATOS = {
    a1: ["A1 (594 × 841 mm)", 594, 841], a2: ["A2 (420 × 594 mm)", 420, 594], a3: ["A3 (297 × 420 mm)", 297, 420], a4: ["A4 (210 × 297 mm)", 210, 297],
    a5: ["A5 (148 × 210 mm)", 148, 210], a6: ["A6 (105 × 148 mm)", 105, 148], carta: ["Carta (215,9 × 279,4 mm)", 215.9, 279.4], oficio: ["Oficio (215,9 × 355,6 mm)", 215.9, 355.6],
    postal: ["Postal (100 × 150 mm)", 100, 150], t90: ["Tarjeta (90 × 50 mm)", 90, 50], t85: ["Tarjeta (85 × 55 mm)", 85, 55], cuadrado: ["Cuadrado (210 × 210 mm)", 210, 210]
  };
  var archivo = null, an = null, hechos = {}, abiertos = {}, libs = null, token = 0;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(x) { return String(Math.round(x * 10) / 10).replace(".", ","); }
  function pesoTxt(b) { return b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  function plural(n, a, b) { return n + " " + (n === 1 ? a : b); }
  function pausa() { return new Promise(function (ok) { setTimeout(ok, 0); }); }
  function avisar(t) { $("ipEstado").textContent = ""; setTimeout(function () { $("ipEstado").textContent = t; }, 30); }
  function error(t) { var m = $("ipMsg"); m.hidden = !t; m.textContent = t || ""; }

  /* ---- Carga de librerías ---- */
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { no(new Error("No se pudo cargar " + src)); }; document.head.appendChild(s); }); }
  function cargarLibs() {
    if (!libs) {
      libs = script(BASE + "pdf.min.js").then(function () { return script(BASE + "pdf-lib.min.js"); }).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.js"; });
      libs.catch(function () { libs = null; });
    }
    return libs;
  }

  /* ---- Análisis con pdf-lib ---- */
  function analizarEstructura(buf) {
    var PL = window.PDFLib, N = PL.PDFName;
    return PL.PDFDocument.load(buf, { updateMetadata: false }).then(function (doc) {
      var ctx = doc.context, presupuesto = PRESUPUESTO;
      var acc = { paginas: [], fuentes: {}, imagenes: {}, spot: {}, vec: { rgb: 0, cmyk: 0, gray: 0 }, transp: false, capas: false, pdfx: null, intent: false, truncado: false };
      var vistos = {};
      function look(o) { return ctx.lookup(o); }
      function nombre(o) { o = look(o); return o instanceof PL.PDFName ? o.asString().slice(1) : null; }
      function numero(o) { o = look(o); return o && o.asNumber ? o.asNumber() : null; }
      function entradas(d) { d = look(d); return d instanceof PL.PDFDict ? d.entries() : []; }

      function espacio(o, dep) {
        o = look(o); if (!o || (dep || 0) > 4) return null;
        if (o instanceof PL.PDFName) { var n = o.asString().slice(1); return /RGB$/.test(n) ? "rgb" : /CMYK$/.test(n) ? "cmyk" : /Gray$/.test(n) ? "gray" : n === "Pattern" ? null : "otro"; }
        if (o instanceof PL.PDFArray && o.size() > 0) {
          var t = nombre(o.get(0));
          if (t === "ICCBased") { var s = look(o.get(1)), nn = s && s.dict ? numero(s.dict.get(N.of("N"))) : 0; return nn === 4 ? "cmyk" : nn === 3 ? "rgb" : nn === 1 ? "gray" : "otro"; }
          if (t === "CalRGB") return "rgb"; if (t === "CalGray") return "gray"; if (t === "Lab") return "otro";
          if (t === "Separation") { var nm = nombre(o.get(1)); if (nm && nm !== "All" && nm !== "None") acc.spot[nm] = 1; return "spot"; }
          if (t === "DeviceN") {
            var ns = look(o.get(1)); if (ns instanceof PL.PDFArray) for (var i = 0; i < ns.size(); i++) { var x = nombre(ns.get(i)); if (x && !/^(None|Cyan|Magenta|Yellow|Black)$/.test(x)) acc.spot[x] = 1; }
            return "spot";
          }
          if (t === "Indexed") return espacio(o.get(1), (dep || 0) + 1);
          if (t === "Pattern") return o.size() > 1 ? espacio(o.get(1), (dep || 0) + 1) : null;
        }
        return null;
      }
      function fuente(fd) {
        if (!(fd instanceof PL.PDFDict)) return;
        var tipo = nombre(fd.get(N.of("Subtype"))) || "?", base = nombre(fd.get(N.of("BaseFont"))) || "(sin nombre)", emb = false, desc = null;
        if (tipo === "Type3") emb = true;
        else {
          if (tipo === "Type0") { var da = look(fd.get(N.of("DescendantFonts"))); var d0 = da instanceof PL.PDFArray ? look(da.get(0)) : null; desc = d0 instanceof PL.PDFDict ? look(d0.get(N.of("FontDescriptor"))) : null; }
          else desc = look(fd.get(N.of("FontDescriptor")));
          if (desc instanceof PL.PDFDict) emb = desc.has(N.of("FontFile")) || desc.has(N.of("FontFile2")) || desc.has(N.of("FontFile3"));
        }
        var limpio = base.replace(/^[A-Z]{6}\+/, "");
        acc.fuentes[limpio + "|" + tipo] = { nombre: limpio, tipo: tipo, emb: emb };
      }
      function imagen(s, clave) {
        if (acc.imagenes[clave]) return;
        var d = s.dict, mask = look(d.get(N.of("ImageMask"))) === PL.PDFBool.True;
        var k = mask ? "mask" : (espacio(d.get(N.of("ColorSpace"))) || "otro");
        acc.imagenes[clave] = { w: numero(d.get(N.of("Width"))), h: numero(d.get(N.of("Height"))), k: k };
        if (d.get(N.of("SMask")) || d.get(N.of("Mask"))) acc.transp = true;
      }
      function contenido(s, res) {
        if (!(s instanceof PL.PDFRawStream)) return;
        if (presupuesto <= 0) { acc.truncado = true; return; }
        var u8; try { u8 = PL.decodePDFRawStream(s).decode(); } catch (e) { return; }
        presupuesto -= u8.length;
        var t = new TextDecoder("latin1").decode(u8);
        if (t.indexOf("BI") >= 0) t = t.replace(/\bBI\b[\s\S]*?\bEI\b/g, " ");
        t = t.replace(/\((?:\\[\s\S]|[^\\()])*\)/g, " ").replace(/<[0-9a-fA-F\s]*>/g, " ");
        var m;
        acc.vec.rgb += (t.match(/(?:^|\s)(?:rg|RG)(?=\s|$)/g) || []).length;
        acc.vec.cmyk += (t.match(/(?:^|\s)[kK](?=\s|$)/g) || []).length;
        acc.vec.gray += (t.match(/(?:^|\s)[gG](?=\s|$)/g) || []).length;
        var re = /\/([^\s\/\[\]()<>]+)\s+(?:cs|CS)(?=\s|$)/g, cso = res ? look(res.get(N.of("ColorSpace"))) : null;
        while ((m = re.exec(t))) { if (cso instanceof PL.PDFDict) { var k = espacio(cso.get(N.of(m[1]))); if (k === "rgb" || k === "cmyk" || k === "gray") acc.vec[k] += 1; } }
      }
      function recursos(res, dep) {
        if (!(res instanceof PL.PDFDict) || dep > 6) return;
        entradas(res.get(N.of("Font"))).forEach(function (e) { fuente(look(e[1])); });
        entradas(res.get(N.of("ColorSpace"))).forEach(function (e) { espacio(e[1]); });
        entradas(res.get(N.of("Shading"))).forEach(function (e) { var sh = look(e[1]), d = sh && (sh.dict || sh); var k = d && d.get ? espacio(d.get(N.of("ColorSpace"))) : null; if (k === "rgb" || k === "cmyk" || k === "gray") acc.vec[k] += 1; });
        entradas(res.get(N.of("ExtGState"))).forEach(function (e) {
          var g = look(e[1]); if (!(g instanceof PL.PDFDict)) return;
          var ca = numero(g.get(N.of("ca"))), CA = numero(g.get(N.of("CA"))), sm = g.get(N.of("SMask")), bm = nombre(g.get(N.of("BM")));
          if ((ca !== null && ca < 1) || (CA !== null && CA < 1) || (sm && nombre(sm) !== "None") || (bm && bm !== "Normal" && bm !== "Compatible")) acc.transp = true;
        });
        entradas(res.get(N.of("XObject"))).forEach(function (e) {
          var ref = e[1], clave = ref instanceof PL.PDFRef ? ref.toString() : null, s = look(ref);
          if (!(s instanceof PL.PDFRawStream)) return;
          var st = nombre(s.dict.get(N.of("Subtype")));
          if (st === "Image") imagen(s, clave || ("i" + Object.keys(acc.imagenes).length));
          else if (st === "Form" && !(clave && vistos[clave])) {
            if (clave) vistos[clave] = 1;
            var fr = look(s.dict.get(N.of("Resources"))); recursos(fr instanceof PL.PDFDict ? fr : res, dep + 1); contenido(s, fr instanceof PL.PDFDict ? fr : res);
            var gr = look(s.dict.get(N.of("Group"))); if (gr instanceof PL.PDFDict && nombre(gr.get(N.of("S"))) === "Transparency" && look(gr.get(N.of("K"))) === PL.PDFBool.True) acc.transp = true;
          }
        });
      }
      function caja(pg, nombreCaja, getter) {
        if (!pg.node.has(N.of(nombreCaja))) return null;
        try { var b = pg[getter](); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) { return null; }
      }

      var pgs = doc.getPages();
      pgs.forEach(function (pg) {
        var m = pg.getMediaBox(), rot = ((pg.getRotation().angle % 360) + 360) % 360;
        acc.paginas.push({ media: { x: m.x, y: m.y, w: m.width, h: m.height }, trim: caja(pg, "TrimBox", "getTrimBox"), bleed: caja(pg, "BleedBox", "getBleedBox"), rot: rot });
        try { recursos(pg.node.Resources(), 0); } catch (e) { /* página con recursos raros: sigo */ }
        var cn = look(pg.node.get(N.of("Contents")));
        var res = pg.node.Resources();
        if (cn instanceof PL.PDFArray) for (var i = 0; i < cn.size(); i++) contenido(look(cn.get(i)), res); else contenido(cn, res);
      });
      var cat = doc.catalog;
      acc.capas = cat.has(N.of("OCProperties"));
      acc.intent = cat.has(N.of("OutputIntents"));
      try {
        var info = look(ctx.trailerInfo.Info);
        if (info instanceof PL.PDFDict) { var v = look(info.get(N.of("GTS_PDFXVersion"))); if (v && v.decodeText) acc.pdfx = v.decodeText(); }
        var md = look(cat.get(N.of("Metadata")));
        if (!acc.pdfx && md instanceof PL.PDFRawStream) { var x = new TextDecoder("utf-8").decode(PL.decodePDFRawStream(md).decode()), mm = /GTS_PDFXVersion[^>]*>([^<]+)</.exec(x) || /pdfxid:GTS_PDFXVersion="([^"]+)"/.exec(x); if (mm) acc.pdfx = mm[1].trim(); }
      } catch (e) { /* sin metadatos legibles */ }
      return acc;
    });
  }

  /* ---- Resolución efectiva con pdf.js (matriz de cada imagen colocada) ---- */
  function analizarPpi(buf, prog) {
    return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then(function (pdf) {
      var OPS = window.pdfjsLib.OPS, total = Math.min(pdf.numPages, MAX_PAG_PPI), res = { imgs: [], paginas: pdf.numPages, revisadas: total, thumb: null };
      function mul(m, n) { return [n[0] * m[0] + n[1] * m[2], n[0] * m[1] + n[1] * m[3], n[2] * m[0] + n[3] * m[2], n[2] * m[1] + n[3] * m[3], n[4] * m[0] + n[5] * m[2] + m[4], n[4] * m[1] + n[5] * m[3] + m[5]]; }
      var seq = Promise.resolve();
      for (var p = 1; p <= total; p++) (function (p) {
        seq = seq.then(function () {
          prog("Midiendo imágenes: página " + p + " de " + total + (pdf.numPages > total ? " (reviso las primeras " + total + ")" : "") + "…");
          return pdf.getPage(p).then(function (pg) {
            return pg.getOperatorList().then(function (ol) {
              var ctm = [1, 0, 0, 1, 0, 0], pila = [];
              for (var i = 0; i < ol.fnArray.length; i++) {
                var f = ol.fnArray[i], a = ol.argsArray[i];
                if (f === OPS.save) pila.push(ctm.slice());
                else if (f === OPS.restore) { if (pila.length) ctm = pila.pop(); }
                else if (f === OPS.transform) ctm = mul(a, ctm);
                else if (f === OPS.paintFormXObjectBegin) { pila.push(ctm.slice()); if (a && a[0]) ctm = mul(a[0], ctm); }
                else if (f === OPS.paintFormXObjectEnd) { if (pila.length) ctm = pila.pop(); }
                else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject) {
                  var w = f === OPS.paintImageXObject ? a[1] : a[0] && a[0].width, h = f === OPS.paintImageXObject ? a[2] : a[0] && a[0].height;
                  var wpt = Math.hypot(ctm[0], ctm[1]), hpt = Math.hypot(ctm[2], ctm[3]);
                  if (w && h && wpt > 2 && hpt > 2) res.imgs.push({ p: p, ppi: Math.min(w / (wpt / 72), h / (hpt / 72)), w: w, h: h, wMm: wpt * MM, hMm: hpt * MM });
                }
              }
              pg.cleanup();
            });
          }).then(pausa);
        });
      })(p);
      return seq.then(function () { pdf.destroy(); return res; });
    });
  }

  /* ---- Evaluación: convierte el análisis + lo que eligió la persona en la lista ---- */
  function cfg() {
    var f = $("ipFormato").value, d = FORMATOS[f] || ["", +$("ipW").value || 0, +$("ipH").value || 0];
    return { w: d[1], h: d[2], nombre: f === "custom" ? num(d[1]) + " × " + num(d[2]) + " mm" : d[0], sang: Math.max(0, parseFloat(($("ipSang").value || "0").replace(",", "."))) || 0, ppp: +$("ipPpp").querySelector('[aria-pressed="true"]').getAttribute("data-r"), color: $("ipColor").querySelector('[aria-pressed="true"]').getAttribute("data-c") };
  }
  function parecido(a, b, tol) { return (Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol) || (Math.abs(a[0] - b[1]) <= tol && Math.abs(a[1] - b[0]) <= tol); }
  function dimsMm(c, rot) { var w = c.w * MM, h = c.h * MM; return rot === 90 || rot === 270 ? [h, w] : [w, h]; }

  function medirPagina(pg, c) {
    var media = dimsMm(pg.media, pg.rot), target = [c.w, c.h], r = { tam: null, sang: null, marcas: false, medida: media };
    if (pg.trim) {
      var trim = dimsMm(pg.trim, pg.rot); r.medida = trim;
      r.tam = parecido(trim, target, 0.6) ? "ok" : "bad";
      var lim = pg.bleed || pg.media, m = [pg.trim.x - lim.x, pg.trim.y - lim.y, (lim.x + lim.w) - (pg.trim.x + pg.trim.w), (lim.y + lim.h) - (pg.trim.y + pg.trim.h)].map(function (x) { return x * MM; });
      r.sang = Math.min.apply(null, m); r.origen = pg.bleed ? "BleedBox" : "MediaBox";
      if (!pg.bleed) { var mm = Math.min.apply(null, m); r.marcas = mm >= c.sang + 4; }
    } else if (parecido(media, target, 0.6)) { r.tam = "ok"; r.sang = 0; r.origen = "sin"; }
    else if (parecido(media, [c.w + 2 * c.sang, c.h + 2 * c.sang], 0.8)) { r.tam = "ok"; r.sang = c.sang; r.origen = "inferido"; }
    else {
      var dw = (media[0] - target[0]) / 2, dh = (media[1] - target[1]) / 2, dw2 = (media[1] - target[0]) / 2, dh2 = (media[0] - target[1]) / 2;
      var okA = dw > 0.4 && dw < 12 && Math.abs(dw - dh) < 0.8, okB = dw2 > 0.4 && dw2 < 12 && Math.abs(dw2 - dh2) < 0.8;
      if (okA || okB) { r.tam = "ok"; r.sang = okA ? (dw + dh) / 2 : (dw2 + dh2) / 2; r.origen = "inferido"; } else { r.tam = "bad"; }
    }
    return r;
  }

  function armar() {
    var c = cfg(), A = an, G = [], man = "";
    function grupo(t) { var g = { t: t, items: [] }; G.push(g); return g; }
    function it(g, id, t, e, d) { g.items.push({ id: id, t: t, e: e, d: d }); }
    var sin = "Subí tu PDF y tocá «Analizar mi PDF» para que trate de comprobarlo. Mientras tanto, revisalo vos.";

    /* Tamaño */
    var g1 = grupo("Tamaño");
    if (!A) it(g1, "tam", "El tamaño coincide con el formato final (" + c.nombre + ")", "man", sin);
    else {
      var med = A.paginas.map(function (p) { return medirPagina(p, c); }), p0 = med[0];
      var malos = med.filter(function (m) { return m.tam === "bad"; }).length;
      if (!malos) it(g1, "tam", "El tamaño coincide con el formato final (" + c.nombre + ")", "ok", p0.origen === "inferido" ? "El PDF mide " + num(A.paginas[0].media.w * MM) + " × " + num(A.paginas[0].media.h * MM) + " mm: formato final más sangrado." : "Medida del corte: " + num(p0.medida[0]) + " × " + num(p0.medida[1]) + " mm.");
      else it(g1, "tam", "El tamaño coincide con el formato final (" + c.nombre + ")", "bad", plural(malos, "página no coincide", "páginas no coinciden") + ". La primera mide " + num(p0.medida[0]) + " × " + num(p0.medida[1]) + " mm" + (c.sang ? " y se esperaba " + num(c.w) + " × " + num(c.h) + " mm, o " + num(c.w + 2 * c.sang) + " × " + num(c.h + 2 * c.sang) + " mm si ya incluye sangrado." : " y se esperaba " + num(c.w) + " × " + num(c.h) + " mm.") + " Si el formato es otro, cambialo arriba.");
      var distintos = med.some(function (m) { return Math.abs(m.medida[0] - p0.medida[0]) > 0.6 || Math.abs(m.medida[1] - p0.medida[1]) > 0.6; });
      it(g1, "mismo", "Todas las páginas tienen el mismo tamaño", distintos ? "warn" : "ok", distintos ? "Hay páginas de distinto tamaño. Revisá cuáles y si es a propósito." : plural(A.paginas.length, "página", "páginas") + " del mismo tamaño.");
    }
    it(g1, "cuad", "Si es un cuadernillo o revista, la cantidad de páginas es múltiplo de 4", "man", man + "depende de cómo se va a encuadernar. " + (A ? "Tu PDF tiene " + plural(A.paginas.length, "página", "páginas") + "." : ""));

    /* Sangrado */
    var g2 = grupo("Sangrado y márgenes");
    if (!A) it(g2, "sang", "Tiene el sangrado que pide la imprenta (" + num(c.sang) + " mm)", "man", sin);
    else {
      var s0 = med[0], faltan = med.filter(function (m) { return m.sang === null || m.sang < c.sang - 0.4; }).length;
      if (c.sang === 0) it(g2, "sang", "Sangrado", "info", "Pediste 0 mm de sangrado: tu imprenta no lo necesita.");
      else if (s0.sang === null || malos === med.length) it(g2, "sang", "Tiene el sangrado que pide la imprenta (" + num(c.sang) + " mm)", "man", man + "el tamaño no coincide, así que no sé cuánto sangrado tiene.");
      else if (!faltan) it(g2, "sang", "Tiene el sangrado que pide la imprenta (" + num(c.sang) + " mm)", "ok", s0.origen === "inferido" ? "El PDF es " + num(s0.sang) + " mm más grande que el corte por lado (lo deduje del tamaño de página)." : "Margen de sangrado medido: " + num(s0.sang) + " mm por lado (" + s0.origen + ").");
      else it(g2, "sang", "Tiene el sangrado que pide la imprenta (" + num(c.sang) + " mm)", "bad", (s0.sang <= 0.4 ? "No encontré sangrado: la página mide justo el formato final." : "Medí " + num(s0.sang) + " mm por lado y faltan hasta " + num(c.sang) + " mm.") + " Exportá con " + num(c.sang) + " mm de sangrado.");
    }
    it(g2, "borde", "El fondo y las imágenes llegan hasta el borde del sangrado", "man", man + "no puedo ver el diseño. Abrí el PDF y fijate que no queden filos blancos ni que la imagen termine antes del borde.");
    it(g2, "margen", "Los textos y logos importantes están al menos 3 a 5 mm adentro del corte", "man", man + "se revisa mirando el diseño.");
    if (A && med[0].marcas) it(g2, "marcas", "Marcas de corte", "info", "La página tiene espacio de sobra alrededor del corte: parece incluir marcas de corte. Confirmá con tu imprenta si las quiere.");
    else it(g2, "marcas", "Marcas de corte (si la imprenta las pide)", "man", man + "no detecto marcas dibujadas. Preguntale a tu imprenta si las necesita: muchas prefieren el sangrado sin marcas.");

    /* Resolución */
    var g3 = grupo("Resolución de imágenes");
    if (!A) it(g3, "ppp", "Las imágenes tienen al menos " + c.ppp + " ppp al tamaño en que se imprimen", "man", sin);
    else if (!A.ppi) it(g3, "ppp", "Las imágenes tienen al menos " + c.ppp + " ppp al tamaño en que se imprimen", "man", man + "no pude medir las imágenes de este PDF.");
    else if (!A.ppi.imgs.length) it(g3, "ppp", "Las imágenes tienen al menos " + c.ppp + " ppp al tamaño en que se imprimen", "info", "No encontré imágenes de mapa de bits: el contenido parece ser vectorial (no pierde calidad al agrandarse).");
    else {
      var mn = Math.min.apply(null, A.ppi.imgs.map(function (x) { return x.ppi; })), bajas = A.ppi.imgs.filter(function (x) { return x.ppi < c.ppp - 1; });
      var graves = A.ppi.imgs.filter(function (x) { return x.ppi < c.ppp * 0.67; }), cola = A.ppi.revisadas < A.ppi.paginas ? " Solo revisé las primeras " + A.ppi.revisadas + " páginas." : "";
      if (!bajas.length) it(g3, "ppp", "Las imágenes tienen al menos " + c.ppp + " ppp al tamaño en que se imprimen", "ok", plural(A.ppi.imgs.length, "imagen colocada", "imágenes colocadas") + "; la de menor resolución tiene " + Math.round(mn) + " ppp." + cola);
      else {
        var peores = bajas.slice().sort(function (a, b) { return a.ppi - b.ppi; }).slice(0, 4).map(function (x) { return "pág. " + x.p + ": " + Math.round(x.ppi) + " ppp (" + x.w + "×" + x.h + " px a " + num(x.wMm / 10) + " × " + num(x.hMm / 10) + " cm)"; });
        it(g3, "ppp", "Las imágenes tienen al menos " + c.ppp + " ppp al tamaño en que se imprimen", graves.length ? "bad" : "warn", plural(bajas.length, "imagen", "imágenes") + " por debajo de " + c.ppp + " ppp. Las más bajas: " + peores.join("; ") + "." + cola + " Usá imágenes más grandes o achicalas en el diseño.");
      }
    }
    it(g3, "lineas", "Las líneas finas no bajan de 0,25 pt y el texto claro sobre fondo oscuro no es muy fino", "man", man + "se ve en el diseño.");

    /* Color */
    var g4 = grupo("Modo de color");
    var reqCmyk = c.color === "cmyk";
    if (!A) it(g4, "modo", reqCmyk ? "Todo el archivo está en CMYK" : "El modo de color es el que pide la imprenta", "man", sin);
    else {
      var im = { rgb: 0, cmyk: 0, gray: 0 }; Object.keys(A.est.imagenes).forEach(function (k) { var x = A.est.imagenes[k].k; if (im[x] !== undefined) im[x]++; });
      var v = A.est.vec, hayRgb = im.rgb > 0 || v.rgb > 0, hayCmyk = im.cmyk > 0 || v.cmyk > 0 || im.gray > 0 || v.gray > 0;
      var det = (hayRgb ? "RGB: " + [im.rgb ? plural(im.rgb, "imagen", "imágenes") : "", v.rgb ? "colores de vectores/texto" : ""].filter(Boolean).join(" y ") + ". " : "") + (hayCmyk ? "CMYK o gris: " + [(im.cmyk + im.gray) ? plural(im.cmyk + im.gray, "imagen", "imágenes") : "", (v.cmyk + v.gray) ? "colores de vectores/texto" : ""].filter(Boolean).join(" y ") + "." : "");
      var cola2 = A.est.truncado ? " (PDF muy pesado: no revisé todo el contenido)" : "";
      if (reqCmyk) it(g4, "modo", "Todo el archivo está en CMYK", hayRgb ? "bad" : hayCmyk ? "ok" : "man", hayRgb ? "Encontré elementos en RGB. " + det + " Convertí todo a CMYK antes de exportar (o pedile a tu imprenta que lo convierta, sabiendo que los colores pueden cambiar)." + cola2 : hayCmyk ? "No encontré elementos RGB. " + det + cola2 : man + "no encontré colores declarados.");
      else it(g4, "modo", "El modo de color es el que pide la imprenta", hayRgb || hayCmyk ? "info" : "man", (det || "No encontré colores declarados.") + " Elegiste que RGB es aceptable: confirmalo con tu imprenta.");
    }
    if (A && Object.keys(A.est.spot).length) it(g4, "spot", "Colores directos (Pantone u otros)", "info", "Hay " + plural(Object.keys(A.est.spot).length, "color directo", "colores directos") + ": " + Object.keys(A.est.spot).slice(0, 6).join(", ") + ". Si la imprenta no los va a usar, convertilos a CMYK.");
    else if (A) it(g4, "spot", "Colores directos (Pantone u otros)", "info", "No encontré colores directos declarados.");
    it(g4, "negro", "El texto chico y negro está en 100% K, sin mezcla de las 4 tintas", "man", man + "habría que mirar cada color en el programa de diseño.");
    it(g4, "tinta", "La cobertura total de tinta no supera lo que indica la imprenta (suele ser 300%)", "man", man + "se mide en el programa de diseño con la vista previa de separaciones.");

    /* Tipografías */
    var g5 = grupo("Tipografías");
    if (!A) it(g5, "fuentes", "Todas las tipografías están incrustadas o convertidas a curvas", "man", sin);
    else {
      var fs = Object.keys(A.est.fuentes).map(function (k) { return A.est.fuentes[k]; }), no = fs.filter(function (f) { return !f.emb; });
      if (!fs.length) it(g5, "fuentes", "Todas las tipografías están incrustadas o convertidas a curvas", "info", "No encontré tipografías: el texto parece estar convertido a curvas o el PDF no tiene texto. Eso evita problemas de fuentes, pero ese texto ya no se puede editar.");
      else if (!no.length) it(g5, "fuentes", "Todas las tipografías están incrustadas o convertidas a curvas", "ok", plural(fs.length, "tipografía incrustada", "tipografías incrustadas") + ": " + fs.slice(0, 8).map(function (f) { return f.nombre; }).join(", ") + (fs.length > 8 ? "…" : "") + ".");
      else it(g5, "fuentes", "Todas las tipografías están incrustadas o convertidas a curvas", "bad", plural(no.length, "tipografía NO está incrustada", "tipografías NO están incrustadas") + ": " + no.slice(0, 8).map(function (f) { return f.nombre; }).join(", ") + ". Al imprimir se reemplazarían por otra. Exportá incrustando fuentes o convertí el texto a curvas.");
    }
    it(g5, "pt", "El texto no es más chico que 6 pt (y 8 pt si es en negativo)", "man", man + "no mido el tamaño del texto.");

    /* Otros */
    var g6 = grupo("Transparencias y otros");
    if (A) {
      it(g6, "transp", "Transparencias", "info", A.est.transp ? "El archivo usa transparencias (sombras, opacidades o PNG con alfa). Si la imprenta pide PDF/X-1a, hay que aplanarlas al exportar." : "No encontré transparencias.");
      it(g6, "capas", "Capas", "info", A.est.capas ? "El PDF tiene capas. Si alguna capa no debe imprimirse, verificá que esté oculta." : "No tiene capas.");
      it(g6, "pdfx", "Norma PDF/X", "info", A.est.pdfx ? "Declara " + A.est.pdfx + "." : A.est.intent ? "Tiene perfil de salida (OutputIntent), pero no declara una versión PDF/X." : "No declara PDF/X. Muchas imprentas lo piden: preguntá qué prefieren.");
    }
    it(g6, "calidad", "Exportaste con la calidad más alta de impresión (no con «tamaño mínimo»)", "man", man + "el PDF no dice con qué ajustes se exportó.");
    it(g6, "final", "Abrí el PDF final y lo miré página por página", "man", man + "es un paso que solo podés hacer vos. Revisá textos, imágenes y bordes antes de enviarlo.");
    return G;
  }

  /* ---- Pantalla ---- */
  var ETQ = { ok: ["✓", "Verificado"], warn: ["!", "Revisá"], bad: ["✕", "Corregir"], man: ["?", "No pude comprobarlo"], info: ["i", "Dato"] };
  function pintar() {
    var G = armar(), tot = 0, hechoN = 0, nOk = 0, nMalo = 0, nMan = 0;
    var html = G.map(function (g) {
      var pend = g.items.filter(function (i) { return i.e !== "info" && i.e !== "ok" && !hechos[i.id]; }).length, urg = g.items.some(function (i) { return (i.e === "bad" || i.e === "warn") && !hechos[i.id]; });
      var abre = abiertos[g.t] === undefined ? urg : abiertos[g.t];
      return '<details class="dsp ip-g" data-g="' + esc(g.t) + '"' + (abre ? " open" : "") + '><summary><span class="dsp-t">' + esc(g.t) + '</span><span class="ip-cnt' + (pend ? "" : " ip-cnt-ok") + '">' + (pend ? plural(pend, "pendiente", "pendientes") : "Todo listo") + '</span></summary><ul class="ip-l">' + g.items.map(function (i) {
        var cuenta = i.e !== "info", marcado = !!hechos[i.id] || i.e === "ok";
        if (cuenta) { tot++; if (marcado) hechoN++; }
        if (i.e === "ok") nOk++; else if (i.e === "bad" || i.e === "warn") nMalo++; else if (i.e === "man") nMan++;
        var chk = (cuenta && i.e !== "ok") ? '<label class="ip-chk"><input type="checkbox" data-id="' + i.id + '"' + (hechos[i.id] ? " checked" : "") + '> ' + (i.e === "man" ? "Lo revisé" : "Ya lo resolví") + "</label>" : "";
        return '<li class="ip-it ip-' + i.e + (marcado && i.e !== "ok" ? " ip-hecho" : "") + '"><span class="ip-ic" aria-hidden="true">' + ETQ[i.e][0] + '</span><div class="ip-tx"><p class="ip-t">' + esc(i.t) + ' <span class="ip-st">' + ETQ[i.e][1] + '</span></p><p class="ip-d">' + esc(i.e === "man" ? i.d.charAt(0).toUpperCase() + i.d.slice(1) : i.d) + "</p>" + chk + "</div></li>";
      }).join("") + "</ul></details>";
    }).join("");
    $("ipLista").innerHTML = html;
    $("ipProg").style.width = tot ? Math.round(hechoN / tot * 100) + "%" : "0%";
    $("ipProgTxt").textContent = "Listos " + hechoN + " de " + tot + (hechoN === tot && tot ? ". ¡Todo revisado!" : "");
    $("ipBar").setAttribute("aria-valuenow", tot ? Math.round(hechoN / tot * 100) : 0);
    $("ipResumen").textContent = an ? nOk + " verificados automáticamente · " + nMalo + " para corregir · " + nMan + " que tenés que revisar vos." : "Todavía no analicé ningún PDF: todos los puntos quedan para revisar a mano. Si subís tu PDF, comprobamos los técnicos.";
    S_G = G;
  }
  var S_G = [];
  function textoInforme() {
    var c = cfg(), l = ["Checklist de imprenta — qfadesign", "Formato final: " + c.nombre + " · Sangrado: " + num(c.sang) + " mm · Resolución mínima: " + c.ppp + " ppp · Color: " + (c.color === "cmyk" ? "CMYK" : "RGB aceptable"), archivo ? "Archivo: " + archivo.name + " (" + pesoTxt(archivo.size) + ")" : "Sin PDF analizado (todo a mano)", ""];
    S_G.forEach(function (g) { l.push(g.t.toUpperCase()); g.items.forEach(function (i) { var m = i.e === "ok" ? "[OK]" : hechos[i.id] ? "[HECHO]" : { bad: "[CORREGIR]", warn: "[REVISAR]", man: "[REVISAR A MANO]", info: "[DATO]" }[i.e]; l.push(m + " " + i.t + " — " + i.d); }); l.push(""); });
    l.push("Los puntos «No pude comprobarlo» no se pueden medir desde el PDF: revisalos a mano o con tu imprenta.");
    return l.join("\n");
  }

  /* ---- Archivo ---- */
  function pintarArchivo() {
    var h = !!archivo;
    $("ipArchivo").hidden = !h; $("ipDrop").hidden = h;
    if (h) $("ipNom").textContent = archivo.name + " · " + pesoTxt(archivo.size) + (an ? " · analizado" : "");
    $("ipAnalizar").hidden = !h || !!an;
    $("ipSolo").hidden = h || !$("ipPaso3").hidden;
    $("ipPdf").disabled = !h;
  }
  function mostrarLista() { $("ipPaso3").hidden = false; pintarArchivo(); }
  function cargarArchivo(f) {
    error(""); an = null;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { error(f.name + " no es un PDF."); return; }
    if (f.size > MAX_BYTES) { error("El PDF pesa más de 150 MB. Probá con una versión más liviana."); return; }
    f.arrayBuffer().then(function (b) { archivo = f; archivo.buf = new Uint8Array(b); pintarArchivo(); pintar(); avisar("PDF cargado. Tocá «Analizar mi PDF» cuando quieras."); });
  }
  function analizar() {
    if (!archivo) return; var mia = ++token; error("");
    $("ipAnalizar").disabled = true; $("ipProgreso").hidden = false;
    var prog = function (t) { $("ipProgTxtA").textContent = t; };
    prog("Leyendo el PDF…");
    cargarLibs().then(function () { return analizarEstructura(archivo.buf); }).then(function (est) {
      if (mia !== token) return;
      return analizarPpi(archivo.buf, prog).then(function (ppi) { if (mia !== token) return; an = { paginas: est.paginas, est: est, ppi: ppi }; }, function () { an = { paginas: est.paginas, est: est, ppi: null }; });
    }).then(function () {
      if (mia !== token) return;
      $("ipProgreso").hidden = true; $("ipAnalizar").disabled = false; mostrarLista(); pintar(); avisar("Análisis listo. Revisá la lista.");
      $("ipResumen").scrollIntoView && $("ipResumen").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, function (e) {
      if (mia !== token) return;
      $("ipProgreso").hidden = true; $("ipAnalizar").disabled = false; an = null;
      error(/encrypt/i.test(String(e && e.message)) ? "Este PDF tiene contraseña o permisos restringidos. Sacale la protección y volvé a subirlo." : "No pude analizar este PDF. Revisá que no esté dañado; igual podés usar la lista a mano.");
      mostrarLista(); pintar();
    });
  }

  var drop = $("ipDrop"), file = $("ipFile");
  file.addEventListener("change", function () { if (file.files[0]) cargarArchivo(file.files[0]); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { var f = ev.dataTransfer && ev.dataTransfer.files[0]; if (f) cargarArchivo(f); });
  $("ipAnalizar").addEventListener("click", analizar);
  $("ipSoloLista").addEventListener("click", function () { mostrarLista(); pintar(); $("ipPaso3").scrollIntoView && $("ipPaso3").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("ipQuitar").addEventListener("click", function () { token++; archivo = null; an = null; $("ipProgreso").hidden = true; $("ipAnalizar").disabled = false; error(""); pintarArchivo(); pintar(); file.focus(); });
  $("ipLista").addEventListener("toggle", function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute("data-g")) abiertos[d.getAttribute("data-g")] = d.open; }, true);
  $("ipLista").addEventListener("change", function (e) { var c = e.target.closest("input[data-id]"); if (!c) return; hechos[c.getAttribute("data-id")] = c.checked; pintar(); var n = $("ipLista").querySelector('input[data-id="' + c.getAttribute("data-id") + '"]'); if (n) n.focus(); });
  function chips(id) { var g = $(id); g.addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; Array.prototype.forEach.call(g.querySelectorAll(".chip"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); pintar(); }); }
  chips("ipPpp"); chips("ipColor");
  $("ipFormato").addEventListener("change", function () { $("ipCustom").hidden = this.value !== "custom"; pintar(); });
  ["ipW", "ipH", "ipSang"].forEach(function (id) { $(id).addEventListener("input", pintar); });
  $("ipCopiar").addEventListener("click", function () {
    var t = textoInforme(), ok = function () { avisar("Resumen copiado."); $("ipCopiado").textContent = "Copiado ✓"; setTimeout(function () { $("ipCopiado").textContent = ""; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { $("ipCopiado").textContent = "No pude copiar: usá «Descargar»."; });
    else $("ipCopiado").textContent = "Tu navegador no deja copiar: usá «Descargar».";
  });
  $("ipDescargar").addEventListener("click", function () {
    var u = URL.createObjectURL(new Blob([textoInforme()], { type: "text/plain;charset=utf-8" })), a = document.createElement("a"); a.href = u; a.download = "checklist-imprenta.txt";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  });

  /* ---- PDF corregido para la imprenta ----
     Toma el PDF que subió la persona y arma una copia lista para entregar:
     · si falta sangrado, agranda la página y lo genera espejando los bordes del diseño;
     · si el tamaño es el del formato pero en otra escala (misma proporción), lo ajusta al formato elegido;
     · si ya tiene el sangrado, lo deja como está y solo marca las cajas de corte (TrimBox) y de sangrado (BleedBox).
     No puede cambiar el modo de color, incrustar tipografías ni subir la resolución de las imágenes: eso lo dice en pantalla. */
  function infoPagina(pg) {
    var N = window.PDFLib.PDFName, m = pg.getMediaBox();
    function cj(nom, get) { if (!pg.node.has(N.of(nom))) return null; try { var x = pg[get](); return { x: x.x, y: x.y, w: x.width, h: x.height }; } catch (e) { return null; } }
    return { media: { x: m.x, y: m.y, w: m.width, h: m.height }, trim: cj("TrimBox", "getTrimBox"), bleed: cj("BleedBox", "getBleedBox"), rot: ((pg.getRotation().angle % 360) + 360) % 360 };
  }
  function armarCorregido(buf, c) {
    var PL = window.PDFLib, PT = 72 / 25.4, b = c.sang * PT;
    var rep = { agregado: 0, escalado: 0, cajas: 0, igual: 0, rotadas: 0, proporcion: 0 };
    return PL.PDFDocument.load(buf, { updateMetadata: false }).then(function (src) {
      return PL.PDFDocument.create().then(function (out) {
        var pgs = src.getPages(), seq = Promise.resolve();
        function copiar(i) { return out.copyPages(src, [i]).then(function (r) { return out.addPage(r[0]); }); }
        pgs.forEach(function (pg, i) {
          seq = seq.then(function () {
            var info = infoPagina(pg), r = medirPagina(info, c);
            if (info.rot) { rep.rotadas++; return copiar(i); }
            var yaTiene = r.tam === "ok" && (c.sang === 0 || (r.sang !== null && r.sang >= c.sang - 0.4));
            if (yaTiene) {
              return copiar(i).then(function (np) {
                var m = info.media, inset = (r.sang || 0) * PT, marcado = false;
                if (!info.trim && inset > 0.1) { np.setTrimBox(m.x + inset, m.y + inset, m.w - 2 * inset, m.h - 2 * inset); marcado = true; }
                if (!info.bleed && inset > 0.1) { np.setBleedBox(m.x, m.y, m.w, m.h); marcado = true; }
                if (marcado) rep.cajas++; else rep.igual++;
              });
            }
            /* región que es el formato final dentro de la página de origen */
            var m = info.media, reg;
            if (info.trim) reg = info.trim;
            else if (r.origen === "inferido" && r.sang > 0) { var ins = r.sang * PT; reg = { x: m.x + ins, y: m.y + ins, w: m.w - 2 * ins, h: m.h - 2 * ins }; }
            else reg = m;
            var esc = 1, tW = c.w, tH = c.h;
            if (r.tam === "bad") {
              if ((reg.w > reg.h) !== (tW > tH)) { var t = tW; tW = tH; tH = t; }
              var asp = reg.w / reg.h, aspT = tW / tH;
              if (Math.abs(asp - aspT) / aspT < 0.02) { esc = (tW * PT) / reg.w; rep.escalado++; } else rep.proporcion++;
            }
            var tw = reg.w * esc, th = reg.h * esc, W = tw + 2 * b, H = th + 2 * b;
            return out.embedPage(pg, { left: reg.x, bottom: reg.y, right: reg.x + reg.w, top: reg.y + reg.h }).then(function (emb) {
              var np = out.addPage([W, H]);
              np.pushOperators(PL.pushGraphicsState(), PL.rectangle(0, 0, W, H), PL.clip(), PL.endPath());
              [-1, 0, 1].forEach(function (mx) {
                [-1, 0, 1].forEach(function (my) {
                  if ((mx || my) && b <= 0) return;
                  np.drawPage(emb, { x: mx === 0 ? b : (mx < 0 ? b : b + 2 * tw), y: my === 0 ? b : (my < 0 ? b : b + 2 * th), xScale: mx === 0 ? esc : -esc, yScale: my === 0 ? esc : -esc });
                });
              });
              np.pushOperators(PL.popGraphicsState());
              np.setTrimBox(b, b, tw, th); np.setBleedBox(0, 0, W, H);
              if (b > 0 && r.tam !== "bad") rep.agregado++; else if (b > 0) rep.agregado++;
            });
          });
        });
        return seq.then(function () { out.setProducer("qfadesign · preparador para imprenta"); return out.save(); }).then(function (bytes) { return { bytes: bytes, rep: rep }; });
      });
    });
  }
  function resumenCorreccion(rep, c) {
    var ok = [], pend = [], nota = "";
    if (rep.agregado) ok.push("agregué " + num(c.sang) + " mm de sangrado a " + plural(rep.agregado, "página", "páginas") + " (espejando los bordes del diseño)");
    if (rep.escalado) ok.push("ajusté al formato " + c.nombre + " " + plural(rep.escalado, "página", "páginas"));
    if (rep.cajas) ok.push("marqué el corte y el sangrado en " + plural(rep.cajas, "página", "páginas"));
    if (rep.igual) ok.push(plural(rep.igual, "página ya estaba bien", "páginas ya estaban bien"));
    var t = "Listo: " + (ok.length ? ok.join("; ") + "." : "no hizo falta cambiar nada.");
    if (rep.proporcion) pend.push(plural(rep.proporcion, "página tiene", "páginas tienen") + " una proporción distinta al formato elegido: no las deformé, revisalas");
    if (rep.rotadas) pend.push(plural(rep.rotadas, "página está rotada", "páginas están rotadas") + " y la dejé como estaba");
    if (an) {
      var im = an.est.imagenes, hayRgb = c.color === "cmyk" && (an.est.vec.rgb > 0 || Object.keys(im).some(function (k) { return im[k].k === "rgb"; }));
      var sinEmb = Object.keys(an.est.fuentes).some(function (k) { return !an.est.fuentes[k].emb; });
      var bajas = an.ppi && an.ppi.imgs.some(function (x) { return x.ppi < c.ppp - 1; });
      if (hayRgb) pend.push("hay elementos en RGB (pasalos a CMYK en tu programa)");
      if (sinEmb) pend.push("hay tipografías sin incrustar (incrustalas o convertilas a curvas)");
      if (bajas) pend.push("hay imágenes por debajo de " + c.ppp + " ppp (reemplazalas por otras más grandes)");
    } else nota = " El color, las tipografías y la resolución no se corrigen desde acá: tocá «Analizar mi PDF» para ver si hay algo para arreglar.";
    return t + (pend.length ? " Lo que no puedo corregir desde acá: " + pend.join("; ") + "." : "") + nota;
  }
  function corregirPdf() {
    if (!archivo) { error("Subí tu PDF para poder corregirlo."); return; }
    var btn = $("ipPdf"), c = cfg(); btn.disabled = true; error(""); $("ipPdfRes").textContent = "Preparando tu PDF…";
    cargarLibs().then(function () { return armarCorregido(archivo.buf, c); }).then(function (r) {
      var u = URL.createObjectURL(new Blob([r.bytes], { type: "application/pdf" })), a = document.createElement("a");
      a.href = u; a.download = archivo.name.replace(/\.pdf$/i, "") + "-imprenta.pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      $("ipPdfRes").textContent = resumenCorreccion(r.rep, c); avisar("PDF corregido descargado.");
    }).catch(function (e) {
      $("ipPdfRes").textContent = "";
      error(/encrypt/i.test(String(e && e.message)) ? "Este PDF tiene contraseña o permisos restringidos. Sacale la protección y volvé a subirlo." : "No pude corregir este PDF. Probá de nuevo o corregilo en tu programa de diseño.");
    }).then(function () { btn.disabled = !archivo; });
  }
  $("ipPdf").addEventListener("click", corregirPdf);
  $("ipReiniciar").addEventListener("click", function () { hechos = {}; pintar(); avisar("Se desmarcaron todos los puntos."); });
  pintarArchivo(); pintar();
})();
