// @vitest-environment happy-dom
// Batch 625 (PS-118): the generic QA review form, whose discordant part is the shared QaDiscordantSection.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { QaActivityType } from '@/types/quality/QaActivityType';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({
  SpellCheckedTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

import { QaReviewCaptureForm } from './QaReviewCaptureForm';

afterEach(cleanup);
const type = { id: 't', name: 'Custom', fields: [{ id: 'f1', label: 'Specimen adequacy', type: 'text', required: true, options: [] }] } as unknown as QaActivityType;
const pick = (id: string, v: string) => fireEvent.change(document.getElementById(id)!, { target: { value: v } });

describe('QaReviewCaptureForm', () => {
  it('asks only for the outcome and the activity\'s own fields until the outcome is discordant', () => {
    render(<QaReviewCaptureForm activityType={type} onSubmit={vi.fn()} />);
    expect(screen.getByText('Specimen adequacy')).toBeTruthy();
    expect(document.getElementById('qa-delta')).toBeNull();
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(document.getElementById('qa-delta')).toBeTruthy();
  });
  it('a discordant review without delta, severity, root cause and a comment is refused, and says what is missing', async () => {
    const onSubmit = vi.fn();
    render(<QaReviewCaptureForm activityType={type} onSubmit={onSubmit} />);
    fireEvent.change(document.getElementById('qa-field-f1')!, { target: { value: 'Adequate' } });
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getByText('qaReviewCaptureForm.recordDiscordanceButton'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('qaReviewCaptureForm.errors.deltaRequired')).toBeTruthy();
    expect(screen.getByText('qaReviewCaptureForm.errors.severityRequired')).toBeTruthy();
  });
  it('a complete discordant review is submitted with every field', async () => {
    const onSubmit = vi.fn();
    render(<QaReviewCaptureForm activityType={type} onSubmit={onSubmit} />);
    fireEvent.change(document.getElementById('qa-field-f1')!, { target: { value: 'Adequate' } });
    fireEvent.click(screen.getAllByRole('radio')[1]);
    pick('qa-delta', 'upgrade'); pick('qa-severity', 'medium'); pick('qa-root-cause', 'technical_artifact');
    fireEvent.change(document.getElementById('qa-comments') ?? screen.getByPlaceholderText('qaReviewCaptureForm.commentsPlaceholder'), { target: { value: 'Explained' } });
    fireEvent.click(screen.getByText('qaReviewCaptureForm.recordDiscordanceButton'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ outcome: 'discordant', delta: 'upgrade', severity: 'medium', rootCause: 'technical_artifact', comments: 'Explained' });
  });
});
