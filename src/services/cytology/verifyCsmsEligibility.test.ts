// Batch 636: the CSMS eligibility check. Permission, audit and the save are mocked at the edges; the rules run for real.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase, enforce, logEvent } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn(), enforce: vi.fn(), logEvent: vi.fn() }));
vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { verifyCsmsEligibility } from './verifyCsmsEligibility';

const ACTOR = { id: 'u-1', name: 'Pat QA' };
let store: any;
const flag = (over: object = {}) => ({ id: 'fl-1', flagDefinitionId: 'f36', appliedAt: 'x', appliedBy: 'system', source: 'system', deletedAt: null, deletedBy: null, ...over });

beforeEach(() => {
  getCase.mockReset(); updateCase.mockReset(); enforce.mockReset(); logEvent.mockReset();
  enforce.mockResolvedValue({ allowed: true }); logEvent.mockResolvedValue({ ok: true });
  store = { id: 'C-1', version: 1, caseFlags: [flag(), { ...flag({ id: 'fl-2', flagDefinitionId: 'f01' }) }] };
  getCase.mockImplementation(async () => store);
  updateCase.mockImplementation(async (_id: string, parts: any) => { store = { ...store, ...parts, version: store.version + 1 }; return store; });
});

describe('verifyCsmsEligibility', () => {
  it('needs the capability for the case, and does nothing when refused', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect(await verifyCsmsEligibility({ caseId: 'C-1', decision: { kind: 'verified' }, actor: ACTOR })).toBe('refused');
    expect(enforce).toHaveBeenCalledWith('cytology:csms-eligibility:verify', { caseId: 'C-1' });
    expect(updateCase).not.toHaveBeenCalled();
  });
  it('verified clears only the open f36 flag and audits it', async () => {
    expect(await verifyCsmsEligibility({ caseId: 'C-1', decision: { kind: 'verified' }, actor: ACTOR })).toBe('recorded');
    expect(store.caseFlags[0]).toMatchObject({ id: 'fl-1', deletedBy: 'Pat QA' });
    expect(store.caseFlags[0].deletedAt).toBeTruthy();
    expect(store.caseFlags[1].deletedAt).toBeNull();
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'CSMS_ELIGIBILITY_VERIFIED', caseId: 'C-1', user: 'Pat QA' }));
  });
  it('not eligible takes a reason, clears the flag and audits the reason', async () => {
    expect(await verifyCsmsEligibility({ caseId: 'C-1', decision: { kind: 'not_eligible', reason: 'ceased' }, actor: ACTOR })).toBe('recorded');
    expect(logEvent.mock.calls[0][0]).toMatchObject({ event: 'CSMS_ELIGIBILITY_NOT_ELIGIBLE' });
    expect(logEvent.mock.calls[0][0].detail).toContain('ceased from the programme');
  });
  it('a not-eligible answer with no valid reason is refused before anything is saved', async () => {
    expect(await verifyCsmsEligibility({ caseId: 'C-1', decision: { kind: 'not_eligible', reason: 'nope' as never }, actor: ACTOR })).toBe('reason-required');
    expect(updateCase).not.toHaveBeenCalled();
  });
  it('a case with no open flag, or no case, says so', async () => {
    store = { id: 'C-1', version: 1, caseFlags: [flag({ deletedAt: 'earlier' })] };
    expect(await verifyCsmsEligibility({ caseId: 'C-1', decision: { kind: 'verified' }, actor: ACTOR })).toBe('nothing-to-verify');
    expect(logEvent).not.toHaveBeenCalled();
    getCase.mockResolvedValue(null);
    expect(await verifyCsmsEligibility({ caseId: 'C-9', decision: { kind: 'verified' }, actor: ACTOR })).toBe('case-not-found');
  });
});
