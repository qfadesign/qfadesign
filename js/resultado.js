/* qfadesign — imagen de resultado para los jueguitos.
   Uso: QFAResultado.montar(contenedor, () => ({juego, puntos, dificultad, detalle}))
   Dibuja una imagen 1080x1350 (formato vertical, ideal para historias/posts),
   y la comparte con el menú nativo del celular o la descarga como PNG. */
(function(){
  const W = 1080, H = 1350, AZUL = '#0b75f4';
  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/js\/[^/]*$/, '') : '../';

  let fuentesListas = null;
  function cargarFuentes(){
    if (fuentesListas) return fuentesListas;
    if (!window.FontFace) return (fuentesListas = Promise.resolve());
    const defs = [
      ['QFA Heavy', 'ArticulatCF-HeavyItalic.ttf', '900', 'italic'],
      ['QFA Reg',   'ArticulatCF-Regular.ttf',     '400', 'normal'],
      ['QFA Bold',  'ArticulatCF-BoldItalic.ttf',  '700', 'italic']
    ];
    fuentesListas = Promise.all(defs.map(([n, f, w, s]) => {
      const ff = new FontFace(n, `url(${base}fonts/${f})`, { weight: w, style: s });
      return ff.load().then(x => document.fonts.add(x)).catch(() => {});
    }));
    return fuentesListas;
  }

  function cargarImagen(src){
    return new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  function rr(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fecha(){
    return new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function dibujar(d){
    await cargarFuentes();
    const logo = await cargarImagen(base + 'img/Marca_qfadesign_blanco.svg');
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const F = (w, px) => `${w === 'h' ? 'italic 900' : w === 'b' ? 'italic 700' : '400'} ${px}px ${w === 'h' ? '"QFA Heavy"' : w === 'b' ? '"QFA Bold"' : '"QFA Reg"'}, "Montserrat", Arial, sans-serif`;

    // fondo
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 760);
    g.addColorStop(0, 'rgba(11,117,244,.38)'); g.addColorStop(1, 'rgba(11,117,244,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // marco
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
    rr(ctx, 40, 40, W - 80, H - 80, 48); ctx.stroke();

    // logo arriba
    if (logo) {
      const lh = 56, lw = lh * (logo.width / logo.height || 4);
      ctx.drawImage(logo, 90, 92, lw, lh);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // pastilla "jugué"
    ctx.font = F('r', 26);
    const tag = 'JUGUÉ ' + d.juego.toUpperCase();
    const tw = ctx.measureText(tag).width + 56;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    rr(ctx, 90, 230, tw, 58, 29); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(tag, 118, 268);

    // título
    ctx.font = F('h', 96);
    ctx.fillStyle = '#fff';
    ctx.fillText('Mi resultado', 90, 410);

    // puntos
    ctx.font = F('h', 300);
    ctx.fillStyle = AZUL;
    const pts = String(d.puntos);
    ctx.fillText(pts, 82, 700);
    const pw = ctx.measureText(pts).width;
    ctx.font = F('b', 58);
    ctx.fillStyle = '#fff';
    ctx.fillText('puntos', 96, 790);

    // detalle (cajas)
    const items = [];
    if (d.dificultad) items.push(['DIFICULTAD', d.dificultad]);
    (d.detalle || []).forEach(x => items.push(x));
    const cols = Math.min(items.length, 2) || 1;
    const bw = (W - 180 - 30 * (cols - 1)) / cols;
    items.slice(0, 4).forEach((it, i) => {
      const x = 90 + (i % cols) * (bw + 30);
      const y = 850 + Math.floor(i / cols) * 150;
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      rr(ctx, x, y, bw, 124, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
      rr(ctx, x, y, bw, 124, 28); ctx.stroke();
      ctx.font = F('r', 22); ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillText(it[0], x + 30, y + 44);
      ctx.font = F('h', 44); ctx.fillStyle = '#fff';
      let txt = String(it[1]);
      while (ctx.measureText(txt).width > bw - 60 && txt.length > 3) txt = txt.slice(0, -2);
      ctx.fillText(txt === String(it[1]) ? txt : txt + '…', x + 30, y + 96);
    });

    // pie
    ctx.font = F('b', 34); ctx.fillStyle = '#fff';
    ctx.fillText('¿Me ganás? Jugá en qfadesign.com', 90, H - 130);
    ctx.font = F('r', 24); ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(fecha(), 90, H - 90);

    return c;
  }

  function aBlob(canvas){
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  function montar(contenedor, obtener){
    const caja = document.createElement('div');
    caja.className = 'resultado-img';
    caja.innerHTML = '<div class="resultado-prev" hidden></div><div class="resultado-acc"><button type="button" class="primary res-compartir">Compartir resultado</button><button type="button" class="res-bajar">Descargar imagen</button></div><div class="resultado-msg" aria-live="polite"></div>';
    contenedor.appendChild(caja);

    const prev = caja.querySelector('.resultado-prev');
    const msg = caja.querySelector('.resultado-msg');
    let blob = null, url = null;

    async function generar(){
      const datos = obtener();
      const canvas = await dibujar(datos);
      blob = await aBlob(canvas);
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      img.alt = 'Imagen con mi resultado en ' + datos.juego;
      prev.innerHTML = '';
      prev.appendChild(img);
      prev.hidden = false;
      return datos;
    }

    function nombre(d){
      return 'qfadesign-' + d.juego.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    }

    function bajar(d){
      const a = document.createElement('a');
      a.href = url; a.download = nombre(d);
      document.body.appendChild(a); a.click(); a.remove();
    }

    caja.querySelector('.res-bajar').addEventListener('click', async () => {
      msg.textContent = 'Generando imagen…';
      const d = await generar();
      bajar(d);
      msg.textContent = 'Imagen descargada.';
    });

    caja.querySelector('.res-compartir').addEventListener('click', async () => {
      msg.textContent = 'Generando imagen…';
      const d = await generar();
      const archivo = new File([blob], nombre(d), { type: 'image/png' });
      const texto = `Hice ${d.puntos} puntos en "${d.juego}" de qfadesign. ¿Me ganás?`;
      try {
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
          await navigator.share({ files: [archivo], text: texto, title: 'qfadesign' });
          msg.textContent = '';
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') { msg.textContent = ''; return; }
      }
      // sin menú nativo (compu): se descarga la imagen
      bajar(d);
      msg.textContent = 'Tu navegador no puede compartir directo: se descargó la imagen para que la subas donde quieras.';
    });

    // vista previa automática apenas aparece el resultado
    generar().then(() => { msg.textContent = ''; }).catch(() => {});
    return { regenerar: generar };
  }

  window.QFAResultado = { montar, dibujar };
})();
