# qfadesign

Portfolio de **Facundo**, diseñador en Comunicación Visual: identidades de marca, motion graphics y diseño editorial, más herramientas y juegos de diseño.

Es un sitio estático (HTML, CSS y JavaScript, sin frameworks ni paso de compilación). Se publica tal cual con GitHub Pages.

## Estructura

```
index.html                  Inicio
acerca.html · portfolio.html · herramientas.html · jueguitos.html · contacto.html
proyecto-*.html             Una página por proyecto (Árbol, Bleko, Dulcemente, Miga, ROS.exe, Trazo, F1)
juegos/                     Los tres jueguitos
404.html                    Página de error
css/ · js/                 Estilos y scripts (js/vendor: jsPDF, para el PDF de la calculadora)
img/                        Portadas, imágenes de proyectos (img/proyectos) e imágenes para compartir (img/og)
fonts/ · fonts/pdf/         Tipografías (fonts/pdf: versiones TrueType livianas de Articulat, solo para el PDF)
video/                      Video de ROS.exe
favicon.* · icon-*.png · apple-touch-icon.png · site.webmanifest     Íconos de pestaña, Google y celular
robots.txt · sitemap.xml    Para buscadores
scripts/                    Herramientas para mantener la web (ver abajo)
.github/workflows/          Revisión automática en cada subida
```

**Direcciones sin `.html`:** GitHub Pages abre `acerca.html` también como `/acerca`. Todos los enlaces, los canonical y el sitemap usan esa forma, y `scripts/check.py` avisa si algún enlace vuelve a terminar en `.html`. Los archivos siguen llamándose igual.

## Calculadora de precios: PDF y referencias

La calculadora (Herramientas) genera un **PDF del presupuesto** con el detalle de lo elegido y la justificación de cada valor. Se arma en el navegador, sin servidor.

```
js/calculadora.js           Precios base, tipos de cliente, recargo urgente (acá se cambian los precios)
js/calculadora-refs.js      Fuentes y rangos de mercado con los que se justifica cada valor
js/calculadora-pdf.js       Diseño del PDF (portada, detalle, fundamentos, fuentes, condiciones)
js/vendor/jspdf.umd.min.js  Librería jsPDF 4.2.1 (se carga solo al tocar "Descargar")
img/pdf-logo-azul.png       Logo para el PDF (salió de img/Marca_qfadesign_azul.svg)
```

- **Actualizar una referencia:** editá `js/calculadora-refs.js`. Cada servicio lista las fuentes con las que se compara (`min`, `max`, moneda). Los USD se pasan a pesos con el dólar MEP del día. Cambiá también la fecha `consulta`.
- **Servicio sin referencia:** si no figura en `servicios`, el PDF aclara que no se relevó una tarifa comparable y usa las tarifas por hora.
- **Agregar un servicio nuevo:** sumalo en `js/calculadora.js` (con su `id`) y, si hay una fuente, en `js/calculadora-refs.js` con ese mismo `id`.
- **Si cambia un precio base**, el PDF recalcula solo dónde queda frente a cada referencia.
- Si las tipografías o el logo no cargan, el PDF sale igual con Helvetica.

## Publicar en GitHub Pages

1. **Creá el repositorio.** Si querés que la web quede en la raíz de `https://TU-USUARIO.github.io`, llamalo exactamente `TU-USUARIO.github.io`. Si tenés dominio propio, cualquier nombre sirve.
2. **Subí los archivos.** Desde esta carpeta:
   ```bash
   git init -b main
   git add .
   git commit -m "Web qfadesign"
   git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPO.git
   git push -u origin main
   ```
   Si preferís la interfaz web, usá **GitHub Desktop**: arrastrar carpetas a mano suele dejar afuera `.github` y `.nojekyll`, que son archivos ocultos.
3. **Activá Pages.** En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save*. En uno o dos minutos la web queda online.
4. **Cambiá el dominio** (paso siguiente). Es obligatorio: los archivos traen el provisorio `https://qfadesign.com`.

> **Importante:** la página 404 usa rutas desde la raíz (`<base href="/">`). Funciona si la web vive en la raíz del dominio: `usuario.github.io` o un dominio propio. Si la publicás como sitio de proyecto (`usuario.github.io/nombre-repo/`), la 404 no va a cargar bien el estilo.

## Configurar el dominio

Todas las direcciones absolutas (canonical, imágenes para compartir, sitemap, datos estructurados) usan un único dominio. Cambialo con un comando:

```bash
# Con dominio propio (crea además el archivo CNAME que GitHub Pages necesita)
python3 scripts/set-domain.py https://tu-dominio.com

# Con la dirección gratuita de GitHub
python3 scripts/set-domain.py https://tu-usuario.github.io --sin-cname
```

Después hacé commit y push. Con dominio propio, en *Settings → Pages → Custom domain* escribilo y activá **Enforce HTTPS**. En tu proveedor de dominio apuntalo a GitHub: registros `A` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`, y un `CNAME` de `www` a `tu-usuario.github.io` (mirá la [documentación oficial](https://docs.github.com/es/pages/configuring-a-custom-domain-for-your-github-pages-site), que puede cambiar).

## Después de publicar (SEO)

1. Entrá a [Google Search Console](https://search.google.com/search-console), agregá tu dominio y en **Sitemaps** enviá `sitemap.xml`.
2. Probá cómo se ve al compartir en [opengraph.xyz](https://www.opengraph.xyz). Las redes guardan la vista previa: si compartiste un enlace antes, pedí que lo vuelvan a leer.
3. Revisá los datos estructurados con la [prueba de resultados enriquecidos](https://search.google.com/test/rich-results).
4. El ícono en los resultados de Google (`favicon.ico` y `favicon.svg`) puede tardar días o semanas en aparecer.

Ya está resuelto en el código: título, descripción y canonical en cada página, etiquetas Open Graph y Twitter con una imagen de 1200×630 por página, datos estructurados (schema.org), `h1` único por página, texto alternativo en las imágenes, `robots.txt`, `sitemap.xml` y una 404 con `noindex`.

## Mantener la web

```bash
python3 scripts/check.py           # revisa enlaces rotos, SEO y datos estructurados
python3 scripts/build-sitemap.py   # regenera sitemap.xml después de agregar o quitar páginas
```

`check.py` también corre solo en cada subida (pestaña *Actions* del repositorio). Si algo falla, te lo marca en rojo.

### Agregar un proyecto nuevo
1. Duplicá un `proyecto-*.html` parecido y cambiá textos, imágenes y los enlaces anterior/siguiente.
2. Sumá su portada en `img/` y una imagen para compartir de 1200×630 en `img/og/`.
3. Agregalo al carrusel del inicio y al portfolio.
4. Corré `python3 scripts/build-sitemap.py` y `python3 scripts/check.py`.

### Consejos
- Las imágenes de proyecto están en WebP de 1800 px de ancho. Mantené ese formato para que la web cargue rápido.
- GitHub limita los archivos a 100 MB. El video actual pesa unos 5 MB: si agregás más, comprimilos.
- **Tipografías (Adobe Fonts):** Articulat CF y Podium Soft se cargan desde el proyecto web de Adobe Fonts (`https://use.typekit.net/ftd7ahn.css`, enlazado en el `<head>` de cada página). Es la forma que permite la licencia: no se pueden subir los archivos de fuente al sitio. El proyecto sigue funcionando mientras la suscripción a Creative Cloud esté activa. Si agregás una nueva página, copiá ese `<link>`. En el CSS los nombres son `articulat-cf`, `articulat-heavy-cf` (Heavy, 900) y `podium-soft-variable`.

## Contacto

[Instagram](https://www.instagram.com/qfadesign/) · [TikTok](https://www.tiktok.com/@qfadesign) · [Behance](https://www.behance.net/facundocruz5) · [LinkedIn](https://www.linkedin.com/in/facundo-cruz-19a581303/) · qfadesignn@gmail.com

© 2026 Facundo Cruz. Todos los derechos reservados (ver `LICENSE`).
