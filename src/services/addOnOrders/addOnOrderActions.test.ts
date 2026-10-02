import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { placeAddOnOrders, respondToAddOnException, flagAddOnException, markAddOnBlockRetrieved } from './addOnOrderActions';
import { resolveSendOutLabChoices } from '@/utils/addOnOrderOperations';

const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('addOnOrder', over);
const actor = { id: 'path-1', name: 'Dr. Chen' };
const he = { id: 'st-he', name: 'H&E', category: 'Routine', active: true } as StainType;
const fish = { id: 'st-fish', name: 'HER2 FISH', category: 'Molecular', active: true } as StainType;

const block = (id: string, label: string, over: Partial<HistologyBlock> = {}): HistologyBlock =>
  ({ id, label, status: 'Embedded', stains: [{ id: `${id}-he`, stainName: 'H&E', status: 'Pending Cut' } as StainOrder], ...over } as HistologyBlock);
const theCase = (blocks: HistologyBlock[] = [block('b1', '1'), block('b2', '2')]): Case =>
  ({ id: 'S26-9', accession: { fullAccession: 'S26-9' }, specimens: [{ id: 'sp1', label: 'A', blocks } as Specimen] } as unknown as Case);

function deps(allowed = true) {
  return {
    enforce: vi.fn(async () => ({ allowed })),
    saveSpecimens: vi.fn(async () => {}),
    getUserEmail: vi.fn(async () => 'chen@example.org'),
    sendEmail: vi.fn(async () => ({})),
  };
}
const submission = { priority: 'Routine Sign-Out' as const, slideMediaType: 'Standard Charged' as const };

describe('placeAddOnOrders (Batch 403)', () => {
  it('checks add-on:order:place and stops on a refusal, saving nothing', async () => {
    const d = deps(false);
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b1'], lines: [{ stainType: he, orderKind: 'recut' }], submission, actor, requirements: reqs() }, d);
    expect(d.enforce).toHaveBeenCalledWith('add-on:order:place', { caseId: 'S26-9' });
    expect(r).toEqual({ ok: false, notPermitted: true });
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('two blocks of one specimen both keep their new orders (the second no longer overwrites the first)', async () => {
    const d = deps();
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b1', 'b2'], lines: [{ stainType: he, orderKind: 'recut', levelDepthMicrons: 4 }], submission, actor, requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    expect(d.saveSpecimens).toHaveBeenCalledTimes(1);
    const saved = (d.saveSpecimens.mock.calls[0] as unknown as [Case, Specimen[]])[1][0];
    expect(saved.blocks!.find(b => b.id === 'b1')!.stains).toHaveLength(2);
    expect(saved.blocks!.find(b => b.id === 'b2')!.stains).toHaveLength(2);
  });

  it('a send-out line must name its reference lab (Pete: locked)', async () => {
    const d = deps();
    const input = { caseData: theCase(), blockIds: ['b1'], submission, actor, requirements: reqs({ sendOutLab: false }) };
    expect(await placeAddOnOrders({ ...input, lines: [{ stainType: fish, orderKind: 'molecular' }] }, d)).toEqual({ ok: false, missing: ['sendOutLab'] });
    const ok = await placeAddOnOrders({ ...input, lines: [{ stainType: fish, orderKind: 'molecular', sendOutReferenceLabFacilityId: 'ref-1', sendOutReferenceLabName: 'Mayo' }] }, d);
    expect(ok.ok).toBe(true);
    const order = ok.specimens![0].blocks![0].stains.find(s => s.stainName === 'HER2 FISH')!;
    expect(order.sendOutReferenceLabFacilityId).toBe('ref-1');
    expect(order.sendOutReferenceLabName).toBe('Mayo');
  });

  it('refuses when nothing is chosen, and says which block a refusal was for', async () => {
    const d = deps();
    const empty = await placeAddOnOrders({ caseData: theCase(), blockIds: [], lines: [], submission, actor, requirements: reqs() }, d);
    expect(empty.missing).toEqual(['addOnBlocks', 'addOnLines']);
    const exhausted = await placeAddOnOrders({ caseData: theCase([block('b1', '1', { status: 'Exhausted' })]), blockIds: ['b1'], lines: [{ stainType: he, orderKind: 'recut' }], submission, actor, requirements: reqs() }, d);
    expect(exhausted.refused).toEqual([{ block: 'A1', code: 'blockExhausted' }]);
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('asks for the level depth and cutting instructions when the organisation requires them', async () => {
    const d = deps();
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b1'], lines: [{ stainType: he, orderKind: 'recut' }], submission, actor, requirements: reqs({ levelDepth: true, cuttingInstructions: true }) }, d);
    expect(r.missing).toEqual(['levelDepth', 'cuttingInstructions']);
  });
});

describe('exceptions (Batch 403)', () => {
  const flagged = () => theCase([block('b1', '1', { stains: [{
    id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1',
    exception: { reason: 'Block exhausted', flaggedBy: 't1', flaggedByName: 'Tech', flaggedAt: '2026-09-30', status: 'pending_pathologist_review' },
  } as StainOrder] })]);

  it('approving destructive cutting checks its own permission', async () => {
    const d = deps(false);
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'approve_destructive_cut', actor, requirements: reqs() }, d);
    expect(d.enforce).toHaveBeenCalledWith('add-on:exception:approve-destructive-cut', { caseId: 'S26-9' });
    expect(r.notPermitted).toBe(true);
  });

  it('cancel and modify check add-on:order:place; modify changes the order and resubmits it', async () => {
    const d = deps();
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'modify', modifyChanges: { levelDepthMicrons: 8, cuttingInstructions: 'Face in gently' }, actor, requirements: reqs() }, d);
    expect(d.enforce).toHaveBeenCalledWith('add-on:order:place', { caseId: 'S26-9' });
    const order = r.specimens![0].blocks![0].stains[0];
    expect(order.levelDepthMicrons).toBe(8);
    expect(order.cuttingInstructions).toBe('Face in gently');
    expect(order.exception).toBeUndefined();
  });

  it('a response note is asked for only when the organisation requires one', async () => {
    const d = deps();
    const r = await respondToAddOnException({ caseData: flagged(), stainOrderId: 'o1', action: 'cancel', responseNote: ' ', actor, requirements: reqs({ responseNote: true }) }, d);
    expect(r.missing).toEqual(['responseNote']);
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('flagging needs no permission, follows the note rule, and emails the ordering pathologist', async () => {
    const d = deps();
    const base = { caseData: theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]), stainOrderId: 'o1', reason: 'Block exhausted' as const, actor };
    expect((await flagAddOnException({ ...base, requirements: reqs({ exceptionNote: true }) }, d)).missing).toEqual(['exceptionNote']);
    const r = await flagAddOnException({ ...base, note: 'Nothing left', requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    expect(d.enforce).not.toHaveBeenCalled();
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['chen@example.org'] }));
    expect(r.specimens![0].blocks![0].status).toBe('Exhausted');
  });

  it('marking the block retrieved saves the change', async () => {
    const d = deps();
    const r = await markAddOnBlockRetrieved({ caseData: theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]), stainOrderId: 'o1', actor }, d);
    expect(r.ok).toBe(true);
    expect(r.specimens![0].blocks![0].stains[0].blockRetrievedAt).toBeTruthy();
  });
});

describe('resolveSendOutLabChoices (Batch 403)', () => {
  const labs = [{ id: 'mayo', name: 'Mayo' }, { id: 'arup', name: 'ARUP' }, { id: 'quest', name: 'Quest' }];
  it('limits the picker to the test\'s pre-approved labs and fills in its default', () => {
    expect(resolveSendOutLabChoices({ referenceLabFacilityIds: ['arup', 'mayo'], defaultReferenceLabFacilityId: 'mayo' }, labs))
      .toEqual({ choices: [labs[1], labs[0]], defaultId: 'mayo', limited: true });
  });
  it('fills in the only approved lab even without a default', () => {
    expect(resolveSendOutLabChoices({ referenceLabFacilityIds: ['quest'] }, labs).defaultId).toBe('quest');
  });
  it('with several approved labs and no default, the pathologist picks (nothing filled)', () => {
    expect(resolveSendOutLabChoices({ referenceLabFacilityIds: ['quest', 'arup'] }, labs).defaultId).toBeUndefined();
  });
  it('a test with no linked lab still active offers every active reference lab', () => {
    expect(resolveSendOutLabChoices({ referenceLabFacilityIds: ['gone'] }, labs)).toEqual({ choices: labs, limited: false });
    expect(resolveSendOutLabChoices({}, labs).limited).toBe(false);
  });
});
