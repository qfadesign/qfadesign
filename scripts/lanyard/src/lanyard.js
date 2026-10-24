/* qfadesign: Lanyard (tarjeta colgante 3D con física).
   Misma idea y mismos parámetros que el componente <Lanyard /> de React, pero en JavaScript puro (sin React ni compilar en la web):

     Lanyard(elemento, {
       frontImage, backImage, strapImage,     // URL o <canvas>
       imageFit: 'cover' | 'contain',
       cardColor, orientation: 'portrait' | 'landscape',
       finish: 'glossy' | 'satin' | 'matte', cornerRadius,   // 0 = esquinas rectas, 1 = muy redondeadas
       size,            // alto de la tarjeta (0.6 ≈ 60 % del alto visible)
       anchor: 'left' | 'center' | 'right', strapLength,      // largo de la cinta, relativo al alto de la tarjeta
       strapColor, strapWidth,                                 // 1 ≈ la mitad del ancho de la tarjeta
       metal: 'silver' | 'gold' | 'black' | 'copper',
       gravity, damping, elasticity, breeze,                   // 0 a 1 (gravity puede pasar de 1)
       interactive, intro
     })

   Devuelve { flip(), destroy() }. Se bundlea con esbuild en js/vendor/lanyard.js (ver README). */
import {
  WebGLRenderer, Scene, PerspectiveCamera, SRGBColorSpace, NoToneMapping, PMREMGenerator, Shape,
  ShapeGeometry, ExtrudeGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Mesh, Group, CanvasTexture,
  BufferGeometry, BufferAttribute, DoubleSide, RepeatWrapping, CatmullRomCurve3, Vector3, DirectionalLight,
  CylinderGeometry, Color
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const DEFAULTS = {
  frontImage: null, backImage: null, strapImage: null, imageFit: 'cover', cardColor: '#ffffff',
  orientation: 'portrait', finish: 'glossy', cornerRadius: 0.3, size: 0.6, anchor: 'center',
  strapLength: 0.5, strapColor: '#111111', strapWidth: 0.65, metal: 'silver',
  gravity: 1, damping: 0.5, elasticity: 0.5, breeze: 0.5, interactive: true, intro: true
};
const METALS = {
  silver: { color: '#cfd4dc', metalness: 1, roughness: 0.22 },
  gold: { color: '#e0b24a', metalness: 1, roughness: 0.26 },
  black: { color: '#26282c', metalness: 1, roughness: 0.34 },
  copper: { color: '#c9764a', metalness: 1, roughness: 0.28 }
};
const FINISH = {
  glossy: { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 },
  satin: { roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 },
  matte: { roughness: 0.85, clearcoat: 0, clearcoatRoughness: 1 }
};
const ASPECT = 0.63;        // ancho / alto de la tarjeta en vertical
const FOV = 25, DT = 1 / 120, N = 9;   // N = tramos de la cinta
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function toImage(src) {
  if (!src) return Promise.resolve(null);
  if (typeof src !== 'string') return Promise.resolve(src);
  return new Promise((ok) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src;
  });
}
/* Dibuja la imagen en un canvas del tamaño de la cara de la tarjeta (cover / contain) */
function faceCanvas(img, w, h, fit, color) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h);
  if (img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const k = (fit === 'contain' ? Math.min : Math.max)(w / iw, h / ih);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k);
  }
  return c;
}
function roundedShape(w, h, r) {
  const s = new Shape(), x = -w / 2, y = -h / 2;
  r = clamp(r, 0, Math.min(w, h) / 2 - 0.001);
  if (r < 0.001) { s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.closePath(); return s; }
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath(); return s;
}
function faceGeometry(shape, w, h) {
  const g = new ShapeGeometry(shape, 24), p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / w + 0.5; uv[i * 2 + 1] = p.getY(i) / h + 0.5; }
  g.setAttribute('uv', new BufferAttribute(uv, 2)); return g;
}

export function Lanyard(host, userOpts = {}) {
  const o = Object.assign({}, DEFAULTS, userOpts);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { o.intro = false; o.breeze = 0; }

  /* ---------- medidas del mundo (el alto visible mínimo es 10 unidades) ---------- */
  const portrait = o.orientation !== 'landscape';
  const ch = o.size * 10 * 0.95 * (portrait ? 1 : 0.62);
  const cw = portrait ? ch * ASPECT : ch / ASPECT;
  const thick = 0.07, clipLen = 0.62;
  const ropeLen = Math.max(0.3, o.strapLength * ch);
  const strapW = clamp(o.strapWidth, 0.1, 2) * cw * 0.55;
  const rodLen = clipLen + ch;                       // del extremo de la cinta al borde de abajo de la tarjeta
  const topPad = 0.35;                               // la cinta nace un poco por encima del borde visible

  /* ---------- renderer / escena ---------- */
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = NoToneMapping;
  const cv = renderer.domElement; cv.className = 'lany-canvas'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.appendChild(cv);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const sun = new DirectionalLight(0xffffff, 1.1); sun.position.set(-4, 8, 10); scene.add(sun);

  /* ---------- tarjeta ---------- */
  const rad = o.cornerRadius * cw * 0.25;
  const shape = roundedShape(cw, ch, rad);
  const fin = FINISH[o.finish] || FINISH.glossy;
  const mkMat = (map) => new MeshPhysicalMaterial(Object.assign({ map, color: 0xffffff, metalness: 0.0, envMapIntensity: 1 }, fin));
  const frontMat = mkMat(null), backMat = mkMat(null);
  const edgeMat = new MeshPhysicalMaterial(Object.assign({ color: new Color(o.cardColor), metalness: 0 }, fin));

  const body = new Mesh(new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 24 }), edgeMat);
  body.position.z = -thick / 2;
  const front = new Mesh(faceGeometry(shape, cw, ch), frontMat); front.position.z = thick / 2 + 0.002;
  const bg = faceGeometry(shape, cw, ch); bg.rotateY(Math.PI);
  const back = new Mesh(bg, backMat); back.position.z = -thick / 2 - 0.002;
  const card = new Group(); card.add(body, front, back);
  card.position.y = -(clipLen + ch / 2);

  /* herrajes */
  const mm = METALS[o.metal] || METALS.silver;
  const metalMat = new MeshStandardMaterial({ color: mm.color, metalness: mm.metalness, roughness: mm.roughness, envMapIntensity: 1.3 });
  const plate = new Mesh(new RoundedBoxGeometry(strapW * 0.92, 0.8, thick + 0.12, 4, 0.06), metalMat);
  plate.position.y = -0.58;
  const rivet = new Mesh(new CylinderGeometry(0.06, 0.06, thick + 0.2, 20), new MeshStandardMaterial({ color: '#15171a', metalness: 0.6, roughness: 0.4 }));
  rivet.rotation.x = Math.PI / 2; rivet.position.y = -0.74;
  const crimp = new Mesh(new RoundedBoxGeometry(strapW * 1.1, 0.36, 0.13, 4, 0.06), metalMat);
  crimp.position.y = -0.02;

  const swing = new Group();      // todo lo que cuelga: se inclina con la varilla
  const yaw = new Group();        // lo que gira sobre el eje vertical (tarjeta + placa)
  yaw.add(card, plate, rivet); swing.add(yaw, crimp);
  scene.add(swing);

  /* ---------- cinta ---------- */
  const SEG = 44;
  const strapGeo = new BufferGeometry();
  const sPos = new Float32Array((SEG + 1) * 6), sUv = new Float32Array((SEG + 1) * 4), sIdx = [];
  for (let i = 0; i < SEG; i++) { const a = i * 2; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  strapGeo.setAttribute('position', new BufferAttribute(sPos, 3));
  strapGeo.setAttribute('uv', new BufferAttribute(sUv, 2)); strapGeo.setIndex(sIdx);
  const strapMat = new MeshStandardMaterial({ color: o.strapColor, roughness: 0.62, metalness: 0, side: DoubleSide, envMapIntensity: 0.6 });
  const strap = new Mesh(strapGeo, strapMat); strap.position.z = -0.03; strap.frustumCulled = false; scene.add(strap);
  let tileLen = strapW * 4;
  const pts = []; for (let i = 0; i <= N; i++) pts.push(new Vector3());
  const curve = new CatmullRomCurve3(pts, false, 'catmullrom', 0.5);

  /* ---------- física (verlet): cinta de N tramos + varilla rígida A (fin de la cinta) – B (borde de abajo) ---------- */
  const P = [], Q = [];   // posiciones actuales y anteriores
  const segLen = ropeLen / N;
  for (let i = 0; i <= N + 1; i++) { P.push({ x: 0, y: 0 }); Q.push({ x: 0, y: 0 }); }
  const invM = []; for (let i = 0; i <= N; i++) invM.push(i === 0 ? 0 : 1); invM[N] = 0.9; invM.push(0.28);
  const iA = N, iB = N + 1;
  let V = 10, anchorX = 0, anchorY = 0;
  let psi = 0, omega = 0, goal = 0, flipping = false, time = 0, pitch = 0;
  const ptr = { down: false, x: 0, y: 0, t: 0, vx: 0, moved: 0, id: null, sx: 0, sy: 0, st: 0, gy: 0 };

  function layout() {
    const w = host.clientWidth || 300, h = host.clientHeight || 400, asp = w / h;
    const needH = (topPad + ropeLen + clipLen + ch) * 1.1;
    const needW = (cw * 1.55) / asp;
    V = Math.max(10, needH, needW);
    const dist = (V / 2) / Math.tan((FOV * Math.PI / 180) / 2);
    camera.aspect = asp; camera.position.set(0, 0, dist); camera.near = 1; camera.far = dist + 40;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    const vw = V * asp, off = o.anchor === 'left' ? -vw * 0.26 : o.anchor === 'right' ? vw * 0.26 : 0;
    anchorX = off; anchorY = V / 2 + topPad;
  }
  function resetPose(intro) {
    layout();
    const ax = anchorX, ay = anchorY;
    const drop = intro ? ropeLen * 0.55 : ropeLen;           // en la caída la cinta arranca floja
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = ax + (intro ? Math.sin(t * 5) * 0.25 * t : 0), y = ay - drop * t;
      P[i].x = Q[i].x = x; P[i].y = Q[i].y = y;
    }
    const a = P[iA], ang = intro ? 0.6 : 0;                  // radianes respecto de la vertical
    const bx = a.x + Math.sin(ang) * rodLen, by = a.y - Math.cos(ang) * rodLen;
    P[iB].x = Q[iB].x = bx; P[iB].y = Q[iB].y = by;
    if (intro) { psi = -2.5; goal = 0; flipping = true; omega = 0; }
    else { psi = 0; goal = 0; flipping = false; omega = 0; }
  }

  function breezeAcc(t) {
    return o.breeze * 7 * (Math.sin(t * 0.63) * 0.5 + Math.sin(t * 1.71 + 1.3) * 0.3 + Math.sin(t * 0.29 + 4.1) * 0.45);
  }
  function worldFromClient(cx, cy) {
    const r = host.getBoundingClientRect();
    const ndcX = ((cx - r.left) / r.width) * 2 - 1, ndcY = -(((cy - r.top) / r.height) * 2 - 1);
    const hh = V / 2, ww = hh * camera.aspect;
    return { x: ndcX * ww, y: ndcY * hh };
  }

  function step() {
    const g = 45 * o.gravity, damp = Math.exp(-(0.1 + o.damping * 1.1) * DT), bx = breezeAcc(time);
    for (let i = 1; i <= N + 1; i++) {
      const p = P[i], q = Q[i], vx = (p.x - q.x) * damp, vy = (p.y - q.y) * damp;
      q.x = p.x; q.y = p.y;
      p.x += vx + (bx * (i === iB ? 1.4 : 0.6)) * DT * DT; p.y += vy - g * DT * DT;
    }
    P[0].x = Q[0].x = anchorX; P[0].y = Q[0].y = anchorY;

    // arrastre con el mouse / dedo: tira del punto agarrado de la tarjeta
    if (ptr.down) {
      const A = P[iA], B = P[iB];
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, t = clamp(ptr.gy, 0, 1);
      const gx = A.x + dx * t, gyy = A.y + dy * t;
      let ex = ptr.x - gx, ey = ptr.y - gyy; const m = Math.hypot(ex, ey), lim = 0.9;
      if (m > lim) { ex *= lim / m; ey *= lim / m; }
      const s = 0.55;
      A.x += ex * (1 - t) * s; A.y += ey * (1 - t) * s; B.x += ex * t * s; B.y += ey * t * s;
    }

    const k = 1 - o.elasticity * 0.55;      // 1 = cinta rígida, menos = un poco elástica
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < N; i++) {
        const a = P[i], b = P[i + 1], wa = invM[i], wb = invM[i + 1];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-6, diff = (d - segLen) / d * k, ws = wa + wb;
        if (ws === 0 || d < segLen) continue;
        a.x += dx * diff * wa / ws; a.y += dy * diff * wa / ws; b.x -= dx * diff * wb / ws; b.y -= dy * diff * wb / ws;
      }
      const a = P[iA], b = P[iB], wa = invM[iA], wb = invM[iB];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, diff = (d - rodLen) / d, ws = wa + wb;
      a.x += dx * diff * wa / ws; a.y += dy * diff * wa / ws; b.x -= dx * diff * wb / ws; b.y -= dy * diff * wb / ws;
      P[0].x = anchorX; P[0].y = anchorY;
    }

    // límites: la tarjeta no sale de la parte visible de la pantalla (ni de los costados ni por abajo)
    {
      const r = host.getBoundingClientRect(), hw = cw * 0.5;
      const wl = worldFromClient(Math.max(r.left, 0), 0).x + hw, wr = worldFromClient(Math.min(r.right, innerWidth), 0).x - hw;
      const sn = Math.abs(P[iB].x - P[iA].x) / rodLen; // inclinación: con la tarjeta torcida, la esquina de abajo baja más que el centro
      const wb = Math.min(worldFromClient(0, Math.min(r.bottom, innerHeight)).y + 0.25 + hw * sn, anchorY - ropeLen - rodLen); // nunca más arriba que la pose de reposo
      for (const i of [iA, iB]) {
        const p = P[i], q = Q[i];
        if (wr > wl) { if (p.x < wl) { p.x = wl; q.x = p.x; } else if (p.x > wr) { p.x = wr; q.x = p.x; } }
      }
      const pb = P[iB]; if (pb.y < wb) { pb.y = wb; Q[iB].y = pb.y; }
    }

    // giro sobre el eje vertical: resorte hacia el frente (o el dorso) + roce
    if (!flipping) goal = Math.round((psi + omega * 0.28) / Math.PI) * Math.PI;
    const ks = flipping ? 15 : 5 + o.elasticity * 9, cs = flipping ? 3.4 : 1.5 + o.damping * 2.2;
    omega += (-ks * (psi - goal) - cs * omega + bx * 0.12) * DT; psi += omega * DT;
    if (flipping && Math.abs(psi - goal) < 0.04 && Math.abs(omega) < 0.6) flipping = false;
    time += DT;
  }

  function place() {
    const A = P[iA], B = P[iB];
    const theta = Math.atan2(B.x - A.x, -(B.y - A.y));
    swing.position.set(A.x, A.y, 0); swing.rotation.z = theta;
    yaw.rotation.y = psi;
    pitch = Math.sin(time * 0.9) * 0.025 * (0.3 + o.breeze);
    yaw.rotation.x = pitch;
    for (let i = 0; i <= N; i++) pts[i].set(P[i].x, P[i].y, 0);
    pts[N].set(A.x, A.y + 0.02, 0);
    let len = 0; for (let i = 1; i <= N; i++) len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
    const tp = new Vector3(), tt = new Vector3();
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG; curve.getPoint(t, tp); curve.getTangent(t, tt);
      const nx = -tt.y, ny = tt.x, nl = Math.hypot(nx, ny) || 1, hw = strapW / 2;
      const o6 = i * 6, o4 = i * 4;
      sPos[o6] = tp.x + nx / nl * hw; sPos[o6 + 1] = tp.y + ny / nl * hw; sPos[o6 + 2] = 0;
      sPos[o6 + 3] = tp.x - nx / nl * hw; sPos[o6 + 4] = tp.y - ny / nl * hw; sPos[o6 + 5] = 0;
      const v = (1 - t) * len / tileLen;
      sUv[o4] = 1; sUv[o4 + 1] = v; sUv[o4 + 2] = 0; sUv[o4 + 3] = v;
    }
    strapGeo.attributes.position.needsUpdate = true; strapGeo.attributes.uv.needsUpdate = true;
    strapGeo.computeBoundingSphere();
    return theta;
  }

  /* ---------- zona interactiva (un <div> que sigue a la tarjeta: solo ahí se agarra, el resto de la página se scrollea normal) ---------- */
  const hit = document.createElement('div');
  hit.className = 'lany-hit'; hit.setAttribute('role', 'button'); hit.tabIndex = o.interactive ? 0 : -1;
  hit.setAttribute('aria-label', 'Tarjeta de Facundo. Tocá para darla vuelta, arrastrala para moverla.');
  hit.style.cssText = 'position:absolute;left:0;top:0;pointer-events:' + (o.interactive ? 'auto' : 'none') + ';touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent;outline-offset:6px;will-change:transform';
  host.appendChild(hit);
  function placeHit(theta) {
    const w = host.clientWidth, h = host.clientHeight, ppu = h / V;
    const A = P[iA], B = P[iB], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const cx0 = A.x + dx / L * (clipLen + ch / 2), cy0 = A.y + dy / L * (clipLen + ch / 2);
    const sx = (cx0 / (V / 2 * camera.aspect) + 1) / 2 * w, sy = (1 - (cy0 / (V / 2) + 1) / 2) * h;
    const hw = cw * Math.max(Math.abs(Math.cos(psi)), 0.3) * ppu, hh = (ch + clipLen * 0.9) * ppu;
    hit.style.width = hw + 'px'; hit.style.height = hh + 'px';
    hit.style.transform = 'translate(' + (sx - hw / 2) + 'px,' + (sy - hh / 2) + 'px) rotate(' + (-theta) + 'rad)';
  }

  function flip() { goal = Math.round(goal / Math.PI) * Math.PI + Math.PI; flipping = true; omega += 2.5; hint(false); }
  const hintEl = host.querySelector('.lany-hint');
  function hint(on) { if (hintEl) hintEl.classList.toggle('off', !on); }

  function pointerDown(e) {
    if (!o.interactive || (e.button !== undefined && e.button > 0)) return;
    hit.setPointerCapture(e.pointerId); hit.style.cursor = 'grabbing';
    const w = worldFromClient(e.clientX, e.clientY), A = P[iA], B = P[iB];
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    ptr.gy = clamp(((w.x - A.x) * dx + (w.y - A.y) * dy) / (L * L), 0.05, 1);
    Object.assign(ptr, { down: true, id: e.pointerId, x: w.x, y: w.y, sx: e.clientX, sy: e.clientY, st: performance.now(), moved: 0, vx: 0 });
  }
  function pointerMove(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    const w = worldFromClient(e.clientX, e.clientY);
    ptr.vx = w.x - ptr.x; ptr.x = w.x; ptr.y = w.y;
    ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy));
    if (ptr.moved > 6) { omega += clamp(ptr.vx * 1.6, -1.6, 1.6); hint(false); }
  }
  function pointerUp(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    ptr.down = false; hit.style.cursor = 'grab';
    if (ptr.moved < 7 && performance.now() - ptr.st < 450) flip();
  }
  hit.addEventListener('pointerdown', pointerDown);
  hit.addEventListener('pointermove', pointerMove);
  hit.addEventListener('pointerup', pointerUp);
  hit.addEventListener('pointercancel', pointerUp);
  hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });

  /* ---------- texturas ---------- */
  const cardPx = portrait ? [900, Math.round(900 / ASPECT)] : [Math.round(900 / ASPECT), 900];
  function mkTex(c, repeat) {
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; }
    t.needsUpdate = true; return t;
  }
  Promise.all([toImage(o.frontImage), toImage(o.backImage), toImage(o.strapImage)]).then(([f, b, s]) => {
    frontMat.map = mkTex(faceCanvas(f, cardPx[0], cardPx[1], o.imageFit, o.cardColor));
    backMat.map = mkTex(faceCanvas(b || f, cardPx[0], cardPx[1], o.imageFit, o.cardColor));
    frontMat.needsUpdate = backMat.needsUpdate = true;
    host.classList.add('lany-on');
    if (s) {
      const sw = s.naturalWidth || s.width, sh = s.naturalHeight || s.height;
      tileLen = strapW * sh / sw;
      strapMat.map = mkTex(s, true); strapMat.color.set(0xffffff); strapMat.needsUpdate = true;
    }
    start();
  });

  /* ---------- bucle ---------- */
  let raf = 0, last = 0, acc = 0, visible = true, running = false, dead = false;
  function frame(now) {
    raf = 0; if (dead || !visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; acc += dt;
    let n = 0; while (acc >= DT && n < 6) { step(); acc -= DT; n++; }
    if (n === 6) acc = 0;
    const th = place(); placeHit(th);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || dead) return; running = true; last = performance.now(); acc = 0;
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); }, { threshold: 0 });
  io.observe(host);
  const onVis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => { layout(); });
  ro.observe(host);

  resetPose(!!o.intro);
  place(); placeHit(0);

  return {
    flip,
    destroy() {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose(); cv.remove(); hit.remove(); host.classList.remove('lany-on');
    },
    _debug: { P, get psi() { return psi; }, flip, settle(sec) { for (let i = 0; i < sec / DT; i++) step(); } }
  };
}
export default Lanyard;
