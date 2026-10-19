import { describe, expect, it } from 'vitest';
import { resolveFieldToConfirm } from './synopticConfirmField';

const sugs = {
  a: { verification: 'unverified' as const },
  b: { verification: undefined },
  c: { verification: 'verified' as const },
  d: { verification: 'disputed' as const },
};

describe('resolveFieldToConfirm (PS-66)', () => {
  it('confirms the field the person is typing in', () => {
    expect(resolveFieldToConfirm('a', 'b', sugs)).toBe('a');
  });
  it('confirms the active field when the cursor is not in a field with a suggestion', () => {
    expect(resolveFieldToConfirm(null, 'b', sugs)).toBe('b');
    expect(resolveFieldToConfirm('zzz', 'a', sugs)).toBe('a');
  });
  it('treats a suggestion with no verification yet as unconfirmed', () => {
    expect(resolveFieldToConfirm('b', null, sugs)).toBe('b');
  });
  it('does nothing for a field already confirmed or overridden', () => {
    expect(resolveFieldToConfirm('c', 'd', sugs)).toBeNull();
  });
  it('does nothing when no field is chosen', () => {
    expect(resolveFieldToConfirm(null, null, sugs)).toBeNull();
  });
});
