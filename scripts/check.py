#!/usr/bin/env python3
"""Revisa la web antes de subirla: enlaces rotos, SEO básico y datos estructurados.

Uso:  python3 scripts/check.py        (sale con error si encuentra problemas)
"""
import re, sys, json, pathlib, os

raiz = pathlib.Path(__file__).resolve().parent.parent
errores, avisos = [], []
htmls = sorted(p for p in raiz.rglob("*.html") if ".git" not in p.parts)
dominio = re.search(r'<link rel="canonical" href="(https://[^"]+?)/?"',
                    (raiz / "index.html").read_text(encoding="utf-8")).group(1).rstrip("/")

def local(ruta_html, ref):
    if re.match(r"(https?:|mailto:|tel:|data:|javascript:|#)", ref): return None
    ref = ref.split("#")[0].split("?")[0]
    if not ref: return None
    return (raiz / ref.lstrip("/")) if ref.startswith("/") else (ruta_html.parent / ref)

for p in htmls:
    rel = p.relative_to(raiz).as_posix()
    s = p.read_text(encoding="utf-8")
    es404 = rel == "404.html"
    # recursos locales
    for ref in re.findall(r'(?:href|src|poster)="([^"]+)"', s):
        destino = local(p, ref)
        if destino is not None and not destino.exists():
            errores.append(f"{rel}: no existe {ref}")
    if es404: continue
    # SEO básico
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', s)
    if not t: errores.append(f"{rel}: falta <title>")
    elif len(t.group(1)) > 65: avisos.append(f"{rel}: título largo ({len(t.group(1))} caracteres)")
    if not d: errores.append(f"{rel}: falta meta description")
    elif not 70 <= len(d.group(1)) <= 165: avisos.append(f"{rel}: descripción de {len(d.group(1))} caracteres")
    can = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    esperado = f"{dominio}/" if rel == "index.html" else f"{dominio}/{rel}"
    if not can: errores.append(f"{rel}: falta canonical")
    elif can.group(1) != esperado: errores.append(f"{rel}: canonical {can.group(1)} (esperado {esperado})")
    if len(re.findall(r"<h1[\s>]", s)) != 1: errores.append(f"{rel}: debe tener exactamente un <h1>")
    for prop in ("og:title", "og:description", "og:image", "og:url", "twitter:card"):
        if f'"{prop}"' not in s: errores.append(f"{rel}: falta {prop}")
    og = re.search(r'property="og:image" content="([^"]+)"', s)
    if og and og.group(1).startswith(dominio):
        if not (raiz / og.group(1)[len(dominio) + 1:]).exists(): errores.append(f"{rel}: no existe la imagen {og.group(1)}")
    for img in re.findall(r"<img\b[^>]*>", s):
        if "alt=" not in img: errores.append(f"{rel}: <img> sin alt: {img[:70]}")
    for bloque in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: json.loads(bloque)
        except ValueError as e: errores.append(f"{rel}: JSON-LD inválido ({e})")

# sitemap y robots
sm = raiz / "sitemap.xml"
if sm.exists():
    for u in re.findall(r"<loc>(.*?)</loc>", sm.read_text(encoding="utf-8")):
        if not u.startswith(dominio): errores.append(f"sitemap: {u} no usa el dominio {dominio}")
        else:
            rel = u[len(dominio) + 1:] or "index.html"
            if not (raiz / rel).exists(): errores.append(f"sitemap: no existe {rel}")
else: errores.append("falta sitemap.xml")
if not (raiz / "robots.txt").exists(): errores.append("falta robots.txt")
elif "Sitemap:" not in (raiz / "robots.txt").read_text(encoding="utf-8"): avisos.append("robots.txt no enlaza el sitemap")
for f in ("favicon.ico", "favicon.svg", "apple-touch-icon.png", "site.webmanifest", ".nojekyll"):
    if not (raiz / f).exists(): errores.append(f"falta {f}")
if dominio in ("https://qfadesign.com",) and not (raiz / "CNAME").exists():
    avisos.append("el dominio sigue siendo el provisorio https://qfadesign.com: corré scripts/set-domain.py")

for a in avisos: print("AVISO ", a)
for e in errores: print("ERROR ", e)
print(f"\n{len(htmls)} páginas revisadas · {len(errores)} errores · {len(avisos)} avisos")
sys.exit(1 if errores else 0)
