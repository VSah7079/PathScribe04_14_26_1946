import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { resolveAutopsyAuthorizationCompletionValidation, type AutopsyAuthorizationCompletionFormState } from './resolveAutopsyAuthorizationCompletionValidation';

function baseForm(overrides: Partial<AutopsyAuthorizationCompletionFormState>): AutopsyAuthorizationCompletionFormState {
  return { orderReference: '', orderDate: '', consentGivenAt: '', consentScope: '', excludedOrgans: '', retentionPermitted: true, ...overrides };
}

describe('resolveAutopsyAuthorizationCompletionValidation', () => {
  it('a real forensic case with no real written order reference or date is invalid', () => {
    const result = resolveAutopsyAuthorizationCompletionValidation('statutory_judicial', baseForm({}));
    expect(result.valid).toBe(false);
    expect(result.missingFieldIds).toEqual(['autopsyOrderReference', 'autopsyOrderDate']);
  });

  it('a real forensic case with a real, complete written order is valid', () => {
    const result = resolveAutopsyAuthorizationCompletionValidation('statutory_judicial', baseForm({ orderReference: 'CO-2026-4471', orderDate: '2026-09-01' }));
    expect(result.valid).toBe(true);
  });

  it('a real hospital-consented case with no real consentGivenAt is invalid', () => {
    const result = resolveAutopsyAuthorizationCompletionValidation('hospital_consented', baseForm({}));
    expect(result.valid).toBe(false);
    expect(result.missingFieldIds).toEqual(['autopsyConsentGivenAt']);
  });

  it('a real hospital-consented case with a real consentGivenAt is valid, even with no real consentScope specified', () => {
    const result = resolveAutopsyAuthorizationCompletionValidation('hospital_consented', baseForm({ consentGivenAt: '2026-09-01T10:00:00Z' }));
    expect(result.valid).toBe(true);
  });

  it('an organisation can also require the consent scope (Batch 383)', () => {
    const requirements = resolveFieldRequirements('report', { autopsyConsentScope: true });
    const result = resolveAutopsyAuthorizationCompletionValidation('hospital_consented', baseForm({ consentGivenAt: '2026-09-01T10:00:00Z' }), requirements);
    expect(result.valid).toBe(false);
    expect(result.missingFieldIds).toEqual(['autopsyConsentScope']);
  });
});
