// Batch 630: the service behind the manual hrHPV entry. Permission, audit and the save are mocked at the edges; the rules run for real.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase, enforce, logEvent } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn(), enforce: vi.fn(), logEvent: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { decideManualHpvOverride, recordManualHpvResult } from './recordManualHpvResult';

const ANN = { id: 'u-1', name: 'Ann Lead' };
const BO = { id: 'u-2', name: 'Bo Path' };
let store: any;
const make = (cytologyScreening: any) => ({ id: 'C-1', version: 1, specimens: [{ id: 'sp-1', label: 'A', cytologyScreening }] });
const saved = () => updateCase.mock.calls[updateCase.mock.calls.length - 1][1].specimens[0].cytologyScreening;

beforeEach(() => {
  getCase.mockReset(); updateCase.mockReset(); enforce.mockReset(); logEvent.mockReset();
  enforce.mockResolvedValue({ allowed: true }); logEvent.mockResolvedValue({ ok: true });
  store = make({});
  getCase.mockImplementation(async () => store);
  updateCase.mockImplementation(async (_id: string, parts: any) => { store = { ...store, ...parts, version: store.version + 1 }; return store; });
});

const record = (over: any = {}) => recordManualHpvResult({ caseId: 'C-1', specimenLetter: 'A', result: 'Positive', source: 'MANUAL_PAPER_REPORT', actor: ANN, ...over });

describe('recordManualHpvResult', () => {
  it('checks the capability first and does nothing without it', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect(await record()).toEqual({ outcome: 'refused' });
    expect(enforce).toHaveBeenCalledWith('cytology:hpv-result:record-manual', { caseId: 'C-1' });
    expect(updateCase).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('refuses a missing source and writes nothing', async () => {
    expect(await record({ source: '' })).toEqual({ outcome: 'source-required' });
    expect(await record({ source: 'INTERFACE' })).toEqual({ outcome: 'source-required' });
    expect(updateCase).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('records straight away when there is no interface result, with the source, history and an audit line', async () => {
    const out = await record();
    expect(out.outcome).toBe('recorded');
    expect(saved()).toMatchObject({ hpvResult: 'Positive', hpvResultSource: 'MANUAL_PAPER_REPORT' });
    expect(saved().hpvManualEntries).toHaveLength(1);
    const entry = logEvent.mock.calls[0][0];
    expect(entry).toMatchObject({ type: 'user', event: 'Manual hrHPV Result Entered', user: 'Ann Lead', caseId: 'C-1' });
    expect(entry.detail).toMatch(/u-1/);
    expect(entry.detail).toMatch(/MANUAL_PAPER_REPORT/);
    expect(entry.detail).toMatch(/previously none \(none\)/);
    expect(entry.detail).not.toMatch(/mrn|patient/i);
  });

  it('replacing an interface result waits for a second person and leaves the result alone', async () => {
    store = make({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE' });
    const out = await record({ source: 'MANUAL_DOWNTIME_OVERRIDE' });
    expect(out.outcome).toBe('pending-second-signoff');
    expect(saved()).toMatchObject({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE' });
    expect(saved().hpvPendingOverride).toMatchObject({ result: 'Positive', source: 'MANUAL_DOWNTIME_OVERRIDE', enteredById: 'u-1', previousResult: 'Invalid', previousSource: 'INTERFACE' });
    expect(logEvent.mock.calls[0][0].event).toBe('Manual hrHPV Result Awaiting Second Sign-Off');
  });

  it('a second entry while one waits is refused', async () => {
    store = make({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE' });
    await record();
    expect(await record({ actor: BO })).toEqual({ outcome: 'already-pending' });
  });

  it('reports a missing case or specimen', async () => {
    getCase.mockResolvedValueOnce(null);
    expect(await record()).toEqual({ outcome: 'case-not-found' });
    expect(await record({ specimenLetter: 'Z' })).toEqual({ outcome: 'specimen-not-found' });
  });
});

describe('decideManualHpvOverride', () => {
  const decide = (over: any = {}) => decideManualHpvOverride({ caseId: 'C-1', specimenLetter: 'A', decision: 'approved', actor: BO, ...over });
  beforeEach(async () => {
    store = make({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE' });
    await record();
    logEvent.mockClear(); updateCase.mockClear();
  });

  it('the person who entered it cannot approve it', async () => {
    expect(await decide({ actor: ANN })).toEqual({ outcome: 'same-user' });
    expect(updateCase).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('needs the capability too', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect(await decide()).toEqual({ outcome: 'refused' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a different authorised person approves: the entry applies and both people are in the audit trail', async () => {
    expect(await decide()).toEqual({ outcome: 'approved' });
    expect(saved()).toMatchObject({ hpvResult: 'Positive', hpvResultSource: 'MANUAL_PAPER_REPORT' });
    expect(saved().hpvPendingOverride).toBeUndefined();
    const entry = logEvent.mock.calls[0][0];
    expect(entry).toMatchObject({ event: 'Manual hrHPV Result Override Approved', user: 'Bo Path' });
    expect(entry.detail).toMatch(/entered by u-1/);
    expect(entry.detail).toMatch(/approved by u-2/);
  });

  it('rejecting keeps the interface result', async () => {
    expect(await decide({ decision: 'rejected' })).toEqual({ outcome: 'rejected' });
    expect(saved()).toMatchObject({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE' });
    expect(saved().hpvPendingOverride).toBeUndefined();
    expect(logEvent.mock.calls[0][0].event).toBe('Manual hrHPV Result Override Rejected');
  });

  it('nothing waiting is reported', async () => {
    await decide();
    expect(await decide()).toEqual({ outcome: 'no-pending' });
  });
});
