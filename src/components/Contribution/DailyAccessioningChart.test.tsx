// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyAccessioningChart } from './DailyAccessioningChart';

describe('DailyAccessioningChart', () => {
  it('draws one bar per day with a summary label', () => {
    const daily = [{ date: '2026-10-21', count: 0 }, { date: '2026-10-22', count: 4 }, { date: '2026-10-23', count: 2 }];
    const { container } = render(<DailyAccessioningChart daily={daily} />);
    expect(container.querySelectorAll('.ps-daily-chart-bar')).toHaveLength(3);
    expect(container.querySelectorAll('.ps-daily-chart-bar--zero')).toHaveLength(1);
    expect(screen.getByRole('img')).toBeTruthy();
  });
  it('draws nothing for an empty window', () => {
    const { container } = render(<DailyAccessioningChart daily={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
