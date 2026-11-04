import { describe, expect, it } from 'vitest';
import {
  ACTIONS_FOR_STATE, allows, countBilling, countByState, countDeadlines, deadlineFlagOf, itemAllows, facilitiesIn, filterItems, linkedRefs, makeRef, parseRef,
  refsAllowing, sortItems, stateOf, summarizeResults, toItem,
} from './outboundQueueView';
import { OUTBOUND_FEEDS, OUTBOUND_STATES, type OutboundFeedEntry } from './outboundQueueTypes';

const e = (o: Partial<OutboundFeedEntry> = {}): OutboundFeedEntry => ({ id: 'a', status: 'QUEUED', queuedAt: '2026-10-01T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, kind: 'k', ...o });

describe('refs', () => {
  it('round-trips every feed', () => {
    for (const f of OUTBOUND_FEEDS) expect(parseRef(makeRef(f, 'x:1'))).toEqual({ feed: f, id: 'x:1' });
  });
  it('refuses a ref that is not one', () => {
    expect(parseRef('nope')).toBeNull();
    expect(parseRef('unknown:1')).toBeNull();
    expect(parseRef('result:')).toBeNull();
  });
});

describe('stateOf', () => {
  it('maps the queue statuses', () => {
    expect(stateOf(e(), false)).toBe('waiting');
    expect(stateOf(e({ status: 'FAILED' }), false)).toBe('failed');
    expect(stateOf(e({ status: 'FAILED', maxRetriesExceeded: true }), false)).toBe('failed');  // ops-2: no separate dead-lettered state; a failed message past its retries is simply Failed (retry stays available)
    expect(stateOf(e({ status: 'SENT' }), false)).toBe('sent');
    expect(stateOf(e({ status: 'SENT', acknowledgedAt: 'x' }), false)).toBe('acknowledged');
  });
  it('a hold wins over waiting and failed, never over sent', () => {
    expect(stateOf(e(), true)).toBe('held');
    expect(stateOf(e({ status: 'FAILED', maxRetriesExceeded: true }), true)).toBe('held');
    expect(stateOf(e({ status: 'SENT' }), true)).toBe('sent');
  });
  it('a registry rejection shows as rejected even though the message was sent, and closing wins over everything', () => {
    const rejected = e({ status: 'SENT', rejection: { errorCodes: ['E1'] } });
    expect(stateOf(rejected, false)).toBe('rejected');
    expect(stateOf(rejected, false, 'notReportable')).toBe('notReportable');
  });
});

describe('deadlineFlagOf', () => {
  it('maps the delivery schedule status to the queue flag', () => {
    expect(deadlineFlagOf({ state: 'near', dueAt: 'd' }, 'waiting')).toEqual({ dueAt: 'd', flag: 'dueSoon' });
    expect(deadlineFlagOf({ state: 'overdue', dueAt: 'd' }, 'rejected')?.flag).toBe('overdue');
    expect(deadlineFlagOf({ state: 'ok', dueAt: 'd' }, 'waiting')?.flag).toBe('ok');
  });
  it('flags only messages still open; none or missing is no deadline', () => {
    expect(deadlineFlagOf({ state: 'overdue', dueAt: 'd' }, 'acknowledged')?.flag).toBe('ok');
    expect(deadlineFlagOf({ state: 'overdue', dueAt: 'd' }, 'retracted')?.flag).toBe('ok');
    expect(deadlineFlagOf({ state: 'none', dueAt: null }, 'waiting')).toBeUndefined();
    expect(deadlineFlagOf(undefined, 'waiting')).toBeUndefined();
  });
});

describe('toItem', () => {
  it('carries the hold, rejection, deadline, link and transport, and no message text', () => {
    const item = toItem('registry', e({ id: 'r1', status: 'SENT', signedOutAt: '2026-10-01T00:00:00Z', transport: 'sftp', rejection: { errorCodes: ['E1', 'E2'], correctionDueAt: '2026-10-20T00:00:00Z' } }),
      { accessionNumber: 'S26-1', facilityId: 'f1', deadline: { state: 'overdue', dueAt: '2026-10-06T00:00:00.000Z' }, amendsRef: 'registry:r0' });
    expect(item).toMatchObject({ ref: 'registry:r1', destination: 'registry', state: 'rejected', transport: 'sftp', amendsRef: 'registry:r0', accessionNumber: 'S26-1', facilityId: 'f1' });
    expect(item.deadline?.flag).toBe('overdue');
    expect(item.rejection?.errorCodes).toEqual(['E1', 'E2']);
    expect(JSON.stringify(item)).not.toContain('message');
  });
  it('a closed message carries its reason, a held one its hold; scheduled time defaults to queued time', () => {
    const closed = toItem('registry', e(), { hold: { ref: 'registry:a', closed: 'notReportable', reason: 'duplicateSubmission', heldBy: 'u', heldAt: 'x' } });
    expect(closed.state).toBe('notReportable');
    expect(closed.closedReason).toBe('duplicateSubmission');
    const held = toItem('result', e(), { hold: { ref: 'result:a', reason: 'dataCheck', heldBy: 'u', heldAt: 'x' } });
    expect(held.hold).toMatchObject({ reason: 'dataCheck', heldBy: 'u' });
    expect(held.scheduledFor).toBe('2026-10-01T00:00:00Z');
  });
});

describe('filter, sort, count', () => {
  const items = [
    toItem('result', e({ id: '1', status: 'FAILED', retryCount: 2, caseId: 'S1' }), { accessionNumber: 'S26-100', facilityId: 'f1' }),
    toItem('billing', e({ id: '2', queuedAt: '2026-10-02T00:00:00Z', signedOutAt: '2026-10-01T00:00:00Z' }), { accessionNumber: 'S26-200', facilityId: 'f2', deadline: { state: 'near', dueAt: '2026-10-13T00:00:00.000Z' } }),
    toItem('registry', e({ id: '3', status: 'SENT', acknowledgedAt: 'x', queuedAt: '2026-10-03T00:00:00Z' }), { facilityId: 'f1' }),
    toItem('patient_adt', e({ id: '4', queuedAt: '2026-10-04T00:00:00Z' })),
  ];
  it('filters by feed, state, facility, search and deadline', () => {
    expect(filterItems(items, { feeds: ['result', 'billing'] }).map(i => i.id)).toEqual(['1', '2']);
    expect(filterItems(items, { states: ['acknowledged'] }).map(i => i.id)).toEqual(['3']);
    expect(filterItems(items, { facilityIds: ['f1'] }).map(i => i.id)).toEqual(['1', '3']);
    expect(filterItems(items, { search: 's26-2' }).map(i => i.id)).toEqual(['2']);
    expect(filterItems(items, { deadlines: ['dueSoon'] }).map(i => i.id)).toEqual(['2']);
    expect(filterItems(items, {}).length).toBe(4);
  });
  it('a facility filter leaves out items with no known facility', () => {
    expect(filterItems(items, { facilityIds: ['f1', 'f2'] }).map(i => i.id)).not.toContain('4');
  });
  it('sorts problems first by state, and by deadline with undated last', () => {
    expect(sortItems(items).map(i => i.id)).toEqual(['1', '2', '4', '3']);
    expect(sortItems(items, { key: 'deadline', direction: 'asc' }).map(i => i.id)[0]).toBe('2');
    expect(sortItems(items, { key: 'queuedAt', direction: 'desc' }).map(i => i.id)).toEqual(['4', '3', '2', '1']);
    expect(sortItems(items, { key: 'attempts', direction: 'desc' })[0].id).toBe('1');
  });
  it('counts every state (zeros included) and the deadlines', () => {
    const c = countByState(items);
    expect(Object.keys(c).sort()).toEqual([...OUTBOUND_STATES].sort());
    expect(c).toMatchObject({ failed: 1, waiting: 2, acknowledged: 1, rejected: 0 });
    expect(countDeadlines(items)).toEqual({ dueSoon: 1, overdue: 0 });
    expect(facilitiesIn(items)).toEqual(['f1', 'f2']);
  });
});

describe('no dead-lettered state (ops-2)', () => {
  it('is not one of the states, the tiles or the sort order', () => {
    expect((OUTBOUND_STATES as readonly string[]).includes('deadLettered')).toBe(false);
  });
});

describe('actions by state', () => {
  it('holds what has not gone, releases what is held, retries what failed, and closes only a rejection', () => {
    expect(ACTIONS_FOR_STATE.waiting).toEqual(['hold', 'retract', 'overrideRelease']);
    expect(allows('held', 'release')).toBe(true);
    expect(allows('held', 'retry')).toBe(false);
    expect(allows('failed', 'retry')).toBe(true);
    expect(allows('rejected', 'markNotReportable')).toBe(true);
    expect(allows('failed', 'markNotReportable')).toBe(false);
    expect(allows('sent', 'hold') || allows('acknowledged', 'retry') || allows('notReportable', 'release')).toBe(false);
  });
  it('picks the selected refs that can take an action', () => {
    const items = [toItem('result', e({ id: '1' })), toItem('result', e({ id: '2', status: 'FAILED' }))];
    expect(refsAllowing(items, new Set(['result:1', 'result:2']), 'retry')).toEqual(['result:2']);
    expect(refsAllowing(items, new Set(), 'hold')).toEqual([]);
  });
  it('summarises a bulk result', () => {
    expect(summarizeResults([{ ref: 'a', ok: true }, { ref: 'b', ok: false, refusal: 'notHeld' }, { ref: 'c', ok: false, refusal: 'notHeld' }, { ref: 'd', ok: false }]))
      .toEqual({ succeeded: 1, refused: { notHeld: 2, failed: 1 } });
  });
  it('links an amendment to its original', () => {
    const items = [toItem('registry', e({ id: '1' })), toItem('registry', e({ id: '2' }), { amendsRef: 'registry:1' })];
    expect(linkedRefs(items, 'registry:2').amends).toBe('registry:1');
    expect(linkedRefs(items, 'registry:1').amendedBy).toEqual(['registry:2']);
  });
});

describe('billing items', () => {
  const charge = (o: Partial<OutboundFeedEntry> = {}) => toItem('billing', e({ id: 'c', kind: 'TC', billing: { billingType: 'TC' }, ...o }), { scheduledFor: '2026-10-12T00:00:00Z' });
  it('carries the billing type, the schedule time and the review flags', () => {
    const i = charge({ billing: { billingType: '26', needsReview: 'missingTechnicalFacility', amendmentDelta: true } });
    expect(i.billing).toMatchObject({ billingType: '26', scheduledReleaseAt: '2026-10-12T00:00:00Z', needsReview: 'missingTechnicalFacility', amendmentDelta: true });
  });
  it('a retracted charge is terminal, with its reason code, and takes no action', () => {
    const i = toItem('billing', e({ id: 'c' }), { hold: { ref: 'billing:c', closed: 'retracted', reason: 'caseAmended', heldBy: 'u1', heldAt: 'x' } });
    expect(i.state).toBe('retracted');
    expect(i.billing?.retraction).toEqual({ reasonCode: 'caseAmended' });
    expect((['hold', 'release', 'retry', 'retract', 'overrideRelease', 'markNotReportable'] as const).some(a => itemAllows(i, a))).toBe(false);
    expect(toItem('billing', e({ billing: { retraction: { reasonCode: 'duplicateCharge' } } })).state).toBe('retracted');
  });
  it('an override record shows who released it and is not a hold', () => {
    const i = toItem('billing', e({ id: 'c' }), { hold: { ref: 'billing:c', override: true, reason: 'other', heldBy: 'u7', heldAt: 'x' } });
    expect(i.state).toBe('waiting');
    expect(i.billing?.overriddenBy).toBe('u7');
    expect(i.hold).toBeUndefined();
  });
  it('a hold the feed keeps itself shows as held', () => {
    expect(toItem('billing', e({ hold: { reason: 'billingReview', heldBy: 'u', heldAt: 'x' } })).state).toBe('held');
  });
  it('retract and override-release are billing only', () => {
    expect(itemAllows(charge(), 'retract')).toBe(true);
    expect(itemAllows(charge(), 'overrideRelease')).toBe(true);
    expect(itemAllows(toItem('result', e()), 'retract')).toBe(false);
    expect(itemAllows(toItem('result', e()), 'overrideRelease')).toBe(false);
    expect(itemAllows(toItem('billing', e({ status: 'SENT' })), 'retract')).toBe(false);
  });
  it('counts what waits for a person, and filters to it', () => {
    const items = [charge({ billing: { needsReview: 'unmappedCpt' } }), charge({ id: 'd', billing: { needsReview: 'amendmentDelta', amendmentDelta: true } }), charge({ id: 'z', status: 'SENT', billing: { needsReview: 'unmappedCpt' } }), toItem('result', e())];
    expect(countBilling(items)).toEqual({ needsReview: 2, amendmentDelta: 1 });
    expect(filterItems(items, { needsReview: true }).length).toBe(3);
  });
});
