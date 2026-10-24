/* qfadesign — Quitar fondo (Editor de imágenes, en Herramientas).
   Corre en el navegador: la imagen NO se sube a ningún servidor. Lo único que se descarga es el modelo de IA
   (BiRefNet lite, licencia MIT) a través de Transformers.js (Apache-2.0), una sola vez; después queda en la caché del navegador.
   Usa el pipeline oficial «background-removal». Si una combinación de modelo/precisión falla al cargar O al procesar
   (pasa en algunos dispositivos con WebGPU o poca memoria), descarta esa y prueba la siguiente.
   Expone window.qfQuitarFondo(archivo, { recortar, alProgreso }) -> Promise<{ blob, w, h }> (PNG con transparencia). */
(function () {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.js";
  /* de mejor a más simple; el último (MODNet) solo sirve bien para retratos */
  var MODELOS = ["onnx-community/BiRefNet_lite-ONNX", "onnx-community/BiRefNet_lite", "Xenova/modnet"];
  var LADO_MAX = 4096;   /* las fotos más grandes se achican antes de procesar */
  var libP = null, segP = null, pos = 0, avisarAhora = function () {};

  var lista = (function () {
    var l = [];
    MODELOS.forEach(function (id) {
      if (navigator.gpu) l.push({ id: id, o: { device: "webgpu", dtype: "fp16" } });
      l.push({ id: id, o: { dtype: "q8" } });
      l.push({ id: id, o: { dtype: "fp32" } });
    });
    return l;
  })();

  /* cualquier cosa que se lance (Error, texto, número de ONNX…) pasa a texto legible */
  function detalle(e) {
    if (!e) return "error desconocido";
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === "string") return e;
    if (typeof e === "number") return "código " + e + " (probablemente falta de memoria)";
    try { return e.message || e.reason || JSON.stringify(e) || String(e); } catch (x) { return String(e); }
  }

  function cargarLib() {
    if (!libP) {
      libP = import(LIB).then(function (T) { T.env.allowLocalModels = false; return T; }, function (e) {
        libP = null;
        throw new Error("No se pudo cargar la librería de IA (" + detalle(e) + "). Revisá la conexión y abrí la página desde https:// o localhost, no desde un archivo.");
      });
    }
    return libP;
  }

  function cargarSeg() {
    if (!segP) {
      var it = lista[pos];
      segP = cargarLib().then(function (T) {
        return T.pipeline("background-removal", it.id, Object.assign({
          progress_callback: function (d) { if (d && d.status === "progress" && typeof d.progress === "number") avisarAhora("modelo", d.progress / 100); }
        }, it.o));
      });
    }
    return segP;
  }

  function descartar() {
    var p = segP; segP = null;
    if (p) p.then(function (s) { if (s && s.dispose) try { s.dispose(); } catch (x) {} }, function () {});
  }

  /* imagen -> URL lista para el modelo (se achica si es gigante) */
  function prepararEntrada(archivo) {
    var u = URL.createObjectURL(archivo);
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, m = Math.max(w, h);
        if (m <= LADO_MAX) return ok({ url: u, ajena: false });
        var k = LADO_MAX / m, c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); ok({ url: URL.createObjectURL(b), ajena: false }); }, "image/png");
      };
      im.onerror = function () { ok({ url: u, ajena: false }); };
      im.src = u;
    });
  }

  function correr(url, errores) {
    return cargarSeg().then(function (seg) { return seg(url); }).catch(function (e) {
      console.error("Quitar fondo:", lista[pos], e);
      errores.push(lista[pos].id.split("/")[1] + " " + lista[pos].o.dtype + ": " + detalle(e));
      descartar();
      if (++pos >= lista.length) { pos = 0; throw new Error("Ninguna configuración funcionó. " + errores.slice(0, 3).join(" · ")); }
      return correr(url, errores);
    });
  }

  window.qfQuitarFondo = function (archivo, op) {
    op = op || {};
    var avisar = op.alProgreso || function () {};
    avisarAhora = avisar;
    return prepararEntrada(archivo).then(function (ent) {
      return correr(ent.url, []).then(function (salida) {
        URL.revokeObjectURL(ent.url);
        avisar("procesando", 0);
        var raw = Array.isArray(salida) ? salida[0] : salida;
        var cv = raw.toCanvas(), fin = cv;
        if (op.recortar) {
          var w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data, minX = w, minY = h, maxX = -1, maxY = -1, x, y;
          for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
          }
          if (maxX >= minX && maxY >= minY) {
            var cw = maxX - minX + 1, ch = maxY - minY + 1;
            fin = document.createElement("canvas"); fin.width = cw; fin.height = ch;
            fin.getContext("2d").drawImage(cv, minX, minY, cw, ch, 0, 0, cw, ch);
          }
        }
        return new Promise(function (ok, no) {
          fin.toBlob(function (blob) { blob ? ok({ blob: blob, w: fin.width, h: fin.height }) : no(new Error("No se pudo crear el PNG.")); }, "image/png");
        });
      }, function (e) { URL.revokeObjectURL(ent.url); throw e; });
    });
  };
})();
