# functions/cytology_report.py
# ─────────────────────────────────────────────────────────────────────────────
# Batch 539 (PS-539 decision D2, Pete, Oct 12, 2026: "PDF that leaves
# PathScribe, and the browser only shows previews. As long as the preview
# matches exactly what gets sent out"). The cytology report template of
# render_report. Before this batch the browser drew cytology PDFs itself
# (jsPDF), so a server could neither release nor resend one.
#
# The browser composes every line of text (labels filled in the report's
# language, dates written in the report's locale) with one pure builder,
# src/services/cytology/cytologyRenderPayload.ts, used for the preview and for
# the release alike. This file only lays the lines out, so the preview and the
# released PDF can't differ in wording.
#
# Request body (JSON), POSTed to render_report with "template": "cytology":
#   {
#     "template": "cytology",
#     "outputFormat": "pdf",            # the only format; text is not offered for cytology
#     "language": str,                  # optional; "ko" (or any Hangul) prints in Pretendard
#     "pageLabel": "Page {{page}} of {{total}}",   # continuation pages, in the report's language
#     "watermarkText": str,             # optional: drawn diagonally on every page (an unsigned preview)
#     "metadata": {"title", "author", "subject", "timestamp"},   # timestamp: ISO-8601, the signing time
#     "documents": [                    # each starts on a new page and numbers its own pages
#       {
#         "title": str,                 # first line, bold 14 pt
#         "barcode": str,               # optional: Code 128 of the accession, top right of its first page
#         "banner": [line],             # optional: the correction / addendum / preliminary block
#         "branding": {"logoBase64": str, "lines": [line]},   # optional letterhead (PNG or JPEG)
#         "sections": [{"heading": str, "lines": [line], "newPage": bool}],
#         "continuation": str,          # optional: the identity line on its pages after the first
#         "language": str,              # optional: this document's language (a case report can mix them)
#         "pageLabel": str              # optional: this document's "Page {{page}} of {{total}}"
#       }
#     ]
#   }
#   line = {"text": str, "bold": bool, "size": number}   (size defaults to 10 pt; a newline
#   in the text starts a new line, as typed)
#
# Batch 609 (PS-35, PS-127): the request may also carry
#   "pageSetup": {"pageSizeId", "widthMm", "heightMm", "margins": {top,right,bottom,left}}   # the lab's page
#   "documentStyle": {"header": LabelConfig, "body": LabelConfig, "footer": LabelConfig}   # see report_layout.py
# Batch 612: a style's "units" ("pt" or "legacy_px") says what its fontSize is in; points print at
# the number given (8 pt floor), a size saved before Batch 612 prints as it did (report_layout.py).
# The page is the lab's size and margins (A4 and 15 mm when absent; margins never below
# the 0.5 inch minimum). The header style sets the title, section headings and letterhead
# lines; the body style the report's lines; the footer style the continuation line. The
# font stays the embedded Liberation Sans or Pretendard whatever the family chosen (PDF/A
# needs embedded fonts); size, weight, case and underline are applied.
#
# Layout (the browser renderer's, kept): A4, 15 mm margins (never below the
# 0.5 inch minimum, checked at import), section headings kept with their first
# line, a continuation line and rule on every page after a document's first,
# Liberation Sans embedded (PDF/A needs embedded fonts; Helvetica is not), and
# the same bytes every time for the same request (fixed creation date: the
# signing time; fixed document ID).
#
# Response: application/pdf. The document's Keywords carry
# CYTOLOGY_TEMPLATE_MARKER, so the browser can tell this template made it: a
# renderer deployed before Batch 539 would draw an empty surgical page instead.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import base64
import calendar
import datetime
import os
import re
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.graphics.barcode.code128 import Code128
from reportlab.lib import colors
from reportlab.lib.fonts import addMapping
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import TimeStamp
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, Image, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer)

import report_layout  # Batch 609 (PS-35, PS-127): page setup and document style

CYTOLOGY_TEMPLATE_MARKER = 'pathscribe-template:cytology'

MARGIN = 15 * mm
CONTINUATION_HEADER = 12 * mm
BARCODE_WIDTH = 40 * mm
BARCODE_HEIGHT = 10 * mm
LOGO_MAX_WIDTH = 30 * mm
LOGO_MAX_HEIGHT = 14 * mm
MIN_PRINT_MARGIN = 12.7 * mm  # 0.5 inch: printers clip below this (PS-277 §1.2.4)

if MARGIN < MIN_PRINT_MARGIN:  # fail at import, never print a clipped report
    raise ValueError('cytology report margin is below the 0.5 inch printing minimum')

_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
LIBERATION = ('LiberationSans', 'LiberationSans-Bold')
PRETENDARD = ('Pretendard', 'Pretendard-Bold')
ALLOWED_FONTS = {LIBERATION, PRETENDARD}
_HANGUL = re.compile('[ᄀ-ᇿ㄰-㆏가-힣]')


def _register(family: tuple, regular_file: str, bold_file: str) -> None:
    if family[0] in pdfmetrics.getRegisteredFontNames():
        return
    pdfmetrics.registerFont(TTFont(family[0], os.path.join(_FONT_DIR, regular_file)))
    pdfmetrics.registerFont(TTFont(family[1], os.path.join(_FONT_DIR, bold_file)))
    for bold in (0, 1):
        for italic in (0, 1):
            addMapping(family[0], bold, italic, family[1] if bold else family[0])


def fonts_for_text(language: str | None, text: str) -> tuple:
    """Pretendard for Korean, or text containing Hangul; Liberation Sans otherwise. Both embedded."""
    _register(LIBERATION, 'LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf')
    if language == 'ko' or _HANGUL.search(text or ''):
        _register(PRETENDARD, 'Pretendard-Regular.ttf', 'Pretendard-Bold.ttf')
        return PRETENDARD
    return LIBERATION


def document_fonts(payload: dict, document: dict) -> tuple:
    """Each document in its own language's font: in a case report, an English
    specimen prints as it does on its own even beside a Korean one."""
    return fonts_for_text(document.get('language') or payload.get('language'), repr(document))


def fill(template: str, values: dict) -> str:
    return re.sub(r'\{\{(\w+)\}\}', lambda m: str(values.get(m.group(1), '')), template or '')


def _style(fonts: tuple, bold: bool, size: float) -> ParagraphStyle:
    return ParagraphStyle(
        f'cy-{int(bold)}-{size}', fontName=fonts[1 if bold else 0], fontSize=size,
        leading=round(size * 1.2, 1), spaceAfter=2,
    )


def _styled_paragraph(text: str, fonts: tuple, bold: bool, size: float, style: dict | None) -> Paragraph:
    """A line in a category's document style (Batch 609): the style's size, weight, case and
    underline where it sets them; the given ones otherwise. The font stays the embedded one."""
    style = style or {}
    size = style.get('size_pt') or size
    bold = style['bold'] if style.get('bold') is not None else bold
    text = report_layout.apply_transform(text, style)
    # Line breaks typed in a field (an addendum, a note) are kept.
    body = escape(str(text)).replace('\r\n', '\n').replace('\n', '<br/>')
    if style.get('underline'):
        body = f'<u>{body}</u>'
    return Paragraph(body, _style(fonts, bold, size))


def _line_flow(line: dict, fonts: tuple, style: dict | None = None) -> Paragraph:
    """One line. An explicit size in the request wins; otherwise the style's size, then 10 pt."""
    explicit = float(line.get('size') or 0)
    if explicit and style:
        style = {**style, 'size_pt': None}
    return _styled_paragraph(str(line.get('text') or ''), fonts, bool(line.get('bold')), explicit or 10, style)


class _DocumentStart(Flowable):
    """Zero-size marker: the page it lands on is this document's first page."""

    def __init__(self, index: int, document: dict):
        super().__init__()
        self.index = index
        self.document = document
        self.width = self.height = 0

    def wrap(self, *_):
        return 0, 0

    def draw(self):
        self.canv._ps_document = (self.index, self.document)
        self.canv._ps_document_starts_here = True


def _logo_flows(branding: dict) -> list:
    data = branding.get('logoBase64')
    if not data:
        return []
    try:
        img = Image(BytesIO(base64.b64decode(data, validate=True)))
        scale = min(LOGO_MAX_WIDTH / img.imageWidth, LOGO_MAX_HEIGHT / img.imageHeight, 1.0)
        img.drawWidth, img.drawHeight = img.imageWidth * scale, img.imageHeight * scale
        img.hAlign = 'LEFT'
        return [img, Spacer(1, 2 * mm)]
    except Exception:  # noqa: BLE001 — a logo that can't be read never stops the report
        return [Spacer(1, LOGO_MAX_HEIGHT + 2 * mm)]


def document_flows(index: int, document: dict, fonts: tuple, styles: dict | None = None) -> list:
    styles = styles or {}
    head, body = styles.get('header'), styles.get('body')
    flows: list = [_DocumentStart(index, document)]
    title = _styled_paragraph(document.get('title') or '', fonts, True, 14, {**(head or {}), 'bold': True} if head else None)
    if (document.get('barcode') or '').strip():
        # The title wraps short of the barcode drawn top right.
        title.style = ParagraphStyle('cy-title', parent=title.style, rightIndent=BARCODE_WIDTH + 4 * mm)
    flows += [title, Spacer(1, 2 * mm)]
    banner = document.get('banner') or []
    if banner:
        flows += [_line_flow(line, fonts, body) for line in banner]
        flows.append(Spacer(1, 2 * mm))
    branding = document.get('branding') or {}
    if branding:
        flows += _logo_flows(branding)
        flows += [_line_flow(line, fonts, head) for line in branding.get('lines') or []]
        flows.append(Spacer(1, 2 * mm))
    for section in document.get('sections') or []:
        if section.get('newPage'):
            flows.append(PageBreak())
        heading = _styled_paragraph(str(section.get('heading') or ''), fonts, True, 11, {**(head or {}), 'bold': True} if head else None)
        heading.keepWithNext = True  # a heading is never the last line on a page
        flows.append(heading)
        flows += [_line_flow(line, fonts, body) for line in section.get('lines') or []]
        flows.append(Spacer(1, 2 * mm))
    return flows


class _CytologyCanvas(Canvas):
    """Keeps each page until the end, so 'Page X of Y' counts the pages of
    each document, then draws the barcode on each document's first page and
    the continuation line on the others."""

    def __init__(self, *args, page_label: str = '', timestamp: str | None = None, margins: tuple | None = None,
                 footer_style: dict | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self._ps_margins = margins or (MARGIN, MARGIN, MARGIN, MARGIN)  # top, right, bottom, left
        self._ps_footer_style = footer_style or {}
        self._ps_pages: list = []
        self._ps_document = (0, {})
        self._ps_document_starts_here = False
        self._ps_page_label = page_label
        _fix_timestamp(self, timestamp)

    def showPage(self):
        self._ps_pages.append((dict(self.__dict__), self._ps_document, self._ps_document_starts_here))
        self._ps_document_starts_here = False
        self._startPage()

    def save(self):
        counts: dict = {}
        for _, (index, _doc), _ in self._ps_pages:
            counts[index] = counts.get(index, 0) + 1
        seen: dict = {}
        for state, (index, document), first in self._ps_pages:
            self.__dict__.update(state)
            seen[index] = seen.get(index, 0) + 1
            if first:
                self._draw_barcode(document)
            else:
                self._draw_continuation(document, seen[index], counts[index])
            super().showPage()
        super().save()

    def _draw_barcode(self, document: dict):
        value = (document.get('barcode') or '').strip()
        if not value:
            return
        width, height = self._pagesize
        try:
            probe = Code128(value, barHeight=BARCODE_HEIGHT, humanReadable=False, quiet=0)
            bar = probe.barWidth * BARCODE_WIDTH / probe.width  # the bars fill the 40 mm box
            code = Code128(value, barHeight=BARCODE_HEIGHT, barWidth=bar, humanReadable=False, quiet=0)
            top, right, _bottom, _left = self._ps_margins
            code.drawOn(self, width - right - code.width, height - top - BARCODE_HEIGHT)
        except Exception:  # noqa: BLE001 — an accession Code 128 can't encode keeps the printed accession
            pass

    def _draw_continuation(self, document: dict, page: int, total: int):
        identity = (document.get('continuation') or '').strip()
        if not identity:
            return
        width, height = self._pagesize
        label = document.get('pageLabel') or self._ps_page_label
        line = ' · '.join(x for x in [identity, fill(label, {'page': page, 'total': total})] if x)
        top, right, _bottom, left = self._ps_margins
        style = self._ps_footer_style
        line = report_layout.apply_transform(line, style)
        size = style.get('size_pt') or 8
        fonts = document.get('_fonts', LIBERATION)
        font = fonts[1] if style.get('bold') else fonts[0]
        self.saveState()
        self.setFont(font, size)
        self.setFillColor(colors.black)
        self.drawString(left, height - top - 4 * mm, line)
        if style.get('underline'):
            self.setStrokeColor(colors.black)
            self.setLineWidth(0.5)
            self.line(left, height - top - 4 * mm - 1.2, left + self.stringWidth(line, font, size), height - top - 4 * mm - 1.2)
        self.setStrokeColor(colors.Color(180 / 255, 180 / 255, 180 / 255))
        self.setLineWidth(1)
        self.line(left, height - top - 6 * mm, width - right, height - top - 6 * mm)
        self.restoreState()


def _fix_timestamp(canvas: Canvas, iso: str | None) -> None:
    """The PDF's creation date is the signing time, never the clock, so the
    same request gives the same bytes."""
    stamp = TimeStamp(invariant=1)
    if iso:
        try:
            when = datetime.datetime.fromisoformat(str(iso).replace('Z', '+00:00'))
            if when.tzinfo is None:
                when = when.replace(tzinfo=datetime.timezone.utc)
            seconds = calendar.timegm(when.utctimetuple())
            stamp.t = seconds
            stamp.lt = datetime.datetime.fromtimestamp(seconds, datetime.timezone.utc).timetuple()
            stamp.YMDhms = tuple(stamp.lt)[:6]
        except ValueError:
            pass
    canvas._doc._timeStamp = stamp


def _watermark(text: str, fonts: tuple):
    def on_page(canvas, doc):
        if not text:
            return
        width, height = doc.pagesize
        canvas.saveState()
        size = 30
        while size > 10 and canvas.stringWidth(text, fonts[1], size) > width * 0.9:
            size -= 1
        canvas.setFont(fonts[1], size)
        canvas.setFillColor(colors.Color(0.86, 0.15, 0.15, alpha=0.16))
        for frac in (0.28, 0.55, 0.82):
            canvas.saveState()
            canvas.translate(width / 2, height * frac)
            canvas.rotate(32)
            canvas.drawCentredString(0, 0, text)
            canvas.restoreState()
        canvas.restoreState()
    return on_page


def validate_cytology_payload(payload: dict) -> str | None:
    documents = payload.get('documents')
    if not isinstance(documents, list) or not documents:
        return 'a cytology report needs at least one document'
    for i, d in enumerate(documents):
        if not isinstance(d, dict) or not isinstance(d.get('title'), str):
            return f'document {i + 1} has no title'
        if not isinstance(d.get('sections') or [], list):
            return f'document {i + 1}: sections must be a list'
    return None


def build_cytology_pdf(payload: dict) -> bytes:
    problem = validate_cytology_payload(payload)
    if problem:
        raise ValueError(problem)
    documents = [{**d, '_fonts': document_fonts(payload, d)} for d in payload['documents']]
    if any(d['_fonts'] not in ALLOWED_FONTS for d in documents):
        raise ValueError('cytology reports print only in an embedded font')
    watermark = str(payload.get('watermarkText') or '').strip()
    meta = payload.get('metadata') or {}
    buf = BytesIO()
    # Batch 609 (PS-35): the lab's page size and margins, and its document style.
    geometry = report_layout.page_geometry(payload, (15, 15, 15, 15))
    width, height = geometry['size']
    top, right, bottom, left = geometry['margins']
    styles = {c: report_layout.style_for(payload, c) for c in report_layout.CATEGORIES}
    first = Frame(left, bottom, width - left - right, height - top - bottom, id='first',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    later = Frame(left, bottom, width - left - right, height - top - bottom - CONTINUATION_HEADER, id='later',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    mark = _watermark(watermark, fonts_for_text(payload.get('language'), watermark))
    doc = BaseDocTemplate(
        buf, pagesize=geometry['size'], leftMargin=left, rightMargin=right, topMargin=top, bottomMargin=bottom,
        title=str(meta.get('title') or ''), author=str(meta.get('author') or ''), subject=str(meta.get('subject') or ''),
        creator='PathScribe', producer='PathScribe report renderer', keywords=CYTOLOGY_TEMPLATE_MARKER, invariant=1,
        initialFontName=LIBERATION[0],
        pageTemplates=[
            PageTemplate(id='first', frames=[first], onPage=mark, autoNextPageTemplate='later'),
            PageTemplate(id='later', frames=[later], onPage=mark),
        ],
    )
    flows: list = []
    for i, document in enumerate(documents):
        if i:
            flows += [NextPageTemplate('first'), PageBreak()]
        flows += document_flows(i, document, document['_fonts'], styles)

    def make_canvas(*args, **kwargs):
        return _CytologyCanvas(*args, page_label=str(payload.get('pageLabel') or ''), timestamp=meta.get('timestamp'),
                               margins=geometry['margins'], footer_style=styles['footer'], **kwargs)

    doc.build(flows, canvasmaker=make_canvas)
    return buf.getvalue()
