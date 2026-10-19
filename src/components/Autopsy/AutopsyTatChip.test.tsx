// @vitest-environment happy-dom
//
// Batch 610 (#60, #88): the autopsy turnaround chip renders the verdict the
// engine decides (tested in services/autopsy/resolveAutopsyTatStatus.test.ts).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useTatEntries', () => ({ useTatEntries: () => [] }));

import AutopsyTatChip from './AutopsyTatChip';

afterEach(cleanup);
const autopsy = { jurisdiction: 'DE', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false } } as AutopsyCaseDetails;
const source = { specimens: [{ receivedAt: '2026-10-01T00:00:00Z' }] };

describe('AutopsyTatChip', () => {
  it('shows on track early in the window', () => {
    render(<AutopsyTatChip autopsy={autopsy} caseSource={source} now={new Date('2026-10-01T10:00:00Z')} />);
    expect(screen.getByTestId('autopsy-tat-chip').textContent).toBe('autopsyTat.state.onTrack');
  });
  it('shows overdue after the PAD deadline', () => {
    render(<AutopsyTatChip autopsy={autopsy} caseSource={source} now={new Date('2026-10-04T00:00:00Z')} />);
    expect(screen.getByTestId('autopsy-tat-chip').className).toContain('wl-autopsy-badge--tat-overdue');
  });
  it('renders nothing without a clock start or a non-autopsy case', () => {
    const { container, rerender } = render(<AutopsyTatChip autopsy={autopsy} caseSource={{}} />);
    expect(container.firstChild).toBeNull();
    rerender(<AutopsyTatChip autopsy={undefined} caseSource={source} />);
    expect(container.firstChild).toBeNull();
  });
});
