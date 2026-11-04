// @vitest-environment happy-dom
// Batch 610 (#11, tier 3): the Invalidated / Superseded flag on an amended report. A flag only: nothing is deleted.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, string>) => (o ? `${key}|${Object.values(o).join('|')}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const caps = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => caps.allowed, decide: () => ({ allowed: caps.allowed }) }) }));

import { FlagBlockControl } from './FlagBlockControl';
import type { HistologyBlock } from '@/types/case/Specimen';

const block = (over: Partial<HistologyBlock> = {}): HistologyBlock => ({ id: 'B1', label: '1', status: 'Embedded', stains: [], ...over } as HistologyBlock);
afterEach(() => { cleanup(); caps.allowed = true; });

describe('FlagBlockControl', () => {
  it('sends the kind, reason and note', () => {
    const onFlag = vi.fn();
    render(<FlagBlockControl block={block()} onFlag={onFlag} />);
    fireEvent.click(screen.getByText('blockDeletion.flag.button'));
    fireEvent.change(screen.getByLabelText('blockDeletion.flag.kindLabel'), { target: { value: 'superseded' } });
    fireEvent.change(screen.getByLabelText('blockDeletion.flag.reasonLabel'), { target: { value: 'replaced' } });
    fireEvent.change(screen.getByLabelText('blockDeletion.control.noteLabel'), { target: { value: 'recut as block 2' } });
    expect(screen.getByText('blockDeletion.flag.notDeleted')).toBeTruthy();
    fireEvent.click(screen.getByText('blockDeletion.flag.confirmButton'));
    expect(onFlag).toHaveBeenCalledWith('superseded', 'replaced', 'recut as block 2');
  });
  it('"Other" needs a note', () => {
    render(<FlagBlockControl block={block()} onFlag={vi.fn()} />);
    fireEvent.click(screen.getByText('blockDeletion.flag.button'));
    fireEvent.change(screen.getByLabelText('blockDeletion.flag.reasonLabel'), { target: { value: 'other' } });
    const confirm = screen.getByText('blockDeletion.flag.confirmButton') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('blockDeletion.control.noteLabel'), { target: { value: 'why' } });
    expect(confirm.disabled).toBe(false);
  });
  it('is greyed out without material:block:flag-amended', () => {
    caps.allowed = false;
    const onFlag = vi.fn();
    render(<FlagBlockControl block={block()} onFlag={onFlag} />);
    const btn = screen.getByText('blockDeletion.flag.button');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(btn);
    expect(screen.queryByText('blockDeletion.flag.confirmButton')).toBeNull();
  });
  it('shows the current flag with who and when, and offers to change it', () => {
    render(<FlagBlockControl block={block({ amendmentFlag: { kind: 'invalidated', reasonCode: 'wrongPatient', flaggedBy: 'p', flaggedByName: 'Dr P', flaggedAt: '2026-10-18T09:00:00Z' } })} onFlag={vi.fn()} />);
    expect(screen.getByText('blockDeletion.flag.current.invalidated')).toBeTruthy();
    expect(screen.getByText(/blockDeletion.flag.currentLine\|/).textContent).toContain('Dr P');
    expect(screen.getByText('blockDeletion.flag.changeButton')).toBeTruthy();
  });
  it('is not offered on a deleted, invalidated or cancelled block', () => {
    for (const status of ['Deleted', 'Invalidated', 'Cancelled'] as const) {
      const { container, unmount } = render(<FlagBlockControl block={block({ status })} onFlag={vi.fn()} />);
      expect(container.textContent).toBe('');
      unmount();
    }
  });
});
