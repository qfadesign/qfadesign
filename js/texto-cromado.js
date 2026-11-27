/* qfadesign — Texto cromado (Herramientas).
   Convierte un texto, o tu marca / una imagen, en metal líquido, cromo 3D o cristal, con brillos y destellos.
   Tipografías: las de la web, la tuya o cualquiera de Google Fonts (buscador; js/google-fonts-lista.js).
   Todo ocurre en tu navegador: el texto y tu marca no se envían a ningún servidor (Google solo recibe el pedido de la tipografía).
   Técnica: máscara del texto -> mapa de alturas (blur) -> normales -> mapa de reflejos (paleta) + brillo especular. */
(function (root) {
  'use strict';
  var doc = root.document;
  function mk(w, h) { var c = doc.createElement('canvas'); c.width = w; c.height = h; return c; }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- paletas (11 paradas: oscuro, medio, luz...) ---------- */
  var PAL = {
    hielo:  { n: 'Hielo',  c: ['#02050d','#0a3b94','#3b9bff','#f4fcff','#8fd3ff','#0b2766','#040a1a','#4f9dff','#e9f8ff','#0a2a70','#02050d'] },
    qfa:    { n: 'Azul qfa', c: ['#01102e','#0a5cc0','#4aa0ff','#e8f4ff','#0a5cc0','#032a66','#01102e','#2c86e8','#ffffff','#0a5cc0','#01102e'] },
    plata:  { n: 'Plata',  c: ['#050607','#6a7480','#dfe6ee','#ffffff','#9aa4b0','#2a3038','#0a0c0f','#b8c2cf','#ffffff','#59626d','#050607'] },
    costa:  { n: 'Costa',  c: ['#0a0414','#3b2a8a','#4aa8ff','#ffffff','#ff9a3d','#4a2a7a','#0a0414','#7fb6ff','#fff2e0','#ff7a2a','#0a0414'] },
    oro:    { n: 'Oro',    c: ['#120700','#7a3b00','#e0911a','#fff0b0','#ffc94d','#6b2d00','#140800','#f0a52a','#fff6cf','#8a4300','#120700'] },
    rosa:   { n: 'Rosa',   c: ['#0d0214','#5a1a9a','#ff4fd8','#fff0fb','#ff9be8','#4b1486','#0d0214','#c46bff','#ffffff','#7a22b8','#0d0214'] },
    acido:  { n: 'Ácido',  c: ['#020d05','#0b6b2e','#7dff3a','#f4ffe0','#b6ff70','#06461c','#020d05','#5dff8a','#ffffff','#0b6b2e','#020d05'] }
  };
  var LUT = {};
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  Object.keys(PAL).forEach(function (k) {
    var st = PAL[k].c.map(hex), lut = new Uint8ClampedArray(256 * 3), seg = st.length - 1;
    for (var i = 0; i < 256; i++) {
      var p = i / 255 * seg, a = Math.min(seg - 1, Math.floor(p)), f = p - a;
      for (var j = 0; j < 3; j++) lut[i * 3 + j] = st[a][j] + (st[a + 1][j] - st[a][j]) * f;
    }
    LUT[k] = lut; PAL[k].acc = st[2]; PAL[k].mid = st[5]; PAL[k].dark = st[6];
  });

  var FONTS = {
    art:   { n: 'Articulat (la de la web)', f: 'italic 900 {s}px "articulat-heavy-cf","Articulat CF",Arial,sans-serif' },
    pod:   { n: 'Podium Soft', f: '900 {s}px "Podium Var","Arial Black",sans-serif' },
    imp:   { n: 'Impact', f: '400 {s}px Impact,"Arial Black",sans-serif' },
    serif: { n: 'Serif pesada', f: 'italic 900 {s}px Georgia,"Times New Roman",serif' },
    script:{ n: 'Cursiva', f: 'italic 700 {s}px "Brush Script MT","Segoe Script","Snell Roundhand",cursive' },
    user:  { n: 'La tuya', f: '400 {s}px "crUser",Arial,sans-serif' },
    gf:    { n: 'Google Fonts', f: '' }
  };
  /* marca o imagen subida (se guarda ya decodificada: canvas o <img>) */
  var IMG = { el: null, w: 0, h: 0, alpha: false };
  var FMT = { sq: [1, 1], v: [1, 1.25], h: [1, 0.625] };

  /* ---------- blur gaussiano aproximado (3 pasadas de caja) ---------- */
  function boxH(s, d, w, h, r) {
    var n = 2 * r + 1, y, x, i, o, t;
    for (y = 0; y < h; y++) {
      o = y * w; t = 0;
      for (i = -r; i <= r; i++) t += s[o + Math.min(w - 1, Math.max(0, i))];
      for (x = 0; x < w; x++) { d[o + x] = t / n; t += s[o + Math.min(w - 1, x + r + 1)] - s[o + Math.max(0, x - r)]; }
    }
  }
  function boxV(s, d, w, h, r) {
    var n = 2 * r + 1, y, x, i, t;
    for (x = 0; x < w; x++) {
      t = 0;
      for (i = -r; i <= r; i++) t += s[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (y = 0; y < h; y++) { d[y * w + x] = t / n; t += s[Math.min(h - 1, y + r + 1) * w + x] - s[Math.max(0, y - r) * w + x]; }
    }
  }
  function blur(src, w, h, r) {
    var a = new Float32Array(src);
    if (r < 0.7) return a;
    var b = Math.max(1, Math.round(r * 0.58)), t = new Float32Array(src.length);
    for (var p = 0; p < 3; p++) { boxH(a, t, w, h, b); boxV(t, a, w, h, b); }
    return a;
  }

  /* ---------- 1. máscara del texto ---------- */
  function fontCss(o, px) {
    if (o.font === 'gf' && o.gfName) return (o.gfW || 400) + ' ' + px + 'px "' + o.gfName + '",Arial,sans-serif';
    var F = FONTS[o.font];
    return (F && F.f ? F : FONTS.art).f.replace('{s}', px);
  }
  function ss(a, b, v) { var t = cl((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  /* límites verticales del dibujo (los usa el degradé del cromo) */
  function bounds(m, W, H) {
    var top = H, bot = 0, i, y;
    for (y = 0; y < H; y += 2) for (i = 0; i < W; i += 3) if (m[y * W + i] > 0.5) { if (y < top) top = y; if (y > bot) bot = y; }
    if (bot <= top) { top = 0; bot = H; }
    return { m: m, top: top, bot: bot };
  }
  /* máscara a partir de la marca / imagen subida */
  function maskFromImage(o, W, H) {
    var c = mk(W, H), x = c.getContext('2d'), iw = IMG.w, ih = IMG.h;
    var sc = Math.min(W * 0.82 * o.size / 100 / iw, H * 0.86 * o.size / 100 / ih), dw = iw * sc, dh = ih * sc;
    x.imageSmoothingQuality = 'high';
    x.translate(W / 2, H / 2); x.rotate(o.rot * Math.PI / 180);
    x.transform(1, 0, -Math.tan(o.slant * Math.PI / 180), 1, 0, 0);
    x.drawImage(IMG.el, -dw / 2, -dh / 2, dw, dh);
    var d = x.getImageData(0, 0, W, H).data, m = new Float32Array(W * H), i, a, l, v, t = o.umbral / 100, q;
    for (i = 0; i < m.length; i++) {
      q = i * 4; a = d[q + 3] / 255;
      if (o.read === 'alpha') { m[i] = a; continue; }
      l = (0.2126 * d[q] + 0.7152 * d[q + 1] + 0.0722 * d[q + 2]) / 255;
      v = o.read === 'dark' ? 1 - (l * a + (1 - a)) : l * a;
      m[i] = ss(t - 0.1, t + 0.1, v);
    }
    if (o.ipeso) {
      var g = o.ipeso / 60, bl = blur(m, W, H, 2 + Math.abs(g) * 0.03 * W), th = 0.5 - 0.4 * g;
      for (i = 0; i < m.length; i++) m[i] = ss(th - 0.1, th + 0.1, bl[i]);
    }
    return bounds(m, W, H);
  }
  function makeMask(o, W, H) {
    if (o.src === 'img' && IMG.el) return maskFromImage(o, W, H);
    var c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    var lines = String(o.text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3);
    if (!lines.length) lines = ['qfa'];
    var f0 = 200, tr = o.track / 100;
    x.font = fontCss(o, f0);
    var widest = 1;
    lines.forEach(function (l) { widest = Math.max(widest, x.measureText(l).width + tr * f0 * (l.length - 1)); });
    var fs = f0 * (W * 0.82 * o.size / 100) / widest;
    var lh = 0.98, maxH = H * 0.86 * o.size / 100;
    if (lines.length * fs * lh > maxH) fs = maxH / (lines.length * lh);
    x.font = fontCss(o, fs);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineJoin = 'round';
    x.lineWidth = fs * o.peso / 100 * 0.14;
    var arch = o.arch / 100, per = arch !== 0 || o.track !== 0;
    lines.forEach(function (line, li) {
      x.save();
      x.translate(W / 2, H / 2 + (li - (lines.length - 1) / 2) * fs * lh);
      x.rotate(o.rot * Math.PI / 180);
      x.transform(1, 0, -Math.tan(o.slant * Math.PI / 180), 1, 0, 0);
      if (!per) { if (x.lineWidth > 0.5) x.strokeText(line, 0, 0); x.fillText(line, 0, 0); }
      else {
        var ws = line.split('').map(function (ch) { return x.measureText(ch).width; });
        var total = ws.reduce(function (a, b) { return a + b; }, 0) + tr * fs * (ws.length - 1), px = -total / 2;
        line.split('').forEach(function (ch, i) {
          var cx = px + ws[i] / 2, u = cx / (total / 2 || 1), dy = arch * fs * 0.5 * u * u, an = Math.atan(2 * arch * fs * 0.5 * u / (total / 2 || 1));
          x.save(); x.translate(cx, dy); x.rotate(an);
          if (x.lineWidth > 0.5) x.strokeText(ch, 0, 0); x.fillText(ch, 0, 0);
          x.restore(); px += ws[i] + tr * fs;
        });
      }
      x.restore();
    });
    var d = x.getImageData(0, 0, W, H).data, m = new Float32Array(W * H), i;
    for (i = 0; i < m.length; i++) m[i] = d[i * 4] / 255;
    return bounds(m, W, H);
  }

  /* ---------- 2. sombreado ---------- */
  function shade(M, W, H, o, k) {
    var m = M.m, N = W * H, st = o.style, lut = LUT[o.pal], pal = PAL[o.pal];
    var rel = Math.max(0.25, o.relieve / 50);
    var r1 = (st === 'liquido' ? 30 : st === 'cromo' ? 7 : 5) * k * rel, h = blur(m, W, H, r1), i, x, y;
    if (st === 'liquido') { for (i = 0; i < N; i++) h[i] = Math.pow(h[i], 0.6); h = blur(h, W, H, 3 * k); }
    var ds = blur(m, W, H, 5 * k);
    var S = st === 'liquido' ? 1.5 : 2.4, bands = o.reflejos / 50, bril = o.brillo / 100;
    var out = new Uint8ClampedArray(N * 4), hi = new Uint8Array(N);
    var hn = {x: -0.35, y: -0.5, z: 0.79}, hl = Math.sqrt(hn.x * hn.x + hn.y * hn.y + hn.z * hn.z);
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      i = y * W + x;
      var a = m[i]; if (a < 0.004) continue;
      var nx = -(h[i + 1] - h[i - 1]) * r1 * S, ny = -(h[i + W] - h[i - W]) * r1 * S, nl = Math.sqrt(nx * nx + ny * ny + 1);
      nx /= nl; ny /= nl; var nz = 1 / nl, t;
      if (st === 'cromo') t = (y - M.top) / (M.bot - M.top) * 0.95 - 0.12 * ny; else t = 0.5 - 0.5 * ny * 0.95 + 0.22 * nx;
      var u = t * bands, tri = Math.abs(((u % 2) + 2) % 2 - 1); tri = cl(tri, 0, 1); var sm1 = tri * tri * (3 - 2 * tri); tri = tri * 0.35 + sm1 * 0.65; var li = (tri * 255 | 0) * 3;
      var r = lut[li], g = lut[li + 1], b = lut[li + 2];
      var rim = cl(1 - (ds[i] - 0.5) / 0.42, 0, 1), alpha = a;
      if (st === 'cristal') {
        var ring = Math.pow(cl(1 - (ds[i] - 0.5) / 0.75, 0, 1), 0.9), k2 = 0.42 * (1 - ring);
        r = Math.min(255, r * (0.55 + ring * 0.75)) * ring + r * k2; g = Math.min(255, g * (0.55 + ring * 0.75)) * ring + g * k2; b = Math.min(255, b * (0.55 + ring * 0.75)) * ring + b * k2;
        alpha = a * (0.3 + ring * 0.7);
      } else {
        var lit = (-0.55 * nx - 0.75 * ny) * (st === 'cromo' ? 75 : 38);
        r += lit; g += lit; b += lit;
        var rp = Math.pow(rim, 7) * 0.85 + Math.pow(rim, 2.5) * 0.12;
        r += (255 - r) * rp; g += (255 - g) * rp; b += (255 - b) * rp;
      }
      var d = (nx * hn.x + ny * hn.y + nz * hn.z) / hl, sp = d > 0 ? (Math.pow(d, 70) * 1.3 + Math.pow(d, 8) * 0.12) * bril * 255 : 0;
      r += sp; g += sp; b += sp;
      var o4 = i * 4; out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = b; out[o4 + 3] = alpha * 255;
      if (alpha > 0.9) { if (sp > 150) hi[i] = 1; else if (r + g + b > 640) hi[i] = 2; }
    }
    return { px: out, hi: hi, acc: pal.acc };
  }

  /* ---------- 3. destellos ---------- */
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function star(x, cx, cy, r, w, col) {
    x.save(); x.translate(cx, cy);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, r * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.3, 'rgba(' + col.join(',') + ',.35)'); g.addColorStop(1, 'rgba(' + col.join(',') + ',0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r * 0.35, 0, 7); x.fill();
    [[0, r * 1.5], [90, r * 0.7]].forEach(function (sp) {
      x.save(); x.rotate(sp[0] * Math.PI / 180);
      var lg = x.createLinearGradient(-sp[1], 0, sp[1], 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.beginPath(); x.moveTo(-sp[1], 0); x.quadraticCurveTo(0, -w, sp[1], 0); x.quadraticCurveTo(0, w, -sp[1], 0); x.fill(); x.restore();
    });
    x.restore();
  }

  /* ---------- 4. composición final ---------- */
  function render(canvas, o, w) {
    var W = w, H = Math.round(w * (FMT[o.fmt] || FMT.sq)[1]), k = W / 900;
    canvas.width = W; canvas.height = H;
    var cx = canvas.getContext('2d'), M = makeMask(o, W, H), S = shade(M, W, H, o, k), pal = PAL[o.pal], i, N = W * H;
    // capa de texto (con extrusión en el estilo 3D)
    var F = mk(W, H), fx = F.getContext('2d'), id = fx.createImageData(W, H); id.data.set(S.px); fx.putImageData(id, 0, 0);
    var L = F;
    if (o.style === 'cromo' && o.prof > 0) {
      L = mk(W, H); var lx = L.getContext('2d'), sm = mk(W, H), sx = sm.getContext('2d'), sid = sx.createImageData(W, H);
      for (i = 0; i < N; i++) { sid.data[i * 4 + 3] = M.m[i] * 255; }
      sx.putImageData(sid, 0, 0); sx.globalCompositeOperation = 'source-in';
      var gr = sx.createLinearGradient(0, M.top, 0, M.bot); gr.addColorStop(0, 'rgb(' + pal.mid.join(',') + ')'); gr.addColorStop(1, 'rgb(' + pal.dark.join(',') + ')');
      sx.fillStyle = gr; sx.fillRect(0, 0, W, H);
      var D = Math.round(o.prof * k * 0.6);
      for (var d = D; d >= 1; d--) lx.drawImage(sm, d * 0.55, d * 0.83);
      lx.drawImage(F, 0, 0);
    }
    var ld = L.getContext('2d').getImageData(0, 0, W, H), p = ld.data;
    // fondo
    cx.clearRect(0, 0, W, H);
    if (o.bg === 'negro') { cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H); }
    else if (o.bg === 'azul') {
      var rg = cx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75);
      rg.addColorStop(0, '#0a5cc0'); rg.addColorStop(0.55, '#06306a'); rg.addColorStop(1, '#010a1c'); cx.fillStyle = rg; cx.fillRect(0, 0, W, H);
    }
    var bd = cx.getImageData(0, 0, W, H), b = bd.data;
    // glow a partir de la luminancia del texto
    var gI = new Float32Array(N);
    for (i = 0; i < N; i++) { var a = p[i * 4 + 3] / 255; gI[i] = a * (0.3 + 0.7 * (p[i * 4] + p[i * 4 + 1] + p[i * 4 + 2]) / 765); }
    var gl = blur(gI, W, H, (8 + o.glow * 0.5) * k), gA = o.glow / 100 * 2.2, ac = S.acc;
    for (i = 0; i < N; i++) {
      var q = i * 4, ta = p[q + 3] / 255, ga = Math.min(1, gl[i] * gA), ba = b[q + 3] / 255;
      if (ba > 0.99) {
        b[q] = Math.min(255, b[q] + ac[0] * ga); b[q + 1] = Math.min(255, b[q + 1] + ac[1] * ga); b[q + 2] = Math.min(255, b[q + 2] + ac[2] * ga);
      } else if (ga > 0) { b[q] = ac[0]; b[q + 1] = ac[1]; b[q + 2] = ac[2]; b[q + 3] = ga * 255; ba = ga; }
      if (ta > 0) {
        var oa = ta + ba * (1 - ta);
        b[q] = (p[q] * ta + b[q] * ba * (1 - ta)) / oa; b[q + 1] = (p[q + 1] * ta + b[q + 1] * ba * (1 - ta)) / oa; b[q + 2] = (p[q + 2] * ta + b[q + 2] * ba * (1 - ta)) / oa; b[q + 3] = oa * 255;
      }
    }
    cx.putImageData(bd, 0, 0);
    // destellos sobre los puntos más brillantes
    var n = o.destellos, R = rng(o.seed * 9973 + 7), cand = [], off = (R() * 5) | 0;
    for (var lv = 1; lv <= 2 && !cand.length; lv++) for (i = off; i < N; i += 5) if (S.hi[i] === lv) { cand.push(i); if (cand.length > 5000) break; }
    var chosen = [], tries = 0;
    while (chosen.length < n && cand.length && tries++ < 400) {
      var ci = cand[(R() * cand.length) | 0], px = ci % W, py = (ci / W) | 0, ok = true;
      for (var j = 0; j < chosen.length; j++) if (Math.hypot(chosen[j][0] - px, chosen[j][1] - py) < W * 0.09) { ok = false; break; }
      if (ok) chosen.push([px, py]);
    }
    cx.globalCompositeOperation = 'lighter';
    chosen.forEach(function (c, j) {
      var big = j === 0 ? 1 : 0.4 + R() * 0.4, r = W * (o.style === 'cristal' ? 0.1 : 0.07) * big;
      star(cx, c[0], c[1], r, 1.1 * k + r * 0.02, ac);
    });
    cx.globalCompositeOperation = 'source-over';
    return canvas;
  }

  var api = { render: render, PAL: PAL, FONTS: FONTS, FMT: FMT };
  root.CromoEngine = api;
  if (!doc || !doc.getElementById || !doc.getElementById('crLienzo')) return;

  /* ============================== INTERFAZ ============================== */
  var DEF = { src: 'text', text: 'qfadesign', font: 'art', gfName: '', gfW: 900, read: 'alpha', umbral: 50, ipeso: 0,
              style: 'liquido', pal: 'hielo', size: 80, peso: 22, track: 0, slant: 0, arch: 0, rot: 0,
              relieve: 50, reflejos: 50, brillo: 60, glow: 28, destellos: 2, prof: 40, bg: 'negro', fmt: 'sq', seed: 3 };
  var st = {}, k;
  for (k in DEF) st[k] = DEF[k];
  var cv = doc.getElementById('crLienzo'), pend = 0, ctl = doc.getElementById('crCtl'), keepMsg = '';
  /* sliders: [clave, nombre, mín, máx, paso, solo en estilo, solo en fuente (text / img)] */
  var SL = [
    ['Forma', [['size', 'Tamaño', 35, 100, 1], ['peso', 'Grosor', 0, 60, 1, '', 'text'], ['ipeso', 'Grosor del contorno', -40, 60, 1, '', 'img'], ['track', 'Espaciado', -8, 40, 1, '', 'text'], ['slant', 'Inclinación', -30, 30, 1], ['arch', 'Arco', -100, 100, 1, '', 'text'], ['rot', 'Rotación', -25, 25, 1]]],
    ['Metal y brillo', [['relieve', 'Relieve', 10, 100, 1], ['reflejos', 'Reflejos', 25, 150, 1], ['brillo', 'Brillo', 0, 100, 1], ['glow', 'Resplandor', 0, 100, 1], ['destellos', 'Destellos', 0, 12, 1], ['prof', 'Profundidad 3D', 0, 100, 1, 'cromo']]]
  ];
  var CHIPS = {
    src: ['Qué querés cromar', [['text', 'Escribir texto'], ['img', 'Subir mi marca o imagen']]],
    style: ['Estilo', [['liquido', 'Metal líquido'], ['cromo', 'Cromo 3D'], ['cristal', 'Cristal']]],
    read: ['Cómo leer la imagen', [['alpha', 'Por transparencia'], ['dark', 'Partes oscuras'], ['light', 'Partes claras']]],
    bg: ['Fondo', [['negro', 'Negro'], ['azul', 'Azul qfa'], ['transp', 'Transparente']]],
    fmt: ['Formato', [['sq', 'Cuadrado'], ['v', 'Vertical 4:5'], ['h', 'Horizontal']]]
  };
  function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; }
  function dsp(title, open) { var d = el('details', 'dsp cr-dsp'); if (open) d.open = true; d.appendChild(el('summary', '', '<span class="dsp-t">' + title + '</span>')); ctl.appendChild(d); return d; }
  function chips(prop, list, parent, label) {
    var w = el('div', 'cr-g'); if (label) w.appendChild(el('span', 'cv-l', label));
    var row = el('div', 'cv-fmts'); row.setAttribute('role', 'group');
    list.forEach(function (it) {
      var b = el('button', 'chip', it[1]); b.type = 'button'; b.dataset.v = it[0]; b.setAttribute('aria-pressed', st[prop] === it[0]);
      b.onclick = function () { st[prop] = it[0]; sync(); draw(); }; row.appendChild(b);
    });
    row.dataset.p = prop; w.appendChild(row); parent.appendChild(w); return w;
  }
  function paso(n, t) { var d = el('section', 'pd-paso'); d.appendChild(el('h2', 'pd-h', '<span class="pd-n" aria-hidden="true">' + n + '</span>' + t)); ctl.appendChild(d); return d; }
  var outs = {};
  function slider(parent, s) {
    var r = el('div', 'cr-r'); if (s[5]) r.dataset.only = s[5]; if (s[6]) r.dataset.src = s[6];
    var l = el('label', 'cv-l', s[1] + ' <b></b>'), i = el('input'); i.type = 'range'; i.min = s[2]; i.max = s[3]; i.step = s[4]; i.value = st[s[0]]; i.id = 'cr_' + s[0]; l.htmlFor = i.id;
    outs[s[0]] = [i, l.querySelector('b')]; i.oninput = function () { st[s[0]] = +i.value; l.querySelector('b').textContent = i.value; draw(); };
    l.querySelector('b').textContent = i.value; r.appendChild(l); r.appendChild(i); parent.appendChild(r); return r;
  }

  /* ---- 1. Qué cromar ---- */
  var d1 = paso(1, 'Elegí qué querés cromar');
  chips('src', CHIPS.src[1], d1, '');
  /* 1a. texto */
  var tb = el('div', 'cr-blk'); tb.dataset.src = 'text'; d1.appendChild(tb);
  var ta = el('textarea', 'qr-in cr-ta'); ta.id = 'crTexto'; ta.rows = 2; ta.value = st.text; ta.maxLength = 40; ta.setAttribute('aria-label', 'Texto');
  ta.oninput = function () { st.text = ta.value; draw(); }; tb.appendChild(ta);
  tb.appendChild(el('p', 'pd-hint', 'Hasta 3 renglones. Palabras cortas y de 4 a 10 letras se ven mejor.'));
  chips('font', Object.keys(FONTS).filter(function (f) { return f !== 'user' && f !== 'gf'; }).map(function (f) { return [f, FONTS[f].n]; }), tb, 'Tipografía');
  var fl = el('label', 'cr-file', '<input type="file" id="crFuente" accept=".ttf,.otf,.woff,.woff2" hidden><span class="chip">Subir mi tipografía</span>'); tb.appendChild(fl);
  fl.querySelector('input').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.arrayBuffer().then(function (buf) { var ff = new FontFace('crUser', buf); return ff.load().then(function () { doc.fonts.add(ff); st.font = 'user'; sync(); draw(); }); }).catch(function () { msg('No pude leer esa tipografía. Probá con un .ttf, .otf o .woff.'); });
  };

  /* 1b. buscador de Google Fonts */
  var CATN = { d: 'Display', s: 'Sans', f: 'Serif', h: 'Manuscrita', m: 'Mono' };
  var FEAT = ['Anton', 'Bebas Neue', 'Archivo Black', 'Rubik Mono One', 'Bungee', 'Monoton', 'Righteous', 'Lobster', 'Pacifico', 'Permanent Marker', 'Bowlby One', 'Climate Crisis', 'Dela Gothic One', 'Unbounded', 'Bagel Fat One', 'Titan One', 'Chango', 'Paytone One', 'Lilita One', 'Alfa Slab One', 'Black Ops One', 'Orbitron', 'Audiowide', 'Staatliches', 'Abril Fatface', 'Press Start 2P', 'Dancing Script', 'Playfair Display'];
  function okName(n) { return /^[A-Za-z0-9 ]{1,60}$/.test(n); }
  function parseGF(str) {
    return String(str || '').split('|').map(function (t) { var i = t.lastIndexOf(':'); return { n: t.slice(0, i), c: t.slice(i + 1), k: t.slice(0, i).toLowerCase() }; }).filter(function (f) { return f.n && okName(f.n); });
  }
  var GF = parseGF(root.GF_LISTA), gfCat = '', gfShow = 8, gfQ = '', gfPrev = {}, gfCache = {};
  function gfEnc(n) { return encodeURIComponent(n).replace(/%20/g, '+'); }
  function gfLink(url) {
    return new Promise(function (res, rej) {
      var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = url;
      l.onload = function () { res(); }; l.onerror = function () { l.remove(); rej(new Error('gf')); }; doc.head.appendChild(l);
    });
  }
  function gfLoad(name, w) {
    var key = name + '|' + w; if (gfCache[key]) return gfCache[key];
    var p = gfLink('https://fonts.googleapis.com/css2?family=' + gfEnc(name) + (w === 400 ? '' : ':wght@' + w) + '&display=swap');
    p.catch(function () { delete gfCache[key]; }); gfCache[key] = p; return p;
  }
  function gfPreview(name) { /* carga solo las letras del nombre, para mostrarlo en su tipografía */
    if (gfPrev[name]) return; gfPrev[name] = 1;
    gfLink('https://fonts.googleapis.com/css2?family=' + gfEnc(name) + '&text=' + encodeURIComponent(name) + '&display=swap').catch(function () {});
  }
  function gfPick(name, want) {
    want = want || st.gfWant || 900; st.gfWant = want;
    var seq = want >= 900 ? [900, 700, 400] : want >= 700 ? [700, 400] : [400], i = 0;
    msg('Cargando «' + name + '»…');
    (function next() {
      if (i >= seq.length) { msg('No pude cargar «' + name + '» de Google Fonts. Revisá que el nombre esté bien escrito (con mayúsculas y espacios) y tu conexión.'); return; }
      var w = seq[i++];
      gfLoad(name, w).then(function () { return doc.fonts.load(w + ' 100px "' + name + '"', 'Aa' + (st.text || '')); }).then(function (fs) {
        if (!fs || !fs.length) throw new Error('vacia');
        st.gfName = name; st.gfW = w; st.font = 'gf';
        keepMsg = w !== want ? 'Esta tipografía no tiene grosor ' + want + ': uso ' + w + '.' : '';
        sync(); draw();
      }).catch(next);
    })();
  }
  var gb = el('div', 'cr-gf'); tb.appendChild(gb);
  gb.appendChild(el('label', 'cv-l', 'Buscar en Google Fonts')).htmlFor = 'crGfIn';
  var gin = el('input', 'qr-in cr-gf-in'); gin.type = 'search'; gin.id = 'crGfIn'; gin.placeholder = 'Ej: Anton, Bungee, Lobster…'; gin.autocomplete = 'off'; gin.spellcheck = false; gin.maxLength = 60;
  gb.appendChild(gin);
  var gcat = el('div', 'cv-fmts cr-gf-cat'); gcat.setAttribute('role', 'group'); gcat.setAttribute('aria-label', 'Tipo de tipografía');
  [['', 'Destacadas'], ['d', 'Display'], ['s', 'Sans'], ['f', 'Serif'], ['h', 'Manuscrita'], ['m', 'Mono']].forEach(function (c) {
    var b = el('button', 'chip', c[1]); b.type = 'button'; b.dataset.c = c[0]; b.setAttribute('aria-pressed', gfCat === c[0]);
    b.onclick = function () { gfCat = c[0]; gfShow = 8; renderGf(); }; gcat.appendChild(b);
  }); gb.appendChild(gcat);
  var glist = el('ul', 'cr-gf-lista'); glist.setAttribute('aria-label', 'Resultados de Google Fonts'); gb.appendChild(glist);
  var gmore = el('button', 'chip cr-gf-mas', 'Ver más'); gmore.type = 'button'; gmore.hidden = true; gb.appendChild(gmore);
  gmore.onclick = function () { gfShow += 8; renderGf(); };
  var gsel = el('p', 'cr-gf-sel'); gsel.setAttribute('aria-live', 'polite'); gb.appendChild(gsel);
  var gw = el('div', 'cr-g cr-gf-w'); gw.appendChild(el('span', 'cv-l', 'Grosor de la tipografía'));
  var gwr = el('div', 'cv-fmts'); gwr.setAttribute('role', 'group');
  [[400, 'Normal'], [700, 'Bold'], [900, 'Black']].forEach(function (w) {
    var b = el('button', 'chip', w[1]); b.type = 'button'; b.dataset.w = w[0];
    b.onclick = function () { if (st.gfName) gfPick(st.gfName, w[0]); }; gwr.appendChild(b);
  }); gw.appendChild(gwr); gb.appendChild(gw);
  gb.appendChild(el('p', 'pd-hint', 'Las tipografías se piden a Google Fonts cuando las elegís. Si no aparece la que buscás, escribí su nombre exacto y probala.'));
  function titulo(q) { return q.replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }); }
  function renderGf() {
    var q = gfQ.trim().toLowerCase(), res = [], i;
    gcat.querySelectorAll('[data-c]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.c === gfCat); });
    if (!q && !gfCat) {
      FEAT.forEach(function (n) { var f = GF.filter(function (g) { return g.n === n; })[0]; res.push(f || { n: n, c: 'd', k: n.toLowerCase() }); });
    } else {
      var a = [], b = [];
      GF.forEach(function (f) { if (gfCat && f.c !== gfCat) return; if (!q || f.k.indexOf(q) === 0) a.push(f); else if (f.k.indexOf(q) > 0) b.push(f); });
      res = a.concat(b);
    }
    var total = res.length, exact = q && GF.some(function (f) { return f.k === q; });
    res = res.slice(0, gfShow); glist.textContent = '';
    res.forEach(function (f) {
      var li = el('li'), b = el('button', 'chip cr-gf-it'); b.type = 'button';
      var n = el('span', 'cr-gf-n'); n.textContent = f.n; n.style.fontFamily = '"' + f.n + '",sans-serif';
      var c = el('small'); c.textContent = CATN[f.c] || ''; b.appendChild(n); b.appendChild(c);
      b.setAttribute('aria-pressed', st.font === 'gf' && st.gfName === f.n);
      b.onclick = function () { gfPick(f.n); }; li.appendChild(b); glist.appendChild(li); gfPreview(f.n);
    });
    if (q.length >= 2 && !exact && !gfCat) {
      var nm = /[A-Z]/.test(gfQ) ? gfQ.trim() : titulo(gfQ.trim());
      if (okName(nm)) {
        var li = el('li'), b = el('button', 'chip cr-gf-it cr-gf-prueba'); b.type = 'button';
        b.innerHTML = '<span class="cr-gf-n"></span><small>Probar en Google Fonts</small>'; b.firstChild.textContent = 'Probar «' + nm + '»';
        b.onclick = function () { gfPick(nm); }; li.appendChild(b); glist.appendChild(li);
      }
    }
    if (!total && !(q.length >= 2 && !gfCat)) { var e = el('li', 'cr-gf-vacio'); e.textContent = 'No encontré nada con ese nombre.'; glist.appendChild(e); }
    gmore.hidden = total <= gfShow;
  }
  var gT; gin.oninput = function () { clearTimeout(gT); gT = setTimeout(function () { gfQ = gin.value; gfShow = 8; renderGf(); }, 120); };
  renderGf();
  /* con conexión a Google, se reemplaza la lista base por la completa (si no llega, queda la base) */
  try {
    if (root.fetch) root.fetch('https://fonts.google.com/metadata/fonts').then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(function (t) {
      var j = JSON.parse(t.replace(/^\)\]\}'\s*/, '')), M = { 'Display': 'd', 'Sans Serif': 's', 'Serif': 'f', 'Handwriting': 'h', 'Monospace': 'm' };
      var arr = (j.familyMetadataList || []).slice().sort(function (a, b) { return (a.popularity || 9e9) - (b.popularity || 9e9); }).map(function (f) { return { n: f.family, c: M[f.category] || 'd', k: String(f.family).toLowerCase() }; }).filter(function (f) { return okName(f.n); });
      if (arr.length > 300) { GF = arr; renderGf(); }
    }).catch(function () {});
  } catch (e) {}

  /* 1c. marca o imagen */
  var ib = el('div', 'cr-blk'); ib.dataset.src = 'img'; d1.appendChild(ib);
  var dz = el('label', 'cr-drop', '<input type="file" id="crImg" accept="image/*,.svg" hidden><span class="cr-drop-t">Subí tu marca o imagen</span><span class="cr-drop-s">Arrastrala hasta acá o tocá para elegirla · SVG, PNG, JPG o WebP</span>');
  ib.appendChild(dz);
  var imgInfo = el('p', 'cr-img-info'); imgInfo.setAttribute('aria-live', 'polite'); ib.appendChild(imgInfo);
  ib.appendChild(el('p', 'pd-hint', 'Lo mejor: logo con fondo transparente (SVG o PNG). También sirve uno negro sobre blanco o blanco sobre negro: elegí abajo qué parte se croma.'));
  var rd = chips('read', CHIPS.read[1], ib, 'Cómo leer la imagen');
  var um = slider(ib, ['umbral', 'Sensibilidad', 5, 95, 1]); um.dataset.lum = '1';
  var rm = el('button', 'chip cr-img-quitar', 'Quitar imagen'); rm.type = 'button'; rm.hidden = true; ib.appendChild(rm);
  function imgMsg(t) { imgInfo.textContent = t || ''; }
  function setImg(el0, w, h) {
    IMG.el = el0; IMG.w = w; IMG.h = h;
    var sm = mk(Math.min(200, w), Math.max(1, Math.round(h * Math.min(200, w) / w))), sx = sm.getContext('2d');
    sx.drawImage(el0, 0, 0, sm.width, sm.height);
    var d = sx.getImageData(0, 0, sm.width, sm.height).data, tr = 0, n = sm.width * sm.height, i, lum = 0, c = 0, px, X = sm.width, Y = sm.height;
    for (i = 0; i < n; i++) if (d[i * 4 + 3] < 245) tr++;
    IMG.alpha = tr / n > 0.01;
    [[0, 0], [X - 1, 0], [0, Y - 1], [X - 1, Y - 1]].forEach(function (p) { px = (p[1] * X + p[0]) * 4; lum += (d[px] + d[px + 1] + d[px + 2]) / 765; c++; });
    st.read = IMG.alpha ? 'alpha' : (lum / c > 0.5 ? 'dark' : 'light');
    st.src = 'img'; rm.hidden = false; sync(); draw();
  }
  function cargarImg(f) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { imgMsg('Esa imagen pesa demasiado (máximo 25 MB).'); return; }
    var svg = /svg/i.test(f.type) || /\.svg$/i.test(f.name);
    imgMsg('Leyendo «' + f.name + '»…');
    var listo = function (e0, w, h) { setImg(e0, w, h); imgMsg('Usando «' + f.name + '».'); };
    var fallo = function () { imgMsg('No pude leer esa imagen. Probá con un SVG, PNG, JPG o WebP.'); };
    if (svg) {
      f.text().then(function (t) {
        var m = /viewBox\s*=\s*"([^"]+)"/i.exec(t), w = 1000, h = 1000;
        if (m) { var v = m[1].trim().split(/[\s,]+/).map(Number); if (v[2] > 0 && v[3] > 0) { w = v[2]; h = v[3]; } }
        var k2 = 1000 / Math.max(w, h); w = Math.round(w * k2); h = Math.round(h * k2);
        t = t.replace(/<svg\b([^>]*)>/i, function (all, a) { return '<svg' + a.replace(/\s(width|height)\s*=\s*"[^"]*"/gi, '') + ' width="' + w + '" height="' + h + '">'; });
        var url = URL.createObjectURL(new Blob([t], { type: 'image/svg+xml' })), im = new Image();
        im.onload = function () {
          var s3 = 2048 / Math.max(w, h), cc = mk(Math.max(1, Math.round(w * s3)), Math.max(1, Math.round(h * s3)));
          cc.getContext('2d').drawImage(im, 0, 0, cc.width, cc.height); URL.revokeObjectURL(url); listo(cc, cc.width, cc.height);
        }; im.onerror = fallo; im.src = url;
      }).catch(fallo);
    } else {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, e0 = im, mx = 2048;
        if (!w || !h) { fallo(); return; }
        if (Math.max(w, h) > mx) { var s2 = mx / Math.max(w, h), cc = mk(Math.round(w * s2), Math.round(h * s2)); cc.getContext('2d').drawImage(im, 0, 0, cc.width, cc.height); e0 = cc; w = cc.width; h = cc.height; }
        else { var c2 = mk(w, h); c2.getContext('2d').drawImage(im, 0, 0); e0 = c2; }
        URL.revokeObjectURL(url); listo(e0, w, h);
      };
      im.onerror = fallo; im.src = url;
    }
  }
  dz.querySelector('input').onchange = function (e) { cargarImg(e.target.files[0]); e.target.value = ''; };
  ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('on'); }); });
  dz.addEventListener('drop', function (e) { cargarImg(e.dataTransfer && e.dataTransfer.files[0]); });
  rm.onclick = function () { IMG.el = null; rm.hidden = true; imgMsg(''); sync(); draw(); };

  /* ---- 2. Estilo y color ---- */
  var d2 = paso(2, 'Elegí el estilo y el color'); chips('style', CHIPS.style[1], d2, 'Estilo');
  var pw = el('div', 'cr-g'); pw.appendChild(el('span', 'cv-l', 'Color del metal')); var pr = el('div', 'cr-pal'); pr.dataset.p = 'pal';
  Object.keys(PAL).forEach(function (p) {
    var b = el('button', 'cr-sw'); b.type = 'button'; b.dataset.v = p; b.title = PAL[p].n; b.setAttribute('aria-label', PAL[p].n);
    b.style.background = 'linear-gradient(160deg,' + PAL[p].c[2] + ',' + PAL[p].c[3] + ' 45%,' + PAL[p].c[1] + ')';
    b.onclick = function () { st.pal = p; sync(); draw(); }; pr.appendChild(b);
  }); pw.appendChild(pr); d2.appendChild(pw);
  // 3. Ajustes finos (desplegables)
  SL.forEach(function (g) { var d = dsp(g[0], false); g[1].forEach(function (s) { slider(d, s); }); });
  // 4. Fondo y formato
  var d4 = dsp('Fondo y formato', false); d4.classList.add('cr-dsp'); chips('bg', CHIPS.bg[1], d4, 'Fondo'); chips('fmt', CHIPS.fmt[1], d4, 'Formato');

  function sync() {
    ctl.querySelectorAll('[data-p]').forEach(function (row) {
      row.querySelectorAll('[data-v]').forEach(function (b) { b.setAttribute('aria-pressed', st[row.dataset.p] === b.dataset.v); });
    });
    ctl.querySelectorAll('[data-only]').forEach(function (r) { r.hidden = st.style !== r.dataset.only; });
    ctl.querySelectorAll('[data-src]').forEach(function (r) { r.hidden = st.src !== r.dataset.src; });
    ctl.querySelectorAll('[data-lum]').forEach(function (r) { r.hidden = st.src !== 'img' || st.read === 'alpha'; });
    for (var key in outs) { outs[key][0].value = st[key]; outs[key][1].textContent = st[key]; }
    var gOn = st.font === 'gf' && st.gfName;
    gsel.textContent = gOn ? 'Usando: ' + st.gfName : ''; gw.hidden = !gOn;
    gwr.querySelectorAll('[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', gOn && +b.dataset.w === st.gfW); });
    glist.querySelectorAll('.cr-gf-it:not(.cr-gf-prueba)').forEach(function (b) { b.setAttribute('aria-pressed', !!gOn && b.firstChild.textContent === st.gfName); });
    if (st.src === 'img' && !IMG.el) imgInfo.textContent = imgInfo.textContent || 'Todavía no subiste nada: mientras tanto se ve el texto.';
    doc.getElementById('crPng').disabled = (st.src === 'img' && !IMG.el);
    cv.classList.toggle('transp', st.bg === 'transp');
  }
  function msg(t) { var m = doc.getElementById('crMsg'); if (m) m.textContent = t || ''; }
  function fontsReady() {
    if (st.src === 'img' && IMG.el) return Promise.resolve();
    if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
    return doc.fonts.load(fontCss(st, 100), st.text || 'a').catch(function () {});
  }
  function draw() {
    if (pend) return; pend = 1;
    root.requestAnimationFrame(function () {
      pend = 0; fontsReady().then(function () {
        render(cv, st, Math.min(760, Math.max(420, (cv.parentNode.clientWidth || 640) * (root.devicePixelRatio > 1.5 ? 1.2 : 1))));
        var esImg = st.src === 'img' && IMG.el, est = CHIPS.style[1].filter(function (c) { return c[0] === st.style; })[0][1];
        cv.setAttribute('aria-label', esImg ? 'Vista previa de tu marca en estilo ' + est : 'Vista previa de «' + (st.text || '').replace(/\n/g, ' ') + '» en estilo ' + est);
        doc.getElementById('crPng').disabled = (st.src === 'img' && !IMG.el); msg(keepMsg); keepMsg = '';
      });
    });
  }
  doc.getElementById('crPng').onclick = function () {
    var b = this; b.disabled = true; msg('Armando el PNG en alta calidad…');
    setTimeout(function () {
      var big = mk(10, 10); render(big, st, root.innerWidth < 700 ? 1200 : 1800);
      big.toBlob(function (bl) {
        var a = doc.createElement('a'); a.href = URL.createObjectURL(bl); a.download = st.src === 'img' && IMG.el ? 'qfadesign-marca-cromada.png' : 'qfadesign-texto-cromado.png'; doc.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); b.disabled = false; msg('Listo, ya se descargó.');
      }, 'image/png');
    }, 30);
  };
  doc.getElementById('crMix').onclick = function () {
    var sty = ['liquido', 'cromo', 'cristal'], pk = Object.keys(PAL), rr = function (a, b) { return Math.round(a + Math.random() * (b - a)); };
    st.style = sty[rr(0, 2)]; st.pal = pk[rr(0, pk.length - 1)]; st.arch = Math.random() < 0.4 ? rr(-60, 60) : 0; st.slant = Math.random() < 0.5 ? rr(-12, 14) : 0;
    st.relieve = rr(30, 80); st.reflejos = rr(35, 110); st.destellos = rr(2, 8); st.seed = rr(1, 999); st.prof = rr(25, 70); st.peso = rr(0, 30);
    sync(); draw();
  };
  doc.getElementById('crReset').onclick = function () {
    var keep = { text: st.text, src: st.src, font: st.font, gfName: st.gfName, gfW: st.gfW, read: st.read };
    for (var key in DEF) st[key] = DEF[key];
    for (key in keep) st[key] = keep[key];
    sync(); draw();
  };
  sync(); draw();
  root.addEventListener('resize', function () { clearTimeout(root.__crT); root.__crT = setTimeout(draw, 200); });
})(typeof window !== 'undefined' ? window : globalThis);
