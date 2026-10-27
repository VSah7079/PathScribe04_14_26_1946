#!/usr/bin/env python3
"""Administrator Guide builder (Batch 646).

Reads docs/admin-guide/src/*.md (see docs/admin-guide/AUTHORING.md) and writes two editions:
  docs/admin-guide/html/customer/   (ForMedrixAI-internal sections removed; this is what the app's Help button opens)
  docs/admin-guide/html/internal/   (everything)
Each edition: index.html (contents + search), one page per chapter, setup-sequence.html (the master
setup-order checklist, built from every screen's Setup step / Requires / Unlocks lines), all.html (one page for
print-to-PDF), go.html (opens the section for an id: the target of the in-app Help buttons), anchors.js,
search-index.js, guide.css, guide.js and img/.
Checks (a failure exits 1): duplicate ids, links to ids that do not exist, a Requires that is not earlier in the
setup order, a screen with no Setup step, a Requires or Unlocks naming something that is not a screen.
Languages (Batch 647): English is the source (docs/admin-guide/src/NN-*.md). A translation lives in
docs/admin-guide/src/<lang>/ (fr, de, nl, ko, es) with the same file names; it must pass parity.py (same ids, links, tables,
setup lines). English builds at the edition root; each other language builds in <edition>/<lang>/ and shares the root img/ folder.
Row ids (f-..., e-..., g-...) are taken from the English by position so a link works in every language.
Run: python3 scripts/admin-guide/build.py [--no-convert] [--publish] [--langs=en,fr]
--publish copies the customer edition to public/help/admin-guide/ (what the app's Help button opens).
"""
import html, json, re, shutil, sys
from pathlib import Path
import markdown
sys.path.insert(0, str(Path(__file__).resolve().parent))
import parity

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / 'docs' / 'admin-guide'
SRC, IMG, OUT = GUIDE / 'src', GUIDE / 'img', GUIDE / 'html'
INTERNAL_PREFIX = '[FORMEDRIXAI INTERNAL ONLY]'
errors, warnings = [], []
LANGS = ['en', 'fr', 'de', 'nl', 'ko', 'es']
STR = json.loads((Path(__file__).parent / 'strings.json').read_text())
NONE_WORDS = tuple(w.lower() for l in LANGS for w in STR[l]['noneWords'])
REF = {}   # (edition, chapter file) -> English row ids in order {'f': [...], 'e': [...]}


def S(lang, key):
    return STR[lang].get(key) or STR['en'][key]


def src_dir(lang):
    return SRC if lang == 'en' else SRC / lang


def lang_ready(lang):
    """A language is built (and offered in the switcher) only when every chapter file has been translated."""
    return lang == 'en' or all((SRC / lang / f.name).exists() for f in SRC.glob('[0-9][0-9]-*.md'))


def is_none(v):
    return v.strip().lower().startswith(NONE_WORDS)


def slug(s):
    s = re.sub(r'<[^>]+>', '', s).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'x'


def convert_images():
    from PIL import Image
    for p in sorted(IMG.glob('*.png')):
        Image.open(p).save(IMG / (p.stem + '.webp'), 'WEBP', quality=82, method=6)
        p.unlink()


def parse_front(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    fm = {}
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(':')
            fm[k.strip()] = v.strip()
        text = text[m.end():]
    return fm, text


def drop_internal(text):
    """Removes every section whose heading starts with the internal prefix (to the next heading of the same or higher level)."""
    out, skip = [], None
    removed = []
    for line in text.split('\n'):
        h = re.match(r'^(#{1,6})\s+(.*)$', line)
        if h:
            level = len(h.group(1))
            if skip is not None and level <= skip:
                skip = None
            if skip is None and h.group(2).startswith(INTERNAL_PREFIX):
                skip = level
                mid = re.search(r'\{#([^}]+)\}', h.group(2))
                if mid:
                    removed.append(mid.group(1))
        if skip is None:
            out.append(line)
    return '\n'.join(out), removed


def glossary_entries(path):
    out = []
    if path.exists():
        for m in re.finditer(r'^- \*\*(.+?)\*\*\s*[:：—-]\s*(.+)$', path.read_text(), re.M):
            out.append((m.group(1).strip(), m.group(2).strip()))
    return out


def load_glossary(lang):
    """term -> (definition, id). The id comes from the English term at the same position, so links match in every language."""
    en = glossary_entries(SRC / '99-glossary.md')
    tr = en if lang == 'en' else glossary_entries(SRC / lang / '99-glossary.md')
    if lang != 'en' and len(en) != len(tr):
        errors.append(f'{lang}: glossary has {len(tr)} terms, the English {len(en)}')
        return {}, [slug(t) for t, _ in en]
    gids = [slug(t) for t, _ in en]
    return {t: (d, gids[i]) for i, (t, d) in enumerate(tr)}, gids


LINK = re.compile(r'\[([^\]]+)\]\(#([^)]+)\)')


def preprocess(text, chapter_file):
    """Custom lines -> HTML blocks. Returns text and the per-screen setup records (by line order)."""
    lines = text.split('\n')
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('Breadcrumb:'):
            parts = [x.strip() for x in line[len('Breadcrumb:'):].split('>')]
            crumbs = ' <span aria-hidden="true">›</span> '.join(f'<span>{html.escape(x)}</span>' for x in parts)
            out += ['', f'<nav class="crumb" aria-label="Breadcrumb" data-crumb="{html.escape(" > ".join(parts))}">{crumbs}</nav>', '']
        elif line.startswith('Setup step:'):
            block = {}
            while i < len(lines) and re.match(r'^(Setup step|Requires|Unlocks):', lines[i]):
                k, _, v = lines[i].partition(':')
                block[k.strip()] = v.strip()
                i += 1
            i -= 1
            out += ['', f'<!--SETUP {json.dumps(block)} -->', '']
        elif m := re.match(r'^\[SCREENSHOT PLACEHOLDER:\s*([^\s]+)\s*-\s*(.+)\]\s*$', line):
            out += ['', f'<!--SHOT {m.group(1)}|{m.group(2)} -->', '']
        else:
            out.append(line)
        i += 1
    return '\n'.join(out)


def step_text(block, lang):
    raw = block.get('Setup step', '')
    m = re.match(r'Tier\s+(\d+),\s*step\s+(\d+)', raw)
    if m:
        return S(lang, 'tierStep').format(t=m.group(1), s=m.group(2))
    return S(lang, 'reference') if raw.startswith('Reference') else raw


def render_setup(block, screen_id, lang='en'):
    def links(v):
        if not v or is_none(v):
            return f'<span class="none">{html.escape(v or S(lang, "noneStart"))}</span>'
        return ', '.join(f'<a href="#{m.group(2)}">{html.escape(m.group(1))}</a>' for m in LINK.finditer(v)) or html.escape(v)
    step = html.escape(step_text(block, lang))
    return (f'<aside class="setup" aria-label="{html.escape(S(lang, "setupSequence"))}"><p class="setup-step"><b>{html.escape(S(lang, "setupSequence"))}</b> · {step}</p>'
            f'<dl><dt>{html.escape(S(lang, "configureFirst"))}</dt><dd>{links(block.get("Requires", ""))}</dd>'
            f'<dt>{html.escape(S(lang, "thisUnlocks"))}</dt><dd>{links(block.get("Unlocks", ""))}</dd></dl></aside>')


def md_to_html(text, edition, glossary):
    md = markdown.Markdown(extensions=['tables', 'attr_list', 'fenced_code', 'sane_lists'])
    h = md.convert(text)
    # internal callout
    h = re.sub(r'<blockquote>(\s*<p>(?:\U0001F512|&#128274;))', r'<blockquote class="internal">\1', h)
    return h


def process_chapter(fm, text, edition, glossary, caps, lang='en', fname='', gids=None, imgp=''):
    removed = []
    gen, finish = make_idgen(edition, fname, lang)
    if edition == 'customer':
        text, removed = drop_internal(text)
    text = preprocess(text, fm.get('id', ''))
    h = md_to_html(text, edition, glossary)
    sections = []        # (id, level, title)
    screens = {}         # screen id -> setup block
    current = {'screen': None}
    out = []
    pos = 0
    token = re.compile(r'<h([1-4]) id="([^"]+)">(.*?)</h\1>|<!--SETUP (.*?) -->|<!--SHOT (.*?) -->|<table>.*?</table>', re.S)
    for m in token.finditer(h):
        out.append(h[pos:m.start()])
        pos = m.end()
        if m.group(1):
            lvl, hid, title = int(m.group(1)), m.group(2), m.group(3)
            sections.append((hid, lvl, re.sub(r'<[^>]+>', '', title)))
            if hid.startswith('screen-'):
                current['screen'] = hid
            elif lvl <= 2:
                current['screen'] = None
            out.append(f'<h{lvl} id="{hid}"><a class="anchor" href="#{hid}" aria-label="Link to this section">#</a> {title}</h{lvl}>')
        elif m.group(4):
            block = json.loads(m.group(4))
            sid = current['screen']
            if sid:
                screens[sid] = block
            out.append(render_setup(block, sid, lang))
        elif m.group(5):
            cid, desc = m.group(5).split('|', 1)
            f = IMG / f'{cid}.webp'
            if f.exists():
                out.append(f'<figure class="shot"><img src="{imgp}img/{cid}.webp" alt="{html.escape(desc)}" loading="lazy"><figcaption>{html.escape(desc)}</figcaption></figure>')
            else:
                out.append(f'<figure class="shot missing"><div class="ph">{html.escape(S(lang, "shotPlaceholder"))}: {html.escape(cid)} - {html.escape(desc)}</div></figure>')
                if lang == 'en':
                    caps['missing'].append((cid, desc))
            caps['used'].add(cid)
        else:
            t = m.group(0)
            sid = current['screen'] or 'general'
            if re.search(r'<th>\s*' + re.escape(html.escape(S(lang, 'fieldName'), quote=False)) + r'\s*</th>', t):
                def addid(rm):
                    cell = rm.group(2)
                    return f'<tr id="{gen("f", "f-" + sid.replace("screen-", "") + "-" + slug(cell))}"><td>{cell}</td>'
                t = re.sub(r'(<tr>\s*)<td>(.*?)</td>', lambda rm: addid(rm), t, flags=re.S)
            elif re.search(r'<th>\s*' + re.escape(html.escape(S(lang, 'errorCode'), quote=False)) + r'\s*</th>', t):
                t = re.sub(r'(<tr>\s*)<td>(.*?)</td>', lambda rm: f'<tr id="{gen("e", "e-" + slug(rm.group(2)))}"><td>{rm.group(2)}</td>', t, flags=re.S)
            out.append(t)
    out.append(h[pos:])
    body = ''.join(out)
    # glossary: link the first use of each term in a screen/part, in paragraphs and table cells only
    if fm.get('id') == 'ch99':
        counter = iter(gids or [])
        body = re.sub(r'<li><strong>(.+?)</strong>', lambda m: f'<li id="g-{next(counter, slug(m.group(1)))}"><strong>{m.group(1)}</strong>', body)
    elif glossary:
        body = link_glossary(body, glossary, lang)
    finish()
    return body, sections, screens, removed


def make_idgen(edition, fname, lang):
    """Row ids: computed from the English text for English; for a translation the English ids at the same position."""
    key = (edition, fname)
    if lang == 'en':
        REF[key] = {'f': [], 'e': []}
    ref = REF.get(key)
    used = {'f': 0, 'e': 0}

    def gen(kind, computed):
        if lang == 'en':
            ref[kind].append(computed)
            return computed
        i = used[kind]
        used[kind] += 1
        if ref is None or i >= len(ref[kind]):
            return f'{computed}-{i}'
        return ref[kind][i]

    def finish():
        if lang != 'en' and ref:
            for k in ('f', 'e'):
                if used[k] != len(ref[k]):
                    errors.append(f'{edition}/{lang}: {fname}: {used[k]} {k}-table rows, the English has {len(ref[k])}')
    return gen, finish


def link_glossary(body, glossary, lang='en'):
    parts = re.split(r'(<h[1-4][ >].*?</h[1-4]>)', body, flags=re.S)
    terms = sorted(glossary, key=len, reverse=True)
    for idx, part in enumerate(parts):
        if part.startswith('<h') or not part.strip():
            continue
        seen = set()
        edge = r'[A-Za-z0-9_-]' if lang == 'ko' else r'[\w-]'
        pat = re.compile(r'(?<!' + edge + r')(' + '|'.join(re.escape(t) for t in terms) + r')(?!' + edge + r')')
        def sub_text(seg):
            def one(m):
                term = m.group(1)
                if term in seen:
                    return term
                seen.add(term)
                return f'<a class="term" href="#g-{glossary[term][1]}" title="{html.escape(glossary[term][0])}">{term}</a>'
            return pat.sub(one, seg)
        pieces = re.split(r'(<a .*?</a>|<code>.*?</code>|<[^>]+>)', part, flags=re.S)
        for j, pc in enumerate(pieces):
            if j % 2 == 0 and pc.strip():
                pieces[j] = sub_text(pc)
        parts[idx] = ''.join(pieces)
    return ''.join(parts)


def order_key(block):
    m = re.match(r'Tier\s+(\d+),\s*step\s+(\d+)', block.get('Setup step', ''))
    return (int(m.group(1)), int(m.group(2))) if m else None


def build_edition(edition, lang='en'):
    glossary, gids = load_glossary(lang)
    root = OUT / edition
    if lang == 'en':
        out = root
        if out.exists():
            shutil.rmtree(out)
        (out / 'img').mkdir(parents=True)
        for p in IMG.glob('*.webp'):
            shutil.copy(p, out / 'img' / p.name)
        imgp = ''
    else:
        out = root / lang
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        imgp = '../'
    tag = edition if lang == 'en' else f'{edition}/{lang}'
    chapters, all_sections, all_screens, all_removed = [], {}, {}, []
    caps = {'missing': [], 'used': set()}
    for f in sorted(SRC.glob('[0-9][0-9]-*.md')):
        tf = src_dir(lang) / f.name
        if not tf.exists():
            errors.append(f'{tag}: missing translation file {tf.relative_to(ROOT)}')
            continue
        if lang != 'en':
            for e in parity.compare(f.read_text(), tf.read_text(), lang, f'{lang}/{f.name}: '):
                errors.append(f'{tag}: {e}')
        fm, text = parse_front(tf.read_text())
        body, sections, screens, removed = process_chapter(fm, text, edition, glossary, caps, lang, f.name, gids, imgp)
        chapters.append({'file': f.name, 'fm': fm, 'body': body, 'sections': sections, 'page': f'{f.stem}.html'})
        for hid, lvl, title in sections:
            if hid in all_sections:
                errors.append(f'{edition}: duplicate id {hid} ({f.name})')
            all_sections[hid] = {'page': f'{f.stem}.html', 'level': lvl, 'title': title, 'chapter': fm.get('title', '')}
        for sid, blk in screens.items():
            all_screens[sid] = {**blk, 'page': f'{f.stem}.html', 'title': all_sections[sid]['title']}
        all_removed += removed
    # glossary ids and error-code ids are targets too
    for ch in chapters:
        for m in re.finditer(r'id="((?:f|e|g)-[^"]+)"', ch['body']):
            all_sections.setdefault(m.group(1), {'page': ch['page'], 'level': 5, 'title': m.group(1), 'chapter': ch['fm'].get('title', '')})
    # checks
    for sid, blk in all_screens.items():
        key = order_key(blk)
        if key is None and blk.get('Setup step', '').startswith('Reference'):
            continue
        if key is None:
            errors.append(f'{edition}: {sid} has no valid "Setup step: Tier N, step M" line')
            continue
        for fld in ('Requires', 'Unlocks'):
            v = blk.get(fld, '')
            if not v:
                errors.append(f'{edition}: {sid} has no {fld} line')
            elif not is_none(v):
                for m in LINK.finditer(v):
                    tid = m.group(2)
                    if tid not in all_screens:
                        if edition == 'customer' and tid in all_removed:
                            continue
                        errors.append(f'{edition}: {sid} {fld} names {tid}, which is not a screen in this guide')
                    elif fld == 'Requires':
                        k2 = order_key(all_screens[tid])
                        if k2 and k2 >= key:
                            errors.append(f'{edition}: {sid} (step {key}) Requires {tid} (step {k2}), which is not earlier in the setup order')
    # link resolution and checks per page
    def fix_links(body, page):
        def rep(m):
            tid = m.group(1)
            if tid in all_sections:
                tgt = all_sections[tid]['page']
                return f'href="{"" if tgt == page else tgt}#{tid}"'
            if edition == 'customer' and tid in all_removed:
                return 'href="#" data-removed="1"'
            errors.append(f'{edition}: {page} links to #{tid}, which does not exist')
            return m.group(0)
        return re.sub(r'href="#([^"]+)"', rep, body)
    glossary_html = ''
    for ch in chapters:
        ch['body'] = fix_links(ch['body'], ch['page'])
    # pages
    css = (Path(__file__).parent / 'guide.css').read_text()
    js = (Path(__file__).parent / 'guide.js').read_text()
    (out / 'guide.css').write_text(css)
    (out / 'guide.js').write_text(js)
    title = S(lang, 'guideTitle') if edition == 'customer' else S(lang, 'guideTitleInternal')
    nav_items = [('index.html', S(lang, 'contents')), ('setup-sequence.html', S(lang, 'setupOrder'))] + [(c['page'], f"{c['fm'].get('chapter', '')}. {c['fm'].get('title', c['file'])}") for c in chapters]

    def shell(page_title, body, current):
        nav = ''.join(f'<a href="{p}"{" aria-current=page" if p == current else ""}>{html.escape(t)}</a>' for p, t in nav_items)
        langs_opts = ''.join(f'<option value="{l}"{" selected" if l == lang else ""}>{html.escape(STR[l]["langName"])}</option>' for l in LANGS if lang_ready(l))
        root_rel = '' if lang == 'en' else '../'
        return f'''<!doctype html>
<html lang="{S(lang, 'htmlLang')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(page_title)} · {html.escape(title)}</title>
<meta name="robots" content="noindex"><link rel="stylesheet" href="guide.css"></head>
<body data-edition="{edition}" data-lang="{lang}" data-root="{root_rel}">
<header class="top"><a class="brand" href="index.html"><span class="mark" aria-hidden="true"></span>PathScribe <span>{html.escape(S(lang, 'brandSuffix'))}</span></a>
<form class="search" role="search" onsubmit="return false"><input id="q" type="search" placeholder="{html.escape(S(lang, 'searchPlaceholder'))}" aria-label="{html.escape(S(lang, 'searchLabel'))}" autocomplete="off"><ul id="results" hidden></ul></form>
<select id="lang" class="langsel" aria-label="{html.escape(S(lang, 'languageLabel'))}">{langs_opts}</select>
<button class="print" type="button" onclick="window.print()">{html.escape(S(lang, 'print'))}</button></header>
<div class="layout"><nav class="side" aria-label="{html.escape(S(lang, "chapterNav"))}">{nav}</nav><main id="main">{body}</main></div>
<script src="anchors.js"></script><script src="search-index.js"></script><script src="guide.js"></script></body></html>'''

    # chapter pages
    for i, ch in enumerate(chapters):
        toc = ''.join(f'<li class="l{lvl}"><a href="#{hid}">{html.escape(t)}</a></li>' for hid, lvl, t in ch['sections'] if lvl in (2, 3))
        body = f'<aside class="pagetoc" aria-label="{html.escape(S(lang, "onThisPage"))}"><b>{html.escape(S(lang, "onThisPage"))}</b><ul>{toc}</ul></aside><article>{ch["body"]}</article>'
        (out / ch['page']).write_text(shell(ch['fm'].get('title', ''), body, ch['page']))
    # index
    toc_html = '<ol class="toc">'
    for ch in chapters:
        toc_html += f'<li><a href="{ch["page"]}">{html.escape(ch["fm"].get("chapter", ""))}. {html.escape(ch["fm"].get("title", ""))}</a><ul>'
        for hid, lvl, t in ch['sections']:
            if lvl in (2, 3):
                toc_html += f'<li class="l{lvl}"><a href="{ch["page"]}#{hid}">{html.escape(t)}</a></li>'
        toc_html += '</ul></li>'
    toc_html += '</ol>'
    intro = (GUIDE / 'src' / '00-intro.html')
    intro_html = intro.read_text() if intro.exists() else ''
    stamp = f'<p class="meta">{html.escape(S(lang, "editionCustomer") if edition == "customer" else S(lang, "editionInternal"))} · {len(all_screens)} {html.escape(S(lang, "screens"))} · {html.escape(S(lang, "builtFromSource"))}</p>'
    (out / 'index.html').write_text(shell(S(lang, 'contents'), f'<article><h1>{html.escape(S(lang, "guideTitle"))}</h1>{stamp}{intro_html}<h2 id="contents">{html.escape(S(lang, "contents"))}</h2>{toc_html}</article>', 'index.html'))
    # setup-sequence page
    tiers = {}
    for sid, blk in all_screens.items():
        k = order_key(blk)
        if k:
            tiers.setdefault(k[0], []).append((k[1], sid, blk))
    seq = f'<article><h1>{html.escape(S(lang, "setupOrder"))}</h1><p class="lead">{S(lang, "setupLead")}</p>'
    for tier in sorted(tiers):
        seq += f'<h2 id="tier-{tier}">{html.escape(S(lang, "tier"))} {tier}</h2><ol class="seq">'
        for step, sid, blk in sorted(tiers[tier]):
            info = all_screens[sid]
            req = blk.get('Requires', '')
            needs = '' if (not req or is_none(req)) else f' <span class="needs">{html.escape(S(lang, "needs"))} ' + ', '.join(f'<a href="{all_screens[m.group(2)]["page"] if m.group(2) in all_screens else ""}#{m.group(2)}">{html.escape(m.group(1))}</a>' for m in LINK.finditer(req)) + '</span>'
            seq += f'<li><label><input type="checkbox" data-seq="{sid}"> <a href="{info["page"]}#{sid}">{html.escape(info["title"])}</a></label>{needs}</li>'
        seq += '</ol>'
    seq += '</article>'
    (out / 'setup-sequence.html').write_text(shell(S(lang, 'setupOrder'), seq, 'setup-sequence.html'))
    # all.html (print)
    allbody = ''.join(f'<article class="chapter">{c["body"]}</article>' for c in chapters)
    allbody = re.sub(r'href="(ch|0\d|9\d)[^"#]*\.html#', 'href="#', allbody)
    (out / 'all.html').write_text(shell(S(lang, 'completeGuide'), allbody, 'all.html'))
    # go.html, anchors, search index
    anchors = {k: v['page'] for k, v in all_sections.items()}
    (out / 'anchors.js').write_text('window.PS_ANCHORS=' + json.dumps(anchors) + ';')
    (out / 'go.html').write_text('''<!doctype html><html lang="@LANG@"><head><meta charset="utf-8"><title>@OPENING@</title>
<meta name="robots" content="noindex"><script src="anchors.js"></script>
<script>(function(){var id=decodeURIComponent((location.hash||'').slice(1)),A=window.PS_ANCHORS||{};
var fall=id.replace(/^(screen-)(cytology|system)-/,'$1');var t=A[id]?id:(A[fall]?fall:'');
location.replace(t?A[t]+'#'+t:'index.html'+(id?'?q='+encodeURIComponent(id.replace(/^screen-|-/g,' ').trim()):''));})();</script></head>
<body><p>@OPENING@ <a href="index.html">@OPENCONTENTS@</a></p></body></html>'''.replace('@LANG@', S(lang, 'htmlLang')).replace('@OPENING@', html.escape(S(lang, 'openingGuide'))).replace('@OPENCONTENTS@', html.escape(S(lang, 'openContents'))))
    idx = []
    for ch in chapters:
        cur = None
        for m in re.finditer(r'<h([23]) id="([^"]+)">.*?</a> (.*?)</h\1>|<nav class="crumb"[^>]*data-crumb="([^"]*)"|<tr id="([fe]-[^"]+)"><td>(.*?)</td>', ch['body'], re.S):
            if m.group(2):
                cur = {'id': m.group(2), 'title': re.sub(r'<[^>]+>', '', m.group(3)), 'page': ch['page'], 'chapter': ch['fm'].get('title', ''), 'crumb': '', 'keys': []}
                idx.append(cur)
            elif m.group(4) is not None and cur:
                cur['crumb'] = html.unescape(m.group(4))
            elif m.group(5) and cur:
                cur['keys'].append(re.sub(r'<[^>]+>', '', m.group(6)))
    (out / 'search-index.js').write_text('window.PS_INDEX=' + json.dumps(idx, ensure_ascii=False) + ';window.PS_STR=' + json.dumps({'noMatch': S(lang, 'noMatch')}, ensure_ascii=False) + ';')
    return len(chapters), len(all_screens), caps


def main():
    if '--no-convert' not in sys.argv:
        convert_images()
    if not any(SRC.glob('[0-9][0-9]-*.md')):
        print('no chapters in', SRC)
        return 1
    want = next((a.split('=')[1].split(',') for a in sys.argv if a.startswith('--langs=')), LANGS)
    res, built = {}, []
    for ed in ('customer', 'internal'):
        res[ed] = build_edition(ed, 'en')          # English first: it sets the row ids and clears the edition folder
        for lang in LANGS[1:]:
            if lang not in want:
                continue
            if not lang_ready(lang):
                warnings.append(f'{ed}: the {lang} translation is not complete; skipped')
                continue
            build_edition(ed, lang)
            if lang not in built:
                built.append(lang)
    miss = sorted(set(res['internal'][2]['missing']))
    (GUIDE / 'MISSING_CAPTURES.md').write_text('# Screenshots the guide asks for that are not captured\n\n' + ('\n'.join(f'- `{c}`: {d}' for c, d in miss) or 'None.') + '\n')
    if '--publish' in sys.argv and not errors:
        dest = ROOT / 'public' / 'help' / 'admin-guide'
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(OUT / 'customer', dest)
        print('published customer edition to public/help/admin-guide/')
    for ed, (nch, nsc, _c) in res.items():
        print(f'{ed}: {nch} chapters, {nsc} screens')
    print('languages built: en' + ''.join(', ' + l for l in built))
    for w in warnings:
        print('warning:', w)
    for e in errors[:60]:
        print('ERROR:', e)
    if len(errors) > 60:
        print(f'... and {len(errors) - 60} more errors')
    print(f'{len(errors)} errors, {len(miss)} missing captures')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
