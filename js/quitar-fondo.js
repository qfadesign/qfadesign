/* qfadesign — Quitar fondo (Editor de imágenes, en Herramientas).
   Corre en el navegador: la imagen NO se sube a ningún servidor. Lo único que se descarga es el modelo de IA
   (BiRefNet lite, licencia MIT) a través de Transformers.js (Apache-2.0), una sola vez; después queda en la caché del navegador.
   Usa el pipeline oficial «background-removal». Si un modelo o una precisión no anda en el dispositivo, prueba la siguiente.
   Expone window.qfQuitarFondo(archivo, { recortar, alProgreso }) -> Promise<{ blob, w, h }> (PNG con transparencia). */
(function () {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.web.min.js";
  /* de mejor a más simple; el último (MODNet) solo sirve bien para retratos */
  var MODELOS = ["onnx-community/BiRefNet_lite-ONNX", "onnx-community/BiRefNet_lite", "Xenova/modnet"];
  var motor = null;

  function intentos() {
    var l = [], m;
    MODELOS.forEach(function (id) {
      if (navigator.gpu) l.push({ id: id, o: { device: "webgpu", dtype: "fp16" } });
      l.push({ id: id, o: { dtype: "q8" } });
      l.push({ id: id, o: { dtype: "fp32" } });
    });
    return l;
  }

  function cargarMotor(avisar) {
    if (motor) return motor;
    motor = import(LIB).then(function (T) {
      T.env.allowLocalModels = false;
      var lista = intentos(), i = 0, errores = [];
      function proceso(d) {
        if (d && d.status === "progress" && typeof d.progress === "number") avisar("modelo", d.progress / 100);
      }
      function probar() {
        var it = lista[i];
        return T.pipeline("background-removal", it.id, Object.assign({ progress_callback: proceso }, it.o)).catch(function (e) {
          errores.push(it.id.split("/")[1] + " (" + (it.o.dtype) + "): " + ((e && e.message) || e));
          if (++i >= lista.length) throw new Error("No se pudo cargar el modelo. " + errores[errores.length - 1]);
          return probar();
        });
      }
      return probar();
    }, function (e) {
      throw new Error("No se pudo cargar la librería de IA (¿sin conexión?).");
    });
    motor.catch(function () { motor = null; });   /* si falla, se puede reintentar */
    return motor;
  }

  window.qfQuitarFondo = function (archivo, op) {
    op = op || {};
    var avisar = op.alProgreso || function () {};
    return cargarMotor(avisar).then(function (seg) {
      avisar("procesando", 0);
      var url = URL.createObjectURL(archivo);
      return seg(url).then(function (salida) {
        URL.revokeObjectURL(url);
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
      }, function (e) { URL.revokeObjectURL(url); throw e; });
    });
  };
})();
