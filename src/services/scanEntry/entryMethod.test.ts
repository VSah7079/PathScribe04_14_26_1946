// Batch 759 (Patient Verification spec §2.2): a scan from a typed id.
import { describe, it, expect } from 'vitest';
import { createEntryTracker, entryMethodOf } from './entryMethod';

const keys = (n: number, gap: number, start = 0) => Array.from({ length: n }, (_, i) => start + i * gap);

describe('entryMethodOf (Batch 759)', () => {
  it('scanner speed is a scan; a person typing is a manual entry', () => {
    expect(entryMethodOf({ keyTimes: keys(11, 12) })).toBe('scan');
    expect(entryMethodOf({ keyTimes: keys(11, 140) })).toBe('manual');
  });
  it('one key delayed by a busy screen still reads as a scan; a long pause does not', () => {
    const t = keys(11, 15); t.splice(6, 5, ...t.slice(6).map(x => x + 150));
    expect(entryMethodOf({ keyTimes: t })).toBe('scan');
    const u = keys(11, 15); u.splice(6, 5, ...u.slice(6).map(x => x + 600));
    expect(entryMethodOf({ keyTimes: u })).toBe('manual');
  });
  it('pasted, edited, dictated, short or touch-keyboard entries are manual', () => {
    expect(entryMethodOf({ keyTimes: keys(11, 12), pasted: true })).toBe('manual');
    expect(entryMethodOf({ keyTimes: keys(11, 12), edited: true })).toBe('manual');
    expect(entryMethodOf({ keyTimes: keys(11, 12), byHand: true })).toBe('manual');
    expect(entryMethodOf({ keyTimes: keys(3, 12) })).toBe('manual');
    expect(entryMethodOf({ keyTimes: [] })).toBe('manual');
  });
});

describe('createEntryTracker (Batch 759)', () => {
  it('follows a field from empty to submit', () => {
    const tr = createEntryTracker();
    let value = '';
    for (const [i, ch] of [...'S26-0001-A1'].entries()) { tr.key(ch, i * 10); tr.change(value, value + ch); value += ch; }
    expect(tr.method()).toBe('scan');
    tr.key('Backspace', 200); tr.change(value, value.slice(0, -1));
    expect(tr.method()).toBe('manual');
    tr.reset();
    expect(tr.method()).toBe('manual');
  });
  it('a change that is not the next character (a paste, a cut) is by hand; clearing the field starts again', () => {
    const tr = createEntryTracker();
    tr.change('', 'S26-0001-A1');
    expect(tr.method()).toBe('manual');
    tr.change('S26-0001-A1', '');
    let value = '';
    for (const [i, ch] of [...'S26-0002-B1'].entries()) { tr.key(ch, i * 8); tr.change(value, value + ch); value += ch; }
    expect(tr.method()).toBe('scan');
  });
});
