#!/usr/bin/env python3
"""Translation parity check for the Administrator Guide (Batch 647).

A translated chapter (docs/admin-guide/src/<lang>/NN-name.md) must keep everything the builder and the app
depend on exactly as it is in the English chapter; only the words change. This compares one translated file
(or one chunk) with its English original and lists every difference.

What must be identical: heading levels and {#ids}; the [FORMEDRIXAI INTERNAL ONLY] heading prefix; the
Breadcrumb / Setup step / Requires / Unlocks lines (Setup step line verbatim, Requires and Unlocks link targets
and whether they say "none"); every [SCREENSHOT PLACEHOLDER: id - ...] id; the link targets in each section;
the number and shape (rows x columns) of tables; the first header of the field and error-code tables (the
canonical words in strings.json); code spans (`...`) in each section; fenced blocks; padlock callouts; Status
lines; the glossary's term count; the front matter keys chapter and id.

Run: python3 scripts/admin-guide/parity.py <lang> [chapter-file ...]   (all chapters when none are named)
     python3 scripts/admin-guide/parity.py --pair <english-file> <translated-file> <lang>   (one chunk)
"""
import json, re, sys
from collections import Counter
from pathlib import Path

GUIDE = Path(__file__).resolve().parents[2] / 'docs' / 'admin-guide'
SRC = GUIDE / 'src'
STR = json.loads((Path(__file__).parent / 'strings.json').read_text())
HEAD = re.compile(r'^(#{1,6})\s+(.*?)\s*$')
IDRE = re.compile(r'\{#([^}]+)\}\s*$')
LINKT = re.compile(r'\]\(#([^)]+)\)')
CODE = re.compile(r'`([^`\n]+)`')
INTERNAL = '[FORMEDRIXAI INTERNAL ONLY]'


def strip_front(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    fm = {}
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(':')
            fm[k.strip()] = v.strip()
        text = text[m.end():]
    return fm, text


def sections(text):
    """[(key, level, internal, lines)] split at headings; fenced code is not scanned for headings."""
    out, cur, fence = [], ('<start>', 0, False, []), False
    for line in text.split('\n'):
        if line.strip().startswith('```'):
            fence = not fence
        h = None if fence else HEAD.match(line)
        if h:
            out.append(cur)
            title = h.group(2)
            mid = IDRE.search(title)
            cur = (mid.group(1) if mid else f'<no-id:{len(out)}>', len(h.group(1)), title.startswith(INTERNAL), [line])
        else:
            cur[3].append(line)
    out.append(cur)
    return out


def tables(lines):
    shapes, i = [], 0
    while i < len(lines):
        if lines[i].lstrip().startswith('|'):
            j = i
            while j < len(lines) and lines[j].lstrip().startswith('|'):
                j += 1
            blk = lines[i:j]
            cols = len(split_row(blk[0]))
            shapes.append((len(blk), cols, split_row(blk[0])[0].strip() if blk else ''))
            i = j
        else:
            i += 1
    return shapes


def split_row(row):
    r = row.strip()
    r = r[1:] if r.startswith('|') else r
    r = r[:-1] if r.endswith('|') and not r.endswith('\\|') else r
    return re.split(r'(?<!\\)\|', r)


def machine(lines, words=()):
    out = {'crumb': 0, 'setup': [], 'req': [], 'unl': [], 'shot': [], 'status': 0, 'lock': 0}
    for ln in lines:
        if ln.startswith('Breadcrumb:'):
            out['crumb'] += 1
        elif ln.startswith('Setup step:'):
            out['setup'].append(ln.strip())
        elif ln.startswith('Requires:'):
            out['req'].append(tuple(LINKT.findall(ln)))
        elif ln.startswith('Unlocks:'):
            out['unl'].append(tuple(LINKT.findall(ln)))
        elif ln.startswith('[SCREENSHOT PLACEHOLDER:'):
            m = re.match(r'^\[SCREENSHOT PLACEHOLDER:\s*(\S+)\s*-\s*.+\]\s*$', ln)
            out['shot'].append(m.group(1) if m else f'MALFORMED<{ln[:40]}>')
        sm = re.match(r'^\*\*[^*]+\*\*\s*(.*)$', ln)
        if sm and sm.group(1).lower().startswith(words):
            out['status'] += 1
        if ln.startswith('> \U0001F512'):
            out['lock'] += 1
    return out


def compare(en_text, tr_text, lang, label=''):
    errs = []
    efm, en_body = strip_front(en_text)
    tfm, tr_body = strip_front(tr_text)
    for k in ('chapter', 'id'):
        if efm.get(k) != tfm.get(k):
            errs.append(f'{label}front matter {k}: English "{efm.get(k)}", translation "{tfm.get(k)}"')
    if efm and not tfm.get('title'):
        errs.append(f'{label}front matter has no title')
    E, T = sections(en_body), sections(tr_body)
    ek = [(s[0], s[1], s[2]) for s in E]
    tk = [(s[0], s[1], s[2]) for s in T]
    if ek != tk:
        eset, tset = [k[0] for k in ek], [k[0] for k in tk]
        for i, (a, b) in enumerate(zip(ek, tk)):
            if a != b:
                errs.append(f'{label}heading {i + 1}: English {a[0]} (level {a[1]}{", internal" if a[2] else ""}), translation {b[0]} (level {b[1]}{", internal" if b[2] else ""}); fix headings first, later checks are skipped')
                break
        else:
            errs.append(f'{label}the translation has {len(tk)} headings, the English {len(ek)} ({[x for x in eset if x not in tset][:3] or [x for x in tset if x not in eset][:3]}); later checks are skipped')
        return errs
    st = STR[lang]
    SW = {l: tuple(STR[l][k].lower() for k in ('statusBuilt', 'statusDemonstration', 'statusPartial', 'statusPlanned', 'statusNotBuilt')) for l in STR}
    for (key, _l, _i, el), (_k, _l2, _i2, tl) in zip(E, T):
        where = f'{label}section {key}: '
        em, tm = machine(el, SW['en']), machine(tl, SW[lang])
        if em['crumb'] != tm['crumb']:
            errs.append(where + f'Breadcrumb lines {em["crumb"]} vs {tm["crumb"]}')
        if em['setup'] != tm['setup']:
            errs.append(where + f'the "Setup step:" line must stay exactly as in English: {em["setup"]} vs {tm["setup"]}')
        for fld, nm in (('req', 'Requires'), ('unl', 'Unlocks')):
            if em[fld] != tm[fld]:
                errs.append(where + f'{nm}: link targets must match: {em[fld]} vs {tm[fld]}')
        if em['shot'] != tm['shot']:
            errs.append(where + f'screenshot placeholder ids differ: {em["shot"]} vs {tm["shot"]} (keep the literal "[SCREENSHOT PLACEHOLDER: id - description]")')
        if em['lock'] != tm['lock']:
            errs.append(where + f'padlock callouts {em["lock"]} vs {tm["lock"]}')
        if Counter(LINKT.findall('\n'.join(el))) != Counter(LINKT.findall('\n'.join(tl))):
            d = Counter(LINKT.findall('\n'.join(el))) - Counter(LINKT.findall('\n'.join(tl)))
            d2 = Counter(LINKT.findall('\n'.join(tl))) - Counter(LINKT.findall('\n'.join(el)))
            errs.append(where + f'link targets differ: missing {dict(d)}, extra {dict(d2)}')
        et, tt = tables(el), tables(tl)
        if [(a, b) for a, b, _ in et] != [(a, b) for a, b, _ in tt]:
            errs.append(where + f'table shapes (rows, columns) differ: {[(a, b) for a, b, _ in et]} vs {[(a, b) for a, b, _ in tt]}')
        else:
            for (ra, ca, ha), (rb, cb, hb) in zip(et, tt):
                for en_word, k in (('Field Name', 'fieldName'), ('Error Code', 'errorCode')):
                    if ha == en_word and hb != st[k]:
                        errs.append(where + f'first table header must be "{st[k]}" (got "{hb}")')
        if Counter(CODE.findall('\n'.join(el))) != Counter(CODE.findall('\n'.join(tl))):
            d = Counter(CODE.findall('\n'.join(el))) - Counter(CODE.findall('\n'.join(tl)))
            d2 = Counter(CODE.findall('\n'.join(tl))) - Counter(CODE.findall('\n'.join(el)))
            errs.append(where + f'code spans (`...`) must stay verbatim: missing {dict(d)}, extra {dict(d2)}')
        if sum(1 for x in el if x.strip().startswith('```')) != sum(1 for x in tl if x.strip().startswith('```')):
            errs.append(where + 'fenced code block count differs')
        # a translated table row for Field Name tables keeps the number of cells per row
        for blk_e, blk_t in zip(split_blocks(el), split_blocks(tl)):
            if [len(split_row(r)) for r in blk_e] != [len(split_row(r)) for r in blk_t]:
                errs.append(where + 'a table row has a different number of cells (an unescaped | inside a cell?)')
                break
    if efm.get('id') != 'ch99':
        return errs
    glossary_e = [l for l in en_body.split('\n') if re.match(r'^- \*\*', l)]
    glossary_t = [l for l in tr_body.split('\n') if re.match(r'^- \*\*', l)]
    if len(glossary_e) != len(glossary_t):
        errs.append(f'{label}glossary entries {len(glossary_e)} vs {len(glossary_t)}')
    for l in glossary_t:
        if not re.match(r'^- \*\*.+?\*\*\s*[:：]\s*\S', l):
            errs.append(f'{label}glossary line must read "- **TERM**: definition.": {l[:60]}')
    return errs


def split_blocks(lines):
    blocks, i = [], 0
    while i < len(lines):
        if lines[i].lstrip().startswith('|'):
            j = i
            while j < len(lines) and lines[j].lstrip().startswith('|'):
                j += 1
            blocks.append(lines[i:j])
            i = j
        else:
            i += 1
    return blocks


def main(argv):
    if argv and argv[0] == '--pair':
        en, tr, lang = argv[1:4]
        errs = compare(Path(en).read_text(), Path(tr).read_text(), lang)
        print('\n'.join(errs) or 'OK')
        return 1 if errs else 0
    lang = argv[0]
    names = argv[1:] or [p.name for p in sorted(SRC.glob('[0-9][0-9]-*.md'))]
    bad = 0
    for n in names:
        p = SRC / lang / n
        if not p.exists():
            print(f'{lang}/{n}: MISSING')
            bad += 1
            continue
        errs = compare((SRC / n).read_text(), p.read_text(), lang, f'{lang}/{n}: ')
        for e in errs:
            print(e)
        bad += len(errs)
    print(f'{lang}: {bad} problems')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
