import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordMarginInkApplication } from './recordMarginInkApplication';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';
import type { Margin } from '@/types/case/Margin';

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-1',
    accession: { accessionNumber: 'A-2026-1' },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Breast excision', blocks: [{ id: 'blk-1', label: 'A1', status: 'Pending Cut', stains: [] }] }],
    order: { priority: 'Routine' },
    status: 'in-progress',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  } as Case;
}

const inkInput = { specimenId: 'sp-1', marginName: 'Lateral', orientation: 'lateral', colorCode: '#00AEEF', colorName: 'Blue' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordMarginInkApplication', () => {
  it('a person without grossing:margin-ink:record cannot record it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordMarginInkApplication('case-1', inkInput, 'Tech A');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('an unknown case is refused honestly', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await recordMarginInkApplication('case-1', inkInput, 'Tech A');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('an unknown specimen is refused honestly', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordMarginInkApplication('case-1', { ...inkInput, specimenId: 'sp-99' }, 'Tech A');
    expect(result).toMatchObject({ ok: false, reasonCode: 'specimenNotFound' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('creates a new margin (pending) on the specimen, with its first ink application, when no marginId is given', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordMarginInkApplication('case-1', inkInput, 'Tech A');
    expect(result.ok).toBe(true);
    expect(result.marginId).toBeDefined();
    const updates = updateCase.mock.calls[0][1];
    const margin: Margin = updates.specimens[0].margins[0];
    expect(margin).toEqual(expect.objectContaining({ name: 'Lateral', orientation: 'lateral', examinationStatus: 'pending' }));
    expect(margin.inkApplications).toHaveLength(1);
    expect(margin.inkApplications[0]).toEqual(expect.objectContaining({ colorCode: '#00AEEF', colorName: 'Blue', appliedByName: 'Tech A' }));
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'MARGIN_INK_APPLICATION_RECORDED', caseId: 'case-1' }));
  });

  it('creates the margin on the block, not the specimen, when blockId is given', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordMarginInkApplication('case-1', { ...inkInput, blockId: 'blk-1' }, 'Tech A');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.specimens[0].margins).toBeUndefined();
    expect(updates.specimens[0].blocks[0].margins).toHaveLength(1);
  });

  it('an unknown blockId is refused honestly', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordMarginInkApplication('case-1', { ...inkInput, blockId: 'blk-99' }, 'Tech A');
    expect(result).toMatchObject({ ok: false, reasonCode: 'blockNotFound' });
  });

  it('appends a second ink application to an existing margin, never overwriting the first or renaming the margin', async () => {
    const priorMargin: Margin = {
      id: 'margin-case-1-1', name: 'Lateral', orientation: 'lateral', examinationStatus: 'pending',
      inkApplications: [{ id: 'ink-1', colorCode: '#FFFFFF', colorName: 'White', appliedAt: '2026-09-01T00:00:00Z', appliedByName: 'Tech Prior' }],
    };
    getCase.mockResolvedValue(baseCase({
      specimens: [{ id: 'sp-1', label: 'A', description: 'Breast excision', margins: [priorMargin] }],
    } as any));
    const result = await recordMarginInkApplication('case-1', {
      specimenId: 'sp-1', marginId: 'margin-case-1-1', marginName: 'Should be ignored', colorCode: '#00AEEF', colorName: 'Blue',
    }, 'Tech A');
    expect(result.ok).toBe(true);
    expect(result.marginId).toBe('margin-case-1-1');
    const updates = updateCase.mock.calls[0][1];
    const margin: Margin = updates.specimens[0].margins[0];
    expect(margin.name).toBe('Lateral'); // never renamed
    expect(margin.inkApplications).toHaveLength(2);
    expect(margin.inkApplications[0]).toEqual(priorMargin.inkApplications[0]); // untouched
    expect(margin.inkApplications[1]).toEqual(expect.objectContaining({ colorCode: '#00AEEF', colorName: 'Blue' }));
  });

  it('an unknown marginId is refused honestly', async () => {
    getCase.mockResolvedValue(baseCase({ specimens: [{ id: 'sp-1', label: 'A', description: 'Breast excision', margins: [] }] } as any));
    const result = await recordMarginInkApplication('case-1', { ...inkInput, marginId: 'margin-nope' }, 'Tech A');
    expect(result).toMatchObject({ ok: false, reasonCode: 'marginNotFound' });
  });

  it('marks a margin examined when explicitly asked, leaving it alone otherwise', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordMarginInkApplication('case-1', { ...inkInput, examined: true }, 'Tech A');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls[0][1].specimens[0].margins[0].examinationStatus).toBe('examined');
  });

  it('on a conflict, the ink application is re-applied to the newer case, keeping what else changed in between', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, specimens: [{ ...stale.specimens![0], description: 'Updated description' }] } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordMarginInkApplication('case-1', inkInput, 'Tech A');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.specimens[0].margins[0]).toEqual(expect.objectContaining({ name: 'Lateral' }));
    expect(updates.specimens[0].description).toBe('Updated description');
  });
});
