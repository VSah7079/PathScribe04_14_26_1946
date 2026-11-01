// @vitest-environment happy-dom
//
// Touch spec T1 (Batch 735): the shared scan field takes a scan without raising the on-screen keyboard, keeps focus
// for the next scan, and lets the person type an id by hand.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));

import { StationScanField } from './StationScanField';

describe('StationScanField', () => {
  afterEach(cleanup);
  it('asks for no on-screen keyboard, is focused on arrival, and hands in the trimmed scan', async () => {
    const onScan = vi.fn();
    render(<StationScanField onScan={onScan} placeholder="Scan" submitLabel="Go" />);
    const input = screen.getByPlaceholderText('Scan') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('none');
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '  S26-1-A1 ' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('S26-1-A1'));
    await waitFor(() => expect(input.value).toBe(''));
    expect(document.activeElement).toBe(input);
  });

  it('gets focus back when it falls to the page, but never takes it from another field', async () => {
    render(<><StationScanField onScan={vi.fn()} placeholder="Scan" submitLabel="Go" /><input aria-label="other" /></>);
    const input = screen.getByPlaceholderText('Scan');
    const other = screen.getByLabelText('other');
    other.focus();
    fireEvent.focusOut(input);
    await new Promise(r => setTimeout(r, 5));
    expect(document.activeElement).toBe(other);
    other.blur();
    fireEvent.focusOut(other);
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('the keyboard button switches to typing (and back), marked for screen readers', () => {
    render(<StationScanField onScan={vi.fn()} placeholder="Scan" submitLabel="Go" />);
    const input = screen.getByPlaceholderText('Scan');
    const toggle = screen.getByRole('button', { name: 'stationScan.typeAnId' });
    fireEvent.click(toggle);
    expect(input.getAttribute('inputmode')).toBe('text');
    expect(screen.getByRole('button', { name: 'stationScan.backToScanning' }).getAttribute('aria-pressed')).toBe('true');
  });
});
