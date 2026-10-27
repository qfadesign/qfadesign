/* qfadesign — Herramientas de PDF (Herramientas): comprimir, unir, dividir, extraer o eliminar páginas, rotar y pasar a imágenes.
   Todo ocurre en el navegador: los PDF no se suben a ningún servidor.
   Regla de la página: NADA empieza hasta que la persona toca «Aceptar y empezar». Subir archivos o cambiar opciones no procesa nada.
   Comprimir tiene dos modos:
   · «Texto y vectores»: recomprime las imágenes que lleva adentro (JPG y Flate RGB/gris) y reescribe el archivo. El texto y los enlaces quedan intactos.
   · «Máxima compresión»: dibuja cada página como imagen JPG y arma un PDF nuevo. Baja mucho más, pero el texto deja de ser seleccionable.
   Si al comprimir el resultado no pesa menos, se conserva el original.
   Librerías (se cargan recién cuando se sube un archivo): pdf.js para leer y dibujar, pdf-lib para reescribir. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var drop = $("pdDrop"), file = $("pdFile");
  if (!drop || !file) return;

  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "") + "vendor/";
  var MAX_ARCHIVOS = 12, MAX_BYTES = 100 * 1024 * 1024;
  var msg = $("pdMsg"), estado = $("pdEstado"), lista = $("pdLista"), salida = $("pdSalida");
  var NIVELES = {
    alta: { q: 0.86, lado: 4000, min: 12000, dpi: 200, q2: 0.86 },
    media: { q: 0.74, lado: 2400, min: 6000, dpi: 150, q2: 0.74 },
    baja: { q: 0.55, lado: 1400, min: 4000, dpi: 100, q2: 0.58 },
    extrema: { q: 0.4, lado: 1000, min: 3000, dpi: 72, q2: 0.42 }
  };
  var NIV_TXT = {
    alta: "Cuida la calidad al máximo. Ahorra menos.",
    media: "Lo recomendado para mandar por mail. Buena calidad y mucho menos peso.",
    baja: "Baja bastante el peso. La calidad se nota un poco al hacer zoom.",
    extrema: "Comprime todo lo posible. Se pierde calidad: sirve para leer en pantalla, no para imprimir."
  };
  var ACCIONES = {
    comprimir: { t: "Comprimir", d: "Bajá el peso de cada PDF.", min: 1, v: "comprimir", faltan: "" },
    unir: { t: "Unir", d: "Juntá varios PDF en uno solo.", min: 2, v: "unir", faltan: "Para unir necesitás subir 2 PDF o más." },
    dividir: { t: "Dividir", d: "Separá un PDF en varios.", min: 1, v: "dividir", faltan: "" },
    extraer: { t: "Extraer páginas", d: "Quedate solo con las páginas que elijas.", min: 1, v: "extraer", faltan: "" },
    eliminar: { t: "Eliminar páginas", d: "Sacá las páginas que no querés.", min: 1, v: "eliminar", faltan: "" },
    rotar: { t: "Rotar", d: "Girá las páginas de un PDF.", min: 1, v: "rotar", faltan: "" },
    imagenes: { t: "PDF a imágenes", d: "Guardá cada página como JPG.", min: 1, v: "imagenes", faltan: "" }
  };
  var items = [], accion = null, modo = "texto", nivel = "media", corrida = 0, libs = null, seqId = 0, ocupado = false;
  var salidas = [], salidaZip = "qfadesign-pdf";

  function avisar(t) { estado.textContent = ""; setTimeout(function () { estado.textContent = t; }, 30); }
  function error(t) { msg.hidden = !t; msg.textContent = t || ""; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pesoTxt(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(b < 10240 ? 1 : 0).replace(".", ",") + " KB";
    return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
  }
  function base(n) { return n.replace(/\.[^.]+$/, "") || "documento"; }
  function pausa() { return new Promise(function (ok) { setTimeout(ok, 0); }); }
  function cancelado() { var e = new Error("cancelado"); e.cancelado = true; return e; }
  function plural(n, a, b) { return n + " " + (n === 1 ? a : b); }
  function limpioNombre(t, def) { t = String(t || "").replace(/\.pdf$/i, "").replace(/[\\\/:*?"<>|]+/g, "").trim(); return t || def; }

  /* ---- Carga de librerías (una sola vez) ---- */
  function script(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = function () { no(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }
  function cargarLibs() {
    if (!libs) {
      libs = script(BASE + "pdf.min.js").then(function () { return script(BASE + "pdf-lib.min.js"); }).then(function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.js";
      });
      libs.catch(function () { libs = null; });
    }
    return libs;
  }

  /* ---- Lectura del PDF: páginas y miniatura de la primera ---- */
  function abrir(f) {
    return f.arrayBuffer().then(function (buf) {
      return cargarLibs().then(function () {
        return window.pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      }).then(function (pdf) {
        return pdf.getPage(1).then(function (pg) {
          var v1 = pg.getViewport({ scale: 1 }), s = 112 / Math.max(v1.width, v1.height), v = pg.getViewport({ scale: s });
          var cv = document.createElement("canvas"); cv.width = Math.ceil(v.width); cv.height = Math.ceil(v.height);
          return pg.render({ canvasContext: cv.getContext("2d"), viewport: v, background: "#fff" }).promise.then(function () {
            var th = cv.toDataURL("image/jpeg", 0.7), n = pdf.numPages;
            pdf.destroy();
            return { buf: new Uint8Array(buf), paginas: n, thumb: th };
          });
        });
      });
    });
  }

  /* ---- Modo «Conservar texto»: recomprimir las imágenes internas ---- */
  function nombreDe(ctx, v) {
    v = ctx.lookup(v);
    var PL = window.PDFLib;
    if (v instanceof PL.PDFArray) return v.size() === 1 ? nombreDe(ctx, v.get(0)) : "multi";
    return v && v.asString ? v.asString() : null;
  }
  function numDe(ctx, v) { v = ctx.lookup(v); return v && v.asNumber ? v.asNumber() : null; }

  /* quita el predictor PNG (Predictor >= 10) de un flujo ya descomprimido */
  function sinPredictor(d, colores, cols) {
    var bpp = colores, fila = cols * colores, n = d.length / (fila + 1), out = new Uint8Array(n * fila), y, x, f, a, b, c, p, pa, pb, pc, o, i;
    for (y = 0; y < n; y++) {
      f = d[y * (fila + 1)]; o = y * fila; i = y * (fila + 1) + 1;
      for (x = 0; x < fila; x++) {
        a = x >= bpp ? out[o + x - bpp] : 0;
        b = y ? out[o - fila + x] : 0;
        c = y && x >= bpp ? out[o - fila + x - bpp] : 0;
        if (f === 0) p = 0; else if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
        else { p = a + b - c; pa = Math.abs(p - a); pb = Math.abs(p - b); pc = Math.abs(p - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        out[o + x] = (d[i + x] + p) & 255;
      }
    }
    return out;
  }
  function inflar(u8) {
    var ds = new DecompressionStream("deflate");
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  /* devuelve { src, w, h } dibujable de una imagen del PDF, o null si no se puede */
  function leerImagen(ctx, o, filtro, n, w, h) {
    var PL = window.PDFLib, N = PL.PDFName;
    if (filtro === "/DCTDecode") {
      return createImageBitmap(new Blob([o.contents], { type: "image/jpeg" })).then(function (b) { return { src: b, w: b.width, h: b.height }; }, function () { return null; });
    }
    if (filtro !== "/FlateDecode" || !window.DecompressionStream || w * h > 60e6) return Promise.resolve(null);
    var dp = ctx.lookup(o.dict.get(N.of("DecodeParms"))), pred = 1, cols = w;
    if (dp instanceof PL.PDFArray) dp = dp.size() === 1 ? ctx.lookup(dp.get(0)) : null;
    if (dp && dp.get) {
      pred = numDe(ctx, dp.get(N.of("Predictor"))) || 1;
      if (pred > 1 && (numDe(ctx, dp.get(N.of("Colors"))) || 1) !== n) return Promise.resolve(null);
      cols = numDe(ctx, dp.get(N.of("Columns"))) || w;
    } else if (o.dict.get(N.of("DecodeParms"))) return Promise.resolve(null);
    if (pred !== 1 && pred < 10) return Promise.resolve(null);
    if (cols !== w) return Promise.resolve(null);
    return inflar(o.contents).then(function (d) {
      if (pred >= 10) { if (d.length !== h * (w * n + 1)) return null; d = sinPredictor(d, n, w); }
      if (d.length < w * h * n) return null;
      var im = new ImageData(w, h), px = im.data, i, j;
      if (n === 3) for (i = 0, j = 0; i < px.length; i += 4, j += 3) { px[i] = d[j]; px[i + 1] = d[j + 1]; px[i + 2] = d[j + 2]; px[i + 3] = 255; }
      else for (i = 0, j = 0; i < px.length; i += 4, j++) { px[i] = px[i + 1] = px[i + 2] = d[j]; px[i + 3] = 255; }
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").putImageData(im, 0, 0);
      return { src: cv, w: w, h: h };
    }, function () { return null; });
  }

  function aBlobJpg(cv, q) { return new Promise(function (ok) { cv.toBlob(ok, "image/jpeg", q); }); }

  function conservarTexto(it, cfg, mia, prog) {
    var PL = window.PDFLib, N = PL.PDFName;
    return PL.PDFDocument.load(it.buf, { updateMetadata: false }).then(function (doc) {
      var ctx = doc.context, imgs = [], cambiadas = 0, vistas = 0;
      ctx.enumerateIndirectObjects().forEach(function (e) {
        var o = e[1];
        if (o instanceof PL.PDFRawStream && o.dict.get(N.of("Subtype")) === N.of("Image")) imgs.push(e);
      });
      var seq = Promise.resolve();
      imgs.forEach(function (e, k) {
        seq = seq.then(function () {
          if (mia !== corrida) throw cancelado();
          var ref = e[0], o = e[1], d = o.dict;
          prog("Imagen " + (k + 1) + " de " + imgs.length);
          var filtro = nombreDe(ctx, d.get(N.of("Filter"))), w = numDe(ctx, d.get(N.of("Width"))), h = numDe(ctx, d.get(N.of("Height")));
          var bpc = numDe(ctx, d.get(N.of("BitsPerComponent")));
          if (!w || !h || o.contents.length < cfg.min) return;
          if (ctx.lookup(d.get(N.of("ImageMask"))) === PL.PDFBool.True || d.get(N.of("Mask")) || d.get(N.of("Decode"))) return;
          if ((bpc || (filtro === "/DCTDecode" ? 8 : 0)) !== 8) return;
          /* espacio de color: RGB o gris (directo o con perfil ICC); lo demás (CMYK, indexado…) no se toca */
          var cs = ctx.lookup(d.get(N.of("ColorSpace"))), n = 0, csSalida = N.of("DeviceRGB");
          if (cs instanceof PL.PDFName) n = cs.asString() === "/DeviceRGB" ? 3 : cs.asString() === "/DeviceGray" ? 1 : 0;
          else if (cs instanceof PL.PDFArray && cs.size() === 2 && ctx.lookup(cs.get(0)) === N.of("ICCBased")) {
            var pr = ctx.lookup(cs.get(1));
            n = pr && pr.dict ? numDe(ctx, pr.dict.get(N.of("N"))) : 0;
          }
          if (n !== 1 && n !== 3) return;
          if (n === 3) csSalida = d.get(N.of("ColorSpace"));
          vistas++;
          return leerImagen(ctx, o, filtro, n, w, h).then(function (im) {
            if (!im) return;
            var esc = Math.min(1, cfg.lado / Math.max(im.w, im.h)), tw = Math.max(1, Math.round(im.w * esc)), th = Math.max(1, Math.round(im.h * esc));
            var cv = document.createElement("canvas"); cv.width = tw; cv.height = th;
            var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, tw, th);
            cx.imageSmoothingQuality = "high"; cx.drawImage(im.src, 0, 0, tw, th);
            if (im.src.close) im.src.close();
            return aBlobJpg(cv, cfg.q).then(function (blob) {
              cv.width = cv.height = 0;
              if (!blob || blob.size > o.contents.length * 0.95) return;
              return blob.arrayBuffer().then(function (ab) {
                var nuevo = { Type: "XObject", Subtype: "Image", Width: tw, Height: th, ColorSpace: csSalida, BitsPerComponent: 8, Filter: "DCTDecode" };
                var sm = d.get(N.of("SMask")); if (sm) nuevo.SMask = sm;
                ctx.assign(ref, ctx.stream(new Uint8Array(ab), nuevo));
                cambiadas++;
              });
            });
          }).then(pausa);
        });
      });
      return seq.then(function () {
        prog("Guardando el PDF");
        return doc.save({ useObjectStreams: true, addDefaultPage: false });
      }).then(function (bytes) { return { bytes: bytes, imagenes: imgs.length, cambiadas: cambiadas, vistas: vistas }; });
    });
  }

  /* ---- Modo «Máxima compresión»: cada página pasa a ser una imagen ---- */
  function aplanar(it, cfg, mia, prog) {
    var PL = window.PDFLib;
    return window.pdfjsLib.getDocument({ data: new Uint8Array(it.buf) }).promise.then(function (pdf) {
      return PL.PDFDocument.create().then(function (out) {
        var seq = Promise.resolve();
        for (var p = 1; p <= pdf.numPages; p++) (function (p) {
          seq = seq.then(function () {
            if (mia !== corrida) throw cancelado();
            prog("Página " + p + " de " + pdf.numPages);
            return pdf.getPage(p).then(function (pg) {
              var v1 = pg.getViewport({ scale: 1 }), s = cfg.dpi / 72;
              s = Math.min(s, 5000 / Math.max(v1.width, v1.height), Math.sqrt(30e6 / (v1.width * v1.height)));
              var v = pg.getViewport({ scale: s }), cv = document.createElement("canvas");
              cv.width = Math.max(1, Math.round(v.width)); cv.height = Math.max(1, Math.round(v.height));
              return pg.render({ canvasContext: cv.getContext("2d"), viewport: v, background: "#fff" }).promise.then(function () {
                return aBlobJpg(cv, cfg.q2);
              }).then(function (blob) {
                cv.width = cv.height = 0;
                return blob.arrayBuffer();
              }).then(function (ab) {
                return out.embedJpg(new Uint8Array(ab));
              }).then(function (img) {
                var pag = out.addPage([v1.width, v1.height]);
                pag.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
                pg.cleanup();
              });
            }).then(pausa);
          });
        })(p);
        return seq.then(function () { prog("Guardando el PDF"); return out.save({ useObjectStreams: true }); })
          .then(function (bytes) { pdf.destroy(); return { bytes: bytes, paginas: pdf.numPages }; });
      });
    });
  }


  /* ---- Rangos de páginas: «1-3, 5, 8-» (8- = hasta el final) ---- */
  function rango(txt, n) {
    var out = [], visto = {}, partes = String(txt || "").split(/[,;\s]+/).filter(Boolean);
    if (!partes.length) throw new Error("Escribí qué páginas querés. Por ejemplo: 1-3, 5, 8-10");
    partes.forEach(function (p) {
      var m = /^(\d+)(?:-(\d*))?$/.exec(p);
      if (!m) throw new Error("No entendí «" + p + "». Usá números y guiones, por ejemplo: 1-3, 5, 8-10");
      var a = +m[1], b = m[2] === undefined ? a : (m[2] === "" ? n : +m[2]);
      if (a < 1 || b < a || b > n) throw new Error("«" + p + "» no existe: ese PDF tiene " + plural(n, "página", "páginas") + ".");
      for (var i = a; i <= b; i++) if (!visto[i]) { visto[i] = 1; out.push(i - 1); }
    });
    return out;
  }
  function conNombre(it, e) { return items.length > 1 ? it.nombre + ": " + e.message : e.message; }

  /* ---- Ajustes elegidos (se leen recién al aceptar) ---- */
  function chipActivo(id, attr) { var b = $(id).querySelector('[aria-pressed="true"]'); return b ? b.getAttribute(attr) : null; }
  function leerAjustes() {
    var a = { accion: accion };
    if (accion === "comprimir") { a.modo = modo; a.nivel = nivel; }
    if (accion === "unir") a.nombre = limpioNombre($("pdUnirNombre").value, "unido");
    if (accion === "dividir") {
      a.como = chipActivo("pdDivModo", "data-d");
      a.rangos = $("pdDivRangos").value; a.cada = parseInt($("pdDivN").value, 10);
      if (a.como === "cada" && !(a.cada >= 1)) throw new Error("Escribí cada cuántas páginas querés cortar. Por ejemplo: 2");
      if (a.como === "rangos" && !String(a.rangos).trim()) throw new Error("Escribí los grupos de páginas. Por ejemplo: 1-3, 4-6, 7-10");
    }
    if (accion === "extraer") { a.pag = $("pdExtPag").value; if (!a.pag.trim()) throw new Error("Escribí qué páginas querés conservar. Por ejemplo: 1-3, 5, 8-10"); }
    if (accion === "eliminar") { a.pag = $("pdElPag").value; if (!a.pag.trim()) throw new Error("Escribí qué páginas querés eliminar. Por ejemplo: 2, 4-6"); }
    if (accion === "rotar") { a.grados = parseInt(chipActivo("pdRotGrados", "data-g"), 10); a.pag = $("pdRotPag").value; }
    if (accion === "imagenes") a.dpi = chipActivo("pdImgCal", "data-c") === "alta" ? 220 : 150;
    return a;
  }

  /* ---- Tareas ---- */
  var NIV_NOM = { alta: "sin pérdida visible", media: "equilibrada", baja: "de menor peso", extrema: "extrema" };
  function pdf(bytes, nombre, info, extra) { var r = { nombre: nombre, blob: new Blob([bytes], { type: "application/pdf" }), tipo: "PDF", info: info }; for (var k in extra) r[k] = extra[k]; return r; }
  function cargarSrc(it) {
    return window.PDFLib.PDFDocument.load(it.buf, { updateMetadata: false }).catch(function (e) {
      if (/encrypt/i.test(String(e && e.message))) throw new Error(it.nombre + " tiene contraseña. Sacásela y probá de nuevo.");
      throw new Error("No pude abrir " + it.nombre + ".");
    });
  }
  function subDoc(src, idx) {
    return window.PDFLib.PDFDocument.create().then(function (out) {
      return out.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (p) { out.addPage(p); }); return out.save({ useObjectStreams: true }); });
    });
  }
  function porCada(arr, fn) { return arr.reduce(function (p, x, i) { return p.then(function () { if (cancelAhora()) throw cancelado(); return fn(x, i); }); }, Promise.resolve()); }
  var miaActual = 0;
  function cancelAhora() { return miaActual !== corrida; }
  function prog(t) { $("pdProgTxt").textContent = t; }

  function tComprimir(aj, res) {
    var cfg = NIVELES[aj.nivel];
    return porCada(items, function (it, i) {
      var pre = items.length > 1 ? "PDF " + (i + 1) + " de " + items.length + " · " : "";
      var p = function (t) { prog(pre + t + "…"); };
      var tarea = aj.modo === "texto" ? conservarTexto(it, cfg, miaActual, p) : aplanar(it, cfg, miaActual, p);
      return tarea.then(function (r) {
        var blob = new Blob([r.bytes], { type: "application/pdf" });
        if (blob.size >= it.bytes * 0.98) {
          res.push({ nombre: it.nombre, blob: it.file, tipo: "PDF", igual: true, antes: it.bytes, info: aj.modo === "texto" ? "No encontré imágenes para bajar de peso. Probá «Máxima compresión» o un nivel más fuerte." : "Ya estaba optimizado: se deja el original." });
        } else {
          res.push({ nombre: base(it.nombre) + "-comprimido.pdf", blob: blob, tipo: "PDF", antes: it.bytes, info: plural(it.paginas, "página", "páginas") + (aj.modo === "texto" ? " · " + plural(r.cambiadas, "imagen optimizada", "imágenes optimizadas") : " · páginas como imagen") });
        }
      }, function (e) {
        if (e && e.cancelado) throw e;
        res.push({ nombre: it.nombre, error: /encrypt|password/i.test(String(e && e.message)) ? "Tiene contraseña. Sacásela y probá de nuevo." : "No pude comprimir este PDF. Probá con «Máxima compresión»." });
      });
    });
  }
  function tUnir(aj, res) {
    return window.PDFLib.PDFDocument.create().then(function (out) {
      var total = 0;
      return porCada(items, function (it, i) {
        prog("Sumando " + it.nombre + " (" + (i + 1) + " de " + items.length + ")…");
        return cargarSrc(it).then(function (src) {
          return out.copyPages(src, src.getPageIndices()).then(function (pgs) { pgs.forEach(function (p) { out.addPage(p); }); total += pgs.length; });
        });
      }).then(function () { prog("Guardando el PDF…"); return out.save({ useObjectStreams: true }); })
        .then(function (b) { res.push(pdf(b, aj.nombre + ".pdf", plural(total, "página", "páginas") + " de " + items.length + " PDF")); });
    });
  }
  function tDividir(aj, res) {
    return porCada(items, function (it, i) {
      prog("Dividiendo " + it.nombre + "…");
      var n = it.paginas, grupos = [], nom = [];
      try {
        if (aj.como === "pagina") for (var k = 0; k < n; k++) { grupos.push([k]); nom.push("-pag-" + (k + 1)); }
        else if (aj.como === "cada") for (var s = 0; s < n; s += aj.cada) { var g = []; for (var q = s; q < Math.min(n, s + aj.cada); q++) g.push(q); grupos.push(g); nom.push("-pag-" + (s + 1) + (g.length > 1 ? "-" + (s + g.length) : "")); }
        else String(aj.rangos).split(/[,;]+/).filter(function (x) { return x.trim(); }).forEach(function (t, j) { grupos.push(rango(t, n)); nom.push("-parte-" + (j + 1)); });
      } catch (e) { throw new Error(conNombre(it, e)); }
      return cargarSrc(it).then(function (src) {
        return porCada(grupos, function (g, j) {
          prog("Dividiendo " + it.nombre + ": parte " + (j + 1) + " de " + grupos.length + "…");
          return subDoc(src, g).then(function (b) { res.push(pdf(b, base(it.nombre) + nom[j] + ".pdf", plural(g.length, "página", "páginas"))); });
        });
      });
    });
  }
  function tExtraer(aj, res, quitar) {
    return porCada(items, function (it) {
      var idx;
      try { idx = rango(aj.pag, it.paginas); } catch (e) { throw new Error(conNombre(it, e)); }
      if (quitar) {
        var fuera = {}; idx.forEach(function (x) { fuera[x] = 1; });
        idx = []; for (var k = 0; k < it.paginas; k++) if (!fuera[k]) idx.push(k);
        if (!idx.length) throw new Error(conNombre(it, new Error("No se pueden eliminar todas las páginas.")));
      }
      prog("Procesando " + it.nombre + "…");
      return cargarSrc(it).then(function (src) { return subDoc(src, idx); }).then(function (b) {
        res.push(pdf(b, base(it.nombre) + (quitar ? "-sin-paginas" : "-extraido") + ".pdf", plural(idx.length, "página", "páginas") + " (de " + it.paginas + ")"));
      });
    });
  }
  function tRotar(aj, res) {
    var PL = window.PDFLib;
    return porCada(items, function (it) {
      var sel;
      try { sel = String(aj.pag).trim() ? rango(aj.pag, it.paginas) : null; } catch (e) { throw new Error(conNombre(it, e)); }
      prog("Rotando " + it.nombre + "…");
      return cargarSrc(it).then(function (src) {
        var pgs = src.getPages(), cuales = sel || pgs.map(function (_, i) { return i; });
        cuales.forEach(function (i) { pgs[i].setRotation(PL.degrees(((pgs[i].getRotation().angle + aj.grados) % 360 + 360) % 360)); });
        return src.save({ useObjectStreams: true }).then(function (b) {
          res.push(pdf(b, base(it.nombre) + "-rotado.pdf", plural(cuales.length, "página girada", "páginas giradas") + " " + aj.grados + "°"));
        });
      });
    });
  }
  function tImagenes(aj, res) {
    return porCada(items, function (it) {
      return window.pdfjsLib.getDocument({ data: new Uint8Array(it.buf) }).promise.then(function (doc) {
        var pags = []; for (var p = 1; p <= doc.numPages; p++) pags.push(p);
        return porCada(pags, function (p) {
          prog("Página " + p + " de " + doc.numPages + (items.length > 1 ? " · " + it.nombre : "") + "…");
          return doc.getPage(p).then(function (pg) {
            var v1 = pg.getViewport({ scale: 1 }), s = Math.min(aj.dpi / 72, 5000 / Math.max(v1.width, v1.height), Math.sqrt(30e6 / (v1.width * v1.height)));
            var v = pg.getViewport({ scale: s }), cv = document.createElement("canvas");
            cv.width = Math.max(1, Math.round(v.width)); cv.height = Math.max(1, Math.round(v.height));
            return pg.render({ canvasContext: cv.getContext("2d"), viewport: v, background: "#fff" }).promise.then(function () { return aBlobJpg(cv, 0.88); }).then(function (blob) {
              var w = cv.width, h = cv.height; cv.width = cv.height = 0; pg.cleanup();
              var num = String(p); while (num.length < String(doc.numPages).length || num.length < 2) num = "0" + num;
              res.push({ nombre: base(it.nombre) + "-" + num + ".jpg", blob: blob, tipo: "JPG", info: w + "×" + h + " px" });
            });
          }).then(pausa);
        }).then(function () { doc.destroy(); });
      });
    });
  }

  function empezar() {
    if (ocupado || !accion) return;
    error("");
    var aj;
    try { aj = leerAjustes(); } catch (e) { error(e.message); return; }
    if (items.length < ACCIONES[accion].min) { error(ACCIONES[accion].faltan); return; }
    ocupado = true; miaActual = ++corrida; salidas = [];
    pantalla("trabajo"); prog("Empezando…"); avisar("Empezó el proceso.");
    var res = [], t = { comprimir: tComprimir, unir: tUnir, dividir: tDividir, extraer: tExtraer, eliminar: function (a, r) { return tExtraer(a, r, true); }, rotar: tRotar, imagenes: tImagenes }[accion];
    t(aj, res).then(function () {
      salidas = res; ocupado = false; pintarSalida(aj); pantalla("salida");
      var bien = res.filter(function (r) { return r.blob; }).length;
      avisar(bien ? "Listo. " + plural(bien, "archivo preparado", "archivos preparados") + "." : "No se pudo completar.");
    }, function (e) {
      ocupado = false; pantalla("preparar");
      if (e && e.cancelado) { avisar("Se canceló. No se hizo ningún cambio."); return; }
      error(String(e && e.message ? e.message : "No pude completar la tarea."));
    });
  }

  /* ---- Pantallas: preparar → trabajo → salida ---- */
  function pantalla(p) {
    $("pdPreparar").hidden = p !== "preparar"; $("pdTrabajo").hidden = p !== "trabajo"; $("pdSalidaBox").hidden = p !== "salida";
    var h = p === "preparar" ? $("pdDrop") : p === "salida" ? $("pdSalidaTit") : $("pdProgTit");
    if (p !== "preparar" && h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: false }); }
  }

  /* ---- Pantalla: archivos y opciones ---- */
  function resumenTxt() {
    if (!accion) return "Elegí qué querés hacer con tus PDF.";
    var n = items.length, pdfs = n === 1 ? "tu PDF" : "tus " + n + " PDF";
    switch (accion) {
      case "comprimir": return "Vas a comprimir " + pdfs + " con compresión " + NIV_NOM[nivel] + (modo === "texto" ? ", conservando el texto." : ", pasando cada página a imagen.");
      case "unir": return "Vas a unir " + n + " PDF en uno solo, en el orden de la lista.";
      case "dividir": return "Vas a dividir " + pdfs + " en varios archivos.";
      case "extraer": return "Vas a quedarte solo con las páginas que escribas, de " + pdfs + ".";
      case "eliminar": return "Vas a sacar las páginas que escribas, de " + pdfs + ".";
      case "rotar": return "Vas a girar las páginas de " + pdfs + ".";
      default: return "Vas a guardar cada página de " + pdfs + " como imagen JPG.";
    }
  }
  function pintar() {
    var hay = items.length > 0;
    lista.innerHTML = items.map(function (it, i) {
      var mv = items.length > 1 ? '<button class="cv-x" type="button" data-s="up" data-q="' + i + '" aria-label="Subir ' + esc(it.nombre) + '"' + (i === 0 ? " disabled" : "") + '>↑</button><button class="cv-x" type="button" data-s="dn" data-q="' + i + '" aria-label="Bajar ' + esc(it.nombre) + '"' + (i === items.length - 1 ? " disabled" : "") + ">↓</button>" : "";
      return '<li class="cv-it"><img class="cv-th" src="' + it.thumb + '" alt=""><p class="cv-n">' + (items.length > 1 ? (i + 1) + ". " : "") + esc(it.nombre) + '</p><p class="cv-m">' + plural(it.paginas, "página", "páginas") + " · " + pesoTxt(it.bytes) + '</p><span class="cv-b">' + mv + '<button class="cv-x" type="button" data-q="' + i + '" aria-label="Quitar ' + esc(it.nombre) + '">✕</button></span></li>';
    }).join("");
    drop.classList.toggle("tiene", hay);
    $("pdOrden").hidden = items.length < 2;
    $("pdP2").hidden = !hay;
    if (accion && items.length < ACCIONES[accion].min) accion = null;
    Array.prototype.forEach.call($("pdAcc").querySelectorAll(".pd-op"), function (b) {
      var k = b.getAttribute("data-a"), off = items.length < ACCIONES[k].min;
      b.setAttribute("aria-pressed", k === accion ? "true" : "false"); b.setAttribute("aria-disabled", off ? "true" : "false");
      var s = b.querySelector("small"); if (s) s.hidden = !off;
    });
    $("pdP3").hidden = !accion; $("pdP4").hidden = !accion;
    Array.prototype.forEach.call($("pdP3").querySelectorAll("[data-p]"), function (p) { p.hidden = p.getAttribute("data-p") !== accion; });
    $("pdAjTit").textContent = accion ? "Ajustá «" + ACCIONES[accion].t + "»" : "";
    $("pdNivTxt").textContent = NIV_TXT[nivel];
    $("pdModoTxt").textContent = modo === "texto" ? "Baja el peso de las imágenes del PDF. El texto se sigue pudiendo seleccionar y los enlaces funcionan." : "Cada página pasa a ser una imagen. Baja mucho más, pero el texto ya no se puede seleccionar ni buscar, y se pierden los enlaces.";
    var dm = chipActivo("pdDivModo", "data-d");
    $("pdDivRangosG").hidden = dm !== "rangos"; $("pdDivNG").hidden = dm !== "cada";
    $("pdResumen").textContent = resumenTxt();
    $("pdGo").disabled = !accion;
  }
  function chips(id, attr, fn) {
    var g = $(id); if (!g) return;
    g.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll(".chip"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      if (fn) fn(b.getAttribute(attr)); pintar();
    });
  }

  /* ---- Resultado ---- */
  function limpiarUrls() { salidas.forEach(function (r) { if (r.url) URL.revokeObjectURL(r.url); }); }
  function pintarSalida(aj) {
    var antes = 0, despues = 0;
    salidas.forEach(function (r) { if (r.blob) r.url = URL.createObjectURL(r.blob); if (r.antes && r.blob && !r.igual) { antes += r.antes; despues += r.blob.size; } });
    salida.innerHTML = salidas.map(function (r, i) {
      if (r.error) return '<li class="cv-it err"><span class="cv-th pd-ext" aria-hidden="true">PDF</span><p class="cv-n">' + esc(r.nombre) + '</p><p class="cv-m">' + esc(r.error) + "</p></li>";
      var meta = pesoTxt(r.blob.size) + " · " + esc(r.info || "");
      if (r.antes && !r.igual) meta = pesoTxt(r.antes) + " → " + pesoTxt(r.blob.size) + " <b>(−" + Math.round((1 - r.blob.size / r.antes) * 100) + "%)</b> · " + esc(r.info || "");
      if (r.igual) meta = pesoTxt(r.antes) + ' · <span class="igual">' + esc(r.info) + "</span>";
      return '<li class="cv-it"><span class="cv-th pd-ext" aria-hidden="true">' + r.tipo + '</span><p class="cv-n">' + esc(r.nombre) + '</p><p class="cv-m">' + meta + '</p><span class="cv-b"><a class="cv-d" href="' + r.url + '" download="' + esc(r.nombre) + '" aria-label="Descargar ' + esc(r.nombre) + '">Descargar</a></span></li>';
    }).join("");
    var bien = salidas.filter(function (r) { return r.blob; }).length;
    $("pdZip").hidden = bien < 2;
    $("pdSalidaTit").textContent = bien ? (bien === 1 ? "Listo: tu archivo está preparado" : "Listo: " + bien + " archivos preparados") : "No se pudo completar";
    var res = $("pdRes"); res.textContent = antes && despues < antes ? "Ahorraste " + pesoTxt(antes - despues) + " (−" + Math.round((1 - despues / antes) * 100) + "%) en total." : "";
    res.hidden = !res.textContent;
    salidaZip = aj.accion === "imagenes" ? "qfadesign-imagenes" : "qfadesign-pdf";
  }

  /* ---- Alta y baja de archivos ---- */
  function agregar(archivos) {
    error("");
    var malos = [], validos = Array.prototype.slice.call(archivos).filter(function (f) {
      if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { malos.push(f.name + " no es un PDF."); return false; }
      if (f.size > MAX_BYTES) { malos.push(f.name + " pesa más de 100 MB."); return false; }
      return true;
    });
    var libres = MAX_ARCHIVOS - items.length;
    if (validos.length > libres) { malos.push("Se pueden subir hasta " + MAX_ARCHIVOS + " PDF a la vez."); validos = validos.slice(0, Math.max(0, libres)); }
    if (malos.length) error(malos.join(" "));
    if (!validos.length) return;
    avisar("Leyendo los PDF");
    Promise.all(validos.map(function (f) {
      return abrir(f).then(function (d) {
        return { id: ++seqId, file: f, buf: d.buf, paginas: d.paginas, thumb: d.thumb, nombre: f.name, bytes: f.size };
      }, function (e) {
        malos.push(/password/i.test(String(e && (e.name + e.message))) ? f.name + " tiene contraseña. Sacásela y volvé a subirlo." : "No pude leer " + f.name + ".");
        return null;
      });
    })).then(function (nuevos) {
      nuevos.forEach(function (n) { if (n) items.push(n); });
      if (malos.length) error(malos.join(" "));
      pintar();
      if (nuevos.some(Boolean)) { avisar(plural(items.length, "PDF cargado", "PDF cargados") + ". Ahora elegí qué querés hacer."); var p2 = $("pdP2"); if (p2 && p2.scrollIntoView) p2.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
  }
  function reiniciar() {
    corrida++; ocupado = false; limpiarUrls(); salidas = []; items = []; accion = null; error("");
    pantalla("preparar"); pintar();
  }

  file.addEventListener("change", function () { agregar(file.files); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { if (ev.dataTransfer && ev.dataTransfer.files) agregar(ev.dataTransfer.files); });

  lista.addEventListener("click", function (e) {
    var b = e.target.closest(".cv-x"); if (!b || b.disabled) return;
    var i = +b.getAttribute("data-q"), s = b.getAttribute("data-s"), it = items[i];
    if (!it) return;
    if (s) { var j = s === "up" ? i - 1 : i + 1, t = items[j]; items[j] = it; items[i] = t; pintar(); return; }
    items.splice(i, 1); pintar();
    if (!items.length) file.focus();
  });
  $("pdAcc").addEventListener("click", function (e) {
    var b = e.target.closest(".pd-op"); if (!b) return;
    var k = b.getAttribute("data-a");
    if (items.length < ACCIONES[k].min) { error(ACCIONES[k].faltan); return; }
    error(""); accion = k; pintar();
    var p3 = $("pdP3"); if (p3.scrollIntoView) p3.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  chips("pdModo", "data-m", function (v) { modo = v; });
  chips("pdNiv", "data-n", function (v) { nivel = v; });
  chips("pdDivModo", "data-d"); chips("pdRotGrados", "data-g"); chips("pdImgCal", "data-c");
  ["pdUnirNombre", "pdDivRangos", "pdDivN", "pdExtPag", "pdElPag", "pdRotPag"].forEach(function (id) { $(id).addEventListener("input", function () { error(""); }); });
  $("pdDivN").addEventListener("input", function () { this.value = this.value.replace(/\D/g, ""); });
  $("pdGo").addEventListener("click", empezar);
  $("pdCancelar").addEventListener("click", function () { corrida++; });
  $("pdOtra").addEventListener("click", function () { limpiarUrls(); salidas = []; accion = null; pantalla("preparar"); pintar(); });
  $("pdLimpiar").addEventListener("click", function () { reiniciar(); file.focus(); });

  /* ---- .zip sin compresión (los PDF y JPG ya vienen comprimidos) ---- */
  var TABLA = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = TABLA[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function armarZip(archivos) {
    var enc = new TextEncoder(), partes = [], central = [], desde = 0, d = new Date();
    var hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    archivos.forEach(function (a) {
      var nom = enc.encode(a.nombre), crc = crc32(a.datos), n = a.datos.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, hora, true); h.setUint16(12, fecha, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true);
      h.setUint16(26, nom.length, true); h.setUint16(28, 0, true);
      partes.push(h.buffer, nom, a.datos);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, hora, true); c.setUint16(14, fecha, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true);
      c.setUint16(28, nom.length, true); c.setUint32(42, desde, true);
      central.push(c.buffer, nom);
      desde += 30 + nom.length + n;
    });
    var tam = central.reduce(function (s, b) { return s + (b.byteLength || b.length); }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, archivos.length, true); e.setUint16(10, archivos.length, true);
    e.setUint32(12, tam, true); e.setUint32(16, desde, true);
    return new Blob(partes.concat(central, [e.buffer]), { type: "application/zip" });
  }
  $("pdZip").addEventListener("click", function () {
    var bien = salidas.filter(function (r) { return r.blob; }), usados = {};
    if (!bien.length) return;
    Promise.all(bien.map(function (r) {
      return r.blob.arrayBuffer().then(function (buf) {
        var nom = r.nombre, n = nom.replace(/\.[^.]+$/, ""), e = nom.slice(n.length), k = 1;
        while (usados[nom]) nom = n + "-" + (++k) + e;
        usados[nom] = 1;
        return { nombre: nom, datos: new Uint8Array(buf) };
      });
    })).then(function (arch) {
      var url = URL.createObjectURL(armarZip(arch)), a = document.createElement("a");
      a.href = url; a.download = salidaZip + ".zip";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  });

  pantalla("preparar"); pintar();
})();
