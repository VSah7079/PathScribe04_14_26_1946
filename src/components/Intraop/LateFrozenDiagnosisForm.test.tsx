// @vitest-environment happy-dom
// Batch 659 (finding 7): a frozen diagnosis can be added to a saved specimen from the log.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
const { setFrozenSectionDiagnosis } = vi.hoisted(() => ({ setFrozenSectionDiagnosis: vi.fn() }));
vi.mock('@/services', () => ({ intraoperativeService: { setFrozenSectionDiagnosis } }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({
  SpellCheckedTextarea: (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} />,
}));
import { LateFrozenDiagnosisForm } from './LateFrozenDiagnosisForm';

afterEach(() => { cleanup(); setFrozenSectionDiagnosis.mockReset(); });

describe('LateFrozenDiagnosisForm', () => {
  it('saves nothing until there is text, then saves with the chosen category', async () => {
    setFrozenSectionDiagnosis.mockResolvedValue({ ok: true, data: {} });
    const onSaved = vi.fn();
    render(<LateFrozenDiagnosisForm sessionId="s1" specimenId="sp1" onSaved={onSaved} />);
    const save = screen.getByText('intraopQueue.specimenCard.addFrozenSave') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('intraopQueue.specimenCard.addFrozenLabel'), { target: { value: 'Benign' } });
    fireEvent.change(screen.getByLabelText('intraopQueue.specimenStep.categoryLabel'), { target: { value: 'benign' } });
    fireEvent.click(save);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(setFrozenSectionDiagnosis).toHaveBeenCalledWith('s1', 'sp1', 'Benign', 'benign');
  });
  it('says so when the diagnosis is not saved', async () => {
    setFrozenSectionDiagnosis.mockResolvedValue({ ok: false, error: 'x' });
    const onSaved = vi.fn();
    render(<LateFrozenDiagnosisForm sessionId="s1" specimenId="sp1" onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('intraopQueue.specimenCard.addFrozenLabel'), { target: { value: 'Benign' } });
    fireEvent.click(screen.getByText('intraopQueue.specimenCard.addFrozenSave'));
    await screen.findByRole('alert');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
