// Batch 406: the Control Rules page's decisions.
import { describe, it, expect } from 'vitest';
import { controlRuleDraftProblem, sampleRackSlotChoices, withControlPatch } from './controlRuleDraft';
import type { DeckSlot } from '../equipment/IEquipmentService';

describe('controlRuleDraftProblem', () => {
  it('needs the assay, and a well for every fixed control', () => {
    expect(controlRuleDraftProblem({ assayCode: ' ', requiredControls: [] })).toEqual({ code: 'assayRequired' });
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: ' ' }] }))
      .toEqual({ code: 'fixedPositionMissingWell', sampleType: 'CONTROL_NTC' });
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'random' }] })).toBeNull();
  });
});

describe('Batch 669 (mol-14): controlRuleDraftProblem', () => {
  const ntc = [{ sampleType: 'CONTROL_NTC' as const, positionMode: 'random' as const }];
  it('refuses a rule with no controls', () => {
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: [] })).toEqual({ code: 'controlsRequired' });
  });
  it('refuses an assay another rule already has (Edit passes the other rules), but not the rule\'s own', () => {
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: ntc }, [{ assayCode: 'a' }])).toEqual({ code: 'duplicateAssay' });
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: ntc }, [{ assayCode: 'b' }])).toBeNull();
  });
  it('needs a reason once one is asked for', () => {
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: ntc, reason: '  ' })).toEqual({ code: 'reasonRequired' });
    expect(controlRuleDraftProblem({ assayCode: 'a', requiredControls: ntc, reason: 'Kit changed' })).toBeNull();
  });
});

describe('sampleRackSlotChoices', () => {
  it('every sample-rack slot on any analyser, plus ones the rule already names, sorted', () => {
    const decks = [
      { deckSlots: [{ id: 'SLOT_A2', rackTypes: ['sample_tube_rack'] }, { id: 'SLOT_R1', rackTypes: ['reagent_cartridge'] }] as DeckSlot[] },
      { deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }] as DeckSlot[] },
      {},
    ];
    expect(sampleRackSlotChoices(decks, ['SLOT_OLD'])).toEqual(['SLOT_A1', 'SLOT_A2', 'SLOT_OLD']);
  });
});

describe('withControlPatch', () => {
  it('a control switched to random drops its well; fixed keeps it', () => {
    const c = { sampleType: 'CONTROL_NTC' as const, positionMode: 'fixed' as const, fixedWellPosition: 'A01' };
    expect(withControlPatch(c, { positionMode: 'random' }).fixedWellPosition).toBeUndefined();
    expect(withControlPatch(c, { sampleType: 'CALIBRATOR' }).fixedWellPosition).toBe('A01');
  });
});
