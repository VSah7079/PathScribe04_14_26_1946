// src/services/hl7/processMaterialLocationEvent.test.ts
// PS-71 (Batch 458): an inbound location event never overwrites a newer
// case with a stale specimens array.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../assetLocation/mockAssetLocationDictionaryService', () => ({ mockAssetLocationDictionaryService: { findOrCreateByName: vi.fn().mockResolvedValue(undefined) } }));

import { processMaterialLocationEvent, _resetMaterialLocationMessageIdsForTests } from './processMaterialLocationEvent';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

const caseAt = (version: number, specimenB?: any) => ({
  id: 'S26-2', version, matrixBlocks: [],
  specimens: [
    { id: 'SP-1', label: 'A', locationHistory: [], blocks: [] },
    ...(specimenB ? [specimenB] : []),
  ],
});
const payload = { messageId: 'm-1', timestamp: '2026-10-04T00:00:00Z', accessionNumber: 'S26-2', specimenLetter: 'A', location: 'Cabinet 3', target: { level: 'specimen' }, sourceSystem: 'TEST' } as any;

describe('processMaterialLocationEvent — PS-71 versioned save', () => {
  beforeEach(() => { getCase.mockReset(); updateCase.mockReset(); _resetMaterialLocationMessageIdsForTests(); });

  it('saves with the version it read', async () => {
    getCase.mockResolvedValue(caseAt(3));
    updateCase.mockResolvedValue(undefined);
    const r = await processMaterialLocationEvent(payload);
    expect(r.outcome).toBe('applied');
    expect(updateCase.mock.calls[0][2]).toBe(3);
  });

  it('on a conflict, rebuilds from the newer case so a specimen added meanwhile survives', async () => {
    const added = { id: 'SP-2', label: 'B', locationHistory: [], blocks: [] };
    getCase.mockResolvedValueOnce(caseAt(1)).mockResolvedValueOnce(caseAt(1)).mockResolvedValue(caseAt(2, added));
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('S26-2', 1, 2)).mockResolvedValue(undefined);
    const r = await processMaterialLocationEvent(payload);
    expect(r.outcome).toBe('applied');
    const [, patch, version] = updateCase.mock.calls[1];
    expect(version).toBe(2);
    expect(patch.specimens.map((s: any) => s.id)).toEqual(['SP-1', 'SP-2']);
    expect(patch.specimens[0].locationHistory).toHaveLength(1);
  });

  it('throws (never forces a save) when every try conflicts', async () => {
    getCase.mockResolvedValue(caseAt(1));
    updateCase.mockRejectedValue(new ConcurrencyConflictError('S26-2', 1, 2));
    await expect(processMaterialLocationEvent(payload)).rejects.toBeInstanceOf(ConcurrencyConflictError);
    expect(updateCase.mock.calls.every(c => c[2] === 1)).toBe(true);
  });

  it('target-not-found for an unknown specimen', async () => {
    getCase.mockResolvedValue(caseAt(1));
    const r = await processMaterialLocationEvent({ ...payload, specimenLetter: 'Z' });
    expect(r.outcome).toBe('target-not-found');
    expect(updateCase).not.toHaveBeenCalled();
  });
});
