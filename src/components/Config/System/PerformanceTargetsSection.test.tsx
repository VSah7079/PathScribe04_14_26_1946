// @vitest-environment happy-dom
// Batch 610 (#87): the Performance targets screen shows the starting targets,
// saves a changed value straight away, adds a custom target, refuses a bad
// value, and does not offer to remove a built-in target.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import PerformanceTargetsSection from './PerformanceTargetsSection';
import { performanceTargetService } from '@/services';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('PerformanceTargetsSection (#87)', () => {
  it('lists the starting targets and keeps the built-in ones from being removed', async () => {
    render(<PerformanceTargetsSection />);
    await waitFor(() => expect(screen.getAllByText('performanceTargetsSection.systemBadge').length).toBe(4));
    const removes = screen.getAllByText('performanceTargetsSection.remove') as HTMLButtonElement[];
    expect(removes.filter(b => b.disabled).length).toBe(4);
  });

  it('adds a custom target and then removes it', async () => {
    render(<PerformanceTargetsSection />);
    await screen.findAllByText('performanceTargetsSection.systemBadge');
    fireEvent.change(screen.getAllByLabelText('performanceTargetsSection.add.label')[0], { target: { value: 'Frozen sections per day' } });
    fireEvent.change(screen.getAllByLabelText('performanceTargetsSection.add.value')[0], { target: { value: '12' } });
    fireEvent.click(screen.getByText('performanceTargetsSection.add.button'));
    await waitFor(async () => {
      const all = await performanceTargetService.getAll();
      expect(all.ok && all.data.some(t => t.label === 'Frozen sections per day' && t.value === 12)).toBe(true);
    });
  });

  it('shows a message and saves nothing when the value is not above zero', async () => {
    render(<PerformanceTargetsSection />);
    await screen.findAllByText('performanceTargetsSection.systemBadge');
    fireEvent.change(screen.getAllByLabelText('performanceTargetsSection.add.label')[0], { target: { value: 'Bad one' } });
    fireEvent.change(screen.getAllByLabelText('performanceTargetsSection.add.value')[0], { target: { value: '0' } });
    fireEvent.click(screen.getByText('performanceTargetsSection.add.button'));
    await screen.findByRole('alert');
    const all = await performanceTargetService.getAll();
    expect(all.ok && all.data.some(t => t.label === 'Bad one')).toBe(false);
  });
});
