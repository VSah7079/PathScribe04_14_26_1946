# functions/report_layout.py
# ─────────────────────────────────────────────────────────────────────────────
# Batch 609 (PS-35, PS-127): what the report renderers read from the request to
# lay a page out: the lab's page size and margins (pageSetup), and the document
# style of the report's header, body and footer (documentStyle). Pure helpers,
# no PDF library and no Firebase import, so they are tested on their own and
# shared by main.py (the surgical report) and cytology_report.py.
#
# pageSetup (from src/services/reportAppearance/pageSetup.ts, renderPageSetup):
#   {"pageSizeId": "a4", "widthMm": 210, "heightMm": 297,
#    "margins": {"top": 25, "right": 20, "bottom": 25, "left": 20}}   # mm
# A request without it prints as before (A4 and the template's own margins), so
# a browser from before Batch 606 still works.
#
# documentStyle (ReportTemplate.documentStyle, resolved by contextBuilder.ts):
#   {"header": LabelConfig, "body": LabelConfig, "footer": LabelConfig}
#   LabelConfig = {"fontFamily", "fontSize", "units": "pt"|"legacy_px",
#                  "weight": "bold"|"normal",
#                  "decoration": "underline"|"none", "transform": "uppercase"|...}
#
# Rules kept here, not left to each renderer:
#   • Margins never go below 12.7 mm (0.5 inch): printers clip under it
#     (PS-277 §1.2.4). The lab setting allows 5 mm; the renderer prints at 12.7.
#   • A page size outside 100 to 600 mm, or unreadable, falls back to the named
#     size and then to A4. A report is never refused over its page setup.
#   • Font size units (Batch 612): a style whose "units" is "pt" is in points, the
#     size it prints at (10 prints at 10 pt), and nothing prints below 8 pt. A style
#     with no units, or "legacy_px", is a size saved before Batch 612: CSS pixels,
#     1 px = 0.75 pt as before, nothing below 7 pt, so it prints exactly as it did.
#     A template's own units ("fontUnits" at the top of the request) apply to any
#     style or label that carries none of its own.
#   • The font family is the closest of three built-in families: Arial,
#     Helvetica, Calibri and Verdana print as Helvetica; Times New Roman and
#     Georgia as Times; Courier New as Courier. Korean text always prints in
#     Pretendard, and the cytology template always in its embedded Liberation
#     Sans (PDF/A needs embedded fonts), so the family is not changed there.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

MM_TO_PT = 72.0 / 25.4
PX_TO_PT = 0.75
MIN_FONT_PT = 7.0  # legacy_px sizes: smaller type does not hold up in print; a smaller setting prints at this
MIN_FONT_PT_POINTS = 8.0  # sizes in points (Batch 612, Pete: 7.5 pt was too small)
FONT_UNITS = ('pt', 'legacy_px')
DEFAULT_FONT_UNITS = 'legacy_px'  # a size saved before units existed
MIN_PRINT_MARGIN_MM = 12.7
MAX_MARGIN_MM = 50.0
MIN_PAGE_MM, MAX_PAGE_MM = 100.0, 600.0

# The sizes the lab can choose in Document Style (pageSetup.ts PAGE_SIZES).
PAGE_SIZES_MM = {
    'a4': (210.0, 297.0),
    'letter': (216.0, 279.0),
    'legal': (216.0, 356.0),
    'a3': (297.0, 420.0),
    'b5': (176.0, 250.0),
}
DEFAULT_PAGE_ID = 'a4'

CATEGORIES = ('header', 'body', 'footer')

_HELVETICA = ('Helvetica', 'Helvetica-Bold')
_TIMES = ('Times-Roman', 'Times-Bold')
_COURIER = ('Courier', 'Courier-Bold')
_FAMILY_FONTS = {
    'arial': _HELVETICA, 'helvetica': _HELVETICA, 'calibri': _HELVETICA, 'verdana': _HELVETICA,
    'times new roman': _TIMES, 'times': _TIMES, 'georgia': _TIMES,
    'courier new': _COURIER, 'courier': _COURIER,
}


def _number(value) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value == value and abs(value) != float('inf'):
        return float(value)
    return None


def font_units(cfg, payload: dict | None = None) -> str:
    """The units a style's size is in: its own, else the template's (payload "fontUnits"), else legacy_px."""
    own = cfg.get('units') if isinstance(cfg, dict) else None
    if own in FONT_UNITS:
        return own
    inherited = (payload or {}).get('fontUnits')
    return inherited if inherited in FONT_UNITS else DEFAULT_FONT_UNITS


def font_size_pt(size, units: str) -> float | None:
    """A saved size as the points it prints at, or None when it is not a usable size."""
    value = _number(size)
    if not value or not 4 <= value <= 72:
        return None
    if units == 'pt':
        return max(MIN_FONT_PT_POINTS, round(value, 2))
    return max(MIN_FONT_PT, round(value * PX_TO_PT, 2))


def label_size_pt(size, units: str) -> float | None:
    """A field label's own size. A label saved before Batch 612 has always printed its number as
    points, so that is kept as it was; a label in a points template takes the 8 pt floor."""
    value = _number(size)
    if not value or value <= 0:
        return None
    return max(MIN_FONT_PT_POINTS, value) if units == 'pt' else value


def page_geometry(payload: dict, default_margins_mm: tuple, default_size_id: str = DEFAULT_PAGE_ID) -> dict:
    """The page for this request, in points.

    default_margins_mm is (top, right, bottom, left) in mm, used when the request
    has no page setup (or none for a side). Returns:
      size            (width, height) in points
      size_id         the named size used ('a4' when the request's was unreadable)
      margins         (top, right, bottom, left) in points
      adjusted        the sides raised to the 0.5 inch printing minimum
      from_request    True when the request carried a usable page setup
    """
    setup = payload.get('pageSetup') if isinstance(payload.get('pageSetup'), dict) else None
    width_mm, height_mm = PAGE_SIZES_MM[default_size_id]
    size_id = default_size_id
    if setup:
        named = setup.get('pageSizeId') if setup.get('pageSizeId') in PAGE_SIZES_MM else None
        w, h = _number(setup.get('widthMm')), _number(setup.get('heightMm'))
        if w and h and MIN_PAGE_MM <= w <= MAX_PAGE_MM and MIN_PAGE_MM <= h <= MAX_PAGE_MM:
            width_mm, height_mm = w, h
            size_id = named or 'custom'
        elif named:
            width_mm, height_mm = PAGE_SIZES_MM[named]
            size_id = named

    raw = setup.get('margins') if setup and isinstance(setup.get('margins'), dict) else {}
    sides = ('top', 'right', 'bottom', 'left')
    margins_mm: list = []
    adjusted: list = []
    for side, fallback in zip(sides, default_margins_mm):
        value = _number(raw.get(side))
        value = fallback if value is None else min(MAX_MARGIN_MM, value)
        if value < MIN_PRINT_MARGIN_MM:
            if raw.get(side) is not None:
                adjusted.append(side)
            value = MIN_PRINT_MARGIN_MM
        margins_mm.append(value)

    # A page too small for its margins would leave no room for text.
    if width_mm - margins_mm[1] - margins_mm[3] < 50 or height_mm - margins_mm[0] - margins_mm[2] < 50:
        margins_mm = [max(MIN_PRINT_MARGIN_MM, m) for m in default_margins_mm]
        adjusted = list(sides)

    return {
        'size': (width_mm * MM_TO_PT, height_mm * MM_TO_PT),
        'size_id': size_id,
        'margins': tuple(m * MM_TO_PT for m in margins_mm),
        'adjusted': adjusted,
        'from_request': setup is not None,
    }


def text_width(geometry: dict) -> float:
    """Width of the text area, in points."""
    top, right, bottom, left = geometry['margins']
    return geometry['size'][0] - left - right


def style_for(payload: dict, category: str) -> dict:
    """One category's document style, ready to draw with. Empty values mean 'as before'.

      size_pt      font size in points, or None
      bold         True / False / None (None leaves the element's own weight)
      underline    bool
      transform    'uppercase' | 'capitalize' | None
      family       (regular, bold) built-in font names, or None
    """
    out = {'size_pt': None, 'bold': None, 'underline': False, 'transform': None, 'family': None}
    doc_style = payload.get('documentStyle')
    cfg = doc_style.get(category) if isinstance(doc_style, dict) and category in CATEGORIES else None
    if not isinstance(cfg, dict):
        return out
    size_pt = font_size_pt(cfg.get('fontSize'), font_units(cfg, payload))
    if size_pt:
        out['size_pt'] = size_pt
    if cfg.get('weight') in ('bold', 'normal'):
        out['bold'] = cfg['weight'] == 'bold'
    out['underline'] = cfg.get('decoration') == 'underline'
    if cfg.get('transform') in ('uppercase', 'capitalize'):
        out['transform'] = cfg['transform']
    family = cfg.get('fontFamily')
    if isinstance(family, str):
        out['family'] = _FAMILY_FONTS.get(family.strip().lower())
    return out


def apply_transform(text: str, style: dict) -> str:
    if style.get('transform') == 'uppercase':
        return text.upper()
    if style.get('transform') == 'capitalize':
        return text.title()
    return text


def style_signature(payload: dict) -> tuple:
    """A hashable key of everything in documentStyle that changes how text is drawn."""
    return tuple(tuple(sorted((k, str(v)) for k, v in style_for(payload, c).items())) for c in CATEGORIES)
