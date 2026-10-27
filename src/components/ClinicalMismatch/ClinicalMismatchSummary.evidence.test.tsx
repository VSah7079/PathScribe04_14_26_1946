// @vitest-environment happy-dom
// Batch 683: the mismatch flag shows the words on each side, and says when a quote is not in the record.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@/i18n/config';
import { ClinicalMismatchSummary } from './ClinicalMismatchSummary';
import { DEFAULT_CLINICAL_MISMATCH_RULES } from '@/services/clinical/clinicalMismatchRules';

const assessment = (evidence: object) => ({
  suggestion: { kind: 'unexpected-malignancy', confidence: 80, source: 'ai', explanation: 'Conflict.', evidence },
  outcome: { risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null, rule: DEFAULT_CLINICAL_MISMATCH_RULES[0] },
}) as never;

describe('ClinicalMismatchSummary evidence', () => {
  afterEach(cleanup);
  it('shows both quotes; a quote not in the record carries a warning', () => {
    render(<ClinicalMismatchSummary assessment={assessment({ clinical: { text: 'benign polyp', found: true }, pathology: { text: 'melanoma', found: false } })} />);
    expect(screen.getByTestId('mismatch-evidence-clinical').textContent).toContain('benign polyp');
    expect(screen.getByTestId('mismatch-evidence-clinical').textContent).not.toContain('not found');
    expect(screen.getByTestId('mismatch-evidence-pathology').textContent).toContain('not found in the record');
  });
  it('shows nothing extra when there is no evidence', () => {
    render(<ClinicalMismatchSummary assessment={assessment({})} />);
    expect(screen.queryByTestId('mismatch-evidence-clinical')).toBeNull();
  });
});
