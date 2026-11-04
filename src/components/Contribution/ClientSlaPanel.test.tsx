// @vitest-environment happy-dom
// Batch 610 (#164): the per-client SLA panel on the Quality and Productivity views.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
import ClientSlaPanel from './ClientSlaPanel';
import type { ClientSlaRow } from '@/services/clientSLA/clientSlaRules';

afterEach(cleanup);

const part = { within: 3, breached: 1, running: 0, avgHrs: 10, state: 'missed' as const };
const row: ClientSlaRow = { slaId: 's1', assigningAuthority: 'AUTH', clientName: 'Mercy Clinic', caseCount: 4, firstTouch: part, total: { ...part, state: 'met', breached: 0 }, state: 'missed' };

describe('ClientSlaPanel (#164)', () => {
  it('says so when no client has a service level', () => {
    render(<ClientSlaPanel rows={[]} />);
    expect(screen.getByText('clientSlaPanel.empty')).toBeTruthy();
  });

  it('shows a client row marked Missed when a case was late', () => {
    render(<ClientSlaPanel rows={[row]} />);
    expect(screen.getByText('Mercy Clinic')).toBeTruthy();
    expect(screen.getAllByText('clientSlaPanel.state.missed').length).toBeGreaterThan(0);
  });
});
