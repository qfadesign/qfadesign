/* qfadesign — Convertidor de formatos (Herramientas).
   Pasa imágenes entre JPG, PNG y WebP. Todo ocurre en el navegador: las imágenes no se suben a ningún servidor.
   Se dibuja cada imagen en un canvas y se la vuelve a exportar en el formato elegido.
   Para bajar varias a la vez se arma un .zip a mano (sin compresión, que en imágenes ya comprimidas no ahorra nada). */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var drop = $("cvDrop"), file = $("cvFile");
  if (!drop || !file) return;

  var MAX_ARCHIVOS = 12, MAX_BYTES = 30 * 1024 * 1024, MAX_PIXELES = 120e6;
  var ctl = $("cvCtl"), lista = $("cvLista"), msg = $("cvMsg"), estado = $("cvEstado"), acc = $("cvAcc"), nota = $("cvNota");
  var cal = $("cvCal"), calV = $("cvCalV"), calG = $("cvQg"), ancho = $("cvAn"), bg = $("cvBg"), bgG = $("cvBgg");
  var fmts = ctl.querySelectorAll(".cv-fmts .chip");
  var EXT = { jpeg: "jpg", png: "png", webp: "webp" }, MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  var items = [], formato = "webp", corrida = 0, tReco = null;

  function avisar(t) { estado.textContent = ""; setTimeout(function () { estado.textContent = t; }, 30); }
  function error(t) { msg.hidden = !t; msg.textContent = t || ""; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pesoTxt(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(b < 10240 ? 1 : 0).replace(".", ",") + " KB";
    return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
  }
  function base(n) { return n.replace(/\.[^.]+$/, "") || "imagen"; }

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

  /* ---- Conversión ---- */
  function convertir(it) {
    return new Promise(function (ok) {
      var maxW = parseInt(ancho.value, 10), w = it.w, h = it.h;
      if (maxW > 0 && w > maxW) { h = Math.max(1, Math.round(h * maxW / w)); w = maxW; }
      if (w * h > MAX_PIXELES) return ok({ error: "La imagen es demasiado grande para convertirla acá." });
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var cx = cv.getContext("2d");
      if (formato === "jpeg") { cx.fillStyle = bg.value; cx.fillRect(0, 0, w, h); }
      cx.imageSmoothingQuality = "high";
      cx.drawImage(it.src, 0, 0, w, h);
      var q = formato === "png" ? undefined : (+cal.value) / 100;
      cv.toBlob(function (blob) {
        if (!blob) return ok({ error: "No se pudo convertir." });
        if (blob.type !== MIME[formato]) return ok({ error: "Tu navegador no puede exportar a " + (formato === "webp" ? "WebP" : formato.toUpperCase()) + ". Probá con otro formato." });
        ok({ blob: blob, w: w, h: h });
      }, MIME[formato], q);
    });
  }

  function reconvertir() {
    var mia = ++corrida;
    items.reduce(function (p, it) {
      return p.then(function () {
        if (mia !== corrida) return;
        return convertir(it).then(function (r) {
          if (mia !== corrida) return;
          if (it.url) URL.revokeObjectURL(it.url);
          it.url = r.blob ? URL.createObjectURL(r.blob) : null;
          it.r = r;
          pintar();
        });
      });
    }, Promise.resolve()).then(function () {
      if (mia !== corrida) return;
      var bien = items.filter(function (i) { return i.r && i.r.blob; }).length;
      avisar(bien + (bien === 1 ? " imagen convertida." : " imágenes convertidas."));
    });
  }

  /* ---- Pantalla ---- */
  function pintar() {
    lista.innerHTML = items.map(function (it, i) {
      var r = it.r;
      if (!r) return '<li class="cv-it"><span class="cv-th" aria-hidden="true"></span><p class="cv-n">' + esc(it.nombre) + '</p><p class="cv-m">Convirtiendo…</p></li>';
      if (r.error) return '<li class="cv-it err"><span class="cv-th" aria-hidden="true"></span><p class="cv-n">' + esc(it.nombre) + '</p><p class="cv-m">' + esc(r.error) + '</p><span class="cv-b"><button class="cv-x" type="button" data-q="' + i + '" aria-label="Quitar ' + esc(it.nombre) + '">✕</button></span></li>';
      var dif = Math.round((1 - r.blob.size / it.bytes) * 100), menos = dif >= 0;
      var nuevo = base(it.nombre) + "." + EXT[formato];
      return '<li class="cv-it"><img class="cv-th" src="' + it.url + '" alt="">' +
        '<p class="cv-n">' + esc(nuevo) + "</p>" +
        '<p class="cv-m">' + pesoTxt(it.bytes) + " → " + pesoTxt(r.blob.size) + ' <b class="' + (menos ? "" : "mas") + '">(' + (menos ? "−" : "+") + Math.abs(dif) + "%)</b> · " + r.w + "×" + r.h + "</p>" +
        '<span class="cv-b"><a class="cv-d" href="' + it.url + '" download="' + esc(nuevo) + '" aria-label="Descargar ' + esc(nuevo) + '">Descargar</a>' +
        '<button class="cv-x" type="button" data-q="' + i + '" aria-label="Quitar ' + esc(it.nombre) + '">✕</button></span></li>';
    }).join("");
    var hay = items.length > 0;
    drop.classList.toggle("tiene", hay);
    ctl.hidden = !hay; acc.hidden = !hay; nota.hidden = !hay;
    $("cvZip").hidden = items.length < 2;
    calG.hidden = formato === "png";
    bgG.hidden = formato !== "jpeg";
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
    if (validos.length > libres) { malos.push("Se pueden convertir hasta " + MAX_ARCHIVOS + " imágenes a la vez."); validos = validos.slice(0, Math.max(0, libres)); }
    if (malos.length) error(malos.join(" "));
    if (!validos.length) return;
    Promise.all(validos.map(function (f) {
      return cargar(f).then(function (d) { return { src: d.src, w: d.w, h: d.h, nombre: f.name, bytes: f.size }; }, function () { malos.push("No pude leer " + f.name + "."); return null; });
    })).then(function (nuevos) {
      nuevos.forEach(function (n) { if (n) items.push(n); });
      if (malos.length) error(malos.join(" "));
      pintar();
      reconvertir();
    });
  }
  function limpiar() {
    corrida++;
    items.forEach(function (i) { if (i.url) URL.revokeObjectURL(i.url); if (i.src && i.src.close) i.src.close(); });
    items = []; error(""); pintar(); avisar("Se quitaron las imágenes.");
  }

  file.addEventListener("change", function () { agregar(file.files); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { if (ev.dataTransfer && ev.dataTransfer.files) agregar(ev.dataTransfer.files); });

  lista.addEventListener("click", function (e) {
    var b = e.target.closest(".cv-x");
    if (!b) return;
    var i = +b.getAttribute("data-q"), it = items[i];
    if (!it) return;
    if (it.url) URL.revokeObjectURL(it.url);
    if (it.src && it.src.close) it.src.close();
    items.splice(i, 1); pintar();
    if (!items.length) file.focus();
  });
  $("cvLimpiar").addEventListener("click", function () { limpiar(); file.focus(); });

  /* ---- Opciones ---- */
  function nuevoReco() { clearTimeout(tReco); tReco = setTimeout(function () { if (items.length) reconvertir(); }, 250); }
  Array.prototype.forEach.call(fmts, function (b) {
    b.addEventListener("click", function () {
      formato = b.getAttribute("data-f");
      Array.prototype.forEach.call(fmts, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      pintar(); if (items.length) reconvertir();
    });
  });
  cal.addEventListener("input", function () { calV.textContent = cal.value; nuevoReco(); });
  ancho.addEventListener("input", function () { ancho.value = ancho.value.replace(/\D/g, ""); nuevoReco(); });
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
        var n = base(it.nombre), nom = n + "." + EXT[formato], k = 1;
        while (usados[nom]) nom = n + "-" + (++k) + "." + EXT[formato];
        usados[nom] = 1;
        return { nombre: nom, datos: new Uint8Array(buf) };
      });
    })).then(function (arch) {
      var url = URL.createObjectURL(armarZip(arch)), a = document.createElement("a");
      a.href = url; a.download = "qfadesign-imagenes-" + EXT[formato] + ".zip";
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
