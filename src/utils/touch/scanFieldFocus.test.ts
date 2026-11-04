import { describe, it, expect } from 'vitest';
import { scanFieldShouldReclaim, scanFieldInputMode } from './scanFieldFocus';

const body = {} as Element;
const base = { active: body, body, dialogOpen: false, selectionActive: false, fieldVisible: true };

describe('when the scan field takes focus back (touch spec T1)', () => {
  it('only when nothing else has focus', () => {
    expect(scanFieldShouldReclaim(base)).toBe(true);
    expect(scanFieldShouldReclaim({ ...base, active: null })).toBe(true);
    expect(scanFieldShouldReclaim({ ...base, active: {} as Element })).toBe(false);
  });
  it('never while a window is open, text is selected, or the field is hidden', () => {
    expect(scanFieldShouldReclaim({ ...base, dialogOpen: true })).toBe(false);
    expect(scanFieldShouldReclaim({ ...base, selectionActive: true })).toBe(false);
    expect(scanFieldShouldReclaim({ ...base, fieldVisible: false })).toBe(false);
  });
  it('no on-screen keyboard unless typing', () => {
    expect(scanFieldInputMode(false)).toBe('none');
    expect(scanFieldInputMode(true)).toBe('text');
  });
});
