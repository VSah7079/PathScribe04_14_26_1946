import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyToxicologyResult } from './recordAutopsyToxicologyResult';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

const orderedAt = '2026-10-01T00:00:00Z';

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
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [],
      ancillaryHold: { active: true, reason: 'Toxicology pending (County ME Lab)', startedAt: orderedAt },
      toxicologyOrders: [{ id: 'tox-case-1-1', orderedAt, orderedByName: 'Dr. Reed', specimenDescription: 'Blood', analytesRequested: 'Ethanol panel', labName: 'County ME Lab', status: 'ordered' }],
    },
    ...overrides,
  } as Case;
}

const input = { orderId: 'tox-case-1-1', resultSummary: 'Ethanol 0.21 g/dL; no drugs of abuse detected.' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordAutopsyToxicologyResult', () => {
  it('a person without autopsy:toxicology:result cannot record it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyToxicologyResult('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('an unknown order id is refused, nothing saved', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyToxicologyResult('case-1', { ...input, orderId: 'tox-unknown' }, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'orderNotFound' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('an already-resulted order is refused (never overwrites a result)', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
      toxicologyOrders: [{ id: 'tox-case-1-1', orderedAt, orderedByName: 'Dr. Reed', specimenDescription: 'Blood', analytesRequested: 'Ethanol panel', labName: 'County ME Lab', status: 'resulted', resultedAt: '2026-10-02T00:00:00Z', resultSummary: 'already done' }],
    } as any }));
    const result = await recordAutopsyToxicologyResult('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'orderNotFound' });
  });

  it('a real result fills the order, clears the ancillary hold it started, and audits', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyToxicologyResult('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.toxicologyOrders[0]).toEqual(expect.objectContaining({ status: 'resulted', resultSummary: input.resultSummary }));
    expect(updates.autopsy.ancillaryHold.active).toBe(false);
    expect(updates.autopsy.ancillaryHold.endedAt).toBeDefined();
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_TOXICOLOGY_RESULTED' }));
  });

  it('does not clear a hold that has since moved on to a different reason', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [],
      ancillaryHold: { active: true, reason: 'Fixed-brain neuropathology examination', startedAt: '2026-10-03T00:00:00Z' },
      toxicologyOrders: [{ id: 'tox-case-1-1', orderedAt, orderedByName: 'Dr. Reed', specimenDescription: 'Blood', analytesRequested: 'Ethanol panel', labName: 'County ME Lab', status: 'ordered' }],
    } as any }));
    await recordAutopsyToxicologyResult('case-1', input, 'Dr. Reed');
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.ancillaryHold).toEqual({ active: true, reason: 'Fixed-brain neuropathology examination', startedAt: '2026-10-03T00:00:00Z' });
  });

  it('on a conflict, the result is re-applied to the newer case', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2 } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyToxicologyResult('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls[1][1].autopsy.toxicologyOrders[0].status).toBe('resulted');
  });
});
