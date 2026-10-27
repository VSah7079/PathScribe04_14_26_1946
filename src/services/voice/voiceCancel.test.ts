import { describe, it, expect } from 'vitest';
import { decideCancel, CANCEL_CONFIRM_WINDOW_MS, type CancelState } from './voiceCancel';

const base: CancelState = { dictating: true, uncommitted: 2, commandPending: false, askedAt: null, now: 100_000 };

describe('decideCancel', () => {
  it('asks first when dictated text would be removed', () => {
    expect(decideCancel(base)).toBe('askConfirm');
  });
  it('removes it on the second Cancel inside the window, not after it', () => {
    expect(decideCancel({ ...base, askedAt: 100_000 - 1000 })).toBe('discardDictation');
    expect(decideCancel({ ...base, askedAt: 100_000 - CANCEL_CONFIRM_WINDOW_MS })).toBe('discardDictation');
    expect(decideCancel({ ...base, askedAt: 100_000 - CANCEL_CONFIRM_WINDOW_MS - 1 })).toBe('askConfirm');
  });
  it('ends dictation without asking when nothing was dictated', () => {
    expect(decideCancel({ ...base, uncommitted: 0 })).toBe('stopDictation');
  });
  it('drops a command waiting to be said twice', () => {
    expect(decideCancel({ ...base, dictating: false, commandPending: true })).toBe('dropPendingCommand');
  });
  it('does nothing otherwise (it never closes windows or undoes committed work)', () => {
    expect(decideCancel({ ...base, dictating: false })).toBe('nothing');
  });
  it('dictation takes priority over a pending command', () => {
    expect(decideCancel({ ...base, commandPending: true })).toBe('askConfirm');
  });
});
