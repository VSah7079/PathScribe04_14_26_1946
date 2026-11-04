// Batch 619 (PS-800): the billing release rules plugged into the Outbound Queue's billing feed, and the amendment retraction.
import { describe, it, expect, vi } from 'vitest';
import { withBillingRelease, retractQueuedCharges, RULE_HELD_BY } from './billingReleaseFeed';
import { seedRules, type BillingChargeFacts } from './billingRelease';
import { createHoldStore } from '../outboundQueue/outboundHoldStore';
import type { IBillingFeedAdapter } from '../outboundQueue/billingFeedAdapter';
import type { OutboundFeedEntry, OutboundHold } from '../outboundQueue/outboundQueueTypes';

const entry = (id: string, o: Partial<OutboundFeedEntry> = {}): OutboundFeedEntry =>
  ({ id, status: 'QUEUED', queuedAt: '2026-10-19T08:00:00.000Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'c1', kind: '26', billing: { billingType: '26' }, ...o });
const inner = (items: OutboundFeedEntry[]): IBillingFeedAdapter & { retract: ReturnType<typeof vi.fn> } => ({
  listBillingItems: async () => items, hold: vi.fn(async () => true), release: vi.fn(async () => true), retry: vi.fn(async () => true), retract: vi.fn(async () => true),
});
const facts = (o: Partial<BillingChargeFacts> = {}) => async (): Promise<BillingChargeFacts | undefined> =>
  ({ billingType: '26', amended: false, amendmentDelta: false, cptMapped: true, technicalFacilityMissing: false, generatedAt: '2026-10-19T08:00:00.000Z', ...o });
const setup = (items: OutboundFeedEntry[], f: (e: OutboundFeedEntry) => Promise<BillingChargeFacts | undefined>, holds: OutboundHold[] = []) => {
  const mem = [...holds];
  const store = createHoldStore(() => mem, h => { mem.splice(0, mem.length, ...h); });
  return withBillingRelease(inner(items), { rules: async () => seedRules(''), facts: f, holds: store, now: () => '2026-10-19T10:00:00.000Z' });
};

describe('withBillingRelease', () => {
  it('a professional charge not yet signed out is shown held by the rules, with no release time', async () => {
    const [i] = await setup([entry('a')], facts()).listBillingItems();
    expect(i.hold).toMatchObject({ reason: 'billingReview', heldBy: RULE_HELD_BY });
    expect(i.billing?.scheduledReleaseAt).toBeUndefined();
  });
  it('once signed out under the default it is not held and carries its release time', async () => {
    const [i] = await setup([entry('a')], facts({ signedOutAt: '2026-10-19T09:00:00.000Z' })).listBillingItems();
    expect(i.hold).toBeUndefined();
    expect(i.billing?.scheduledReleaseAt).toBe('2026-10-19T09:00:00.000Z');
  });
  it('a technical charge is not held', async () => {
    const [i] = await setup([entry('a', { billing: { billingType: 'TC' } })], facts({ billingType: 'TC' })).listBillingItems();
    expect(i.hold).toBeUndefined();
  });
  it('an unmapped CPT and an amendment delta are marked for review and held', async () => {
    const [a] = await setup([entry('a')], facts({ cptMapped: false, signedOutAt: '2026-10-19T09:00:00.000Z' })).listBillingItems();
    expect(a.billing?.needsReview).toBe('unmappedCpt');
    expect(a.hold?.heldBy).toBe(RULE_HELD_BY);
    const [b] = await setup([entry('b')], facts({ amendmentDelta: true, amended: true, signedOutAt: '2026-10-19T09:00:00.000Z' })).listBillingItems();
    expect(b.billing).toMatchObject({ needsReview: 'amendmentDelta', amendmentDelta: true });
  });
  it('a person\'s override releases ahead of the rules and is shown by user id', async () => {
    const override: OutboundHold = { ref: 'billing:a', override: true, reason: 'other', heldBy: 'user-7', heldAt: '2026-10-19T09:30:00.000Z' };
    const [i] = await setup([entry('a')], facts(), [override]).listBillingItems();
    expect(i.hold).toBeUndefined();
    expect(i.billing?.overriddenBy).toBe('user-7');
  });
  it('a hold the charge already has is kept, and sent charges and unknown facts pass through', async () => {
    const held = entry('a', { hold: { reason: 'downtime', heldBy: 'u1', heldAt: 'x' } });
    const sent = entry('b', { status: 'SENT' });
    const noFacts = entry('c');
    const out = await setup([held, sent, noFacts], async e => (e.id === 'c' ? undefined : (await facts()())), []).listBillingItems();
    expect(out[0].hold?.heldBy).toBe('u1');
    expect(out[1]).toEqual(sent);
    expect(out[2]).toEqual(noFacts);
  });
  it('hold, release, retry and retract pass straight through', async () => {
    const base = inner([]);
    const a = withBillingRelease(base, { rules: async () => [], facts: facts(), holds: createHoldStore(() => [], () => {}), now: () => '' });
    await a.release('x', { overriddenBy: 'u1' });
    expect(base.release).toHaveBeenCalledWith('x', { overriddenBy: 'u1' });
    await a.retract('x', 'caseAmended', 'u1');
    expect(base.retract).toHaveBeenCalledWith('x', 'caseAmended', 'u1');
  });
});

describe('retractQueuedCharges', () => {
  it('cancels the unsent charges of the amended case and names the sent ones', async () => {
    const base = inner([entry('a'), entry('b', { status: 'FAILED' }), entry('c', { status: 'SENT' }), entry('d', { caseId: 'c2' })]);
    const r = await retractQueuedCharges(base, 'c1', 'caseAmended', 'user-1');
    expect(r).toEqual({ retracted: ['a', 'b'], alreadySent: ['c'] });
    expect(base.retract).toHaveBeenCalledTimes(2);
    expect(base.retract).toHaveBeenCalledWith('a', 'caseAmended', 'user-1');
  });
  it('reports only what the adapter actually retracted', async () => {
    const base = inner([entry('a'), entry('b')]);
    base.retract.mockResolvedValueOnce(false);
    expect((await retractQueuedCharges(base, 'c1', 'caseRetracted', 'u')).retracted).toEqual(['b']);
  });
});
