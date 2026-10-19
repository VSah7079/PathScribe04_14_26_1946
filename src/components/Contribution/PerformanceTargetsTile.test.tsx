// @vitest-environment happy-dom
// Batch 610 (#87): the Productivity dashboard's targets tile.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
import PerformanceTargetsTile from './PerformanceTargetsTile';
import { buildTargetProgress } from '@/services/performanceTargets/performanceTargetRules';
import { STARTING_PERFORMANCE_TARGETS } from '@/services/performanceTargets/mockPerformanceTargetService';

afterEach(cleanup);

describe('PerformanceTargetsTile (#87)', () => {
  it('says so when no target applies', () => {
    render(<PerformanceTargetsTile rows={[]} />);
    expect(screen.getByText('performanceTargetsTile.empty')).toBeTruthy();
  });

  it('shows the state of a target this period', () => {
    const now = new Date(2026, 9, 28);
    const rows = buildTargetProgress(STARTING_PERFORMANCE_TARGETS, { cases_monthly: [{ at: new Date(2026, 9, 3).toISOString(), amount: 130 }] }, now);
    render(<PerformanceTargetsTile rows={rows} />);
    expect(screen.getByText('performanceTargetsTile.state.met')).toBeTruthy();
  });
});
