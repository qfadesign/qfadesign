/* qfadesign — Desafío diario de Jueguitos: la parte compartida entre la página del desafío y la tarjeta de Jueguitos.
   · El "día" es el de Argentina (UTC-3, sin horario de verano): así el color es el mismo para todos, estén donde estén.
   · El color del día sale de la fecha (misma fecha => mismo color), sin servidor.
   · La racha y el historial se guardan en este navegador (localStorage); si no se puede guardar, el juego anda igual pero sin racha.
   API: QFADesafio.hoy() · .ayer(f) · .color(f) · .puntaje(color, intento) · .historial() · .guardar(f, dato) · .racha() */
(function () {
  "use strict";
  var LS = "qfa-desafio";
  var HUSO = -3 * 3600 * 1000;

  function hoy() { return new Date(Date.now() + HUSO).toISOString().slice(0, 10); }
  function dia(f, n) {
    var p = f.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function ayer(f) { return dia(f || hoy(), -1); }
  function larga(f) {
    var p = f.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
    var t = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* generador pseudoaleatorio con semilla (mismo texto => misma secuencia) */
  function semilla(txt) {
    var h = 1779033703 ^ txt.length;
    for (var i = 0; i < txt.length; i++) { h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0);
    };
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hslARgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
  }
  /* color del día: tono libre, saturación y luminosidad acotadas para que no salgan grises ni casi negros */
  function color(f) {
    var rnd = mulberry(semilla("qfa-diario|" + (f || hoy()))());
    return hslARgb(Math.floor(rnd() * 360), 45 + Math.floor(rnd() * 50), 32 + Math.floor(rnd() * 38));
  }

  /* puntaje de 0 a 1000: 1000 es clavar el color; cada punto de distancia RGB resta 4 */
  function distancia(a, b) { return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)); }
  function puntaje(objetivo, intento) { return Math.max(0, Math.min(1000, Math.round(1000 - distancia(objetivo, intento) * 4))); }
  function precision(objetivo, intento) { return Math.max(0, Math.round((1 - distancia(objetivo, intento) / Math.sqrt(3 * 255 * 255)) * 100)); }

  function historial() {
    try { var h = JSON.parse(localStorage.getItem(LS)); return h && typeof h === "object" && h.dias ? h.dias : {}; } catch (e) { return {}; }
  }
  function guardar(f, dato) {
    var dias = historial();
    if (dias[f]) return dias[f];                    /* un solo intento por día */
    dias[f] = dato;
    var claves = Object.keys(dias).sort();
    while (claves.length > 400) delete dias[claves.shift()];
    try { localStorage.setItem(LS, JSON.stringify({ dias: dias })); } catch (e) { /* sin almacenamiento */ }
    return dato;
  }

  /* racha: días seguidos jugados. Si todavía no jugaste hoy, sigue viva mientras hayas jugado ayer. */
  function racha() {
    var dias = historial(), h = hoy(), jugado = !!dias[h];
    var cur = jugado ? h : ayer(h), n = 0;
    while (dias[cur]) { n++; cur = ayer(cur); }
    var mejor = 0, run = 0, prev = null;
    Object.keys(dias).sort().forEach(function (f) { run = prev && dia(prev, 1) === f ? run + 1 : 1; if (run > mejor) mejor = run; prev = f; });
    return { actual: n, mejor: Math.max(mejor, n), jugadoHoy: jugado, total: Object.keys(dias).length, hoy: dias[h] || null };
  }

  window.QFADesafio = { hoy: hoy, ayer: ayer, larga: larga, color: color, puntaje: puntaje, precision: precision, historial: historial, guardar: guardar, racha: racha };
})();
