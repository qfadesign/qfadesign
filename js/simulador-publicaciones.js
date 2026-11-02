/* qfadesign — Simulador de publicaciones (Herramientas).
   El visitante sube una o varias imágenes y las ve dentro de una simulación de Instagram:
   feed, historias, reels, carrusel y perfil. Se puede ajustar el encuadre, ver las zonas seguras
   y bajar el recorte al tamaño ideal. Todo pasa en el navegador: no se sube nada a ningún servidor. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var screen = $("smScreen");
  if (!screen) return;

  var root = $("sm"), phone = $("smPhone");
  var MAX = 10;
  var FR = { "1-1": "1/1", "4-5": "4/5", "191-100": "191/100" };            /* proporción del marco en el feed */
  var IDEAL = { "1-1": [1080, 1080], "4-5": [1080, 1350], "191-100": [1080, 566] };
  var STORY = [1080, 1920];
  var GRID = { "3-4": [1080, 1440], "1-1": [1080, 1080] };

  var S = {
    mode: "feed", fmt: "4-5", grid: "3-4", imgs: [], sel: 0, safe: false, dark: true,
    user: $("smUser").value, nombre: $("smNombre").value, bio: $("smBio").value, cap: $("smCap").value, likes: $("smLikes").value
  };

  /* ---------- utilidades ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* logo de Instagram: calcado de la imagen del cliente (vector, toma el color del texto) */
  var WM_VB = "0 0 300.0 67.2";
  var WM_D = "M249.6,13.8 249.6,49.1 256.5,49.0 256.7,24.6 257.5,22.8 259.3,20.6 263.1,19.0 265.5,19.0 268.3,20.3 270.0,22.3 270.8,24.2 271.1,49.1 278.0,49.0 278.2,24.6 279.0,22.8 280.7,20.7 283.0,19.3 284.3,19.0 287.1,19.0 289.3,19.9 291.1,21.5 292.3,23.9 292.6,25.7 292.6,49.1 299.5,49.1 299.5,23.9 299.1,21.4 297.8,18.5 295.0,15.4 292.8,14.1 290.3,13.3 284.5,13.3 281.9,14.1 279.7,15.4 276.5,19.0 275.4,17.3 273.2,15.2 271.6,14.3 268.6,13.3 264.7,13.2 261.9,13.8 259.0,15.4 256.8,17.9 256.4,13.8zM109.9,16.8 107.1,19.9 105.5,22.8 104.1,27.0 103.6,30.6 103.9,35.2 105.0,39.1 106.4,41.9 108.8,45.1 112.4,47.9 114.8,49.0 117.7,49.8 120.9,49.9 125.6,49.0 128.3,47.7 131.6,45.1 132.0,49.1 138.8,49.1 138.8,13.8 132.0,13.8 131.6,17.4 127.0,14.4 122.4,13.2 118.1,13.2 115.2,13.8 112.1,15.2zM119.6,19.3 124.2,19.6 127.5,21.4 130.0,24.2 130.9,26.1 131.9,29.8 131.9,33.1 131.4,35.5 129.4,39.7 126.4,42.4 124.3,43.3 122.0,43.8 118.5,43.5 114.9,41.6 113.3,40.0 111.9,37.8 111.0,35.3 110.5,32.5 111.1,27.2 112.9,23.5 115.9,20.7zM14.4,13.8 14.4,49.0 21.4,49.0 21.4,27.0 22.6,23.4 25.0,20.6 27.2,19.3 29.2,18.8 31.6,19.0 33.8,19.9 35.8,21.8 36.9,23.9 37.5,26.8 37.7,44.6 38.9,47.3 41.3,49.0 43.3,49.6 47.6,49.5 50.4,48.4 52.6,46.3 57.3,36.6 62.6,21.4 64.7,24.3 72.1,33.1 73.5,36.1 73.6,39.1 72.5,41.6 70.6,43.2 68.9,43.8 64.4,43.6 61.7,42.5 60.1,41.4 57.5,47.1 59.7,48.4 63.1,49.5 65.1,49.8 70.0,49.6 73.6,48.5 76.0,47.1 77.9,45.4 79.4,42.9 80.4,39.6 80.4,36.1 79.6,33.3 76.8,28.6 69.7,20.3 68.0,17.6 66.4,13.7 58.6,13.8 56.8,20.1 52.4,32.5 47.7,42.9 46.5,43.8 45.7,43.8 44.6,43.0 44.6,27.5 44.1,23.5 42.9,19.8 40.0,16.0 38.0,14.6 35.2,13.5 30.0,13.2 27.3,13.8 25.1,14.9 21.5,18.5 21.4,13.8zM243.2,14.0 236.3,14.0 235.9,17.6 231.7,14.6 228.4,13.5 225.1,13.0 220.1,13.7 216.2,15.4 214.6,16.5 211.0,20.6 209.4,23.7 208.5,26.7 208.0,29.7 208.0,33.1 208.5,36.3 209.7,40.2 206.8,42.7 203.5,43.8 200.5,43.6 197.8,42.2 196.4,40.3 195.6,37.5 195.9,33.0 198.0,27.8 200.9,23.5 204.6,20.1 201.6,14.0 183.4,14.0 183.4,20.3 196.1,20.4 192.3,25.6 190.6,29.0 189.3,33.0 188.9,36.9 189.0,39.4 189.8,42.5 190.9,44.7 192.8,46.9 195.1,48.5 200.3,49.9 204.1,49.8 207.4,48.8 210.0,47.4 212.9,44.9 215.2,46.9 218.2,48.7 223.1,49.9 226.1,49.9 230.5,48.8 234.1,46.8 236.1,44.9 236.3,49.1 243.0,49.1zM225.0,19.2 228.7,19.6 231.7,21.2 234.4,24.2 235.6,27.0 236.3,30.1 235.9,34.7 234.5,38.5 231.4,41.9 229.8,42.9 227.3,43.6 222.9,43.5 219.5,41.8 216.8,38.8 215.5,35.9 214.9,33.0 214.9,29.8 215.4,27.5 217.4,23.2 220.4,20.6 223.1,19.5zM179.1,14.0 172.2,14.0 171.9,17.6 168.9,15.2 163.9,13.3 160.9,13.0 155.6,13.8 150.5,16.5 147.6,19.6 145.5,23.2 144.0,29.2 144.0,33.8 144.9,38.1 146.9,42.4 150.2,46.2 154.0,48.5 157.8,49.8 155.6,51.3 153.7,53.5 152.9,55.3 152.6,57.8 153.1,60.4 154.3,62.8 155.9,64.4 157.9,65.5 163.1,66.7 166.1,66.7 169.7,65.9 173.9,63.6 176.5,60.9 178.0,58.1 179.0,54.3zM171.9,45.1 172.1,53.8 171.7,55.7 170.8,57.6 169.1,59.3 166.1,60.6 162.6,60.4 160.4,59.2 159.3,57.5 159.2,55.7 160.6,52.7 162.6,50.9 168.1,47.9zM160.8,19.2 164.1,19.5 168.0,21.5 170.3,24.3 172.1,29.4 171.7,35.0 169.9,39.4 168.0,41.4 164.7,43.3 161.9,43.8 157.9,43.2 154.8,41.3 153.2,39.6 152.0,37.4 150.9,33.3 151.0,28.6 153.1,23.5 155.1,21.4 156.5,20.4zM86.0,4.9 86.0,13.7 78.8,13.8 78.8,20.1 85.7,20.1 86.0,20.4 86.0,41.8 87.3,45.4 88.7,47.1 91.5,48.8 94.3,49.5 97.6,49.5 101.7,48.4 103.5,47.4 100.9,42.2 98.3,43.2 95.8,43.3 94.5,42.7 93.1,40.8 93.1,20.3 101.3,20.1 101.3,13.8 93.1,13.7 93.1,3.5zM7.7,0.3 0.3,2.0 0.3,49.0 7.7,49.0z";
  function wordmark() {
    return '<svg class="sm-wm" viewBox="' + WM_VB + '" role="img" aria-label="Instagram"><path fill="currentColor" fill-rule="evenodd" d="' + WM_D + '"/></svg>';
  }

  /* íconos de trazo, redibujados a partir de los de Instagram */
  var P = {
    heart: '<path d="M12 20.4C6.6 15.9 3 12.9 3 9a4.6 4.6 0 0 1 4.6-4.600c1.8 0 3.3.9 4.4 2.6 1.1-1.7 2.6-2.6 4.4-2.600A4.6 4.6 0 0 1 21 9c0 3.9-3.6 6.9-9 11.400z"/>',
    comment: '<path d="M20.660 17.010a9.990 9.990 0 1 0-3.590 3.615L22 22z"/>',
    repost: '<path d="M4 11.500V10a4 4 0 0 1 4-4h11"/><path d="m16 2.5 3.5 3.500L16 9.5"/><path d="M20 12.500V14a4 4 0 0 1-4 4H5"/><path d="m8 14.5-3.5 3.500L8 21.5"/>',
    send: '<path d="M4.2 5.200h15.600a.9.9 0 0 1 .8 1.300l-7.8 13.600a.9.9 0 0 1-1.6 0L4.6 6.500a.9.9 0 0 1 .8-1.300z"/><path d="m11.9 13.2 4.6-4.7"/>',
    save: '<path d="M5.5 3.500h13v17.500L12 15.8 5.5 21z"/>',
    home: '<path d="M3.5 11 12 3.500l8.5 7.500v9.500h-6v-6h-5v6h-6z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    reels: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M3.5 9h17M9 3.500l3 5.500M14.5 3.500l3 5.5"/><path d="M10.5 12.500v4l3.5-2z"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.500c1-4 4-5.5 7.5-5.500s6.5 1.5 7.5 5.5"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    music: '<path d="M9 17V5l10-2v12"/><circle cx="6.5" cy="17" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="m8 7 1.5-3h5L16 7"/>',
    dots: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
    grid: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M3.5 9.200h17M3.5 14.800h17M9.2 3.500v17M14.8 3.500v17"/>',
    tag: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M6.8 19c.7-2.8 2.8-4 5.2-4s4.5 1.2 5.2 4"/>',
    plus: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    down: '<path d="m6 9 6 6 6-6"/>'
  };
  function ic(n, cls) {
    return '<svg class="sm-ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + "</svg>";
  }
  function chev(dir) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (dir === "i" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") + '"/></svg>';
  }

  /* ---------- piezas de la simulación ---------- */
  function sbar() {
    return '<div class="sm-sbar" aria-hidden="true"><span>9:41</span><span class="sm-isl"></span><i><b></b></i></div>';
  }
  function avatar() { return '<span class="sm-av">' + esc((S.user || "t").charAt(0)) + "</span>"; }
  function usuario() { return esc(S.user || "tumarca"); }

  function frame(img, ratio, cls, i) {
    var st = ratio ? "aspect-ratio:" + ratio + ";" : "";
    if (!img) {
      return '<div class="sm-fr ' + cls + '" style="' + st + '"><div class="sm-vacio">Tu diseño va acá<small>Subí una imagen para verla</small></div></div>';
    }
    return '<div class="sm-fr ' + cls + '" data-i="' + i + '" style="' + st + '"><img src="' + img.src + '" alt="" style="object-position:' + img.x + "% " + img.y + '%"></div>';
  }

  function vFeed(carr) {
    var imgs = S.imgs, ratio = FR[S.fmt], media, dots = "", n = imgs.length || 1;
    if (carr) {
      var list = imgs.length ? imgs : [null];
      media = '<div class="sm-slw"><div class="sm-sl" id="smSl">' +
        list.map(function (im, i) { return frame(im, ratio, "", i); }).join("") +
        '</div><span class="sm-bdg" id="smBdg">' + (S.sel + 1) + "/" + n + "</span>" +
        (n > 1 ? '<button class="sm-ar i" type="button" id="smAI" aria-label="Imagen anterior" hidden>' + chev("i") + '</button><button class="sm-ar d" type="button" id="smAD" aria-label="Imagen siguiente">' + chev("d") + "</button>" : "") +
        "</div>";
      if (n > 1) {
        dots = '<span class="sm-dts" id="smDts" aria-hidden="true">' +
          list.map(function (_, i) { return "<i" + (i === S.sel ? ' class="on"' : "") + "></i>"; }).join("") + "</span>";
      }
    } else {
      media = frame(imgs[S.sel] || null, ratio, "sm-drag", S.sel);
    }
    return '<div class="sm-view sm-feed">' + sbar() +
      '<div class="sm-top">' + wordmark() + '<span>' + ic("heart") + ic("send") + "</span></div>" +
      '<div class="sm-scroll"><article>' +
      '<header class="sm-ph">' + avatar() + '<span class="sm-un">' + usuario() + '</span><span class="sm-mas" aria-hidden="true">···</span></header>' +
      media +
      '<div class="sm-act">' + ic("heart") + ic("comment") + ic("repost") + ic("send") + dots + '<span class="sm-gd">' + ic("save","sq") + "</span></div>" +
      (S.likes ? '<p class="sm-likes">' + esc(S.likes) + " Me gusta</p>" : "") +
      '<p class="sm-cap"><strong>' + usuario() + "</strong> " + esc(S.cap) + "</p>" +
      '<p class="sm-mut">Ver los 12 comentarios</p>' +
      "</article></div>" +
      '<div class="sm-bn" aria-hidden="true">' + ic("home") + ic("reels") + ic("send") + ic("search") + avatar() + "</div></div>";
  }

  function zonas(tipo) {
    var txt = "<span>La interfaz tapa esta zona</span>";
    if (tipo === "story") {
      return '<div class="sm-sz t" style="height:14%">' + txt + '</div><div class="sm-sz b" style="height:14%">' + txt + "</div>";
    }
    return '<div class="sm-sz t" style="height:14%">' + txt + '</div><div class="sm-sz b" style="height:35%">' + txt + "</div>" +
      '<div class="sm-sz l" style="top:14%;bottom:35%;width:6%"><span></span></div><div class="sm-sz r" style="top:14%;bottom:35%;width:6%"><span></span></div>';
  }

  function vStory() {
    return '<div class="sm-view sm-over">' + sbar() +
      '<div class="sm-st sm-drag" data-i="' + S.sel + '">' + frame(S.imgs[S.sel] || null, "", "", S.sel) +
      '<div class="sm-bars" aria-hidden="true"><i class="ok"></i><i class="on"></i><i></i></div>' +
      '<div class="sm-sh" aria-hidden="true">' + avatar() + "<strong>" + usuario() + "</strong><time>2 h</time><span class=\"sm-mas\">···</span>" + ic("close") + "</div>" +
      '<div class="sm-msg" aria-hidden="true"><span>Enviar mensaje</span>' + ic("heart") + ic("send") + "</div>" +
      (S.safe ? zonas("story") : "") + "</div></div>";
  }

  function vReel() {
    return '<div class="sm-view sm-over">' + sbar() +
      '<div class="sm-st sm-drag" data-i="' + S.sel + '">' + frame(S.imgs[S.sel] || null, "", "", S.sel) +
      '<div class="sm-rt" aria-hidden="true"><span>Reels</span>' + ic("camera") + "</div>" +
      '<div class="sm-col" aria-hidden="true"><span>' + ic("heart") + "24 mil</span><span>" + ic("comment") + "312</span><span>" + ic("repost") + "89</span><span>" + ic("send") + "1.056</span>" + ic("dots") + '<i class="sm-disc"></i></div>' +
      '<div class="sm-pie" aria-hidden="true"><div class="l1">' + avatar() + "<strong>" + usuario() + '</strong><span class="seg">Seguir</span></div><p>' + esc(S.cap) + '</p><div class="au">' + ic("music") + usuario() + " · Audio original</div></div>" +
      (S.safe ? zonas("reel") : "") + "</div></div>";
  }


  function vProfile() {
    var n = S.imgs.length, total = Math.max(12, Math.ceil(n / 3) * 3), ratio = S.grid === "1-1" ? "1/1" : "3/4", tiles = "", i;
    for (i = 0; i < total; i++) {
      var im = S.imgs[i];
      tiles += im
        ? '<span class="sm-tl" style="aspect-ratio:' + ratio + '"><img src="' + im.src + '" alt=""></span>'
        : '<span class="sm-tl sm-t0' + (i === 0 ? " p" : "") + '" style="aspect-ratio:' + ratio + '">' + (i === 0 ? "<b>Tu diseño</b>" : "") + "</span>";
    }
    var dest = ["Trabajos", "Proceso", "Clientes"].map(function (t) {
      return '<span class="sm-hl"><i>' + ic("camera") + "</i>" + t + "</span>";
    }).join("");
    return '<div class="sm-view sm-feed">' + sbar() +
      '<div class="sm-top"><span class="sm-pun">' + usuario() + ic("down") + '</span><span>' + ic("plus") + ic("menu") + "</span></div>" +
      '<div class="sm-scroll"><section class="sm-pf">' +
      '<div class="sm-pf1"><span class="sm-av sm-avg">' + esc((S.user || "t").charAt(0)) + "</span>" +
      '<div class="sm-stt"><span><b>128</b>publicaciones</span><span><b>12,4 mil</b>seguidores</span><span><b>311</b>seguidos</span></div></div>' +
      '<p class="sm-nm">' + esc(S.nombre) + "</p>" +
      (S.bio ? '<p class="sm-bio">' + esc(S.bio) + "</p>" : "") +
      '<div class="sm-bt"><span>Editar perfil</span><span>Compartir perfil</span></div>' +
      '<div class="sm-hls">' + dest + "</div>" +
      '<div class="sm-tabs">' + '<span class="on">' + ic("grid") + "</span><span>" + ic("reels") + "</span><span>" + ic("tag") + "</span></div>" +
      '<div class="sm-gr">' + tiles + "</div></section></div>" +
      '<div class="sm-bn" aria-hidden="true">' + ic("home") + ic("reels") + ic("send") + ic("search") + avatar() + "</div></div>";
  }

  /* ---------- dibujo ---------- */
  function render() {
    var v = S.mode === "feed" ? vFeed(false) : S.mode === "carrusel" ? vFeed(true) : S.mode === "story" ? vStory() : S.mode === "profile" ? vProfile() : vReel();
    screen.innerHTML = v;
    phone.setAttribute("data-t", S.dark ? "dark" : "light");
    root.setAttribute("data-mode", S.mode);
    bindCarrusel();
  }

  function actual() { return S.imgs[S.sel] || null; }
  function tam() {
    if (S.mode === "story" || S.mode === "reel") return STORY;
    if (S.mode === "profile") return GRID[S.grid];
    return IDEAL[S.fmt];
  }

  function pintarMiniaturas() {
    var th = $("smTh");
    th.hidden = !S.imgs.length;
    $("smOrd").hidden = !S.imgs.length;
    th.innerHTML = S.imgs.map(function (im, i) {
      return '<button type="button" data-i="' + i + '" style="background-image:url(\'' + im.src + '\')" aria-label="Imagen ' + (i + 1) + " de " + S.imgs.length + '"' + (i === S.sel ? ' aria-current="true"' : "") + "></button>";
    }).join("");
    $("smIzq").disabled = S.sel <= 0;
    $("smDer").disabled = S.sel >= S.imgs.length - 1;
  }

  function actualizarControles() {
    var m = S.mode, im = actual();
    [].forEach.call($("smModos").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-mode") === m ? "true" : "false");
    });
    [].forEach.call($("smFmts").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-fmt") === S.fmt ? "true" : "false");
    });
    [].forEach.call($("smGrids").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-grid") === S.grid ? "true" : "false");
    });
    $("smBlFmt").hidden = !(m === "feed" || m === "carrusel");
    $("smBlGrid").hidden = m !== "profile";
    $("smBlEnc").hidden = m === "profile";
    $("smSafe").hidden = !(m === "story" || m === "reel");
    $("smSafe").setAttribute("aria-pressed", S.safe ? "true" : "false");
    $("smTema").setAttribute("aria-pressed", S.dark ? "true" : "false");
    $("smAyDrag").hidden = m === "carrusel";
    $("smX").disabled = $("smY").disabled = !im;
    $("smX").value = im ? Math.round(im.x) : 50;
    $("smY").value = im ? Math.round(im.y) : 50;
    pintarMiniaturas();
    informar();
  }

  function informar() {
    var im = actual(), d = tam(), fr = d[0] / d[1], m = S.mode, t = "Tamaño ideal: <strong>" + d[0] + " × " + d[1] + " px</strong>. ";
    if (!im) {
      t += "Subí una imagen para ver cómo se recorta.";
    } else {
      var r = im.w / im.h;
      t += "Tu imagen: " + im.w + " × " + im.h + " px. ";
      if (Math.abs(r - fr) / fr < 0.01) t += "Encaja justo, <strong>no se recorta</strong>.";
      else if (r > fr) t += "Se recorta un <em>" + Math.round((1 - fr / r) * 100) + " %</em> a los costados.";
      else t += "Se recorta un <em>" + Math.round((1 - r / fr) * 100) + " %</em> arriba y abajo.";
      if (im.w < d[0]) t += " <em>Mide menos de " + d[0] + " px de ancho: puede verse borrosa.</em>";
    }
    if (m === "carrusel" && S.imgs.length < 2) t += " Sumá más imágenes para ver el carrusel completo.";
    if (m === "profile") t += " En el perfil Instagram recorta al centro de cada imagen.";
    if (m !== "carrusel" && m !== "profile" && S.imgs.length > 1) t += " Tenés " + S.imgs.length + " imágenes: elegí Carrusel para verlas todas.";
    if ((m === "story" || m === "reel") && !S.safe) t += " Activá las zonas seguras para ver dónde la app tapa tu diseño.";
    $("smInfo").innerHTML = t;
    var b = $("smBajar");
    b.disabled = !im;
    b.textContent = (m === "profile" ? "Bajar esta miniatura (" : "Bajar este recorte (") + d[0] + " × " + d[1] + ")";
  }

  function aplicarPos() {
    [].forEach.call(screen.querySelectorAll("[data-i]"), function (el) {
      var im = S.imgs[+el.getAttribute("data-i")], img = el.querySelector("img");
      if (im && img) img.style.objectPosition = im.x + "% " + im.y + "%";
    });
  }

  /* ---------- carrusel ---------- */
  function bindCarrusel() {
    var sl = $("smSl");
    if (!sl) return;
    var n = S.imgs.length || 1;
    sl.scrollLeft = S.sel * sl.clientWidth;
    var ai = $("smAI"), ad = $("smAD");
    function marcar(i) {
      var bdg = $("smBdg"); if (bdg) bdg.textContent = (i + 1) + "/" + n;
      [].forEach.call(screen.querySelectorAll("#smDts i"), function (d, k) { d.className = k === i ? "on" : ""; });
      if (ai) ai.hidden = i === 0;
      if (ad) ad.hidden = i === n - 1;
    }
    marcar(S.sel);
    var tick = null;
    sl.addEventListener("scroll", function () {
      var w = sl.clientWidth || 1, i = clamp(Math.round(sl.scrollLeft / w), 0, n - 1);
      marcar(i);
      if (i !== S.sel) {
        S.sel = i;
        clearTimeout(tick);
        tick = setTimeout(actualizarControles, 60);
      }
    }, { passive: true });
    if (ai) ai.addEventListener("click", function () { sl.scrollBy({ left: -sl.clientWidth, behavior: "smooth" }); });
    if (ad) ad.addEventListener("click", function () { sl.scrollBy({ left: sl.clientWidth, behavior: "smooth" }); });
  }

  /* ---------- cargar imágenes ---------- */
  function cargar(file) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok({ src: url, w: im.naturalWidth, h: im.naturalHeight, x: 50, y: 50 }); };
      im.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      im.src = url;
    });
  }

  function agregar(files) {
    var arr = [].slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
    var ay = $("smDropAy");
    if (!arr.length) { ay.textContent = "Ese archivo no es una imagen. Probá con JPG, PNG o WebP."; return; }
    var lugar = MAX - S.imgs.length;
    if (lugar <= 0) { ay.textContent = "Llegaste al máximo de " + MAX + " imágenes. Quitá alguna para sumar otra."; return; }
    var recorto = arr.length > lugar;
    arr = arr.slice(0, lugar);
    Promise.all(arr.map(cargar)).then(function (lista) {
      lista = lista.filter(Boolean);
      if (!lista.length) { ay.textContent = "No pude leer esa imagen. Probá con JPG, PNG o WebP."; return; }
      var primera = S.imgs.length;
      lista.forEach(function (im) { S.imgs.push(im); });
      S.sel = primera;
      ay.textContent = recorto ? "Se cargaron " + lista.length + " (el máximo es " + MAX + ")." : "Podés sumar hasta " + MAX + " imágenes (para el carrusel).";
      render();
      actualizarControles();
    });
  }

  var drop = $("smDrop"), file = $("smFile");
  file.addEventListener("change", function () { agregar(file.files); file.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("on"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("on"); });
  });
  drop.addEventListener("drop", function (e) { agregar(e.dataTransfer && e.dataTransfer.files); });
  document.addEventListener("paste", function (e) {
    var fs = e.clipboardData && e.clipboardData.files;
    if (fs && fs.length) agregar(fs);
  });

  /* ---------- miniaturas, orden y quitar ---------- */
  function ir(i) {
    S.sel = i;
    var sl = $("smSl");
    if (S.mode === "carrusel" && sl) {
      sl.scrollTo({ left: i * sl.clientWidth, behavior: "smooth" });
      actualizarControles();
    } else {
      render();
      actualizarControles();
    }
  }
  $("smTh").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (b) ir(+b.getAttribute("data-i"));
  });
  function mover(d) {
    var j = S.sel + d;
    if (j < 0 || j >= S.imgs.length) return;
    var t = S.imgs[S.sel]; S.imgs[S.sel] = S.imgs[j]; S.imgs[j] = t;
    S.sel = j;
    render();
    actualizarControles();
  }
  $("smIzq").addEventListener("click", function () { mover(-1); });
  $("smDer").addEventListener("click", function () { mover(1); });
  $("smQuitar").addEventListener("click", function () {
    if (!S.imgs.length) return;
    URL.revokeObjectURL(S.imgs[S.sel].src);
    S.imgs.splice(S.sel, 1);
    S.sel = clamp(S.sel, 0, Math.max(0, S.imgs.length - 1));
    render();
    actualizarControles();
  });

  /* ---------- modos, formato y vista ---------- */
  $("smModos").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-mode]");
    if (!b) return;
    S.mode = b.getAttribute("data-mode");
    render();
    actualizarControles();
  });
  $("smFmts").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-fmt]");
    if (!b) return;
    S.fmt = b.getAttribute("data-fmt");
    render();
    actualizarControles();
  });
  $("smGrids").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-grid]");
    if (!b) return;
    S.grid = b.getAttribute("data-grid");
    render();
    actualizarControles();
  });
  $("smTema").addEventListener("click", function () { S.dark = !S.dark; render(); actualizarControles(); });
  $("smSafe").addEventListener("click", function () { S.safe = !S.safe; render(); actualizarControles(); });

  /* ---------- encuadre: deslizadores ---------- */
  function desdeSliders() {
    var im = actual();
    if (!im) return;
    im.x = +$("smX").value;
    im.y = +$("smY").value;
    aplicarPos();
  }
  $("smX").addEventListener("input", desdeSliders);
  $("smY").addEventListener("input", desdeSliders);

  /* ---------- encuadre: arrastrar la imagen dentro del celular ---------- */
  var drg = null;
  screen.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".sm-drag");
    if (!el || S.mode === "carrusel") return;
    var im = S.imgs[+el.getAttribute("data-i")];
    if (!im) return;
    var r = el.getBoundingClientRect(), esc2 = Math.max(r.width / im.w, r.height / im.h);
    drg = { el: el, im: im, x0: e.clientX, y0: e.clientY, px: im.x, py: im.y, ox: im.w * esc2 - r.width, oy: im.h * esc2 - r.height };
    el.classList.add("ar");
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  screen.addEventListener("pointermove", function (e) {
    if (!drg) return;
    if (drg.ox > 0.5) drg.im.x = clamp(drg.px - (e.clientX - drg.x0) / drg.ox * 100, 0, 100);
    if (drg.oy > 0.5) drg.im.y = clamp(drg.py - (e.clientY - drg.y0) / drg.oy * 100, 0, 100);
    aplicarPos();
    $("smX").value = Math.round(drg.im.x);
    $("smY").value = Math.round(drg.im.y);
  });
  function soltar() { if (drg) { drg.el.classList.remove("ar"); drg = null; } }
  screen.addEventListener("pointerup", soltar);
  screen.addEventListener("pointercancel", soltar);

  /* ---------- perfil ---------- */
  function perfil() {
    S.user = $("smUser").value.trim();
    S.cap = $("smCap").value;
    S.likes = $("smLikes").value.trim();
    S.nombre = $("smNombre").value.trim();
    S.bio = $("smBio").value.trim();
    render();
  }
  ["smUser", "smCap", "smLikes", "smNombre", "smBio"].forEach(function (id) { $(id).addEventListener("input", perfil); });

  /* ---------- bajar el recorte ---------- */
  $("smBajar").addEventListener("click", function () {
    var im = actual();
    if (!im) return;
    var d = tam(), c = document.createElement("canvas"), img = new Image();
    c.width = d[0]; c.height = d[1];
    img.onload = function () {
      var s = Math.max(d[0] / img.naturalWidth, d[1] / img.naturalHeight);
      var dw = img.naturalWidth * s, dh = img.naturalHeight * s, ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      var px = S.mode === "profile" ? 50 : im.x, py = S.mode === "profile" ? 50 : im.y;
      ctx.drawImage(img, -(dw - d[0]) * px / 100, -(dh - d[1]) * py / 100, dw, dh);
      c.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (S.mode === "profile" ? "qfadesign-miniatura-" : "qfadesign-recorte-") + d[0] + "x" + d[1] + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }, "image/png");
    };
    img.src = im.src;
  });

  render();
  actualizarControles();
})();
