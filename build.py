#!/usr/bin/env python3
"""Rebuilds dist/festival_dashboard.html from src/template.html + src/data.js + src/logic.js.

Run this after editing src/data.js (festival research) or src/logic.js (render logic).
Fonts are pre-fetched, base64-encoded copies checked into src/fonts/ — no network
access needed to build.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"

template = (SRC / "template.html").read_text()
archivo_b64 = (SRC / "fonts" / "archivo-var.b64").read_text().strip()
bebas_b64 = (SRC / "fonts" / "bebasneue.b64").read_text().strip()
script = (SRC / "data.js").read_text() + "\n" + (SRC / "logic.js").read_text()

out = (
    template.replace("__ARCHIVO_B64__", archivo_b64)
    .replace("__BEBAS_B64__", bebas_b64)
    .replace("__DATA_SCRIPT__", script)
)

dist_dir = ROOT / "dist"
dist_dir.mkdir(exist_ok=True)
out_path = dist_dir / "festival_dashboard.html"
out_path.write_text(out)
print(f"Built {out_path} ({len(out):,} bytes)")
