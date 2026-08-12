#!/usr/bin/env python3
"""
ForMedrix AI logo builder.
Emits vector (SVG) mark + lockup in light-background and dark-background variants,
then rasterises PNG at asset sizes.
"""
import math, os
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- palettes
PALETTES = {
    "light": dict(
        f_top="#2E79B8", f_bot="#1B558F",
        a_top="#22CCD8", a_bot="#06A9BC",
        helix="#2BC2D4", rung="#63D8E6",
        trace="#22BFD4", node="#0FA8BC",
        etch="#FFFFFF", etch_op="0.62",
        word="#0E395B", ai="#1E69A2",
        cut="#FFFFFF",
    ),
    "dark": dict(
        f_top="#57A6E4", f_bot="#2C74BE",
        a_top="#3ADCE7", a_bot="#12B4C9",
        helix="#9FE7F2", rung="#7FD8E8",
        trace="#4FD3E6", node="#22C3DC",
        etch="#EAF6FF", etch_op="0.70",
        word="#F1F5F9", ai="#38BDF8",
        cut="#1E293B",  # login card colour, used only for preview
    ),
}

# ---------------------------------------------------------------- geometry
CX, Y0, H, AMP, TURNS = 248.0, 58.0, 396.0, 44.0, 2.0
STRAND_W, RUNG_W, CUT = 12.0, 5.5, 6.5


def strand(phase, n=90):
    pts = []
    for i in range(n + 1):
        t = i / n
        amp = AMP * (0.55 + 0.45 * math.sin(math.pi * t))
        x = CX + amp * math.sin(2 * math.pi * TURNS * t + phase)
        y = Y0 + t * H
        pts.append((x, y))
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def rungs():
    out = []
    n = 24
    for i in range(1, n):
        t = i / n
        amp = AMP * (0.55 + 0.45 * math.sin(math.pi * t))
        a = 2 * math.pi * TURNS * t
        x1 = CX + amp * math.sin(a)
        x2 = CX + amp * math.sin(a + math.pi)
        y = Y0 + t * H
        if abs(x1 - x2) < 30:      # skip near the crossover points
            continue
        out.append((x1, x2, y))
    return out


F_STEM = "M56,110 A18,18 0 0 1 74,92 L126,92 L126,424 A0,0 0 0 1 126,424 L56,424 Z"
F_PATH = (
    "M74,92 L268,92 A16,16 0 0 1 284,108 L284,148 A16,16 0 0 1 268,164 L126,164 "
    "L126,234 L240,234 A16,16 0 0 1 256,250 L256,284 A16,16 0 0 1 240,300 L126,300 "
    "L126,410 A14,14 0 0 1 112,424 L70,424 A14,14 0 0 1 56,410 L56,110 "
    "A18,18 0 0 1 74,92 Z"
)
A_PATH = (
    "M270,126 A14,14 0 0 1 284,114 L302,114 A14,14 0 0 1 316,126 L400,436 "
    "A10,10 0 0 1 390,449 L350,449 A10,10 0 0 1 340,441 L294,246 L248,441 "
    "A10,10 0 0 1 238,449 L198,449 A10,10 0 0 1 188,436 Z"
)
A_BAR = "M220,330 L376,330 A10,10 0 0 1 386,340 L386,376 A10,10 0 0 1 376,386 L220,386 A10,10 0 0 1 210,376 L210,340 A10,10 0 0 1 220,330 Z"

# circuit traces fanning right (x_start, y, elbow_x, y_end)
TRACES = [
    (352, 214, 404, 182), (362, 250, 418, 232), (372, 292, 430, 292),
    (378, 330, 424, 350), (368, 386, 412, 404),
]
NODES = [(462, 182), (476, 232), (486, 292), (472, 350), (452, 404)]

# etched circuit lines inside the F
ETCH = [
    "M84,128 L150,128 L168,110 L246,110",
    "M84,266 L140,266 L158,248 L228,248",
    "M84,206 L84,372",
]
ETCH_DOTS = [(246, 110), (228, 248), (84, 372), (84, 206)]


def mark_body(p, ids="", compact=False):
    s1, s2 = strand(0.0), strand(math.pi)
    rung_list = rungs()
    rung_d = " ".join(f"M{a:.1f},{y:.1f} L{b:.1f},{y:.1f}" for a, b, y in rung_list)

    tr = "".join(
        f'<path d="M{x},{y} L{ex},{y} L{ex + 18},{ny} L{nx - 14},{ny}" />'
        for (x, y, ex, ny), (nx, _) in zip(TRACES, NODES)
    )
    nodes = "".join(
        f'<circle cx="{x}" cy="{y}" r="9" fill="none" stroke="{p["node"]}" stroke-width="6"/>'
        for x, y in NODES
    )
    circuitry = "" if compact else (
        f'<g fill="none" stroke="{p["trace"]}" stroke-width="6" stroke-linecap="round" '
        f'stroke-linejoin="round">{tr}</g>{nodes}')
    etch = "".join(f'<path d="{d}"/>' for d in ETCH)
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="6"/>' for x, y in ETCH_DOTS)
    etchwrap = "" if compact else (
        f'<g fill="none" stroke="{p["etch"]}" stroke-opacity="{p["etch_op"]}" stroke-width="5" '
        f'stroke-linecap="round" stroke-linejoin="round">{etch}</g>'
        f'<g fill="{p["etch"]}" fill-opacity="{p["etch_op"]}">{dots}</g>')

    return f'''<defs>
<linearGradient id="fmF{ids}" x1="0" y1="0" x2="0.4" y2="1">
<stop offset="0" stop-color="{p['f_top']}"/><stop offset="1" stop-color="{p['f_bot']}"/>
</linearGradient>
<linearGradient id="fmA{ids}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{p['a_top']}"/><stop offset="1" stop-color="{p['a_bot']}"/>
</linearGradient>
<mask id="fmCut{ids}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
<rect x="0" y="0" width="512" height="512" fill="#fff"/>
<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">
<path d="{s1}" stroke-width="{STRAND_W + CUT * 2}"/>
<path d="{s2}" stroke-width="{STRAND_W + CUT * 2}"/>
<path d="{rung_d}" stroke-width="{RUNG_W + CUT}"/>
</g>
</mask>
</defs>

{circuitry}

<!-- FA monogram, with the helix knocked out for separation -->
<g mask="url(#fmCut{ids})">
<path d="{F_PATH}" fill="url(#fmF{ids})"/>
<g fill="url(#fmA{ids})"><path d="{A_PATH}"/><path d="{A_BAR}"/></g>
{etchwrap}
</g>

<!-- DNA double helix -->
<g fill="none" stroke-linecap="round">
<path d="{rung_d}" stroke="{p['rung']}" stroke-width="{RUNG_W}"/>
<path d="{s1}" stroke="{p['helix']}" stroke-width="{STRAND_W}"/>
<path d="{s2}" stroke="{p['helix']}" stroke-width="{STRAND_W}"/>
</g>'''


def mark_svg(p, size=512, ids="", compact=False):
    vb = "12 36 432 440" if compact else "0 0 512 512"
    return (f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{size}" height="{size}" role="img" aria-label="ForMedrix AI">
<title>ForMedrix AI</title>
''' + mark_body(p, ids, compact) + "\n</svg>")


# ---------------------------------------------------------------- wordmark
def text_path(txt, size=100):
    fp = FontProperties(family="TeX Gyre Heros", weight="bold")
    tp = TextPath((0, 0), txt, size=size, prop=fp)
    d, cur = [], None
    for verts, code in tp.iter_segments():
        if code == 1:
            d.append(f"M{verts[0]:.2f},{-verts[1]:.2f}")
        elif code == 2:
            d.append(f"L{verts[0]:.2f},{-verts[1]:.2f}")
        elif code == 3:
            d.append(f"Q{verts[0]:.2f},{-verts[1]:.2f} {verts[2]:.2f},{-verts[3]:.2f}")
        elif code == 4:
            d.append(f"C{verts[0]:.2f},{-verts[1]:.2f} {verts[2]:.2f},{-verts[3]:.2f} {verts[4]:.2f},{-verts[5]:.2f}")
        elif code == 79:
            d.append("Z")
    ext = tp.get_extents()
    return " ".join(d), ext.width, ext.x0, ext.y0, ext.y1


def lockup_svg(p, ids=""):
    """Mark on the left, ForMedrix AI wordmark on the right, optically balanced."""
    FSIZE = 134.0
    CAP = 0.717 * FSIZE                 # Helvetica-family cap height
    MBOX = 1.934 * FSIZE                # mark box sized so ink = 2.15x cap height
    INK_X, INK_Y0, INK_Y1, INK_X1 = 56.0, 52.0, 460.0, 498.0   # ink bbox in 512 units
    k = MBOX / 512.0
    ink_w, ink_h = (INK_X1 - INK_X) * k, (INK_Y1 - INK_Y0) * k
    Hc = ink_h + 2 * (0.08 * ink_h)     # canvas height with breathing room
    mx, my = -INK_X * k, (Hc - ink_h) / 2 - INK_Y0 * k

    d1, w1, x0a, _, _ = text_path("Formedrix", FSIZE)
    d2, w2, x0b, _, _ = text_path("AI", FSIZE)
    gap_mark = 0.13 * ink_w
    kern = 0.03 * FSIZE
    left = ink_w + gap_mark
    baseline = Hc / 2 + CAP / 2
    total_w = left + w1 + kern + w2

    inner = mark_body(p, ids=ids + "L")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.0f} {Hc:.0f}" width="{total_w:.0f}" height="{Hc:.0f}" role="img" aria-label="ForMedrix AI">
<title>ForMedrix AI</title>
<g transform="translate({mx:.2f},{my:.2f}) scale({k:.6f})">{inner}</g>
<g transform="translate({left - x0a:.2f},{baseline:.2f})">
<path d="{d1}" fill="{p['word']}"/>
<g transform="translate({w1 + kern:.2f},0)"><path d="{d2}" fill="{p['ai']}"/></g>
</g>
</svg>'''


def main():
    files = []
    for name, p in PALETTES.items():
        m = mark_svg(p, ids=name)
        f = os.path.join(OUT, f"formedrix-mark-{name}.svg")
        open(f, "w").write(m); files.append(f)
        l = lockup_svg(p, ids=name)
        f = os.path.join(OUT, f"formedrix-logo-{name}.svg")
        open(f, "w").write(l); files.append(f)
    print("\n".join(files))


if __name__ == "__main__":
    main()
