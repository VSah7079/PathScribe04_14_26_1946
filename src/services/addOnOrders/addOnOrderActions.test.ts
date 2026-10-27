import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { placeAddOnOrders, respondToAddOnException, flagAddOnException, markAddOnBlockRetrieved } from './addOnOrderActions';
import { resolveSendOutLabChoices, withDefaultSendOutLab, resolveAddOnRouting } from '@/utils/addOnOrderOperations';

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

describe('Batch 467: in-house molecular lines', () => {
  const egfr = { id: 'st-egfr', name: 'EGFR PCR', category: 'Molecular', active: true, inHouseFacilityIds: ['lab-a'] } as unknown as StainType;

  it('an in-house line needs no reference lab, is routed to the in-house queue and becomes a molecular order', async () => {
    const d = { ...deps(), ingestMolecularOrders: vi.fn(async () => ({ refused: [] as unknown[] })) };
    const input = { caseData: theCase(), blockIds: ['b1'], submission, actor, requirements: reqs({ sendOutLab: false }), performingLabFacilityId: 'lab-a' };
    const r = await placeAddOnOrders({ ...input, lines: [{ stainType: egfr, orderKind: 'molecular', molecularRouting: 'IN_HOUSE' }] }, d);
    expect(r.ok).toBe(true);
    const order = r.specimens![0].blocks![0].stains.find(s => s.stainName === 'EGFR PCR')!;
    expect(order.routedQueueLabel).toBe('Molecular In-House Queue');
    const requests = (d.ingestMolecularOrders.mock.calls[0] as unknown as [unknown[]])[0];
    expect(requests).toEqual([expect.objectContaining({ caseId: 'S26-9', accession: 'S26-9', blockId: 'b1', assayTarget: 'st-egfr', routing: 'IN_HOUSE', performingLabFacilityId: 'lab-a', stainOrderId: order.id, orderedBy: 'path-1' })]);
  });

  it('a send-out molecular line still needs its lab, and routes to the send-out queue', async () => {
    const d = deps();
    const input = { caseData: theCase(), blockIds: ['b1'], submission, actor, requirements: reqs({ sendOutLab: false }) };
    expect(await placeAddOnOrders({ ...input, lines: [{ stainType: egfr, orderKind: 'molecular', molecularRouting: 'SEND_OUT' }] }, d)).toEqual({ ok: false, missing: ['sendOutLab'] });
    expect(resolveAddOnRouting('molecular', 'Molecular', 'SEND_OUT').queueLabel).toBe('Reference/Send-Out Lab Queue');
  });

  it('refuses an in-house line where the case\'s lab doesn\'t run the test, saving nothing', async () => {
    const d = { ...deps(), ingestMolecularOrders: vi.fn(async () => ({ refused: [] as unknown[] })) };
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['b1'], submission, actor, requirements: reqs(), performingLabFacilityId: 'lab-b', lines: [{ stainType: egfr, orderKind: 'molecular', molecularRouting: 'IN_HOUSE' }] }, d);
    expect(r).toEqual({ ok: false, inHouseNotAvailable: ['EGFR PCR'] });
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('a refused or failed ingest is reported, never turned into a failed placement (no resubmit, no duplicate slides)', async () => {
    const input = { caseData: theCase(), blockIds: ['b1'], submission, actor, requirements: reqs(), performingLabFacilityId: 'lab-a', lines: [{ stainType: egfr, orderKind: 'molecular' as const, molecularRouting: 'IN_HOUSE' as const }] };
    const refusing = { ...deps(), ingestMolecularOrders: vi.fn(async () => ({ refused: [{}] as unknown[] })) };
    expect(await placeAddOnOrders(input, refusing)).toMatchObject({ ok: true, molecularNotQueued: 1 });
    const throwing = { ...deps(), ingestMolecularOrders: vi.fn(async () => { throw new Error('down'); }) };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await placeAddOnOrders(input, throwing)).toMatchObject({ ok: true, molecularNotQueued: 1 });
    spy.mockRestore();
    expect(throwing.saveSpecimens).toHaveBeenCalledTimes(1);
  });

  it('a new line starts in-house only where the performing lab runs the test', () => {
    expect(withDefaultSendOutLab({ stainType: egfr, orderKind: 'molecular' }, [], 'lab-a').molecularRouting).toBe('IN_HOUSE');
    expect(withDefaultSendOutLab({ stainType: egfr, orderKind: 'molecular' }, [], 'lab-b').molecularRouting).toBe('SEND_OUT');
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

  it('flagging checks add-on:exception:flag (ws-19), follows the note rule, and emails the ordering pathologist', async () => {
    const d = deps();
    const base = { caseData: theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]), stainOrderId: 'o1', reason: 'Block exhausted' as const, actor };
    expect((await flagAddOnException({ ...base, requirements: reqs({ exceptionNote: true }) }, d)).missing).toEqual(['exceptionNote']);
    const r = await flagAddOnException({ ...base, note: 'Nothing left', requirements: reqs() }, d);
    expect(r.ok).toBe(true);
    expect(d.enforce).toHaveBeenCalledWith('add-on:exception:flag', { caseId: 'S26-9' });
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['chen@example.org'] }));
    expect(r.specimens![0].blocks![0].status).toBe('Exhausted');
  });

  it('ws-19: a refused flag changes and sends nothing', async () => {
    const d = deps(false);
    const r = await flagAddOnException({ caseData: theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]), stainOrderId: 'o1', reason: 'Block exhausted', note: 'x', actor, requirements: reqs() }, d);
    expect(r).toEqual({ ok: false, notPermitted: true });
    expect(d.saveSpecimens).not.toHaveBeenCalled();
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it('ws-19: marking a block retrieved checks add-on:block:mark-retrieved and stops on a refusal', async () => {
    const d = deps(false);
    const r = await markAddOnBlockRetrieved({ caseData: theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]), stainOrderId: 'o1', actor }, d);
    expect(d.enforce).toHaveBeenCalledWith('add-on:block:mark-retrieved', { caseId: 'S26-9' });
    expect(r).toEqual({ ok: false, notPermitted: true });
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  describe('ws-3: a slide with no ordering pathologist', () => {
    const original = () => theCase([block('b1', '1')]); // an original H&E: no orderedByPathologistId
    const base = () => ({ caseData: original(), stainOrderId: 'b1-he', reason: 'Block exhausted' as const, note: 'Nothing left', actor, requirements: reqs() });

    it('goes to the Supervisor / Accessioning Desk, not to nobody', async () => {
      const d = { ...deps(), getDeskRecipients: vi.fn(async () => ({ emails: ['desk@lab.org', 'lead@lab.org'], primaryPathologistName: 'Dr. Chen' })) };
      const r = await flagAddOnException(base(), d);
      expect(r).toMatchObject({ ok: true, noticeToDesk: true });
      expect(d.getUserEmail).not.toHaveBeenCalled();
      const mail = (d.sendEmail.mock.calls[0] as unknown as [{ to: string[]; bodyText: string; metadata: Record<string, string> }])[0];
      expect(mail.to).toEqual(['desk@lab.org', 'lead@lab.org']);
      expect(mail.bodyText).toContain('No ordering pathologist is recorded');
      expect(mail.bodyText).toContain('Dr. Chen');
      expect(mail.metadata.routedTo).toBe('supervisor-desk');
    });

    it('also goes to the desk when the ordering pathologist has no e-mail address', async () => {
      const d = { ...deps(), getUserEmail: vi.fn(async () => undefined), getDeskRecipients: vi.fn(async () => ({ emails: ['desk@lab.org'] })) };
      const c = theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'gone' } as StainOrder] })]);
      const r = await flagAddOnException({ ...base(), caseData: c, stainOrderId: 'o1' }, d);
      expect(r.noticeToDesk).toBe(true);
      expect((d.sendEmail.mock.calls[0] as unknown as [{ to: string[] }])[0].to).toEqual(['desk@lab.org']);
    });

    it('says nobody could be told when there is no desk address either, but the flag is still saved', async () => {
      const d = { ...deps(), getDeskRecipients: vi.fn(async () => ({ emails: [] })) };
      const r = await flagAddOnException(base(), d);
      expect(r).toMatchObject({ ok: true, noticeNotSent: true });
      expect(d.saveSpecimens).toHaveBeenCalledTimes(1);
      expect(d.sendEmail).not.toHaveBeenCalled();
    });

    it('a desk lookup that fails does not undo the flag', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const d = { ...deps(), getDeskRecipients: vi.fn(async () => { throw new Error('down'); }) };
      const r = await flagAddOnException(base(), d);
      expect(r).toMatchObject({ ok: true, noticeNotSent: true });
    });

    it('an ordering pathologist with an address is still the only one e-mailed', async () => {
      const d = { ...deps(), getDeskRecipients: vi.fn(async () => ({ emails: ['desk@lab.org'] })) };
      const c = theCase([block('b1', '1', { stains: [{ id: 'o1', stainName: 'Ki-67', status: 'Pending Cut', orderedByPathologistId: 'path-1' } as StainOrder] })]);
      const r = await flagAddOnException({ ...base(), caseData: c, stainOrderId: 'o1' }, d);
      expect(r.noticeToDesk).toBeUndefined();
      expect(d.getDeskRecipients).not.toHaveBeenCalled();
    });
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
