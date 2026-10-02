import { describe, it, expect } from 'vitest';
import { resultInstanceIds, AUTOPSY_REPORT_INSTANCE_ID, isAutopsyCase } from './resultInstances';

const reports = [{ instanceId: 'A', status: 'finalized' }, { instanceId: 'B', status: 'draft' }];

describe('resultInstanceIds (Batch 393)', () => {
  it('a surgical final sends each finalized synoptic report; a preliminary sends them all', () => {
    expect(resultInstanceIds({ synopticReports: reports }, 'FINAL')).toEqual(['A']);
    expect(resultInstanceIds({ synopticReports: reports }, 'PRELIMINARY')).toEqual(['A', 'B']);
  });
  it('an autopsy report is one result, with or without synoptic reports', () => {
    expect(resultInstanceIds({ autopsy: {}, synopticReports: reports } as any, 'FINAL')).toEqual([AUTOPSY_REPORT_INSTANCE_ID]);
    expect(resultInstanceIds({ autopsy: {} } as any, 'PRELIMINARY')).toEqual([AUTOPSY_REPORT_INSTANCE_ID]);
    expect(isAutopsyCase({ autopsy: {} })).toBe(true);
  });
  it('no case, nothing', () => expect(resultInstanceIds(undefined, 'FINAL')).toEqual([]));
});
