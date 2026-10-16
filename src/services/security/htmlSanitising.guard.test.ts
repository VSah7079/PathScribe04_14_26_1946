// src/services/security/htmlSanitising.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 500 (PS-473): no HTML from data reaches the page unsanitised.
//   • every `dangerouslySetInnerHTML` renders the result of sanitizeRichHtml /
//     sanitizeSvgMarkup (services/security/sanitizeHtml.ts) — a ternary is
//     allowed when each branch is one of those or a template whose values go
//     through escapeHtml;
//   • a print window's <title> built from a value escapes it.
// On code (comments stripped), outside test files.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const SRC = resolve(process.cwd(), 'src');
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const isSource = (name: string) => /\.(tsx?|jsx?)$/.test(name) && !/\.test\.(tsx?|jsx?)$/.test(name);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return isSource(name) ? [full] : [];
  });
}
const FILES = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: code(readFileSync(f, 'utf8')) }));

/** The expression after `__html:`, up to the matching `}}`. */
function htmlExpressions(text: string): string[] {
  const out: string[] = [];
  const re = /dangerouslySetInnerHTML=\{\{\s*__html:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let depth = 0; let i = m.index + m[0].length; const start = i;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (ch === '}') { if (depth === 0) break; depth--; }
    }
    out.push(text.slice(start, i).trim());
  }
  return out;
}

const SANITISED = /^sanitize(RichHtml|SvgMarkup)\(/;
function isSafe(expr: string): boolean {
  if (SANITISED.test(expr)) return true;
  const ternary = /^[\w.?]+\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)$/.exec(expr);
  if (!ternary) return false;
  const branch = (b: string) => SANITISED.test(b) || (/^`/.test(b) && [...b.matchAll(/\$\{([^}]*)\}/g)].every(v => /^escapeHtml\(/.test(v[1].trim())));
  return branch(ternary[1]) && branch(ternary[2]);
}

describe('HTML from data is sanitised before it is rendered (PS-473)', () => {
  it('finds the render sites (guards the guard)', () => {
    const all = FILES.flatMap(f => htmlExpressions(f.text));
    expect(all.length).toBeGreaterThanOrEqual(7);
  });

  it('every dangerouslySetInnerHTML renders sanitised HTML', () => {
    const offenders = FILES.flatMap(f => htmlExpressions(f.text).filter(e => !isSafe(e)).map(e => `${f.rel}: ${e}`));
    expect(offenders).toEqual([]);
  });

  it('a <title> built from a value escapes it', () => {
    // organMapDrawing.ts builds SVG <title>s with its own `esc` (& < > " escaped; the
    // text sits in element content, where those are enough).
    const escaper = (rel: string) => (rel === 'services/organMapping/organMapDrawing.ts' ? /^(escapeHtml|esc)\(/ : /^escapeHtml\(/);
    const offenders = FILES.flatMap(f => [...f.text.matchAll(/<title>([^<]*)<\/title>/g)]
      .flatMap(m => [...m[1].matchAll(/\$\{([^}]*(?:\}[^}]*)?)\}/g)].filter(v => !escaper(f.rel).test(v[1].trim())).map(() => `${f.rel}: ${m[0]}`)));
    expect(offenders).toEqual([]);
  });

  it('the sanitiser recognises unsafe expressions', () => {
    expect(isSafe('c.text')).toBe(false);
    expect(isSafe('html || `<span>${x}</span>`')).toBe(false);
    expect(isSafe('sanitizeRichHtml(c.text)')).toBe(true);
    expect(isSafe('html ? sanitizeRichHtml(html) : `<span>${escapeHtml(p)}</span>`')).toBe(true);
    expect(isSafe('html ? sanitizeRichHtml(html) : `<span>${p}</span>`')).toBe(false);
  });
});
