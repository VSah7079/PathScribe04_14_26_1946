// Batch 738: the "Review before finalising" window names questions and answers as the template does (no stored ids).
import { describe, it, expect } from 'vitest';
import { buildSynopticReviewEntries, displayAnswer } from './synopticReviewEntries';

const template = { sections: [{ title: 'Tumor', fields: [
  { id: 'tumor_site', label: 'Tumor Site', options: [{ id: 'tumor_site_opt_8', label: 'Sigmoid colon' }] },
  { id: 'tumor_size', label: 'Tumor Size (cm)' },
] }] };

describe('synoptic review entries (Batch 738)', () => {
  it('shows option labels and template labels; free text and unknown ids as they are', async () => {
    const [e] = await buildSynopticReviewEntries(
      [{ instanceId: 'i1', templateId: 't', templateName: 'Colon', specimenId: 's1', status: 'draft', answers: { tumor_site: ['tumor_site_opt_8'], tumor_size: '4.2 cm', other_field: 'x_opt_1' } }],
      [{ id: 's1', label: 'A', description: 'Sigmoid colon' }],
      async () => template,
    );
    expect(e.answers).toEqual({ tumor_site: ['Sigmoid colon'], tumor_size: '4.2 cm', other_field: 'x_opt_1' });
    expect(e.fieldLabels.tumor_site).toBe('Tumor Site');
    expect(e.fieldLabels.other_field).toBe('Other Field');
    expect(e.sections).toEqual([{ title: 'Tumor', fieldKeys: ['tumor_site', 'tumor_size'] }]);
    expect([e.answeredCount, e.totalCount, e.specimenLabel]).toEqual([3, 3, 'A']);
  });
  it('a template that cannot be loaded leaves the stored values and the generic labels', async () => {
    const [e] = await buildSynopticReviewEntries([{ instanceId: 'i', templateId: 't', specimenId: 's', answers: { procedure: 'procedure_opt_5' } }], [], async () => { throw new Error('x'); });
    expect(e.answers.procedure).toBe('procedure_opt_5');
    expect(e.sections).toEqual([]);
    expect(displayAnswer(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });
});
