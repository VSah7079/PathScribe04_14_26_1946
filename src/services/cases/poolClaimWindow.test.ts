// Batch 650: Accept / Pass by voice or key press the claim window's buttons, under the same gates.
import { describe, it, expect } from 'vitest';
import { POOL_WINDOW_VOICE_CONTEXT, resolvePoolWindowAction, type PoolWindowFacts } from './poolClaimWindow';
import { mockActionRegistryService } from '../actionRegistry/mockActionRegistryService';

const ready: PoolWindowFacts = { step: 'ready', canClaim: true, canPass: true };

describe('resolvePoolWindowAction', () => {
  it('Accept case presses Accept, Pass case presses Pass, once the window is ready', () => {
    expect(resolvePoolWindowAction('POOL_ACCEPT_CASE', ready)).toBe('accept');
    expect(resolvePoolWindowAction('POOL_PASS_CASE', ready)).toBe('pass');
  });
  it('does nothing while the window is checking, blocked, asking for access, or already acting', () => {
    for (const step of ['claiming', 'blocked', 'access-denied', 'accepting', 'passing'] as const) {
      expect(resolvePoolWindowAction('POOL_ACCEPT_CASE', { ...ready, step })).toBeNull();
      expect(resolvePoolWindowAction('POOL_PASS_CASE', { ...ready, step })).toBeNull();
    }
  });
  it('is ignored when the button is greyed: Accept needs case:pool:claim, Pass needs case:pool:pass', () => {
    expect(resolvePoolWindowAction('POOL_ACCEPT_CASE', { ...ready, canClaim: false })).toBeNull();
    expect(resolvePoolWindowAction('POOL_PASS_CASE', { ...ready, canPass: false })).toBeNull();
    expect(resolvePoolWindowAction('POOL_PASS_CASE', { ...ready, canClaim: false })).toBe('pass');
  });
  it('ignores other ids', () => {
    expect(resolvePoolWindowAction('SIGN_OUT', ready)).toBeNull();
  });
});

describe('the context the window takes', () => {
  it('is the one the registry files Accept and Pass under, so they are eligible over the Worklist', () => {
    for (const id of ['POOL_ACCEPT_CASE', 'POOL_PASS_CASE']) {
      expect(mockActionRegistryService.getActionById(id)?.category).toBe(POOL_WINDOW_VOICE_CONTEXT);
    }
  });
});
