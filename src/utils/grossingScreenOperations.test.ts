// src/utils/grossingScreenOperations.test.ts
import { describe, it, expect } from 'vitest';
import { stainOrigin, addGrossingBlock, removeGrossingBlock, addGrossingStain, removeGrossingStain, updateGrossingPieceCount } from './grossingScreenOperations';
import type { Specimen } from '@/types/case/Specimen';
import type { ProtocolPathway } from '@/services/protocols/IProtocolService';
import type { StainType } from '@/services/stains/IStainService';

const specimen = (overrides: Partial<Specimen> = {}): Specimen => ({
  id: 'sp1', label: 'A', displayId: 'S26-0001-A',
  blocks: [{ id: 'blk-1', label: '1', status: 'Pending', stains: [{ id: 'stain-1', stainName: 'H&E', status: 'Pending Cut' }] }],
  ...overrides,
} as unknown as Specimen);

const pathway = (overrides: Partial<ProtocolPathway> = {}): ProtocolPathway => ({
  id: 'p1', pathwayName: 'Track', materialKind: 'block', fixativeType: '10% NBF',
  requiresDecal: false, processingFormat: 'Standard', defaultPieceCount: 3,
  tasks: [{ id: 't1', stepOrder: 1, action: 'H&E', stainTypeIds: ['st-he'] }],
  ...overrides,
});

const stainType = (id: string, name: string): StainType => ({ id, name, category: 'Special', active: true } as unknown as StainType);

describe('addGrossingBlock', () => {
  it('creates a new block with the next sequential label, protocol default stains (never userAdded), and defaultPieceCount', () => {
    const result = addGrossingBlock(specimen(), pathway(), 'S26-0001', 'alpha-specimen');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const newBlock = result.specimen.blocks!.find(b => b.id !== 'blk-1')!;
    expect(newBlock.label).toBe('2');
    expect(newBlock.status).toBe('Pending');
    expect(newBlock.pieceCount).toBe(3);
    expect(newBlock.stains).toHaveLength(1);
    expect(newBlock.stains[0].userAdded).toBeUndefined();
  });
});

describe('addGrossingBlock honours the letters-or-numbers setting (Batch 715)', () => {
  // Before: the label always came from the number of blocks and the old preset, and the
  // grossing screen passed no style at all, so 'Add Block' ignored the facility setting.
  const next = (sp: Specimen, style?: Parameters<typeof addGrossingBlock>[3]) => {
    const r = addGrossingBlock(sp, pathway(), 'S26-0001', style);
    if (!r.ok) throw new Error('expected ok');
    return r.specimen.blocks![r.specimen.blocks!.length - 1];
  };
  it('block numbers: 2, with cassette id S26-0001-A2', () => {
    const b = next(specimen(), { specimen: 'letters', block: 'numbers', slide: 'numbers' });
    expect(b.label).toBe('2');
    expect(b.displayId).toBe('S26-0001-A2');
  });
  it('block letters: A, cassette id S26-0001-AA (a numbered block already there is not counted)', () => {
    const b = next(specimen(), { specimen: 'letters', block: 'letters', slide: 'numbers' });
    expect(b.label).toBe('A');
    expect(b.displayId).toBe('S26-0001-AA');
  });
  it('block letters continue after letters already there: A, B -> C', () => {
    const sp = specimen({ blocks: [{ id: 'b1', label: 'A', status: 'Pending', stains: [] }, { id: 'b2', label: 'B', status: 'Pending', stains: [] }] } as any);
    expect(next(sp, { specimen: 'letters', block: 'letters', slide: 'numbers' }).label).toBe('C');
  });
  it('block letters on a specimen with no blocks starts at A; numeric specimen gives 1A', () => {
    const sp = specimen({ label: '1', blocks: [] } as any);
    const b = next(sp, { specimen: 'numbers', block: 'letters', slide: 'numbers' });
    expect(b.label).toBe('A');
    expect(b.displayId).toBe('S26-0001-1A');
  });
  it('the new block\'s first slide keeps the L1 code whatever the slide setting', () => {
    const b = next(specimen(), { specimen: 'letters', block: 'letters', slide: 'letters' });
    expect(b.stains[0].displayId).toBe('S26-0001-AA-L1');
  });
  it('after a block was removed, the new label is not one already in use', () => {
    const sp = specimen({ blocks: [
      { id: 'b1', label: '1', status: 'Pending', stains: [] },
      { id: 'b3', label: '3', status: 'Pending', stains: [] },
    ] } as any);
    expect(next(sp, { specimen: 'letters', block: 'numbers', slide: 'numbers' }).label).toBe('4');
  });
});

describe('removeGrossingBlock', () => {
  it('removes a real, still-Pending block', () => {
    const result = removeGrossingBlock(specimen(), 'blk-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.specimen.blocks).toHaveLength(0);
  });

  it('refuses to remove a block once processing has begun, with a clear, honest error', () => {
    const sp = specimen({ blocks: [{ id: 'blk-1', label: '1', status: 'Grossed', stains: [] }] } as any);
    const result = removeGrossingBlock(sp, 'blk-1');
    expect(result.ok).toBe(false);
    expect(!result.ok && 'error' in result && result.error).toContain('cannot be removed');
  });
});

describe('addGrossingStain', () => {
  it('adds a real stain flagged userAdded, flags the block userModified, and logs a real override', () => {
    const result = addGrossingStain(specimen(), 'blk-1', stainType('st-pas', 'PAS'), 'tech-1', 'S26-0001');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.userModified).toBe(true);
    const added = block.stains.find(s => s.stainName === 'PAS')!;
    expect(added.userAdded).toBe(true);
    expect(result.specimen.grossingOverrides).toHaveLength(1);
    expect(result.specimen.grossingOverrides![0]).toMatchObject({ field: 'stainAdded', blockLabel: '1', newValue: 'PAS', actor: 'tech-1' });
  });
});

describe('removeGrossingStain', () => {
  it('requires confirmation before removing a real protocol-default stain', () => {
    const result = removeGrossingStain(specimen(), 'blk-1', 'stain-1', 'tech-1', false);
    expect(result.ok).toBe(false);
    expect(!result.ok && 'needsConfirmation' in result && result.needsConfirmation).toBe(true);
  });

  it('removes a protocol-default stain once confirmed, flags the block userModified, and logs a real override', () => {
    const result = removeGrossingStain(specimen(), 'blk-1', 'stain-1', 'tech-1', true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains).toHaveLength(0);
    expect(block.userModified).toBe(true);
    expect(result.specimen.grossingOverrides).toHaveLength(1);
    expect(result.specimen.grossingOverrides![0]).toMatchObject({ field: 'stainRemoved', blockLabel: '1', originalValue: 'H&E' });
  });

  it('removes a real, user-added stain with no confirmation and no audit entry — undoing your own addition is not an override', () => {
    const sp = specimen({
      blocks: [{ id: 'blk-1', label: '1', status: 'Pending', stains: [{ id: 'stain-2', stainName: 'PAS', status: 'Pending Cut', userAdded: true }] }],
    } as any);
    const result = removeGrossingStain(sp, 'blk-1', 'stain-2', 'tech-1', false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.specimen.blocks![0].stains).toHaveLength(0);
    expect(result.specimen.grossingOverrides ?? []).toHaveLength(0);
  });
});

describe('updateGrossingPieceCount', () => {
  it('updates the real piece count and always logs a real override, even the first time it is set', () => {
    const result = updateGrossingPieceCount(specimen(), 'blk-1', 4, 'tech-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.specimen.blocks!.find(b => b.id === 'blk-1')!.pieceCount).toBe(4);
    expect(result.specimen.grossingOverrides).toHaveLength(1);
    expect(result.specimen.grossingOverrides![0]).toMatchObject({ field: 'pieceCount', originalValue: '(none)', newValue: '4' });
  });
});

// Batch 705: a stain's tag must come from a real origin, not from "not user-added".
describe('stainOrigin and removing a stain that did not come from a protocol', () => {
  const withProtocol = { protocolSnapshot: { id: 'pr1', version: 1, name: 'Std' } };

  it('is userAdded for a person\'s addition, protocol only when a protocol is attached, otherwise existing', () => {
    expect(stainOrigin(specimen(), { userAdded: true })).toBe('userAdded');
    expect(stainOrigin(specimen(withProtocol as Partial<Specimen>), {})).toBe('protocol');
    expect(stainOrigin(specimen(), {})).toBe('existing');
  });

  it('asks for confirmation naming the origin, then logs the override, for an existing stain with no protocol', () => {
    const first = removeGrossingStain(specimen(), 'blk-1', 'stain-1', 'tech-1', false);
    expect(first).toEqual({ ok: false, needsConfirmation: true, origin: 'existing' });
    const done = removeGrossingStain(specimen(), 'blk-1', 'stain-1', 'tech-1', true);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.specimen.grossingOverrides).toHaveLength(1);
    expect(done.specimen.grossingOverrides![0]).toMatchObject({ field: 'stainRemoved', originalValue: 'H&E' });
  });

  it('reports origin protocol when a protocol is attached', () => {
    expect(removeGrossingStain(specimen(withProtocol as Partial<Specimen>), 'blk-1', 'stain-1', 'tech-1', false))
      .toEqual({ ok: false, needsConfirmation: true, origin: 'protocol' });
  });
});
