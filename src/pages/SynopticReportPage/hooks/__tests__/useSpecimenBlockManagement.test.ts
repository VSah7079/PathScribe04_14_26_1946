// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/hooks/__tests__/useSpecimenBlockManagement.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// See useLisIntegration.test.ts's header for the unit/integration split
// rationale and the @vitest-environment override rationale.
//
// This hook has different testing surface than useLisIntegration:
// a useMemo-derived value (allBlocks), local useState (focusedBlockIndex)
// with a self-correcting effect, and four write operations that share the
// same caseRouter.updateCase + concurrency-conflict pattern except one
// (handleAddBlock) which deliberately does NOT — it force-writes through a
// conflict rather than surfacing the modal, since the LIS has already
// acknowledged the physical order by that point. That intentional
// difference is exactly the kind of thing worth a dedicated test, not an
// assumption.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpecimenBlockManagement } from '../useSpecimenBlockManagement';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

vi.mock('@/services/cases/CaseRouter', () => ({
  caseRouter: { updateCase: vi.fn() },
}));

function makeTestCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'TEST-CASE-BLOCKS',
    status: 'in-progress',
    specimens: [
      {
        id: 'SP-1', label: 'A', description: 'Test specimen',
        blocks: [
          { id: 'BLK-1', label: '1', status: 'Pending', stains: [] },
          { id: 'BLK-2', label: '2', status: 'Grossed', stains: [] },
        ],
      },
      {
        id: 'SP-2', label: 'B', description: 'Second specimen',
        blocks: [{ id: 'BLK-3', label: '1', status: 'Embedded', stains: [] }],
      },
    ],
    ...overrides,
  } as unknown as Case;
}

const testSigningUser = { id: 'PATH-001', name: 'Dr. Test Pathologist' } as any;
const knownVersionRef = { current: 1 };

function baseParams(overrides: Partial<Parameters<typeof useSpecimenBlockManagement>[0]> = {}) {
  return {
    caseData: makeTestCase(),
    setCaseData: vi.fn(),
    signingUser: testSigningUser,
    markDirty: vi.fn(),
    knownVersionRef,
    setConcurrencyConflict: vi.fn(),
    sendMaterialOrderToLis: vi.fn().mockResolvedValue({ ok: true }),
    showToast: vi.fn(),
    ...overrides,
  };
}

describe('useSpecimenBlockManagement — allBlocks / focused-block derivation', () => {
  it('flattens blocks across every specimen into one sequence, in specimen order', () => {
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams()));
    expect(result.current.allBlocks.map(b => b.block.id)).toEqual(['BLK-1', 'BLK-2', 'BLK-3']);
    expect(result.current.allBlocks[0].specimenLabel).toBe('A');
    expect(result.current.allBlocks[2].specimenLabel).toBe('B');
  });

  it('defaults focusedBlockEntry to the first block in the flattened sequence', () => {
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams()));
    expect(result.current.focusedBlockEntry?.block.id).toBe('BLK-1');
  });

  it('self-corrects focusedBlockIndex back into range when the case shrinks to fewer blocks than the current index', () => {
    const params = baseParams();
    const { result, rerender } = renderHook(
      (p: any) => useSpecimenBlockManagement(p),
      { initialProps: params },
    );

    act(() => { result.current.setFocusedBlockIndex(2); }); // points at BLK-3
    expect(result.current.focusedBlockEntry?.block.id).toBe('BLK-3');

    // Re-render with a case that now has only one block total
    const shrunkCase = makeTestCase({
      specimens: [{ id: 'SP-1', label: 'A', description: 'x', blocks: [{ id: 'BLK-1', label: '1', status: 'Pending', stains: [] }] }] as any,
    });
    rerender({ ...params, caseData: shrunkCase });

    expect(result.current.focusedBlockIndex).toBe(0);
    expect(result.current.focusedBlockEntry?.block.id).toBe('BLK-1');
  });
});

describe('useSpecimenBlockManagement — handleAdvanceFocusedBlockStatus', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('advances Pending → Grossed for the currently-focused block only, leaving other blocks untouched', async () => {
    const setCaseData = vi.fn();
    const markDirty = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData, markDirty })));

    // focusedBlockEntry defaults to BLK-1, status Pending
    await act(async () => { await result.current.handleAdvanceFocusedBlockStatus(); });

    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const [, patch] = vi.mocked(caseRouter.updateCase).mock.calls[0];
    const patchedBlock1 = (patch as any).specimens[0].blocks.find((b: any) => b.id === 'BLK-1');
    const untouchedBlock2 = (patch as any).specimens[0].blocks.find((b: any) => b.id === 'BLK-2');
    expect(patchedBlock1.status).toBe('Grossed');
    expect(untouchedBlock2.status).toBe('Grossed'); // BLK-2 was already Grossed and unrelated to this call
    expect(markDirty).toHaveBeenCalledWith('Block status');
  });

  it('does nothing for a terminal status (Embedded) — not voice-advanceable, matching the real nextStatus map having no entry for it', async () => {
    const setCaseData = vi.fn();
    const params = baseParams({ setCaseData });
    const { result } = renderHook(() => useSpecimenBlockManagement(params));

    act(() => { result.current.setFocusedBlockIndex(2); }); // BLK-3, status Embedded
    await act(async () => { await result.current.handleAdvanceFocusedBlockStatus(); });

    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('surfaces the conflict modal via setConcurrencyConflict on a real ConcurrencyConflictError, without blockOverride (routine edit, not a high-stakes write)', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockRejectedValueOnce(new ConcurrencyConflictError('TEST-CASE-BLOCKS', 1, 7));
    const setConcurrencyConflict = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setConcurrencyConflict })));

    await act(async () => { await result.current.handleAdvanceFocusedBlockStatus(); });

    expect(setConcurrencyConflict).toHaveBeenCalledWith({ actualVersion: 7, blockOverride: undefined });
  });
});

describe('useSpecimenBlockManagement — handleConfirmTriage', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('stamps triageConfirmedAt/By on the focused block\'s specimen, attributed to the real signing user', async () => {
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams()));
    await act(async () => { await result.current.handleConfirmTriage(); });

    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const [, patch] = vi.mocked(caseRouter.updateCase).mock.calls[0];
    const patchedSpecimen = (patch as any).specimens.find((s: any) => s.id === 'SP-1');
    expect(patchedSpecimen.triageConfirmedBy).toBe('PATH-001');
    expect(typeof patchedSpecimen.triageConfirmedAt).toBe('string');
  });
});

describe('useSpecimenBlockManagement — handleUpdateBlock', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('applies arbitrary changes to a specific block by id, regardless of focus state', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => {
      await result.current.handleUpdateBlock('SP-2', 'BLK-3', { status: 'Exhausted', coding: { cpt: ['88305'] } });
    });

    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const [, patch] = vi.mocked(caseRouter.updateCase).mock.calls[0];
    const updatedBlock = (patch as any).specimens.find((s: any) => s.id === 'SP-2').blocks[0];
    expect(updatedBlock.status).toBe('Exhausted');
    expect(updatedBlock.coding.cpt).toEqual(['88305']);
  });
});

describe('useSpecimenBlockManagement — handleAddBlock', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('requires LIS acknowledgement BEFORE adding the block locally — if the LIS declines, nothing is added and no persistence happens', async () => {
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: false });
    const setCaseData = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ sendMaterialOrderToLis, setCaseData, showToast })));

    await act(async () => { await result.current.handleAddBlock('SP-1'); });

    expect(setCaseData).not.toHaveBeenCalled();
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('did not acknowledge'));
  });

  it('adds a real block with the next sequential label once the LIS acknowledges', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => { await result.current.handleAddBlock('SP-1'); });

    // SP-1 already had BLK-1, BLK-2 — the third block should be labeled "3"
    const updatedCase = setCaseData.mock.calls[0][0];
    const sp1 = updatedCase.specimens.find((s: any) => s.id === 'SP-1');
    expect(sp1.blocks).toHaveLength(3);
    expect(sp1.blocks[2].label).toBe('3');
    expect(sp1.blocks[2].status).toBe('Grossed');
  });

  it('defaults every new block to a real, pending H&E stain order — per direct confirmation, not an empty one', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => { await result.current.handleAddBlock('SP-1'); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const newBlock = updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks[2];
    expect(newBlock.stains).toHaveLength(1);
    expect(newBlock.stains[0].stainName).toBe('H&E');
    expect(newBlock.stains[0].status).toBe('Pending Cut');
  });

  it('deliberately FORCES the write through on a conflict rather than surfacing the modal — the LIS already has the physical order by this point, so there is no safe "discard" option', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase)
      .mockRejectedValueOnce(new ConcurrencyConflictError('TEST-CASE-BLOCKS', 1, 9)) // first attempt: conflict
      .mockResolvedValueOnce(undefined); // retry: succeeds
    const setConcurrencyConflict = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setConcurrencyConflict, showToast })));

    await act(async () => { await result.current.handleAddBlock('SP-1'); });

    // The conflict modal must NOT be shown for this specific write
    expect(setConcurrencyConflict).not.toHaveBeenCalled();
    // The retry must have actually been attempted
    expect(caseRouter.updateCase).toHaveBeenCalledTimes(2);
    // The pathologist must be told this happened, even though it succeeded
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('unsaved changes elsewhere'));
  });
});

describe('useSpecimenBlockManagement — handleCancelBlock', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  function makeCancelCase() {
    return makeTestCase({
      specimens: [{
        id: 'SP-1', label: 'A', description: 'Spec A',
        blocks: [{
          id: 'BLK-1', label: '1', status: 'Grossed', sharedCassetteId: 'MB1', positionInBlock: 2,
          stains: [
            { id: 'STN-1', stainName: 'H&E', status: 'Pending Cut' },
            { id: 'STN-2', stainName: 'ER', status: 'Coverslipped' },
          ],
        }],
      }] as any,
    });
  }

  it('does nothing without a real, non-empty reason', async () => {
    const setCaseData = vi.fn();
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', '   '); });

    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('records who, when, and why — grounded in CAP ANP.11600 / CLIA 493.1105 / ISO 15189:2012 5.8', async () => {
    const setCaseData = vi.fn();
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', 'Wrong specimen assigned to this block'); });

    // handleCancelBlock calls setCaseData with the React function-updater
    // form (prev => ...), not a plain value — apply it manually the same
    // way React would, rather than reading the raw function argument.
    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    const block = updatedCase.specimens[0].blocks[0];
    expect(block.status).toBe('Cancelled');
    expect(block.cancelReason).toBe('Wrong specimen assigned to this block');
    expect(block.cancelledBy).toBe(testSigningUser.id);
    expect(block.cancelledAt).toBeTruthy();
  });

  it('keeps the block record — cancellation is a real status, never deletion', async () => {
    const setCaseData = vi.fn();
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', 'Duplicate block created in error'); });

    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    expect(updatedCase.specimens[0].blocks).toHaveLength(1);
    expect(updatedCase.specimens[0].blocks[0].id).toBe('BLK-1');
  });

  it('clears Biopsy Array membership — a cancelled block no longer occupies a real position', async () => {
    const setCaseData = vi.fn();
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', 'Wrong block for this tissue'); });

    const block = setCaseData.mock.calls[0][0](caseData).specimens[0].blocks[0];
    expect(block.sharedCassetteId).toBeUndefined();
    expect(block.positionInBlock).toBeUndefined();
  });

  it('cascade-cancels non-terminal stain orders but leaves completed ones alone — the real record of what was prevented', async () => {
    const setCaseData = vi.fn();
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', 'Insufficient tissue for this block'); });

    const stains = setCaseData.mock.calls[0][0](caseData).specimens[0].blocks[0].stains;
    const pendingHE = stains.find((s: any) => s.id === 'STN-1');
    const completedER = stains.find((s: any) => s.id === 'STN-2');
    expect(pendingHE.status).toBe('Cancelled'); // was 'Pending Cut' — real work prevented
    expect(completedER.status).toBe('Coverslipped'); // already finished — not retroactively undone
  });

  it('sends a real LIS cancel order — if declined, nothing is recorded', async () => {
    const setCaseData = vi.fn();
    const showToast = vi.fn();
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: false });
    const caseData = makeCancelCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData, showToast, sendMaterialOrderToLis })));

    await act(async () => { await result.current.handleCancelBlock('SP-1', 'BLK-1', 'Wrong stain ordered'); });

    expect(sendMaterialOrderToLis).toHaveBeenCalledWith({ kind: 'cancel', specimenId: 'SP-1', label: '1' });
    expect(setCaseData).not.toHaveBeenCalled();
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('did not acknowledge'));
  });
});

describe('useSpecimenBlockManagement — handleCreateSpareSlide', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('creates a real spare with stainName UNSTAINED_LABEL and status "Cut & Placed" — the cutting already happened, only the stain hasn\'t', async () => {
    const setCaseData = vi.fn();
    const caseData = makeTestCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCreateSpareSlide('SP-1', 'BLK-1'); });

    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    const sp1Block = updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks.find((b: any) => b.id === 'BLK-1');
    const newSpare = sp1Block.stains[sp1Block.stains.length - 1];
    expect(newSpare.stainName).toBe('Unstained');
    expect(newSpare.status).toBe('Cut & Placed');
  });

  it('sends no LIS order — the tissue was already physically cut, nothing new happens in the physical world yet', async () => {
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ sendMaterialOrderToLis })));

    await act(async () => { await result.current.handleCreateSpareSlide('SP-1', 'BLK-1'); });

    expect(sendMaterialOrderToLis).not.toHaveBeenCalled();
  });

  it('keeps every existing stain on the block untouched', async () => {
    const setCaseData = vi.fn();
    const caseData = makeTestCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleCreateSpareSlide('SP-1', 'BLK-1'); });

    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    const sp1Block = updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks.find((b: any) => b.id === 'BLK-1');
    expect(sp1Block.stains).toHaveLength(1); // the new spare, added to whatever was already there (none, in the default fixture)
  });
});

describe('useSpecimenBlockManagement — handleOrderRestain', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  function makeRestainCase() {
    return makeTestCase({
      specimens: [{
        id: 'SP-1', label: 'A', description: 'Spec A',
        blocks: [{
          id: 'BLK-1', label: '1', status: 'Grossed',
          stains: [
            { id: 'STN-HE', stainName: 'H&E', status: 'Coverslipped' },
            { id: 'STN-SPARE', stainName: 'Unstained', status: 'Cut & Placed' },
          ],
        }],
      }] as any,
    });
  }

  it('converts an Unstained spare in place — same slide id, moves straight to "Staining" since it was already cut and placed', async () => {
    const setCaseData = vi.fn();
    const caseData = makeRestainCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => {
      await result.current.handleOrderRestain('SP-1', 'BLK-1', { targetSlideId: 'STN-SPARE', stainName: 'ER', reason: 'Weak stain' });
    });

    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    const stains = updatedCase.specimens[0].blocks[0].stains;
    expect(stains).toHaveLength(2); // no new slide — the spare converted, not a third one added
    const converted = stains.find((s: any) => s.id === 'STN-SPARE');
    expect(converted.stainName).toBe('ER');
    expect(converted.status).toBe('Staining');
    expect(converted.restainReason).toBe('Weak stain');
    expect(converted.restainOrderedBy).toBe(testSigningUser.id);
    expect(converted.restainOrderedAt).toBeTruthy();
  });

  it('never converts an already-stained slide — creates a genuinely new one instead, original completely untouched', async () => {
    const setCaseData = vi.fn();
    const caseData = makeRestainCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => {
      await result.current.handleOrderRestain('SP-1', 'BLK-1', { targetSlideId: 'STN-HE', stainName: 'H&E', reason: 'Artifact' });
    });

    const updatedCase = setCaseData.mock.calls[0][0](caseData);
    const stains = updatedCase.specimens[0].blocks[0].stains;
    expect(stains).toHaveLength(3); // a real, new third slide
    const original = stains.find((s: any) => s.id === 'STN-HE');
    expect(original.status).toBe('Coverslipped'); // completely untouched
    expect(original.restainReason).toBeUndefined();
    const newRestain = stains.find((s: any) => s.restainOfSlideId === 'STN-HE');
    expect(newRestain).toBeDefined();
    expect(newRestain.stainName).toBe('H&E');
    expect(newRestain.status).toBe('Pending Cut'); // a real new cut, not yet placed
    expect(newRestain.restainReason).toBe('Artifact');
  });

  it('does nothing without a real stain name or a real reason', async () => {
    const setCaseData = vi.fn();
    const caseData = makeRestainCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => {
      await result.current.handleOrderRestain('SP-1', 'BLK-1', { targetSlideId: 'STN-SPARE', stainName: '  ', reason: 'Weak stain' });
    });
    await act(async () => {
      await result.current.handleOrderRestain('SP-1', 'BLK-1', { targetSlideId: 'STN-SPARE', stainName: 'ER', reason: '  ' });
    });

    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('sends a real LIS restain order — if declined, nothing is recorded', async () => {
    const setCaseData = vi.fn();
    const showToast = vi.fn();
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: false });
    const caseData = makeRestainCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData, showToast, sendMaterialOrderToLis })));

    await act(async () => {
      await result.current.handleOrderRestain('SP-1', 'BLK-1', { targetSlideId: 'STN-SPARE', stainName: 'ER', reason: 'Weak stain' });
    });

    expect(sendMaterialOrderToLis).toHaveBeenCalledWith({ kind: 'restain', specimenId: 'SP-1', label: '1: ER' });
    expect(setCaseData).not.toHaveBeenCalled();
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('did not acknowledge'));
  });
});

describe('useSpecimenBlockManagement — handleCreateBiopsyArray', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('does nothing with fewer than 2 specimens — a Biopsy Array is inherently a multi-specimen concept', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => { await result.current.handleCreateBiopsyArray(['SP-1'], 'C3'); });

    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('creates one linked block per selected specimen, each with the same sharedCassetteId and its own sequential positionInBlock', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => { await result.current.handleCreateBiopsyArray(['SP-1', 'SP-2'], 'C3'); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const sp1 = updatedCase.specimens.find((s: any) => s.id === 'SP-1');
    const sp2 = updatedCase.specimens.find((s: any) => s.id === 'SP-2');
    const sp1NewBlock = sp1.blocks.find((b: any) => b.sharedCassetteId);
    const sp2NewBlock = sp2.blocks.find((b: any) => b.sharedCassetteId);

    expect(sp1NewBlock.sharedCassetteId).toBe('C3');
    expect(sp2NewBlock.sharedCassetteId).toBe('C3');
    expect(sp1NewBlock.positionInBlock).toBe(1);
    expect(sp2NewBlock.positionInBlock).toBe(2);
    // Real feature, per direct confirmation: every new block defaults
    // to a real, pending H&E stain order, same as handleAddBlock.
    expect(sp1NewBlock.stains).toHaveLength(1);
    expect(sp1NewBlock.stains[0].stainName).toBe('H&E');
    expect(sp1NewBlock.stains[0].status).toBe('Pending Cut');
    expect(sp2NewBlock.stains[0].stainName).toBe('H&E');
    // Each specimen's own existing blocks are untouched — SP-1 had 2,
    // now has 3 (its own new one added); SP-2 had 1, now has 2.
    expect(sp1.blocks).toHaveLength(3);
    expect(sp2.blocks).toHaveLength(2);
  });

  it('position order matches the order specimens were passed in, not specimen array order', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    // SP-2 passed first, SP-1 second — reversed from caseData.specimens order
    await act(async () => { await result.current.handleCreateBiopsyArray(['SP-2', 'SP-1'], 'C3'); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const sp1NewBlock = updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks.find((b: any) => b.sharedCassetteId);
    const sp2NewBlock = updatedCase.specimens.find((s: any) => s.id === 'SP-2').blocks.find((b: any) => b.sharedCassetteId);

    expect(sp2NewBlock.positionInBlock).toBe(1);
    expect(sp1NewBlock.positionInBlock).toBe(2);
  });

  it('sends one real LIS order per specimen, all referencing the same cassette label', async () => {
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ sendMaterialOrderToLis })));

    await act(async () => { await result.current.handleCreateBiopsyArray(['SP-1', 'SP-2'], 'C3'); });

    expect(sendMaterialOrderToLis).toHaveBeenCalledTimes(2);
    expect(sendMaterialOrderToLis).toHaveBeenCalledWith({ kind: 'block_recut', specimenId: 'SP-1', label: 'C3' });
    expect(sendMaterialOrderToLis).toHaveBeenCalledWith({ kind: 'block_recut', specimenId: 'SP-2', label: 'C3' });
  });

  it('requires every specimen\'s LIS order to be acknowledged — if any one is declined, nothing is added and no persistence happens', async () => {
    const sendMaterialOrderToLis = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    const setCaseData = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ sendMaterialOrderToLis, setCaseData, showToast })));

    await act(async () => { await result.current.handleCreateBiopsyArray(['SP-1', 'SP-2'], 'C3'); });

    expect(setCaseData).not.toHaveBeenCalled();
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('did not acknowledge'));
  });
});

describe('useSpecimenBlockManagement — handleUpdateBiopsyArray', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  function makeArrayCase() {
    return makeTestCase({
      specimens: [
        { id: 'SP-1', label: 'A', description: 'Spec A', blocks: [{ id: 'BLK-A1', label: '1', status: 'Grossed', stains: [], sharedCassetteId: 'MB1', positionInBlock: 1 }] },
        { id: 'SP-2', label: 'B', description: 'Spec B', blocks: [{ id: 'BLK-B1', label: '1', status: 'Grossed', stains: [], sharedCassetteId: 'MB1', positionInBlock: 2 }] },
        { id: 'SP-3', label: 'C', description: 'Spec C', blocks: [{ id: 'BLK-C1', label: '1', status: 'Grossed', stains: [], sharedCassetteId: 'MB1', positionInBlock: 3 }] },
        { id: 'SP-4', label: 'D', description: 'Spec D', blocks: [] },
      ] as any,
    });
  }

  it('unlinks a removed specimen — keeps its block record, clears sharedCassetteId/positionInBlock, does not delete it', async () => {
    const setCaseData = vi.fn();
    const caseData = makeArrayCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    // Remove SP-2 (B) — new selection is just SP-1, SP-3
    await act(async () => { await result.current.handleUpdateBiopsyArray('MB1', ['SP-1', 'SP-3']); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const sp2 = updatedCase.specimens.find((s: any) => s.id === 'SP-2');
    expect(sp2.blocks).toHaveLength(1); // block kept, not deleted
    expect(sp2.blocks[0].id).toBe('BLK-B1');
    expect(sp2.blocks[0].sharedCassetteId).toBeUndefined();
    expect(sp2.blocks[0].positionInBlock).toBeUndefined();
  });

  it('adds a newly-selected specimen with a real new block, sending a real LIS order', async () => {
    const setCaseData = vi.fn();
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: true });
    const caseData = makeArrayCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData, sendMaterialOrderToLis })));

    // Add SP-4 (D) — new selection is SP-1, SP-2, SP-3, SP-4
    await act(async () => { await result.current.handleUpdateBiopsyArray('MB1', ['SP-1', 'SP-2', 'SP-3', 'SP-4']); });

    expect(sendMaterialOrderToLis).toHaveBeenCalledTimes(1);
    expect(sendMaterialOrderToLis).toHaveBeenCalledWith({ kind: 'block_recut', specimenId: 'SP-4', label: 'MB1' });

    const updatedCase = setCaseData.mock.calls[0][0];
    const sp4 = updatedCase.specimens.find((s: any) => s.id === 'SP-4');
    expect(sp4.blocks).toHaveLength(1);
    expect(sp4.blocks[0].sharedCassetteId).toBe('MB1');
    expect(sp4.blocks[0].positionInBlock).toBe(4);
    // Real feature, per direct confirmation: same H&E default as
    // every other block-creation path.
    expect(sp4.blocks[0].stains).toHaveLength(1);
    expect(sp4.blocks[0].stains[0].stainName).toBe('H&E');
  });

  it('renumbers remaining specimens to match the new position order when the order changes', async () => {
    const setCaseData = vi.fn();
    const caseData = makeArrayCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    // Remove B (was position 2) — A and C should renumber to 1, 2
    await act(async () => { await result.current.handleUpdateBiopsyArray('MB1', ['SP-1', 'SP-3']); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const sp1Block = updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks.find((b: any) => b.sharedCassetteId);
    const sp3Block = updatedCase.specimens.find((s: any) => s.id === 'SP-3').blocks.find((b: any) => b.sharedCassetteId);
    expect(sp1Block.positionInBlock).toBe(1);
    expect(sp3Block.positionInBlock).toBe(2); // renumbered from 3 to 2
  });

  it('dissolves the whole array instead when the new selection drops below 2 specimens', async () => {
    const setCaseData = vi.fn();
    const caseData = makeArrayCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleUpdateBiopsyArray('MB1', ['SP-1']); });

    const updatedCase = setCaseData.mock.calls[0][0];
    const hasAnyLinked = updatedCase.specimens.some((s: any) => (s.blocks ?? []).some((b: any) => b.sharedCassetteId === 'MB1'));
    expect(hasAnyLinked).toBe(false);
    // All three original blocks kept, just unlinked
    expect(updatedCase.specimens.find((s: any) => s.id === 'SP-1').blocks).toHaveLength(1);
    expect(updatedCase.specimens.find((s: any) => s.id === 'SP-2').blocks).toHaveLength(1);
    expect(updatedCase.specimens.find((s: any) => s.id === 'SP-3').blocks).toHaveLength(1);
  });

  it('requires the newly-added specimen\'s LIS order to be acknowledged — if declined, nothing is added and no persistence happens', async () => {
    const setCaseData = vi.fn();
    const showToast = vi.fn();
    const sendMaterialOrderToLis = vi.fn().mockResolvedValue({ ok: false });
    const caseData = makeArrayCase();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData, showToast, sendMaterialOrderToLis })));

    await act(async () => { await result.current.handleUpdateBiopsyArray('MB1', ['SP-1', 'SP-2', 'SP-3', 'SP-4']); });

    expect(setCaseData).not.toHaveBeenCalled();
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('did not acknowledge'));
  });
});

describe('useSpecimenBlockManagement — handleDissolveBiopsyArray', () => {
  beforeEach(async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockResolvedValue(undefined);
  });

  it('unlinks every specimen currently sharing the cassette id, keeping each block record intact', async () => {
    const setCaseData = vi.fn();
    const caseData = makeTestCase({
      specimens: [
        { id: 'SP-1', label: 'A', description: 'Spec A', blocks: [{ id: 'BLK-A1', label: '1', status: 'Grossed', stains: [], sharedCassetteId: 'MB1', positionInBlock: 1 }] },
        { id: 'SP-2', label: 'B', description: 'Spec B', blocks: [{ id: 'BLK-B1', label: '1', status: 'Grossed', stains: [], sharedCassetteId: 'MB1', positionInBlock: 2 }] },
      ] as any,
    });
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ caseData, setCaseData })));

    await act(async () => { await result.current.handleDissolveBiopsyArray('MB1'); });

    const updatedCase = setCaseData.mock.calls[0][0];
    for (const sp of updatedCase.specimens) {
      expect(sp.blocks).toHaveLength(1);
      expect(sp.blocks[0].sharedCassetteId).toBeUndefined();
      expect(sp.blocks[0].positionInBlock).toBeUndefined();
    }
  });

  it('does nothing when no specimen is linked to the given cassette id', async () => {
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useSpecimenBlockManagement(baseParams({ setCaseData })));

    await act(async () => { await result.current.handleDissolveBiopsyArray('NONEXISTENT'); });

    expect(setCaseData).not.toHaveBeenCalled();
  });
});

describe('useSpecimenBlockManagement — integration test (real mock case data, unmocked caseRouter)', () => {
  it('handleUpdateBlock genuinely persists through the real caseRouter against actual mock case data', async () => {
    vi.doUnmock('@/services/cases/CaseRouter');
    vi.resetModules();
    const { useSpecimenBlockManagement: freshHook } = await import('../useSpecimenBlockManagement');
    const { mockCaseService } = await import('@/services/cases/mockCaseService');

    const before = await mockCaseService.getCase('S26-4402-COLON-RES');
    expect(before).toBeDefined();
    if (!before) return;

    const setCaseData = vi.fn();
    // knownVersionRef.current left as undefined deliberately — passing no
    // expectedVersion to caseRouter.updateCase skips the version check
    // entirely (confirmed in mockCaseService.updateCase's own
    // implementation), so this test doesn't need to know or guess the
    // real current version to avoid a self-inflicted conflict.
    const { result } = renderHook(() => freshHook({
      caseData: before, setCaseData, signingUser: testSigningUser,
      markDirty: vi.fn(), knownVersionRef: { current: undefined as any },
      setConcurrencyConflict: vi.fn(), sendMaterialOrderToLis: vi.fn().mockResolvedValue({ ok: true }),
      showToast: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleUpdateBlock('S26-4402-SP-1', 'blk-4402-a3', { status: 'Exhausted' });
    });

    const after = await mockCaseService.getCase('S26-4402-COLON-RES');
    expect(after).toBeDefined();
    const block = (after!.specimens as any[]).find(s => s.id === 'S26-4402-SP-1').blocks.find((b: any) => b.id === 'blk-4402-a3');
    expect(block.status).toBe('Exhausted');

    // Restore the mock case's original state so this test doesn't leave
    // shared mock data permanently mutated for other tests / manual runs.
    await mockCaseService.updateCase('S26-4402-COLON-RES', { specimens: before.specimens } as any);
  });
});
