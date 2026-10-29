/* qfadesign — Editor de imágenes: quitar fondo, convertir y comprimir (Herramientas).
   Convierte entre JPG, PNG y WebP, o comprime manteniendo el formato. Todo ocurre en el navegador:
   las imágenes no se suben a ningún servidor.
   Cada imagen se dibuja en un canvas y se vuelve a exportar. Eso también borra los metadatos (ubicación, cámara).
   En «Mantener formato», si el resultado no pesa menos que el original, se conserva el original (ya estaba optimizado).
   Para bajar varias a la vez se arma un .zip a mano (sin compresión, que en imágenes ya comprimidas no ahorra nada). */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var drop = $("cvDrop"), file = $("cvFile");
  if (!drop || !file) return;

  var MAX_ARCHIVOS = 12, MAX_BYTES = 30 * 1024 * 1024, MAX_PIXELES = 120e6;
  var ctl = $("cvCtl"), lista = $("cvLista"), msg = $("cvMsg"), estado = $("cvEstado"), acc = $("cvAcc"), nota = $("cvNota"), resumen = $("cvRes");
  var ancho = $("cvAn"), bg = $("cvBg"), bgG = $("cvBgg"), calG = $("cvQg");
  var chipsF = $("cvFmts").querySelectorAll(".chip"), chipsN = $("cvNiv").querySelectorAll(".chip");
  var EXT = { jpeg: "jpg", png: "png", webp: "webp" }, MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  var NOM = { jpeg: "JPG", png: "PNG", webp: "WebP" };
  var NIVELES = { alta: 0.9, media: 0.8, baja: 0.6 };      /* calidad de JPG y WebP; PNG no pierde nunca */
  var items = [], formato = "igual", nivel = "alta", corrida = 0, tReco = null, empezado = false;
  var quitar = "no", sens = 20, aden = false, motor = null, motorEstado = "", motorPct = -1, estadoProc = "";
  var fondoModo = "transp", sel = 0, ver = "res", reloj = null, usaGpu = !!navigator.gpu, prog = {};
  var MODELO = "onnx-community/BiRefNet_lite-ONNX";   /* BiRefNet lite: licencia MIT */
  var chipsQ = $("cvQfm").querySelectorAll(".chip"), sensG = $("cvSensG"), sensI = $("cvSens");

  function avisar(t) { estado.textContent = ""; setTimeout(function () { estado.textContent = t; }, 30); }
  function error(t) { msg.hidden = !t; msg.textContent = t || ""; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pesoTxt(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(b < 10240 ? 1 : 0).replace(".", ",") + " KB";
    return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
  }
  function base(n) { return n.replace(/\.[^.]+$/, "") || "imagen"; }

  /* formato de salida de una imagen: el elegido, o el suyo si se mantiene (lo que el navegador no exporta pasa a WebP) */
  function tipoDe(f) { return f.type === "image/jpeg" ? "jpeg" : f.type === "image/png" ? "png" : "webp"; }
  function fmtDe(it) {
    if (quitar !== "no" && fondoModo === "transp") return formato === "webp" ? "webp" : "png";   /* la transparencia pide PNG o WebP */
    return formato === "igual" ? tipoDe(it.file) : formato;
  }
  function nombreSalida(it) {
    var r = it.r;
    if (r && r.igual) return it.nombre;
    if (quitar !== "no") return base(it.nombre) + "-sin-fondo." + EXT[fmtDe(it)];
    return base(it.nombre) + (formato === "igual" ? "-comprimida" : "") + "." + EXT[fmtDe(it)];
  }

  /* ---- Carga ---- */
  function cargar(f) {
    return new Promise(function (ok, no) {
      function conImg() {
        var url = URL.createObjectURL(f), im = new Image();
        im.onload = function () { URL.revokeObjectURL(url); ok({ src: im, w: im.naturalWidth, h: im.naturalHeight }); };
        im.onerror = function () { URL.revokeObjectURL(url); no(new Error("No se pudo leer")); };
        im.src = url;
      }
      if (window.createImageBitmap) {
        createImageBitmap(f).then(function (b) { ok({ src: b, w: b.width, h: b.height }); }, conImg);
      } else conImg();
    });
  }


  /* ---- Quitar fondo ---- */
  /* Fondo liso: se detecta el color de los bordes y se borra lo que se le parece, desde afuera hacia adentro
     (así no se borran zonas del mismo color que estén dentro del dibujo). Los bordes quedan suavizados. */
  function quitarLiso(it) {
    var w = it.w, h = it.h, cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(it.src, 0, 0, w, h);
    var im = cx.getImageData(0, 0, w, h), d = im.data, n = w * h, i, x, y;
    /* color de fondo: el más frecuente en el borde de la imagen */
    var cuenta = {}, mejor = null, mc = 0, k;
    function mira(px) {
      var o = px * 4; if (d[o + 3] < 8) return;
      k = (d[o] >> 4) + "," + (d[o + 1] >> 4) + "," + (d[o + 2] >> 4);
      var c = cuenta[k] || (cuenta[k] = { n: 0, r: 0, g: 0, b: 0 });
      c.n++; c.r += d[o]; c.g += d[o + 1]; c.b += d[o + 2];
      if (c.n > mc) { mc = c.n; mejor = c; }
    }
    for (x = 0; x < w; x++) { mira(x); mira((h - 1) * w + x); }
    for (y = 0; y < h; y++) { mira(y * w); mira(y * w + w - 1); }
    if (!mejor) return { error: "Esta imagen ya es transparente por los bordes." };
    var br = mejor.r / mejor.n, bgc = mejor.g / mejor.n, bb = mejor.b / mejor.n;
    var T = sens * 1.6;                       /* umbral de distancia de color (0–~440): con 20 solo se borra lo muy parecido al fondo */
    function dist(px) {
      var o = px * 4;
      if (d[o + 3] < 8) return 0;
      var dr = d[o] - br, dg = d[o + 1] - bgc, db = d[o + 2] - bb;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }
    var marca = new Uint8Array(n), pila = new Int32Array(n), sp = 0;
    if (aden) { for (i = 0; i < n; i++) if (dist(i) <= T) marca[i] = 1; }
    function empuja(px) { if (!marca[px] && dist(px) <= T) { marca[px] = 1; pila[sp++] = px; } }
    for (x = 0; x < w; x++) { empuja(x); empuja((h - 1) * w + x); }
    for (y = 0; y < h; y++) { empuja(y * w); empuja(y * w + w - 1); }
    while (sp) {
      var p = pila[--sp], px = p % w;
      if (px > 0) empuja(p - 1);
      if (px < w - 1) empuja(p + 1);
      if (p >= w) empuja(p - w);
      if (p < n - w) empuja(p + w);
    }
    if (!marca.some(function (v) { return v; })) return { error: "No encontré un fondo liso. Probá con «Automático» o subí la sensibilidad." };
    /* alfa: fondo = 0; el borde del dibujo se suaviza según qué tan parecido es al fondo */
    for (i = 0; i < n; i++) {
      var o = i * 4;
      if (marca[i]) { d[o + 3] = 0; continue; }
      var x0 = i % w, vec = (x0 > 0 && marca[i - 1]) || (x0 < w - 1 && marca[i + 1]) || (i >= w && marca[i - w]) || (i < n - w && marca[i + w]);
      if (vec) {
        var dd = dist(i), a = Math.max(0, Math.min(1, (dd - T * 0.5) / (T * 1.0)));
        if (a < 1) d[o + 3] = Math.round(d[o + 3] * a);
      }
    }
    cx.putImageData(im, 0, 0);
    return { canvas: cv };
  }

  /* Automático: BiRefNet lite (MIT) corriendo en el navegador con Transformers.js. Se descarga una sola vez y queda en caché.
     Con WebGPU usa la versión liviana (fp16); si falla o no hay, usa la versión CPU/WASM (fp32). */
  function cargarMotor() {
    if (motor) return motor;
    motorEstado = "Preparando el modelo…"; motorPct = -1; prog = {};
    function cb(p) {
      if (p && p.status === "progress" && p.total) {
        prog[p.file] = { l: p.loaded, t: p.total };
        var L = 0, T = 0, f;
        for (f in prog) { L += prog[f].l; T += prog[f].t; }
        motorPct = Math.min(100, Math.round(L / T * 100));
        motorEstado = "Descargando el modelo (solo la primera vez)… " + motorPct + "%";
        pintarProc();
      }
    }
    motor = import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.web.min.js").then(function (tf) {
      function crear(gpu) {
        return tf.pipeline("background-removal", MODELO, gpu
          ? { device: "webgpu", dtype: "fp16", progress_callback: cb }
          : { device: "wasm", dtype: "fp32", progress_callback: cb });
      }
      return crear(usaGpu).catch(function (e) { if (!usaGpu) throw e; usaGpu = false; prog = {}; return crear(false); });
    }).then(function (m) { motorEstado = ""; motorPct = -1; return m; }, function (e) { motor = null; motorEstado = ""; motorPct = -1; throw e; });
    return motor;
  }
  function textoProc() { return motorEstado || estadoProc || "Procesando…"; }
  function pintarProc() {
    var t = textoProc();
    Array.prototype.forEach.call(lista.querySelectorAll(".cv-m[data-proc]"), function (e) { e.textContent = t; });
    var tx = $("cvVisTxt"), b = $("cvBar"), bw = $("cvBarW");
    if (tx) tx.textContent = t;
    if (b && bw) {
      if (motorEstado && motorPct >= 0) { bw.classList.remove("ind"); b.style.width = motorPct + "%"; }
      else { bw.classList.add("ind"); b.style.width = ""; }
    }
  }
  function iniciarReloj() {
    var t0 = Date.now();
    clearInterval(reloj);
    reloj = setInterval(function () { estadoProc = "Quitando el fondo… " + Math.round((Date.now() - t0) / 1000) + " s"; pintarProc(); }, 1000);
  }
  function pararReloj() { clearInterval(reloj); reloj = null; estadoProc = ""; }
  function inferir(it) {
    return cargarMotor().then(function (m) {
      estadoProc = "Quitando el fondo…"; iniciarReloj(); pintarProc();
      var url = URL.createObjectURL(it.file);
      return m(url).then(function (out) { URL.revokeObjectURL(url); return { canvas: out.toCanvas() }; }, function (e) { URL.revokeObjectURL(url); throw e; });
    });
  }
  function quitarAuto(it) {
    return inferir(it).then(function (r) {
      if (usaGpu && visible(r.canvas) < 0.005) throw new Error("vacío");   /* la GPU a veces devuelve vacío: se reintenta en CPU */
      return r;
    }).catch(function (e) {
      if (!usaGpu) throw e;
      usaGpu = false; motor = null;
      return inferir(it);
    }).then(function (r) { pararReloj(); return r; }, function () {
      pararReloj();
      return { error: "No pude cargar el quitafondos automático (hace falta conexión la primera vez). Probá con «Fondo liso»." };
    });
  }
  /* porcentaje de píxeles visibles (alfa > 25) de un canvas, mirando una versión chica */
  function visible(cv) {
    var s = Math.min(1, 128 / Math.max(cv.width, cv.height)), w = Math.max(1, Math.round(cv.width * s)), h = Math.max(1, Math.round(cv.height * s));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(cv, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, n = 0, i;
    for (i = 3; i < d.length; i += 4) if (d[i] > 25) n++;
    return n / (w * h);
  }
  /* devuelve algo que se pueda dibujar; se guarda para no repetir el trabajo al cambiar formato o compresión */
  function fuenteDe(it) {
    if (quitar === "no") return Promise.resolve({ src: it.src, w: it.w, h: it.h });
    var clave = quitar === "liso" ? "liso" + sens + (aden ? "a" : "") : "auto";
    if (it.sf && it.sf.clave === clave) return Promise.resolve(it.sf.res);
    var trabajo = quitar === "liso" ? Promise.resolve(quitarLiso(it)) : quitarAuto(it);
    return trabajo.then(function (r) {
      if (!r.error && visible(r.canvas) < 0.005) {
        r = { error: quitar === "liso"
          ? "Se borró casi toda la imagen. Bajá la sensibilidad o probá con «Automático»."
          : "El modo Automático no encontró qué conservar en esta imagen (funciona mejor con personas). Probá con «Fondo liso»." };
      }
      var res = r.error ? r : { src: r.canvas, w: r.canvas.width, h: r.canvas.height };
      if (!r.error) it.sf = { clave: clave, res: res };
      return res;
    });
  }

  /* ---- Conversión / compresión ---- */
  function convertir(it) {
    return fuenteDe(it).then(function (fu) {
      if (fu.error) return { error: fu.error };
      return convertirDe(it, fu);
    });
  }
  function convertirDe(it, fu) {
    return new Promise(function (ok) {
      var fm = fmtDe(it), maxW = parseInt(ancho.value, 10), w = fu.w, h = fu.h, achico = false;
      if (maxW > 0 && w > maxW) { h = Math.max(1, Math.round(h * maxW / w)); w = maxW; achico = true; }
      if (w * h > MAX_PIXELES) return ok({ error: "La imagen es demasiado grande para convertirla acá." });
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var cx = cv.getContext("2d");
      if (fm === "jpeg" || (quitar !== "no" && fondoModo === "color")) { cx.fillStyle = quitar !== "no" ? $("cvBg2").value : bg.value; cx.fillRect(0, 0, w, h); }
      cx.imageSmoothingQuality = "high";
      cx.drawImage(fu.src, 0, 0, w, h);
      cv.toBlob(function (blob) {
        if (!blob) return ok({ error: "No se pudo convertir." });
        if (blob.type !== MIME[fm]) return ok({ error: "Tu navegador no puede exportar a " + NOM[fm] + ". Probá con otro formato." });
        /* comprimiendo sin cambiar de formato ni de tamaño: si no baja el peso, se queda el original */
        if (formato === "igual" && quitar === "no" && !achico && blob.size >= it.bytes) return ok({ blob: it.file, w: it.w, h: it.h, igual: true });
        ok({ blob: blob, w: w, h: h });
      }, MIME[fm], fm === "png" ? undefined : NIVELES[nivel]);
    });
  }

  function reconvertir() {
    var mia = ++corrida;
    items.forEach(function (it) { it.proc = true; });
    pintar();
    items.reduce(function (p, it) {
      return p.then(function () {
        if (mia !== corrida) return;
        return convertir(it).then(function (r) {
          if (mia !== corrida) return;
          if (it.url) URL.revokeObjectURL(it.url);
          it.url = r.blob ? URL.createObjectURL(r.blob) : null;
          it.r = r; it.proc = false;
          pintar();
        });
      });
    }, Promise.resolve()).then(function () {
      if (mia !== corrida) return;
      var bien = items.filter(function (i) { return i.r && i.r.blob; }).length;
      avisar(bien + (bien === 1 ? " imagen lista. " : " imágenes listas. ") + resumen.textContent);
    });
  }

  /* ---- Pantalla ---- */
  function pintar() {
    if (sel >= items.length) sel = Math.max(0, items.length - 1);
    lista.innerHTML = items.map(function (it, i) {
      var r = it.r, cls = "cv-it" + (i === sel ? " sel" : "");
      if (it.proc || !r) return '<li class="' + cls + '" data-i="' + i + '"><span class="cv-th" aria-hidden="true"></span><p class="cv-n">' + esc(it.nombre) + '</p><p class="cv-m"' + (it.proc ? ' data-proc' : '') + '>' + (it.proc ? textoProc() : 'Lista para procesar') + '</p></li>';
      if (r.error) return '<li class="' + cls + ' err" data-i="' + i + '"><span class="cv-th" aria-hidden="true"></span><p class="cv-n">' + esc(it.nombre) + '</p><p class="cv-m">' + esc(r.error) + '</p><span class="cv-b"><button class="cv-x" type="button" data-q="' + i + '" aria-label="Quitar ' + esc(it.nombre) + '">✕</button></span></li>';
      var nuevo = nombreSalida(it), meta;
      if (r.igual) {
        meta = pesoTxt(it.bytes) + ' · <span class="igual">Ya estaba optimizada (se deja la original)</span> · ' + r.w + "×" + r.h;
      } else if (quitar !== "no") {
        meta = pesoTxt(r.blob.size) + " · " + r.w + "×" + r.h;
      } else {
        var dif = Math.round((1 - r.blob.size / it.bytes) * 100), menos = dif >= 0;
        meta = pesoTxt(it.bytes) + " → " + pesoTxt(r.blob.size) + ' <b class="' + (menos ? "" : "mas") + '">(' + (menos ? "−" : "+") + Math.abs(dif) + "%)</b> · " + r.w + "×" + r.h;
        if (formato === "igual" && quitar === "no" && tipoDe(it.file) === "webp" && it.file.type !== "image/webp") meta += " · pasó a WebP";
      }
      it.meta = meta; it.nuevo = nuevo;
      return '<li class="' + cls + '" data-i="' + i + '"><img class="cv-th" src="' + it.url + '" alt="">' +
        '<p class="cv-n">' + esc(nuevo) + "</p>" +
        '<p class="cv-m">' + meta + "</p>" +
        '<span class="cv-b"><a class="cv-d" href="' + it.url + '" download="' + esc(nuevo) + '" aria-label="Descargar ' + esc(nuevo) + '">Descargar</a>' +
        '<button class="cv-x" type="button" data-q="' + i + '" aria-label="Quitar ' + esc(it.nombre) + '">✕</button></span></li>';
    }).join("");
    var hay = items.length > 0;
    if (!hay) { empezado = false; sel = 0; ver = "res"; }
    /* con imágenes cargadas desaparece la zona de subida; queda el botón «Subir otra imagen» */
    drop.hidden = hay; $("cvOtraW").hidden = !hay;
    lista.hidden = items.length < 2;
    ctl.hidden = !hay; acc.hidden = !hay; nota.hidden = !hay;
    $("cvIr").hidden = !hay || empezado;
    $("cvGo").textContent = quitar !== "no" ? "Quitar el fondo" : "Empezar a convertir";
    $("cvLimpiar").textContent = items.length === 1 ? "Quitar imagen" : "Quitar todas";
    $("cvZip").hidden = !empezado || items.length < 2;
    resumenOpc();
    var transp = quitar !== "no" && fondoModo === "transp";
    var salida = transp ? (formato === "webp" ? "webp" : "png") : formato;
    calG.hidden = salida === "png";
    bgG.hidden = !(salida === "jpeg" && quitar === "no");
    Array.prototype.forEach.call(chipsF, function (c) {
      var jpg = c.getAttribute("data-f") === "jpeg";
      c.disabled = jpg && transp;
      if (jpg && transp && formato === "jpeg") { formato = "png"; elegir(chipsF, Array.prototype.filter.call(chipsF, function (x) { return x.getAttribute("data-f") === "png"; })[0], "data-f"); }
    });
    /* ahorro total (solo cuando se comprime, no cuando se quita el fondo) */
    var antes = 0, despues = 0;
    items.forEach(function (it) { if (it.r && it.r.blob) { antes += it.bytes; despues += it.r.blob.size; } });
    resumen.textContent = quitar === "no" && antes && despues < antes ? "Ahorraste " + pesoTxt(antes - despues) + " (−" + Math.round((1 - despues / antes) * 100) + "%) en total." : "";
    resumen.hidden = !resumen.textContent;
    actualizarVisor();
  }

  /* imagen grande que se está editando: original o resultado, con aviso de progreso mientras trabaja */
  function actualizarVisor() {
    var vis = $("cvVis"), it = items[sel];
    vis.hidden = !it;
    if (!it) return;
    var r = it.r, ok = !!(r && r.blob && !it.proc), img = $("cvVisImg"), orig = ver === "orig" || !ok;
    var src = orig ? it.ourl : it.url;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.hidden = false;
    img.alt = (orig ? "Original: " : "Resultado: ") + it.nombre;
    $("cvVer").hidden = !ok;
    Array.prototype.forEach.call($("cvVer").querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-v") === (orig ? "orig" : "res"))); });
    $("cvVisProg").hidden = !it.proc;
    if (it.proc) pintarProc();
    var m = $("cvVisMeta");
    if (it.proc) m.textContent = "";
    else if (r && r.error) m.textContent = r.error;
    else if (ok) m.innerHTML = '<b>' + esc(it.nuevo) + '</b> · ' + it.meta;
    else m.textContent = it.nombre + " · " + it.w + "×" + it.h + (empezado ? "" : " · Elegí las opciones y tocá el botón");
    var d = $("cvVisD");
    d.hidden = !ok;
    if (ok) { d.setAttribute("href", it.url); d.setAttribute("download", it.nuevo); d.setAttribute("aria-label", "Descargar " + it.nuevo); }
    $("cvVisIn").classList.toggle("cv-sf", ok && !orig && quitar !== "no" && fondoModo === "transp");
  }

  /* ---- Alta y baja de archivos ---- */
  function agregar(archivos) {
    error("");
    var lista0 = Array.prototype.slice.call(archivos), malos = [];
    var validos = lista0.filter(function (f) {
      if (!/^image\//.test(f.type)) { malos.push(f.name + " no es una imagen."); return false; }
      if (f.size > MAX_BYTES) { malos.push(f.name + " pesa más de 30 MB."); return false; }
      return true;
    });
    var libres = MAX_ARCHIVOS - items.length;
    if (validos.length > libres) { malos.push("Se pueden procesar hasta " + MAX_ARCHIVOS + " imágenes a la vez."); validos = validos.slice(0, Math.max(0, libres)); }
    if (malos.length) error(malos.join(" "));
    if (!validos.length) return;
    Promise.all(validos.map(function (f) {
      return cargar(f).then(function (d) { return { file: f, src: d.src, w: d.w, h: d.h, nombre: f.name, bytes: f.size, ourl: URL.createObjectURL(f) }; }, function () { malos.push("No pude leer " + f.name + "."); return null; });
    })).then(function (nuevos) {
      var antes0 = items.length;
      nuevos.forEach(function (n) { if (n) items.push(n); });
      if (items.length > antes0) { sel = antes0; ver = "res"; }
      if (malos.length) error(malos.join(" "));
      pintar();
      if (empezado) reconvertir();
    });
  }
  function limpiar() {
    corrida++;
    items.forEach(function (i) { if (i.url) URL.revokeObjectURL(i.url); if (i.ourl) URL.revokeObjectURL(i.ourl); if (i.src && i.src.close) i.src.close(); });
    items = []; error(""); pintar(); avisar("Se quitaron las imágenes.");
  }

  file.addEventListener("change", function () { agregar(file.files); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  var area = drop.parentNode;
  ["dragenter", "dragover"].forEach(function (e) { area.addEventListener(e, function (ev) { if (ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], "Files") >= 0) ev.preventDefault(); }); });
  area.addEventListener("drop", function (ev) { if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) { ev.preventDefault(); agregar(ev.dataTransfer.files); } });
  $("cvOtra").addEventListener("click", function () { file.click(); });
  Array.prototype.forEach.call($("cvVer").querySelectorAll(".chip"), function (c) {
    c.addEventListener("click", function () { ver = c.getAttribute("data-v"); actualizarVisor(); });
  });

  lista.addEventListener("click", function (e) {
    var b = e.target.closest(".cv-x");
    if (!b) {
      /* tocar una fila la muestra grande arriba */
      var li = e.target.closest(".cv-it");
      if (li && !e.target.closest("a,button")) { sel = +li.getAttribute("data-i"); ver = "res"; pintar(); }
      return;
    }
    var i = +b.getAttribute("data-q"), it = items[i];
    if (!it) return;
    if (it.url) URL.revokeObjectURL(it.url);
    if (it.ourl) URL.revokeObjectURL(it.ourl);
    if (it.src && it.src.close) it.src.close();
    items.splice(i, 1); pintar();
    if (!items.length) file.focus();
  });
  $("cvLimpiar").addEventListener("click", function () { limpiar(); file.focus(); });

  /* ---- Opciones ---- */
  function resumenOpc() {
    function t(chips) { var x = Array.prototype.filter.call(chips, function (c) { return c.getAttribute("aria-pressed") === "true"; })[0]; return x ? x.textContent : ""; }
    $("cvVF").textContent = t(chipsF); $("cvVN").textContent = t(chipsN);
    $("cvVA").textContent = ancho.value ? ancho.value + " px" : "Original";
    $("cvVQ").textContent = quitar === "auto" ? "Automático" : quitar === "liso" ? "Fondo liso" : "No";
    sensG.hidden = quitar !== "liso";
    $("cvFdG").hidden = quitar === "no"; $("cvColW").hidden = quitar === "no" || fondoModo !== "color";
    $("cvQfN").textContent = quitar === "auto" ? "Recorta personas, productos, animales y objetos. La primera vez descarga el modelo (entre 100 y 220 MB) y después queda guardado." : quitar === "liso" ? "Ideal para logos e ilustraciones sobre un color liso. Es instantáneo." : "Elegí «Automático» o «Fondo liso» para sacarle el fondo a tus imágenes.";
  }
  $("cvGo").addEventListener("click", function () { empezado = true; pintar(); reconvertir(); });
  function nuevoReco() { clearTimeout(tReco); tReco = setTimeout(function () { if (items.length && empezado) reconvertir(); }, 250); }
  function elegir(chips, b, attr) {
    Array.prototype.forEach.call(chips, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    return b.getAttribute(attr);
  }
  Array.prototype.forEach.call(chipsF, function (b) {
    b.addEventListener("click", function () { formato = elegir(chipsF, b, "data-f"); pintar(); if (items.length && empezado) reconvertir(); });
  });
  Array.prototype.forEach.call(chipsN, function (b) {
    b.addEventListener("click", function () { nivel = elegir(chipsN, b, "data-n"); resumenOpc(); if (items.length && empezado) reconvertir(); });
  });
  Array.prototype.forEach.call(chipsQ, function (b) {
    b.addEventListener("click", function () { quitar = elegir(chipsQ, b, "data-k"); pintar(); if (items.length && empezado) reconvertir(); });
  });
  $("cvAden").addEventListener("change", function () { aden = this.checked; nuevoReco(); });
  var chipsB = $("cvFdm").querySelectorAll(".chip");
  Array.prototype.forEach.call(chipsB, function (b) {
    b.addEventListener("click", function () { fondoModo = elegir(chipsB, b, "data-b"); pintar(); if (items.length && empezado) reconvertir(); });
  });
  $("cvBg2").addEventListener("input", nuevoReco);
  Array.prototype.forEach.call($("cvColW").querySelectorAll(".cv-sw"), function (s) {
    s.addEventListener("click", function () { $("cvBg2").value = s.getAttribute("data-c"); nuevoReco(); });
  });
  sensI.addEventListener("input", function () { sens = +sensI.value; nuevoReco(); });
  ancho.addEventListener("input", function () { ancho.value = ancho.value.replace(/\D/g, ""); resumenOpc(); nuevoReco(); });
  bg.addEventListener("input", nuevoReco);

  /* ---- .zip sin compresión ---- */
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
  $("cvZip").addEventListener("click", function () {
    var bien = items.filter(function (i) { return i.r && i.r.blob; }), usados = {};
    if (!bien.length) return;
    Promise.all(bien.map(function (it) {
      return it.r.blob.arrayBuffer().then(function (buf) {
        var nom = nombreSalida(it), n = nom.replace(/\.[^.]+$/, ""), e = nom.slice(n.length), k = 1;
        while (usados[nom]) nom = n + "-" + (++k) + e;
        usados[nom] = 1;
        return { nombre: nom, datos: new Uint8Array(buf) };
      });
    })).then(function (arch) {
      var url = URL.createObjectURL(armarZip(arch)), a = document.createElement("a");
      a.href = url; a.download = "qfadesign-imagenes.zip";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  });

  /* ---- Abrir directo con herramientas#convertidor ---- */
  function abrirSiHash() {
    if (location.hash !== "#convertidor") return;
    var b = $("hbv");
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }
  pintar();
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
