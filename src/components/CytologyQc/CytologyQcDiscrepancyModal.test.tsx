// @vitest-environment happy-dom
// Batch 669f (cyt-6): the secondary code is optional; a significant divergence asks for an explicit confirmation.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const cat = (id: string, abbreviation: string, diagnosticRank: number) => ({ id, section: 'interpretation_result', label: abbreviation, abbreviation, diagnosticRank, active: true });
vi.mock('@/hooks/useCytologyQcCodeCategories', () => ({ useCytologyQcCodeCategories: () => [cat('n', 'NILM', 0), cat('h', 'HSIL', 4), cat('l', 'LSIL', 2), cat('a', 'ASCUS', 1)] }));

import { CytologyQcDiscrepancyModal } from './CytologyQcDiscrepancyModal';

afterEach(cleanup);
const type = (id: string, value: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
const submitBtn = () => screen.getByText('cytologyQcQueue.submitDiscrepancyBtn', { exact: false }) as HTMLButtonElement;

describe('CytologyQcDiscrepancyModal', () => {
  it('submits with only a primary code', () => {
    const onSubmit = vi.fn();
    render(<CytologyQcDiscrepancyModal onSubmit={onSubmit} onClose={() => {}} />);
    expect(submitBtn().disabled).toBe(true);
    type('qc-disc-primary', 'HSIL');
    fireEvent.click(submitBtn());
    expect(onSubmit).toHaveBeenCalledWith('HSIL', '', 'major', '', false);
  });
  it('a close pair submits at once', () => {
    const onSubmit = vi.fn();
    render(<CytologyQcDiscrepancyModal onSubmit={onSubmit} onClose={() => {}} />);
    type('qc-disc-primary', 'LSIL'); type('qc-disc-secondary', 'ASCUS');
    fireEvent.click(submitBtn());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('a significantly divergent pair asks first, then submits as confirmed; editing a code asks again', () => {
    const onSubmit = vi.fn();
    render(<CytologyQcDiscrepancyModal onSubmit={onSubmit} onClose={() => {}} />);
    type('qc-disc-primary', 'NILM'); type('qc-disc-secondary', 'HSIL');
    fireEvent.click(submitBtn());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('cytologyQcQueue.divergenceConfirm');
    type('qc-disc-secondary', 'HSIL ');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(submitBtn());
    fireEvent.click(screen.getByText('cytologyQcQueue.confirmDivergenceBtn'));
    expect(onSubmit).toHaveBeenCalledWith('NILM', 'HSIL ', 'major', '', true);
  });
  it('an unrecognised secondary code shows a field message and blocks Submit until fixed or cleared', () => {
    const onSubmit = vi.fn();
    render(<CytologyQcDiscrepancyModal onSubmit={onSubmit} onClose={() => {}} />);
    type('qc-disc-primary', 'LSIL'); type('qc-disc-secondary', 'zzz');
    expect(screen.getByRole('alert').textContent).toBe('cytologyQcQueue.secondaryUnrecognised');
    expect(submitBtn().disabled).toBe(true);
    fireEvent.click(submitBtn());
    expect(onSubmit).not.toHaveBeenCalled();
    type('qc-disc-secondary', '');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(submitBtn());
    expect(onSubmit).toHaveBeenCalledWith('LSIL', '', 'major', '', false);
  });
});
