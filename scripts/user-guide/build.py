#!/usr/bin/env python3
"""PathScribe User Guide builder (Batch 657).

Reads docs/user-guide/src/**/*.md (writing standard: docs/user-guide/AUTHORING.md). Each article starts with front
matter (module, screen, workflow, role, keywords, routes, previous, next, related). Writes, to public/help/user-guide/:
  manifest.json       every article's metadata (the app's help page, breadcrumb, previous/next and related links)
  search-index.json   title, headings, keywords and text, for the help search box
  articles/<slug>.html  the article body (the app wraps it with the breadcrumb and links)
  img/                screenshots from docs/user-guide/img/
and src/services/help/userGuideRoutes.generated.ts (which app route opens which article).
Checks (a failure exits 1): metadata missing, a required section missing, duplicate slug or route, a previous / next /
related link to an article that does not exist, developer or database wording in the text, no numbered steps.
A screenshot is written as ![what it shows](capture:<id>); when docs/user-guide/img/<id>.png is missing a placeholder
is shown and the id is listed in docs/user-guide/MISSING_CAPTURES.md.
Run: python3 scripts/user-guide/build.py [--check]   (--check builds nothing, only validates)
"""
import html, json, re, shutil, sys
from pathlib import Path
import markdown, yaml

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / 'docs' / 'user-guide'
SRC, IMG = GUIDE / 'src', GUIDE / 'img'
OUT = ROOT / 'public' / 'help' / 'user-guide'
GENERATED_TS = ROOT / 'src' / 'services' / 'help' / 'userGuideRoutes.generated.ts'
CHECK_ONLY = '--check' in sys.argv

REQUIRED_H2 = ['Overview', 'Screen Tour', 'Step-by-Step Procedures', 'Tips and Best Practices', 'Related Features', 'Troubleshooting']
REQUIRED_H3 = {
    'Screen Tour': ['Field definitions', 'Toolbar', 'Icons and status indicators', 'Hotkeys'],
    'Step-by-Step Procedures': ['Standard workflow', 'Alternative workflow', 'Exception handling', 'Error recovery'],
    'Tips and Best Practices': ['Common mistakes', 'Efficiency recommendations', 'Workflow recommendations'],
    'Related Features': ['Upstream workflow', 'Downstream workflow'],
    'Troubleshooting': ['Common user issues', 'Resolution steps', 'When to contact support'],
}
REQUIRED_META = ['module', 'workflow', 'role', 'keywords', 'routes']
STATUSES = ['Draft', 'Reviewed']
# Words an end user should not meet (the guide teaches the work, not the system).
FORBIDDEN = ['database', 'sql', 'api', 'json', 'localstorage', 'endpoint', 'backend', 'front end', 'frontend', 'react',
             'webhook', 'schema', 'stored procedure', 'javascript', 'typescript', 'vite', 'firestore']
errors, warnings = [], []


def slugify(s):
    s = re.sub(r'<[^>]+>', '', s).lower().replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def split_front(text, path):
    m = re.match(r'---\n(.*?)\n---\n(.*)', text, re.S)
    if not m:
        errors.append(f'{path}: no front matter'); return {}, text
    return (yaml.safe_load(m.group(1)) or {}), m.group(2)


def plain_text(md):
    t = re.sub(r'```.*?```', ' ', md, flags=re.S)
    t = re.sub(r'`[^`]*`', ' ', t)
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', t)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    return re.sub(r'[#>*_|!\-]+', ' ', t)


def check_forbidden(path, md):
    low = ' ' + plain_text(md).lower() + ' '
    for w in FORBIDDEN:
        if re.search(r'(?<![a-z])' + re.escape(w) + r'(?![a-z])', low):
            errors.append(f'{path}: developer or database wording "{w}" (write for the person doing the work)')


def sections(body):
    """{H2 title: {H3 titles}} from the Markdown body."""
    out, cur = {}, None
    for line in body.split('\n'):
        if re.match(r'## (?!#)', line):
            cur = re.sub(r'\s*\{#.*\}\s*$', '', line[3:].strip()); out[cur] = set()
        elif cur and re.match(r'### (?!#)', line):
            out[cur].add(re.sub(r'\s*\{#.*\}\s*$', '', line[4:].strip()))
    return out


def load():
    arts = []
    for path in sorted(SRC.rglob('*.md')):
        rel = path.relative_to(SRC).as_posix()
        meta, body = split_front(path.read_text(encoding='utf-8'), rel)
        if not meta:
            continue
        # `routes` may be an empty list: a deep-dive article opened from a link, not from a screen's Help button
        missing = [k for k in REQUIRED_META if not meta.get(k) and not (k == 'routes' and meta.get(k) == [])]
        if missing:
            errors.append(f'{rel}: front matter missing {", ".join(missing)}'); continue
        module, screen = str(meta['module']), str(meta.get('screen') or '')
        slug = str(meta.get('slug') or (slugify(module) + ('/' + slugify(screen) if screen else '')))
        if meta.get('status', 'Draft') not in STATUSES:
            errors.append(f'{rel}: status must be one of {STATUSES}')
        for k in ('role', 'keywords', 'routes'):
            if not isinstance(meta[k], list):
                errors.append(f'{rel}: {k} must be a list')
        secs = sections(body)
        for h2 in REQUIRED_H2:
            if h2 not in secs:
                errors.append(f'{rel}: missing section "## {h2}"')
        for h2, h3s in REQUIRED_H3.items():
            for h3 in h3s:
                if h2 in secs and h3 not in secs[h2]:
                    errors.append(f'{rel}: section "{h2}" missing "### {h3}"')
        steps = re.search(r'## Step-by-Step Procedures(.*?)(?=\n## (?!#)|\Z)', body, re.S)
        if steps and not re.search(r'^\s*1\.\s', steps.group(1), re.M):
            errors.append(f'{rel}: Step-by-Step Procedures has no numbered steps')
        check_forbidden(rel, body)
        title = (re.search(r'^# (.+)$', body, re.M) or [None, None])[1]
        if not title:
            errors.append(f'{rel}: no "# Title" line'); title = slug
        arts.append(dict(slug=slug, rel=rel, title=re.sub(r'\s*\{#.*\}\s*$', '', title.strip()), module=module, screen=screen,
                         workflow=str(meta['workflow']), roles=[str(r) for r in meta['role']], keywords=[str(k) for k in meta['keywords']],
                         routes=[str(r) for r in meta['routes']], previous=meta.get('previous'), next=meta.get('next'),
                         related=[str(r) for r in (meta.get('related') or [])], status=meta.get('status', 'Draft'), body=body))
    # Coverage: every screen route of the app has an article, or is listed with a reason in route-exemptions.json
    try:
        exempt = json.loads((ROOT / 'docs/user-guide/route-exemptions.json').read_text(encoding='utf-8'))
        app = ''.join((ROOT / f).read_text(encoding='utf-8') for f in ('src/SignedInApp.tsx', 'src/App.tsx'))
        claimed = {r for a in arts for r in [str(x) for x in a['routes']]}
        for route in sorted(set(re.findall(r'path="(/[^"]*)"', app))):
            if route not in claimed and route not in exempt:
                errors.append(f'route {route} has no User Guide article (add one, or list it in docs/user-guide/route-exemptions.json with the reason)')
    except FileNotFoundError:
        errors.append('docs/user-guide/route-exemptions.json is missing')
    return arts


def validate(arts):
    slugs, routes = {}, {}
    for a in arts:
        if a['slug'] in slugs:
            errors.append(f'duplicate slug {a["slug"]} ({a["rel"]}, {slugs[a["slug"]]})')
        slugs[a['slug']] = a['rel']
        for r in a['routes']:
            if r in routes:
                errors.append(f'route {r} claimed by {a["slug"]} and {routes[r]}')
            routes[r] = a['slug']
    for a in arts:
        for k in ('previous', 'next'):
            if a[k] and a[k] not in slugs:
                errors.append(f'{a["rel"]}: {k} "{a[k]}" is not an article')
        for r in a['related']:
            if r not in slugs:
                errors.append(f'{a["rel"]}: related "{r}" is not an article')
        for target in re.findall(r'\]\(help:([a-z0-9/-]+)\)', a['body']):
            if target not in slugs:
                errors.append(f'{a["rel"]}: link to help:{target} which is not an article')


MISSING = []


def render(a):
    body = a['body']
    def cap(m):
        alt, cid = m.group(1), m.group(2)
        if (IMG / f'{cid}.png').exists():
            return f'<figure class="ps-ug-figure"><img src="img/{cid}.png" alt="{html.escape(alt)}"><figcaption>{html.escape(alt)}</figcaption></figure>'
        MISSING.append((cid, a['slug'], alt))
        return f'<figure class="ps-ug-figure ps-ug-figure--missing" data-capture="{cid}"><figcaption>Screenshot to come: {html.escape(alt)}</figcaption></figure>'
    body = re.sub(r'!\[([^\]]*)\]\(capture:([A-Za-z0-9_-]+)\)', cap, body)
    body = re.sub(r'\]\(help:([a-z0-9/-]+)\)', r'](/help/\1)', body)
    md = markdown.Markdown(extensions=['tables', 'attr_list', 'fenced_code', 'admonition', 'toc', 'sane_lists'], extension_configs={'toc': {'permalink': False}})
    return md.convert(body)


def write(arts):
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'articles').mkdir(parents=True)
    (OUT / 'img').mkdir()
    for p in IMG.glob('*.png'):
        shutil.copy(p, OUT / 'img' / p.name)
    manifest, index = [], []
    for a in arts:
        h = render(a)
        (OUT / 'articles' / (a['slug'].replace('/', '__') + '.html')).write_text(h, encoding='utf-8')
        headings = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', h)
        meta = {k: a[k] for k in ('slug', 'title', 'module', 'screen', 'workflow', 'roles', 'keywords', 'routes', 'previous', 'next', 'related', 'status')}
        manifest.append(meta)
        index.append(dict(slug=a['slug'], title=a['title'], module=a['module'], screen=a['screen'], keywords=a['keywords'], roles=a['roles'],
                          headings=[re.sub(r'<[^>]+>', '', x) for x in headings], text=re.sub(r'\s+', ' ', plain_text(a['body']))[:6000]))
    (OUT / 'manifest.json').write_text(json.dumps({'articles': manifest}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (OUT / 'search-index.json').write_text(json.dumps(index, ensure_ascii=False) + '\n', encoding='utf-8')
    rows = ',\n'.join(f"  {{ route: {json.dumps(r)}, slug: {json.dumps(a['slug'])} }}" for a in arts for r in a['routes'])
    GENERATED_TS.write_text(
        "// src/services/help/userGuideRoutes.generated.ts\n// GENERATED by scripts/user-guide/build.py from the front matter of docs/user-guide/src/. Do not edit by hand.\n"
        "export interface UserGuideRoute { route: string; slug: string }\n\n"
        f"export const USER_GUIDE_ROUTES: readonly UserGuideRoute[] = [\n{rows},\n];\n\n"
        f"export const USER_GUIDE_SLUGS: readonly string[] = {json.dumps([a['slug'] for a in arts])};\n", encoding='utf-8')
    lines = ['# Screenshots still to capture (generated by scripts/user-guide/build.py; do not edit)', '',
             'Save each as `docs/user-guide/img/<id>.png` (PNG, 1600 px wide, patient data redacted or demo data only), then rebuild.', '',
             '| Capture id | Article | What it shows |', '|---|---|---|']
    lines += [f'| `{c}` | `{s}` | {w} |' for c, s, w in sorted(set(MISSING))]
    (GUIDE / 'MISSING_CAPTURES.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main():
    arts = load()
    validate(arts)
    for a in arts:
        for w in re.findall(r'\]\(capture:', a['body']):
            pass
    if errors:
        print('\n'.join(['FAILED:'] + errors)); sys.exit(1)
    if not CHECK_ONLY:
        write(arts)
    print(f'{len(arts)} articles{"" if CHECK_ONLY else f", {len(set(MISSING))} screenshots still to capture"}')


if __name__ == '__main__':
    main()
