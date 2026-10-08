/* qfadesign — Conversor de unidades (Herramientas).
   Convierte entre px, pt, mm y cm según la resolución (ppp). Útil para pasar de pantalla a impresión.
   Base: 1 pulgada = 25,4 mm = 72 pt = (ppp) px. Puntos, mm y cm son medidas físicas; los px dependen de la resolución. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var campos = { px: $("unPx"), pt: $("unPt"), mm: $("unMm"), cm: $("unCm") };
  var dpiIn = $("unDpi");
  if (!campos.px || !dpiIn) return;

  var nota = $("unNota"), chips = $("unChips").querySelectorAll(".chip"), medsEl = $("unMeds"), res = $("unRes");
  var dpi = 300, fuente = "mm", valor = 210, medActiva = null;

  /* pulgadas <-> cada unidad */
  var aPulg = { px: function (v) { return v / dpi; }, pt: function (v) { return v / 72; }, mm: function (v) { return v / 25.4; }, cm: function (v) { return v / 2.54; } };
  var dePulg = { px: function (i) { return i * dpi; }, pt: function (i) { return i * 72; }, mm: function (i) { return i * 25.4; }, cm: function (i) { return i * 2.54; } };

  function num(n, dec) { return Number(n.toFixed(dec == null ? 3 : dec)).toLocaleString("es-AR", { maximumFractionDigits: dec == null ? 3 : dec, useGrouping: false }); }
  function leer(t) {
    t = (t || "").trim().replace(/\s/g, "").replace(",", ".");
    if (!t || !/^\d*\.?\d+$|^\d+\.$/.test(t)) return null;
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  var MEDIDAS = [
    { n: "A6", w: 105, h: 148 }, { n: "A5", w: 148, h: 210 }, { n: "A4", w: 210, h: 297 }, { n: "A3", w: 297, h: 420 },
    { n: "Carta", w: 215.9, h: 279.4 }, { n: "Tarjeta", w: 90, h: 50 }, { n: "Afiche", w: 500, h: 700 }
  ];

  function pintarNota() {
    if (valor == null) { nota.textContent = "Escribí un valor en cualquiera de los cuadros."; return; }
    var i = aPulg[fuente](valor), px = i * dpi;
    if (fuente === "px") nota.textContent = num(valor, 2) + " px a " + dpi + " ppp se imprimen a " + num(dePulg.cm(i), 2) + " cm (" + num(dePulg.mm(i), 1) + " mm).";
    else nota.textContent = "Para imprimir " + num(valor, 2) + " " + fuente + " a " + dpi + " ppp necesitás una imagen de al menos " + Math.ceil(px - 1e-9) + " px.";
  }

  function pintar() {
    var i = valor == null ? null : aPulg[fuente](valor);
    Object.keys(campos).forEach(function (u) {
      if (u === fuente && document.activeElement === campos[u]) return;   /* no pisar lo que se está escribiendo */
      campos[u].value = i == null ? "" : num(dePulg[u](i), u === "px" ? 2 : 3);
    });
    pintarNota();
    pintarMedida();
  }

  function pintarMedida() {
    if (!medActiva) { res.hidden = true; return; }
    var m = medActiva, iw = m.w / 25.4, ih = m.h / 25.4;
    res.hidden = false;
    res.innerHTML = "<b>" + m.n + "</b> · " + num(m.w, 1) + " × " + num(m.h, 1) + " mm · " + num(m.w / 10, 2) + " × " + num(m.h / 10, 2) + " cm · " + num(iw * 72, 1) + " × " + num(ih * 72, 1) + " pt · <b>" + Math.round(iw * dpi) + " × " + Math.round(ih * dpi) + " px</b> a " + dpi + " ppp";
  }

  /* ---- Escribir en un cuadro ---- */
  Object.keys(campos).forEach(function (u) {
    campos[u].addEventListener("input", function () {
      var v = leer(campos[u].value);
      if (campos[u].value.trim() && v == null) { campos[u].setAttribute("aria-invalid", "true"); return; }
      campos[u].removeAttribute("aria-invalid");
      fuente = u; valor = v; pintar();
    });
    campos[u].addEventListener("blur", function () { campos[u].removeAttribute("aria-invalid"); pintar(); });
  });

  /* ---- Resolución ---- */
  function ponerDpi(d) {
    dpi = d;
    dpiIn.value = d;
    dpiIn.removeAttribute("aria-invalid");
    Array.prototype.forEach.call(chips, function (c) { c.setAttribute("aria-pressed", +c.getAttribute("data-d") === d ? "true" : "false"); });
    pintar();
  }
  Array.prototype.forEach.call(chips, function (c) { c.addEventListener("click", function () { ponerDpi(+c.getAttribute("data-d")); }); });
  dpiIn.addEventListener("input", function () {
    var t = dpiIn.value.replace(/\D/g, "");
    if (dpiIn.value !== t) dpiIn.value = t;
    var d = parseInt(t, 10);
    if (!d || d < 1 || d > 9600) { dpiIn.setAttribute("aria-invalid", "true"); return; }
    dpiIn.removeAttribute("aria-invalid");
    dpi = d;
    Array.prototype.forEach.call(chips, function (c) { c.setAttribute("aria-pressed", +c.getAttribute("data-d") === d ? "true" : "false"); });
    pintar();
  });
  dpiIn.addEventListener("blur", function () { dpiIn.value = dpi; dpiIn.removeAttribute("aria-invalid"); });

  /* ---- Medidas comunes ---- */
  MEDIDAS.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", "false"); b.textContent = m.n;
    b.addEventListener("click", function () {
      var on = medActiva === m;
      medActiva = on ? null : m;
      Array.prototype.forEach.call(medsEl.children, function (x) { x.setAttribute("aria-pressed", "false"); });
      if (!on) b.setAttribute("aria-pressed", "true");
      pintarMedida();
    });
    medsEl.appendChild(b);
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
