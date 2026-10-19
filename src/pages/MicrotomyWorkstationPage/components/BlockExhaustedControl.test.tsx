// @vitest-environment happy-dom
// Batch 610 (#16): the "Block exhausted" button on the Microtomy workstation.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));

import BlockExhaustedControl from './BlockExhaustedControl';
import type { HistologyBlock } from '@/types/case/Specimen';

afterEach(cleanup);
const exc = (status: string) => ({ reason: 'Block exhausted', status, flaggedByName: 'Tech One', flaggedBy: 'u1', flaggedAt: 'T' });
const block = (status: string, stains: unknown[] = [{ id: 'S1', stainName: 'H&E' }]): HistologyBlock => ({ id: 'B1', label: '1', status, stains } as unknown as HistologyBlock);

describe('BlockExhaustedControl', () => {
  it('flags the block with a note and closes', async () => {
    const onFlag = vi.fn(async () => ({ ok: true }));
    render(<BlockExhaustedControl block={block('Embedded')} onFlag={onFlag} />);
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.button'));
    fireEvent.change(screen.getByLabelText('microtomyWorkstation.exhausted.note'), { target: { value: 'nothing left' } });
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.confirm'));
    await waitFor(() => expect(onFlag).toHaveBeenCalledWith('nothing left'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the dialog open and says why when the flag is refused for a missing note', async () => {
    const onFlag = vi.fn(async () => ({ ok: false, missing: ['exceptionNote'] }));
    render(<BlockExhaustedControl block={block('Embedded')} onFlag={onFlag} />);
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.button'));
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.confirm'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('microtomyWorkstation.exhausted.noteRequired'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('says it could not be saved on any other failure', async () => {
    render(<BlockExhaustedControl block={block('Embedded')} onFlag={async () => ({ ok: false, failed: true })} />);
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.button'));
    fireEvent.click(screen.getByText('microtomyWorkstation.exhausted.confirm'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('microtomyWorkstation.exhausted.failed'));
  });

  it('while the flag is open: a banner says cutting is blocked and the button is off', () => {
    render(<BlockExhaustedControl block={block('Exhausted', [{ id: 'S1', exception: exc('pending_pathologist_review') }])} onFlag={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('microtomyWorkstation.exhausted.bannerTitle');
    expect((screen.getByText('microtomyWorkstation.exhausted.button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('after the pathologist approves destructive cutting, the banner says cutting can go on', () => {
    render(<BlockExhaustedControl block={block('Exhausted', [{ id: 'S1', exception: exc('approved_destructive_cut') }])} onFlag={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toBe('microtomyWorkstation.exhausted.approved');
  });

  it('shows no banner for an ordinary block', () => {
    render(<BlockExhaustedControl block={block('Embedded')} onFlag={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
