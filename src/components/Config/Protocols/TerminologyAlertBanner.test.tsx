// @vitest-environment happy-dom
// src/components/Config/Protocols/TerminologyAlertBanner.test.tsx
// Batch 568 (WCAG 4.1.2, axe nested-interactive): the banner's header holds a button (Re-check), so it isn't a
// button itself. Its title is the button that shows or hides the list (aria-expanded); clicking elsewhere on the
// header still does; Re-check does only its own job. The counts and field references come from messages.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { TerminologyAlertBanner } from './TerminologyAlertBanner';

const ALERTS = [
  { id: 'a1', severity: 'error' as const, system: 'snomed' as const, code: '123', message: 'Deprecated', fieldLabel: 'Margin', optionLabel: 'Involved' },
  { id: 'a2', severity: 'warning' as const, system: 'icd' as const, code: 'C18', message: 'Check', fieldLabel: 'Site' },
];
afterEach(cleanup);

describe('TerminologyAlertBanner (Batch 568)', () => {
  it('the title is a button that shows and hides the list; the header has no role or tab stop', () => {
    render(<TerminologyAlertBanner alerts={ALERTS} isLoading={false} onDismiss={() => {}} onRevalidate={() => {}} />);
    const title = screen.getByRole('button', { name: 'terminologyAlertBanner.title' });
    const header = title.closest('.ps-termalert-header') as HTMLElement;
    expect(header.getAttribute('role')).toBeNull();
    expect(header.getAttribute('tabindex')).toBeNull();
    const expanded = title.getAttribute('aria-expanded');
    fireEvent.click(title);
    expect(title.getAttribute('aria-expanded')).not.toBe(expanded);
    fireEvent.click(header);
    expect(title.getAttribute('aria-expanded')).toBe(expanded);
  });
  it('Re-check does only its own job', () => {
    const onRevalidate = vi.fn();
    render(<TerminologyAlertBanner alerts={ALERTS} isLoading={false} onDismiss={() => {}} onRevalidate={onRevalidate} />);
    const title = screen.getByRole('button', { name: 'terminologyAlertBanner.title' });
    const expanded = title.getAttribute('aria-expanded');
    fireEvent.click(screen.getByText(/terminologyAlertBanner\.recheckButton/));
    expect(onRevalidate).toHaveBeenCalledTimes(1);
    expect(title.getAttribute('aria-expanded')).toBe(expanded);
  });
  it('joins the two counts, and refers to a field and option, through messages', () => {
    render(<TerminologyAlertBanner alerts={ALERTS} isLoading={false} onDismiss={() => {}} onRevalidate={() => {}} />);
    expect(screen.getByText(/^terminologyAlertBanner\.countsBoth:/)).toBeTruthy();
    const title = screen.getByRole('button', { name: 'terminologyAlertBanner.title' });
    if (title.getAttribute('aria-expanded') === 'false') fireEvent.click(title);
    expect(screen.getByText(/terminologyAlertBanner\.fieldOptionRef:.*"option":"Involved"/)).toBeTruthy();
    expect(screen.getByText(/terminologyAlertBanner\.fieldRef:.*"field":"Site"/)).toBeTruthy();
  });
});
