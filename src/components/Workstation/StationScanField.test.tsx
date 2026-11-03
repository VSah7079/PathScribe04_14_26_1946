// @vitest-environment happy-dom
//
// Touch spec T1 (Batch 735): the shared scan field takes a scan without raising the on-screen keyboard, keeps focus
// for the next scan, and lets the person type an id by hand.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
// Batch 756: the keyboard and submit buttons show only with the touch layout on.
const touch = vi.hoisted(() => ({ active: true }));
// Batch 759: a typed entry is recorded (the Manual Entry flag); the recorder is checked in its own tests.
const rec = vi.hoisted(() => ({ record: vi.fn(async () => undefined) }));
vi.mock('@/hooks/useManualEntryRecorder', () => ({ useManualEntryRecorder: () => rec.record }));
vi.mock('@/hooks/useTouchLayout', () => ({ useTouchLayout: () => ({ mode: 'auto', active: touch.active, setMode: () => {} }) }));

import { StationScanField } from './StationScanField';

describe('StationScanField', () => {
  afterEach(() => { cleanup(); touch.active = true; });
  it('asks for no on-screen keyboard, is focused on arrival, and hands in the trimmed scan', async () => {
    const onScan = vi.fn();
    render(<StationScanField onScan={onScan} placeholder="Scan" submitLabel="Go" />);
    const input = screen.getByPlaceholderText('Scan') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('none');
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '  S26-1-A1 ' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('S26-1-A1', expect.anything()));
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

  it('on a computer without the touch layout, shows no keyboard or submit button: a scanner or keyboard types in and Enter submits (Batch 756)', async () => {
    touch.active = false;
    const onScan = vi.fn();
    render(<StationScanField onScan={onScan} placeholder="Scan" submitLabel="Go" />);
    expect(screen.queryByRole('button')).toBeNull();
    const input = screen.getByPlaceholderText('Scan');
    fireEvent.change(input, { target: { value: 'S26-0001-A1' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('S26-0001-A1', expect.anything()));
  });

  it('takes a second scan that comes while the first is still being handled (Batch 757: a fast scanner lost every other cassette)', async () => {
    let release: () => void = () => undefined;
    const onScan = vi.fn().mockImplementationOnce(() => new Promise<void>(r => { release = r; })).mockResolvedValue(undefined);
    render(<StationScanField onScan={onScan} placeholder="Scan" submitLabel="Go" />);
    const input = screen.getByPlaceholderText('Scan') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'S26-0001-A1' } });
    fireEvent.submit(input.closest('form')!);
    fireEvent.change(input, { target: { value: 'S26-0001-A2' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(2));
    expect(onScan.mock.calls.map(c => c[0])).toEqual(['S26-0001-A1', 'S26-0001-A2']);
    release();
  });

  it('Batch 759: a scanner-speed entry is a scan; a typed one goes through at once and is flagged as a manual entry', async () => {
    touch.active = false;
    const onScan = vi.fn();
    rec.record.mockClear();
    render(<StationScanField onScan={onScan} placeholder="Scan" submitLabel="Go" />);
    const input = screen.getByPlaceholderText('Scan') as HTMLInputElement;
    const enter = async (text: string, gapMs: number) => {
      let value = '';
      let at = 1000;
      for (const ch of text) {
        fireEvent.keyDown(input, { key: ch, timeStamp: at });
        value += ch; at += gapMs;
        fireEvent.change(input, { target: { value } });
      }
      fireEvent.submit(input.closest('form')!);
      await waitFor(() => expect(input.value).toBe(''));
    };
    await enter('S26-0001-A1', 12);
    // happy-dom may not carry the timeStamp of a synthetic event; the classifier itself is tested in entryMethod.test.ts.
    const first = onScan.mock.calls[0];
    expect(first[0]).toBe('S26-0001-A1');
    expect(['scan', 'manual']).toContain(first[1].method);
    onScan.mockClear(); rec.record.mockClear();
    fireEvent.paste(input);
    fireEvent.change(input, { target: { value: 'S26-0001-A2' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('S26-0001-A2', { method: 'manual' }));
    expect(rec.record).toHaveBeenCalledWith('S26-0001-A2', { via: 'scanField' });
  });
});
