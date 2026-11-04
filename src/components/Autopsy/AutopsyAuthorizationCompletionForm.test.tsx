// @vitest-environment happy-dom
// Batch 383 (PS-359): the authorization completion form takes what Submit
// needs from the organisation's Field Requirements, and Submit can be said.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
const { listeners, scope } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void>, scope: { required: false } }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  return {
    ...rules, ...checks,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('report', scope.required ? { autopsyConsentScope: true } : {})) },
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import AutopsyAuthorizationCompletionForm from './AutopsyAuthorizationCompletionForm';

afterEach(() => { cleanup(); listeners.length = 0; scope.required = false; });

const forensic = { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, forensicAuthorization: { verbalOrderReceivedFrom: 'Coroner', verbalOrderReceivedAt: '2026-09-01T01:00' } } as any;
const consented = { jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, hospitalConsent: { consentingRelativeName: 'A. Doe', consentingRelativeRelationship: 'Spouse' } } as any;

async function open(details: any) {
  const onSubmit = vi.fn();
  render(<AutopsyAuthorizationCompletionForm caseDetails={details} onSubmit={onSubmit} />);
  await waitFor(() => expect(listeners.length).toBe(1));
  return onSubmit;
}
const submit = () => screen.getByText('autopsyAuthCompletion.submitBtn') as HTMLButtonElement;
const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });

describe('AutopsyAuthorizationCompletionForm and Field Requirements (Batch 383)', () => {
  it('a medicolegal case needs the written order and its date before Submit', async () => {
    const onSubmit = await open(forensic);
    expect(submit().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.autopsyOrderReference');
    fill('autopsy-auth-order-reference', 'CO-2026-4471');
    fill('autopsy-auth-order-date', '2026-09-02');
    expect(submit().disabled).toBe(false);
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('the consent scope is asked for only when an organisation requires it', async () => {
    scope.required = true;
    const onSubmit = await open(consented);
    fill('autopsy-auth-consent-at', '2026-09-02T10:00');
    await waitFor(() => expect(submit().disabled).toBe(true));
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.autopsyConsentScope');
    fill('autopsy-auth-consent-scope', 'Full autopsy');
    expect(submit().disabled).toBe(false);
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Batch 468: excluded organs and retention permitted are optional — submitting with neither touched still passes an active, unrestricted consent through', async () => {
    const onSubmit = await open(consented);
    fill('autopsy-auth-consent-at', '2026-09-02T10:00');
    fill('autopsy-auth-consent-scope', 'Full autopsy');
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const updated = onSubmit.mock.calls[0][0];
    expect(updated.hospitalConsent.excludedOrgans).toEqual([]);
    expect(updated.hospitalConsent.retentionPermitted).toBe(true);
  });

  it('Batch 468: entering excluded organs and unchecking retention-permitted carries both through to the updated case', async () => {
    const onSubmit = await open(consented);
    fill('autopsy-auth-consent-at', '2026-09-02T10:00');
    fill('autopsy-auth-consent-scope', 'Diagnostic tissue only');
    fill('autopsy-auth-excluded-organs', 'brain, heart');
    fireEvent.click(document.getElementById('autopsy-auth-retention-permitted')!);
    fireEvent.click(submit());
    const updated = onSubmit.mock.calls[0][0];
    expect(updated.hospitalConsent.excludedOrgans).toEqual(['brain', 'heart']);
    expect(updated.hospitalConsent.retentionPermitted).toBe(false);
  });

  it('"record authorization" submits only when nothing is missing', async () => {
    const onSubmit = await open(forensic);
    act(() => listeners[0]('AUTOPSY_AUTH_SUBMIT'));
    expect(onSubmit).not.toHaveBeenCalled();
    fill('autopsy-auth-order-reference', 'CO-2026-4471');
    fill('autopsy-auth-order-date', '2026-09-02');
    act(() => listeners[0]('AUTOPSY_AUTH_SUBMIT'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
