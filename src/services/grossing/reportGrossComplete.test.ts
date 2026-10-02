// Batch 398 (PS-359): the case report page's Gross Complete applies the
// organisation's Grossing field requirements and case:grossing:complete, as
// the Grossing screen does; a Grossing template counts as the protocol (Pete).
import { describe, it, expect, vi } from 'vitest';
import { checkReportGrossComplete, reportPageProtocolSatisfied, specimensWithoutGrossEntry } from './reportGrossComplete';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';

const kase = (over: any = {}) => ({
  id: 'O26-0030', status: 'accessioned', order: { facilityId: 'fac-1' },
  specimens: [
    { id: 'a', label: 'A', blocks: [{ id: 'a1', label: '1' }] },
    { id: 'b', label: 'B', blocks: [] },
  ],
  grossingReports: [
    { instanceId: 'g-a', specimenId: 'a', templateId: 't', status: 'draft', answers: { size: '2 cm' } },
    { instanceId: 'g-b', specimenId: 'b', templateId: 't', status: 'draft', answers: { size: '1 cm' } },
  ],
  ...over,
}) as any;
const allow = () => ({ authorization: { enforce: vi.fn().mockResolvedValue({ allowed: true }) } });

describe('Report page Gross Complete (Batch 398)', () => {
  it('a Grossing template meets the protocol rule, so the defaults let it complete, as before', async () => {
    const d = allow();
    expect(await checkReportGrossComplete(kase(), resolveFieldRequirements('grossing'), { isUpdate: false }, d)).toEqual({ ok: true, forReview: [] });
    expect(d.authorization.enforce).toHaveBeenCalledWith('case:grossing:complete', { caseId: 'O26-0030', facilityId: 'fac-1' });
  });

  it('a specimen with neither a protocol nor a template is stopped while the protocol rule is on', async () => {
    const c = kase({ grossingReports: [kase().grossingReports[0]] });
    const r = await checkReportGrossComplete(c, resolveFieldRequirements('grossing'), { isUpdate: false }, allow());
    expect(r).toMatchObject({ ok: false, reason: 'missing' });
    expect(r.missing).toEqual([{ fieldId: 'protocol', where: ['B'] }]);
  });

  it('with the protocol rule off, it asks first, then routes that specimen for secondary review', async () => {
    const c = kase({ grossingReports: [kase().grossingReports[0]] });
    const reqs = resolveFieldRequirements('grossing', { protocol: false });
    expect(await checkReportGrossComplete(c, reqs, { isUpdate: false }, allow())).toMatchObject({ ok: false, reason: 'needsConfirmation', withoutProtocol: ['B'] });
    expect(await checkReportGrossComplete(c, reqs, { isUpdate: false, confirmedWithoutProtocol: true }, allow())).toEqual({ ok: true, forReview: ['B'] });
    // An update never asks again: the review was raised at first completion.
    expect(await checkReportGrossComplete(c, reqs, { isUpdate: true }, allow())).toEqual({ ok: true, forReview: [] });
  });

  it('the organisation\'s other rules apply: a required piece count names the block, on first completion and on update', async () => {
    const reqs = resolveFieldRequirements('grossing', { pieceCount: true });
    for (const isUpdate of [false, true]) {
      const r = await checkReportGrossComplete(kase(), reqs, { isUpdate }, allow());
      expect(r.missing).toEqual([{ fieldId: 'pieceCount', where: ['A1'] }]);
    }
  });

  it('blocks are expected only of a specimen with an attached protocol, not one with just a template', async () => {
    const r = await checkReportGrossComplete(kase(), resolveFieldRequirements('grossing'), { isUpdate: false }, allow());
    expect(r.ok).toBe(true);
    const withProtocol = kase({ specimens: [{ id: 'b', label: 'B', blocks: [], protocolSnapshot: { id: 'p', version: 1, name: 'P' } }] });
    expect((await checkReportGrossComplete(withProtocol, resolveFieldRequirements('grossing'), { isUpdate: false }, allow())).missing).toEqual([{ fieldId: 'blocks', where: ['B'] }]);
  });

  it('without case:grossing:complete it is refused', async () => {
    const d = { authorization: { enforce: vi.fn().mockResolvedValue({ allowed: false }) } };
    expect(await checkReportGrossComplete(kase(), resolveFieldRequirements('grossing'), { isUpdate: false }, d)).toMatchObject({ ok: false, reason: 'notPermitted' });
  });

  it('what counts as the protocol on this page', () => {
    const ok = reportPageProtocolSatisfied(kase({ grossingReports: [kase().grossingReports[0]] }));
    expect(ok({ id: 'a' } as any)).toBe(true);
    expect(ok({ id: 'b' } as any)).toBe(false);
    expect(ok({ id: 'b', protocolSnapshot: { id: 'p', version: 1, name: 'P' } } as any)).toBe(true);
  });

  it('specimens with no grossing entered (moved from the hook)', () => {
    const blank = kase({ grossingReports: [{ ...kase().grossingReports[0] }, { ...kase().grossingReports[1], answers: { size: '', tags: [] } }] });
    expect(specimensWithoutGrossEntry(blank, [])).toEqual(['B']);
    expect(specimensWithoutGrossEntry(blank, [{ sourcePartId: 'std_body_gross', specimenId: 'b', text: 'Tan nodule' }])).toEqual([]);
    expect(specimensWithoutGrossEntry(blank, [{ sourcePartId: 'std_body_gross', text: 'Case-wide gross' }])).toEqual([]);
    expect(specimensWithoutGrossEntry(kase({ grossingReports: [] }), [{ sourcePartId: 'std_body_gross', specimenId: 'b', text: '  ' }])).toEqual(['A', 'B']);
  });
});
