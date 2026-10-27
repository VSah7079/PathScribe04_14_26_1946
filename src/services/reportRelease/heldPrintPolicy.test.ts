// Batch 654: the Release Hold Print Policy.
import { describe, it, expect } from 'vitest';
import { heldPrintOutcome, releaseHoldPolicyForCase, releaseHoldPrintPolicyOf } from './heldPrintPolicy';
import { planDocumentPrint, printPromptComplete } from '../printing/documentOutputAudit';

describe('heldPrintOutcome', () => {
  it('not on hold, or allow: print at once', () => {
    expect(heldPrintOutcome(null, false)).toEqual({ blocked: false, warn: false, askOverrideReason: false });
    expect(heldPrintOutcome('allow', false)).toEqual({ blocked: false, warn: false, askOverrideReason: false });
  });
  it('warn: warn and confirm, whoever prints', () => {
    expect(heldPrintOutcome('warn', false)).toEqual({ blocked: false, warn: true, askOverrideReason: false });
  });
  it('block: refused for everyone, even a person holding the override', () => {
    expect(heldPrintOutcome('block', true)).toEqual({ blocked: true, warn: false, askOverrideReason: false });
  });
  it('supervisor: refused without the capability; with it, a reason is required', () => {
    expect(heldPrintOutcome('supervisor', false).blocked).toBe(true);
    expect(heldPrintOutcome('supervisor', true)).toEqual({ blocked: false, warn: true, askOverrideReason: true });
  });
});

describe('releaseHoldPrintPolicyOf', () => {
  it('reads the new value, else the old switch, else warn', () => {
    expect(releaseHoldPrintPolicyOf({ releaseHoldPrintPolicy: 'block' })).toBe('block');
    expect(releaseHoldPrintPolicyOf({ restrictHardcopyPrinting: false })).toBe('allow');
    expect(releaseHoldPrintPolicyOf({ restrictHardcopyPrinting: true })).toBe('warn');
    expect(releaseHoldPrintPolicyOf({ releaseHoldPrintPolicy: 'nonsense' })).toBe('warn');
    expect(releaseHoldPrintPolicyOf(null)).toBe('warn');
  });
});

describe('releaseHoldPolicyForCase', () => {
  const deps = (policy: string) => ({ getOrgDefault: async () => ({ ok: true, data: { releaseHoldPrintPolicy: policy } }) });
  it('applies only to a Pending Release report', async () => {
    expect(await releaseHoldPolicyForCase({ status: 'finalized' }, deps('block'))).toBeNull();
    expect(await releaseHoldPolicyForCase({ status: 'pending-release' }, deps('block'))).toBe('block');
  });
  it('fails toward warn, never toward free printing, when the setting cannot be read', async () => {
    expect(await releaseHoldPolicyForCase({ status: 'pending-release' }, { getOrgDefault: async () => { throw new Error('x'); } })).toBe('warn');
  });
});

describe('the print plan under the policy', () => {
  it('a supervisor override needs a reason before the prompt completes', () => {
    const plan = planDocumentPrint({ printedBefore: false, requireReprintReason: false, held: heldPrintOutcome('supervisor', true) });
    expect(plan.askOverrideReason).toBe(true);
    expect(printPromptComplete(plan, ' ')).toBe(false);
    expect(printPromptComplete(plan, 'urgent clinic')).toBe(true);
  });
  it('a blocked plan carries blocked', () => {
    expect(planDocumentPrint({ printedBefore: false, requireReprintReason: false, held: heldPrintOutcome('block', false) }).blocked).toBe(true);
  });
});
