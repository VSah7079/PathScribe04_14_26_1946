import { describe, it, expect } from 'vitest';
import { qcSelectionReasonLabel, qcSelectionReasons } from './qcSelectionReasonLabels';

describe('qcSelectionReasonLabels (Batch 501)', () => {
  it('labels each kind of reason; a rule shows its name, or its id if the rule is gone', () => {
    expect(qcSelectionReasonLabel('rose_discrepancy', {}).key).toBe('cytologyQcQueue.selectedBy.reason.roseDiscrepancy');
    expect(qcSelectionReasonLabel('rule:r1', { r1: 'All GYN' })).toEqual({ key: 'cytologyQcQueue.selectedBy.reason.rule', values: { name: 'All GYN' } });
    expect(qcSelectionReasonLabel('rule:gone', {}).values).toEqual({ name: 'gone' });
    expect(qcSelectionReasonLabel('peer_review_flag:random_selection', {}).key).toBe('cytologyQcQueue.selectedBy.reason.peerReviewRandom');
    expect(qcSelectionReasonLabel('peer_review_flag:targeted_high_risk', {}).key).toBe('cytologyQcQueue.selectedBy.reason.peerReviewTargeted');
    expect(qcSelectionReasonLabel('something_new', {}).key).toBe('cytologyQcQueue.selectedBy.reason.other');
  });
  it('an older assignment with no reasons falls back to its trigger', () => {
    expect(qcSelectionReasons({ triggerSource: 'rule_match', matchedRuleId: 'r9' })).toEqual(['rule:r9']);
    expect(qcSelectionReasons({ triggerSource: 'rose_discrepancy' })).toEqual(['rose_discrepancy']);
    expect(qcSelectionReasons({ triggerSource: 'rule_match', selectionReasons: ['a', 'b'] })).toEqual(['a', 'b']);
  });
});
