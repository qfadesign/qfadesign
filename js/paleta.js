/* qfadesign — Generador de paletas (Herramientas).
   El visitante sube una imagen y se le devuelven sus colores principales en HEX, RGB y CMYK.
   Todo pasa en el navegador: la imagen no se envía a ningún servidor.
   Método: se reduce la imagen, se agrupan los píxeles en un histograma y se aplica k-means ponderado. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var drop = $("plDrop"), file = $("plFile");
  if (!drop || !file) return;

  var MAX_LADO = 140;            /* la imagen se reduce a este lado máximo antes de analizarla */
  var MAX_BYTES = 30 * 1024 * 1024;
  var cab = $("plTop"), prev = $("plPrev"), img = $("plImg"), ctl = $("plCtl"), rango = $("plN"), valN = $("plNv");
  var sw = $("plSw"), estado = $("plEstado"), nota = $("plNota"), todo = $("plAll"), otra = $("plOtra");
  var urlActual = null, histograma = null, paleta = [], tCopiado = null;

  function avisar(t) { estado.textContent = ""; setTimeout(function () { estado.textContent = t; }, 30); }

  /* ---- Formatos ---- */
  function h2(n) { var s = n.toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }
  function aHex(c) { return "#" + h2(c[0]) + h2(c[1]) + h2(c[2]); }
  function aRgb(c) { return "rgb(" + c[0] + ", " + c[1] + ", " + c[2] + ")"; }
  function aCmyk(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, k = 1 - Math.max(r, g, b);
    if (k >= 1) return [0, 0, 0, 100];
    return [Math.round((1 - r - k) / (1 - k) * 100), Math.round((1 - g - k) / (1 - k) * 100), Math.round((1 - b - k) / (1 - k) * 100), Math.round(k * 100)];
  }
  function cmykTxt(c) { var m = aCmyk(c); return "cmyk(" + m.join(", ") + ")"; }
  function luz(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  /* ---- Análisis de la imagen ---- */
  function histogramaDe(el, w, h) {
    var lado = Math.max(w, h), k = Math.min(1, MAX_LADO / lado);
    var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    var cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(el, 0, 0, cw, ch);
    var px = cx.getImageData(0, 0, cw, ch).data, mapa = {}, total = 0;
    for (var i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 125) continue;                         /* se ignora lo transparente */
      var key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
      var e = mapa[key] || (mapa[key] = [0, 0, 0, 0]);
      e[0] += px[i]; e[1] += px[i + 1]; e[2] += px[i + 2]; e[3]++; total++;
    }
    var lista = [];
    for (var kk in mapa) { var m = mapa[kk]; lista.push([m[0] / m[3], m[1] / m[3], m[2] / m[3], m[3]]); }
    return { lista: lista, total: total };
  }
  function d2(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; }

  function agrupar(hist, n) {
    var lista = hist.lista, total = hist.total;
    if (!lista.length) return [];
    /* se descartan los grupos minúsculos (ruido) mientras queden suficientes */
    var util = lista.filter(function (e) { return e[3] >= total * 0.0004; });
    if (util.length >= n) lista = util;
    n = Math.min(n, lista.length);
    /* semillas: el color más frecuente y después el más lejano de los ya elegidos */
    var cen = [], mejor = 0, i, j;
    for (i = 1; i < lista.length; i++) if (lista[i][3] > lista[mejor][3]) mejor = i;
    cen.push(lista[mejor].slice(0, 3));
    while (cen.length < n) {
      var bi = -1, bv = -1;
      for (i = 0; i < lista.length; i++) {
        var dm = Infinity;
        for (j = 0; j < cen.length; j++) dm = Math.min(dm, d2(lista[i], cen[j]));
        var v = dm * Math.sqrt(lista[i][3]);
        if (v > bv) { bv = v; bi = i; }
      }
      cen.push(lista[bi].slice(0, 3));
    }
    /* k-means ponderado */
    var peso = [];
    for (var it = 0; it < 10; it++) {
      var acc = cen.map(function () { return [0, 0, 0, 0]; });
      for (i = 0; i < lista.length; i++) {
        var b = 0, bd = Infinity;
        for (j = 0; j < cen.length; j++) { var dd = d2(lista[i], cen[j]); if (dd < bd) { bd = dd; b = j; } }
        var w = lista[i][3];
        acc[b][0] += lista[i][0] * w; acc[b][1] += lista[i][1] * w; acc[b][2] += lista[i][2] * w; acc[b][3] += w;
      }
      for (j = 0; j < cen.length; j++) if (acc[j][3]) cen[j] = [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]];
      peso = acc.map(function (a) { return a[3]; });
    }
    var res = cen.map(function (c, idx) {
      return { rgb: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])], p: peso[idx] / total };
    }).filter(function (c) { return c.p > 0; });
    res.sort(function (a, b) { return b.p - a.p; });
    return res;
  }

  /* ---- Pantalla ---- */
  function fila(etq, valor) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "pl-v"; b.setAttribute("data-copy", valor);
    b.setAttribute("aria-label", "Copiar " + etq + " " + valor);
    var a = document.createElement("span"); a.textContent = etq;
    var v = document.createElement("b"); v.textContent = valor;
    var c = document.createElement("i"); c.setAttribute("aria-hidden", "true"); c.textContent = "Copiar";
    b.appendChild(a); b.appendChild(v); b.appendChild(c);
    return b;
  }
  function dibujar() {
    sw.innerHTML = "";
    paleta.forEach(function (c, i) {
      var card = document.createElement("div"); card.className = "pl-c";
      var col = document.createElement("div"); col.className = "pl-col";
      col.style.background = aHex(c.rgb);
      col.style.color = luz(c.rgb) > 0.62 ? "#06214d" : "#fff";
      var tag = document.createElement("span"); tag.textContent = (c.p >= 0.01 ? Math.round(c.p * 100) : "<1") + " %";
      col.appendChild(tag);
      card.appendChild(col);
      card.appendChild(fila("HEX", aHex(c.rgb)));
      card.appendChild(fila("RGB", aRgb(c.rgb)));
      card.appendChild(fila("CMYK", cmykTxt(c.rgb)));
      sw.appendChild(card);
    });
    sw.hidden = !paleta.length; nota.hidden = !paleta.length;
  }
  function calcular() {
    if (!histograma) return;
    paleta = agrupar(histograma, +rango.value);
    dibujar();
    avisar(paleta.length + " colores extraídos de la imagen.");
  }

  /* ---- Copiar ---- */
  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, mal) {
      var t = document.createElement("textarea");
      t.value = texto; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? ok() : mal(); } catch (e) { mal(e); } finally { document.body.removeChild(t); }
    });
  }
  function marcar(btn, ok) {
    var i = btn.querySelector("i") || btn;
    var orig = btn.getAttribute("data-orig") || i.textContent;
    btn.setAttribute("data-orig", orig);
    i.textContent = ok ? "¡Copiado!" : "No se pudo";
    btn.classList.toggle("ok", ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { i.textContent = orig; btn.classList.remove("ok"); }, 1500);
  }
  sw.addEventListener("click", function (e) {
    var b = e.target.closest(".pl-v"); if (!b) return;
    var t = b.getAttribute("data-copy");
    copiar(t).then(function () { marcar(b, true); avisar("Copiado: " + t); }, function () { marcar(b, false); });
  });
  todo.addEventListener("click", function () {
    if (!paleta.length) return;
    var t = paleta.map(function (c, i) { return (i + 1) + ". " + aHex(c.rgb) + "  " + aRgb(c.rgb) + "  " + cmykTxt(c.rgb); }).join("\n");
    copiar(t).then(function () { marcar(todo, true); avisar("Paleta completa copiada."); }, function () { marcar(todo, false); });
  });

  /* ---- Carga de la imagen ---- */
  function cargar(f) {
    if (!f) return;
    if (!/^image\//.test(f.type)) { return mensaje("Ese archivo no es una imagen. Probá con JPG, PNG, WebP o GIF."); }
    if (f.size > MAX_BYTES) { return mensaje("La imagen pesa demasiado (máximo 30 MB)."); }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      try {
        histograma = histogramaDe(im, im.naturalWidth || im.width, im.naturalHeight || im.height);
      } catch (e) { URL.revokeObjectURL(url); return mensaje("No pude analizar esa imagen."); }
      if (urlActual) URL.revokeObjectURL(urlActual);
      urlActual = url; img.src = url;
      prev.hidden = false; ctl.hidden = false; cab.classList.add("tiene");
      mensaje("");
      if (!histograma.total) { paleta = []; dibujar(); return mensaje("La imagen es transparente: no hay colores para extraer."); }
      calcular();
    };
    im.onerror = function () { URL.revokeObjectURL(url); mensaje("No pude leer esa imagen. Probá con JPG, PNG o WebP."); };
    im.src = url;
  }
  function mensaje(t) {
    var m = $("plMsg"); m.textContent = t; m.hidden = !t;
    if (t) avisar(t);
  }

  file.addEventListener("change", function () { cargar(file.files && file.files[0]); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) { cargar(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  rango.addEventListener("input", function () { valN.textContent = rango.value; calcular(); });
  otra.addEventListener("click", function () { file.click(); });
})();
