/* qfadesign — Conversor de unidades (Herramientas), versión simple.
   Se escribe una medida, se elige su unidad y la resolución, y se ve cuánto es en las otras tres.
   Base: 1 pulgada = 25,4 mm = 72 pt = (ppp) px. Puntos, mm y cm son medidas físicas; los px dependen de la resolución. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var val = $("unVal");
  if (!val) return;

  var err = $("unErr"), cards = $("unCards"), frase = $("unFrase"), copiado = $("unCopiado");
  var chipsU = $("unU").querySelectorAll(".chip"), chipsD = $("unD").querySelectorAll(".chip");
  var otraL = $("unOtraL"), dpiIn = $("unDpi");
  var unidad = "mm", dpi = 300, otra = false, tCopia = null;

  var ORDEN = ["px", "pt", "mm", "cm"];
  var NOMBRE = { px: "píxeles", pt: "puntos", mm: "milímetros", cm: "centímetros" };
  var aPulg = { px: function (v) { return v / dpi; }, pt: function (v) { return v / 72; }, mm: function (v) { return v / 25.4; }, cm: function (v) { return v / 2.54; } };
  var dePulg = { px: function (i) { return i * dpi; }, pt: function (i) { return i * 72; }, mm: function (i) { return i * 25.4; }, cm: function (i) { return i * 2.54; } };
  var DEC = { px: 0, pt: 1, mm: 1, cm: 2 };

  function num(n, dec) { return Number(n.toFixed(dec)).toLocaleString("es-AR", { maximumFractionDigits: dec, useGrouping: false }); }
  function leer(t) {
    t = (t || "").trim().replace(/\s/g, "").replace(",", ".");
    if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  function pintar() {
    var v = leer(val.value);
    if (v == null) {
      cards.innerHTML = ""; frase.textContent = "";
      var vacio = !val.value.trim();
      err.hidden = vacio;
      val.setAttribute("aria-invalid", vacio ? "false" : "true");
      if (vacio) val.removeAttribute("aria-invalid");
      return;
    }
    err.hidden = true; val.removeAttribute("aria-invalid");
    var i = aPulg[unidad](v);
    cards.innerHTML = ORDEN.filter(function (u) { return u !== unidad; }).map(function (u) {
      var t = num(dePulg[u](i), DEC[u]);
      return '<button class="un-card" type="button" data-t="' + t + " " + u + '" aria-label="' + t + " " + NOMBRE[u] + '. Tocá para copiar">' +
        '<span class="un-n">' + t + '</span><span class="un-u">' + u + "</span><small>Tocá para copiar</small></button>";
    }).join("");
    if (unidad === "px") frase.textContent = num(v, 0) + " px a " + dpi + " ppp se imprimen a " + num(dePulg.cm(i), 1) + " cm de ancho.";
    else frase.textContent = "Para imprimir " + num(v, 2) + " " + unidad + " a " + dpi + " ppp necesitás una imagen de " + num(dePulg.px(i), 0) + " px.";
  }

  function marcar(chips, b) { Array.prototype.forEach.call(chips, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); }

  val.addEventListener("input", pintar);
  Array.prototype.forEach.call(chipsU, function (b) {
    b.addEventListener("click", function () { unidad = b.getAttribute("data-u"); marcar(chipsU, b); pintar(); });
  });
  Array.prototype.forEach.call(chipsD, function (b) {
    b.addEventListener("click", function () {
      var d = b.getAttribute("data-d");
      marcar(chipsD, b);
      otra = d === "otra";
      otraL.hidden = !otra;
      if (otra) { dpiIn.focus(); dpiIn.select(); leerDpi(); }
      else { dpi = +d; dpiIn.value = d; pintar(); }
    });
  });
  function leerDpi() {
    var t = dpiIn.value.replace(/\D/g, "");
    if (dpiIn.value !== t) dpiIn.value = t;
    var d = parseInt(t, 10);
    if (!d || d > 9600) { dpiIn.setAttribute("aria-invalid", "true"); return; }
    dpiIn.removeAttribute("aria-invalid");
    dpi = d; pintar();
  }
  dpiIn.addEventListener("input", leerDpi);
  dpiIn.addEventListener("blur", function () { dpiIn.value = dpi; dpiIn.removeAttribute("aria-invalid"); });

  /* ---- Copiar al tocar un resultado ---- */
  function copiar(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) {
      var a = document.createElement("textarea");
      a.value = t; a.setAttribute("readonly", ""); a.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(a); a.select();
      try { document.execCommand("copy") ? ok() : no(); } catch (e) { no(e); }
      a.remove();
    });
  }
  cards.addEventListener("click", function (e) {
    var b = e.target.closest(".un-card");
    if (!b) return;
    var t = b.getAttribute("data-t");
    copiar(t).then(function () {
      var s = b.querySelector("small"), antes = "Tocá para copiar";
      b.classList.add("ok"); s.textContent = "¡Copiado!";
      copiado.textContent = ""; setTimeout(function () { copiado.textContent = "Copiado: " + t; }, 30);
      clearTimeout(tCopia);
      tCopia = setTimeout(function () { b.classList.remove("ok"); s.textContent = antes; }, 1500);
    }, function () { /* sin permiso para copiar: no pasa nada */ });
  });

  /* ---- Abrir directo con herramientas#unidades ---- */
  function abrirSiHash() {
    if (location.hash !== "#unidades") return;
    var b = $("hbu");
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }
  pintar();
  abrirSiHash();
  addEventListener("hashchange", abrirSiHash);
})();
