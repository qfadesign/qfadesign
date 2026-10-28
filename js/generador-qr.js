/* qfadesign — Generador de QR personalizados (Herramientas).
   Todo ocurre en el navegador: no se envía ningún dato ni ningún logo a un servidor.
   El QR se arma como SVG (vectorial) a partir de la matriz que calcula qrcode-generator.
   Ese mismo SVG se usa para la vista previa, para el .svg y para el .png.
   Para comprobar que siga legible después de personalizarlo, se dibuja en un canvas y se lo "escanea" con jsQR (en tamaño normal y en tamaño chico). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var lienzo = $("qrLienzo");
  if (!lienzo || !window.qrcode || !window.jsQR) return;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

  var S = { tipo: "enlace", mod: "cuadrado", ojo: "cuadrado", ecl: "auto", px: 1024, fondoLogo: "cuadrado", logo: null, ultimo: null };
  var token = 0, temporizador = 0;
  var REDES = {
    instagram: ["https://www.instagram.com/", ""], linkedin: ["https://www.linkedin.com/in/", ""], behance: ["https://www.behance.net/", ""],
    tiktok: ["https://www.tiktok.com/@", ""], youtube: ["https://www.youtube.com/@", ""], x: ["https://x.com/", ""]
  };

  function v(id) { return ($(id).value || "").trim(); }
  function normUrl(u) { u = (u || "").trim(); if (!u) return ""; return /^[a-z][a-z0-9+.\-]*:/i.test(u) ? u : "https://" + u; }
  function vc(t) { return String(t).replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n"); }

  /* ---- Qué contenido lleva el QR ---- */
  function contenido() {
    var t = S.tipo;
    if (t === "enlace") return { txt: normUrl(v("qrUrl")), falta: "Escribí el enlace para ver tu QR." };
    if (t === "red") {
      var u = v("qrUser").replace(/^@/, "").replace(/\s+/g, ""), r = REDES[$("qrRed").value];
      if (/^https?:\/\//i.test(v("qrUser"))) return { txt: v("qrUser") };
      return { txt: u ? r[0] + u : "", falta: "Escribí tu usuario (con o sin @) para ver tu QR." };
    }
    if (t === "whatsapp") {
      var n = v("qrWaNum").replace(/\D/g, ""), m = v("qrWaMsg");
      return { txt: n ? "https://wa.me/" + n + (m ? "?text=" + encodeURIComponent(m) : "") : "", falta: "Escribí el número con código de país, sin + ni espacios. Ejemplo: 5492210000000." };
    }
    if (t === "contacto") {
      var nom = v("qrNom"), tel = v("qrTel"), mail = v("qrMail"), web = v("qrWeb"), org = v("qrOrg");
      if (!nom && !tel && !mail) return { txt: "", falta: "Completá al menos el nombre y un teléfono o email para armar el contacto." };
      var l = ["BEGIN:VCARD", "VERSION:3.0", "N:;" + vc(nom) + ";;;", "FN:" + vc(nom)];
      if (org) l.push("ORG:" + vc(org));
      if (tel) l.push("TEL;TYPE=CELL:" + vc(tel));
      if (mail) l.push("EMAIL:" + vc(mail));
      if (web) l.push("URL:" + vc(normUrl(web)));
      l.push("END:VCARD");
      return { txt: l.join("\r\n") };
    }
    return { txt: $("qrTexto").value.trim(), falta: "Escribí el texto para ver tu QR." };
  }

  /* ---- Matriz QR ---- */
  function crear(txt, pref, conLogo) {
    var orden = pref === "auto" ? (conLogo ? ["H", "Q", "M", "L"] : ["M", "L"]) : ["H", "Q", "M", "L"].slice(["H", "Q", "M", "L"].indexOf(pref));
    for (var i = 0; i < orden.length; i++) {
      try { var q = qrcode(0, orden[i]); q.addData(txt, "Byte"); q.make(); return { q: q, nivel: orden[i], bajo: i > 0 }; } catch (e) { /* no entra: pruebo un nivel más bajo */ }
    }
    return null;
  }

  /* ---- SVG ---- */
  function r2(x) { return Math.round(x * 100) / 100; }
  function dibujar(q, o, dim) {
    var n = q.getModuleCount(), T = n + 2 * o.margen, c = T / 2, i, j;
    var Ls = o.logo ? o.logoPct / 100 * n : 0, back = Ls ? Ls + 1 : 0, redondoLogo = o.fondoLogo === "redondo";
    function bajo(r, cc) {
      if (!back) return false;
      var dx = Math.abs(o.margen + cc + .5 - c), dy = Math.abs(o.margen + r + .5 - c);
      return redondoLogo ? Math.sqrt(dx * dx + dy * dy) < back / 2 : dx < back / 2 && dy < back / 2;
    }
    function ojoZona(r, cc) { return (r < 7 && cc < 7) || (r < 7 && cc >= n - 7) || (r >= n - 7 && cc < 7); }
    var d = "";
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        if (!q.isDark(i, j) || ojoZona(i, j) || bajo(i, j)) continue;
        var x = o.margen + j, y = o.margen + i;
        if (o.mod === "cuadrado") {
          var k = j; while (k + 1 < n && q.isDark(i, k + 1) && !ojoZona(i, k + 1) && !bajo(i, k + 1)) k++;
          var len = k - j + 1; d += "M" + x + " " + y + "h" + len + "v1h-" + len + "z"; j = k;
        } else if (o.mod === "redondo") {
          var rr = .34, s = r2(1 - 2 * rr);
          d += "M" + r2(x + rr) + " " + y + "h" + s + "a" + rr + " " + rr + " 0 0 1 " + rr + " " + rr + "v" + s + "a" + rr + " " + rr + " 0 0 1 -" + rr + " " + rr + "h-" + s + "a" + rr + " " + rr + " 0 0 1 -" + rr + " -" + rr + "v-" + s + "a" + rr + " " + rr + " 0 0 1 " + rr + " -" + rr + "z";
        } else {
          var pr = .43;
          d += "M" + r2(x + .5 - pr) + " " + r2(y + .5) + "a" + pr + " " + pr + " 0 1 0 " + r2(2 * pr) + " 0a" + pr + " " + pr + " 0 1 0 -" + r2(2 * pr) + " 0z";
        }
      }
    }
    var tam = dim || 1024;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + T + " " + T + '" width="' + tam + '" height="' + tam + '" role="img" aria-label="Código QR">';
    if (!o.transp) s += '<rect width="' + T + '" height="' + T + '" fill="' + o.bg + '"/>';
    s += '<path fill="' + o.fg + '"' + (o.mod === "cuadrado" ? ' shape-rendering="crispEdges"' : "") + ' d="' + d + '"/>';
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
      var ox = o.margen + p[0], oy = o.margen + p[1];
      if (o.ojo === "circulo") s += '<circle cx="' + (ox + 3.5) + '" cy="' + (oy + 3.5) + '" r="3" fill="none" stroke="' + o.fg + '" stroke-width="1"/><circle cx="' + (ox + 3.5) + '" cy="' + (oy + 3.5) + '" r="1.5" fill="' + o.fg + '"/>';
      else {
        var rx1 = o.ojo === "redondo" ? 1.1 : 0, rx2 = o.ojo === "redondo" ? .6 : 0;
        s += '<rect x="' + (ox + .5) + '" y="' + (oy + .5) + '" width="6" height="6" rx="' + rx1 + '" fill="none" stroke="' + o.fg + '" stroke-width="1"' + (rx1 ? "" : ' shape-rendering="crispEdges"') + '/><rect x="' + (ox + 2) + '" y="' + (oy + 2) + '" width="3" height="3" rx="' + rx2 + '" fill="' + o.fg + '"' + (rx2 ? "" : ' shape-rendering="crispEdges"') + "/>";
      }
    });
    if (back && o.fondoLogo !== "no") {
      var fb = o.transp ? "#ffffff" : o.bg;
      s += redondoLogo ? '<circle cx="' + c + '" cy="' + c + '" r="' + r2(back / 2) + '" fill="' + fb + '"/>' : '<rect x="' + r2(c - back / 2) + '" y="' + r2(c - back / 2) + '" width="' + r2(back) + '" height="' + r2(back) + '" rx="' + r2(back * .12) + '" fill="' + fb + '"/>';
    }
    if (Ls) s += '<image x="' + r2(c - Ls / 2) + '" y="' + r2(c - Ls / 2) + '" width="' + r2(Ls) + '" height="' + r2(Ls) + '" preserveAspectRatio="xMidYMid meet" href="' + o.logo + '" xlink:href="' + o.logo + '"/>';
    return { svg: s + "</svg>", T: T, n: n, back: back, cobertura: back ? (redondoLogo ? Math.PI / 4 : 1) * back * back / (n * n) * 100 : 0 };
  }

  /* ---- Raster y "escaneo" de prueba ---- */
  function rasterizar(svg, dim, blanco) {
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = function () {
        var cv = document.createElement("canvas"); cv.width = cv.height = dim;
        var cx = cv.getContext("2d");
        if (blanco) { cx.fillStyle = "#fff"; cx.fillRect(0, 0, dim, dim); }
        cx.drawImage(img, 0, 0, dim, dim); URL.revokeObjectURL(url); ok(cv);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error("No pude dibujar el QR")); };
      img.src = url;
    });
  }
  function leer(cv) {
    /* jsQR puede lanzar un error con imágenes de contraste muy bajo: eso cuenta como «no se pudo leer» */
    try {
      var d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height);
      var r = jsQR(d.data, d.width, d.height, { inversionAttempts: "dontInvert" });
      if (r) return { txt: r.data, inv: false };
      r = jsQR(d.data, d.width, d.height, { inversionAttempts: "onlyInvert" });
      return r ? { txt: r.data, inv: true } : null;
    } catch (e) { return null; }
  }
  function lum(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(h), n = parseInt(m[1], 16), a = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (x) { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    return .2126 * a[0] + .7152 * a[1] + .0722 * a[2];
  }
  function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

  /* ---- Pantalla ---- */
  function opciones() {
    return { fg: $("qrFg").value, bg: $("qrBg").value, transp: $("qrTransp").checked, mod: S.mod, ojo: S.ojo, margen: +$("qrMargen").value, logo: S.logo, logoPct: +$("qrLogoPct").value, fondoLogo: S.fondoLogo };
  }
  function pintarEstado(items) {
    var peor = items.some(function (i) { return i.e === "bad"; }) ? "bad" : items.some(function (i) { return i.e === "warn"; }) ? "warn" : "ok";
    var tit = { ok: "Se lee bien", warn: "Se lee, pero revisá estos puntos", bad: "No es confiable: revisá estos puntos" }[peor];
    $("qrBadge").className = "qr-badge qr-" + peor; $("qrBadge").textContent = tit;
    var ic = { ok: "✓", warn: "!", bad: "✕", info: "i" };
    $("qrChk").innerHTML = items.map(function (i) { return '<li class="qr-' + i.e + '"><span class="qr-ic" aria-hidden="true">' + ic[i.e] + '</span><span><b>' + i.t + "</b> " + i.d + "</span></li>"; }).join("");
  }
  function vacio(msg) {
    S.ultimo = null; lienzo.innerHTML = '<p class="qr-vacio">' + msg + "</p>"; lienzo.classList.remove("transp");
    $("qrBadge").className = "qr-badge"; $("qrBadge").textContent = "Todavía no hay QR"; $("qrChk").innerHTML = ""; $("qrContenido").textContent = "";
    $("qrPng").disabled = $("qrSvg").disabled = true;
  }
  function actualizar() {
    var mia = ++token, c = contenido();
    if (!c.txt) { vacio(c.falta || "Completá los datos para ver tu QR."); return; }
    var conLogo = !!S.logo, res = crear(c.txt, S.ecl, conLogo);
    if (!res) { vacio("Ese contenido es demasiado largo para un QR. Acortalo."); return; }
    var o = opciones(), g = dibujar(res.q, o, 1024);
    lienzo.innerHTML = g.svg.replace(/ width="1024" height="1024"/, ""); lienzo.classList.toggle("transp", o.transp);
    $("qrContenido").textContent = "Contenido: " + (c.txt.length > 160 ? c.txt.slice(0, 160) + "…" : c.txt).replace(/\r?\n/g, " ↵ ");
    S.ultimo = { q: res.q, o: o, txt: c.txt };
    $("qrPng").disabled = $("qrSvg").disabled = false;
    var escala = Math.max(1, Math.round(S.px / g.T)); $("qrPng").textContent = "Descargar PNG · " + escala * g.T + " px";

    var grande = Math.max(2, Math.ceil(520 / g.T)) * g.T;
    rasterizar(dibujar(res.q, o, grande).svg, grande, true).then(function (cv) {
      if (mia !== token) return;
      var r1 = leer(cv), ch = document.createElement("canvas"); ch.width = ch.height = 200;
      var cx = ch.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(cv, 0, 0, 200, 200);
      var r2_ = leer(ch), it = [];
      if (r1 && r1.txt === c.txt && !r1.inv) it.push({ e: "ok", t: "Prueba de escaneo:", d: "lo escaneé con un lector de QR y abrió exactamente lo que escribiste." });
      else if (r1 && r1.txt === c.txt) it.push({ e: "warn", t: "Prueba de escaneo:", d: "solo se lee en lectores que aceptan colores invertidos. Usá módulos oscuros sobre fondo claro." });
      else if (r1) it.push({ e: "bad", t: "Prueba de escaneo:", d: "se leyó, pero con un contenido distinto al que escribiste. No lo uses así." });
      else it.push({ e: "bad", t: "Prueba de escaneo:", d: "no se pudo leer. Probá con más contraste, un logo más chico, más margen o una corrección de errores más alta." });
      if (r2_ && r2_.txt === c.txt && !r2_.inv) it.push({ e: "ok", t: "Tamaño chico:", d: "también se lee reducido a 200 px (unos 1,7 cm impresos a 300 ppp)." });
      else it.push({ e: r1 ? "warn" : "bad", t: "Tamaño chico:", d: "reducido a 200 px (unos 1,7 cm impresos) ya no se lee. Si lo vas a imprimir chico, simplificá el estilo o achicá el logo." });
      var cr = contraste(o.fg, o.transp ? "#ffffff" : o.bg), fgMasClaro = lum(o.fg) > lum(o.transp ? "#ffffff" : o.bg);
      it.push(cr >= 4.5 && !fgMasClaro ? { e: "ok", t: "Contraste " + cr.toFixed(1).replace(".", ",") + ":1:", d: "los módulos se distinguen bien del fondo." } :
        cr >= 3 ? { e: "warn", t: "Contraste " + cr.toFixed(1).replace(".", ",") + ":1:", d: fgMasClaro ? "los módulos son más claros que el fondo: algunos lectores no leen QR invertidos." : "es justo. Lo ideal es 4,5:1 o más." } :
          { e: "bad", t: "Contraste " + cr.toFixed(1).replace(".", ",") + ":1:", d: "es muy bajo. Oscurecé los módulos o aclará el fondo." });
      if (o.logo) { var p = g.cobertura; it.push(p <= 15 ? { e: "ok", t: "Logo:", d: "tapa cerca del " + Math.round(p) + "% del código. Está dentro de lo seguro." } : p <= 22 ? { e: "warn", t: "Logo:", d: "tapa cerca del " + Math.round(p) + "% del código. Está al límite: confiá en la prueba de escaneo y probalo también con tu celular." } : { e: "bad", t: "Logo:", d: "tapa cerca del " + Math.round(p) + "% del código. Es demasiado grande: achicalo." }); }
      it.push(o.margen >= 4 ? { e: "ok", t: "Margen:", d: o.margen + " módulos de aire alrededor, como recomienda el estándar." } : { e: "warn", t: "Margen:", d: "con menos de 4 módulos de aire algunos lectores fallan, sobre todo si hay otros elementos pegados." });
      if (o.transp) it.push({ e: "info", t: "Fondo transparente:", d: "la prueba se hizo sobre blanco. Si lo ponés sobre otro color, comprobá el contraste ahí." });
      it.push({ e: "info", t: "Tamaño mínimo impreso:", d: "no lo imprimas menor a " + Math.max(2, Math.ceil(g.T * 0.5 / 10 * 2) / 2).toString().replace(".", ",") + " cm de lado (con el margen incluido)." });
      if (o.ojo !== "cuadrado" || o.mod === "punto") it.push({ e: "warn", t: "Estilo decorativo:", d: "los celulares actuales suelen leer " + (o.mod === "punto" ? "los puntos" : "las esquinas redondeadas") + " sin problema, pero algunos lectores más viejos fallan. Probalo con tu celular (y con uno de otra marca) antes de imprimir." });
      it.push({ e: res.bajo ? "warn" : "info", t: "Corrección de errores " + res.nivel + ":", d: res.bajo ? "el contenido es largo y no entraba con el nivel pedido, así que usé uno más bajo. Con logo conviene acortar el contenido." : "permite que el código se lea aunque una parte esté tapada o dañada (con logo se sube sola)." });
      pintarEstado(it);
    }, function () { if (mia === token) pintarEstado([{ e: "bad", t: "No pude hacer la prueba de escaneo.", d: "Probá de nuevo o con otro logo." }]); });
  }
  function prog() { clearTimeout(temporizador); temporizador = setTimeout(actualizar, 130); }

  /* ---- Descargas ---- */
  function bajar(blob, nombre) {
    var u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function nombreBase() { return "qr-" + S.tipo; }
  $("qrSvg").addEventListener("click", function () {
    if (!S.ultimo) return;
    bajar(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + dibujar(S.ultimo.q, S.ultimo.o, 1024).svg], { type: "image/svg+xml" }), nombreBase() + ".svg");
  });
  $("qrPng").addEventListener("click", function () {
    if (!S.ultimo) return;
    var g = dibujar(S.ultimo.q, S.ultimo.o), dim = Math.max(1, Math.round(S.px / g.T)) * g.T;
    rasterizar(dibujar(S.ultimo.q, S.ultimo.o, dim).svg, dim, false).then(function (cv) { cv.toBlob(function (b) { bajar(b, nombreBase() + "-" + dim + "px.png"); }, "image/png"); });
  });

  /* ---- Controles ---- */
  function chips(id, attr, fn) {
    var g = $(id); if (!g) return;
    g.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll(".chip"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      fn(b.getAttribute(attr)); mostrar(); prog();
    });
  }
  function mostrar() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-f]"), function (p) { p.hidden = p.getAttribute("data-f") !== S.tipo; });
    $("qrLogoOpc").hidden = !S.logo;
    $("qrMargenV").textContent = $("qrMargen").value; $("qrLogoV").textContent = $("qrLogoPct").value + "%";
    $("qrBg").disabled = $("qrTransp").checked;
  }
  chips("qrTipo", "data-t", function (x) { S.tipo = x; });
  chips("qrMod", "data-m", function (x) { S.mod = x; });
  chips("qrOjo", "data-o", function (x) { S.ojo = x; });
  chips("qrEcl", "data-e", function (x) { S.ecl = x; });
  chips("qrPxG", "data-p", function (x) { S.px = +x; });
  chips("qrFondoLogo", "data-b", function (x) { S.fondoLogo = x; });
  ["qrUrl", "qrRed", "qrUser", "qrWaNum", "qrWaMsg", "qrNom", "qrTel", "qrMail", "qrWeb", "qrOrg", "qrTexto", "qrFg", "qrBg", "qrTransp", "qrMargen", "qrLogoPct"].forEach(function (id) {
    $(id).addEventListener("input", function () { mostrar(); prog(); });
    $(id).addEventListener("change", function () { mostrar(); prog(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-par]"), function (b) {
    b.addEventListener("click", function () { var p = b.getAttribute("data-par").split("/"); $("qrFg").value = p[0]; $("qrBg").value = p[1]; $("qrTransp").checked = false; mostrar(); prog(); });
  });
  $("qrLogo").addEventListener("change", function () {
    var f = this.files[0]; this.value = ""; $("qrLogoMsg").textContent = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) { $("qrLogoMsg").textContent = "Ese archivo no es una imagen."; return; }
    if (f.size > 6 * 1024 * 1024) { $("qrLogoMsg").textContent = "La imagen pesa más de 6 MB. Usá una más liviana."; return; }
    var fr = new FileReader();
    fr.onload = function () {
      if (f.type === "image/svg+xml") { S.logo = fr.result; mostrar(); prog(); return; }
      var im = new Image();
      im.onload = function () {
        var e = Math.min(1, 480 / Math.max(im.width, im.height)), cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(im.width * e)); cv.height = Math.max(1, Math.round(im.height * e));
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); S.logo = cv.toDataURL("image/png"); mostrar(); prog();
      };
      im.onerror = function () { $("qrLogoMsg").textContent = "No pude abrir esa imagen."; };
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  });
  $("qrLogoQuitar").addEventListener("click", function () { S.logo = null; mostrar(); prog(); });
  mostrar(); actualizar();
})();
