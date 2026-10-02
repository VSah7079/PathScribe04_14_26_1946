import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import { batchCreateMissing, batchAbortMissing, batchOverrideMissing, coldChainAckMissing, BATCH_DEFAULT_REQUIREMENTS } from './batchChecks';

const defaults = resolveFieldRequirements('batchManagement', {});
const base = { processingNode: 'Processing', protocol: 'Overnight', identifierMode: 'disposable' as const };

describe('Batch Management Field Requirements (Batch 404)', () => {
  it('reproduces what New Container required, plus a locked abort reason (Pete)', () => {
    const byId = Object.fromEntries(FIELD_REQUIREMENT_PAGES.batchManagement.map(f => [f.id, f.default]));
    expect(byId).toEqual({
      protocol: 'locked', rackId: 'locked', decalDuration: 'locked', referralDestination: 'locked', referralTestRequested: 'optional',
      cytologyStainType: 'locked', stainingReagentLots: 'optional', abortReason: 'locked', overrideReason: 'locked', coldChainNote: 'locked',
    });
    expect(BATCH_DEFAULT_REQUIREMENTS).toEqual(defaults);
    expect(FIELD_GROUP_ORDER).toEqual(expect.arrayContaining(['batchCreate', 'batchClose']));
  });
  it('asks only for what the chosen node and identifier mode need', () => {
    expect(batchCreateMissing({ ...base, protocol: ' ' }, defaults)).toEqual(['protocol']);
    expect(batchCreateMissing(base, defaults)).toEqual([]);
    expect(batchCreateMissing({ ...base, identifierMode: 'semi_permanent' }, defaults)).toEqual(['rackId']);
    expect(batchCreateMissing({ ...base, processingNode: 'Decal / Special Processing', targetDurationMinutes: 0 }, defaults)).toEqual(['decalDuration']);
    expect(batchCreateMissing({ ...base, processingNode: 'External Referral' }, defaults)).toEqual(['referralDestination']);
    expect(batchCreateMissing({ ...base, processingNode: 'Cytology Staining' }, defaults)).toEqual(['cytologyStainType']);
    expect(batchCreateMissing({ ...base, processingNode: 'Staining' }, defaults)).toEqual([]);
  });
  it('the referral test and staining reagent lots are switches', () => {
    const strict = resolveFieldRequirements('batchManagement', { referralTestRequested: true, stainingReagentLots: true });
    expect(batchCreateMissing({ ...base, processingNode: 'External Referral', referralDestinationFacilityId: 'lab' }, strict)).toEqual(['referralTestRequested']);
    expect(batchCreateMissing({ ...base, processingNode: 'Staining' }, strict)).toEqual(['stainingReagentLots']);
    expect(batchCreateMissing({ ...base, processingNode: 'Staining', stainingReagentLotIds: ['lot-1'] }, strict)).toEqual([]);
    expect(batchCreateMissing(base, strict)).toEqual([]);
  });
  it('closing a batch out always needs its reason, which cannot be switched off', () => {
    const tried = resolveFieldRequirements('batchManagement', { abortReason: false, overrideReason: false, coldChainNote: false });
    expect(batchAbortMissing('', tried)).toEqual(['abortReason']);
    expect(batchOverrideMissing('  ', tried)).toEqual(['overrideReason']);
    expect(coldChainAckMissing(undefined, tried)).toEqual(['coldChainNote']);
    expect(batchAbortMissing('Wrong protocol', tried)).toEqual([]);
  });
});
