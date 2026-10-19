// @vitest-environment happy-dom
// Batch 613: Configuration → System → Reporting feed (Power BI).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('@/utils/performingLabs', () => ({ getActivePerformingLabs: async () => [{ id: 'f1', name: 'Main Lab' }, { id: 'f2', name: 'North Lab' }] }));

const hoisted = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));
vi.mock('@/services', async () => {
  const { createBiFeedService } = await import('@/services/biFeed/biFeedService');
  const { hashBiToken } = await import('@/services/biFeed/biFeedRules');
  const biFeedService = createBiFeedService({
    load: (k, fb) => (k in hoisted.store ? (hoisted.store[k] as never) : fb),
    save: (k, v) => { hoisted.store[k] = JSON.parse(JSON.stringify(v)); },
    audit: async () => undefined,
    actor: () => ({ name: 'Admin' }),
    now: () => new Date().toISOString(),
    random: n => globalThis.crypto.getRandomValues(new Uint8Array(n)),
    hash: hashBiToken,
  });
  return { biFeedService };
});

import BiFeedSection from './BiFeedSection';

beforeEach(() => { hoisted.store = {}; localStorage.clear(); });
afterEach(() => cleanup());

async function switchOn() {
  render(<BiFeedSection />);
  fireEvent.click(await screen.findByLabelText('biFeed.settings.enabled'));
  fireEvent.click(screen.getByLabelText(/biFeed\.datasets\.cases\.name/));
  fireEvent.click(await screen.findByLabelText('Main Lab'));
  fireEvent.click(screen.getByText('biFeed.settings.save'));
  await screen.findByText('biFeed.notice.settingsSaved');
}

describe('BiFeedSection', () => {
  it('starts off, labelled Simulated, with no tokens and creation locked', async () => {
    render(<BiFeedSection />);
    expect(await screen.findByTestId('bi-feed-empty')).toBeTruthy();
    expect(screen.getAllByText('biFeed.simulated').length).toBeGreaterThan(0);
    expect((screen.getByText('biFeed.tokens.create') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('biFeed.tokens.feedOff')).toBeTruthy();
  });

  it('cannot save a feed that is on with nothing chosen', async () => {
    render(<BiFeedSection />);
    fireEvent.click(await screen.findByLabelText('biFeed.settings.enabled'));
    expect(await screen.findByText('biFeed.problem.DATASETS_REQUIRED')).toBeTruthy();
    expect((screen.getByText('biFeed.settings.save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('creates a token, shows it once, and never lists it in the table', async () => {
    await switchOn();
    fireEvent.click(screen.getByText('biFeed.tokens.create'));
    const form = await screen.findByTestId('bi-feed-token-form');
    fireEvent.change(within(form).getByPlaceholderText('biFeed.form.namePlaceholder'), { target: { value: 'Quality dashboard' } });
    fireEvent.click(within(form).getByLabelText('biFeed.datasets.cases.name'));
    fireEvent.click(within(form).getByText('biFeed.form.submit'));
    const panel = await screen.findByTestId('bi-feed-token-panel');
    const token = panel.querySelector('code')!.textContent!;
    expect(token).toMatch(/^psbi_[0-9a-f]{48}$/);
    expect(document.querySelector('table')!.textContent).not.toContain(token);
    fireEvent.click(within(panel).getByText('biFeed.tokenPanel.done'));
    expect(document.body.textContent).not.toContain(token);
  });

  it('keeps identified mode locked until an approval is recorded', async () => {
    await switchOn();
    fireEvent.click(screen.getByText('biFeed.tokens.create'));
    const form = await screen.findByTestId('bi-feed-token-form');
    expect((within(form).getAllByRole('radio')[1] as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('biFeed.approval.none')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('biFeed.approval.approverPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByPlaceholderText('biFeed.approval.reasonPlaceholder'), { target: { value: 'Quality review' } });
    fireEvent.click(screen.getByText('biFeed.approval.record'));
    expect(await screen.findByTestId('bi-feed-approval-current')).toBeTruthy();
  });

  it('answers a Simulated pull from a pasted token and refuses a made-up one', async () => {
    await switchOn();
    fireEvent.click(screen.getByText('biFeed.tokens.create'));
    const form = await screen.findByTestId('bi-feed-token-form');
    fireEvent.change(within(form).getByPlaceholderText('biFeed.form.namePlaceholder'), { target: { value: 'Quality dashboard' } });
    fireEvent.click(within(form).getByLabelText('biFeed.datasets.cases.name'));
    fireEvent.click(within(form).getByText('biFeed.form.submit'));
    const token = (await screen.findByTestId('bi-feed-token-panel')).querySelector('code')!.textContent!;
    fireEvent.change(screen.getByPlaceholderText('biFeed.pull.tokenPlaceholder'), { target: { value: token } });
    fireEvent.change(screen.getByLabelText('biFeed.pull.dataset'), { target: { value: 'cases' } });
    fireEvent.click(screen.getByText('biFeed.pull.button'));
    await waitFor(() => expect(screen.getByTestId('bi-feed-pull-result').textContent).toContain('biFeed.pull.results.ok'));
    fireEvent.change(screen.getByPlaceholderText('biFeed.pull.tokenPlaceholder'), { target: { value: 'psbi_' + '0'.repeat(48) } });
    fireEvent.click(screen.getByText('biFeed.pull.button'));
    await waitFor(() => expect(screen.getByTestId('bi-feed-pull-result').textContent).toContain('biFeed.pull.results.unknown'));
  });

  it('shows the field catalogue with each dataset', async () => {
    render(<BiFeedSection />);
    expect(await screen.findByTestId('bi-feed-catalog-cases')).toBeTruthy();
    expect(screen.getByTestId('bi-feed-catalog-audit')).toBeTruthy();
  });
});
