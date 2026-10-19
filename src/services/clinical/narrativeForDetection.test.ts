import { describe, expect, it } from 'vitest';
import { narrativeForDetection } from './narrativeForDetection';
import type { Case } from '@/types/case/Case';

const make = (c: Record<string, unknown>) => c as unknown as Pick<Case, 'diagnostic' | 'microscopicReports'>;

describe('narrativeForDetection (PS-323)', () => {
  it('includes text typed into a specimen Microscopic Description', () => {
    const n = narrativeForDetection(make({
      diagnostic: { microscopicDescription: 'LIS text.' },
      microscopicReports: [{ instanceId: 'm1', specimenId: 'A', text: 'Sections show invasive carcinoma, grade 2.' }],
    }));
    expect(n.microscopic).toContain('invasive carcinoma');
    expect(n.microscopic).toContain('LIS text.');
  });

  it('does not repeat identical text', () => {
    const n = narrativeForDetection(make({
      diagnostic: { microscopicDescription: 'Same text.' },
      microscopicReports: [{ instanceId: 'm1', specimenId: 'A', text: 'Same text.' }],
    }));
    expect(n.microscopic).toBe('Same text.');
  });

  it('joins several specimens and skips blank ones', () => {
    const n = narrativeForDetection(make({
      microscopicReports: [
        { instanceId: 'm1', specimenId: 'A', text: 'One.' },
        { instanceId: 'm2', specimenId: 'B', text: '   ' },
        { instanceId: 'm3', specimenId: 'C', text: 'Two.' },
      ],
    }));
    expect(n.microscopic).toBe('One. Two.');
  });

  it('passes gross and ancillary through and gives blanks for a case with no narrative', () => {
    expect(narrativeForDetection(make({ diagnostic: { grossDescription: 'G', ancillaryStudies: 'A' } }))).toEqual({ gross: 'G', microscopic: '', ancillary: 'A' });
    expect(narrativeForDetection(make({}))).toEqual({ gross: '', microscopic: '', ancillary: '' });
  });
});
