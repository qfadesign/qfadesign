#!/usr/bin/env python3
"""Regenera sitemap.xml leyendo las páginas HTML del proyecto.

Uso:  python3 scripts/build-sitemap.py
Corrélo después de agregar, quitar o renombrar una página. Toma el dominio del
canonical de index.html y la fecha de última modificación de cada archivo (o de
git, si está disponible).
"""
import re, subprocess, pathlib, datetime

raiz = pathlib.Path(__file__).resolve().parent.parent
dominio = re.search(r'<link rel="canonical" href="(https://[^"]+?)/?"',
                    (raiz / "index.html").read_text(encoding="utf-8")).group(1).rstrip("/")

def fecha(ruta):
    try:
        f = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(ruta)],
                           cwd=raiz, capture_output=True, text=True, check=True).stdout.strip()
        if f: return f
    except Exception:
        pass
    return datetime.date.fromtimestamp(ruta.stat().st_mtime).isoformat()

orden = ["index.html", "portfolio.html", "acerca.html", "contacto.html", "herramientas.html", "jueguitos.html"]
paginas = [p for p in orden if (raiz / p).exists()]
paginas += sorted(p.name for p in raiz.glob("proyecto-*.html"))
paginas += sorted(f"juegos/{p.name}" for p in (raiz / "juegos").glob("*.html"))

filas = []
for p in paginas:
    ruta = raiz / p
    html = ruta.read_text(encoding="utf-8")
    if re.search(r'<meta name="robots" content="[^"]*noindex', html):
        continue
    url = f"{dominio}/" if p == "index.html" else f"{dominio}/{p.removesuffix('.html')}"  # URLs sin .html
    prio = "1.0" if p == "index.html" else "0.9" if p == "portfolio.html" else "0.8" if p.startswith("proyecto-") else "0.6"
    img = ""
    if p.startswith("proyecto-"):
        m = re.search(r'class="pr-portada[^"]*".*?(?:src|poster)="([^"]+)"', html, re.S)
        if m: img = f"\n    <image:image><image:loc>{dominio}/{m.group(1)}</image:loc></image:image>"
    filas.append(f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{fecha(ruta)}</lastmod>\n    <priority>{prio}</priority>{img}\n  </url>")

(raiz / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + "\n".join(filas) + "\n</urlset>\n", encoding="utf-8")
print(f"sitemap.xml: {len(filas)} páginas ({dominio})")
