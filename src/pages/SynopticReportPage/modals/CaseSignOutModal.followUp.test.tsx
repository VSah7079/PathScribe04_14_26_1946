// @vitest-environment happy-dom
// Batch 454: the sign-out modal's "follow-up specimen expected" box. It shows
// only when the page passes onFollowUpExpectedChange (a surgical case and a
// signer holding case:follow-up:expect), and reports each change.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }), initReactI18next: { type: '3rdParty', init: () => {} }, Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</> }));
vi.mock('@/services', () => ({ stainTypeService: { getAll: async () => ({ ok: true, data: [] }) } }));
vi.mock('@/hooks/useSignerConfirmation', () => ({
  useSignerConfirmation: () => ({ reset: () => {}, confirm: async () => null, busy: false, method: 'password', buttonLabel: (b: string) => b, buttonTitle: undefined }),
}));
vi.mock('@/components/Signing/SignerConfirmationFields', () => ({ SignerConfirmationFields: () => null }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({ SpellCheckedTextarea: () => null }));

import CaseSignOutModal from './CaseSignOutModal';

afterEach(cleanup);

describe('CaseSignOutModal: follow-up expected (Batch 454)', () => {
  it('is hidden when the page does not offer it', () => {
    render(<CaseSignOutModal show accession="S26-1" onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByText('caseSignOutModal.followUpExpectedLabel')).toBeNull();
  });

  it('shows the box and reports changes', () => {
    const onChange = vi.fn();
    render(<CaseSignOutModal show accession="S26-1" onClose={() => {}} onConfirm={() => {}} followUpExpected={false} onFollowUpExpectedChange={onChange} />);
    fireEvent.click(screen.getByText('caseSignOutModal.followUpExpectedLabel'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('caseSignOutModal.followUpExpectedHint')).toBeTruthy();
  });
});
