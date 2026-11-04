// Batch 731 (Lab Workflow & Batch spec §10.6): orders on an exhausted block, answers to a "Block exhausted" flag with
// an alternative, and re-embedding at the Embedding Station — each checked in the service, each audited.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { placeAddOnOrders, respondToAddOnException, completeReembedding, molecularOrderRequests } from './addOnOrderActions';

const reqs = () => resolveFieldRequirements('addOnOrder', {});
const actor = { id: 'path-1', name: 'Dr. Chen' };
const he = { id: 'st-he', name: 'H&E', category: 'Routine', active: true } as StainType;
const er = { id: 'st-er', name: 'ER', category: 'IHC', active: true } as StainType;
const submission = { priority: 'Routine Sign-Out' as const, slideMediaType: 'Standard Charged' as const };

const slide = (id: string, level: number, over: Partial<StainOrder> = {}): StainOrder =>
  ({ id, stainName: 'Unstained', status: 'Cut & Placed', displayId: `S26-9-A2-L${level}`, ...over } as StainOrder);
const theCase = (exhaustedStains: StainOrder[] = [slide('h', 1, { stainName: 'H&E' }), slide('u2', 2), slide('u3', 3)]): Case => ({
  id: 'S26-9', accession: { fullAccession: 'S26-9' },
  specimens: [{ id: 'sp1', label: 'A', blocks: [
    { id: 'b1', label: '1', status: 'Embedded', stains: [] } as unknown as HistologyBlock,
    { id: 'b2', label: '2', status: 'Exhausted', stains: exhaustedStains } as unknown as HistologyBlock,
  ] } as Specimen],
} as unknown as Case);

function deps(refuse: string[] = []) {
  return {
    enforce: vi.fn(async (key: string) => ({ allowed: !refuse.includes(key) })),
    saveSpecimens: vi.fn(async () => {}),
    audit: vi.fn(async () => ({})),
    recordEndState: vi.fn(),
  };
}
const saved = (d: ReturnType<typeof deps>) => (d.saveSpecimens.mock.calls[0] as unknown as [Case, Specimen[]])[1][0];

describe('placing an order on an exhausted block', () => {
  it('keeps the flat refusal when no choice is given', async () => {
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b2'], lines: [{ stainType: he, orderKind: 'recut' }], submission, actor, requirements: reqs() }, deps());
    expect(r.refused).toEqual([{ block: 'A2', code: 'blockExhausted' }]);
  });

  it('blocks a line with no alternative, and needs a reason', async () => {
    const d = deps();
    const base = { caseData: theCase(), blockIds: ['b2'], lines: [{ stainType: he, orderKind: 'recut' as const }, { stainType: er, orderKind: 'ihc' as const }], submission, actor, requirements: reqs() };
    const blocked = await placeAddOnOrders({ ...base, exhaustedChoices: { b2: { reason: 'x', lines: { 1: { kind: 'useSlide', slideId: 'u2' } } } } }, d);
    expect(blocked.refused).toEqual([{ block: 'A2', code: 'exhaustedNeedsChoice', lines: [0] }]);
    const noReason = await placeAddOnOrders({ ...base, exhaustedChoices: { b2: { reason: ' ', lines: { 0: { kind: 'otherBlock', blockId: 'b1' }, 1: { kind: 'useSlide', slideId: 'u2' } } } } }, d);
    expect(noReason.refused).toEqual([{ block: 'A2', code: 'exhaustedReasonRequired' }]);
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('applies each line\'s alternative in one save, and audits it', async () => {
    const d = deps();
    const r = await placeAddOnOrders({
      caseData: theCase(), blockIds: ['b2'], submission, actor, requirements: reqs(),
      lines: [{ stainType: er, orderKind: 'ihc' }, { stainType: he, orderKind: 'recut' }, { stainType: he, orderKind: 'recut', levelDepthMicrons: 20 }],
      exhaustedChoices: { b2: { reason: 'Needed to complete the diagnosis', lines: { 0: { kind: 'useSlide', slideId: 'u2' }, 1: { kind: 'reembed' }, 2: { kind: 'otherBlock', blockId: 'b1' } } } },
    }, d);
    expect(r.ok).toBe(true);
    expect(d.enforce).toHaveBeenCalledWith('material:reembed:request', { caseId: 'S26-9' });
    const sp = saved(d);
    const b2 = sp.blocks!.find(b => b.id === 'b2')!;
    expect(b2.status).toBe('Exhausted');
    expect(b2.stains.find(s => s.id === 'u2')).toMatchObject({ stainName: 'ER', status: 'Cut & Placed', orderedByPathologistId: 'path-1' });
    const waiting = b2.stains.find(s => s.stainName === 'H&E' && s.status === 'Pending Cut')!;
    expect(waiting.exception).toMatchObject({ reason: 'Block exhausted', status: 'reembed_requested', note: 'Needed to complete the diagnosis' });
    expect(sp.blocks!.find(b => b.id === 'b1')!.stains[0]).toMatchObject({ stainName: 'H&E', status: 'Pending Cut', levelDepthMicrons: 20 });
    expect(d.audit).toHaveBeenCalledTimes(1);
    expect((d.audit.mock.calls[0] as unknown as [{ event: string; detail: string }])[0]).toMatchObject({ event: 'Add-On Order On Exhausted Block' });
    expect((d.audit.mock.calls[0] as unknown as [{ detail: string }])[0].detail).toContain('Reason: Needed to complete the diagnosis');
  });

  it('re-embedding needs material:reembed:request', async () => {
    const d = deps(['material:reembed:request']);
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b2'], lines: [{ stainType: he, orderKind: 'recut' }], submission, actor, requirements: reqs(),
      exhaustedChoices: { b2: { reason: 'r', lines: { 0: { kind: 'reembed' } } } } }, d);
    expect(r).toEqual({ ok: false, notPermitted: true });
  });

  it('a molecular test on an unstained slide still goes to the molecular engine', () => {
    const before = theCase();
    const after = [{ ...before.specimens[0], blocks: before.specimens[0].blocks!.map(b => b.id !== 'b2' ? b : { ...b, stains: b.stains.map(s => s.id === 'u2' ? { ...s, stainName: 'HER2 FISH' } : s) }) }] as Specimen[];
    const fish = { id: 'st-fish', name: 'HER2 FISH', category: 'Molecular', active: true } as StainType;
    expect(molecularOrderRequests(before, after, [{ stainType: fish, orderKind: 'molecular' }], actor)).toHaveLength(0);
    expect(molecularOrderRequests(before, after, [{ stainType: fish, orderKind: 'molecular' }], actor, undefined, ['u2'])).toHaveLength(1);
  });
});

describe('answering a "Block exhausted" flag with an alternative', () => {
  const flagged = () => theCase([slide('h', 1, { stainName: 'H&E' }), slide('u2', 2), { id: 'o1', stainName: 'ER', status: 'Pending Cut', orderedByPathologistId: 'path-1',
    exception: { reason: 'Block exhausted', flaggedBy: 't', flaggedByName: 'Tech', flaggedAt: 'x', status: 'pending_pathologist_review', blockStatusBefore: 'Embedded' } } as StainOrder]);

  it('uses an unstained slide, audits it and records the block\'s "exhausted" end state', async () => {
    const d = deps();
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'use_unstained', alternative: { slideId: 'u2' }, responseNote: 'ok', actor, requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    expect(d.enforce).toHaveBeenCalledWith('add-on:order:place', { caseId: 'S26-9' });
    expect(saved(d).blocks![1].stains.find(s => s.id === 'u2')?.stainName).toBe('ER');
    expect(d.audit).toHaveBeenCalledTimes(1);
    expect(d.recordEndState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'S26-9-A2', state: 'exhausted', source: 'exhaustion_flag' }));
  });

  it('re-embedding needs material:reembed:request and records no end state', async () => {
    const refused = deps(['material:reembed:request']);
    expect(await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'reembed', actor, requirements: reqs() }, refused)).toEqual({ ok: false, notPermitted: true });
    const d = deps();
    expect(await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'reembed', actor, requirements: reqs() }, deps())).toEqual({ ok: false, missing: ['responseNote'] });
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'reembed', responseNote: 'remnant in formalin', actor, requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    expect(d.recordEndState).not.toHaveBeenCalled();
    expect(saved(d).blocks![1].stains.find(s => s.id === 'o1')?.exception?.status).toBe('reembed_requested');
  });

  it('an alternative without its slide or block is refused', async () => {
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'use_unstained', responseNote: 'x', actor, requirements: reqs() }, deps());
    expect(r).toEqual({ ok: false, failed: true });
  });
});

describe('marking the block re-embedded (Embedding Station)', () => {
  const waiting = () => theCase([{ id: 'o1', stainName: 'ER', status: 'Pending Cut', exception: { reason: 'Block exhausted', flaggedBy: 'p', flaggedByName: 'P', flaggedAt: 'x', status: 'reembed_requested', blockStatusBefore: 'Embedded' } } as StainOrder]);
  it('needs material:reembed:complete', async () => {
    expect(await completeReembedding({ caseData: waiting(), blockId: 'b2', actor }, deps(['material:reembed:complete']))).toEqual({ ok: false, notPermitted: true });
  });
  it('releases the waiting orders, puts the block back to Embedded and audits it', async () => {
    const d = deps();
    const r = await completeReembedding({ caseData: waiting(), blockId: 'b2', actor }, d);
    expect(r).toMatchObject({ ok: true, released: 1 });
    expect(saved(d).blocks![1].status).toBe('Embedded');
    expect(d.audit).toHaveBeenCalledTimes(1);
    expect(await completeReembedding({ caseData: theCase(), blockId: 'b2', actor }, deps())).toEqual({ ok: false, failed: true });
  });
});

describe('Batch 732: an order for pieces of a multi-piece block (spec §11.4, §11.5)', () => {
  const pieced = (): Case => ({
    id: 'S26-9', accession: { fullAccession: 'S26-9' },
    specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', status: 'Embedded', blockType: 'multi_piece', stains: [],
      pieces: [{ id: 'p1', position: 1, partLabel: 'A', exhaustedAt: 'x' }, { id: 'p2', position: 2, partLabel: 'A' }] } as unknown as HistologyBlock] } as Specimen],
  } as unknown as Case);
  const base = { blockIds: ['b1'], lines: [{ stainType: he, orderKind: 'recut' as const }], submission, actor, requirements: reqs() };

  it('stamps the pieces on the slides; refuses used-up pieces without a choice and a mix of used and remaining', async () => {
    const d = deps();
    const ok = await placeAddOnOrders({ ...base, caseData: pieced(), pieceIdsByBlock: { b1: ['p2'] } }, d);
    expect(ok.ok).toBe(true);
    expect(saved(d).blocks![0].stains[0].pieceIds).toEqual(['p2']);
    expect((await placeAddOnOrders({ ...base, caseData: pieced(), pieceIdsByBlock: { b1: ['p1'] } }, deps())).refused).toEqual([{ block: 'A1', code: 'pieceExhausted' }]);
    expect((await placeAddOnOrders({ ...base, caseData: pieced(), pieceIdsByBlock: { b1: ['p1', 'p2'] } }, deps())).refused).toEqual([{ block: 'A1', code: 'mixedPieces' }]);
  });

  it('a used-up piece takes the alternatives, including another piece that remains', async () => {
    const d = deps();
    const r = await placeAddOnOrders({ ...base, caseData: pieced(), pieceIdsByBlock: { b1: ['p1'] },
      exhaustedChoices: { b1: { reason: 'Last material available', lines: { 0: { kind: 'otherPiece', pieceId: 'p2' } } } } }, d);
    expect(r.ok).toBe(true);
    expect(saved(d).blocks![0].stains[0]).toMatchObject({ status: 'Pending Cut', pieceIds: ['p2'] });
    expect((d.audit.mock.calls[0] as unknown as [{ detail: string }])[0].detail).toContain('moved to piece 2 (A)');
  });
});

describe('Batch 732 review fixes', () => {
  it('a recut flagged on an exhausted block can never go onto an existing slide', async () => {
    const recut = theCase([slide('u2', 2), { id: 'o1', stainName: 'H&E', status: 'Pending Cut', routedQueueLabel: 'Histology Cutting Queue',
      exception: { reason: 'Block exhausted', flaggedBy: 't', flaggedByName: 'T', flaggedAt: 'x', status: 'pending_pathologist_review' } } as StainOrder]);
    expect(await respondToAddOnException({ caseData: recut, stainOrderId: 'o1', action: 'use_unstained', alternative: { slideId: 'u2' }, responseNote: 'x', actor, requirements: reqs() }, deps()))
      .toEqual({ ok: false, failed: true });
  });
  it('a moved order takes its control slide with it', async () => {
    const withControl = theCase([
      { id: 'o1', stainName: 'ER', status: 'Pending Cut', pairedControlSlideId: 'c1', exception: { reason: 'Block exhausted', flaggedBy: 't', flaggedByName: 'T', flaggedAt: 'x', status: 'pending_pathologist_review' } } as StainOrder,
      { id: 'c1', stainName: 'ER (Control)', status: 'Pending Cut', isControlSlide: true, pairedControlSlideId: 'o1' } as StainOrder,
    ]);
    const d = deps();
    await respondToAddOnException({ caseData: withControl, stainOrderId: 'o1', action: 'other_block', alternative: { blockId: 'b1' }, responseNote: 'x', actor, requirements: reqs() }, d);
    const sp = saved(d);
    const moved = sp.blocks![0].stains;
    expect(moved.map(s => s.stainName)).toEqual(['ER', 'ER (Control)']);
    expect(moved[1]).toMatchObject({ isControlSlide: true, pairedControlSlideId: moved[0].id });
    expect(moved[0].pairedControlSlideId).toBe(moved[1].id);
    expect(sp.blocks![1].stains.find(s => s.id === 'c1')?.status).toBe('Cancelled');
  });
});

describe('Batch 733 (Pete, Oct 30): one flag per block, one answer, destructive cutting only while tissue may remain', () => {
  const panel = (): Case => ({
    id: 'S26-9', accession: { fullAccession: 'S26-9' },
    specimens: [{ id: 'sp1', label: 'A', blocks: [
      { id: 'b1', label: '1', status: 'Embedded', stains: [] } as unknown as HistologyBlock,
      { id: 'b2', label: '2', status: 'Embedded', stains: [
        slide('u2', 2), slide('u3', 3), slide('u4', 4),
        { id: 'o1', stainName: 'ER', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder,
        { id: 'o2', stainName: 'PR', status: 'Pending Cut', orderedByPathologistId: 'path-2' } as StainOrder,
        { id: 'o3', stainName: 'HER2', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder,
        { id: 'done', stainName: 'H&E', status: 'Cut & Placed' } as StainOrder,
      ] } as unknown as HistologyBlock,
    ] } as Specimen],
  } as unknown as Case);
  const notify = () => ({ ...deps(), getUserEmail: vi.fn(async (id: string) => `${id}@lab.test`), sendEmail: vi.fn(async () => ({})) });

  it('one flag covers every slide still waiting to be cut and e-mails each ordering pathologist once', async () => {
    const { flagAddOnException } = await import('./addOnOrderActions');
    const d = notify();
    const r = await flagAddOnException({ caseData: panel(), stainOrderId: 'o1', reason: 'Block exhausted', note: 'facing through', actor, requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    const b2 = saved(d).blocks![1];
    expect(b2.status).toBe('Exhausted');
    expect(b2.stains.filter(s => s.exception?.status === 'pending_pathologist_review').map(s => s.id)).toEqual(['o1', 'o2', 'o3']);
    expect(b2.stains.find(s => s.id === 'done')?.exception).toBeUndefined();
    expect(b2.stains.find(s => s.id === 'o2')?.exception?.blockStatusBefore).toBe('Embedded');
    expect((d.sendEmail.mock.calls[0] as unknown as [{ to: string[] }])[0].to.sort()).toEqual(['path-1@lab.test', 'path-2@lab.test']);
  });

  async function flagged(): Promise<Case> {
    const { flagAddOnException } = await import('./addOnOrderActions');
    const d = notify();
    await flagAddOnException({ caseData: panel(), stainOrderId: 'o1', reason: 'Block exhausted', note: 'n', actor, requirements: reqs() }, d);
    const c = panel();
    return { ...c, specimens: [saved(d)] } as Case;
  }

  it('one answer applies to every waiting slide; "answer this slide only" applies to one', async () => {
    const all = deps();
    const r = await respondToAddOnException({ caseData: await flagged(), stainOrderId: 'o2', action: 'use_unstained', alternative: { slideId: 'u3' }, responseNote: 'reuse', actor, requirements: reqs() }, all);
    expect(r).toMatchObject({ ok: true, answered: 3 });
    const b2 = saved(all).blocks![1];
    expect(['u2', 'u3', 'u4'].map(id => b2.stains.find(s => s.id === id)?.stainName).sort()).toEqual(['ER', 'HER2', 'PR']);
    expect(b2.stains.find(s => s.id === 'u3')?.stainName).toBe('PR');
    const one = deps();
    const r1 = await respondToAddOnException({ caseData: await flagged(), stainOrderId: 'o2', action: 'other_block', alternative: { blockId: 'b1' }, responseNote: 'x', individually: true, actor, requirements: reqs() }, one);
    expect(r1).toMatchObject({ ok: true, answered: 1 });
    expect(saved(one).blocks![1].stains.filter(s => s.exception?.status === 'pending_pathologist_review').map(s => s.id)).toEqual(['o1', 'o3']);
  });

  it('refuses a group "use an unstained slide" when there are not enough slides', async () => {
    const c = await flagged();
    const sp = c.specimens[0];
    const fewer = { ...c, specimens: [{ ...sp, blocks: sp.blocks!.map(b => b.id !== 'b2' ? b : { ...b, stains: b.stains.filter(s => s.id !== 'u4') }) }] } as Case;
    expect(await respondToAddOnException({ caseData: fewer, stainOrderId: 'o1', action: 'use_unstained', alternative: { slideId: 'u2' }, responseNote: 'x', actor, requirements: reqs() }, deps()))
      .toEqual({ ok: false, alternativeRefused: 'notEnoughSlides' });
  });

  it('approving destructive cutting needs a reason, and is refused when the block was already exhausted', async () => {
    const c = await flagged();
    expect(await respondToAddOnException({ caseData: c, stainOrderId: 'o1', action: 'approve_destructive_cut', actor, requirements: reqs() }, deps())).toEqual({ ok: false, missing: ['responseNote'] });
    const d = deps();
    const ok = await respondToAddOnException({ caseData: c, stainOrderId: 'o1', action: 'approve_destructive_cut', responseNote: 'diagnosis needs it', actor, requirements: reqs() }, d);
    expect(ok).toMatchObject({ ok: true, answered: 3 });
    expect(saved(d).blocks![1].status).toBe('Exhausted');
    const sp = c.specimens[0];
    const already = { ...c, specimens: [{ ...sp, blocks: sp.blocks!.map(b => b.id !== 'b2' ? b : { ...b, stains: b.stains.map(s => s.exception ? { ...s, exception: { ...s.exception, blockStatusBefore: 'Exhausted' as const } } : s) }) }] } as Case;
    expect(await respondToAddOnException({ caseData: already, stainOrderId: 'o1', action: 'approve_destructive_cut', responseNote: 'x', actor, requirements: reqs() }, deps()))
      .toEqual({ ok: false, alternativeRefused: 'nothingLeft' });
  });
});
