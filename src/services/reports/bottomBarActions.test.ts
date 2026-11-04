// Batch 650: Sign Out Case, Sign Out and Next, Finalise, Request Amendment, History and Codes by voice or key.
import { describe, it, expect } from 'vitest';
import { bottomBarCommandFor, bottomBarVisibility, resolveBottomBarCommand, BOTTOM_BAR_ACTION_IDS, type BottomBarCommandInputs, type BottomBarCaseState } from './bottomBarActions';

const orch: BottomBarCaseState = { status: 'draft', reportingMode: 'orchestrator', allFinalized: true, hasUnfinishedGrossing: false };
const assist: BottomBarCaseState = { status: 'draft', reportingMode: 'assist', allFinalized: false, hasUnfinishedGrossing: false };
const all = { signOutCase: true, signOutAndNext: true, finalize: true, finalizeAndNext: true, requestAmendment: true, history: true, codes: true };
const inputs = (over: Partial<BottomBarCommandInputs> = {}): BottomBarCommandInputs => ({
  state: orch, synopticFitPending: false, signOutAllowed: true, revisionAny: true, hasHandler: all, modalOpen: false, ...over,
});

describe('which bottom-bar button an id stands for', () => {
  it('maps every id the bar answers, and nothing else', () => {
    expect(BOTTOM_BAR_ACTION_IDS.map(bottomBarCommandFor)).toEqual(['signOutCase', 'finalizeAndNext', 'finalize', 'requestAmendment', 'history', 'codes', 'codes']);
    expect(bottomBarCommandFor('POOL_ACCEPT_CASE')).toBeNull();
  });
});

describe('bottomBarVisibility (the same decision draws the buttons)', () => {
  it('Orchestration: Sign Out Case from the draft reports once grossing is done, not before', () => {
    expect(bottomBarVisibility(orch).signOutCase).toBe(true);
    expect(bottomBarVisibility({ ...orch, allFinalized: false }).signOutCase).toBe(true);
    expect(bottomBarVisibility({ ...orch, hasUnfinishedGrossing: true }).signOutCase).toBe(false);
  });
  it('no Sign Out Case in the recall window (it would skip the release buffer), when finalized, or for a pool case', () => {
    expect(bottomBarVisibility({ ...orch, status: 'pending-release' }).signOutCase).toBe(false);
    expect(bottomBarVisibility({ ...orch, status: 'finalized' }).signOutCase).toBe(false);
    expect(bottomBarVisibility({ ...orch, status: 'pool' }).signOutCase).toBe(false);
  });
  it('Assist: Finalise and Finalise & Next instead of Sign Out Case; none while grossing is unfinished', () => {
    const v = bottomBarVisibility(assist);
    expect(v).toMatchObject({ signOutCase: false, finalize: true, finalizeAndNext: true });
    expect(bottomBarVisibility({ ...assist, hasUnfinishedGrossing: true })).toMatchObject({ finalize: false, finalizeAndNext: false });
    expect(bottomBarVisibility({ ...orch, reportingMode: undefined }).signOutCase).toBe(true); // a missing mode is not Assist
  });
  it('a pool case shows neither History nor Codes; a finalized case shows Request Amendment', () => {
    expect(bottomBarVisibility({ ...orch, status: 'pool' })).toMatchObject({ history: false, codes: false });
    expect(bottomBarVisibility({ ...orch, status: 'finalized' }).requestAmendment).toBe(true);
    expect(bottomBarVisibility(orch).requestAmendment).toBe(false);
  });
});

describe('Sign Out Case (SIGN_OUT, Alt+Shift+X)', () => {
  it('presses the Sign Out Case button when it is showing and enabled', () => {
    expect(resolveBottomBarCommand('SIGN_OUT', inputs())).toBe('signOutCase');
  });
  it('is ignored when the button is not showing', () => {
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ state: { ...orch, hasUnfinishedGrossing: true } }))).toBeNull();
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ state: { ...orch, status: 'pending-release' } }))).toBeNull();
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ state: assist }))).toBeNull();
  });
  it('is ignored when the button is greyed: no capability, or the report layout is still being fitted', () => {
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ signOutAllowed: false }))).toBeNull();
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ synopticFitPending: true }))).toBeNull();
  });
  it('is ignored while a window that owns focus is open (including the sign-out window itself)', () => {
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ modalOpen: true }))).toBeNull();
  });
  it('is ignored when the screen supplied no handler', () => {
    expect(resolveBottomBarCommand('SIGN_OUT', inputs({ hasHandler: { ...all, signOutCase: false } }))).toBeNull();
  });
});

describe('Sign Out and Next (SIGNOUT_NEXT) and Finalise (OPEN_PRE_FINALISE)', () => {
  it('press Finalise & Next / Finalise where the buttons exist (Assist)', () => {
    expect(resolveBottomBarCommand('SIGNOUT_NEXT', inputs({ state: assist }))).toBe('finalizeAndNext');
    expect(resolveBottomBarCommand('OPEN_PRE_FINALISE', inputs({ state: assist }))).toBe('finalize');
  });
  it('Sign Out and Next in Orchestration presses its own button (Batch 664, Pete); Finalise still does nothing there', () => {
    expect(resolveBottomBarCommand('SIGNOUT_NEXT', inputs())).toBe('signOutAndNext');
    expect(resolveBottomBarCommand('SIGNOUT_NEXT', inputs({ hasHandler: { ...all, signOutAndNext: false } }))).toBeNull();
    expect(resolveBottomBarCommand('SIGNOUT_NEXT', inputs({ state: { ...orch, status: 'pending-release' } }))).toBeNull();
    expect(resolveBottomBarCommand('OPEN_PRE_FINALISE', inputs())).toBeNull();
  });
  it('the Orchestration button shows exactly when Sign Out Case does', () => {
    for (const s of [orch, assist, { ...orch, status: 'pool' }, { ...orch, status: 'finalized' }, { ...orch, hasUnfinishedGrossing: true }, { ...orch, status: 'pending-release' }]) {
      const v = bottomBarVisibility(s);
      expect(v.signOutAndNext).toBe(v.signOutCase);
    }
  });
  it('follow the same capability, layout and window gates as the button', () => {
    for (const id of ['SIGNOUT_NEXT', 'OPEN_PRE_FINALISE']) {   // Assist; the Orchestration button has the same gates through signOutCase
      expect(resolveBottomBarCommand(id, inputs({ state: assist, signOutAllowed: false }))).toBeNull();
      expect(resolveBottomBarCommand(id, inputs({ state: assist, synopticFitPending: true }))).toBeNull();
      expect(resolveBottomBarCommand(id, inputs({ state: assist, modalOpen: true }))).toBeNull();
      expect(resolveBottomBarCommand(id, inputs({ state: { ...assist, hasUnfinishedGrossing: true } }))).toBeNull();
    }
  });
});

describe('Request Amendment (ADD_AMENDMENT)', () => {
  const finalized = { ...orch, status: 'finalized' };
  it('presses the button on a finalized case when a revision kind may be released', () => {
    expect(resolveBottomBarCommand('ADD_AMENDMENT', inputs({ state: finalized }))).toBe('requestAmendment');
  });
  it('is ignored when no kind may be released (the button is disabled) or the case is not finalized', () => {
    expect(resolveBottomBarCommand('ADD_AMENDMENT', inputs({ state: finalized, revisionAny: false }))).toBeNull();
    expect(resolveBottomBarCommand('ADD_AMENDMENT', inputs())).toBeNull();
  });
});

describe('History (OPEN_HISTORY), Go to Codes (GOTO_CODES) and Add Code (VOICE_ADD_CODE)', () => {
  it('press the History and Codes buttons; both code commands open the Codes window', () => {
    expect(resolveBottomBarCommand('OPEN_HISTORY', inputs())).toBe('history');
    expect(resolveBottomBarCommand('GOTO_CODES', inputs())).toBe('codes');
    expect(resolveBottomBarCommand('VOICE_ADD_CODE', inputs())).toBe('codes');
  });
  it('are ignored on a pool case (the buttons are hidden), with a window open, or without a handler', () => {
    for (const id of ['OPEN_HISTORY', 'GOTO_CODES', 'VOICE_ADD_CODE']) {
      expect(resolveBottomBarCommand(id, inputs({ state: { ...orch, status: 'pool' } }))).toBeNull();
      expect(resolveBottomBarCommand(id, inputs({ modalOpen: true }))).toBeNull();
      expect(resolveBottomBarCommand(id, inputs({ hasHandler: {} }))).toBeNull();
    }
  });
  it('need no sign-out capability (the buttons have none)', () => {
    expect(resolveBottomBarCommand('OPEN_HISTORY', inputs({ signOutAllowed: false }))).toBe('history');
    expect(resolveBottomBarCommand('GOTO_CODES', inputs({ signOutAllowed: false }))).toBe('codes');
  });
});
