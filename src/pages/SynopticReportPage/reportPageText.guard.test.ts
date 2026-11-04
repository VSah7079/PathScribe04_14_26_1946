// src/pages/SynopticReportPage/reportPageText.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 445: the report page and its components, modals and hooks show no
// hard-coded English. It parses each file (TypeScript's own parser, so
// text spanning several lines is caught) and flags:
//   • JSX text with a word in it;
//   • a title / placeholder / aria-label / alt written as a plain string;
//   • showToast('…') with a literal message;
//   • markDirty('…') with anything but a section id (dirtySections.ts).
// The two allowed literals are listed below with the reason.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import ts from 'typescript';
import { DIRTY_SECTION_IDS } from '@/services/reportEditing/dirtySections';

const DIR = dirname(fileURLToPath(import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const p = resolve(d, n);
  if (statSync(p).isDirectory()) return n === '__tests__' ? [] : walk(p);
  return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
});

/** Literal text allowed on screen, with why. */
const ALLOWED = new Set([
  '"Microscopic examination performed."', // the exact text the button inserts into the report narrative, which stays in English (MicroscopicEntryPanel.tsx)
  'STAT', // the universal priority abbreviation, used as-is in every language
]);
const ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt']);
const SECTION_IDS = new Set<string>(DIRTY_SECTION_IDS);

function findings(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = relative(DIR, file).split(sep).join('/');
  const out: string[] = [];
  const at = (n: ts.Node) => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const text = n.getText().replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim(); // entities such as &nbsp; aren't words
      if (/[A-Za-z]{2,}/.test(text) && !ALLOWED.has(text)) out.push(`${at(n)} text: ${text}`);
    } else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer) && /[A-Za-z]{2,}/.test(n.initializer.text)) {
      out.push(`${at(n)} ${n.name.getText()}: ${n.initializer.text}`);
    } else if (ts.isCallExpression(n) && n.arguments[0]) {
      const callee = n.expression.getText();
      const arg = n.arguments[0];
      const literal = ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) || ts.isTemplateExpression(arg);
      if (callee === 'showToast' && literal) out.push(`${at(n)} toast: ${arg.getText()}`);
      if (callee === 'markDirty' && (!ts.isStringLiteral(arg) || !SECTION_IDS.has(arg.text))) out.push(`${at(n)} markDirty: ${arg.getText()}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe('report page shows no hard-coded English', () => {
  const files = walk(DIR);
  it('finds the page files (guards the guard)', () => {
    expect(files.some(f => f.endsWith('SynopticReportPage.tsx'))).toBe(true);
    expect(files.length).toBeGreaterThan(30);
  });
  it('no literal UI text, toasts or section labels', () => {
    expect(files.flatMap(findings)).toEqual([]);
  });
});
