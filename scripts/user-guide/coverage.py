#!/usr/bin/env python3
"""User Guide label coverage (Batch 667).

Every short on-screen label (an English text of 3 to 40 characters in src/i18n/locales/en.json that a screen file asks
for with t('key')) must appear somewhere in the User Guide text (docs/user-guide/src/**/*.md) or the English Administrator Guide, unless
  - the screen belongs to the Administrator Guide (docs/user-guide/coverage-scope.json), or
  - it is listed with a reason in docs/user-guide/coverage-ignore.json under "<file under src/>::<key>".
Run: python3 scripts/user-guide/coverage.py [--list]     exit 1 when a label is neither covered nor ignored.
The same rule runs as a test: src/services/help/userGuide.coverage.guard.test.ts
"""
import json, os, re, sys
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(R, 'docs', 'user-guide')
en = json.load(open(os.path.join(R, 'src/i18n/locales/en.json'), encoding='utf8'))
flat = {}
def walk(o, p=''):
    for k, v in o.items():
        q = f'{p}.{k}' if p else k
        if isinstance(v, dict): walk(v, q)
        elif isinstance(v, str): flat[q] = v
walk(en)
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', re.sub(r'\{\{[^}]*\}\}', ' ', s.lower())).strip()
text = ''
for d, _, fs in os.walk(os.path.join(G, 'src')):
    for f in fs:
        if f.endswith('.md'): text += open(os.path.join(d, f), encoding='utf8').read() + '\n'
# Administrator Guide text (English only) counts too: a label explained there is explained somewhere.
for d, _, fs in os.walk(os.path.join(R, 'docs', 'admin-guide', 'src')):
    if os.path.basename(d) in ('fr', 'de', 'nl', 'ko', 'es'): continue
    for f in fs:
        if f.endswith('.md'): text += open(os.path.join(d, f), encoding='utf8').read() + '\n'
hay = ' ' + norm(text) + ' '
scope = json.load(open(os.path.join(G, 'coverage-scope.json')))['adminGuideAreas']
ignore = json.load(open(os.path.join(G, 'coverage-ignore.json')))
keyre = re.compile(r"""\bt\(\s*['"`]([A-Za-z0-9_.\-]+)['"`]""")
missing, bad = [], []
for d, _, fs in os.walk(os.path.join(R, 'src')):
    if 'node_modules' in d: continue
    for f in fs:
        if not f.endswith('.tsx') or '.test.' in f: continue
        p = os.path.join(d, f); rel = os.path.relpath(p, os.path.join(R, 'src')).replace(os.sep, '/')
        if any(rel.startswith(a + '/') for a in scope): continue
        for k in sorted(set(keyre.findall(open(p, encoding='utf8').read()))):
            v = flat.get(k)
            if not v or not 3 <= len(v) <= 40: continue
            n = norm(v)
            if len(n) < 3: continue
            if f'{rel}::{k}' in ignore:
                if len(ignore[f'{rel}::{k}']) < 10: bad.append(f'{rel}::{k} (reason too short)')
                continue
            if (' ' + n + ' ') not in hay: missing.append(f'{rel}::{k}  "{v}"')
if '--list' in sys.argv or missing or bad:
    for m in missing: print('NOT IN GUIDE', m)
    for b in bad: print('BAD IGNORE', b)
print(f'{len(missing)} labels missing, {len(bad)} bad ignore entries')
sys.exit(1 if missing or bad else 0)
