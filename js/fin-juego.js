/* qfadesign — animación sutil al terminar un jueguito.
   Uso: QFAFin.mostrar(elementoDelPuntaje, {bien: true|false, ratio: 0..1})
   · bien  → ráfaga corta de confeti en los colores de la marca, un aro que se expande y el puntaje que "late".
   · mal   → el puntaje aparece apagado y se sacude apenas, con un aro tenue que se contrae. Nada dramático.
   No hace nada si la persona tiene activada la opción de reducir movimiento. */
(function(){
  if (window.QFAFin) return;

  var css =
  '.qfa-fx{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:9999}' +
  '.qfa-p{position:absolute;left:0;top:0;opacity:0;will-change:transform,opacity;animation:qfaP var(--d) forwards}' +
  '@keyframes qfaP{' +
    '0%{opacity:0;transform:translate(0,0) rotate(0) scale(.4);animation-timing-function:cubic-bezier(.12,.75,.3,1)}' +
    '12%{opacity:1}' +
    '55%{opacity:1;transform:translate(var(--x),var(--y)) rotate(calc(var(--r)*.6)) scale(1);animation-timing-function:ease-in}' +
    '100%{opacity:0;transform:translate(calc(var(--x)*1.06),var(--y2)) rotate(var(--r)) scale(.9)}}' +
  '.qfa-ring{position:absolute;left:0;top:0;border-radius:50%;opacity:0;will-change:transform,opacity}' +
  '.qfa-ring.bien{width:260px;height:260px;margin:-130px 0 0 -130px;border:2px solid rgba(255,255,255,.55);animation:qfaRingB 1.1s cubic-bezier(.2,.7,.3,1) forwards}' +
  '.qfa-ring.mal{width:300px;height:300px;margin:-150px 0 0 -150px;border:2px solid rgba(160,176,204,.3);animation:qfaRingM 1.4s cubic-bezier(.4,0,.6,1) forwards}' +
  '@keyframes qfaRingB{0%{opacity:.9;transform:scale(.25)}100%{opacity:0;transform:scale(1)}}' +
  '@keyframes qfaRingM{0%{opacity:0;transform:scale(1)}25%{opacity:.8}100%{opacity:0;transform:scale(.3)}}' +
  '.qfa-late{animation:qfaLate .95s cubic-bezier(.34,1.56,.64,1)}' +
  '@keyframes qfaLate{0%{transform:scale(.9);text-shadow:0 0 0 rgba(11,117,244,0)}' +
    '40%{transform:scale(1.07);text-shadow:0 0 30px rgba(11,117,244,.7)}' +
    '100%{transform:scale(1);text-shadow:0 0 0 rgba(11,117,244,0)}}' +
  '.qfa-apagado{animation:qfaApagado 1.2s ease-out}' +
  '@keyframes qfaApagado{0%{opacity:.3;transform:translateY(-6px)}' +
    '18%{opacity:.7;transform:translateX(-4px)}30%{transform:translateX(3px)}' +
    '42%{transform:translateX(-2px)}54%{transform:translateX(1px)}' +
    '66%{opacity:1;transform:translateX(0)}100%{opacity:1;transform:none}}' +
  '@media (prefers-reduced-motion:reduce){.qfa-fx{display:none}.qfa-late,.qfa-apagado{animation:none}}';

  var st = document.createElement('style');
  st.id = 'qfa-fin-css';
  st.textContent = css;
  document.head.appendChild(st);

  var COLORES = ['#0b75f4', '#ffffff', '#f9fbf2', '#6fb0ff', '#0b75f4'];
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function reducido(){
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function reiniciar(el, clase){
    el.classList.remove('qfa-late', 'qfa-apagado');
    void el.offsetWidth;
    el.classList.add(clase);
  }

  function disparar(el, o){
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var fx = document.createElement('div');
    fx.className = 'qfa-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.style.left = cx + 'px'; fx.style.top = cy + 'px';

    var ring = document.createElement('div');
    ring.className = 'qfa-ring ' + (o.bien ? 'bien' : 'mal');
    fx.appendChild(ring);

    if (o.bien) {
      var n = (o.ratio >= .9) ? 36 : 22;
      for (var i = 0; i < n; i++) {
        var p = document.createElement('i');
        p.className = 'qfa-p';
        var ang = rnd(-165, -15) * Math.PI / 180;      /* abanico hacia arriba */
        var dist = rnd(80, 190);
        var s = rnd(5, 10);
        p.style.width = s + 'px';
        p.style.height = (Math.random() < .5 ? s : s * .45) + 'px';
        p.style.borderRadius = Math.random() < .35 ? '50%' : '2px';
        p.style.background = COLORES[i % COLORES.length];
        p.style.setProperty('--x', Math.round(Math.cos(ang) * dist) + 'px');
        p.style.setProperty('--y', Math.round(Math.sin(ang) * dist) + 'px');
        p.style.setProperty('--y2', Math.round(Math.sin(ang) * dist + rnd(60, 110)) + 'px');
        p.style.setProperty('--r', Math.round(rnd(-220, 220)) + 'deg');
        p.style.setProperty('--d', rnd(1.2, 1.9).toFixed(2) + 's');
        p.style.animationDelay = rnd(0, .12).toFixed(2) + 's';
        fx.appendChild(p);
      }
    }

    document.body.appendChild(fx);
    setTimeout(function(){ if (fx.parentNode) fx.parentNode.removeChild(fx); }, 2400);
  }

  window.QFAFin = {
    mostrar: function(el, o){
      if (!el) return;
      o = o || {};
      if (reducido()) return;
      /* esperamos a que la pantalla final ya esté visible para medir bien dónde está el puntaje */
      setTimeout(function(){
        reiniciar(el, o.bien ? 'qfa-late' : 'qfa-apagado');
        disparar(el, o);
      }, 140);
    }
  };
})();
