import { describe, expect, it } from 'vitest';
import {
  buildClientSlaRows, clientSlaAudit, evaluateCaseSla, openCaseSlaBreaches, slaTargetHours, validateClientSla,
  type CaseForSla,
} from './clientSlaRules';
import type { ClientSLA } from './IClientSLAService';

const SLA = (over: Partial<ClientSLA> = {}): ClientSLA => ({
  id: 's1', assigningAuthority: 'NCL', clientName: 'North Clinic', firstTouchTargetHrs: 4, totalTatTargetHrs: 48, active: true, ...over,
});
const FAC = [{ id: 'f1', name: 'North Clinic', assigningAuthority: 'ncl' }, { id: 'f2', name: 'Other', assigningAuthority: 'OTH' }];
const H = 3600 * 1000;
const t0 = new Date('2026-10-14T08:00:00Z').getTime();
const at = (hrs: number) => new Date(t0 + hrs * H).toISOString();
const C = (id: string, over: Partial<CaseForSla> = {}): CaseForSla => ({ id, order: { facilityId: 'f1', receivedDate: at(0), priority: 'ROUTINE' }, ...over });

describe('validateClientSla', () => {
  const draft = { assigningAuthority: 'SCL', clientName: 'South', firstTouchTargetHrs: 4, totalTatTargetHrs: 24, active: true };
  it('accepts a good one', () => expect(validateClientSla(draft, [SLA()])).toBeNull());
  it('needs authority, name, positive targets', () => {
    expect(validateClientSla({ ...draft, assigningAuthority: ' ' }, [])).toBe('authorityRequired');
    expect(validateClientSla({ ...draft, clientName: '' }, [])).toBe('clientNameRequired');
    expect(validateClientSla({ ...draft, firstTouchTargetHrs: 0 }, [])).toBe('targetInvalid');
  });
  it('refuses a duplicate authority (any case) but allows editing itself', () => {
    expect(validateClientSla({ ...draft, assigningAuthority: 'ncl' }, [SLA()])).toBe('duplicateAuthority');
    expect(validateClientSla({ ...draft, id: 's1', assigningAuthority: 'ncl' }, [SLA()])).toBeNull();
  });
  it('keeps first touch within total, including the STAT variants', () => {
    expect(validateClientSla({ ...draft, firstTouchTargetHrs: 30 }, [])).toBe('firstTouchExceedsTotal');
    expect(validateClientSla({ ...draft, statFirstTouchTargetHrs: 3, statTotalTatTargetHrs: 2 }, [])).toBe('firstTouchExceedsTotal');
    expect(validateClientSla({ ...draft, statTotalTatTargetHrs: -1 }, [])).toBe('statTargetInvalid');
  });
});

describe('slaTargetHours', () => {
  it('uses the STAT variant for a STAT case when there is one', () => {
    const s = SLA({ statFirstTouchTargetHrs: 1, statTotalTatTargetHrs: 8 });
    expect(slaTargetHours(s, 'firstTouch', true)).toBe(1);
    expect(slaTargetHours(s, 'total', true)).toBe(8);
    expect(slaTargetHours(s, 'total', false)).toBe(48);
    expect(slaTargetHours(SLA(), 'firstTouch', true)).toBe(4);
  });
});

describe('evaluateCaseSla', () => {
  const now = new Date(t0 + 60 * H);
  it('flags a late first touch and a late sign-out', () => {
    const r = evaluateCaseSla(C('a', { firstOpenedAt: at(6), diagnostic: { issuedDate: at(50) } }), SLA(), now)!;
    expect(r.firstTouchBreach).toBe(true);
    expect(r.totalBreach).toBe(true);
    expect(r.firstTouchRunning).toBe(false);
    expect(r.totalHrs).toBe(50);
  });
  it('is within target when both are on time', () => {
    const r = evaluateCaseSla(C('a', { firstOpenedAt: at(2), diagnostic: { issuedDate: at(30) } }), SLA(), now)!;
    expect(r.firstTouchBreach || r.totalBreach).toBe(false);
  });
  it('shows a breach that is still running on an open case', () => {
    const r = evaluateCaseSla(C('a'), SLA(), now)!;
    expect(r.firstTouchRunning).toBe(true);
    expect(r.totalRunning).toBe(true);
  });
  it('uses the STAT target for a STAT case', () => {
    const stat = C('a', { order: { facilityId: 'f1', receivedDate: at(0), priority: 'STAT' }, firstOpenedAt: at(2) });
    expect(evaluateCaseSla(stat, SLA({ statFirstTouchTargetHrs: 1 }), now)!.firstTouchBreach).toBe(true);
    expect(evaluateCaseSla(stat, SLA(), now)!.firstTouchBreach).toBe(false);
  });
  it('returns null without a received time', () => {
    expect(evaluateCaseSla({ id: 'x', order: { facilityId: 'f1' } }, SLA(), now)).toBeNull();
  });
});

describe('buildClientSlaRows', () => {
  const now = new Date(t0 + 60 * H);
  const cases = [
    C('a', { firstOpenedAt: at(2), diagnostic: { issuedDate: at(30) } }),
    C('b', { firstOpenedAt: at(9), diagnostic: { issuedDate: at(40) } }),
    C('c', { order: { facilityId: 'f2', receivedDate: at(0) }, firstOpenedAt: at(1), diagnostic: { issuedDate: at(5) } }),
  ];
  it('counts only the client\'s cases and marks a client with a breach as missed', () => {
    const rows = buildClientSlaRows(cases, [SLA()], FAC, now);
    expect(rows).toHaveLength(1);
    expect(rows[0].caseCount).toBe(2);
    expect(rows[0].firstTouch).toMatchObject({ within: 1, breached: 1, state: 'missed' });
    expect(rows[0].total).toMatchObject({ within: 2, breached: 0, state: 'met' });
    expect(rows[0].state).toBe('missed');
  });
  it('shows met when nothing breached, and no cases when the client sent none', () => {
    expect(buildClientSlaRows([cases[0]], [SLA()], FAC, now)[0].state).toBe('met');
    expect(buildClientSlaRows([cases[2]], [SLA()], FAC, now)[0].state).toBe('noCases');
  });
  it('skips an inactive SLA', () => {
    expect(buildClientSlaRows(cases, [SLA({ active: false })], FAC, now)).toEqual([]);
  });
});

describe('openCaseSlaBreaches', () => {
  const now = new Date(t0 + 60 * H);
  it('lists open cases past a target, total before first touch, and skips signed-out ones', () => {
    const open = C('open');
    const touched = C('touched', { firstOpenedAt: at(1) });
    const done = C('done', { firstOpenedAt: at(1), diagnostic: { issuedDate: at(70) } });
    const other = C('other', { order: { facilityId: 'f2', receivedDate: at(0) } });
    const m = openCaseSlaBreaches([open, touched, done, other], [SLA()], FAC, now);
    expect(m.get('open')).toBe('total');
    expect(m.get('touched')).toBe('total');
    expect(m.has('done')).toBe(false);
    expect(m.has('other')).toBe(false);
    const early = openCaseSlaBreaches([C('e')], [SLA({ totalTatTargetHrs: 100 })], FAC, now);
    expect(early.get('e')).toBe('firstTouch');
  });
});

describe('clientSlaAudit', () => {
  it('records the client and hours only', () => {
    const e = clientSlaAudit('added', SLA({ statFirstTouchTargetHrs: 1 }), 'Dr A');
    expect(e.event).toBe('CLIENT_SLA_CHANGED');
    expect(e.detail).toContain('NCL');
    expect(e.detail).toContain('STAT 1 h / 48 h');
    expect(e.detail).not.toContain('North Clinic');
  });
});
