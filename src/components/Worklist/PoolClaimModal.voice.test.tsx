// @vitest-environment happy-dom
// Batch 650: "accept case" / "pass case" (Alt+A, Ctrl+Alt+P) press the claim window's Accept and Pass buttons: the same
// service calls (acceptPoolCase / passPoolCase, which check case:pool:claim / case:pool:pass), only once the window is
// ready and the button is not greyed, and the window takes the context the registry files them under.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  claimPoolCase: vi.fn(), acceptPoolCase: vi.fn(), passPoolCase: vi.fn(), releasePoolClaim: vi.fn(), setCurrentContext: vi.fn(),
  has: vi.fn(),
}));
vi.mock('@/services', () => ({
  claimPoolCase: svc.claimPoolCase, acceptPoolCase: svc.acceptPoolCase, passPoolCase: svc.passPoolCase, releasePoolClaim: svc.releasePoolClaim,
  isPoolActionNotPermitted: (e: unknown) => e instanceof Error && e.name === 'PoolActionNotPermittedError',
  actionRegistryService: {
    setCurrentContext: svc.setCurrentContext,
    onAction: (cb: (id: string) => void) => {
      const h = (e: Event) => { const id = (e as CustomEvent).detail?.id; if (id) cb(id); };
      window.addEventListener('VOICE_ACTION_TRIGGERED', h);
      return () => window.removeEventListener('VOICE_ACTION_TRIGGERED', h);
    },
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: svc.has, decide: () => ({ allowed: true }) }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('@/utils/accessRequests', () => ({ sendAccessRequestToAdmins: vi.fn(), pendingAccessRequestsFor: () => Promise.resolve([]) }));

import { PoolClaimModal } from './PoolClaimModal';

const say = (id: string) => act(() => { window.dispatchEvent(new CustomEvent('VOICE_ACTION_TRIGGERED', { detail: { id } })); });
const props = { isOpen: true, caseId: 'C-1', currentUserId: 'u1', currentUserName: 'Dr One', onAccepted: vi.fn(), onPassed: vi.fn(), onClose: vi.fn() };

beforeEach(() => {
  svc.claimPoolCase.mockResolvedValue({ success: true });
  svc.acceptPoolCase.mockResolvedValue(undefined);
  svc.passPoolCase.mockResolvedValue(undefined);
  svc.releasePoolClaim.mockResolvedValue(undefined);
  svc.has.mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PoolClaimModal voice and keys', () => {
  it('Accept case accepts through acceptPoolCase once the window is ready', async () => {
    render(<PoolClaimModal {...props} />);
    await waitFor(() => expect(screen.getByText('poolClaimModal.whatHappensNext')).toBeTruthy());
    say('POOL_ACCEPT_CASE');
    await waitFor(() => expect(svc.acceptPoolCase).toHaveBeenCalledWith('C-1', 'u1', 'Dr One'));
    await waitFor(() => expect(props.onAccepted).toHaveBeenCalled());
    expect(svc.passPoolCase).not.toHaveBeenCalled();
  });

  it('Pass case passes through passPoolCase', async () => {
    render(<PoolClaimModal {...props} />);
    await waitFor(() => expect(screen.getByText('poolClaimModal.whatHappensNext')).toBeTruthy());
    say('POOL_PASS_CASE');
    await waitFor(() => expect(svc.passPoolCase).toHaveBeenCalledWith('C-1'));
    expect(svc.acceptPoolCase).not.toHaveBeenCalled();
  });

  it('is ignored while the window is still checking availability', async () => {
    svc.claimPoolCase.mockReturnValue(new Promise(() => {}));
    render(<PoolClaimModal {...props} />);
    say('POOL_ACCEPT_CASE'); say('POOL_PASS_CASE');
    expect(svc.acceptPoolCase).not.toHaveBeenCalled();
    expect(svc.passPoolCase).not.toHaveBeenCalled();
  });

  it('is ignored when someone else holds the case (no buttons showing)', async () => {
    svc.claimPoolCase.mockResolvedValue({ success: false, claimedBy: 'Dr Two' });
    render(<PoolClaimModal {...props} />);
    await waitFor(() => expect(screen.getByText('poolClaimModal.caseUnavailable')).toBeTruthy());
    say('POOL_ACCEPT_CASE');
    expect(svc.acceptPoolCase).not.toHaveBeenCalled();
  });

  it('is ignored when the button is greyed: no case:pool:claim means no Accept, no case:pool:pass means no Pass', async () => {
    svc.has.mockImplementation((c: string) => c !== 'case:pool:claim');
    render(<PoolClaimModal {...props} />);
    await waitFor(() => expect(screen.getByText('poolClaimModal.whatHappensNext')).toBeTruthy());
    say('POOL_ACCEPT_CASE');
    expect(svc.acceptPoolCase).not.toHaveBeenCalled();
    svc.has.mockImplementation((c: string) => c !== 'case:pool:pass');
    cleanup();
    render(<PoolClaimModal {...props} />);
    await waitFor(() => expect(screen.getByText('poolClaimModal.whatHappensNext')).toBeTruthy());
    say('POOL_PASS_CASE');
    expect(svc.passPoolCase).not.toHaveBeenCalled();
  });

  it('does not listen while closed', () => {
    render(<PoolClaimModal {...props} isOpen={false} />);
    say('POOL_ACCEPT_CASE');
    expect(svc.acceptPoolCase).not.toHaveBeenCalled();
  });

  it('takes the context Accept / Pass are filed under while open, and hands the host\'s back on close', async () => {
    const view = render(<PoolClaimModal {...props} restoreVoiceContext="CASE_VIEW" />);
    expect(svc.setCurrentContext).toHaveBeenCalledWith('SYNOPTIC');
    view.unmount();
    expect(svc.setCurrentContext).toHaveBeenLastCalledWith('CASE_VIEW');
  });
});
