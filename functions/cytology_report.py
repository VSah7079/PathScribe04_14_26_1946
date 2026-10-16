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
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import TimeStamp
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, Image, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer)

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


def _line_flow(line: dict, fonts: tuple) -> Paragraph:
    size = float(line.get('size') or 10)
    # Line breaks typed in a field (an addendum, a note) are kept.
    text = escape(str(line.get('text') or '')).replace('\r\n', '\n').replace('\n', '<br/>')
    return Paragraph(text, _style(fonts, bool(line.get('bold')), size))


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


def document_flows(index: int, document: dict, fonts: tuple) -> list:
    flows: list = [_DocumentStart(index, document)]
    title = _line_flow({'text': document.get('title') or '', 'bold': True, 'size': 14}, fonts)
    if (document.get('barcode') or '').strip():
        # The title wraps short of the barcode drawn top right.
        title.style = ParagraphStyle('cy-title', parent=title.style, rightIndent=BARCODE_WIDTH + 4 * mm)
    flows += [title, Spacer(1, 2 * mm)]
    banner = document.get('banner') or []
    if banner:
        flows += [_line_flow(line, fonts) for line in banner]
        flows.append(Spacer(1, 2 * mm))
    branding = document.get('branding') or {}
    if branding:
        flows += _logo_flows(branding)
        flows += [_line_flow(line, fonts) for line in branding.get('lines') or []]
        flows.append(Spacer(1, 2 * mm))
    for section in document.get('sections') or []:
        if section.get('newPage'):
            flows.append(PageBreak())
        heading = Paragraph(escape(str(section.get('heading') or '')), _style(fonts, True, 11))
        heading.keepWithNext = True  # a heading is never the last line on a page
        flows.append(heading)
        flows += [_line_flow(line, fonts) for line in section.get('lines') or []]
        flows.append(Spacer(1, 2 * mm))
    return flows


class _CytologyCanvas(Canvas):
    """Keeps each page until the end, so 'Page X of Y' counts the pages of
    each document, then draws the barcode on each document's first page and
    the continuation line on the others."""

    def __init__(self, *args, page_label: str = '', timestamp: str | None = None, **kwargs):
        super().__init__(*args, **kwargs)
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
            code.drawOn(self, width - MARGIN - code.width, height - MARGIN - BARCODE_HEIGHT)
        except Exception:  # noqa: BLE001 — an accession Code 128 can't encode keeps the printed accession
            pass

    def _draw_continuation(self, document: dict, page: int, total: int):
        identity = (document.get('continuation') or '').strip()
        if not identity:
            return
        width, height = self._pagesize
        label = document.get('pageLabel') or self._ps_page_label
        line = ' · '.join(x for x in [identity, fill(label, {'page': page, 'total': total})] if x)
        self.saveState()
        self.setFont(document.get('_fonts', LIBERATION)[0], 8)
        self.setFillColor(colors.black)
        self.drawString(MARGIN, height - MARGIN - 4 * mm, line)
        self.setStrokeColor(colors.Color(180 / 255, 180 / 255, 180 / 255))
        self.line(MARGIN, height - MARGIN - 6 * mm, width - MARGIN, height - MARGIN - 6 * mm)
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
    width, height = A4
    first = Frame(MARGIN, MARGIN, width - 2 * MARGIN, height - 2 * MARGIN, id='first',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    later = Frame(MARGIN, MARGIN, width - 2 * MARGIN, height - 2 * MARGIN - CONTINUATION_HEADER, id='later',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    mark = _watermark(watermark, fonts_for_text(payload.get('language'), watermark))
    doc = BaseDocTemplate(
        buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
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
        flows += document_flows(i, document, document['_fonts'])

    def make_canvas(*args, **kwargs):
        return _CytologyCanvas(*args, page_label=str(payload.get('pageLabel') or ''), timestamp=meta.get('timestamp'), **kwargs)

    doc.build(flows, canvasmaker=make_canvas)
    return buf.getvalue()
