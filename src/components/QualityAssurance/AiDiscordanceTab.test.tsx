// @vitest-environment happy-dom
// Batch 610 (#78): Quality Assurance → AI discordance.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const granted = new Set<string>();
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (c: string) => ({ allowed: granted.has(c) }),
    evaluate: async (c: string) => ({ allowed: granted.has(c) }),
    grantedCapabilities: async () => new Set(granted),
  },
}));
const exportSpy = vi.fn(async () => undefined);
vi.mock('./qaReportUtils', async importOriginal => ({
  ...(await importOriginal<typeof import('./qaReportUtils')>()),
  exportQaReportRows: (...args: unknown[]) => exportSpy(...(args as [])),
}));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({
    loading: false,
    has: (c: string) => granted.has(c),
    decide: (c: string) => ({ allowed: granted.has(c), reason: granted.has(c) ? undefined : 'notGranted', missingRequirements: [] }),
  }),
}));
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@/i18n/config';
import { AiDiscordanceTab } from './AiDiscordanceTab';
import { aiStalledResultSettingsService } from '@/services';

describe('AiDiscordanceTab', () => {
  beforeEach(() => { localStorage.clear(); granted.clear(); exportSpy.mockClear(); });
  afterEach(cleanup);

  it('shows each AI product with its counts and discordance rate, and the highest comes first', async () => {
    render(<AiDiscordanceTab />);
    const table = await screen.findByRole('table', { name: 'Discordance by AI product' });
    await waitFor(() => expect(within(table).getAllByRole('row').length).toBeGreaterThan(2));
    const rows = within(table).getAllByRole('row').slice(1);
    // PathAI's one reviewed result was a disagreement, so it leads with 100.0%.
    expect(within(rows[0]).getByText('100.0%')).toBeTruthy();
    expect(within(rows[0]).getAllByRole('cell')[0].textContent).toMatch(/PathAI/);
    // A product with nothing reviewed says so, not 0%.
    expect(within(table).getAllByText('Not yet reviewed').length).toBeGreaterThan(0);
  });

  it('lists the AI result that has been waiting too long, tagging the accession for redaction', async () => {
    render(<AiDiscordanceTab />);
    const table = await screen.findByRole('table', { name: 'Stalled AI results' });
    const cell = await within(table).findByText('O26-0002');
    expect(cell.getAttribute('data-phi')).toBe('accession');
    expect(screen.getByText('Stalled AI results (1)')).toBeTruthy();
  });

  it('a shorter timeout changes the list; a bad value is refused', async () => {
    granted.add('config:vendor-integrations:manage');
    render(<AiDiscordanceTab />);
    const input = await screen.findByLabelText('Stalled after (hours)');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a whole number of hours from 1 to 720.')).toBeTruthy();
    fireEvent.change(input, { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a whole number of hours from 1 to 720.')).toBeTruthy();
    fireEvent.change(input, { target: { value: '720' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await aiStalledResultSettingsService.get()).toEqual({ ok: true, data: { timeoutHours: 720 } }));
    // The seeded stalled result was ordered in September: still older than 720 hours (30 days)?
    // Whatever the date, the empty message must name the new timeout when nothing is stalled.
    await waitFor(() => expect(screen.queryByText(/Stalled AI results \(/)).toBeTruthy());
  });

  it('without the permission to change it, the timeout save is refused with a message', async () => {
    render(<AiDiscordanceTab />);
    const input = await screen.findByLabelText('Stalled after (hours)');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('You don\'t have permission to change this setting.')).toBeTruthy();
  });

  it('exports the rates and the stalled list under the AI discordance export permission, with English column names', async () => {
    granted.add('qa:ai-discordance:export');
    render(<AiDiscordanceTab />);
    await screen.findByText('O26-0002'); // the data has loaded
    const rates = await screen.findByRole('button', { name: 'Export discordance rates' });
    expect(rates.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(rates);
    await waitFor(() => expect(exportSpy).toHaveBeenCalledTimes(1));
    const [capability, rows, filename] = exportSpy.mock.calls[0] as unknown as [string, Record<string, unknown>[], string];
    expect(capability).toBe('qa:ai-discordance:export');
    expect(filename).toMatch(/^ai-discordance-by-vendor-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(Object.keys(rows[0])).toContain('Discordance rate (%)');

    fireEvent.click(screen.getByRole('button', { name: 'Export stalled results' }));
    await waitFor(() => expect(exportSpy).toHaveBeenCalledTimes(2));
    const stalledRows = (exportSpy.mock.calls[1] as unknown as [string, Record<string, unknown>[]])[1];
    expect(stalledRows[0].Accession).toBe('O26-0002');
  });

  it('the export buttons are greyed out and do nothing without the permission', async () => {
    render(<AiDiscordanceTab />);
    const rates = await screen.findByRole('button', { name: 'Export discordance rates' });
    expect(rates.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(rates);
    expect(exportSpy).not.toHaveBeenCalled();
  });
});
