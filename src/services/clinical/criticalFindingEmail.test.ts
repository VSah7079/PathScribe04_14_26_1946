// src/services/clinical/criticalFindingEmail.test.ts
import { describe, it, expect } from 'vitest';
import { criticalFindingEmail } from './criticalFindingEmail';

const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}${JSON.stringify(v)}` : k);

describe('criticalFindingEmail (Batch 517, PS-143)', () => {
  it('names the case and each finding with its source quote', () => {
    const { subject, body } = criticalFindingEmail([{ term: 'malignant', sourceField: "microscopic", sourceQuote: "invasive carcinoma" }], 'S26-4671', t);
    expect(subject).toBe('criticalFindingsModal.email.subject{"reference":"S26-4671"}');
    expect(body.split('\n')).toEqual([
      'criticalFindingsModal.email.opening{"reference":"S26-4671"}', '',
      'criticalFindingsModal.email.findingLine{"term":"malignant","sourceField":"microscopic"}',
      'criticalFindingsModal.email.quoteLine{"quote":"invasive carcinoma"}', '',
      'criticalFindingsModal.email.closing',
    ]);
  });
  it('without a case reference says so instead of leaving a gap', () => {
    expect(criticalFindingEmail([], '  ', t).subject).toBe('criticalFindingsModal.email.subject{"reference":"criticalFindingsModal.email.noReference"}');
  });
});
