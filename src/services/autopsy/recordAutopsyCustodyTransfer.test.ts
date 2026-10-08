import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyCustodyTransfer, resolveCurrentAutopsyCustodian, custodyEventsForToxicologyOrder } from './recordAutopsyCustodyTransfer';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-1',
    accession: { accessionNumber: 'A-2026-1' },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }],
    order: { priority: 'Routine' },
    status: 'draft',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full',
      addenda: [], ancillaryHold: { active: false },
    },
    ...overrides,
  } as Case;
}

const input = {
  itemDescription: 'Body',
  toCustodianType: 'medical_examiner' as const,
  toCustodianName: "County ME's Office",
  releasedByName: 'Tech: M. Davis',
};

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  logEvent.mockClear();
  enforce.mockResolvedValue({ allowed: true });
});

describe('recordAutopsyCustodyTransfer', () => {
  it('a person without autopsy:custody:transfer cannot record one, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyCustodyTransfer('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true });
    expect(enforce).toHaveBeenCalledWith('autopsy:custody:transfer', { caseId: 'case-1' });
    expect(getCase).not.toHaveBeenCalled();
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('refuses a hospital-consented case — custody logging is forensic-only', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false } } as any }));
    const result = await recordAutopsyCustodyTransfer('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real, unknown caseId returns an honest error, never a silent no-op', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await recordAutopsyCustodyTransfer('case-unknown', input, 'Dr. Reed');
    expect(result.ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('appends the first transfer starting FROM the pathology department default, and audits it', async () => {
    getCase.mockResolvedValue(baseCase({}));
    const result = await recordAutopsyCustodyTransfer('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog).toHaveLength(1);
    expect(updates.autopsy.custodyLog[0]).toMatchObject({
      itemDescription: 'Body',
      fromCustodianType: 'pathology_department',
      toCustodianType: 'medical_examiner',
      toCustodianName: "County ME's Office",
      releasedByName: 'Tech: M. Davis',
    });
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent.mock.calls[0][0]).toMatchObject({ event: 'AUTOPSY_CUSTODY_TRANSFER', caseId: 'case-1', user: 'Dr. Reed' });
  });

  it('a second transfer starts FROM whoever the last entry says received it, and is appended, never replacing the log', async () => {
    const priorEvent = {
      id: 'custody-case-1-1', occurredAt: '2026-10-01T00:00:00Z', itemDescription: 'Body',
      fromCustodianType: 'pathology_department', fromCustodianName: 'Pathology Department',
      toCustodianType: 'medical_examiner', toCustodianName: "County ME's Office",
      releasedByName: 'Tech: M. Davis',
    };
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, custodyLog: [priorEvent] } as any }));
    const result = await recordAutopsyCustodyTransfer('case-1', { ...input, toCustodianType: 'law_enforcement', toCustodianName: 'City PD' }, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog).toHaveLength(2);
    expect(updates.autopsy.custodyLog[0]).toEqual(priorEvent);
    expect(updates.autopsy.custodyLog[1]).toMatchObject({ fromCustodianType: 'medical_examiner', fromCustodianName: "County ME's Office", toCustodianType: 'law_enforcement' });
  });

  it('persists toxicologyOrderId when the transfer is of a specific toxicology specimen', async () => {
    getCase.mockResolvedValue(baseCase({}));
    const result = await recordAutopsyCustodyTransfer('case-1', { ...input, toxicologyOrderId: 'tox-case-1-1' }, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog[0]).toMatchObject({ toxicologyOrderId: 'tox-case-1-1' });
  });

  it('on a conflict, the transfer is appended to the newer case so a concurrent change survives', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, autopsy: { ...stale.autopsy!, custodyLog: [] } } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyCustodyTransfer('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([1, 2]);
  });
});

describe('resolveCurrentAutopsyCustodian', () => {
  it('defaults to the pathology department when the log is empty or undefined', () => {
    expect(resolveCurrentAutopsyCustodian(undefined)).toEqual({ type: 'pathology_department', name: 'Pathology Department' });
    expect(resolveCurrentAutopsyCustodian([])).toEqual({ type: 'pathology_department', name: 'Pathology Department' });
  });
  it('is whoever the last entry’s toCustodian is', () => {
    const log = [
      { id: '1', occurredAt: '', itemDescription: 'Body', fromCustodianType: 'pathology_department' as const, fromCustodianName: 'Pathology Department', toCustodianType: 'medical_examiner' as const, toCustodianName: "County ME's Office", releasedByName: 'A' },
      { id: '2', occurredAt: '', itemDescription: 'Body', fromCustodianType: 'medical_examiner' as const, fromCustodianName: "County ME's Office", toCustodianType: 'law_enforcement' as const, toCustodianName: 'City PD', releasedByName: 'B' },
    ];
    expect(resolveCurrentAutopsyCustodian(log)).toEqual({ type: 'law_enforcement', name: 'City PD' });
  });
});

describe('custodyEventsForToxicologyOrder', () => {
  const log = [
    { id: '1', occurredAt: '', itemDescription: 'Body', fromCustodianType: 'pathology_department' as const, fromCustodianName: 'Pathology Department', toCustodianType: 'medical_examiner' as const, toCustodianName: "County ME's Office", releasedByName: 'A' },
    { id: '2', occurredAt: '', itemDescription: 'Toxicology specimen', fromCustodianType: 'pathology_department' as const, fromCustodianName: 'Pathology Department', toCustodianType: 'other' as const, toCustodianName: 'County ME Toxicology Lab', releasedByName: 'A', toxicologyOrderId: 'tox-case-1-1' },
    { id: '3', occurredAt: '', itemDescription: 'Unrelated specimen', fromCustodianType: 'pathology_department' as const, fromCustodianName: 'Pathology Department', toCustodianType: 'other' as const, toCustodianName: 'Some other lab', releasedByName: 'A', toxicologyOrderId: 'tox-case-1-2' },
  ];
  it('returns only the entries linked to the given order, in log order', () => {
    expect(custodyEventsForToxicologyOrder(log, 'tox-case-1-1')).toEqual([log[1]]);
  });
  it('returns an empty array for an order with no linked entries, or an undefined log', () => {
    expect(custodyEventsForToxicologyOrder(log, 'tox-case-1-99')).toEqual([]);
    expect(custodyEventsForToxicologyOrder(undefined, 'tox-case-1-1')).toEqual([]);
  });
});
