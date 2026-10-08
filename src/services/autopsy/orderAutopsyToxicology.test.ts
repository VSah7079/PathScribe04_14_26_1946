import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { orderAutopsyToxicology } from './orderAutopsyToxicology';
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
    autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false } },
    ...overrides,
  } as Case;
}

const input = { specimenDescription: 'Postmortem blood and vitreous fluid', specimenBarcode: 'TOX-2026-0042', analytesRequested: 'Ethanol, common drugs of abuse panel', labName: 'County ME Toxicology Lab' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('orderAutopsyToxicology', () => {
  it('a person without autopsy:toxicology:order cannot order it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await orderAutopsyToxicology('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('an unknown caseId returns an honest error', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await orderAutopsyToxicology('case-unknown', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
  });

  it('a real order appends to toxicologyOrders, sets ancillaryHold active, and audits', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await orderAutopsyToxicology('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.toxicologyOrders).toHaveLength(1);
    expect(updates.autopsy.toxicologyOrders[0]).toEqual(expect.objectContaining({
      specimenDescription: input.specimenDescription, specimenBarcode: input.specimenBarcode, analytesRequested: input.analytesRequested, labName: input.labName, status: 'ordered', orderedByName: 'Dr. Reed',
    }));
    expect(updates.autopsy.ancillaryHold.active).toBe(true);
    expect(updates.autopsy.ancillaryHold.reason).toContain('County ME Toxicology Lab');
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_TOXICOLOGY_ORDERED', caseId: 'case-1' }));
  });

  it('a missing or blank specimen barcode is refused before anything is saved', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await orderAutopsyToxicology('case-1', { ...input, specimenBarcode: '   ' }, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'missingBarcode' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a second order on the same case appends, not replaces, the first', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
      toxicologyOrders: [{ id: 'tox-case-1-1', orderedAt: '2026-10-01T00:00:00Z', orderedByName: 'Dr. Reed', specimenDescription: 'x', analytesRequested: 'y', labName: 'z', status: 'resulted', resultedAt: '2026-10-02T00:00:00Z', resultSummary: 'done' }],
    } as any }));
    await orderAutopsyToxicology('case-1', input, 'Dr. Reed');
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.toxicologyOrders).toHaveLength(2);
    expect(updates.autopsy.toxicologyOrders[1].id).toBe('tox-case-1-2');
  });

  it('on a conflict, the order is re-applied to the newer case', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2 } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await orderAutopsyToxicology('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls[1][1].autopsy.toxicologyOrders).toHaveLength(1);
  });
});
