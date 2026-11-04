// @vitest-environment happy-dom
// Batch 650: the listener acts on the registry's announcement and calls the button's own handler, once, only when allowed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

vi.mock('@/services', () => ({
  actionRegistryService: {
    onAction: (cb: (id: string) => void) => {
      const h = (e: Event) => { const id = (e as CustomEvent).detail?.id; if (id) cb(id); };
      window.addEventListener('VOICE_ACTION_TRIGGERED', h);
      return () => window.removeEventListener('VOICE_ACTION_TRIGGERED', h);
    },
  },
}));

import { useBottomBarActionEvents, type BottomBarActionEventsInput } from './useBottomBarActionEvents';

const say = (id: string) => window.dispatchEvent(new CustomEvent('VOICE_ACTION_TRIGGERED', { detail: { id } }));
const orch = { status: 'draft', reportingMode: 'orchestrator', allFinalized: true, hasUnfinishedGrossing: false };
const assist = { status: 'draft', reportingMode: 'assist', allFinalized: false, hasUnfinishedGrossing: false };
afterEach(() => { cleanup(); document.body.innerHTML = ''; });

function setup(over: Partial<BottomBarActionEventsInput> = {}) {
  const h = { signOutCase: vi.fn(), finalize: vi.fn(), finalizeAndNext: vi.fn(), requestAmendment: vi.fn(), history: vi.fn(), codes: vi.fn() };
  const input: BottomBarActionEventsInput = { state: orch, synopticFitPending: false, signOutAllowed: true, revisionAny: true, handlers: h, ...over };
  const view = renderHook((p: BottomBarActionEventsInput) => useBottomBarActionEvents(p), { initialProps: input });
  return { h, view, input };
}

describe('useBottomBarActionEvents', () => {
  it('Sign Out Case calls the button handler once (which opens the confirmation window, never signs by itself)', () => {
    const { h } = setup();
    say('SIGN_OUT');
    expect(h.signOutCase).toHaveBeenCalledTimes(1);
  });
  it('History, Go to Codes and Add Code call the History and Codes handlers', () => {
    const { h } = setup();
    say('OPEN_HISTORY'); say('GOTO_CODES'); say('VOICE_ADD_CODE');
    expect(h.history).toHaveBeenCalledTimes(1);
    expect(h.codes).toHaveBeenCalledTimes(2);
  });
  it('Sign Out and Next and Finalise call the Assist buttons\' handlers', () => {
    const { h } = setup({ state: assist });
    say('SIGNOUT_NEXT'); say('OPEN_PRE_FINALISE');
    expect(h.finalizeAndNext).toHaveBeenCalledTimes(1);
    expect(h.finalize).toHaveBeenCalledTimes(1);
  });
  it('is ignored when greyed (no capability), and does not call a handler of another button', () => {
    const { h } = setup({ signOutAllowed: false });
    say('SIGN_OUT');
    expect(h.signOutCase).not.toHaveBeenCalled();
    expect(h.finalizeAndNext).not.toHaveBeenCalled();
  });
  it('is ignored while a window that owns focus is open', () => {
    const { h } = setup();
    document.body.innerHTML = '<div class="ps-overlay"></div>';
    say('SIGN_OUT'); say('OPEN_HISTORY');
    expect(h.signOutCase).not.toHaveBeenCalled();
    expect(h.history).not.toHaveBeenCalled();
  });
  it('reads the latest facts without resubscribing (a case whose grossing finishes is answered)', () => {
    const { h, view, input } = setup({ state: { ...orch, hasUnfinishedGrossing: true } });
    say('SIGN_OUT');
    expect(h.signOutCase).not.toHaveBeenCalled();
    view.rerender({ ...input, state: orch });
    say('SIGN_OUT');
    expect(h.signOutCase).toHaveBeenCalledTimes(1);
  });
  it('ignores ids it does not answer and stops listening on unmount', () => {
    const { h, view } = setup();
    say('POOL_ACCEPT_CASE');
    view.unmount();
    say('SIGN_OUT');
    expect(Object.values(h).every(f => f.mock.calls.length === 0)).toBe(true);
  });
});
