#!/usr/bin/env python3
"""Une los CSS en paquetes (css/b-*.css) y los achica. Los archivos fuente de css/ NO se tocan: se siguen editando ahí.

Qué paquete lleva cada página lo dice css/bundles.json (lista de archivos, en el mismo orden en que antes se cargaban).
Uso:  python3 scripts/build-css.py        (después de cambiar cualquier css/*.css, y antes de subir)
"""
import json, pathlib, sys

raiz = pathlib.Path(__file__).resolve().parent.parent
css = raiz / "css"
CAB = "/* qfadesign · paquete generado con scripts/build-css.py · no editar acá: editá los archivos fuente de css/ y volvé a generarlo */\n"

def achicar(s):
    """Saca comentarios y espacios sobrantes sin tocar textos, url() ni operadores de calc()."""
    ch, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == "/" and s.startswith("/*", i):
            j = s.find("*/", i + 2)
            if j < 0: raise ValueError("comentario sin cerrar")
            ch.append((" ", "e")); i = j + 2
        elif c in "\"'":
            j = i + 1
            while j < n and s[j] != c:
                j += 2 if s[j] == "\\" else 1
            if j >= n: raise ValueError("texto sin cerrar")
            ch.append((s[i:j + 1], "t")); i = j + 1
        elif s.startswith("url(", i):
            j = i + 4
            while j < n and s[j] in " \t\r\n": j += 1
            if j < n and s[j] in "\"'":
                ch.append(("url(", "t")); i += 4
            else:
                k = s.find(")", j)
                if k < 0: raise ValueError("url( sin cerrar")
                ch.append((s[i:k + 1].replace("\n", "").strip(), "t")); i = k + 1
        elif c.isspace():
            while i < n and s[i].isspace(): i += 1
            ch.append((" ", "e"))
        else:
            ch.append((c, "c")); i += 1
    out = []
    for k, (t, kind) in enumerate(ch):
        if kind == "e":
            prev = out[-1] if out else ""
            sig = next((x[0] for x in ch[k + 1:] if x[1] != "e"), "")
            if not prev or prev == " " or prev[-1] in "{};," or sig[:1] in ("{", "}", ";", ",", ""): continue
            out.append(" ")
        elif t == "}" and kind == "c" and out and out[-1] == ";":
            out[-1] = "}"
        else:
            out.append(t)
    return "".join(out).strip()

def balanceado(txt, nombre):
    d = 0; i = 0; n = len(txt); ok = True
    while i < n:
        c = txt[i]
        if c == "/" and txt.startswith("/*", i):
            i = txt.find("*/", i + 2) + 2; continue
        if c in "\"'":
            j = i + 1
            while j < n and txt[j] != c: j += 2 if txt[j] == "\\" else 1
            i = j + 1; continue
        if c == "{": d += 1
        elif c == "}":
            d -= 1
            if d < 0: ok = False; break
        i += 1
    if not ok or d != 0: raise ValueError(f"{nombre}: llaves sin balancear")

def main():
    man = json.loads((css / "bundles.json").read_text(encoding="utf-8"))
    tot_in = tot_out = 0
    for nombre, fuentes in man.items():
        partes = []
        for f in fuentes:
            t = (css / f).read_text(encoding="utf-8").lstrip("\ufeff")
            balanceado(t, f)
            if t.lstrip().startswith("@charset"): t = t.split(";", 1)[1]
            partes.append(achicar(t)); tot_in += len(t.encode())
        data = CAB + "\n".join(partes) + "\n"
        (css / f"{nombre}.css").write_text(data, encoding="utf-8"); tot_out += len(data.encode())
    print(f"{len(man)} paquetes · {tot_in//1024} KB de fuentes -> {tot_out//1024} KB generados")

if __name__ == "__main__":
    try: main()
    except ValueError as e: sys.exit(f"Error: {e}")
