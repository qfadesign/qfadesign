/* qfadesign — Concepto del día (Wordle de diseño): lo que comparten la página del juego y el banner de Jueguitos.
   · El "día" es el de Argentina (UTC-3, sin horario de verano): así el concepto es el mismo para todos, estén donde estén.
   · La semana va de lunes a domingo (también hora de Argentina) y es la que usa el ranking semanal.
   · El progreso, la racha y los puntos se guardan en este navegador (localStorage); si no se puede guardar, el juego anda igual pero sin racha.
   Estado de un día: {g:['PALABRA',...], pista:0|1, fin:0|1, ok:0|1, n:intentos, p:puntos}
   API: QFAConcepto.hoy() · .dia(f, n) · .lunes(f) · .leer() · .estado(f) · .guardar(f, est) · .racha() · .semana() */
(function () {
  "use strict";
  var LS = "qfa-concepto";
  var HUSO = -3 * 3600 * 1000;

  function hoy() { return new Date(Date.now() + HUSO).toISOString().slice(0, 10); }
  function partes(f) { var p = f.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dia(f, n) { return new Date(partes(f) + n * 864e5).toISOString().slice(0, 10); }
  /* lunes de la semana de la fecha f */
  function lunes(f) { var dow = new Date(partes(f)).getUTCDay(); return dia(f, -((dow + 6) % 7)); }

  function leer() {
    try { var h = JSON.parse(localStorage.getItem(LS)); return h && typeof h === "object" && h.dias ? h.dias : {}; } catch (e) { return {}; }
  }
  function estado(f) { return leer()[f || hoy()] || null; }
  function guardar(f, est) {
    var dias = leer();
    dias[f] = est;
    var claves = Object.keys(dias).sort();
    while (claves.length > 400) delete dias[claves.shift()];
    try { localStorage.setItem(LS, JSON.stringify({ dias: dias })); } catch (e) { /* sin almacenamiento */ }
    return est;
  }

  /* racha: días seguidos jugados (ganados o no). Si todavía no jugaste hoy, sigue viva mientras hayas jugado ayer. */
  function racha() {
    var dias = leer(), h = hoy(), hecho = !!(dias[h] && dias[h].fin);
    var cur = hecho ? h : dia(h, -1), n = 0;
    while (dias[cur] && dias[cur].fin) { n++; cur = dia(cur, -1); }
    var mejor = 0, run = 0, prev = null;
    Object.keys(dias).sort().forEach(function (f) {
      if (!dias[f].fin) return;
      run = prev && dia(prev, 1) === f ? run + 1 : 1;
      if (run > mejor) mejor = run;
      prev = f;
    });
    return { actual: n, mejor: Math.max(mejor, n), jugadoHoy: hecho, enCurso: !!(dias[h] && !dias[h].fin && dias[h].g && dias[h].g.length), hoy: dias[h] || null };
  }

  /* puntos de esta semana en este navegador (el ranking semanal suma lo mismo, pero en el servidor) */
  function semana() {
    var dias = leer(), l = lunes(hoy()), t = 0, jugados = 0;
    for (var i = 0; i < 7; i++) { var d = dias[dia(l, i)]; if (d && d.fin) { t += d.p || 0; jugados++; } }
    return { puntos: t, dias: jugados, lunes: l };
  }

  window.QFAConcepto = { hoy: hoy, dia: dia, lunes: lunes, leer: leer, estado: estado, guardar: guardar, racha: racha, semana: semana };
})();
