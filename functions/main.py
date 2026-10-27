# functions/main.py
# ─────────────────────────────────────────────────────────────────────────────
# Firebase Cloud Functions (Python, firebase_functions SDK). Two real,
# separate functions:
#
#   render_report — generates the real, structured PDF (or, since the
#   outputFormat: 'text' extension, plain text) for a PathScribe
#   Orchestration case report, replacing the old window.open() +
#   win.print() approach in SynopticReportPage.tsx. See its own header
#   comment below for the full real request/response contract.
#
#   receive_interface_message — the real receiving end for PathScribe's
#   real outbound interface dispatch (A08/A40/A47/ORU^R01/LIS sync). See
#   its own header comment below for the full real request/response
#   contract.
#
# IMPORTANT — keep this in sync with ReportPreviewRenderer.tsx:
#   This file re-implements the same node-tree walk as renderNode() in
#   src/pages/ReportPreview/ReportPreviewRenderer.tsx, in Python instead of
#   TypeScript, because ReportLab requires Python and there is no way to
#   share rendering logic across the two languages. If you add a node type,
#   change labelConfig handling, or change showWhen/condition semantics in
#   the TS renderer, mirror the change here too — there is no shared source
#   of truth for this logic, only this comment linking the two files.
#
# What this function does NOT duplicate:
#   • Case → display-field mapping (patient.name, order.fullAccession, etc.)
#     — the frontend computes this once via buildRenderScope() /
#     getInstitution() (both exported from ReportPreviewRenderer.tsx) and
#     sends the resolved scope/institution objects in the request body.
#     This function only ever does dict path lookups on JSON it's given —
#     it has no knowledge of the real Case type's field names.
#   • AI-narrative generation — sections[] arrives pre-generated from
#     orchSections. This function never calls an AI model.
#
# Request body (JSON), POSTed to this function's URL:
#   {
#     "templateName": str, "resolvedBy": str,
#     "institution": {"name","dept","address","phone"},
#     "caseHeader": {"accession","patient","mrn","dob","referring","clinician"},
#     "bodyAssembly": [ {"slotId","partId","partName","order","nodes":[...]} ],
#     "sections": [ {"id","label","text","committed","userEdited","aiGenerated","required"} ],
#     "renderScope": { ...buildRenderScope() output... },
#     "synopticAnswers": [ {"fieldId","fieldLabel","displayValue"} ],
#     "outputFormat": "pdf" | "text",  # optional, defaults to "pdf" — see below
#     "language": str,  # Batch 392, optional: the report's language (the performing lab's)
#     "labels": {"patient","mrn","dob","referring","clinician","reportTemplate","resolvedBy","confidential", ...},
#     "workup": {"parts": [str], "protocol": str, "protocolVersion": str, "status": "FINAL"|"CORRECTED"|"ADDENDUM",
#                "version": int, "signedBy": str, "signedAt": str, "documentId": str,
#                "changes": [{"label","from","to"}]},
#                       # Batch 426, optional: ONE synoptic workup as its own PDF (Pete: one PDF
#                       # per synoptic workup). With it, the body is that workup's identity block,
#                       # its synopticAnswers table and, for a correction, what changed; no
#                       # bodyAssembly is needed (an Assist case has no report layout).
#     "reportFigures": [ {"instanceId","mapType","pngBase64","svg","width","height"} ],
#                       # Batch 461, optional: the anatomical maps the pathologist inserted into
#                       # the report (snapshots in print colours, drawn from the synoptic
#                       # answers). Each is drawn after the report body at its proportions,
#                       # at most the text width; one without a PNG is skipped.
#     "workups": [ {...the workup block above..., "synopticAnswers": [...]} ],
#                       # Batch 427, optional: every workup of a case in ONE PDF (a site whose
#                       # LIS takes one PDF per accession). Each is drawn as above, one after
#                       # another, so the pages run on in one document.
#                       # Batch 392, optional: the wording around the report in that language;
#                       # any label missing is English (DEFAULT_LABELS). caseHeader.dob arrives
#                       # already written in the report's locale.
#     "watermarkText": str,     # Batch 498, optional: drawn diagonally on every page (the report
#                               # is signed out but held in the release buffer). Absent otherwise.
#     "revision": {"type": "amendment"|"addendum"|"correction", "revisionCount": int,
#                  "originalSignOutAt": str|null, "latestRevisionAt": str},
#                               # Batch 498, optional: the report has released revisions (PS-283
#                               # §4.2.2). Dates arrive already written in the report's locale.
#     "documentVersion": int,   # Batch 498, optional: the case record version, printed in the footer
#                               # reference next to the accession barcode (PS-283 §4.2.3).
#     "template": "cytology",   # Batch 539, optional: a cytology report; the whole body is then the
#                               # cytology request in cytology_report.py, and the rest of this list
#                               # doesn't apply.
#     "technicalBranding": {"facilityName","address","city","state","zip"},
#                               # Batch 618 (PS-336), optional: a split '26' case's technical lab.
#                               # Sent on a signed-out report only; drawn as one line under the case
#                               # header ("Technical component performed at ..."). The browser
#                               # withholds the director and CLIA number from this block, and the
#                               # renderer never draws them even if sent.
#     "preAnalyticDisclaimerText": str,
#                               # Batch 498, optional: the administrative-override disclaimer for a
#                               # case whose collection/receipt time was entered by override.
#   }
#
# Response:
#   outputFormat "pdf" (default, and every existing real caller as of this
#   change): application/pdf bytes, exactly as before this field existed.
#   outputFormat "text": application/json, {"text": str} — a real, plain-
#   text rendering of the same real report, built via a second, real,
#   deliberately separate node-tree walk (render_node_as_text(), see its
#   own header comment for why) rather than reused from the PDF path's
#   own ReportLab-specific flowables. Added for buildOruR01Payload.ts's
#   own reportNarrativeText field (services/reports/ in the frontend
#   repo) — an interface engine building an FT (Formatted Text) HL7
#   segment for a client that can't consume ED/PDF data needs this same
#   real, authoritative narrative as plain text, not a second,
#   independently-reconstructed approximation of it.
# ─────────────────────────────────────────────────────────────────────────────

import contextvars
import json
import os
import re
from io import BytesIO

from firebase_functions import https_fn, options

import report_delivery  # Batch 520 (PS-280): fax and file-drop delivery
import report_layout  # Batch 609 (PS-35, PS-127): page setup and document style
import cytology_report  # Batch 539 (PS-539 D2): the cytology report template
from firebase_functions.options import set_global_options
# Real, per direct guidance (the real receiving end for PathScribe's real
# outbound interface dispatch — receive_interface_message below): this
# function genuinely does write to Firestore, unlike render_report, which
# stays pure rendering and correctly skips this. initialize_app() is
# called once, here, for the whole file — both real functions in this
# file share the one real Firebase app instance.
from firebase_admin import initialize_app, firestore

initialize_app()

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.graphics.barcode.code128 import Code128
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

# For cost control — caps concurrent instances so a traffic spike degrades
# performance rather than runs up a surprise bill. Per-function override
# available via max_instances on the decorator below if ever needed.
set_global_options(max_instances=10)

# ── Path / condition evaluation ─────────────────────────────────────────────
# Mirrors getPath() / evalCondition() / evalClause() in ReportPreviewRenderer.tsx
# exactly. Same caveat as the file header: changes there need a matching
# change here.

def get_path(obj, path):
    if obj is None or not path:
        return None
    cur = obj
    for key in path.split('.'):
        if cur is None:
            return None
        cur = cur.get(key) if isinstance(cur, dict) else None
    return cur


_INTERP_RE = re.compile(r'\{\{\s*([\w.]+)\s*\}\}')


def interpolate(template: str, scope: dict) -> str:
    def repl(m):
        v = get_path(scope, m.group(1))
        return '' if v is None or v == '' else str(v)
    return _INTERP_RE.sub(repl, template)


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return float('nan')


def eval_clause(clause: dict, scope: dict) -> bool:
    actual = get_path(scope, clause.get('field'))
    op = clause.get('operator')
    value = clause.get('value')
    if op == '==':
        return str(actual or '') == str(value or '')
    if op == '!=':
        return str(actual or '') != str(value or '')
    if op == '>':
        return _num(actual) > _num(value)
    if op == '<':
        return _num(actual) < _num(value)
    if op == '>=':
        return _num(actual) >= _num(value)
    if op == '<=':
        return _num(actual) <= _num(value)
    if op == 'notEmpty':
        return actual is not None and str(actual).strip() != ''
    if op == 'isEmpty':
        return actual is None or str(actual).strip() == ''
    if op == 'contains':
        if isinstance(actual, list):
            return str(value) in [str(a) for a in actual]
        return str(value or '') in str(actual or '')
    return True


def eval_condition(cond: dict | None, scope: dict) -> bool:
    if not cond or not cond.get('clauses'):
        return True
    results = [eval_clause(c, scope) for c in cond['clauses']]
    return any(results) if cond.get('logic') == 'OR' else all(results)


# ── Styles ───────────────────────────────────────────────────────────────────

# Batch 393 (Pete: Korean reports in Pretendard). The report is drawn in
# Helvetica, or, when it is in Korean or contains Hangul (a Korean patient name
# in any lab), in Pretendard (fonts/, the npm package's own unmodified files,
# SIL OFL 1.1: see fonts/Pretendard-LICENSE.txt). ReportLab embeds only the
# glyphs used. The font pair for the report being built is held in a context
# variable, so the helpers below need no extra argument; `_styles[...]` and
# `_font()` read it.
_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
LATIN_FONTS = ('Helvetica', 'Helvetica-Bold')
PRETENDARD_FONTS = ('Pretendard', 'Pretendard-Bold')
_HANGUL = re.compile('[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]')
_current_fonts = contextvars.ContextVar('report_fonts', default=LATIN_FONTS)
# Batch 609: the page and the document style of the report being built, held in
# context variables like the fonts, so the helpers below need no extra argument.
_current_geometry = contextvars.ContextVar('report_geometry', default=None)
_current_style = contextvars.ContextVar('report_style', default=None)
# Batch 612: the template's font size units ("pt" or "legacy_px"), for a label that sets a size
# but not its own units.
_current_font_units = contextvars.ContextVar('report_font_units', default=None)


def _text_width() -> float:
    """The width of the text area (A4 with 20 mm margins unless the request set a page)."""
    geometry = _current_geometry.get()
    return report_layout.text_width(geometry) if geometry else 170 * mm


def _doc_style(category: str) -> dict:
    """The resolved document style of 'header', 'body' or 'footer' for the report being built."""
    styles = _current_style.get()
    return (styles or {}).get(category) or report_layout.style_for({}, category)


def _register_pretendard() -> None:
    if 'Pretendard' in pdfmetrics.getRegisteredFontNames():
        return
    pdfmetrics.registerFont(TTFont('Pretendard', os.path.join(_FONT_DIR, 'Pretendard-Regular.ttf')))
    pdfmetrics.registerFont(TTFont('Pretendard-Bold', os.path.join(_FONT_DIR, 'Pretendard-Bold.ttf')))
    # So <b> inside a paragraph picks the bold weight.
    addMapping('Pretendard', 0, 0, 'Pretendard')
    addMapping('Pretendard', 1, 0, 'Pretendard-Bold')
    addMapping('Pretendard', 0, 1, 'Pretendard')
    addMapping('Pretendard', 1, 1, 'Pretendard-Bold')


def fonts_for(payload: dict) -> tuple:
    """Pretendard for a Korean report or one containing Hangul; otherwise the body's
    document-style family (Helvetica, Times or Courier, Batch 609), Helvetica by default."""
    if payload.get('language') == 'ko' or _HANGUL.search(json.dumps(payload, ensure_ascii=False)):
        _register_pretendard()
        return PRETENDARD_FONTS
    return report_layout.style_for(payload, 'body')['family'] or LATIN_FONTS


def _font(bold: bool = False) -> str:
    return _current_fonts.get()[1 if bold else 0]


def _build_styles(fonts: tuple, body: dict | None = None):
    regular, bold = fonts
    body = body or {}
    sheet = getSampleStyleSheet()
    # Batch 609: the body's document style sets the size and weight of the report's text
    # (the font family is already in `fonts`); without one the sizes are the original ones.
    value_size = body.get('size_pt') or 11
    label_size = round(max(6, value_size * 9 / 11), 2) if body.get('size_pt') else 9
    value_font = bold if body.get('bold') else regular
    for name in ('Normal', 'BodyText', 'Heading1', 'Heading2', 'Heading3', 'Title'):
        if name in sheet:
            sheet[name].fontName = bold if name.startswith(('Heading', 'Title')) else value_font
    sheet.add(ParagraphStyle(name='RPLabel', fontName=regular, fontSize=label_size, textColor=colors.HexColor('#475569'), alignment=TA_LEFT))
    sheet.add(ParagraphStyle(name='RPValue', fontName=value_font, fontSize=value_size, leading=round(value_size * 15 / 11, 2), alignment=TA_LEFT))
    sheet.add(ParagraphStyle(name='RPHeading', fontSize=12, fontName=bold, spaceAfter=6, spaceBefore=10))
    sheet.add(ParagraphStyle(name='RPCaption', fontName=regular, fontSize=8, textColor=colors.HexColor('#666666')))
    return sheet


class _Styles:
    """The style sheet for the fonts and body style of the report being built."""
    def __init__(self):
        self._sheets = {}

    def __getitem__(self, name):
        fonts = _current_fonts.get()
        body = _doc_style('body')
        key = (fonts, body['size_pt'], body['bold'])
        if key not in self._sheets:
            self._sheets[key] = _build_styles(fonts, body)
        return self._sheets[key][name]


_styles = _Styles()


def _apply_text_transform(text: str, label_config: dict | None) -> str:
    t = (label_config or {}).get('transform')
    if t == 'uppercase':
        return text.upper()
    if t == 'capitalize':
        return text.title()
    return text


def _apply_decoration(text: str, label_config: dict | None) -> str:
    if (label_config or {}).get('decoration') == 'underline':
        return f'<u>{text}</u>'
    return text


def _label_style(label_config: dict | None) -> ParagraphStyle:
    """Mirrors labelStyle() in ReportPreviewRenderer.tsx."""
    kwargs = {}
    if label_config:
        if label_config.get('weight') == 'bold':
            kwargs['fontName'] = _font(True)
        units = report_layout.font_units(label_config, {'fontUnits': _current_font_units.get()})
        size = report_layout.label_size_pt(label_config.get('fontSize'), units)
        if size:
            kwargs['fontSize'] = size
    return ParagraphStyle('dyn-label', parent=_styles['RPLabel'], **kwargs)


def _with_body_defaults(label_config: dict | None) -> dict | None:
    """Batch 609: the body's document style cascades to every label that doesn't set its own
    (case and underline; size and weight are in the style sheet)."""
    body = _doc_style('body')
    merged = dict(label_config or {})
    if body['transform'] and 'transform' not in merged:
        merged['transform'] = body['transform']
    if body['underline'] and 'decoration' not in merged:
        merged['decoration'] = 'underline'
    return merged or None


def field_row(label: str, value: str, label_config: dict | None, default_position: str):
    """Mirrors the <FieldRow> component in ReportPreviewRenderer.tsx."""
    label_config = _with_body_defaults(label_config)
    position = (label_config or {}).get('position', default_position)
    value_para = Paragraph(str(value) if value else '—', _styles['RPValue'])

    if position == 'none':
        return [value_para]

    label_text = _apply_decoration(_apply_text_transform(label, label_config), label_config)
    label_para = Paragraph(label_text, _label_style(label_config))

    if position == 'above':
        return [label_para, value_para]

    # adjacent — two-cell row so label/value sit on one line, same intent
    # as the TS renderer's flex row.
    t = Table([[label_para, value_para]], colWidths=[38 * mm, None])
    t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), _font(False)),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return [t]


# ── Shared setup ─────────────────────────────────────────────────────────────

def resolve_scope_and_sections(payload: dict) -> tuple[dict, dict]:
    """Real, per direct guidance (outputFormat: 'text' — the real
    extension for buildOruR01Payload.ts's own reportNarrativeText field):
    the one small, genuinely shared, node-type-agnostic piece of setup
    build_report_pdf() and build_report_text() both need identically —
    extracted here so it's stated once, not duplicated. Everything after
    this (walking the real node tree) is genuinely format-specific and
    stays in its own real, separate function per format — see
    render_node_as_text()'s own header comment for why."""
    scope = dict(payload.get('renderScope') or {})
    scope['__synopticAnswers__'] = payload.get('synopticAnswers') or []
    sections_by_id = {s['id']: s for s in (payload.get('sections') or [])}
    return scope, sections_by_id


# ── Node rendering ───────────────────────────────────────────────────────────

def render_ai_section(node: dict, sections_by_id: dict):
    """Mirrors renderAiSection() in ReportPreviewRenderer.tsx — AI sections
    render purely from the generated text; their own node children (if any)
    are never walked, same decision as the TS renderer and for the same
    reason (OrchestratorEngine generates one text blob per section, not
    per-field)."""
    section = sections_by_id.get(node['id'])
    label = node.get('printHeading') or node.get('label', '')
    if not section:
        return [Paragraph(label, _styles['RPHeading']), Paragraph(_label('notYetGenerated'), _styles['RPCaption'])]

    flows = [Paragraph(label, _styles['RPHeading'])]
    text = section.get('text') or ''
    if text:
        # AI/editor output is HTML from textToHtml() — <p>/<b>/<i>/<u>/<br>,
        # which is within the safe subset ReportLab's Paragraph mini-markup
        # already supports directly.
        flows.append(Paragraph(text, _styles['RPValue']))
    else:
        msg = _label('requiredNotCompleted') if node.get('required') else _label('noContent')
        flows.append(Paragraph(msg, _styles['RPCaption']))
    return flows


def render_node(node: dict, scope: dict, sections_by_id: dict) -> list:
    show_when = node.get('showWhen')
    if show_when and not eval_condition(show_when, scope):
        return []

    node_type = node.get('type')

    # synoptic-block is a deliberate ad-hoc extension (see
    # mockReportPartService.ts) not in the formal TemplateNode union —
    # handled before the main dispatch, same as the TS renderer.
    if node_type == 'synoptic-block':
        answers = scope.get('__synopticAnswers__') or []
        if not answers:
            return [Paragraph(_label('noSynopticData'), _styles['RPCaption'])]
        # Batch 461: a long or multi-line answer (a results grid prints a line per
        # part) wraps inside its cell instead of running past the margin.
        def _value_cell(v):
            v = '' if v is None else str(v)
            if '\n' not in v and len(v) <= 60:
                return v
            from xml.sax.saxutils import escape
            return Paragraph(escape(v).replace('\n', '<br/>'), ParagraphStyle('rp-answer', parent=_styles['RPLabel'], textColor=colors.black, leading=11))
        rows = [[a.get('fieldLabel', ''), _value_cell(a.get('displayValue', ''))] for a in answers]
        t = Table(rows, colWidths=[70 * mm, None])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), _font(False)),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        return [t]

    if node_type == 'expression-value':
        text = interpolate(node['template'], scope).strip() or node.get('fallback', '')
        if node.get('hideIfEmpty') and not text:
            return []
        return field_row(node['label'], text, node.get('labelConfig'), 'adjacent')

    if node_type == 'static-label':
        variant_size = {'h1': 18, 'h2': 15, 'h3': 13, 'caption': 8}.get(node.get('variant'), 11)
        style = ParagraphStyle(
            'dyn-static', parent=_styles['Normal'], fontSize=variant_size,
            fontName=_font(True) if node.get('bold') else _font(False),
        )
        text = f"<i>{node['text']}</i>" if node.get('italic') else node['text']
        return [Paragraph(text, style)]

    if node_type == 'paragraph':
        raw = get_path(scope, node.get('bindingKey')) if node.get('bindingKey') else None
        html = str(raw) if raw not in (None, '') else (node.get('freeformContent') or '')
        if node.get('hideIfEmpty') and not html:
            return []
        value = html or (node.get('placeholder') or '—')
        return field_row(node['label'], value, node.get('labelConfig'), 'above')

    if node_type == 'dropdown':
        raw = get_path(scope, node.get('bindingKey'))
        values = raw if isinstance(raw, list) else ([raw] if raw is not None else [])
        opt_by_value = {o['value']: o['label'] for o in node.get('options', [])}
        labels = [opt_by_value.get(str(v), str(v)) for v in values]
        if node.get('hideIfEmpty') and not labels:
            return []
        return field_row(node['label'], ', '.join(labels) if labels else '—', node.get('labelConfig'), 'adjacent')

    if node_type == 'column-layout':
        n = node.get('numColumns', 2)
        flows = render_children(node.get('children', []), scope, sections_by_id)
        # ReportLab has no CSS-grid-style reflow — approximate by chunking
        # the rendered flowables into rows of n. Good enough for the
        # column usage seen in the current seed Parts (label/value pairs
        # side by side); revisit if a column layout ever needs flowables
        # that span multiple rows each.
        rows, row = [], []
        for f in flows:
            row.append(f)
            if len(row) == n:
                rows.append(row)
                row = []
        if row:
            while len(row) < n:
                row.append('')
            rows.append(row)
        if not rows:
            return []
        t = Table(rows, colWidths=[None] * n)
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), _font(False)),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        return [t]

    if node_type == 'section':
        ai = node.get('ai') or {}
        if ai.get('enabled'):
            return render_ai_section(node, sections_by_id)
        flows = []
        if node.get('printHeading'):
            flows.append(Paragraph(node['printHeading'], _styles['RPHeading']))
        flows += render_children(node.get('children', []), scope, sections_by_id)
        return flows

    if node_type == 'repeat-group':
        items = get_path(scope, node.get('iterateOver')) or []
        if not isinstance(items, list) or not items:
            return []
        alias = node.get('itemAlias', 'item')
        flows = []
        for item in items:
            child_scope = {**scope, alias: item}
            flows += render_children(node.get('children', []), child_scope, sections_by_id)
            flows.append(Spacer(1, 4))
        return flows

    if node_type == 'if-block':
        children = node.get('children', []) if eval_condition(node.get('condition'), scope) else node.get('elseChildren', [])
        return render_children(children, scope, sections_by_id)

    if node_type == 'switch-block':
        match = next((c for c in node.get('cases', []) if eval_condition(c.get('when'), scope)), None)
        children = match['children'] if match else node.get('defaultChildren', [])
        return render_children(children, scope, sections_by_id)

    # number / date / computed / image-embed / text-field / page-break /
    # template-ref / header / footer — not exercised by any seed Part as of
    # this change, and not implemented in ReportPreviewRenderer.tsx's
    # renderNode either. Same scope decision in both places: render nothing
    # rather than guess at an unverified format. Implement in both files
    # together if/when a real Part needs one of these.
    return []


def render_children(nodes: list, scope: dict, sections_by_id: dict) -> list:
    flows = []
    for n in nodes:
        flows += render_node(n, scope, sections_by_id)
    return flows


# ── Text-mode node rendering ─────────────────────────────────────────────────
# Real, per direct guidance (outputFormat: 'text' — the real extension for
# buildOruR01Payload.ts's own reportNarrativeText field, "requested from
# the same real, authoritative rendering service as the PDF"). Genuinely
# considered extracting plain text back out of the already-built PDF
# flowables above instead of a second tree-walk here — rejected on
# reflection: ReportLab's Table doesn't expose its real cell contents
# through any stable, public attribute (only the private, undocumented
# _cellvalues), so that path meant reaching into ReportLab's own
# internals rather than this file's own real data. Building text
# directly from the same raw node tree, before it ever becomes a
# ReportLab-specific object, is the real, sound approach instead.
#
# IMPORTANT — same real obligation as the file's own top header comment
# already states for ReportPreviewRenderer.tsx: keep this in sync with
# render_node()/render_children() above. Deliberately mirrors that
# function's own real dispatch order and every real node_type branch,
# node type for node type, precisely so a future change to one is easy
# to compare directly against the other — this is not a rewrite, it's
# the same real tree walk, twice, once per real output format.

_BR_RE = re.compile(r'<br\s*/?>', re.IGNORECASE)
_CLOSE_P_RE = re.compile(r'</p>', re.IGNORECASE)
_ANY_TAG_RE = re.compile(r'<[^>]+>')
_MULTI_NEWLINE_RE = re.compile(r'\n{3,}')


def strip_html_to_text(html: str) -> str:
    """Real, per direct guidance: converts the same safe HTML subset this
    file's own Paragraph rendering already relies on (see render_ai_section()'s
    own comment — <p>/<b>/<i>/<u>/<br>, "within the safe subset ReportLab's
    Paragraph mini-markup already supports directly") into real plain
    text. <br>/</p> become real newlines; every other tag is dropped
    outright — plain text has no bold/italic/underline to preserve.
    Never a general-purpose HTML-to-text converter; scoped to exactly
    the same known, small tag set the PDF path already assumes."""
    if not html:
        return ''
    text = _BR_RE.sub('\n', html)
    text = _CLOSE_P_RE.sub('\n', text)
    text = _ANY_TAG_RE.sub('', text)
    text = _MULTI_NEWLINE_RE.sub('\n\n', text)
    return text.strip()


def field_row_as_text(label: str, value, label_config: dict | None) -> list[str]:
    """Real, text-mode mirror of field_row() above. position ('above' vs
    'adjacent') is a real, purely visual PDF layout distinction with no
    plain-text equivalent — both collapse to the same real 'Label:
    Value' line here. 'none' still means no real label at all, exactly
    the same real authored intent field_row() already respects for PDF."""
    position = (label_config or {}).get('position')
    value_text = str(value) if value else '—'
    if position == 'none':
        return [value_text]
    return [f'{label}: {value_text}']


def render_ai_section_as_text(node: dict, sections_by_id: dict) -> list[str]:
    """Real, text-mode mirror of render_ai_section() above."""
    section = sections_by_id.get(node['id'])
    label = node.get('printHeading') or node.get('label', '')
    if not section:
        return [label, _label('notYetGenerated')]

    lines = [label]
    text = section.get('text') or ''
    if text:
        # Real, per direct guidance: AI/editor output is real HTML from
        # textToHtml() (same real source the PDF path already handles) —
        # stripped to real plain text here, never left as raw HTML in a
        # plain-text field.
        lines.append(strip_html_to_text(text))
    else:
        lines.append(_label('requiredNotCompleted') if node.get('required') else _label('noContent'))
    return lines


def render_node_as_text(node: dict, scope: dict, sections_by_id: dict) -> list[str]:
    show_when = node.get('showWhen')
    if show_when and not eval_condition(show_when, scope):
        return []

    node_type = node.get('type')

    if node_type == 'synoptic-block':
        answers = scope.get('__synopticAnswers__') or []
        if not answers:
            return [_label('noSynopticData')]
        return [f"{a.get('fieldLabel', '')}: {a.get('displayValue', '')}" for a in answers]

    if node_type == 'expression-value':
        text = interpolate(node['template'], scope).strip() or node.get('fallback', '')
        if node.get('hideIfEmpty') and not text:
            return []
        return field_row_as_text(node['label'], text, node.get('labelConfig'))

    if node_type == 'static-label':
        # Real, per direct guidance: node['text'] is a real, plain string
        # in the real schema (never HTML) — the PDF path's own <i> wrap
        # is a pure visual style applied at render time, with no real
        # plain-text equivalent to preserve.
        return [node['text']]

    if node_type == 'paragraph':
        raw = get_path(scope, node.get('bindingKey')) if node.get('bindingKey') else None
        html = str(raw) if raw not in (None, '') else (node.get('freeformContent') or '')
        if node.get('hideIfEmpty') and not html:
            return []
        value = strip_html_to_text(html) or (node.get('placeholder') or '—')
        return field_row_as_text(node['label'], value, node.get('labelConfig'))

    if node_type == 'dropdown':
        raw = get_path(scope, node.get('bindingKey'))
        values = raw if isinstance(raw, list) else ([raw] if raw is not None else [])
        opt_by_value = {o['value']: o['label'] for o in node.get('options', [])}
        labels = [opt_by_value.get(str(v), str(v)) for v in values]
        if node.get('hideIfEmpty') and not labels:
            return []
        return field_row_as_text(node['label'], ', '.join(labels) if labels else '—', node.get('labelConfig'))

    if node_type == 'column-layout':
        # Real, per direct guidance: the PDF path's own n-column chunking
        # is a purely visual grid layout — plain text has no columns, so
        # this is just the real, flattened children, same real content,
        # no real information lost.
        return render_children_as_text(node.get('children', []), scope, sections_by_id)

    if node_type == 'section':
        ai = node.get('ai') or {}
        if ai.get('enabled'):
            return render_ai_section_as_text(node, sections_by_id)
        lines = []
        if node.get('printHeading'):
            lines.append(node['printHeading'])
        lines += render_children_as_text(node.get('children', []), scope, sections_by_id)
        return lines

    if node_type == 'repeat-group':
        items = get_path(scope, node.get('iterateOver')) or []
        if not isinstance(items, list) or not items:
            return []
        alias = node.get('itemAlias', 'item')
        lines = []
        for item in items:
            child_scope = {**scope, alias: item}
            lines += render_children_as_text(node.get('children', []), child_scope, sections_by_id)
            lines.append('')
        return lines

    if node_type == 'if-block':
        children = node.get('children', []) if eval_condition(node.get('condition'), scope) else node.get('elseChildren', [])
        return render_children_as_text(children, scope, sections_by_id)

    if node_type == 'switch-block':
        match = next((c for c in node.get('cases', []) if eval_condition(c.get('when'), scope)), None)
        children = match['children'] if match else node.get('defaultChildren', [])
        return render_children_as_text(children, scope, sections_by_id)

    # Real, same real scope decision as render_node() above, for the same
    # real reason: render nothing rather than guess at an unverified
    # format. Implement in both real functions together if/when a real
    # Part needs one of these.
    return []


def render_children_as_text(nodes: list, scope: dict, sections_by_id: dict) -> list[str]:
    lines = []
    for n in nodes:
        lines += render_node_as_text(n, scope, sections_by_id)
    return lines


# ── Document assembly ────────────────────────────────────────────────────────

# Batch 392 (Pete: a report is written in the performing lab's language). The
# frontend sends the wording around the report as `labels`, in the lab's
# language (surgicalReportPdf.* in the app's locale files), and dates already
# formatted in it. A request without labels gets the English wording used
# before. Placeholders: {{name}}. Korean needs a Hangul font this renderer
# doesn't register yet (open; the cytology PDF has Pretendard).

# ── Batch 613: intraoperative diagnosis and attached related cases ──────────────────────────
# The intraoperative diagnosis is part of the case report, like an addendum. Related cases are the
# snapshots the pathologist saw and signed with the report; they print exactly as recorded.
def intraop_lines(payload: dict, labels: dict) -> list:
    text = (payload.get('intraoperativeDiagnosis') or '').strip()
    return [(labels['intraopDiagnosis'], text)] if text else []


def related_case_blocks(payload: dict, labels: dict) -> list:
    """One list of (label, value) rows per attached case, in the order the signer saw them."""
    blocks = []
    for c in payload.get('relatedCases') or []:
        rows = [(c.get('accession') or '', labels['relatedCaseReleased'] + ' ' + str(c.get('releasedAt') or '')[:10])]
        specimens = c.get('specimens') or []
        if specimens:
            rows.append((labels['relatedCaseSpecimens'], '; '.join(specimens)))
        if c.get('intraoperativeDiagnosis'):
            rows.append((labels['intraopDiagnosis'], c['intraoperativeDiagnosis']))
        rows.append((labels['relatedCaseDiagnosis'], c.get('diagnosis') or ''))
        if c.get('signedBy'):
            rows.append((labels['relatedCaseSignedBy'], c['signedBy']))
        if c.get('orderingPhysician'):
            rows.append((labels['relatedCaseOrdering'], c['orderingPhysician']))
        if c.get('copyToPhysicians'):
            rows.append((labels['relatedCaseCopyTo'], ', '.join(c['copyToPhysicians'])))
        if c.get('client'):
            rows.append((labels['relatedCaseClient'], c['client']))
        blocks.append(rows)
    return blocks


def _intraop_related_flows(payload: dict, labels: dict, part: str) -> list:
    """part: 'intraop' (before the body) or 'related' (after it)."""
    from xml.sax.saxutils import escape
    out = []
    if part == 'intraop':
        for label, text in intraop_lines(payload, labels):
            out.append(Paragraph('<b>%s</b>' % escape(label), _styles['RPLabel']))
            out.append(Paragraph(escape(text).replace('\n', '<br/>'), _styles['RPValue']))
            out.append(Spacer(1, 8))
        return out
    blocks = related_case_blocks(payload, labels)
    if not blocks:
        return out
    out.append(Spacer(1, 10))
    out.append(Paragraph('<b>%s</b>' % escape(labels['relatedCasesTitle']), _styles['RPLabel']))
    out.append(Paragraph(escape(labels['relatedCasesNotice']), _styles['RPCaption']))
    for rows in blocks:
        out.append(Spacer(1, 6))
        for i, (label, value) in enumerate(rows):
            out.append(Paragraph(('<b>%s</b> %s' if i else '<b>%s</b>  %s') % (escape(label), escape(value).replace('\n', '<br/>')), _styles['RPValue']))
    return out


def _intraop_related_text(payload: dict, labels: dict, part: str) -> list:
    lines = []
    if part == 'intraop':
        for label, text in intraop_lines(payload, labels):
            lines += [label, text, '']
        return lines
    blocks = related_case_blocks(payload, labels)
    if blocks:
        lines += ['', labels['relatedCasesTitle'], labels['relatedCasesNotice']]
        for rows in blocks:
            lines.append('')
            lines += [f'{label}: {value}' if i else f'{label}  {value}' for i, (label, value) in enumerate(rows)]
    return lines


DEFAULT_LABELS = {
    'patient': 'Patient',
    'mrn': 'MRN',
    'dob': 'Date of Birth',
    'referring': 'Referring',
    'clinician': 'Clinician',
    'reportTemplate': 'Report Template: {{name}}',
    'resolvedBy': ' (resolved by {{name}})',
    'confidential': 'CONFIDENTIAL — PATHOLOGY REPORT',
    'notYetGenerated': 'Not yet generated',
    'requiredNotCompleted': '⚠ Required — not yet completed',
    'noContent': 'No content',
    'noSynopticData': 'No synoptic data recorded.',
    'workupParts': 'Part(s)',
    'workupProtocol': 'Protocol',
    'workupVersion': 'Version',
    'workupStatus': 'Status',
    'workupSigned': 'Signed',
    'workupDocument': 'Document',
    'workupChanges': 'Changed in this version',
    'workupFinal': 'Final',
    'workupCorrected': 'Corrected',
    'workupAddendum': 'Addendum',
    # Batch 463: a map that couldn't be drawn as an image is never left out silently.
    'figureNotDrawn': 'Map notice: the map could not be drawn as an image. What it shows:',
    # Batch 498 (PS-283): revision status and the footer document reference.
    'revisionAmendment': 'AMENDED REPORT',
    'revisionAddendum': 'REPORT WITH ADDENDUM',
    'revisionCorrection': 'CORRECTED REPORT',
    'revisionDatesWithOriginal': 'Originally signed out {{original}} · Revised {{latest}}',
    'revisionDatesLatestOnly': 'Revised {{latest}}',
    'documentReference': 'Document {{accession}} · record version {{version}}',
    'documentReferenceNoVersion': 'Document {{accession}}',
    # Batch 618 (PS-336): the technical lab of a split case.
    'technicalComponentAt': 'Technical component performed at: {{facility}}',
    # Batch 613: the intraoperative diagnosis and the related cases the signer attached.
    'intraopDiagnosis': 'Intraoperative diagnosis',
    'relatedCasesTitle': 'Related cases',
    'relatedCasesNotice': 'Summary of previously released reports. These are not part of the diagnosis of this report; each is identified by its own accession number.',
    'relatedCaseReleased': 'Released',
    'relatedCaseSpecimens': 'Specimens',
    'relatedCaseDiagnosis': 'Diagnosis',
    'relatedCaseSignedBy': 'Signed out by',
    'relatedCaseOrdering': 'Ordering physician',
    'relatedCaseCopyTo': 'Copy to',
    'relatedCaseClient': 'Client',
}
_current_labels = contextvars.ContextVar('report_labels', default=DEFAULT_LABELS)


def _label(key: str) -> str:
    return _current_labels.get()[key]


def report_labels(payload: dict) -> dict:
    given = payload.get('labels') or {}
    return {k: (given.get(k) if isinstance(given.get(k), str) and given.get(k) else v) for k, v in DEFAULT_LABELS.items()}


def fill_label(template: str, name: str) -> str:
    return template.replace('{{name}}', name)


def fill_placeholders(template: str, values: dict) -> str:
    """Batch 498: fill {{key}} placeholders (labels with more than {{name}})."""
    out = template
    for k, v in values.items():
        out = out.replace('{{%s}}' % k, '' if v is None else str(v))
    return out


# ── Batch 498 (PS-283, PS-333): watermark, revision status, footer reference,
#    pre-analytic disclaimer. The app sent all four before this batch; this
#    renderer ignored them, so a PDF made during the release buffer had no
#    watermark and an amended report's PDF didn't say it was amended. The
#    same rules apply to the in-app render (ReportPreviewRenderer.tsx) and
#    must carry over when rendering moves to the API server.

_REVISION_LABEL = {'amendment': 'revisionAmendment', 'addendum': 'revisionAddendum', 'correction': 'revisionCorrection'}


def revision_lines(payload: dict, labels: dict) -> list[str]:
    """The revision banner's two lines ([] when the report has no released revision)."""
    rev = payload.get('revision') or {}
    key = _REVISION_LABEL.get(rev.get('type') or '')
    if not key or not rev.get('latestRevisionAt'):
        return []
    if rev.get('originalSignOutAt'):
        dates = fill_placeholders(labels['revisionDatesWithOriginal'], {'original': rev['originalSignOutAt'], 'latest': rev['latestRevisionAt']})
    else:
        dates = fill_placeholders(labels['revisionDatesLatestOnly'], {'latest': rev['latestRevisionAt']})
    return [labels[key], dates]


def document_reference_text(payload: dict, labels: dict) -> str:
    """The footer's readable reference ('' without an accession)."""
    accession = ((payload.get('caseHeader') or {}).get('accession') or '').strip()
    if not accession:
        return ''
    version = payload.get('documentVersion')
    if isinstance(version, int) and not isinstance(version, bool):
        return fill_placeholders(labels['documentReference'], {'accession': accession, 'version': version})
    return fill_placeholders(labels['documentReferenceNoVersion'], {'accession': accession})


def disclaimer_text(payload: dict) -> str:
    text = payload.get('preAnalyticDisclaimerText')
    return text.strip() if isinstance(text, str) else ''


def technical_facility_line(payload: dict, labels: dict) -> str:
    """Batch 618 (PS-336): the one line naming the lab that did the technical component of a
    split case. Name and address only; a director or CLIA number in the request is ignored."""
    tb = payload.get('technicalBranding')
    if not isinstance(tb, dict):
        return ''
    name = (tb.get('facilityName') or '').strip()
    if not name:
        return ''
    place = ' '.join(p for p in ((tb.get('state') or '').strip(), (tb.get('zip') or '').strip()) if p)
    parts = [name, (tb.get('address') or '').strip(), ', '.join(p for p in ((tb.get('city') or '').strip(), place) if p)]
    facility = ', '.join(p for p in parts if p)
    template = labels.get('technicalComponentAt') or DEFAULT_LABELS['technicalComponentAt']
    return template.replace('{{facility}}', facility)


# Batch 652: the watermark is a faint red; the footer barcode is always solid black.
WATERMARK_COLOR = colors.Color(0.86, 0.15, 0.15, alpha=0.16)
BARCODE_COLOR = colors.Color(0, 0, 0, alpha=1)


def watermark_text(payload: dict) -> str:
    text = payload.get('watermarkText')
    return text.strip() if isinstance(text, str) else ''


def _revision_banner_flows(payload: dict, labels: dict) -> list:
    from xml.sax.saxutils import escape
    lines = revision_lines(payload, labels)
    if not lines:
        return []
    flag_style = ParagraphStyle('rp-revision-flag', parent=_styles['RPLabel'], fontName=_font(True), fontSize=10, textColor=colors.HexColor('#92400e'))
    dates_style = ParagraphStyle('rp-revision-dates', parent=_styles['RPLabel'], fontSize=9, textColor=colors.black)
    box = Table([[Paragraph(escape(lines[0]), flag_style)], [Paragraph(escape(lines[1]), dates_style)]], colWidths=[_text_width()])
    box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#b45309')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff7ed')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return [Spacer(1, 6), box, Spacer(1, 6)]


def _disclaimer_flows(payload: dict) -> list:
    from xml.sax.saxutils import escape
    text = disclaimer_text(payload)
    if not text:
        return []
    style = ParagraphStyle('rp-disclaimer', parent=_styles['RPLabel'], fontSize=9, textColor=colors.black, leading=12)
    box = Table([[Paragraph(escape(text), style)]], colWidths=[_text_width()])
    box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#64748b')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return [Spacer(1, 6), box, Spacer(1, 6)]


def _page_decorator(payload: dict, labels: dict, footer_flows: list | None = None, footer_base: float = 0.0, inset: float = 0.0):
    """Draws the watermark (every page, under the text) and the footer
    reference (every page: accession barcode, document reference, and the
    revision flag when the report has been revised). Batch 609: and the
    template's footer part, when it draws something, above the reference."""
    mark = watermark_text(payload)
    reference = document_reference_text(payload, labels)
    accession = ((payload.get('caseHeader') or {}).get('accession') or '').strip()
    rev = revision_lines(payload, labels)
    footer_text = '  ·  '.join(x for x in [rev[0] if rev else '', reference] if x)
    fonts = _current_fonts.get()

    signed_at = signing_time(payload)

    def on_page(canvas, doc):
        # Batch 652: the PDF's creation date is the signing time, never the clock (same bytes for the same request).
        cytology_report.fix_timestamp(canvas, signed_at)
        width, height = doc.pagesize
        canvas.saveState()
        if mark:
            # Batch 652: the watermark's faint red fill is set inside its own saved state. It used to be set
            # outside one, so it stayed in force for the footer and the accession barcode (the bars are drawn
            # with the current fill) printed faint red, too light to scan, on a pending-release print.
            canvas.saveState()
            # Sized so the rotated line stays inside the page width.
            size = 30
            while size > 10 and canvas.stringWidth(mark, fonts[1], size) > width * 0.9:
                size -= 1
            canvas.setFont(fonts[1], size)
            canvas.setFillColor(WATERMARK_COLOR)
            for frac in (0.28, 0.55, 0.82):
                canvas.saveState()
                canvas.translate(width / 2, height * frac)
                canvas.rotate(32)
                canvas.drawCentredString(0, 0, mark)
                canvas.restoreState()
            canvas.restoreState()
        left = doc.leftMargin + inset  # the text's left edge (the frame has its own 6 pt padding)
        if footer_flows:
            avail = width - left - (doc.rightMargin + inset)
            heights = [f.wrap(avail, 10_000)[1] for f in footer_flows]
            y = footer_base + sum(heights)
            for f, h in zip(footer_flows, heights):
                y -= h
                f.drawOn(canvas, left, y)
        if accession:
            x = left
            try:
                barcode = Code128(accession, barHeight=7 * mm, barWidth=0.28 * mm, humanReadable=False)
                # Solid, opaque black whatever was drawn before (a scanner needs full contrast).
                canvas.setFillColor(BARCODE_COLOR)
                canvas.setFillAlpha(1)
                barcode.drawOn(canvas, x - barcode.lquiet, 8 * mm)
                x += barcode.width - barcode.lquiet + 4 * mm
            except Exception:  # noqa: BLE001 — an accession the barcode can't encode keeps the readable reference
                pass
            if footer_text:
                canvas.setFont(fonts[0], 7.5)
                canvas.setFillColor(colors.HexColor('#334155'))
                canvas.drawString(x, 10.5 * mm, footer_text)
        canvas.restoreState()

    return on_page


def case_header_rows(header: dict, labels: dict) -> list:
    return [
        (labels['patient'], header.get('patient')),
        (labels['mrn'], header.get('mrn')),
        (labels['dob'], header.get('dob')),
        (labels['referring'], header.get('referring')),
        (labels['clinician'], header.get('clinician')),
    ]


def template_caption(payload: dict, labels: dict):
    template_name = payload.get('templateName')
    if not template_name:
        return None
    resolved_by = (payload.get('resolvedBy') or '').replace('-', ' ')
    suffix = fill_label(labels['resolvedBy'], resolved_by) if resolved_by else ''
    return fill_label(labels['reportTemplate'], template_name) + suffix


_WORKUP_STATUS_LABEL = {'FINAL': 'workupFinal', 'CORRECTED': 'workupCorrected', 'ADDENDUM': 'workupAddendum'}


def workup_rows(workup: dict, labels: dict) -> list:
    """Batch 426: the identity rows of one synoptic workup's own PDF."""
    status_key = _WORKUP_STATUS_LABEL.get(workup.get('status') or '')
    protocol = ' '.join(x for x in [workup.get('protocol') or '', workup.get('protocolVersion') or ''] if x)
    signed = ' '.join(x for x in [workup.get('signedBy') or '', workup.get('signedAt') or ''] if x)
    rows = [
        (labels['workupParts'], ', '.join(workup.get('parts') or [])),
        (labels['workupProtocol'], protocol),
        (labels['workupStatus'], labels[status_key] if status_key else ''),
        (labels['workupVersion'], str(workup['version']) if workup.get('version') is not None else ''),
        (labels['workupSigned'], signed),
        (labels['workupDocument'], workup.get('documentId') or ''),
    ]
    return [(k, v) for k, v in rows if v]


def workup_change_lines(workup: dict) -> list[str]:
    return [f"{c.get('label', '')}: {c.get('from', '') or '—'} → {c.get('to', '') or '—'}" for c in (workup.get('changes') or [])]


def _workup_flows(workup: dict, labels: dict, scope: dict, sections_by_id: dict) -> list:
    """Batch 427: one workup (heading, identity rows, answers, changes) for a combined PDF."""
    flows = [Paragraph(workup.get('protocol') or '', _styles['RPHeading'])]
    rows = [[k, v] for k, v in workup_rows(workup, labels)]
    if rows:
        t = Table(rows, colWidths=[35 * mm, None])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), _font(False)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        flows += [t, Spacer(1, 8)]
    flows += render_node({'type': 'synoptic-block'}, scope, sections_by_id)
    changes = workup_change_lines(workup)
    if changes:
        flows += [Spacer(1, 8), Paragraph(labels['workupChanges'], _styles['RPCaption'])]
        flows += [Paragraph(line, _styles['RPCaption']) for line in changes]
    return flows


# Batch 609 (PS-35, PS-127): the margins the report printed with before the lab could
# set them (top, right, bottom, left, in mm); a request without a page setup keeps them.
DEFAULT_MARGINS_MM = (18, 20, 22, 20)
# The footer reference (accession barcode and document reference) is drawn 8 to 18 mm
# from the bottom edge, so the bottom margin is never below this, whatever the lab sets.
FOOTER_BAND_MM = 20


def signing_time(payload: dict):
    """Batch 652: the instant the report was signed, as the request gives it (top-level signedAt, else the workup's, else the
    first of workups). None when the request has none (a preview): the date is then reportlab's fixed one, still not the clock."""
    for source in (payload, payload.get('workup') or {}, *(payload.get('workups') or [])):
        value = source.get('signedAt') if isinstance(source, dict) else None
        if value:
            return str(value)
    return None


def build_report_pdf(payload: dict) -> bytes:
    token = _current_fonts.set(fonts_for(payload))
    labels_token = _current_labels.set(report_labels(payload))
    geometry = report_layout.page_geometry(payload, DEFAULT_MARGINS_MM)
    geometry_token = _current_geometry.set(geometry)
    style_token = _current_style.set({c: report_layout.style_for(payload, c) for c in report_layout.CATEGORIES})
    units_token = _current_font_units.set(payload.get('fontUnits') if payload.get('fontUnits') in report_layout.FONT_UNITS else None)
    try:
        return _build_report_pdf(payload)
    finally:
        _current_font_units.reset(units_token)
        _current_style.reset(style_token)
        _current_geometry.reset(geometry_token)
        _current_labels.reset(labels_token)
        _current_fonts.reset(token)


# ── Header and footer parts (Batch 609) ─────────────────────────────────────
# The template's header and footer Parts (headerAssembly / footerAssembly, one slot
# each) hold a 'header' or 'footer' node of text lines, or ordinary nodes. They were
# sent in every request and ignored: the institution block and the confidentiality
# line were always drawn from fixed fields. Now, when a part draws something, it
# replaces that fixed text (the preview's rule: ReportPreviewRenderer.tsx).

def _interpolated_line(node: dict, scope: dict) -> str | None:
    """Mirrors renderTextLine() in ReportPreviewRenderer.tsx."""
    if node.get('type') == 'expression-value':
        text = interpolate(node.get('template') or '', scope)
        return text if text.strip() else (node.get('fallback') or None)
    if node.get('type') == 'static-label':
        return node.get('text') or None
    return None


def _category_paragraph(text: str, category: str, size: float, bold: bool, color=colors.black) -> Paragraph:
    """A line in a category's document style: the style's family, size, weight, case and underline
    where set, the given size and weight otherwise."""
    from xml.sax.saxutils import escape
    style = _doc_style(category)
    family = style['family'] if style['family'] and _current_fonts.get() == LATIN_FONTS else _current_fonts.get()
    is_bold = style['bold'] if style['bold'] is not None else bold
    pt = style['size_pt'] or size
    body = escape(report_layout.apply_transform(text, style))
    if style['underline']:
        body = f'<u>{body}</u>'
    return Paragraph(body, ParagraphStyle(
        f'rp-{category}-line', fontName=family[1 if is_bold else 0], fontSize=pt, leading=round(pt * 1.25, 2), textColor=color,
    ))


def _part_flows(parts: list, kind: str, scope: dict, sections_by_id: dict) -> list:
    """The flowables of a header or footer assembly. Empty when no part draws anything."""
    flows: list = []
    for part in sorted(parts or [], key=lambda p: p.get('order', 0)):
        for node in part.get('nodes') or []:
            show_when = node.get('showWhen')
            if show_when and not eval_condition(show_when, scope):
                continue
            if node.get('type') in ('header', 'footer'):
                lines = [ln for ln in (_interpolated_line(c, scope) for c in node.get('children') or []) if ln]
                for i, line in enumerate(lines):
                    if kind == 'header':
                        flows.append(_category_paragraph(line, 'header', 12 if i == 0 else 9, i == 0))
                    else:
                        flows.append(_category_paragraph(line, 'footer', 8, False, colors.HexColor('#334155')))
            else:
                flows += render_node(node, scope, sections_by_id)
    return flows


def _header_footer_scope(payload: dict, scope: dict) -> dict:
    """The preview's headerFooterScope: the case scope plus the institution."""
    inst = payload.get('institution') or {}
    return {**scope, 'institution': {
        'name': inst.get('name', ''), 'department': inst.get('dept', ''),
        'address': inst.get('address', ''), 'phone': inst.get('phone', ''),
    }}




def figure_notice(fig: dict) -> list:
    """Batch 463: in place of a map that couldn't be drawn (no PNG, or one that
    can't be read), a boxed notice, never a silent gap: the label in the
    report's language, then the map's content as text when the request gives
    it (`fallbackLines`: a Mohs map's stage lines). Only for figures that are
    part of the report (`notice`: true); an optional inserted figure without an
    image is still left out, as before."""
    from xml.sax.saxutils import escape
    style = ParagraphStyle('rp-figure-notice', parent=_styles['RPLabel'], textColor=colors.black, leading=11)
    rows = [[Paragraph('<b>%s</b>' % escape(_label('figureNotDrawn')), style)]]
    rows += [[Paragraph(escape(str(line)), style)] for line in (fig.get('fallbackLines') or []) if str(line).strip()]
    box = Table(rows, colWidths=[_text_width()])
    box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#b45309')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return [KeepTogether([box, Spacer(1, 10)])]


def figure_flows(payload: dict) -> list:
    """Batch 461: the report's anatomical map figures (reportFigures), each
    scaled to at most the text width with its proportions kept. A figure
    without a PNG, or whose PNG can't be read, never stops the report: a map
    that is part of the report (Batch 463, `notice`: true) prints a notice in
    its place (figure_notice); an optional inserted one is left out."""
    import base64
    flows = []
    for fig in payload.get('reportFigures') or []:
        png = fig.get('pngBase64')
        drawn = None
        if png:
            try:
                data = base64.b64decode(png, validate=True)
                w = float(fig.get('width') or 0)
                h = float(fig.get('height') or 0)
                img = Image(BytesIO(data))
                if w <= 0 or h <= 0:
                    w, h = float(img.imageWidth), float(img.imageHeight)
                width = min(_text_width(), w * 0.75)  # CSS px → points
                img.drawWidth = width
                img.drawHeight = width * h / w
                drawn = [KeepTogether([img, Spacer(1, 10)])]
            except Exception:  # noqa: BLE001 — a bad image never stops the report
                drawn = None
        if drawn:
            flows += drawn
        elif fig.get('notice'):
            flows += figure_notice(fig)
    return flows


def _build_report_pdf(payload: dict) -> bytes:
    buf = BytesIO()
    # Batch 609 (PS-35): the lab's page size and margins, and the template's header and
    # footer parts, are read from the request. Without a page setup it is A4 as before.
    geometry = _current_geometry.get() or report_layout.page_geometry(payload, DEFAULT_MARGINS_MM)
    margin_top, margin_right, margin_bottom, margin_left = geometry['margins']
    margin_bottom = max(margin_bottom, FOOTER_BAND_MM * mm)
    labels = report_labels(payload)
    scope, sections_by_id = resolve_scope_and_sections(payload)
    hf_scope = _header_footer_scope(payload, scope)
    header_flows = _part_flows(payload.get('headerAssembly'), 'header', hf_scope, sections_by_id)
    footer_flows = _part_flows(payload.get('footerAssembly'), 'footer', hf_scope, sections_by_id)
    footer_base = margin_bottom
    if footer_flows:
        avail = geometry['size'][0] - margin_left - margin_right
        margin_bottom += sum(f.wrap(avail, 10_000)[1] for f in footer_flows) + 3 * mm

    # SimpleDocTemplate's frame pads its text by 6 pt. A lab's margin is where the text starts,
    # so its margins are reduced by the padding; a request without a page setup keeps the
    # original layout exactly.
    inset = 6.0 if geometry['from_request'] else 0.0
    doc = SimpleDocTemplate(
        buf, pagesize=geometry['size'],
        topMargin=margin_top - inset, bottomMargin=margin_bottom - inset,
        leftMargin=margin_left - inset, rightMargin=margin_right - inset,
        title=payload.get('caseHeader', {}).get('accession', 'PathScribe Report'),
        # Batch 652: deterministic output: reportlab's invariant mode (fixed document ID and object order, no
        # clock), fixed producer text, and the creation date from the signing time (_page_decorator).
        creator='PathScribe', producer='PathScribe report renderer', invariant=1,
    )

    flows = []
    inst = payload.get('institution') or {}
    header = payload.get('caseHeader') or {}

    if header_flows:
        flows += header_flows
    else:
        head = _doc_style('header')
        if head['size_pt'] or head['bold'] is not None or head['underline'] or head['transform'] or head['family']:
            small = max(6, round((head['size_pt'] or 12) * 0.8, 2))
            if inst.get('name'):
                flows.append(_category_paragraph(inst['name'], 'header', 12, True))
            for key in ('dept', 'address'):
                if inst.get(key):
                    flows.append(Paragraph(report_layout.apply_transform(inst[key], head), ParagraphStyle(
                        f'rp-header-{key}', parent=_styles['RPCaption'], fontSize=small, leading=round(small * 1.25, 2))))
        else:
            if inst.get('name'):
                flows.append(Paragraph(inst['name'], _styles['RPHeading']))
            if inst.get('dept'):
                flows.append(Paragraph(inst['dept'], _styles['RPCaption']))
            if inst.get('address'):
                flows.append(Paragraph(inst['address'], _styles['RPCaption']))
    flows.append(Spacer(1, 8))

    if header.get('accession'):
        flows.append(Paragraph(header['accession'], _styles['RPHeading']))

    case_rows = [[k, v] for k, v in case_header_rows(header, labels) if v]
    if case_rows:
        t = Table(case_rows, colWidths=[35 * mm, None])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), _font(False)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        flows.append(t)

    caption = template_caption(payload, labels)
    if caption:
        flows.append(Spacer(1, 4))
        flows.append(Paragraph(caption, _styles['RPCaption']))

    # Batch 618 (PS-336): the technical lab of a split case, on a signed-out report.
    technical_line = technical_facility_line(payload, labels)
    if technical_line:
        from xml.sax.saxutils import escape as _esc
        flows.append(Spacer(1, 4))
        flows.append(Paragraph(_esc(technical_line), _styles['RPCaption']))

    # Batch 498 (PS-283 §4.2.2): revision status in the report's header area.
    flows += _revision_banner_flows(payload, labels)
    # Batch 498: the pre-analytic override disclaimer, before the body.
    flows += _disclaimer_flows(payload)

    flows.append(Spacer(1, 12))
    flows += _intraop_related_flows(payload, labels, 'intraop')

    workup = payload.get('workup')
    for combined in payload.get('workups') or []:
        # Batch 427: every workup of the case in one PDF.
        flows += _workup_flows(combined, labels, {**scope, '__synopticAnswers__': combined.get('synopticAnswers') or []}, sections_by_id)
        flows.append(Spacer(1, 14))
    if workup:
        # Batch 426: one synoptic workup's own PDF.
        rows = [[k, v] for k, v in workup_rows(workup, labels)]
        if rows:
            t = Table(rows, colWidths=[35 * mm, None])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), _font(False)),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))
            flows.append(t)
            flows.append(Spacer(1, 10))
        flows += render_node({'type': 'synoptic-block'}, scope, sections_by_id)
        changes = workup_change_lines(workup)
        if changes:
            flows.append(Spacer(1, 10))
            flows.append(Paragraph(labels['workupChanges'], _styles['RPCaption']))
            for line in changes:
                flows.append(Paragraph(line, _styles['RPCaption']))

    body_assembly = sorted(payload.get('bodyAssembly') or [], key=lambda p: p.get('order', 0))
    for part in body_assembly:
        for node in part.get('nodes', []):
            flows += render_node(node, scope, sections_by_id)
        flows.append(Spacer(1, 10))

    flows += figure_flows(payload)
    flows += _intraop_related_flows(payload, labels, 'related')

    flows.append(Spacer(1, 16))
    if not footer_flows:  # a footer part carries its own confidentiality line
        flows.append(Paragraph(labels['confidential'], _styles['RPCaption']))

    # Batch 498: watermark and footer reference on every page.
    decorate = _page_decorator(payload, labels, footer_flows, footer_base, inset)
    doc.build(flows, onFirstPage=decorate, onLaterPages=decorate)
    return buf.getvalue()


def build_report_text(payload: dict) -> str:
    """Real, per direct guidance (outputFormat: 'text' — the real
    extension for buildOruR01Payload.ts's own reportNarrativeText field).
    Text-mode mirror of build_report_pdf() above — same real header/case/
    template/body content, same real order, joined as plain lines instead
    of assembled into a PDF. See render_node_as_text()'s own header
    comment for why this walks the real node tree a second time rather
    than reusing build_report_pdf()'s own already-built ReportLab
    flowables."""
    labels_token = _current_labels.set(report_labels(payload))
    try:
        return _build_report_text(payload)
    finally:
        _current_labels.reset(labels_token)


def _build_report_text(payload: dict) -> str:
    lines: list[str] = []
    inst = payload.get('institution') or {}
    header = payload.get('caseHeader') or {}

    if inst.get('name'):
        lines.append(inst['name'])
    if inst.get('dept'):
        lines.append(inst['dept'])
    if inst.get('address'):
        lines.append(inst['address'])
    lines.append('')

    if header.get('accession'):
        lines.append(header['accession'])

    labels = report_labels(payload)
    for label, value in case_header_rows(header, labels):
        if value:
            lines.append(f'{label}: {value}')

    caption = template_caption(payload, labels)
    if caption:
        lines.append('')
        lines.append(caption)

    # Batch 618 (PS-336): the technical lab of a split case.
    technical_line = technical_facility_line(payload, labels)
    if technical_line:
        lines.append(technical_line)

    # Batch 498: the same revision status and disclaimer as the PDF.
    revision = revision_lines(payload, labels)
    if revision:
        lines.append('')
        lines += revision
    if disclaimer_text(payload):
        lines.append('')
        lines.append(disclaimer_text(payload))

    lines.append('')

    scope, sections_by_id = resolve_scope_and_sections(payload)
    lines += _intraop_related_text(payload, labels, 'intraop')

    workup = payload.get('workup')
    for combined in payload.get('workups') or []:
        # Batch 427: every workup of the case, as text.
        lines.append(combined.get('protocol') or '')
        for label, value in workup_rows(combined, labels):
            lines.append(f'{label}: {value}')
        lines.append('')
        lines += render_node_as_text({'type': 'synoptic-block'}, {**scope, '__synopticAnswers__': combined.get('synopticAnswers') or []}, sections_by_id)
        changes = workup_change_lines(combined)
        if changes:
            lines += ['', labels['workupChanges']] + changes
        lines.append('')
    if workup:
        # Batch 426: one synoptic workup, as text.
        for label, value in workup_rows(workup, labels):
            lines.append(f'{label}: {value}')
        lines.append('')
        lines += render_node_as_text({'type': 'synoptic-block'}, scope, sections_by_id)
        changes = workup_change_lines(workup)
        if changes:
            lines.append('')
            lines.append(labels['workupChanges'])
            lines += changes
        lines.append('')

    body_assembly = sorted(payload.get('bodyAssembly') or [], key=lambda p: p.get('order', 0))
    for part in body_assembly:
        for node in part.get('nodes', []):
            lines += render_node_as_text(node, scope, sections_by_id)
        lines.append('')

    lines += _intraop_related_text(payload, labels, 'related')
    lines.append('')
    lines.append(labels['confidential'])
    reference = document_reference_text(payload, labels)
    if reference:
        lines.append(reference)

    return '\n'.join(lines)


# ── HTTP entrypoint ──────────────────────────────────────────────────────────

@https_fn.on_request(
    cors=options.CorsOptions(
        # Restricted to the real frontend deployment + local dev servers.
        # If you add a staging URL or change Vite's dev port, add it here too.
        cors_origins=[
            "https://pathscribe-ai-ui.vercel.app",
            "http://localhost:5173",   # Vite dev server default
            "http://127.0.0.1:5173",
        ],
        cors_methods=["POST"],
    ),
)
def render_report(req: https_fn.Request) -> https_fn.Response:
    if req.method != 'POST':
        return https_fn.Response('Method not allowed', status=405)

    payload = req.get_json(silent=True)
    if not payload:
        return https_fn.Response('Missing or invalid JSON body', status=400)

    # Real, per direct guidance (outputFormat: 'text' — the real
    # extension for buildOruR01Payload.ts's own reportNarrativeText
    # field): missing/undefined defaults to 'pdf', so every existing
    # real caller of this function is completely unaffected.
    output_format = payload.get('outputFormat', 'pdf')

    # Batch 539 (PS-539 D2): the cytology report template (cytology_report.py).
    if payload.get('template') == 'cytology':
        if output_format != 'pdf':
            return https_fn.Response('The cytology template makes PDF only', status=400)
        problem = cytology_report.validate_cytology_payload(payload)
        if problem:
            return https_fn.Response(f'Invalid cytology report: {problem}', status=400)
        try:
            pdf_bytes = cytology_report.build_cytology_pdf(payload)
        except Exception as e:  # noqa: BLE001 — a clean 500, no stack trace
            return https_fn.Response(f'Report generation failed: {e}', status=500)
        return https_fn.Response(pdf_bytes, status=200, headers={
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="cytology-report.pdf"',
        })

    if output_format == 'text':
        try:
            text = build_report_text(payload)
        except Exception as e:  # noqa: BLE001 — same real posture as the PDF path below
            return https_fn.Response(f'Report generation failed: {e}', status=500)
        return https_fn.Response(
            json.dumps({'text': text}),
            status=200,
            headers={'Content-Type': 'application/json'},
        )

    try:
        pdf_bytes = build_report_pdf(payload)
    except Exception as e:  # noqa: BLE001 — return a clean 500, don't leak internals/stack traces
        return https_fn.Response(f'Report generation failed: {e}', status=500)

    accession = (payload.get('caseHeader') or {}).get('accession') or 'report'
    return https_fn.Response(
        pdf_bytes,
        status=200,
        headers={
            'Content-Type': 'application/pdf',
            'Content-Disposition': f'inline; filename="{accession}.pdf"',
        },
    )


# ── receive_interface_message ────────────────────────────────────────────────
# Real, per direct guidance ("we can setup just the receiving end for now
# and look to see that the json packages coming out of PS are correct" —
# a real, generic receiving end so all real outbound transaction types can
# be checked, not one receiver per type).
#
# Deliberately never generates HL7 itself, same real "PathScribe sends
# JSON, the interface engine builds HL7" posture as this whole outbound
# architecture — this function is a real stand-in for that interface
# engine's receiving side, not a Mirth Connect replacement.
#
# Request body (JSON), POSTed to this function's URL — one real, generic
# envelope shape used by every real transaction type, rather than four
# independently-shaped request bodies this function would need separate
# validation for:
#   {
#     "queueEntryId": str,  # the real DLQ queue entry id this dispatch came from
#     "transactionType": "A08" | "A40" | "A47" | "ORU_R01" | "LIS_SYNC" | "ORDER_CREATED"
#                        | "REGISTRY_REPORT" | "CANCER_REGISTRY_REPORT" | "PRINT_JOB"
#                        | "CRITICAL_ALERT" | "WSI_SCAN_MANIFEST"
#                        | "ACCESSION_EVENT" | "REFERRAL_MANIFEST" | "MOLECULAR_ORDER"
#                        | "MOLECULAR_WORKLIST"
#                        | "REPORT_DELIVERY",
#     "dispatchedAt": str,  # real ISO timestamp of this dispatch attempt
#     "payload": { ... },   # the real, actual payload — Adt08DemographicUpdatePayload /
#                           # Adt40MergePatientPayload / Adt47ChangeIdentifierPayload /
#                           # OruR01Payload (all defined in the frontend repo,
#                           # services/patients/buildPatientAdtPayload.ts and
#                           # services/reports/buildOruR01Payload.ts), the real
#                           # LIS-sync detail object (see the frontend's own
#                           # useLisIntegration.ts) for LIS_SYNC, or
#                           # OrderCreationEventPayload (services/interfaceEngine/
#                           # IInterfaceEngineService.ts) for ORDER_CREATED.
#   }
#
# Validation deliberately stays at the real envelope level (every field
# above present, transactionType a real known value, payload a real
# object) rather than deep-validating each of the four real payload
# shapes field-by-field — those shapes are already defined and enforced
# by TypeScript on the sending side; re-implementing that same validation
# here in Python would be a second, real place for the two to drift out
# of sync, for real fields this function has no real use for beyond
# storing them.
#
# Response: application/json.
#   Success: {"ok": true, "id": str}  — the real Firestore document id.
#     Batch 520: a REPORT_DELIVERY success also carries "delivery":
#     {"status": "SUBMITTED" | "DELIVERED", "detail": str, ...}.
#   Validation failure: {"ok": false, "error": str}, HTTP 422.
#   Batch 520, REPORT_DELIVERY only: not set up on this server, HTTP 503;
#     the gateway or folder refused or couldn't be reached, HTTP 502.
# ─────────────────────────────────────────────────────────────────────────────

# Batch 434: every InterfaceTransactionType the browser sends
# (src/services/interfaceDispatch/dispatchInterfaceMessage.ts). This list had
# stopped at ORDER_CREATED, so registry reports, cancer registry reports, print
# jobs and critical alerts were refused here with 422; WSI_SCAN_MANIFEST is new.
# interfaceTransactions.guard.test.ts (frontend) keeps the two lists, and
# docs/architecture/INTERFACE_TRANSACTIONS.md, in step.
# Batch 518 (PS-122): ACCESSION_EVENT, REFERRAL_MANIFEST and MOLECULAR_ORDER,
# the three outbound queues that store their message and are now sent from
# the frontend's Audit Log → Interfaces → Outbound view.
_VALID_TRANSACTION_TYPES = {
    'A08', 'A40', 'A47', 'ORU_R01', 'LIS_SYNC', 'ORDER_CREATED',
    'REGISTRY_REPORT', 'CANCER_REGISTRY_REPORT', 'PRINT_JOB', 'CRITICAL_ALERT',
    'WSI_SCAN_MANIFEST', 'ACCESSION_EVENT', 'REFERRAL_MANIFEST', 'MOLECULAR_ORDER',
    # Batch 669 (mol-7): a verified molecular plate's worklist for the instrument.
    'MOLECULAR_WORKLIST',
    # Batch 520 (PS-280): a signed report PDF to fax or drop as a file; this
    # receiver delivers it (report_delivery.py) and answers with the outcome.
    'REPORT_DELIVERY',
    # Batch 605: hardware orders, scan events and charges.
    'BLOCK_ORDER', 'SLIDE_ORDER', 'SPECIMEN_LABEL', 'MATERIAL_SCAN_EVENT',
    'CHARGE_DFT', 'CHARGE_JSON', 'FINANCIAL_CLASS',
}


def validate_wsi_scan_manifest(payload: dict) -> str | None:
    """Batch 434: a scanner can't act on a manifest without its batch and
    slides, so this one payload is checked beyond the envelope: batchId,
    batchBarcode, scannerInstrumentId, and at least one slide with
    slidePosition, caseId and specimenId."""
    for field in ('batchId', 'batchBarcode', 'scannerInstrumentId'):
        if not payload.get(field):
            return f'WSI_SCAN_MANIFEST payload is missing {field}'
    slides = payload.get('slides')
    if not isinstance(slides, list) or not slides:
        return 'WSI_SCAN_MANIFEST payload needs at least one slide'
    for i, slide in enumerate(slides):
        if not isinstance(slide, dict):
            return f'WSI_SCAN_MANIFEST slide {i} is not an object'
        for field in ('slidePosition', 'caseId', 'specimenId'):
            if not slide.get(field):
                return f'WSI_SCAN_MANIFEST slide {i} is missing {field}'
    return None


def validate_envelope(body: dict) -> str | None:
    """Real, per direct guidance: validates the real, generic envelope
    shape every real transaction type sends — see this file's own module
    header comment above for the full real contract and why validation
    deliberately stops here rather than reaching into payload's own
    real, per-type shape."""
    for field in ('queueEntryId', 'transactionType', 'dispatchedAt', 'payload'):
        if not body.get(field):
            return f'Missing required field: {field}'
    transaction_type = body['transactionType']
    if transaction_type not in _VALID_TRANSACTION_TYPES:
        return f'Unknown transactionType: {transaction_type!r}. Expected one of {sorted(_VALID_TRANSACTION_TYPES)}.'
    if not isinstance(body['payload'], dict):
        return 'payload must be a real JSON object, not a string/array/primitive.'
    if transaction_type == 'WSI_SCAN_MANIFEST':
        return validate_wsi_scan_manifest(body['payload'])
    if transaction_type == 'REPORT_DELIVERY':
        return report_delivery.validate_report_delivery(body['payload'])
    return None


def _json_response(body: dict, status: int) -> https_fn.Response:
    return https_fn.Response(json.dumps(body), status=status, headers={'Content-Type': 'application/json'})


@https_fn.on_request(
    cors=options.CorsOptions(
        # Same real, restricted origin list as render_report above — see
        # its own comment for the real reasoning.
        cors_origins=[
            "https://pathscribe-ai-ui.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        cors_methods=["POST"],
    ),
)
def receive_interface_message(req: https_fn.Request) -> https_fn.Response:
    if req.method != 'POST':
        return https_fn.Response('Method not allowed', status=405)

    body = req.get_json(silent=True)
    if not body:
        return https_fn.Response('Missing or invalid JSON body', status=400)

    validation_error = validate_envelope(body)
    if validation_error:
        return https_fn.Response(
            json.dumps({'ok': False, 'error': validation_error}),
            status=422,
            headers={'Content-Type': 'application/json'},
        )

    # Batch 520 (PS-280): a report delivery is carried out here, before it is
    # recorded, so the record says what happened. Not set up on this server:
    # 503; set up and it failed (gateway refused, folder unreachable): 502.
    # Either way PathScribe marks its queue entry FAILED with this reason.
    delivery = None
    if body['transactionType'] == 'REPORT_DELIVERY':
        try:
            delivery = report_delivery.deliver(body['payload'])
        except report_delivery.DeliveryNotConfigured as e:
            return _json_response({'ok': False, 'error': str(e)}, 503)
        except report_delivery.DeliveryFailed as e:
            return _json_response({'ok': False, 'error': str(e)}, 502)
        body = {**body, 'payload': report_delivery.stored_copy(body['payload']), 'delivery': delivery}

    try:
        db = firestore.client()
        doc_ref = db.collection('received_interface_messages').document()
        doc_ref.set({
            **body,
            # Real, server-assigned receipt timestamp — deliberately
            # separate from the real, client-supplied dispatchedAt above,
            # so a genuine clock-skew or network-delay gap between "PathScribe
            # sent this" and "the receiver actually got it" stays visible,
            # not silently collapsed into one real timestamp.
            'receivedAt': firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:  # noqa: BLE001 — return a clean 500, don't leak internals/stack traces
        return https_fn.Response(
            json.dumps({'ok': False, 'error': f'Storage failed: {e}'}),
            status=500,
            headers={'Content-Type': 'application/json'},
        )

    return _json_response({'ok': True, 'id': doc_ref.id, **({'delivery': delivery} if delivery else {})}, 200)
