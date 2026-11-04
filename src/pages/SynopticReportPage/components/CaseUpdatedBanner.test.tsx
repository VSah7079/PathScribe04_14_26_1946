// @vitest-environment happy-dom
// src/pages/SynopticReportPage/components/CaseUpdatedBanner.test.tsx — Batch 572.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { CaseUpdatedBanner } from './CaseUpdatedBanner';
afterEach(cleanup);

describe('CaseUpdatedBanner', () => {
  it('nothing but an empty polite region when there is no newer version', () => {
    render(<CaseUpdatedBanner version={null} onShow={() => {}} onLater={() => {}} />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('');
  });
  it('the message, Show their changes and Later; takes no focus', () => {
    const onShow = vi.fn(); const onLater = vi.fn();
    const before = document.activeElement;
    render(<CaseUpdatedBanner version={5} onShow={onShow} onLater={onLater} />);
    expect(screen.getByText('synopticReportPage.caseUpdated.message')).toBeTruthy();
    expect(document.activeElement).toBe(before);
    // Only the message is announced, not the buttons.
    expect(screen.getByRole('status').querySelector('button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'synopticReportPage.caseUpdated.show' }));
    fireEvent.click(screen.getByRole('button', { name: 'synopticReportPage.caseUpdated.later' }));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('Batch 575: Show is disabled while their changes are being read', () => {
    render(<CaseUpdatedBanner version={5} busy onShow={() => {}} onLater={() => {}} />);
    expect((screen.getByRole('button', { name: 'synopticReportPage.caseUpdated.show' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('Batch 575: after an overlap, a lasting note (read once, politely) until "Got it"', () => {
    const seen = vi.fn();
    render(<CaseUpdatedBanner version={null} overlap onShow={() => {}} onLater={() => {}} onOverlapSeen={seen} />);
    expect(screen.getByRole('status').textContent).toBe('synopticReportPage.caseUpdated.overlap');
    fireEvent.click(screen.getByRole('button', { name: 'synopticReportPage.caseUpdated.gotIt' }));
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
