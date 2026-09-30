#!/usr/bin/env python3
"""Cambia el dominio de toda la web de una vez.

Uso:
    python3 scripts/set-domain.py https://midominio.com
    python3 scripts/set-domain.py https://usuario.github.io --sin-cname

Reemplaza el dominio actual (el del canonical de index.html) en los HTML,
el sitemap, robots.txt y el manifest, y crea el archivo CNAME que GitHub
Pages necesita para un dominio propio.
"""
import re, sys, pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) != 1 or not re.fullmatch(r"https://[a-z0-9.-]+\.[a-z]{2,}", args[0].rstrip("/"), re.I):
    sys.exit("Uso: python3 scripts/set-domain.py https://tu-dominio.com [--sin-cname]")
nuevo = args[0].rstrip("/")

index = (raiz / "index.html").read_text(encoding="utf-8")
actual = re.search(r'<link rel="canonical" href="(https://[^"]+?)/?"', index).group(1).rstrip("/")
if actual == nuevo:
    sys.exit(f"El dominio ya es {nuevo}. No hay nada que cambiar.")

cambios = 0
for ruta in raiz.rglob("*"):
    if not ruta.is_file() or ruta.suffix not in {".html", ".xml", ".txt", ".webmanifest", ".md"}:
        continue
    if ".git" in ruta.parts:
        continue
    texto = ruta.read_text(encoding="utf-8")
    if actual in texto:
        ruta.write_text(texto.replace(actual, nuevo), encoding="utf-8")
        cambios += 1
        print("  actualizado", ruta.relative_to(raiz))

if "--sin-cname" not in sys.argv:
    host = nuevo.removeprefix("https://")
    (raiz / "CNAME").write_text(host + "\n", encoding="utf-8")
    print("  creado CNAME ->", host)
print(f"Listo: {actual}  ->  {nuevo}  ({cambios} archivos)")
