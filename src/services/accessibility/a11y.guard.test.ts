// src/services/accessibility/a11y.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491): keyboard access and field names, across the whole app
// (a11yAudit.ts). No exception list: the app passes with zero findings.
// If this fails:
//   - clickable: use a <button>, or add {...pressable(handler)}
//     (utils/a11y/pressable.ts) to the clickable element;
//   - unnamed-field: give the field aria-label={t(…)} with the text of its
//     visible label (or pair them with id / htmlFor).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditAccessibility, nestedInteractive } from './a11yAudit';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORED = /(\.test\.|\.d\.ts$|__tests__|__mocks__|\.stories\.)/;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith('.tsx') && !IGNORED.test(path) ? [path] : [];
  });
}

describe('keyboard access and field names (WCAG 2.1 AA, PS-491)', () => {
  const files = tsxFiles(SRC);
  const findings = files.flatMap(file =>
    auditAccessibility(readFileSync(file, 'utf8')).map(f => `${relative(SRC, file)}:${f.line} ${f.kind}: ${f.snippet}`));

  it('scans the whole app', () => {
    expect(files.length).toBeGreaterThan(300);
  });
  it('every clickable element that isn\'t a control works from the keyboard', () => {
    expect(findings.filter(f => f.includes(' clickable: '))).toEqual([]);
  });
  it('every row that is only a mouse shortcut (clickableContainer) holds a real button (Batch 566)', () => {
    expect(findings.filter(f => f.includes(' container-without-button: '))).toEqual([]);
  });
  // Batch 567 for the inbox, the worklist and the report editor; Batch 568 for the rest, and app-wide. No exception list.
  it('no control sits inside another (a pressable, switch, button or hand-made control holding a button, link, field or another pressable)', () => {
    const found = files.flatMap(file => nestedInteractive(readFileSync(file, 'utf8')).map(x => `${relative(SRC, file)}:${x.line} ${x.snippet}`));
    expect(found).toEqual([]);
  });
  it('every form field has a name a screen reader can read', () => {
    expect(findings.filter(f => f.includes(' unnamed-field: '))).toEqual([]);
  });
});

describe('the audit itself', () => {
  it('flags a clickable div and an unnamed select; passes pressable, a backdrop, a modal body and a labelled field', () => {
    const bad = `<div className="card" onClick={() => open()}>x</div><select value={v} onChange={c}></select>`;
    expect(auditAccessibility(bad).map(f => f.kind)).toEqual(['clickable', 'unnamed-field']);
    const good = `<div className="card" {...pressable(() => open())}>x</div>
      <div className="ps-ms-overlay" onClick={onClose}><div onClick={e => e.stopPropagation()}>y</div></div>
      <select aria-label={t('a.b')} value={v} onChange={c}></select>
      <label>Name <input value={n} onChange={c} /></label>
      <input placeholder={t('x')} value={n} onChange={c} />`;
    expect(auditAccessibility(good)).toEqual([]);
  });
  it('Batch 566: a clickableContainer row must hold a real button (checked up to its own closing tag)', () => {
    const kinds = (src: string) => auditAccessibility(src).map(f => f.kind);
    expect(kinds(`<div className="row" {...clickableContainer(open)}><div><span>name</span></div><button onClick={open}>x</button></div>`)).toEqual([]);
    expect(kinds(`<div className="row" {...clickableContainer(open)}><div>name</div></div><button>outside</button>`)).toEqual(['container-without-button']);
    expect(kinds(`<li {...clickableContainer(open)} />`)).toEqual(['container-without-button']);
    // A literal onClick beside it is still a bare clickable row.
    expect(kinds(`<div onClick={go} {...clickableContainer(undefined)}><button>x</button></div>`)).toEqual(['clickable']);
  });
  it('Batch 567: flags a pressable that holds a control; passes a table row (role null), clickableContainer, and controls in comments', () => {
    const kinds = (src: string) => nestedInteractive(src).map(f => f.kind);
    expect(kinds(`<div {...pressable(open)}><span>x</span><button onClick={del}>d</button></div>`)).toEqual(['nested-interactive']);
    expect(kinds(`<div {...pressable(open)}><input type="checkbox" /></div>`)).toEqual(['nested-interactive']);
    expect(kinds(`<li {...switchable(on, flip, 'x')}><span {...pressable(go)}>y</span></li>`)).toEqual(['nested-interactive']);
    expect(kinds(`<div {...pressable(open)}><div>a</div></div><button>outside</button>`)).toEqual([]);
    expect(kinds(`<tr {...pressable(open, { role: null })}><td><button>b</button></td></tr>`)).toEqual([]);
    expect(kinds(`<div {...clickableContainer(open)}><button onClick={open}>x</button></div>`)).toEqual([]);
    expect(kinds(`<div {...pressable(open)}>{/* a real <button> look */}<span>x</span></div>`)).toEqual([]);
    // A '<' in an earlier attribute doesn't hide the element.
    expect(kinds(`<div className={a < b ? 'x' : 'y'} {...pressable(open)}><button>d</button></div>`)).toEqual(['nested-interactive']);
    // role: null counts only as the call's own option, not anywhere in the tag.
    expect(kinds(`<div data-x={{ role: null }} {...pressable(open)}><button>d</button></div>`)).toEqual(['nested-interactive']);
    // A hidden input isn't a control.
    expect(kinds(`<div {...pressable(open)}><input type="hidden" value="1" /></div>`)).toEqual([]);
  });
  it('Batch 569: a control written by hand (a <button>, or role="button" / "checkbox" …) holding a control; "//" in on-screen text', () => {
    const kinds = (src: string) => nestedInteractive(src).map(f => f.kind);
    expect(kinds(`<div role="button" tabIndex={0} onClick={go} onKeyDown={k}><button>x</button></div>`)).toEqual(['nested-interactive']);
    expect(kinds(`<span role="checkbox" aria-checked={c}><input value={v} /></span>`)).toEqual(['nested-interactive']);
    expect(kinds(`<button onClick={go}><a href="/x">link</a></button>`)).toEqual(['nested-interactive']);
    expect(kinds(`<div role="region" aria-label="x"><button>x</button></div>`)).toEqual([]);
    expect(kinds(`<button onClick={go}><span>plain</span></button>`)).toEqual([]);
    // '//' in on-screen text is text, so the control after it on the same line is still seen ...
    expect(kinds(`<div {...pressable(open)}>and/or // see <button>b</button></div>`)).toEqual(['nested-interactive']);
    // ... while real comments are still ignored.
    expect(kinds(`<div {...pressable(open)}>{/* <button> */}<span>x</span></div>\nconst a = 1; // <button>`)).toEqual([]);
  });
  it('ignores commented-out markup', () => {
    expect(auditAccessibility(`{/* <div onClick={go}>old</div> */}\n// <select value={v}>`)).toEqual([]);
  });
});
