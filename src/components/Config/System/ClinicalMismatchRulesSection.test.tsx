// @vitest-environment happy-dom
// Batch 529 (PS-554): Configuration → System → Clinical Mismatch Rules.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const granted = new Set<string>();
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (c: string) => ({ allowed: granted.has(c) }),
    evaluate: async (c: string) => ({ allowed: granted.has(c) }),
    grantedCapabilities: async () => new Set(granted),
  },
}));
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@/i18n/config';
import ClinicalMismatchRulesSection from './ClinicalMismatchRulesSection';
import { clinicalMismatchRuleService } from '@/services';

const VIEW = 'config:clinical-mismatch-rules:view';
const MANAGE = 'config:clinical-mismatch-rules:manage';

describe('ClinicalMismatchRulesSection', () => {
  beforeEach(() => { localStorage.clear(); granted.clear(); });
  afterEach(cleanup);

  it('without the view permission it says so and shows no rules', async () => {
    render(<ClinicalMismatchRulesSection />);
    expect(await screen.findByText('You don’t have permission to view these rules.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the five starting rules', async () => {
    granted.add(VIEW);
    render(<ClinicalMismatchRulesSection />);
    expect(await screen.findByRole('cell', { name: 'Unexpected malignancy' })).toBeTruthy();
    expect(screen.getAllByText('All specimen types')).toHaveLength(5);
    const action = screen.getByRole('spinbutton', { name: 'Action threshold for Unexpected malignancy, All specimen types' }) as HTMLInputElement;
    expect(action.value).toBe('70');
  });

  it('a threshold saves when the field is left; an invalid one is refused inline and nothing is saved', async () => {
    granted.add(VIEW); granted.add(MANAGE);
    render(<ClinicalMismatchRulesSection />);
    const action = await screen.findByRole('spinbutton', { name: 'Action threshold for Unexpected malignancy, All specimen types' });
    fireEvent.change(action, { target: { value: '50' } });
    fireEvent.blur(action);
    expect(await screen.findByText('The action threshold can’t be below the alert threshold.')).toBeTruthy();
    fireEvent.change(action, { target: { value: '80' } });
    fireEvent.blur(action);
    await waitFor(async () => expect((await clinicalMismatchRuleService.rulesForCheck())[0].actionThreshold).toBe(80));
  });

  it('without the manage permission a change is refused by the service', async () => {
    granted.add(VIEW);
    render(<ClinicalMismatchRulesSection />);
    const select = await screen.findByRole('combobox', { name: 'Action for Unexpected malignancy, All specimen types' });
    fireEvent.change(select, { target: { value: 'warn' } });
    expect(await screen.findByText('You don’t have permission to change these rules.')).toBeTruthy();
    expect((await clinicalMismatchRuleService.rulesForCheck())[0].actionType).toBe('block');
  });
  // Batch 609 (#31): whether a high-risk mismatch holds the release of an amendment, correction or addendum.
  it('the amendment setting is on by default, and the manage permission turns it off (audited by the service)', async () => {
    granted.add(VIEW); granted.add(MANAGE);
    render(<ClinicalMismatchRulesSection />);
    const box = await screen.findByRole('checkbox', { name: 'A high-risk mismatch holds the release until a decision is recorded' }) as HTMLInputElement;
    await waitFor(() => expect(box.checked).toBe(true));
    fireEvent.click(box);
    await waitFor(async () => expect(await clinicalMismatchRuleService.revisionHoldsRelease()).toBe(false));
    await waitFor(() => expect(box.checked).toBe(false));
  });

  it('without the manage permission the setting does not change', async () => {
    granted.add(VIEW);
    render(<ClinicalMismatchRulesSection />);
    const box = await screen.findByRole('checkbox', { name: 'A high-risk mismatch holds the release until a decision is recorded' }) as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(async () => expect(await clinicalMismatchRuleService.revisionHoldsRelease()).toBe(true));
    expect(box.checked).toBe(true);
  });
});
