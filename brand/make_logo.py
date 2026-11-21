#!/usr/bin/env python3
"""Haptics360 logo — mark is the real app icon (Haptics360.ico largest frame),
wordmark is Segoe UI Semibold outlines via fontTools. Emits SVG masters + PNGs."""
import base64
import io

import resvg_py
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from PIL import Image

FONT = r"C:\Windows\Fonts\segoeuib.ttf"
ICON = r"F:\AI-Projects\Haptics360\packaging\h360-icon-256.png"
OUT = r"F:\AI-Projects\Haptics360-Website\brand"
INK = "#EDEDEA"
INK_DARK = "#191B1E"
ACCENT = "#E8843C"

font = TTFont(FONT)
UPM = font["head"].unitsPerEm
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]

# ---- icon: embed at native 256 (already the largest frame) ----
icon = Image.open(ICON).convert("RGBA")
buf = io.BytesIO()
icon.save(buf, "PNG")
ICON_B64 = base64.b64encode(buf.getvalue()).decode()

DISP_H = 62.0
DISP_W = DISP_H  # icon is square
ICON_X = 7.0
ICON_Y = (76 - DISP_H) / 2

# ---- wordmark: "Haptics" ink + "360" accent ----
def text_paths(word, x0, fill):
    parts = []
    pen_x = x0
    for c in word:
        gname = cmap[ord(c)]
        pen = SVGPathPen(glyphs)
        glyphs[gname].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(
                f'<path d="{d}" transform="translate({pen_x:.2f} {BASELINE_Y:.2f}) '
                f'scale({SCALE:.6f} {-SCALE:.6f})"/>'
            )
        pen_x += hmtx[gname][0] * SCALE + TRACK
    return parts, pen_x - TRACK

bp = BoundsPen(glyphs)
glyphs[cmap[ord("H")]].draw(bp)
cap_h = bp.bounds[3] - bp.bounds[1]
SCALE = 46.0 / cap_h
CAP_PX = cap_h * SCALE
BASELINE_Y = (76 + CAP_PX) / 2 - 1
TRACK = 1.5

p1, x1 = text_paths("Haptics", ICON_X + DISP_W + 20, INK)
p2, x2 = text_paths("360", x1 + 8, ACCENT)
text_svg_ink = "\n  ".join(p1)
text_svg_acc = "\n  ".join(p2)


def logo_svg(ink, acc=ACCENT):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 76" width="450" height="76">\n'
        f'  <image href="data:image/png;base64,{ICON_B64}" x="{ICON_X:.1f}" y="{ICON_Y:.1f}" '
        f'width="{DISP_W:.1f}" height="{DISP_H:.1f}"/>\n'
        f'  <g fill="{ink}">\n  {text_svg_ink}\n  </g>\n'
        f'  <g fill="{acc}">\n  {text_svg_acc}\n  </g>\n'
        "</svg>\n"
    )


def emit(svg_text, prefix):
    with open(f"{OUT}/{prefix}.svg", "w", encoding="utf-8") as f:
        f.write(svg_text)
    for w, h, suf in [(450, 76, "450x76"), (225, 38, "225x38"), (113, 19, "113x19")]:
        png = resvg_py.svg_to_bytes(svg_text, width=w, height=h)
        im = Image.open(io.BytesIO(png)).convert("RGBA")
        im.save(f"{OUT}/{prefix}-{suf}.png")
        print(prefix, suf, im.size)


emit(logo_svg(INK), "h360-logo")
emit(logo_svg(INK_DARK), "h360-logo-dark")

# favicon: icon on dark rounded tile
tile = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
rr = 56
mask = Image.new("L", (256, 256), 0)
from PIL import ImageDraw
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 255, 255], radius=rr, fill=255)
tile.paste(icon.resize((256, 256)), (0, 0), mask)
buf2 = io.BytesIO(); tile.save(buf2, "PNG")
fav_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76" width="76" height="76">\n'
    f'  <image href="data:image/png;base64,{base64.b64encode(buf2.getvalue()).decode()}" width="76" height="76"/>\n'
    "</svg>\n"
)
with open(f"{OUT}/favicon.svg", "w", encoding="utf-8") as f:
    f.write(fav_svg)
for s in [16, 32, 64, 180]:
    png = resvg_py.svg_to_bytes(fav_svg, width=s, height=s)
    with open(f"{OUT}/favicon-{s}.png", "wb") as f:
        f.write(png)
print("favicon done")
