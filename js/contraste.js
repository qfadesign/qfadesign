/* qfadesign — Contraste de color (Herramientas).
   El visitante elige color de texto y de fondo y se le dice si cumple WCAG 2.1 (AA / AAA).
   Si no cumple, se proponen colores parecidos que sí cumplen (se cambia solo la luminosidad, el tono se mantiene).
   Todo pasa en el navegador. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var inTxt = $("ctTxt"), inFon = $("ctFon");
  if (!inTxt || !inFon) return;

  var pkTxt = $("ctTxtP"), pkFon = $("ctFonP"), prev = $("ctPrev"), err = $("ctErr");
  var elRatio = $("ctRatio"), elVer = $("ctVer"), lista = $("ctChk"), sug = $("ctSug"), estado = $("ctEstado");
  var INICIO = { t: "#FFFFFF", f: "#0B75F4" };
  var txt = [255, 255, 255], fon = [11, 117, 244];
  var tEstado = null;

  /* ---- Lectura de colores: #RGB, #RRGGBB (con o sin #) y rgb(r, g, b) ---- */
  function leer(v) {
    v = (v || "").trim();
    var m = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    m = v.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i);
    if (m) {
      var c = [+m[1], +m[2], +m[3]];
      if (c.every(function (n) { return n <= 255; })) return c;
    }
    return null;
  }
  function h2(n) { var s = n.toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }
  function hex(c) { return "#" + h2(c[0]) + h2(c[1]) + h2(c[2]); }

  /* ---- Contraste WCAG ---- */
  function lum(c) {
    var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function ratio(a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  /* se redondea a 2 decimales, pero nunca se muestra un umbral (3, 4,5 o 7) que en realidad no se alcanza */
  function fmt(r) {
    var x = Math.round(r * 100) / 100;
    [3, 4.5, 7].forEach(function (t) { if (r < t && x >= t) x = t - 0.01; });
    return x.toFixed(2).replace(".", ",");
  }

  /* ---- HSL para ajustar la luminosidad sin cambiar el tono ---- */
  function aHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var l = (mx + mn) / 2, s = 0, h = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function deHsl(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (!s) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
  }

  /* Busca el color más cercano al original (mismo tono) que llega al objetivo contra el color fijo.
     Prueba aclarar y oscurecer y se queda con el cambio más chico. */
  function ajustar(mover, fijo, objetivo) {
    var hsl = aHsl(mover), mejor = null, dist = 9;
    [0, 1].forEach(function (extremo) {
      var cercano = hsl[2], lejano = extremo, c = deHsl(hsl[0], hsl[1], lejano);
      if (ratio(c, fijo) < objetivo) return;           /* en esa dirección no se llega ni al extremo */
      for (var i = 0; i < 24; i++) {
        var medio = (cercano + lejano) / 2;
        if (ratio(deHsl(hsl[0], hsl[1], medio), fijo) >= objetivo) lejano = medio; else cercano = medio;
      }
      c = deHsl(hsl[0], hsl[1], lejano);
      var guard = 0;
      while (ratio(c, fijo) < objetivo && guard++ < 200) {   /* el redondeo a enteros puede quedar apenas abajo */
        lejano += (extremo ? 1 : -1) * 0.002;
        c = deHsl(hsl[0], hsl[1], Math.min(1, Math.max(0, lejano)));
      }
      var dd = Math.abs(lejano - hsl[2]);
      if (ratio(c, fijo) >= objetivo && dd < dist) { dist = dd; mejor = c; }
    });
    return mejor;
  }

  /* ---- Pantalla ---- */
  var CRITERIOS = [
    { n: "Texto normal", s: "AA", min: 4.5, d: "Párrafos y texto común" },
    { n: "Texto grande", s: "AA", min: 3, d: "Desde 24 px, o 18,66 px en negrita" },
    { n: "Texto normal", s: "AAA", min: 7, d: "El nivel más exigente" },
    { n: "Texto grande", s: "AAA", min: 4.5, d: "Desde 24 px, o 18,66 px en negrita" },
    { n: "Íconos, bordes y gráficos", s: "AA", min: 3, d: "Botones, campos, íconos con significado" }
  ];

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function opcion(clave, nuevo, nivelTxt) {
    var t = clave === "t" ? nuevo : txt, f = clave === "f" ? nuevo : fon;
    var cual = clave === "t" ? "texto" : "fondo";
    return '<button type="button" class="ct-op" data-c="' + clave + '" data-v="' + hex(nuevo) + '" aria-label="Usar ' + hex(nuevo) + " como color de " + cual + ", contraste " + fmt(ratio(t, f)) + ' a 1">' +
      '<span class="ct-mini" style="background:' + hex(f) + ";color:" + hex(t) + '" aria-hidden="true">Aa</span>' +
      '<span class="ct-op-t">Cambiar el ' + cual + "<b>" + hex(nuevo) + "</b><i>" + fmt(ratio(t, f)) + ":1 · " + nivelTxt + "</i></span>" +
      '<span class="ct-op-u" aria-hidden="true">Usar</span></button>';
  }

  /* devuelve las opciones (texto y/o fondo) para llegar a la meta; si una de ellas invierte claro/oscuro
     (por ejemplo, pasar texto blanco a casi negro) y hay otra más suave, se deja solo la suave */
  function opciones(meta, nivel) {
    var a = ajustar(txt, fon, meta), b = ajustar(fon, txt, meta);
    var invierte = function (orig, nuevo) { return (aHsl(orig)[2] > 0.5) !== (aHsl(nuevo)[2] > 0.5); };
    if (a && b) {
      if (invierte(txt, a) && !invierte(fon, b)) a = null;
      else if (invierte(fon, b) && !invierte(txt, a)) b = null;
    }
    var op = [];
    if (a) op.push(opcion("t", a, nivel));
    if (b) op.push(opcion("f", b, nivel));
    return op;
  }

  function sugerencias(r) {
    if (r >= 7) return '<p class="ct-ok">¡Listo! Cumple AAA en texto normal, el nivel más alto. No hace falta cambiar nada.</p>';
    var meta = r >= 4.5 ? 7 : 4.5, nivel = meta === 7 ? "AAA" : "AA";
    var intro = r >= 4.5 ? "Ya cumple AA. Si querés llegar a AAA para texto normal (7:1), probá con alguno de estos:"
      : (r >= 3 ? "Sirve para texto grande y elementos de interfaz, pero no para párrafos. Para texto normal (4,5:1) probá con alguno de estos:"
        : "El contraste es muy bajo, cuesta leerlo. Para llegar a AA (4,5:1) probá con alguno de estos:");
    var op = opciones(meta, nivel);
    var h = '<h4>Cómo arreglarlo</h4><p>' + intro + "</p>";
    if (!op.length) return h + '<p class="ct-ok" style="background:#f9e0e0;color:#7a1b1b">Con estos tonos no se llega a ' + nivel + " cambiando un solo color. Probá con un tono bien claro contra uno bien oscuro.</p>";
    h += '<div class="ct-sug-g">' + op.join("") + "</div>";
    if (meta === 4.5 && r < 7) {
      var o7 = opciones(7, "AAA");
      if (o7.length) h += '<p style="margin:14px 0 8px">Y si querés ir directo a AAA (7:1):</p><div class="ct-sug-g">' + o7.join("") + "</div>";
    }
    return h;
  }

  function pintar() {
    var r = ratio(txt, fon);
    prev.style.background = hex(fon);
    prev.style.color = hex(txt);
    elRatio.textContent = fmt(r) + ":1";
    var res = CRITERIOS.map(function (c) { return r >= c.min; });
    lista.innerHTML = CRITERIOS.map(function (c, i) {
      var ok = res[i];
      return '<li><b>' + c.n + " · " + c.s + " <span style=\"font-weight:400\">(" + String(c.min).replace(".", ",") + ":1)</span></b><small>" + c.d + "</small>" +
        '<span class="ct-pill ' + (ok ? "ok" : "no") + '"><span aria-hidden="true">' + (ok ? "✓" : "✕") + "</span>" + (ok ? "Cumple" : "No cumple") + "</span></li>";
    }).join("");
    var v, cls;
    if (r >= 7) { v = "Cumple AAA"; cls = "ok"; }
    else if (r >= 4.5) { v = "Cumple AA"; cls = "mid"; }
    else if (r >= 3) { v = "Solo texto grande"; cls = "mid"; }
    else { v = "No cumple"; cls = "no"; }
    elVer.className = "ct-ver " + cls;
    elVer.textContent = v;
    sug.innerHTML = sugerencias(r);
    clearTimeout(tEstado);
    tEstado = setTimeout(function () {
      estado.textContent = "Contraste " + fmt(r) + " a 1. " + v + ". Texto normal AA: " + (res[0] ? "cumple" : "no cumple") + ". AAA: " + (res[2] ? "cumple" : "no cumple") + ".";
    }, 350);
  }

  function error(msg) { err.hidden = !msg; err.textContent = msg || ""; }

  function leerCampo(input, picker, cual) {
    var c = leer(input.value);
    if (!c) {
      input.setAttribute("aria-invalid", "true");
      error("No entendí el color del " + cual + ". Probá con un HEX como #0B75F4 o con rgb(11, 117, 244).");
      return null;
    }
    input.removeAttribute("aria-invalid");
    error("");
    picker.value = hex(c).toLowerCase();
    return c;
  }
  function alEscribir(input, picker, cual, esTexto) {
    var c = leerCampo(input, picker, cual);
    if (!c) return;
    if (esTexto) txt = c; else fon = c;
    pintar();
  }
  function normalizar(input, c) { if (c) input.value = hex(c); }

  function desdePicker(picker, input, esTexto) {
    var c = leer(picker.value);
    if (!c) return;
    if (esTexto) txt = c; else fon = c;
    input.value = hex(c); input.removeAttribute("aria-invalid"); error("");
    pintar();
  }
  function poner(esTexto, c) {
    if (esTexto) { txt = c; inTxt.value = hex(c); pkTxt.value = hex(c).toLowerCase(); }
    else { fon = c; inFon.value = hex(c); pkFon.value = hex(c).toLowerCase(); }
    inTxt.removeAttribute("aria-invalid"); inFon.removeAttribute("aria-invalid"); error("");
    pintar();
  }

  inTxt.addEventListener("input", function () { alEscribir(inTxt, pkTxt, "texto", true); });
  inFon.addEventListener("input", function () { alEscribir(inFon, pkFon, "fondo", false); });
  inTxt.addEventListener("blur", function () { normalizar(inTxt, leer(inTxt.value)); if (leer(inTxt.value)) { inTxt.removeAttribute("aria-invalid"); error(""); } });
  inFon.addEventListener("blur", function () { normalizar(inFon, leer(inFon.value)); if (leer(inFon.value)) { inFon.removeAttribute("aria-invalid"); error(""); } });
  pkTxt.addEventListener("input", function () { desdePicker(pkTxt, inTxt, true); });
  pkFon.addEventListener("input", function () { desdePicker(pkFon, inFon, false); });

  $("ctSwap").addEventListener("click", function () {
    var t = txt, f = fon;
    poner(true, f); poner(false, t);
  });
  $("ctReset").addEventListener("click", function () {
    poner(true, leer(INICIO.t)); poner(false, leer(INICIO.f));
  });
  sug.addEventListener("click", function (e) {
    var b = e.target.closest(".ct-op");
    if (!b) return;
    var esTexto = b.getAttribute("data-c") === "t";
    poner(esTexto, leer(b.getAttribute("data-v")));
    (esTexto ? inTxt : inFon).focus();      /* la lista se vuelve a armar: el foco vuelve al campo que cambió */
  });

  /* ---- Abrir directo con herramientas#contraste (y #links) ---- */
  function abrirSiHash() {
    var id = { "#contraste": "hbk", "#links": "hbl" }[location.hash];
    var b = id && $(id);
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }

  pintar();
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
