import { describe, it, expect } from 'vitest';
import { epathReviewWords } from './epathReviewCodes';

describe('epathReviewWords', () => {
  it('turns each kind of code into a locale key', () => {
    expect(epathReviewWords('field:PID-11')).toEqual({ key: 'field', params: { field: 'PID-11' } });
    expect(epathReviewWords('rule:finalReportOnly')).toEqual({ key: 'rule.finalReportOnly' });
    expect(epathReviewWords('routing:noProfile')).toEqual({ key: 'routing.noProfile' });
    expect(epathReviewWords('whatever')).toEqual({ key: 'unknown' });
  });
});
