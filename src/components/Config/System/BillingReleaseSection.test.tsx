// @vitest-environment happy-dom
// Batch 619 (PS-800): the Billing Release screen: enterprise rules, a facility following or owning rules, saving, removing, the live check.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { seedRules, ANY_CRITERIA, DEFAULT_ACTION } from '@/services/billingRelease/billingRelease';

const svc = vi.hoisted(() => ({
  billingReleaseService: {
    getAll: vi.fn(),
    set: vi.fn(async () => ({ ok: true, data: {} })),
    remove: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-a', name: 'Westside', status: 'Active' }] })) },
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import BillingReleaseSection from './BillingReleaseSection';

const S = 'billingReleaseSection';
const facilityRule = { id: 'f1', facilityId: 'fac-a', criteria: { ...ANY_CRITERIA, billingType: '26' as const }, action: { ...DEFAULT_ACTION, holdDurationMinutes: 240 }, updatedAt: '' };
const rules = [...seedRules(''), facilityRule];
const card = (id: string) => document.querySelector(`[data-rule="${id}"]`) as HTMLElement;
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('BillingReleaseSection', () => {
  it('enterprise view lists the enterprise rules only', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: rules });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    expect(card('brr-ent-TC').textContent).toContain(`${S}.summary.atMilestone`);
    expect(card('brr-ent-26').textContent).toContain(`${S}.source.enterprise`);
    expect(card('f1')).toBeNull();
  });
  it('a facility shows its own rules, or says it follows the enterprise', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: rules });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(card('f1').textContent).toContain(`${S}.summary.hold{"minutes":240}`);
    expect(card('f1').textContent).toContain(`${S}.source.facility`);
    expect(screen.queryByText(`${S}.followsEnterprise`)).toBeNull();
  });
  it('a facility with no rules follows the enterprise', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: seedRules('') });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(screen.getByText(`${S}.followsEnterprise`)).toBeTruthy();
  });
  it('adds a rule for the chosen facility, behind the capability', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: rules });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    const add = screen.getByText(`${S}.addRule`) as HTMLButtonElement;
    expect(add.getAttribute('data-capability')).toBe('config:billing-release:manage');
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText(`${S}.editor.billingType`), { target: { value: 'TC' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.holdMinutes`), { target: { value: '45' } });
    fireEvent.click(screen.getByText(`${S}.editor.save`));
    await waitFor(() => expect(svc.billingReleaseService.set).toHaveBeenCalled());
    const sent = (svc.billingReleaseService.set.mock.calls[0] as unknown[])[0] as { facilityId: string; criteria: { billingType: string }; action: { holdDurationMinutes: number } };
    expect([sent.facilityId, sent.criteria.billingType, sent.action.holdDurationMinutes]).toEqual(['fac-a', 'TC', 45]);
  });
  it('will not save an invalid hold and shows why', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: rules });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(card('brr-ent-26').querySelectorAll('button')[0]);
    fireEvent.change(screen.getByLabelText(`${S}.editor.holdMinutes`), { target: { value: '-3' } });
    expect(screen.getByText(`${S}.problems.holdInvalid`)).toBeTruthy();
    expect((screen.getByText(`${S}.editor.save`) as HTMLButtonElement).disabled).toBe(true);
  });
  it('removes a rule', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: rules });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(card('brr-ent-TC').querySelectorAll('button')[1]);
    await waitFor(() => expect(svc.billingReleaseService.remove).toHaveBeenCalledWith('brr-ent-TC'));
  });
  it('the live check answers with the same logic as the queue', async () => {
    svc.billingReleaseService.getAll.mockResolvedValue({ ok: true, data: seedRules('') });
    render(<BillingReleaseSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(screen.getByLabelText(`${S}.test.signedOut`));
    fireEvent.click(screen.getByText(`${S}.test.run`));
    expect(screen.getByRole('status').textContent).toContain(`${S}.reasons.awaitingSignOut`);
    fireEvent.click(screen.getByLabelText(`${S}.test.cptMapped`));
    fireEvent.click(screen.getByText(`${S}.test.run`));
    expect(screen.getByRole('status').textContent).toContain(`${S}.review.unmappedCpt`);
  });
});
