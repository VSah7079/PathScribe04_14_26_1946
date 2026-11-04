import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyOrganTag, organTagsForOrgan } from './recordAutopsyOrganTag';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';
import type { AutopsyOrganTag } from '@/types/autopsy/AutopsyCaseDetails';

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-1',
    accession: { accessionNumber: 'A-2026-1' },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }],
    order: { priority: 'Routine' },
    status: 'in-progress',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
    },
    ...overrides,
  } as Case;
}

const input = { organCode: 'heart' as const, status: 'abnormal' as const, finding: 'Severe atherosclerosis, LAD 90% stenosed.' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordAutopsyOrganTag', () => {
  it('a person without autopsy:organ-tag:record cannot record it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('an unknown case is refused honestly', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a case with no autopsy record is refused honestly', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: undefined } as any));
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real organ tag is appended (who recorded it, when) and audited', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.organTags).toHaveLength(1);
    expect(updates.autopsy.organTags[0]).toEqual(expect.objectContaining({
      organCode: 'heart', status: 'abnormal', finding: input.finding, recordedByName: 'Dr. Reed',
    }));
    expect(updates.autopsy.organTags[0].recordedAt).toBeDefined();
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_ORGAN_TAG_RECORDED', caseId: 'case-1' }));
  });

  it('a second tag is appended, never replacing the first (append-only, unlike organRetentionDetail)', async () => {
    const priorTag: AutopsyOrganTag = { id: 'organ-tag-case-1-1', organCode: 'left_lung', status: 'normal', recordedAt: '2026-09-01T00:00:00Z', recordedByName: 'Dr. Prior' };
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, organTags: [priorTag] } as any }));
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.organTags).toEqual([priorTag, expect.objectContaining({ organCode: 'heart', status: 'abnormal' })]);
  });

  it('a tag with no finding text (e.g. a bare "normal") is recorded fine — finding is optional', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyOrganTag('case-1', { organCode: 'spleen', status: 'normal' }, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls[0][1].autopsy.organTags[0].finding).toBeUndefined();
  });

  it('on a conflict, the tag is re-applied to the newer case, keeping what else changed in between', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, autopsy: { ...stale.autopsy!, addenda: [{ id: 'ad-1' }] } } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyOrganTag('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.autopsy.organTags[0]).toEqual(expect.objectContaining({ organCode: 'heart' }));
    expect(updates.autopsy.addenda).toEqual([{ id: 'ad-1' }]);
  });
});

describe('organTagsForOrgan', () => {
  const tags: AutopsyOrganTag[] = [
    { id: 't1', organCode: 'heart', status: 'abnormal', recordedAt: '2026-09-01T00:00:00Z', recordedByName: 'Dr. A' },
    { id: 't2', organCode: 'left_lung', status: 'normal', recordedAt: '2026-09-01T00:05:00Z', recordedByName: 'Dr. A' },
    { id: 't3', organCode: 'heart', status: 'normal', recordedAt: '2026-09-02T00:00:00Z', recordedByName: 'Dr. B' },
  ];

  it('filters to one organ, oldest first (the log’s own append order)', () => {
    expect(organTagsForOrgan(tags, 'heart').map(t => t.id)).toEqual(['t1', 't3']);
  });

  it('returns an empty array for an organ with no tags, or an undefined log', () => {
    expect(organTagsForOrgan(tags, 'brain')).toEqual([]);
    expect(organTagsForOrgan(undefined, 'heart')).toEqual([]);
  });
});
