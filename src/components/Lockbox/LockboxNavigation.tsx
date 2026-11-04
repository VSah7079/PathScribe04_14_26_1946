// src/components/Lockbox/LockboxNavigation.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the "Go to Lockbox Drop-Off" command (voice, Alt+Shift+Z, or Alt+J then Shift+Z). The action registry dispatches
// PATHSCRIBE_OPEN_LOCKBOX_DROP_OFF; this opens the route through the shared unsaved-changes guard (requestNavigate), as the
// other Go to commands do in AppShell (which is over 1,000 lines and may not grow). Renders nothing. The route itself is
// behind ScreenGate (screen:lockbox-drop-off:open), so a person without the screen still gets the access message.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useDirtyState } from '../../contexts/DirtyStateContext';

export const LOCKBOX_ROUTE = '/lockbox-drop-off';

export const LockboxNavigation = (): null => {
  const navigate = useNavigate();
  const { requestNavigate } = useDirtyState();
  useEffect(() => {
    const open = () => requestNavigate(LOCKBOX_ROUTE, p => navigate(p));
    window.addEventListener('PATHSCRIBE_OPEN_LOCKBOX_DROP_OFF', open);
    return () => window.removeEventListener('PATHSCRIBE_OPEN_LOCKBOX_DROP_OFF', open);
  }, [navigate, requestNavigate]);
  return null;
};
