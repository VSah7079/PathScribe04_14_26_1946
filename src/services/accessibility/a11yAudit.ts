// src/services/accessibility/a11yAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491, WCAG 2.1 AA): two source-level checks the guard runs over
// every UI file (a11y.guard.test.ts). The browser check (axe-core, e2e/) sees
// only the screens it opens; these see every file.
//
//   clickable     — onClick on an element that isn't a control (div, span,
//                   li, td, tr, img, svg …) must also work from the keyboard:
//                   {...pressable(handler)} or {...switchable(…)}
//                   (utils/a11y/pressable.ts), or its
//                   own role + tabIndex + key handler. Not counted:
//                     - a handler that only stops the click from bubbling
//                       (the inside of a modal);
//                     - a backdrop (class overlay / backdrop / scrim / mask):
//                       a mouse shortcut for the window's own Close button.
//   unnamed-field — a <select>, <input> or <textarea> must have a name a
//                   screen reader can read: aria-label / aria-labelledby, an
//                   id (paired with a <label htmlFor>), a placeholder, a
//                   spread of props, or a wrapping <label>.
//   container-without-button — Batch 566: an element spread with
//                   {...clickableContainer(handler)} (a row that holds buttons
//                   of its own; a mouse shortcut only, no tab stop) must hold a
//                   real <button>, which is what keyboard and screen-reader
//                   users open it with. Checked up to the element's own closing
//                   tag.
//   nested-interactive — Batch 567: an element spread with
//                   {...pressable(…)} or {...switchable(…)} is a control (a
//                   button or switch; not counted with { role: null }, a
//                   table row, say), so it must not hold another control (a button, link, field, or
//                   another pressable): a screen reader can't reach or
//                   announce one control inside another, and keyboard users
//                   get two tab stops for one thing. A row like that uses
//                   {...clickableContainer(…)} with its main action on a real
//                   button inside. Checked up to the element's own closing
//                   tag. Reported by nestedInteractive(), which the guard runs
//                   across the app. Batch 569: also a <button>, or an element
//                   given a control's role by hand (role="button", "checkbox",
//                   "switch", "tab" …), holding another control.
// Pure: text in, findings out.
// ─────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

export interface A11yFinding { kind: 'clickable' | 'unnamed-field' | 'container-without-button' | 'nested-interactive'; line: number; snippet: string; /** Where the element starts (nested-interactive only). */ start?: number }

const NON_INTERACTIVE = /<(div|span|li|td|tr|img|p|section|label|article|header|footer|ul|h[1-6]|svg|g|path|circle|rect|polygon|text)\b/g;
const STOP_ONLY = /onClick=\{\s*\(?\s*(e|ev|evt|event)\s*(:\s*[\w.<>]+)?\s*\)?\s*=>\s*\{?\s*\1\.stopPropagation\(\)\s*;?\s*\}?\s*\}/;
const BACKDROP = /overlay|backdrop|scrim|modal-bg|-mask\b/i;
const FIELD = /<(select|input|textarea)\b/g;
const NOT_A_TEXT_FIELD = /type=["'](hidden|submit|button|file|checkbox|radio)["']/;

/** Blanks out comments, keeping line numbers. */
let lastStripped: { text: string; result: string } | null = null;

function withoutComments(text: string): string {
  // The guard runs several checks over the same file in turn: parse it once.
  if (lastStripped?.text === text) return lastStripped.result;
  const result = stripComments(text);
  lastStripped = { text, result };
  return result;
}

function stripComments(text: string): string {
  // Batch 569: read by the TypeScript parser, so '//' in on-screen text ("and/or // see note") isn't taken for a
  // comment (it used to blank the rest of the line). Comments are blanked to spaces, keeping line numbers.
  const sf = ts.createSourceFile('audit.tsx', text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const jsxText: [number, number][] = [];
  const comments = new Map<number, number>();
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.JsxText) { jsxText.push([node.pos, node.end]); return; }
    const children = node.getChildren(sf);
    if (children.length === 0) {
      for (const r of [...(ts.getLeadingCommentRanges(text, node.pos) ?? []), ...(ts.getTrailingCommentRanges(text, node.end) ?? [])]) comments.set(r.pos, r.end);
    }
    children.forEach(visit);
  };
  visit(sf);
  const chars = text.split('');
  for (const [start, end] of comments) {
    if (jsxText.some(([a, b]) => start >= a && start < b)) continue; // on-screen text, not a comment
    for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
  }
  return chars.join('');
}

/** The end of a JSX opening tag starting at `start` (braces and strings skipped). */
function tagEnd(text: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (depth > 0 && (c === '"' || c === "'" || c === '`')) { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;
const snippetOf = (tag: string) => tag.replace(/\s+/g, ' ').slice(0, 120);

export function auditAccessibility(source: string): A11yFinding[] {
  const text = withoutComments(source);
  const findings: A11yFinding[] = [];

  for (const m of text.matchAll(NON_INTERACTIVE)) {
    const start = m.index!;
    const end = tagEnd(text, start);
    if (end < 0) continue;
    const tag = text.slice(start, end + 1);
    if (!/\bonClick=/.test(tag)) continue;
    if (STOP_ONLY.test(tag)) continue;
    const cls = tag.match(/className=(\{[^}]*\}|"[^"]*")/);
    if (cls && BACKDROP.test(cls[1])) continue;
    if (/\{\.\.\.(pressable|switchable)\(/.test(tag)) continue;
    if (/\brole=/.test(tag) && /\btabIndex=/.test(tag) && /onKey(Down|Up|Press)=/.test(tag)) continue;
    findings.push({ kind: 'clickable', line: lineOf(text, start), snippet: snippetOf(tag) });
  }

  for (const m of text.matchAll(FIELD)) {
    const start = m.index!;
    const end = tagEnd(text, start);
    if (end < 0) continue;
    const tag = text.slice(start, end + 1);
    if (NOT_A_TEXT_FIELD.test(tag)) continue;
    if (/aria-label|aria-labelledby|\bid=|placeholder=|\{\.\.\./.test(tag)) continue;
    const before = text.slice(Math.max(0, start - 1500), start);
    if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;
    findings.push({ kind: 'unnamed-field', line: lineOf(text, start), snippet: snippetOf(tag) });
  }

  for (const m of text.matchAll(/\{\.\.\.clickableContainer\(/g)) {
    const start = text.lastIndexOf('<', m.index!);
    const name = text.slice(start + 1).match(/^[\w.]+/)?.[0];
    const end = tagEnd(text, start);
    if (!name || end < 0) continue;
    const tag = text.slice(start, end + 1);
    const body = tag.endsWith('/>') ? '' : elementBody(text, name, end + 1);
    if (!/<button\b/.test(body)) findings.push({ kind: 'container-without-button', line: lineOf(text, start), snippet: snippetOf(tag) });
  }
  return findings;
}

const CONTROL_INSIDE = /<(button|a|input|select|textarea|Link|NavLink|CapabilityButton)\b|\{\.\.\.(pressable|switchable)\(/;

/** Batch 567: pressable / switchable elements that hold another control (see the header). */
export function nestedInteractive(source: string): A11yFinding[] {
  const text = withoutComments(source);
  const findings: A11yFinding[] = [];
  for (const m of text.matchAll(/\{\.\.\.(pressable|switchable)\(/g)) {
    const start = openingTagStart(text, m.index!);
    const name = start < 0 ? undefined : text.slice(start + 1).match(/^[\w.]+/)?.[0];
    const end = start < 0 ? -1 : tagEnd(text, start);
    if (!name || end < 0 || end < m.index!) {
      // Can't tell which element it is on: reported, so it is looked at rather than passed.
      findings.push({ kind: 'nested-interactive', line: lineOf(text, m.index!), snippet: `unreadable element: ${snippetOf(text.slice(m.index!, m.index! + 80))}` });
      continue;
    }
    const tag = text.slice(start, end + 1);
    if (tag.endsWith('/>')) continue;
    // pressable(handler, { role: null }) (a table row, say): a tab stop but not a control, so a screen reader still
    // reaches what's inside. Read from the call's own arguments only.
    if (m[1] === 'pressable' && /\{\s*role:\s*null\s*\}\s*\)$/.test(callText(text, m.index! + m[0].length - 1))) continue;
    const body = elementBody(text, name, end + 1).replace(/<input\b[^>]*type=["']hidden["'][^>]*>/g, '');
    if (CONTROL_INSIDE.test(body)) findings.push({ kind: 'nested-interactive', line: lineOf(text, start), snippet: snippetOf(tag), start });
  }

  // Batch 569: the same for a control written out by hand: a <button>, or an element given a control's role
  // (role="button", "checkbox", "switch", "tab", …: the roles whose contents a screen reader reads as one thing).
  const seen = new Set(findings.map(f => f.start));
  for (const m of text.matchAll(HAND_MADE_CONTROL)) {
    const start = m.index!;
    const name = m[1];
    const end = tagEnd(text, start);
    if (end < 0) continue;
    const tag = text.slice(start, end + 1);
    if (tag.endsWith('/>')) continue;
    if (name !== 'button' && !CONTROL_ROLE.test(tag)) continue;
    const body = elementBody(text, name, end + 1).replace(/<input\b[^>]*type=["']hidden["'][^>]*>/g, '');
    if (CONTROL_INSIDE.test(body) && !seen.has(start)) findings.push({ kind: 'nested-interactive', line: lineOf(text, start), snippet: snippetOf(tag), start });
  }
  return findings;
}

/** Elements that can carry a hand-written control role, and <button> itself. */
const HAND_MADE_CONTROL = /<(button|div|span|li|td|tr|p|section|article|header|label|img|svg|g)\b/g;
/** Roles whose children are presentational (axe nested-interactive). */
const CONTROL_ROLE = /\brole=(["'])(button|checkbox|switch|radio|tab|option|menuitem|menuitemcheckbox|menuitemradio|slider|img)\1/;

/** The `<` that opens the JSX element whose attributes include position `at` (skipping `<` in expressions). */
function openingTagStart(text: string, at: number): number {
  for (let i = text.lastIndexOf('<', at); i >= 0; i = text.lastIndexOf('<', i - 1)) {
    if (!/^<[A-Za-z]/.test(text.slice(i, i + 2))) continue;
    const end = tagEnd(text, i);
    if (end > at) return i;
    if (end >= 0 && end < at) return -1; // a complete tag closes before `at`: not inside one
  }
  return -1;
}

/** A call's text from its opening parenthesis to the matching one (strings skipped). */
function callText(text: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return text.slice(open, i + 1);
  }
  return text.slice(open);
}

/** What sits between an opening tag (ending just before `from`) and its own closing tag; nested tags of the same name counted. */
function elementBody(text: string, name: string, from: number): string {
  const re = new RegExp(`<${name.replace('.', '\\.')}\\b|</${name.replace('.', '\\.')}\\s*>`, 'g');
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[0].startsWith('</')) { if (--depth === 0) return text.slice(from, m.index); }
    else {
      const e = tagEnd(text, m.index);
      if (e > 0 && text[e - 1] !== '/') depth++;
    }
  }
  return text.slice(from);
}
