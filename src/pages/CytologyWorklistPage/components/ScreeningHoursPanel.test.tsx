// @vitest-environment happy-dom
// src/pages/CytologyWorklistPage/components/ScreeningHoursPanel.test.tsx — Batch 572 (F7, option C).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/cytology/screeningHoursRules')>('@/services/cytology/screeningHoursRules');
  return { SCREENING_HOURS_FLAG_TOLERANCE_HOURS: rules.SCREENING_HOURS_FLAG_TOLERANCE_HOURS, isCorrection: rules.isCorrection, isSignOffStale: rules.isSignOffStale };
});

import { ScreeningHoursPanel } from './ScreeningHoursPanel';
afterEach(cleanup);

const DAY = { date: '2026-10-14', recordedHours: 6, signOff: null };

describe('ScreeningHoursPanel', () => {
  it('one click confirms the recorded hours', async () => {
    const onSignOff = vi.fn(async () => 'saved' as const);
    render(<ScreeningHoursPanel day={DAY} saving={false} onSignOff={onSignOff} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /screeningHours\.confirm/ })); });
    expect(onSignOff).toHaveBeenCalledWith(6, undefined, undefined);
  });
  it('a correction asks for a reason (quick picks), then saves with it', async () => {
    const onSignOff = vi.fn(async () => 'saved' as const);
    render(<ScreeningHoursPanel day={DAY} saving={false} onSignOff={onSignOff} />);
    fireEvent.click(screen.getByRole('button', { name: 'cytologyWorklist.screeningHours.correct' }));
    const input = screen.getByRole('spinbutton', { name: 'cytologyWorklist.screeningHours.hoursLabel' });
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.change(input, { target: { value: '7' } });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    fireEvent.click(screen.getByRole('radio', { name: 'cytologyWorklist.screeningHours.reasons.microscopeOffScreen' }));
    await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'cytologyWorklist.screeningHours.save' }).closest('form')!); });
    expect(onSignOff).toHaveBeenCalledWith(7, 'microscopeOffScreen', '');
  });
  it("a refused save says why, in a live alert, and keeps the form open", async () => {
    const onSignOff = vi.fn(async () => 'reasonRequired' as const);
    render(<ScreeningHoursPanel day={DAY} saving={false} onSignOff={onSignOff} />);
    fireEvent.click(screen.getByRole('button', { name: 'cytologyWorklist.screeningHours.correct' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } });
    await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'cytologyWorklist.screeningHours.save' }).closest('form')!); });
    expect(screen.getByRole('alert').textContent).toBe('cytologyWorklist.screeningHours.errors.reasonRequired');
    expect(screen.getByRole('spinbutton')).toBeTruthy();
  });
  it('signed off: shows the figure, the recorded one when corrected, and the flag', () => {
    const signOff = { id: 's', userId: 'u', date: '2026-10-14', recordedHours: 6, signedHours: 7, reasonId: 'microscopeOffScreen' as const, flagged: true, signedAt: '2026-10-14T17:02:00Z' };
    render(<ScreeningHoursPanel day={{ ...DAY, signOff }} saving={false} onSignOff={vi.fn()} />);
    expect(screen.getByText(/screeningHours\.signedOffCorrected/)).toBeTruthy();
    expect(screen.getByText(/screeningHours\.flaggedNote/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'cytologyWorklist.screeningHours.change' })).toBeTruthy();
  });

  it('a sign-off made before more was recorded asks for one more confirmation, of the new figure', async () => {
    const onSignOff = vi.fn(async () => 'saved' as const);
    const old = { id: 's', userId: 'u', date: '2026-10-14', recordedHours: 3, signedHours: 3, flagged: false, signedAt: '2026-10-14T14:00:00Z' };
    render(<ScreeningHoursPanel day={{ ...DAY, signOff: old }} saving={false} onSignOff={onSignOff} />);
    expect(screen.getByText(/cytologyWorklist.screeningHours.staleNote/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /cytologyWorklist.screeningHours.confirm/ }));
    await waitFor(() => expect(onSignOff).toHaveBeenCalled());
    expect((onSignOff.mock.calls[0] as unknown[])[0]).toBe(6);
  });

  it('Batch 574: yesterday\'s panel has its own title, hint and ids, so it can sit beside today\'s', () => {
    render(<>
      <ScreeningHoursPanel which="yesterday" day={{ ...DAY, date: '2026-10-13', recordedHours: 2 }} saving={false} onSignOff={vi.fn()} />
      <ScreeningHoursPanel day={DAY} saving={false} onSignOff={vi.fn()} />
    </>);
    const regions = screen.getAllByRole('region');
    expect(regions.map(r => r.getAttribute('aria-labelledby'))).toEqual(['ps-cyto-hours-title-yesterday', 'ps-cyto-hours-title-today']);
    expect(screen.getByText('cytologyWorklist.screeningHours.titleYesterday')).toBeTruthy();
    expect(screen.getByText('cytologyWorklist.screeningHours.hintYesterday')).toBeTruthy();
  });
});
