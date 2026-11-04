// @vitest-environment happy-dom
// Batch 625 (PS-118): the discordant-only fields shared by the sign-out Discordance window and the generic QA review form.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({
  SpellCheckedTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

import { QaDiscordantSection, FROZEN_WORDING, GENERIC_WORDING, type DiscordantValues } from './QaDiscordantSection';

afterEach(cleanup);
const empty: DiscordantValues = { delta: '', severity: '', rootCause: '', rootCauseNote: '', comments: '' };
const show = (over: Partial<DiscordantValues> = {}, extra: Partial<React.ComponentProps<typeof QaDiscordantSection>> = {}) => {
  const onChange = vi.fn();
  render(<QaDiscordantSection idPrefix="x" wording={FROZEN_WORDING} values={{ ...empty, ...over }} onChange={onChange} {...extra} />);
  return onChange;
};

describe('QaDiscordantSection', () => {
  it('reports each choice as a patch, under ids built from the prefix', () => {
    const onChange = show();
    fireEvent.change(document.getElementById('x-delta')!, { target: { value: 'upgrade' } });
    fireEvent.change(document.getElementById('x-severity')!, { target: { value: 'high' } });
    fireEvent.change(document.getElementById('x-root-cause')!, { target: { value: 'sampling_error' } });
    expect(onChange.mock.calls.map(c => c[0])).toEqual([{ delta: 'upgrade' }, { severity: 'high' }, { rootCause: 'sampling_error' }]);
  });
  it('shows the patient-impact hint for the chosen severity, critical for high', () => {
    show({ severity: 'high' });
    const hint = screen.getByText('discordanceReconciliationModal.severityHint.high');
    expect(hint.className).toContain('ps-intraop-gate-note--critical');
  });
  it('asks for the explanation only when the root cause is Other', () => {
    show({ rootCause: 'sampling_error' });
    expect(screen.queryByLabelText('discordanceReconciliationModal.explainLabel')).toBeNull();
    cleanup();
    show({ rootCause: 'other' });
    expect(screen.getByLabelText('discordanceReconciliationModal.explainLabel')).toBeTruthy();
  });
  it('uses the caller\'s wording: frozen-section phrasing at sign-out, the shorter generic wording elsewhere', () => {
    show();
    expect(screen.getByText('discordanceReconciliationModal.delta.upgrade')).toBeTruthy();
    cleanup();
    render(<QaDiscordantSection idPrefix="y" wording={GENERIC_WORDING} values={empty} onChange={() => undefined} />);
    expect(screen.getByText('qaReviewCaptureForm.delta.upgrade')).toBeTruthy();
  });
  it('shows the caller\'s required marks and messages, and nothing it was not given', () => {
    show({}, { mark: f => (f === 'comments' ? <b>REQ</b> : null), errors: { severity: 'Severity is required' } });
    expect(screen.getByText('REQ')).toBeTruthy();
    expect(screen.getByText('Severity is required')).toBeTruthy();
    expect(screen.queryByText('Delta is required')).toBeNull();
  });
});
