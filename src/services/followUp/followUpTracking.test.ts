// Batch 454: follow-up tracking — which follow-ups are expected and where each stands.
import { describe, expect, it } from 'vitest';
import { clockStatus, filterFollowUpItems, resolveFollowUpItems, surgicalFollowUpArrivals, surgicalFollowUpReceivedBy, toFollowUpCaseInfo, type FollowUpCaseInfo } from './followUpTracking';
import { followUpKey, type FollowUpExpectation } from './followUpTypes';
import { followUpAlertRecipients, followUpAlertsDue } from './followUpAlerts';

const DAY = 86_400_000;
const NOW = new Date('2026-10-04T12:00:00Z');
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * DAY).toISOString();
const window = (startDaysAgo: number, length: number) => ({
  anchor: 'collection' as const, anchorUsed: 'collection' as const, windowDays: length, ruleSource: 'enterprise' as const,
  startsAt: daysFromNow(-startDaysAgo), endsAt: daysFromNow(length - startDaysAgo),
});

const pap = (id: string, w: ReturnType<typeof window>, candidates: FollowUpCaseInfo['specimens'][number]['cytologyCandidates'] = []): FollowUpCaseInfo => ({
  id, accession: `CY-${id}`, patientId: 'P1', facilityId: 'F1', finalizedBy: 'u-path',
  specimens: [{ id: `${id}-s1`, surgical: false, cytologyWindow: w, cytologyCandidates: candidates }],
});

const base = { expectations: [] as FollowUpExpectation[], records: [], now: NOW, warningDaysFor: () => 30 };

describe('clockStatus', () => {
  it('pending outside the warning period, dueSoon inside it, overdue after the due date', () => {
    expect(clockStatus(daysFromNow(45), NOW, 30)).toEqual({ status: 'pending', daysRemaining: 45, daysOverdue: null });
    expect(clockStatus(daysFromNow(30), NOW, 30).status).toBe('dueSoon');
    expect(clockStatus(daysFromNow(10), NOW, 30)).toEqual({ status: 'dueSoon', daysRemaining: 10, daysOverdue: null });
    expect(clockStatus(daysFromNow(-3), NOW, 30)).toEqual({ status: 'overdue', daysRemaining: null, daysOverdue: 3 });
  });
  it('no early warning when the warning period is 0', () => {
    expect(clockStatus(daysFromNow(1), NOW, 0).status).toBe('pending');
  });
  it('a few hours late already counts as one day overdue', () => {
    expect(clockStatus(new Date(NOW.getTime() - 3_600_000).toISOString(), NOW, 30).daysOverdue).toBe(1);
  });
});

describe('cytology follow-ups (abnormal sign-outs with a stored window)', () => {
  it('overdue when the window has passed and no histology was matched', () => {
    const [item] = resolveFollowUpItems({ ...base, cases: [pap('a', window(200, 180))] });
    expect(item).toMatchObject({ kind: 'cytology', caseId: 'a', status: 'overdue', daysOverdue: 20, accession: 'CY-a', signedOutBy: 'u-path' });
  });
  it('received when a histology case was matched; a dismissed match does not count', () => {
    const received = resolveFollowUpItems({ ...base, cases: [pap('a', window(200, 180), [{ candidateCaseId: 'h1' }])] })[0];
    expect(received).toMatchObject({ status: 'received', receivedCaseId: 'h1' });
    const dismissed = resolveFollowUpItems({ ...base, cases: [pap('a', window(200, 180), [{ candidateCaseId: 'h1', dismissedAsNotRelevant: true }])] })[0];
    expect(dismissed.status).toBe('overdue');
  });
  it('a disposition closes it, whatever the clock says', () => {
    const key = followUpKey('cytology', 'a', 'a-s1');
    const [item] = resolveFollowUpItems({ ...base, cases: [pap('a', window(200, 180))], records: [{ key, clinicianContacts: [], alertsSent: {}, disposition: { value: 'patientDeclined', recordedBy: 'u', recordedByName: 'U', recordedAt: NOW.toISOString() } }] });
    expect(item.status).toBe('closed');
  });
  it('a specimen without a window (a negative sign-out) expects nothing', () => {
    expect(resolveFollowUpItems({ ...base, cases: [{ ...pap('a', window(1, 180)), specimens: [{ id: 's', surgical: false }] }] })).toEqual([]);
  });
});

describe('surgical follow-ups (marked "follow-up expected" at sign-out)', () => {
  const biopsy: FollowUpCaseInfo = {
    id: 'b', accession: 'S-b', patientId: 'P1', facilityId: 'F1', finalizedBy: 'u-path',
    specimens: [{ id: 'b-s1', surgical: true, collectedAt: daysFromNow(-100), bodySite: 'Breast', laterality: 'Left' }],
  };
  const expectation: FollowUpExpectation = { id: 'e', caseId: 'b', specimenId: 'b-s1', window: window(100, 180), markedBy: 'u-path', markedByName: 'Dr P', markedAt: NOW.toISOString() };
  const later = (id: string, at: number, site?: string, laterality?: string, patientId = 'P1', surgical = true): FollowUpCaseInfo => ({
    id, accession: id, patientId, specimens: [{ id: `${id}-s`, surgical, collectedAt: daysFromNow(at), bodySite: site, laterality }],
  });

  it('pending while the window is open and nothing arrived', () => {
    expect(resolveFollowUpItems({ ...base, cases: [biopsy], expectations: [expectation] })[0]).toMatchObject({ kind: 'surgical', status: 'pending', daysRemaining: 80 });
  });
  it('received by a later surgical specimen for the same patient, same site, inside the window', () => {
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10, 'breast', 'left')])).toBe('r');
  });
  it('a specimen with no site to compare is only a possible match: it does not close the follow-up', () => {
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10)])).toBeUndefined();
    expect(surgicalFollowUpArrivals(expectation, [biopsy, later('r', -10)])).toEqual({ receivedCaseId: undefined, possibleCaseId: 'r' });
    const [item] = resolveFollowUpItems({ ...base, cases: [biopsy, later('r', -10)], expectations: [expectation] });
    expect(item).toMatchObject({ status: 'pending', possibleCaseId: 'r', possibleAccession: 'r' });
  });
  it('a matched specimen wins over a possible one, and shows its accession', () => {
    const [item] = resolveFollowUpItems({ ...base, cases: [biopsy, later('p', -20), { ...later('m', -10, 'Breast'), accession: 'S26-0099' }], expectations: [expectation] });
    expect(item).toMatchObject({ status: 'received', receivedCaseId: 'm', receivedAccession: 'S26-0099', possibleCaseId: undefined });
  });
  it('a different site, the other side, another patient, a cytology specimen or one outside the window does not count', () => {
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10, 'Colon')])).toBeUndefined();
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10, 'Breast', 'Right')])).toBeUndefined();
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10, 'Breast', 'Left', 'P2')])).toBeUndefined();
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', -10, 'Breast', 'Left', 'P1', false)])).toBeUndefined();
    expect(surgicalFollowUpReceivedBy(expectation, [biopsy, later('r', 90, 'Breast', 'Left')])).toBeUndefined();
  });
  it('an expectation whose case is gone is skipped', () => {
    expect(resolveFollowUpItems({ ...base, cases: [], expectations: [expectation] })).toEqual([]);
  });
});

describe('sorting, filters and the case adapter', () => {
  it('most urgent first, and filters pick the right statuses', () => {
    const items = resolveFollowUpItems({ ...base, cases: [pap('late', window(200, 180)), pap('soon', window(170, 180)), pap('fine', window(10, 180)), pap('later', window(250, 180))] });
    expect(items.map(i => i.caseId)).toEqual(['later', 'late', 'soon', 'fine']);
    expect(filterFollowUpItems(items, 'attention').map(i => i.caseId)).toEqual(['later', 'late', 'soon']);
    expect(filterFollowUpItems(items, 'dueSoon').map(i => i.caseId)).toEqual(['soon']);
    expect(filterFollowUpItems(items, 'open')).toHaveLength(4);
    expect(filterFollowUpItems(items, 'resolved')).toHaveLength(0);
  });
  it('toFollowUpCaseInfo reads the stored window and order details', () => {
    const info = toFollowUpCaseInfo({
      id: 'c', accession: { accessionNumber: 'CY26-1', fullAccession: 'CY-26-1' }, patient: { id: 'P' }, finalizedBy: 'u',
      order: { facilityId: 'F', orderingPhysicianId: 'PH-1', requestingProvider: 'Dr Who' },
      specimens: [{ id: 's', cytologyScreening: { histologyCorrelationWindow: window(1, 180) }, collection: { bodySite: 'Cervix' } }],
    }, () => false);
    expect(info).toMatchObject({ accession: 'CY-26-1', patientId: 'P', facilityId: 'F', orderingPhysicianId: 'PH-1', requestingProvider: 'Dr Who' });
    expect(info.specimens[0]).toMatchObject({ surgical: false, bodySite: 'Cervix', cytologyWindow: { windowDays: 180 } });
  });
});

describe('internal alerts', () => {
  it('one due-soon and one overdue alert per follow-up, never repeated', () => {
    const items = resolveFollowUpItems({ ...base, cases: [pap('late', window(200, 180)), pap('soon', window(170, 180)), pap('fine', window(10, 180))] });
    expect(followUpAlertsDue(items).map(a => [a.item.caseId, a.level])).toEqual([['late', 'overdue'], ['soon', 'dueSoon']]);
    const sent = items.map(i => ({ ...i, record: { ...i.record, alertsSent: { dueSoon: 'x', overdue: i.status === 'overdue' ? 'x' : undefined } } }));
    expect(followUpAlertsDue(sent)).toEqual([]);
  });
  it('an overdue alert still goes out after a due-soon one; a due-soon one never follows an overdue one', () => {
    const [late] = resolveFollowUpItems({ ...base, cases: [pap('late', window(200, 180))] });
    expect(followUpAlertsDue([{ ...late, record: { ...late.record, alertsSent: { dueSoon: 'x' } } }])).toHaveLength(1);
  });
  it('goes to the sign-out pathologist and active Lab Directors and QA Reviewers, once each', () => {
    const users = [
      { id: 'u-path', roles: ['Pathologist'], status: 'Active' },
      { id: 'ld', roles: ['Lab Director', 'QA Reviewer'], status: 'Active' },
      { id: 'qa-off', roles: ['QA Reviewer'], status: 'Inactive' },
      { id: 'other', roles: ['Pathologist'], status: 'Active' },
    ];
    expect(followUpAlertRecipients({ signedOutBy: 'u-path' }, users).map(u => u.id)).toEqual(['u-path', 'ld']);
  });
});
