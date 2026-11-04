// @vitest-environment happy-dom
// Batch 630: the manual hrHPV result dialog.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));
import ManualHpvResultModal from './ManualHpvResultModal';

afterEach(cleanup);

describe('ManualHpvResultModal', () => {
  it('shows nothing when closed', () => {
    render(<ManualHpvResultModal show={false} result="Positive" replacing={null} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('lists the four sources and keeps Confirm off until one is chosen', () => {
    const onConfirm = vi.fn();
    render(<ManualHpvResultModal show result="Negative" replacing={null} onConfirm={onConfirm} onCancel={() => {}} />);
    expect(screen.getByText('cytologyWorklist.manualHpv.titleNegative')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    const confirm = screen.getByText('cytologyWorklist.manualHpv.confirmDirect') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANUAL_PHONE_VERIFICATION' } });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('MANUAL_PHONE_VERIFICATION');
  });
  it('says the entry waits for a second person when it would replace an interface result', () => {
    render(<ManualHpvResultModal show result="Positive" replacing="Invalid" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('note').textContent).toContain('"previous":"Invalid"');
    expect(screen.getByText('cytologyWorklist.manualHpv.confirmPending')).toBeTruthy();
  });
  it('forgets the last choice when reopened', () => {
    const { rerender } = render(<ManualHpvResultModal show result="Positive" replacing={null} onConfirm={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANUAL_PAPER_REPORT' } });
    rerender(<ManualHpvResultModal show={false} result="Positive" replacing={null} onConfirm={() => {}} onCancel={() => {}} />);
    rerender(<ManualHpvResultModal show result="Positive" replacing={null} onConfirm={() => {}} onCancel={() => {}} />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });
});
