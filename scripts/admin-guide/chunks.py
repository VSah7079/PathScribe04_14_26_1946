#!/usr/bin/env python3
"""Split an English guide chapter into translation chunks, and join translated chunks back (Batch 647).

  python3 scripts/admin-guide/chunks.py split <chapter-file-name> <out-dir> [max-words]
      writes <out-dir>/NN.md (contiguous slices of the chapter, cut only at ## or ### headings, about max-words each, default 3000)
  python3 scripts/admin-guide/chunks.py join <lang> <chapter-file-name> <chunk-dir>
      concatenates <chunk-dir>/NN.md (translated, same names) into docs/admin-guide/src/<lang>/<chapter-file-name>
Nothing is lost on split: joining the English chunks gives back the original file byte for byte.
"""
import re, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / 'docs' / 'admin-guide' / 'src'


def split(name, out, maxw=3000):
    text = (SRC / name).read_text()
    lines = text.split('\n')
    fence, cuts = False, [0]
    words = 0
    for i, ln in enumerate(lines):
        if ln.strip().startswith('```'):
            fence = not fence
        if not fence and re.match(r'^#{2,3}\s', ln) and i > 0 and words >= maxw:
            cuts.append(i)
            words = 0
        words += len(ln.split())
    cuts.append(len(lines))
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    for n, (a, b) in enumerate(zip(cuts, cuts[1:]), 1):
        (out / f'{n:02d}.md').write_text('\n'.join(lines[a:b]) + ('\n' if b < len(lines) else ''))
    return len(cuts) - 1


def join(lang, name, chunk_dir):
    parts = sorted(Path(chunk_dir).glob('[0-9][0-9].md'))
    text = ''.join(p.read_text() for p in parts)
    dest = SRC / lang / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)
    return len(parts)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'split':
        print(split(a[1], a[2], int(a[3]) if len(a) > 3 else 3000), 'chunks')
    elif a[0] == 'join':
        print(join(a[1], a[2], a[3]), 'chunks joined')
