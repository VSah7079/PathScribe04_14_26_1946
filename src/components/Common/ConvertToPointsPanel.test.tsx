// @vitest-environment happy-dom
// Batch 612: Convert to points shows what changes, converts only after a second press, and says when it can't.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}|${JSON.stringify(o)}` : k) }) }));
import { ConvertToPointsPanel } from './ConvertToPointsPanel';

afterEach(cleanup);
const plan = { alreadyPoints: false, changes: [
  { category: 'body' as const, fromSize: 10, fromPoints: 7.5, toSize: 10, raisedToFloor: false },
  { category: 'footer' as const, fromSize: 6, fromPoints: 7, toSize: 8, raisedToFloor: true },
] };

describe('ConvertToPointsPanel', () => {
  it('shows nothing when everything is already in points', () => {
    const { container } = render(<ConvertToPointsPanel plan={{ changes: [], alreadyPoints: true }} needed={false} categoryLabel={c => c} onConvert={async () => null} />);
    expect(container.innerHTML).toBe('');
  });

  it('lists each size that changes after the first press, and converts only on the second', async () => {
    const onConvert = vi.fn(async () => null);
    render(<ConvertToPointsPanel plan={plan} needed categoryLabel={c => c} onConvert={onConvert} />);
    fireEvent.click(screen.getByText('fontUnits.convertButton'));
    expect(onConvert).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/fontUnits.changeLineFloor/)).toBeTruthy();
    fireEvent.click(screen.getByText('fontUnits.confirm'));
    await waitFor(() => expect(screen.getByText('fontUnits.converted')).toBeTruthy());
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('cancel converts nothing', () => {
    const onConvert = vi.fn(async () => null);
    render(<ConvertToPointsPanel plan={plan} needed categoryLabel={c => c} onConvert={onConvert} />);
    fireEvent.click(screen.getByText('fontUnits.convertButton'));
    fireEvent.click(screen.getByText('fontUnits.cancel'));
    expect(screen.getByText('fontUnits.convertButton')).toBeTruthy();
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('a refused conversion is explained and the list stays open', async () => {
    render(<ConvertToPointsPanel plan={plan} needed categoryLabel={c => c} onConvert={async () => 'fontUnits.refused'} />);
    fireEvent.click(screen.getByText('fontUnits.convertButton'));
    fireEvent.click(screen.getByText('fontUnits.confirm'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('fontUnits.refused'));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('a template with nothing listed says so', () => {
    render(<ConvertToPointsPanel plan={{ changes: [], alreadyPoints: false }} needed categoryLabel={c => c} onConvert={async () => null} />);
    fireEvent.click(screen.getByText('fontUnits.convertButton'));
    expect(screen.getByText('fontUnits.noSizes')).toBeTruthy();
  });
});
