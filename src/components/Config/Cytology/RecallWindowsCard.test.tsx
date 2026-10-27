// @vitest-environment happy-dom
// Batch 640: the recall settings card against the real services (localStorage), permission allowed. A lab administrator picks a
// country from the dropdown, edits its windows and wording, and saves; the other country is unaffected.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Pat Admin' } }) }));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import RecallWindowsCard from './RecallWindowsCard';
import { cytologyScreeningStrategyService } from '@/services';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const K = 'cytologyScreeningStrategySection.recallWindows';
const country = () => document.getElementById('ps-recall-jurisdiction') as HTMLSelectElement;

describe('RecallWindowsCard (Batch 640)', () => {
  it('shows each country its own repeat-collection window', async () => {
    render(<RecallWindowsCard />);
    expect(country().value).toBe('AU');
    expect(screen.queryByText(`${K}.repeatNZ`)).toBeNull();
    expect(screen.getByText(`${K}.repeatAU`)).toBeTruthy();
    fireEvent.change(country(), { target: { value: 'NZ' } });
    expect(screen.getByText(`${K}.repeatNZ`)).toBeTruthy();
    expect(screen.queryByText(`${K}.repeatAU`)).toBeNull();
  });

  it('saves one country\'s window and wording and leaves the other as it was; the dropdown waits while edits are unsaved', async () => {
    render(<RecallWindowsCard />);
    await new Promise(r => setTimeout(r, 150)); // let the saved settings load first
    const urgentFrom = screen.getByLabelText(`${K}.urgent ${K}.from`) as HTMLInputElement;
    fireEvent.change(urgentFrom, { target: { value: '1' } });
    expect(country().disabled).toBe(true);
    fireEvent.change(document.getElementById('ps-recall-text-clinician_lbc')!, { target: { value: 'Our text for {{type}}' } });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(async () => {
      const r: any = await cytologyScreeningStrategyService.get();
      expect(r.data.selfCollectedRecallWindowsByJurisdiction.AU.urgent).toEqual({ min: 1, max: 4 });
      expect(r.data.selfCollectedRecallWording).toEqual({ AU: { clinician_lbc: { en: 'Our text for {{type}}' } } });
    });
    expect((await cytologyScreeningStrategyService.get() as any).data.selfCollectedRecallWindowsByJurisdiction.NZ).toBeUndefined();
    await waitFor(() => expect(country().disabled).toBe(false));
  });

  it('an unknown placeholder blocks Save', () => {
    render(<RecallWindowsCard />);
    fireEvent.change(document.getElementById('ps-recall-text-clinician_lbc')!, { target: { value: '{{name}}' } });
    expect(screen.getByText(`${K}.wordingProblem.unknown-placeholder`)).toBeTruthy();
    expect((screen.getByText('common.save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('settings that load after the person starts typing do not overwrite the edit', async () => {
    render(<RecallWindowsCard />);
    const urgentFrom = screen.getByLabelText(`${K}.urgent ${K}.from`) as HTMLInputElement;
    fireEvent.change(urgentFrom, { target: { value: '3' } }); // before the saved settings have loaded
    await new Promise(r => setTimeout(r, 150));
    expect((screen.getByLabelText(`${K}.urgent ${K}.from`) as HTMLInputElement).value).toBe('3');
  });
});
