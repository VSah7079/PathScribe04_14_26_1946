# functions/main.py
# ─────────────────────────────────────────────────────────────────────────────
# Firebase Cloud Function (Python, firebase_functions SDK) — generates the
# real, structured PDF for a PathScribe Orchestration case report, replacing
# the old window.open() + win.print() approach in SynopticReportPage.tsx.
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
#   }
#
# Response: application/pdf bytes.
# ─────────────────────────────────────────────────────────────────────────────

import re
from io import BytesIO

from firebase_functions import https_fn, options
from firebase_functions.options import set_global_options
# Admin SDK is imported by the firebase init scaffold but deliberately not
# initialized here — this function doesn't touch Firestore/Auth/Storage,
# it's pure rendering. Skipping initialize_app() avoids unnecessary cold
# start overhead and credential setup this function doesn't need.
# from firebase_admin import initialize_app

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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

_styles = getSampleStyleSheet()
_styles.add(ParagraphStyle(name='RPLabel', fontSize=9, textColor=colors.HexColor('#475569'), alignment=TA_LEFT))
_styles.add(ParagraphStyle(name='RPValue', fontSize=11, leading=15, alignment=TA_LEFT))
_styles.add(ParagraphStyle(name='RPHeading', fontSize=12, fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=10))
_styles.add(ParagraphStyle(name='RPCaption', fontSize=8, textColor=colors.HexColor('#666666')))


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
            kwargs['fontName'] = 'Helvetica-Bold'
        if label_config.get('fontSize'):
            kwargs['fontSize'] = label_config['fontSize']
    return ParagraphStyle('dyn-label', parent=_styles['RPLabel'], **kwargs)


def field_row(label: str, value: str, label_config: dict | None, default_position: str):
    """Mirrors the <FieldRow> component in ReportPreviewRenderer.tsx."""
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
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return [t]


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
        return [Paragraph(label, _styles['RPHeading']), Paragraph('Not yet generated', _styles['RPCaption'])]

    flows = [Paragraph(label, _styles['RPHeading'])]
    text = section.get('text') or ''
    if text:
        # AI/editor output is HTML from textToHtml() — <p>/<b>/<i>/<u>/<br>,
        # which is within the safe subset ReportLab's Paragraph mini-markup
        # already supports directly.
        flows.append(Paragraph(text, _styles['RPValue']))
    else:
        msg = '⚠ Required — not yet completed' if node.get('required') else 'No content'
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
            return [Paragraph('No synoptic data recorded.', _styles['RPCaption'])]
        rows = [[a.get('fieldLabel', ''), a.get('displayValue', '')] for a in answers]
        t = Table(rows, colWidths=[70 * mm, None])
        t.setStyle(TableStyle([
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
            fontName='Helvetica-Bold' if node.get('bold') else 'Helvetica',
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


# ── Document assembly ────────────────────────────────────────────────────────

def build_report_pdf(payload: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=18 * mm, bottomMargin=22 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
        title=payload.get('caseHeader', {}).get('accession', 'PathScribe Report'),
    )

    flows = []
    inst = payload.get('institution') or {}
    header = payload.get('caseHeader') or {}

    if inst.get('name'):
        flows.append(Paragraph(inst['name'], _styles['RPHeading']))
    if inst.get('dept'):
        flows.append(Paragraph(inst['dept'], _styles['RPCaption']))
    if inst.get('address'):
        flows.append(Paragraph(inst['address'], _styles['RPCaption']))
    flows.append(Spacer(1, 8))

    if header.get('accession'):
        flows.append(Paragraph(header['accession'], _styles['RPHeading']))

    case_rows = [
        [k, v] for k, v in [
            ('Patient', header.get('patient')),
            ('MRN', header.get('mrn')),
            ('Date of Birth', header.get('dob')),
            ('Referring', header.get('referring')),
            ('Clinician', header.get('clinician')),
        ] if v
    ]
    if case_rows:
        t = Table(case_rows, colWidths=[35 * mm, None])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        flows.append(t)

    template_name = payload.get('templateName')
    if template_name:
        resolved_by = (payload.get('resolvedBy') or '').replace('-', ' ')
        suffix = f' (resolved by {resolved_by})' if resolved_by else ''
        flows.append(Spacer(1, 4))
        flows.append(Paragraph(f'Report Template: {template_name}{suffix}', _styles['RPCaption']))

    flows.append(Spacer(1, 12))

    scope = dict(payload.get('renderScope') or {})
    scope['__synopticAnswers__'] = payload.get('synopticAnswers') or []
    sections_by_id = {s['id']: s for s in (payload.get('sections') or [])}

    body_assembly = sorted(payload.get('bodyAssembly') or [], key=lambda p: p.get('order', 0))
    for part in body_assembly:
        for node in part.get('nodes', []):
            flows += render_node(node, scope, sections_by_id)
        flows.append(Spacer(1, 10))

    flows.append(Spacer(1, 16))
    flows.append(Paragraph('CONFIDENTIAL — PATHOLOGY REPORT', _styles['RPCaption']))

    doc.build(flows)
    return buf.getvalue()


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
