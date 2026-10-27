#!/usr/bin/env python3
"""Look up how the app words an on-screen text in another language (Batch 647).

The translated guide must name buttons, fields, tabs and menu items exactly as the screen shows them in that
language. The app's text lives in src/i18n/locales/<lang>.json. This tool finds the English text in en.json and
prints the same key's text in the other language.

  python3 scripts/admin-guide/uitext.py <lang> "Add Department" ["Save" ...]
  python3 scripts/admin-guide/uitext.py <lang> --like "Grossing"      (every English text containing the word)
Matching is on the whole text, ignoring case, trailing colons and ellipses; the keys are printed so you can judge.
"""
import json, re, sys
from pathlib import Path

LOC = Path(__file__).resolve().parents[2] / 'src' / 'i18n' / 'locales'


def flat(d, pre=''):
    out = {}
    for k, v in d.items():
        if isinstance(v, dict):
            out.update(flat(v, f'{pre}{k}.'))
        elif isinstance(v, str):
            out[f'{pre}{k}'] = v
    return out


def norm(s):
    return re.sub(r'[\s:…\.]+$', '', s.strip()).lower()


def main(a):
    lang = a[0]
    en = flat(json.loads((LOC / 'en.json').read_text()))
    tr = flat(json.loads((LOC / f'{lang}.json').read_text()))
    like = a[1] == '--like'
    for q in a[2:] if like else a[1:]:
        hits = [(k, v) for k, v in en.items() if (norm(q) in v.lower() if like else norm(v) == norm(q))]
        if not hits:
            print(f'{q!r}: no match in en.json')
            continue
        shown = {}
        for k, v in hits[:12]:
            shown.setdefault((v, tr.get(k, '(no translation)')), []).append(k)
        for (v, t), keys in list(shown.items())[:8]:
            print(f'{v!r} -> {t!r}   [{keys[0]}{" +" + str(len(keys) - 1) if len(keys) > 1 else ""}]')
    return 0


sys.exit(main(sys.argv[1:]))
