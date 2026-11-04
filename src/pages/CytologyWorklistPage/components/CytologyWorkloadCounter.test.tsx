// @vitest-environment happy-dom
// src/pages/CytologyWorklistPage/components/CytologyWorkloadCounter.test.tsx — Batch 574.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { CytologyWorkloadCounter } from './CytologyWorkloadCounter';
import { resolveCytologyWorkloadSummary } from '@/services/cytology/cytologyWorkloadSummary';
afterEach(cleanup);

const e = (scuWeight: number, minutes: number) => ({ scuWeight, activeDurationSeconds: minutes * 60 });

describe('CytologyWorkloadCounter', () => {
  it('slides of the cap, reviews, left now and left in a full day; the bar is decoration only', () => {
    render(<CytologyWorkloadCounter summary={resolveCytologyWorkloadSummary([...Array.from({ length: 38 }, () => e(1, 7.1))], 100)} />);
    const section = screen.getByRole('region', { name: 'cytologyWorklist.workload.title' });
    expect(section.textContent).toContain('cytologyWorklist.workload.slides:{"used":"38","cap":"100"}');
    expect(section.textContent).toContain('cytologyWorklist.workload.reviews:{"count":38}');
    expect(section.textContent).toContain('cytologyWorklist.workload.leftNow');
    expect(section.textContent).toContain('cytologyWorklist.workload.leftFullDay:{"left":"62"}');
    expect(section.querySelector('.ps-cyto-workload-bar-limit')).toBeTruthy();
    expect(section.querySelector('.ps-cyto-workload-bar')?.getAttribute('aria-hidden')).toBe('true');
    expect(section.textContent).not.toContain('cytologyWorklist.workload.status');
  });
  it('says when the limit is near or reached, in words (not colour alone)', () => {
    render(<CytologyWorkloadCounter summary={resolveCytologyWorkloadSummary(Array.from({ length: 110 }, () => e(1, 5)), 100)} />);
    expect(screen.getByText('cytologyWorklist.workload.status.over')).toBeTruthy();
    // After 8 hours: one "left" figure, no limit marker.
    expect(screen.queryByText(/workload.leftFullDay/)).toBeNull();
  });
});
