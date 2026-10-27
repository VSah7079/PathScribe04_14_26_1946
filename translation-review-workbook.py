#!/usr/bin/env python3
"""Build PathScribe_<Language>_Review.xlsx (same layout as the Korean review file)
from the live locale files.  usage: python3 scripts/translation-review-workbook.py fr,nl,de,es [outdir] [baseline-locales-dir]
With a baseline directory (the locale files as they were when the previous workbooks were built) the workbook also
gets a first sheet "0 New and changed": only the texts that are new, or whose English or translation changed, since then."""
import json, re, sys, collections, math
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'src', 'i18n', 'locales') + '/'
GLOSSARY = os.path.join(HERE, 'translation-review-glossary.json')
BASELINE = (os.path.abspath(sys.argv[3]) + '/') if len(sys.argv) > 3 else None

LANGS = {
    'fr': dict(name='French', file='PathScribe_French_Review.xlsx',
               note="French as used in France (formal register, vous). Belgian French is a small separate variant file (only words Belgium says differently), so please review for France. Terminology decided so far: the medical record number is \"IPP\" (Identifiant Permanent du Patient) on patient-facing labels; \"Mme (Ms)\" is used where the title Ms. has no separate French word."),
    'nl': dict(name='Dutch', file='PathScribe_Dutch_Review.xlsx',
               note="Dutch as used in the Netherlands (formal register, u). Belgian Dutch is a small separate variant file (only words Belgium says differently), so please review for the Netherlands. Terminology decided so far: \"Patiëntnr.\" / \"Patiëntnummer (MRN)\" for the medical record number; \"Mevr. (Ms.)\" is used where the title Ms. has no separate Dutch word."),
    'de': dict(name='German', file='PathScribe_German_Review.xlsx',
               note="German as used in Germany (formal register, Sie). Terminology decided so far: \"Patientennr.\" / \"Patientennummer (MRN)\" for the medical record number; \"Frau (Ms.)\" is used where the title Ms. has no separate German word."),
    'ko': dict(name='Korean', file='PathScribe_Korean_Review.xlsx',
               note="Korean as used in South Korea (formal register, 합니다체). Korean clinical wording has had the least review, so please start with the Clinical sheet. Use the terms your hospital laboratory or pathology department uses; where the English is a loan word, say whether the transliteration or a native term is preferred."),
    'es': dict(name='Spanish', file='PathScribe_Spanish_Review.xlsx',
               note="Spanish as used in Spain (Castilian, formal register, usted, Iberian wording; please avoid Latin American usage). No terminology decisions have been recorded for Spanish yet, so the glossary matters most here: your preferred terms will set the standard."),
}

# namespaces (first key segment) used for patient work -> sheet "2 Clinical"
CLIN_PREFIX = ('autopsy', 'cytology', 'grossing', 'intraop', 'molecular', 'synoptic', 'surgical', 'patient',
               'report', 'worklist', 'wsi', 'label', 'margin', 'material', 'amend', 'amended', 'critical',
               'disposal', 'external', 'cassette', 'slide', 'block', 'microscopic', 'micro', 'peer', 'flag',
               'frozen', 'follow', 'inking', 'organMap', 'search', 'case', 'accession', 'add', 'create',
               'sign', 'use', 'tumor', 'print', 'preFin', 'preAnal', 'postSign', 'stainQc', 'fixative',
               'delegate', 'discordance', 'embedding', 'draftRecovery', 'finalize', 'heldReports',
               'relatedCases', 'secureMessaging', 'sendBlock', 'smartCapture', 'specimenEdit', 'revision',
               'requestReview', 'retentionHoldModal', 'rightSynoptic', 'markersPanel', 'narrativeEditor',
               'pathScribeEditor', 'pathologyWorkspace', 'newContainer', 'matrixBlock', 'reassignCase',
               'internalNotes', 'inlineComment', 'findingHighlight', 'deficiencyHistory', 'versionHistory',
               'clinicalMismatch', 'biopsyArray', 'workupParts', 'qaReviewCapture', 'fullReport',
               'aiNarrative', 'aiReview', 'coldChain', 'batchDetail', 'batchManagement', 'signatureEvidence',
               'signerConfirmation', 'slideDetail', 'screening')
CLIN_EXCLUDE = ('flagConfigPage', 'criticalAlertsAudit', 'caseRegistryReport', 'printDestination', 'caseMask', 'casePool', 'caseAccessControl', 'caseSearchBar', 'caseStatusDisplay', 'caseUnavailable',
                'cassetteColorsSection', 'cassetteRoutingRulesSection', 'labelDesignerPage', 'reportTemplatesSection',
                'reportPrintFallback', 'reportPrintPrompt', 'searchableCombobox', 'searchPage', 'signatureHistory',
                'signOutInkingGate', 'cytologyScreeningStrategySection', 'cytologyRegistrySettingsSection',
                'cytologyQcSettingsSection', 'cytologyRoutingSettingsSection', 'cytologyNomenclatureSettingsSection',
                'cytologyWorkloadCapSettingsSection', 'cytologyCategoriesSection', 'cytologyInstrumentationSection',
                'cytologyQcRules', 'molecularControlRulesPage', 'printQueueDashboard', 'printerProfilesSection',
                'printRoutingRulesSection', 'printSettingsSection', 'reportWatermark', 'surgicalReportPdf',
                'synopticChecks', 'useLisIntegration', 'useOrchestratorDraft', 'signOutInking')
CLIN_FORCE = ('searchPage', 'signOutInkingGate', 'surgicalReportPdf', 'synopticChecks', 'cytologyQcRules',
              'cytologyCategoriesSection', 'cytologyPdf', 'reportWatermark')


def is_clinical(top):
    if top in CLIN_FORCE:
        return True
    if top in CLIN_EXCLUDE:
        return False
    if top.endswith('Section') or top.endswith('Tab') and not top.startswith(('cytologyQa', 'aiDisc')):
        return False
    return top.startswith(CLIN_PREFIX)


def flat(d, p=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict):
            o.update(flat(v, p + k + '.'))
        else:
            o[p + k] = v
    return o


PH = re.compile(r'\{\{[^}]+\}\}|</?\d+>')

# ---------- styles ----------
ARIAL = 'Arial'
HDR_FILL = PatternFill('solid', fgColor='FF1F4E78')
INPUT_FILL = PatternFill('solid', fgColor='FFFFF2CC')
thin = Side(style='thin', color='FFD9D9D9')
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
HDR_FONT = Font(name=ARIAL, size=11, bold=True, color='FFFFFFFF')
BODY = Font(name=ARIAL, size=10)
WRAP_TOP = Alignment(wrap_text=True, vertical='top')
WRAP_CENTER = Alignment(wrap_text=True, vertical='center', horizontal='center')


def setc(ws, r, c, v):
    cell = ws.cell(r, c)
    cell.value = v
    if isinstance(v, str):
        cell.data_type = 's'   # text that starts with = or + must stay text
    return cell


def est_height(vals_widths):
    lines = 1
    for v, w in vals_widths:
        if v is None:
            continue
        s = str(v)
        n = sum(max(1, math.ceil(len(part) * 1.05 / max(w - 1, 1))) for part in s.split('\n'))
        lines = max(lines, n)
    return min(409.5, max(25.5, 12.75 * lines + 2))


def build(code, outdir):
    cfg = LANGS[code]
    LN = cfg['name']
    en = flat(json.load(open(ROOT + 'en.json')))
    tr = flat(json.load(open(ROOT + code + '.json')))

    # ----- group by English text -----
    groups = collections.OrderedDict()
    for k, v in en.items():
        if not isinstance(v, str) or not v.strip():
            continue
        groups.setdefault(v, []).append(k)

    rows = []
    for text, keys in groups.items():
        counts = collections.Counter(tr.get(k, '') for k in keys)
        versions = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        vlist = [v for v, _ in versions]
        cur = vlist[0] if len(vlist) == 1 else '\n'.join(f'{i+1}) {v}' for i, v in enumerate(vlist))
        tops = sorted({k.split('.')[0] for k in keys})
        area = ', '.join(tops[:4]) + (' …' if len(tops) > 4 else '')
        ph = ', '.join(sorted(set(PH.findall(text))))
        ks = '\n'.join(keys)
        if len(ks) > 30000:
            ks = ks[:30000] + f'\n… (+{len(keys)} keys in all)'
        clin = any(is_clinical(t) for t in tops)
        rows.append(dict(en=text, cur=cur, nver=len(vlist), uses=len(keys), area=area, ph=ph, keys=ks,
                         clin=clin, vlist=vlist, unt=sum(1 for v in vlist if v == text)))
    rows.sort(key=lambda r: (r['en'].lower(), r['en']))
    clin_rows = [r for r in rows if r['clin']]
    other_rows = [r for r in rows if not r['clin']]
    places = sum(r['uses'] for r in rows)
    multi = sum(1 for r in rows if r['nver'] > 1)
    # ----- new and changed since the baseline (optional) -----
    delta_rows, removed = [], 0
    if BASELINE:
        b_en = flat(json.load(open(BASELINE + 'en.json')))
        b_tr = flat(json.load(open(BASELINE + code + '.json')))
        changed = {k for k, v in en.items() if isinstance(v, str) and v.strip() and (k not in b_en or b_en[k] != v or b_tr.get(k) != tr.get(k))}
        removed = sum(1 for k in b_en if k not in en)
        for r_ in rows:
            ks_ = [k for k in r_['keys'].split('\n') if k in changed]
            if ks_:
                delta_rows.append(dict(r_, keys='\n'.join(ks_), uses=len(ks_)))

    # ----- glossary -----
    terms = [tuple(t) for t in json.load(open(GLOSSARY, encoding='utf-8'))['terms']]

    by_lower = collections.defaultdict(list)  # english text lower -> keys
    for text, keys in groups.items():
        by_lower[text.strip().rstrip(':').strip().lower()].append((text, keys))
    glossary = []
    for term, meaning in terms:
        tl = term.lower()
        counts = collections.Counter()
        for text, keys in by_lower.get(tl, []):
            for k in keys:
                counts[tr.get(k, '')] += 1
        merged = collections.OrderedDict()
        for v, n_ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
            v = v.strip().rstrip(':').strip()
            if not v:
                continue
            key_ = v.lower()
            if key_ in merged:
                continue
            merged[key_] = v
        vers = list(merged.values())
        standalone = vers[0] if vers else '(no stand-alone entry)'
        others = '\n'.join(vers[1:]) if len(vers) > 1 else None
        pat = re.compile(r'(?<![A-Za-z])' + re.escape(term) + r's?(?![A-Za-z])', re.I)
        n = sum(1 for text in groups if pat.search(text))
        if n == 0 and not vers:
            continue
        glossary.append((term, meaning, standalone, others, n))

    # ----- workbook -----
    wb = openpyxl.Workbook()
    ins = wb.active
    ins.title = 'Instructions'
    ins.column_dimensions['A'].width = 32
    ins.column_dimensions['B'].width = 100

    def put(r, a, b=None, bold_a=True, h=None, fill_b=None, nf=None):
        ca = ins.cell(r, 1, a)
        ca.font = Font(name=ARIAL, size=10, bold=bold_a)
        ca.alignment = WRAP_TOP
        if b is not None:
            cb = ins.cell(r, 2, b)
            cb.font = Font(name=ARIAL, size=10)
            cb.alignment = WRAP_TOP
            if fill_b:
                cb.fill = fill_b
            if nf:
                cb.number_format = nf
        if h:
            ins.row_dimensions[r].height = h

    ins.cell(1, 1, f'PathScribe: {LN} translation review').font = Font(name=ARIAL, size=14, bold=True)
    ins.row_dimensions[1].height = 36
    nc, nm = len(clin_rows), len(other_rows)
    texts = [
        ('What this is', f'The {LN} text of the PathScribe user interface, machine-translated, for review by a native speaker with laboratory or pathology knowledge. Each distinct English text appears once: {len(rows):,} texts in all, covering {places:,} places in the software. A correction is applied everywhere the text is used. This file was built from the current text of the software, so it replaces any earlier review file.'),
        ('Order of work', f'1. "1 Glossary" ({len(glossary)} key terms). Please do this first: the preferred {LN} terms will then be applied consistently across all texts.\n2. "2 Clinical" ({nc:,} texts): screens used for patient work (sign-out, reports, specimens, blocks and slides, cytology, autopsy, frozen sections, molecular, label printing, search).\n3. "3 Other" ({nm:,} texts): administration and settings screens. Lower priority.'),
        ('What to fill in', 'Only the yellow columns: "Correct?" (Yes or No), the correction, and optional notes. Please leave the other columns unchanged.'),
        ('If it is not correct', f'Choose No and type the full corrected {LN} text (the whole text, not only the changed words). A No without a correction turns red.'),
        (f'Several {LN} versions', f'{multi:,} English texts were translated in more than one way (shaded purple in "{LN} versions", listed 1), 2)…). Choose No and write the one {LN} text that should be used everywhere, even if one of the listed versions is right. If the word really means different things on different screens (the Keys column shows where each is used), write each version with the screen it belongs to, e.g. "priority: … / severity: …".'),
        ('Placeholders', 'Text in double braces, such as {{printer}} or {{count}}, is filled in by the software. Keep every placeholder exactly as written (same spelling, same braces, not translated); you may move it within the sentence. Tags such as <1>…</1> must also stay.'),
        ('Expected oddities', 'Texts ending in _one and _other (in the Keys column) are singular and plural forms; they may need different wording' + (' (singular and plural).' if code != 'es' else ' (singular and plural). Spanish also has a "_many" form for large numbers; it is the same as the plural and is not listed here.') + ' Texts ending in Prefix and Suffix are two halves of one sentence; one half may be empty.'),
        ('Glossary columns', f'"{LN} now used" is the {LN} for that term where it appears on its own (for example as a column heading). "(no stand-alone entry)" means the term only appears inside longer sentences; please write the preferred {LN} term anyway. "Texts using the term" counts how many texts contain it.'),
        *([('New and changed', f'Start with the sheet "0 New and changed": {len(delta_rows):,} texts that are new or were reworded since the previous workbook ({removed:,} texts were removed). They are also in the Clinical and Other sheets, so you only need to review each once.')] if BASELINE else []),
        ('Language notes', cfg['note']),
        ('Names and codes stay as they are', 'Product names, scanner and AI vendor names, standard codes (ICD-10, SNOMED CT, CPT, HL7, FHIR) and short units are not translated. If one of them has been translated by mistake, mark it No and restore it.'),
    ]
    r = 3
    for a, b in texts:
        put(r, a, b, h=est_height([(b, 100)]))
        r += 1
    r += 1  # blank
    put(r, 'Example of a filled-in row', None); r += 1
    ex = {
        'fr': ('Sending label to the printer…', "Envoi de l'étiquette à l'imprimante…", "Envoi de l'étiquette vers l'imprimante…"),
        'nl': ('Sending label to the printer…', 'Label naar de printer verzenden…', 'Label wordt naar de printer gestuurd…'),
        'de': ('Sending label to the printer…', 'Etikett wird an den Drucker gesendet…', 'Etikett wird an den Drucker gesendet…'),
        'es': ('Sending label to the printer…', 'Enviando etiqueta a la impresora…', 'Enviando la etiqueta a la impresora…'),
        'ko': ('Sending label to the printer…', '프린터로 라벨 전송 중…', '프린터로 라벨을 전송하는 중…'),
    }[code]
    put(r, 'English (expected meaning)', ex[0], bold_a=True); r += 1
    put(r, f'{LN} (current text)', ex[1], bold_a=True); r += 1
    put(r, 'Correct?', 'No', fill_b=INPUT_FILL); r += 1
    put(r, 'Correction (if not correct)', ex[2], fill_b=INPUT_FILL); r += 1
    put(r, 'Reviewer notes', '(Example only: shows the format. Not an actual finding.)', fill_b=INPUT_FILL); r += 1
    r += 1
    put(r, 'Progress', 'Glossary / Clinical / Other'); ins.cell(r, 1).font = Font(name=ARIAL, size=11, bold=True); r += 1

    # sheets
    def sheet_headers(ws, heads, widths):
        for i, h in enumerate(heads, 1):
            c = ws.cell(1, i, h)
            c.font = HDR_FONT
            c.fill = HDR_FILL
            c.alignment = WRAP_CENTER
            c.border = BORDER
            ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = widths[i - 1]
        ws.row_dimensions[1].height = 31.5
        ws.freeze_panes = 'C2'

    # glossary
    g = wb.create_sheet('1 Glossary')
    gh = ['#', 'English term', 'Meaning in PathScribe', f'{LN} now used (stand-alone)', f'Other {LN} versions found',
          'Texts using the term', 'Correct?', f'Preferred {LN} term (if not correct)', 'Reviewer notes']
    gw = [6, 28, 48, 26, 26, 12, 11, 30, 30]
    sheet_headers(g, gh, gw)
    for i, (term, meaning, st, others, n) in enumerate(glossary, 1):
        vals = [i, term, meaning, st, others, n, None, None, None]
        for c, v in enumerate(vals, 1):
            cell = setc(g, i + 1, c, v)
            cell.font = BODY
            cell.alignment = WRAP_TOP
            cell.border = BORDER
            if c >= 7:
                cell.fill = INPUT_FILL
        g.row_dimensions[i + 1].height = est_height(list(zip(vals, gw)))
    gl = len(glossary) + 1
    g.auto_filter.ref = f'A1:I{gl}'
    dv = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True, showErrorMessage=True,
                        errorTitle='Correct?', error='Choose Yes or No.')
    g.add_data_validation(dv); dv.add(f'G2:G{gl}')
    g.conditional_formatting.add(f'G2:G{gl}', FormulaRule(formula=['$G2="No"'], fill=PatternFill(bgColor='FFF8CBAD', fill_type='solid')))
    g.conditional_formatting.add(f'H2:H{gl}', FormulaRule(formula=['AND($G2="No",LEN($H2)=0)'], fill=PatternFill(bgColor='FFFF9999', fill_type='solid')))

    def text_sheet(title, data):
        ws = wb.create_sheet(title)
        heads = ['#', 'English (expected meaning)', f'{LN} (current text)', f'{LN} versions', 'Used in (places)',
                 'Screen area(s)', 'Placeholders to keep', 'Correct?', 'Correction (if not correct)',
                 'Reviewer notes', 'Keys (for PathScribe; do not edit)']
        w = [7, 50, 50, 10, 10, 26, 18, 11, 50, 28, 40]
        sheet_headers(ws, heads, w)
        for i, d in enumerate(data, 1):
            vals = [i, d['en'], d['cur'], d['nver'], d['uses'], d['area'], d['ph'] or None, None, None, None, d['keys']]
            for c, v in enumerate(vals, 1):
                cell = setc(ws, i + 1, c, v)
                cell.font = BODY
                cell.alignment = WRAP_TOP
                cell.border = BORDER
                if 8 <= c <= 10:
                    cell.fill = INPUT_FILL
            hv = [(vals[c], w[c]) for c in range(1, 7)]
            ws.row_dimensions[i + 1].height = est_height(hv)
        last = len(data) + 1
        ws.auto_filter.ref = f'A1:K{last}'
        dv = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True, showErrorMessage=True,
                            errorTitle='Correct?', error='Choose Yes or No.')
        ws.add_data_validation(dv); dv.add(f'H2:H{last}')
        ws.conditional_formatting.add(f'D2:D{last}', FormulaRule(formula=['$D2>1'], fill=PatternFill(bgColor='FFE4DFEC', fill_type='solid')))
        ws.conditional_formatting.add(f'H2:H{last}', FormulaRule(formula=['$H2="No"'], fill=PatternFill(bgColor='FFF8CBAD', fill_type='solid')))
        ws.conditional_formatting.add(f'I2:I{last}', FormulaRule(formula=['AND($H2="No",LEN($I2)=0)'], fill=PatternFill(bgColor='FFFF9999', fill_type='solid')))
        return last

    dl = None
    if BASELINE:
        dl = text_sheet('0 New and changed', delta_rows)
        wb.move_sheet('0 New and changed', offset=-(len(wb.sheetnames) - 2))
    cl = text_sheet('2 Clinical', clin_rows)
    ol = text_sheet('3 Other', other_rows)

    # progress block
    def prog(start, label, sheet, last, rc, cc):
        ins.cell(start, 1, label).font = Font(name=ARIAL, size=10, bold=True)
        items = [('Rows', f"=COUNTA('{sheet}'!B2:B{last})", '#,##0'),
                 ('Reviewed (Yes or No chosen)', f"=COUNTA('{sheet}'!{rc}2:{rc}{last})", '#,##0'),
                 ('Marked not correct', f"=COUNTIF('{sheet}'!{rc}2:{rc}{last},\"No\")", '#,##0'),
                 ('Not correct but no correction yet', f"=COUNTIFS('{sheet}'!{rc}2:{rc}{last},\"No\",'{sheet}'!{cc}2:{cc}{last},\"\")", '#,##0'),
                 ('Share reviewed', f'=IF(B{start+1}=0,0,B{start+2}/B{start+1})', '0.0%')]
        for j, (a, f, nf) in enumerate(items, 1):
            ins.cell(start + j, 1, a).font = Font(name=ARIAL, size=10)
            c = ins.cell(start + j, 2, f)
            c.font = Font(name=ARIAL, size=10); c.number_format = nf
            c.alignment = Alignment(horizontal='left')
        return start + 6
    p = r
    if dl:
        p = prog(p, '0 New and changed', '0 New and changed', dl, 'H', 'I')
    p = prog(p, '1 Glossary', '1 Glossary', gl, 'G', 'H')
    p = prog(p, '2 Clinical', '2 Clinical', cl, 'H', 'I')
    p = prog(p, '3 Other', '3 Other', ol, 'H', 'I')

    out = f'{outdir}/{cfg["file"]}'
    wb.save(out)
    stats = dict(code=code, rows=len(rows), places=places, clinical=nc, other=nm, multi=multi, glossary=len(glossary),
                 untranslated=sum(1 for x in rows if x['unt']), delta=len(delta_rows), removed=removed, file=out)
    return stats


if __name__ == '__main__':
    outdir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'review-workbooks')
    import os
    os.makedirs(outdir, exist_ok=True)
    for c in (sys.argv[1].split(',') if len(sys.argv) > 1 else LANGS):
        print(build(c, outdir))
