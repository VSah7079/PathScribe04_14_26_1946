// @vitest-environment happy-dom
// Batch 610 (#71): Configuration → System → Tumor Board Auto-Flag Rules, the diagnosis and biomarker rules
// and the facility routing override.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const granted = new Set<string>();
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (c: string) => ({ allowed: granted.has(c) }),
    evaluate: async (c: string) => ({ allowed: granted.has(c) }),
    grantedCapabilities: async () => new Set(granted),
  },
}));
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@/i18n/config';
import TumorBoardRulesSection from './TumorBoardRulesSection';
import { tumorBoardCriteriaRuleService, facilityTumorBoardRuleOverrideService } from '@/services';

const MANAGE = 'config:tumor-board-rules:manage';

describe('Tumor Board diagnosis and biomarker rules', () => {
  beforeEach(() => { localStorage.clear(); granted.clear(); granted.add(MANAGE); });
  afterEach(cleanup);

  it('shows an empty state, then adds a rule made of a diagnosis and a biomarker criterion', async () => {
    render(<TumorBoardRulesSection />);
    expect(await screen.findByText('No diagnosis or biomarker rules yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Add rule' }));
    fireEvent.change(screen.getByLabelText('Rule description'), { target: { value: 'Triple negative' } });
    fireEvent.change(screen.getByLabelText('Diagnosis text for criterion 1'), { target: { value: 'ductal carcinoma' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add criterion' }));
    fireEvent.change(screen.getByLabelText('Biomarker for criterion 2'), { target: { value: 'ER' } });
    fireEvent.change(screen.getByLabelText('Result for criterion 2'), { target: { value: 'Negative' } });
    const card = screen.getByTestId('tbr-criteria-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Save' }));

    expect(await within(card).findByText(/Triple negative: diagnosis contains "ductal carcinoma"; ER Negative/)).toBeTruthy();
    const stored = await tumorBoardCriteriaRuleService.getAll();
    expect(stored.ok && stored.data[0].criteria).toEqual([
      { kind: 'diagnosis', text: 'ductal carcinoma' },
      { kind: 'biomarker', marker: 'ER', result: 'Negative' },
    ]);
  });

  it('says what is wrong and keeps the form open when the rule is incomplete', async () => {
    render(<TumorBoardRulesSection />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Add rule' }));
    const card = screen.getByTestId('tbr-criteria-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a description of 1 to 80 characters.')).toBeTruthy();
    expect(screen.getByLabelText('Rule description')).toBeTruthy();
  });

  it('removes a rule', async () => {
    await tumorBoardCriteriaRuleService.create({ label: 'Old rule', board: 'GI MDT', criteria: [{ kind: 'diagnosis', text: 'adenoma' }] });
    render(<TumorBoardRulesSection />);
    const card = await screen.findByTestId('tbr-criteria-card');
    await within(card).findByText(/Old rule/);
    fireEvent.click(within(card).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(within(card).queryByText(/Old rule/)).toBeNull());
  });

  it('a facility override can route a criteria rule to another board', async () => {
    const created = await tumorBoardCriteriaRuleService.create({ label: 'IDC', board: 'Breast MDT', criteria: [{ kind: 'diagnosis', text: 'ductal' }] });
    if (!created.ok) throw new Error('create failed');
    render(<TumorBoardRulesSection />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Add facility override' }));
    const ruleSelect = screen.getByLabelText('Enterprise baseline') as HTMLSelectElement;
    await waitFor(() => expect(Array.from(ruleSelect.options).some(o => o.value === created.data.id)).toBe(true));
    fireEvent.change(ruleSelect, { target: { value: created.data.id } });
    expect(document.getElementById('tbr-facility-threshold')).toBeNull(); // a criteria rule has no margin threshold
    fireEvent.change(screen.getByLabelText('Route to board'), { target: { value: 'Gyn-Onc' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' }).slice(-1)[0]);
    await waitFor(async () => {
      const all = await facilityTumorBoardRuleOverrideService.getAll();
      expect(all.ok && all.data[0]).toMatchObject({ ruleId: created.data.id, board: 'Gyn-Onc' });
    });
  });

  it('the margin rules still show their threshold', async () => {
    render(<TumorBoardRulesSection />);
    expect((await screen.findAllByText(/Close or positive margin/)).length).toBeGreaterThan(0);
  });
});
