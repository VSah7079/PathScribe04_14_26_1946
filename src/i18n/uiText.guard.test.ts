// src/i18n/uiText.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 513 (PS-269): the whole UI shows no hard-coded English.
//
// The app-wide version of pages/SynopticReportPage/reportPageText.guard.test.ts.
// It parses every .tsx under components/, pages/, contexts/ and hooks/ (tests
// and __tests__ folders skipped) with TypeScript's own parser, so text that
// spans several lines is caught, and flags:
//   • JSX text containing a word (two or more Latin letters);
//   • a title / placeholder / aria-label / alt / label attribute written as a
//     plain string containing a word;
//   • showToast / toast / alert / confirm called with a literal message.
//
// What may stay literal is listed below: exact literals in ALLOWED, and a
// small set of documented patterns in ALLOWED_PATTERNS. Each entry says why.
// Anything else goes through t() (CLAUDE.md standing rule 3).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import ts from 'typescript';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCANNED_DIRS = ['components', 'pages', 'contexts', 'hooks'];

const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const p = resolve(d, n);
  if (statSync(p).isDirectory()) return n === '__tests__' ? [] : walk(p);
  return /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [p] : [];
});

/** Exact literals allowed on screen, with why. */
const ALLOWED = new Set([
  'PathScribe',                            // product name (logo alt text, report footer brand)
  'ForMedrix · PathScribe AI',             // product / company brand line in the nav bar
  'PathScribe Laboratory',                 // brand name of the sample institution in the template preview
  'STAT',                                  // universal priority abbreviation, used as-is in every language
  'SLA',                                   // service-level-agreement abbreviation, used as-is internationally
  '"Microscopic examination performed."',  // the exact text the button inserts into the report narrative, which stays English (MicroscopicEntryPanel.tsx)
  ';gs',                                   // example macro trigger the user types; not a word
  'OAuth2', 'PDF', 'HL7',                  // protocol / file-format names
  'CAP', 'RCPath',                         // standards bodies (template standard picker)
  'SCT', 'ICD',                            // coding-system abbreviations on code badges
  'SNOMED CT', 'ICD-10/11',                // coding-system names
  'ASC-US:LSIL',                           // Bethesda ratio column heading, an international reporting term
  'Δ Ct',                                  // PCR cycle-threshold delta, an assay term
  'mm, cm',                                // unit examples in a unit placeholder
  'https://…/logo.png',                    // URL example placeholder
]);

/** Documented patterns allowed on screen, with why. */
const ALLOWED_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /^(Unsat|NILM|ASC-US|ASC-H|LSIL|HSIL\+|HR-HPV\+|HPV16|HPV18\/45|ASC-US HPV\+)( %)?$/, why: 'Bethesda / HPV category abbreviations (optionally "%"), international reporting terms' },
  { re: /^— (NCSR|KNCSP\/KCCR|CSMS|CervicalCheck|PALGA|NICSP)$/, why: 'national screening registry / programme names after a dash' },
  { re: /^\(?(US|UK|AU|CA|NZ)\)?$/, why: 'country codes' },
  { re: /^(mm|cm|ms)( ×)?$/, why: 'units of measure' },
  { re: /^\([A-Z]+(-[A-Z]+)*-\d+\)$/, why: 'report codes such as (CYT-QA-03)' },
  { re: /^[a-z][A-Za-z]*(\.[A-Za-z]+)+$/, why: 'data field paths (diagnostic.grossDescription) shown or used as placeholders in the template builder' },
  { re: /^(https?|hl7):\/\/\S+$/, why: 'URL / endpoint example placeholders' },
  { re: /^[^\s@]+@[^\s@]+\.[a-z]+$/, why: 'e-mail address example placeholder' },
  { re: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/, why: 'code / identifier example placeholders (CONSULT_REQUEST)' },
  // Must contain an underscore or a digit, so a hyphenated English word (well-differentiated) can't pass.
  { re: /^(?=.*[_\d])[a-z0-9]+([_-][a-z0-9]+)+$/, why: 'technical id example placeholders (standard_surgical_pathology, us-east-1, my-gpt4-deployment)' },
  { re: /^<[a-z]+>\{\{[\w.]+\}\}<\/[a-z]+>$/, why: 'HTML / handlebars snippet example with no words of its own' },
];

const ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt', 'label']);
const MESSAGE_CALLS = /(^|\.)(showToast|toast|alert|confirm)$/;
const hasWord = (s: string) => /[A-Za-z]{2,}/.test(s);
const allowed = (s: string) => ALLOWED.has(s) || ALLOWED_PATTERNS.some(p => p.re.test(s));

function findings(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(SRC, file).split(sep).join('/');
  const out: string[] = [];
  const at = (n: ts.Node) => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const text = n.getText().replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim(); // entities such as &nbsp; aren't words
      if (hasWord(text) && !allowed(text)) out.push(`${at(n)} text: ${text}`);
    } else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)) {
      const value = n.initializer.text;
      if (hasWord(value) && !allowed(value)) out.push(`${at(n)} ${n.name.getText()}: ${value}`);
    } else if (ts.isCallExpression(n) && n.arguments[0] && MESSAGE_CALLS.test(n.expression.getText())) {
      const arg = n.arguments[0];
      const literal = ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) || ts.isTemplateExpression(arg);
      if (literal) out.push(`${at(n)} ${n.expression.getText()}: ${arg.getText()}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe('the UI shows no hard-coded English (PS-269)', () => {
  const files = SCANNED_DIRS.flatMap(d => walk(resolve(SRC, d)));

  it('finds the UI files (guards the guard)', () => {
    expect(files.length).toBeGreaterThan(300);
    for (const dir of SCANNED_DIRS) expect(files.some(f => f.includes(`${sep}${dir}${sep}`))).toBe(true);
    expect(files.some(f => f.endsWith(`${sep}WorklistTable.tsx`))).toBe(true);
  });

  it('flags the kinds of text it is meant to catch', () => {
    const probe = (code: string) => {
      const sf = ts.createSourceFile('probe.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      let hits = 0;
      const visit = (n: ts.Node) => {
        if (ts.isJsxText(n) && hasWord(n.getText().trim()) && !allowed(n.getText().trim())) hits++;
        if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer) && hasWord(n.initializer.text) && !allowed(n.initializer.text)) hits++;
        ts.forEachChild(n, visit);
      };
      visit(sf);
      return hits;
    };
    expect(probe('const a = <div title="Close">Save changes</div>;')).toBe(2);
    expect(probe('const a = <div title={t("x")}>{t("y")} STAT</div>;')).toBe(0);
    expect(allowed('MRN')).toBe(false);
    expect(allowed('e.g. SURGI_CENTER_NORTH')).toBe(false);
  });

  it('no literal UI text, attributes or message calls', () => {
    expect(files.flatMap(findings)).toEqual([]);
  });
});
