// @vitest-environment happy-dom
// Batch 636: the CSMS QA row's eligibility actions.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { verify, success, error } = vi.hoisted(() => ({ verify: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-toastify', () => ({ toast: { success, error } }));
vi.mock('@/services/cytology/verifyCsmsEligibility', () => ({ verifyCsmsEligibility: verify }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>),
}));
import CsmsEligibilityActions from './CsmsEligibilityActions';

const USER = { id: 'u-1', name: 'Pat QA' };
beforeEach(() => { verify.mockReset(); success.mockReset(); error.mockReset(); verify.mockResolvedValue('recorded'); });
afterEach(cleanup);

describe('CsmsEligibilityActions', () => {
  it('Verified is one click, then the list reloads', async () => {
    const onDone = vi.fn(async () => undefined);
    render(<CsmsEligibilityActions caseId="C-1" user={USER} onDone={onDone} />);
    fireEvent.click(screen.getByText('cytologyWorklist.csms.verified'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledWith({ caseId: 'C-1', decision: { kind: 'verified' }, actor: { id: 'u-1', name: 'Pat QA' } });
    expect(success).toHaveBeenCalled();
  });
  it('Not eligible stays off until a quick-pick reason is chosen, then sends that reason', async () => {
    render(<CsmsEligibilityActions caseId="C-2" user={USER} onDone={async () => undefined} />);
    const button = screen.getByText('cytologyWorklist.csms.notEligible') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('cytologyWorklist.csms.reasonLabel'), { target: { value: 'suspended' } });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(verify).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C-2', decision: { kind: 'not_eligible', reason: 'suspended' } })));
  });
  it('a refusal is said, not hidden', async () => {
    verify.mockResolvedValue('refused');
    render(<CsmsEligibilityActions caseId="C-1" user={USER} onDone={async () => undefined} />);
    fireEvent.click(screen.getByText('cytologyWorklist.csms.verified'));
    await waitFor(() => expect(error).toHaveBeenCalledWith('cytologyWorklist.csms.refused'));
  });
});
