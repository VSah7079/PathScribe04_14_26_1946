// Batch 748 (Pete's seed row S11): the block-type cases follow the rules the bench screens apply (piece maps, block
// type profiles, the exhausted-block rule and its re-embedding alternative).
import { describe, expect, it } from 'vitest';
import { DEMO_BLOCK_TYPE_CASES, DEMO_BLOCK_TYPE_CASE_IDS, DEMO_BLOCK_TYPE_PATIENTS } from './demoBlockTypeCases';
import { DEMO_BASELINE_CASES } from './demoBaselineCases';
import { blockTypeOf, piecesOf, pieceMapProblems, slideSizeOf, BLOCK_TYPE_PROFILES } from '@/utils/blockPieceRules';
import { blockCanBeCut, ordersAwaitingReembed, completeReembed } from '@/utils/exhaustedBlockRules';
import { DEMO_SURGICAL_PATIENTS } from '../patients/demoSurgicalPatients';

const byId = (id: string) => DEMO_BLOCK_TYPE_CASES.find(c => c.id === id) as any;

describe('S11 block-type cases', () => {
  it('prostate: two multi-piece cassettes, each with a valid three-part piece map', () => {
    const c = byId(DEMO_BLOCK_TYPE_CASE_IDS.prostate);
    const blocks = c.specimens.flatMap((s: any) => s.blocks);
    expect(blocks).toHaveLength(2);
    for (const b of blocks) {
      expect(blockTypeOf(b)).toBe('multi_piece');
      const pieces = piecesOf(b);
      expect(pieces.map(p => p.position)).toEqual([1, 2, 3]);
      expect(pieceMapProblems(b.blockType, pieces)).toEqual([]);
      for (const p of pieces) expect(c.specimens.some((s: any) => s.label === p.partLabel), p.partLabel).toBe(true);
    }
  });

  it('megablock: mega cassette and mold, large-format slides', () => {
    const b = byId(DEMO_BLOCK_TYPE_CASE_IDS.megablock).specimens[0].blocks[0];
    expect(blockTypeOf(b)).toBe('megablock');
    expect(b.moldSize).toBe(BLOCK_TYPE_PROFILES.megablock.mold);
    for (const s of b.stains) expect(slideSizeOf(s, 'megablock')).toBe('large_format');
  });

  it('exhausted: the block cannot be cut, one add-on waits for re-embedding, and re-embedding releases it', () => {
    const sp = byId(DEMO_BLOCK_TYPE_CASE_IDS.exhausted).specimens[0];
    const b = sp.blocks[0];
    expect(blockCanBeCut(b)).toBe(false);
    expect(ordersAwaitingReembed(b).map((s: any) => s.stainName)).toEqual(['Ki-67']);
    const done = completeReembed(sp, b.id, { id: 'HT-001', name: 'Kevin Brooks' }, 'Re-embedded deeper.');
    expect(done).toMatchObject({ ok: true, released: 1 });
  });

  it('are in the baseline, on Dr. Sarah Johnson’s worklist, with their patients in the index', () => {
    for (const c of DEMO_BLOCK_TYPE_CASES as any[]) {
      expect((DEMO_BASELINE_CASES as any[]).some(x => x.id === c.id)).toBe(true);
      expect(c.order.assignedTo).toBe('PATH-SJ-001');
    }
    for (const p of DEMO_BLOCK_TYPE_PATIENTS) expect(DEMO_SURGICAL_PATIENTS.find(x => x.id === p.id)?.mrn).toBe(p.mrn);
  });
});
