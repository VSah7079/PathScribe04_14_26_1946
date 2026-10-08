// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/modals/AiNarrativeReviewModal.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-275): the review step for AI-generated narrative. The
// pathologist edits the text, picks Gross/Microscopic/Ancillary, and
// Insert hands back the EDITED text and the chosen field; Discard hands
// back nothing. The write itself (handleAcceptGeneratedNarrative) is
// tested in hooks/__tests__/useSignOutWorkflow.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AiNarrativeReviewModal } from './AiNarrativeReviewModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
    i18n: { language: 'en-US' },
  }),
}));

afterEach(() => cleanup());

const GROSS = 'leftReportPanel.sections.grossDescription';
const MICRO = 'patientHistoryModal.field.microscopicDescription';
const ANCILLARY = 'leftReportPanel.sections.ancillaryStudies';
const insertButton = () => screen.getByText(/^aiNarrativeReviewModal\.insertIntoButton/);

function renderModal(narrativeText = 'RAW AI TEXT') {
  const onAccept = vi.fn();
  const onCancel = vi.fn();
  render(<AiNarrativeReviewModal narrativeText={narrativeText} defaultTargetField="gross" onAccept={onAccept} onCancel={onCancel} />);
  return { onAccept, onCancel };
}

describe('AiNarrativeReviewModal (PS-275)', () => {
  it('shows the generated text for editing, targeted at the default field', () => {
    renderModal('Generated narrative.');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Generated narrative.');
    expect(insertButton().textContent).toContain(GROSS);
  });

  it('Insert returns the pathologist\'s edited text (not the raw AI text) and the chosen section', () => {
    const { onAccept, onCancel } = renderModal('RAW AI TEXT');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Edited by the pathologist.' } });
    fireEvent.click(screen.getByText(MICRO));
    expect(insertButton().textContent).toContain(MICRO);
    fireEvent.click(insertButton());
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith('Edited by the pathologist.', 'microscopic');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each([
    [GROSS, 'gross'],
    [MICRO, 'microscopic'],
    [ANCILLARY, 'ancillary'],
  ])('choosing %s inserts into %s', (label, target) => {
    const { onAccept } = renderModal('Narrative.');
    fireEvent.click(screen.getByText(label));
    fireEvent.click(insertButton());
    expect(onAccept).toHaveBeenCalledWith('Narrative.', target);
  });

  it('Discard (and the close button) cancel without inserting anything', () => {
    const { onAccept, onCancel } = renderModal();
    fireEvent.click(screen.getByText('aiNarrativeReviewModal.discardButton'));
    fireEvent.click(screen.getByText('×'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('renders the star and close symbols as characters, not as literal \\u escape text', () => {
    const { container } = render(<AiNarrativeReviewModal narrativeText="x" defaultTargetField="gross" onAccept={vi.fn()} onCancel={vi.fn()} />);
    expect(container.textContent).not.toContain('\\u');
    expect(container.querySelector('.ps-ai-review-eyebrow')?.textContent).toContain('\u2726');
    expect(container.querySelector('.ps-modal-close')?.textContent).toBe('\u00d7');
  });

  it('Insert is disabled when the text has been cleared, so empty text can never be inserted', () => {
    const { onAccept } = renderModal('Narrative.');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect((insertButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(insertButton());
    expect(onAccept).not.toHaveBeenCalled();
  });
});
