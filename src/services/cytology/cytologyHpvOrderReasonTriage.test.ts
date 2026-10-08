// Batch 450 (PS-179): the HPV order reason (co-test, ASC-US reflex, post-treatment
// surveillance) is clinical context for the report only; it never changes triage.
// Every combination of strategy, HPV result and collection type gives the same
// worklist, triage-pending and recall-needed answers whatever the order reason.
import { describe, it, expect } from 'vitest';
import type { Specimen } from '@/types/case/Specimen';
import type { SpecimenEntry } from '../specimenDictionary/specimenTypes';
import type { CytologyScreeningStrategy } from './ICytologyScreeningStrategyService';
import { resolveCaseCytologyWorklistMembership } from './resolveCaseCytologyWorklistMembership';
import { resolveCaseCytologyTriagePendingMembership } from './resolveCaseCytologyTriagePendingMembership';
import { resolveCaseCytologyRecallNeededMembership } from './resolveCaseCytologyRecallNeededMembership';

const DICTIONARY: Pick<SpecimenEntry, 'id' | 'type' | 'isSelfCollected' | 'specimenCategory'>[] = [
  { id: 'sp-cyto-pap', type: 'Cytology', specimenCategory: 'GYN_CYTOLOGY' },
  { id: 'sp-cyto-hpv-self', type: 'Cytology', specimenCategory: 'GYN_CYTOLOGY', isSelfCollected: true },
];
const STRATEGIES: CytologyScreeningStrategy[] = ['co_testing', 'primary_hpv_reflex', 'cytology_only'];
const HPV_RESULTS = [undefined, 'Pending', 'Positive', 'Negative', 'Not Performed'];
const ENTRIES = ['sp-cyto-pap', 'sp-cyto-hpv-self'];
const ORDER_REASONS: (NonNullable<Specimen['cytologyScreening']>['hpvOrderReason'])[] = ['co_test', 'ascus_reflex', 'post_treatment_surveillance'];

function triage(entryId: string, hpvResult: string | undefined, strategy: CytologyScreeningStrategy, hpvOrderReason?: string) {
  const specimens = [{ specimenDictionaryEntryId: entryId, cytologyScreening: { hpvResult, hpvOrderReason } }];
  return {
    worklist: resolveCaseCytologyWorklistMembership(specimens, DICTIONARY, 'cytology_worklist', strategy),
    triagePending: resolveCaseCytologyTriagePendingMembership(specimens, DICTIONARY, 'cytology_worklist', strategy),
    recallNeeded: resolveCaseCytologyRecallNeededMembership(specimens, DICTIONARY, 'cytology_worklist', strategy),
  };
}

describe('HPV order reason and cytology triage', () => {
  it('every order reason gives the same triage outcome as no order reason, in every strategy / result / collection combination', () => {
    let compared = 0;
    for (const strategy of STRATEGIES) for (const hpv of HPV_RESULTS) for (const entry of ENTRIES) {
      const baseline = triage(entry, hpv, strategy);
      for (const reason of ORDER_REASONS) {
        expect(triage(entry, hpv, strategy, reason), `${strategy} / ${hpv} / ${entry} / ${reason}`).toEqual(baseline);
        compared++;
      }
    }
    expect(compared).toBe(STRATEGIES.length * HPV_RESULTS.length * ENTRIES.length * ORDER_REASONS.length);
  });

  it('an ASC-US reflex order with no HPV result under primary HPV screening still waits for the result (no shortcut to the worklist)', () => {
    expect(triage('sp-cyto-pap', undefined, 'primary_hpv_reflex', 'ascus_reflex')).toEqual({ worklist: false, triagePending: true, recallNeeded: false });
  });

  it('a co-test order with a negative HPV result under primary HPV screening is still complete, not sent for cytology', () => {
    expect(triage('sp-cyto-pap', 'Negative', 'primary_hpv_reflex', 'co_test')).toEqual({ worklist: false, triagePending: false, recallNeeded: false });
  });
});
