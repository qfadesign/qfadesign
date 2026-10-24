/* qfadesign: tarjeta colgante de "Acerca de".
   Arma las dos caras de la tarjeta (frente con tu foto, dorso con texto sobre vos) y la cinta con canvas,
   y se las pasa a Lanyard (js/vendor/lanyard.js). Si algo falla (sin WebGL, por ejemplo), la página
   sigue mostrando la foto de siempre (<img class="ah-foto">).
   Para cambiar textos y colores tocá solo lo que está dentro de CONFIG y TEXTO. */
(function () {
  var host = document.getElementById('lanyard');
  if (!host || !window.Lanyard) return;

  /* ---------- CONFIG ---------- */
  var CONFIG = {
    foto: 'img/perfil-sin-fondo.webp',
    logo: 'img/Marca_qfadesign_blanco.svg',
    crema: '#f9fbf2',          // marco de la tarjeta
    azul: '#0b75f4', azulOscuro: '#0847a3', noche: '#06214d',
    cinta: { fondo: '#f9fbf2', tinta: '#0b75f4', texto: 'qfadesign' }
  };
  var TEXTO = {
    frenteNombre: 'Facundo Cruz',
    frenteRol: 'Diseñador en Comunicación Visual',
    dorsoTitulo: 'Diseñar es tomar decisiones.',
    dorsoParrafo: 'Primero entiendo qué necesita una marca y a quién le habla. De ahí salen el concepto, el color, la tipografía y el sistema: que cada pieza tenga una razón de ser.',
    dorsoDatos: [
      ['Especialidad', 'Branding e identidad visual'],
      ['También', 'Motion, editorial, social y web'],
      ['Lo más completo', 'Bleko: un manual de marca de 37 páginas'],
      ['Uso', 'Illustrator · Photoshop · After Effects · Figma']
    ],
    dorsoPie: '@qfadesign'
  };

  var W = 900, H = Math.round(900 / 0.63);
  var FH = '"articulat-heavy-cf","articulat-cf",system-ui,sans-serif';
  var FR = '"articulat-cf",system-ui,sans-serif';

  function img(src) {
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = new Promise(function (ok) { setTimeout(ok, 2500); });
    var f = Promise.all([
      document.fonts.load('italic 900 60px "articulat-heavy-cf"'),
      document.fonts.load('400 30px "articulat-cf"'),
      document.fonts.load('italic 300 30px "articulat-cf"')
    ]).catch(function () {});
    return Promise.race([f, t]);
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function wrap(g, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur); return lines;
  }
  function fit(g, text, font, px, maxW) {          // achica la letra hasta que entre en maxW
    do { g.font = font.replace('{px}', px); px -= 2; } while (g.measureText(text).width > maxW && px > 20);
    return px + 2;
  }
  function canvas() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  /* ---------- FRENTE ---------- */
  function frente(foto, logo) {
    var c = canvas(), g = c.getContext('2d');
    g.fillStyle = CONFIG.crema; g.fillRect(0, 0, W, H);
    var m = 34, px = m, py = m, pw = W - m * 2, ph = H - m * 2;
    g.save(); rr(g, px, py, pw, ph, 58); g.clip();
    var gr = g.createLinearGradient(0, py, 0, py + ph);
    gr.addColorStop(0, '#2a93ff'); gr.addColorStop(.45, CONFIG.azul); gr.addColorStop(1, CONFIG.azulOscuro);
    g.fillStyle = gr; g.fillRect(px, py, pw, ph);
    var rg = g.createRadialGradient(W * .85, py + 120, 10, W * .85, py + 120, 640);
    rg.addColorStop(0, 'rgba(255,255,255,.30)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(px, py, pw, ph);
    if (foto) {                                           // retrato grande, apoyado abajo
      var s = 1.22, dw = foto.width * s, dh = foto.height * s;
      g.drawImage(foto, W / 2 - dw * .52, py + ph - dh + 6, dw, dh);
    }
    var sh = g.createLinearGradient(0, py + ph - 520, 0, py + ph);   // sombra para que se lea el nombre
    sh.addColorStop(0, 'rgba(3,24,70,0)'); sh.addColorStop(1, 'rgba(3,24,70,.82)');
    g.fillStyle = sh; g.fillRect(px, py + ph - 520, pw, 520);
    g.restore();
    if (logo) g.drawImage(logo, px + 52, py + 56, 300, 300 * logo.height / logo.width);
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    var f = fit(g, TEXTO.frenteNombre, 'italic 900 {px}px ' + FH, 112, pw - 104);
    g.font = 'italic 900 ' + f + 'px ' + FH;
    g.fillText(TEXTO.frenteNombre, px + 52, py + ph - 128);
    g.font = 'italic 300 36px ' + FR; g.globalAlpha = .95;
    g.fillText(TEXTO.frenteRol, px + 54, py + ph - 70); g.globalAlpha = 1;
    return c;
  }

  /* ---------- DORSO ---------- */
  function barras(g, x, y, w, h) {
    var s = 'QFADESIGN', xx = x; g.fillStyle = '#fff';
    for (var i = 0; i < s.length && xx < x + w - 6; i++) {
      var code = s.charCodeAt(i);
      for (var b = 0; b < 6; b++) {
        var bw = 2 + ((code >> b) & 3) * 2;
        if (b % 2 === 0) g.fillRect(xx, y, bw, h);
        xx += bw + 2;
      }
      xx += 6;
    }
  }
  function dorso(logo) {
    var c = canvas(), g = c.getContext('2d');
    g.fillStyle = CONFIG.crema; g.fillRect(0, 0, W, H);
    var m = 34, px = m, py = m, pw = W - m * 2, ph = H - m * 2;
    g.save(); rr(g, px, py, pw, ph, 58); g.clip();
    var gr = g.createLinearGradient(0, py, 0, py + ph);
    gr.addColorStop(0, CONFIG.azulOscuro); gr.addColorStop(1, CONFIG.noche);
    g.fillStyle = gr; g.fillRect(px, py, pw, ph);
    var rg = g.createRadialGradient(px + 80, py + 40, 10, px + 80, py + 40, 760);
    rg.addColorStop(0, 'rgba(11,117,244,.65)'); rg.addColorStop(1, 'rgba(11,117,244,0)');
    g.fillStyle = rg; g.fillRect(px, py, pw, ph);
    g.restore();
    var x = px + 56, w = pw - 112, y = py + 56;
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (logo) g.drawImage(logo, x, y, 250, 250 * logo.height / logo.width);
    g.font = '700 italic 22px ' + FR; g.textAlign = 'right'; g.globalAlpha = .75;
    g.fillText('A C E R C A   D E   M Í', x + w, y + 36); g.globalAlpha = 1; g.textAlign = 'left';

    y += 150;
    g.font = 'italic 900 78px ' + FH;
    wrap(g, TEXTO.dorsoTitulo, w).forEach(function (l) { g.fillText(l, x, y); y += 80; });
    y += 16;
    g.font = '400 33px ' + FR; g.globalAlpha = .92;
    wrap(g, TEXTO.dorsoParrafo, w).forEach(function (l) { g.fillText(l, x, y); y += 47; });
    g.globalAlpha = 1; y += 18;

    TEXTO.dorsoDatos.forEach(function (d) {
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, y, w, 2);
      g.fillStyle = '#fff'; g.globalAlpha = .7; g.font = '700 italic 21px ' + FR;
      g.fillText(d[0].toUpperCase().split('').join(' '), x, y + 40); g.globalAlpha = 1;
      g.font = '400 31px ' + FR;
      var ls = wrap(g, d[1], w), yy = y + 82;
      ls.forEach(function (l) { g.fillText(l, x, yy); yy += 40; });
      y = yy - 40 + 28;
    });
    var by = py + ph - 150;
    barras(g, x, by, 330, 70);
    g.fillStyle = '#fff'; g.font = 'italic 900 40px ' + FH; g.textAlign = 'right';
    g.fillText(TEXTO.dorsoPie, x + w, by + 36);
    g.font = 'italic 300 26px ' + FR; g.globalAlpha = .85; g.fillText('qfadesign.com', x + w, by + 74); g.globalAlpha = 1;
    return c;
  }

  /* ---------- CINTA ---------- */
  function cinta() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 1024;
    var g = c.getContext('2d'), k = CONFIG.cinta;
    g.fillStyle = k.fondo; g.fillRect(0, 0, 256, 1024);
    g.fillStyle = 'rgba(0,0,0,.07)';                      // costuras a los lados
    for (var y = 0; y < 1024; y += 14) { g.fillRect(14, y, 2, 7); g.fillRect(240, y, 2, 7); }
    g.save(); g.translate(128, 512); g.rotate(Math.PI / 2);   // el texto se lee de arriba hacia abajo
    g.fillStyle = k.tinta; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 900 112px ' + FH;
    g.fillText(k.texto, 0, -8);
    g.restore();
    return c;
  }

  /* el lienzo sube hasta el borde de arriba de la página: así la cinta nace desde la pantalla y no se corta a mitad de camino */
  function setExt() {
    host.style.setProperty('--lany-ext', '0px');                      // se mide con el lienzo sin estirar
    var top = host.getBoundingClientRect().top + window.scrollY;
    host.style.setProperty('--lany-ext', Math.max(0, Math.round(top)) + 'px');
  }
  setExt(); window.addEventListener('resize', setExt);

  Promise.all([fonts(), img(CONFIG.foto), img(CONFIG.logo)]).then(function (r) {
    var foto = r[1], logo = r[2];
    var inst = window.Lanyard(host, {
      frontImage: frente(foto, logo), backImage: dorso(logo), strapImage: cinta(),
      imageFit: 'cover', cardColor: CONFIG.crema, orientation: 'portrait', finish: 'glossy',
      cornerRadius: 0.3, size: 0.6, anchor: 'center', strapLength: 0.5, strapColor: '#f9fbf2',
      strapWidth: 0.65, metal: 'silver', gravity: 1, damping: 0.5, elasticity: 0.5, breeze: 0.5,
      interactive: true, intro: true
    });
    if (inst) window.__lanyard = inst;
  });
})();
