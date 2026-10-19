// src/hooks/useDisplayBinding.ts
// ─────────────────────────────────────────────────
// Batch 603: a wall display's Display Token and its standing check.
//   • The token an administrator issued is kept on this computer
//     (workstation settings), per display kind.
//   • The binding is checked when the page opens and again every minute and
//     whenever the window regains focus, so a token revoked in Configuration
//     blanks the display within a minute (the server answers 401 on the next
//     request in production).
// A display is shown only while status === 'valid'.
// ─────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { getWorkstationSetting, setWorkstationSetting } from '@/utils/workstationSettings';
import { displayAccessService } from '@/services';
import type { DisplayBindingStatus, DisplayKind } from '@/services/displayAccess/displayToken';

export const DISPLAY_RECHECK_MS = 60_000;
const tokenKey = (kind: DisplayKind) => `pathscribe_display_token_${kind}`;

export function readStoredDisplayToken(kind: DisplayKind): string | null {
  return getWorkstationSetting(tokenKey(kind));
}
export function storeDisplayToken(kind: DisplayKind, token: string | null): void {
  setWorkstationSetting(tokenKey(kind), token);
}

export type DisplayAccessState = 'checking' | DisplayBindingStatus;

export function useDisplayBindingStatus(kind: DisplayKind, subjectId: string | null, token: string | null): DisplayAccessState {
  const [state, setState] = useState<DisplayAccessState>('checking');

  const check = useCallback(async () => {
    if (!subjectId) return;
    setState(await displayAccessService.verify(kind, subjectId, token));
  }, [kind, subjectId, token]);

  useEffect(() => {
    if (!subjectId) { setState('checking'); return; }
    setState('checking');
    check();
    const id = window.setInterval(check, DISPLAY_RECHECK_MS);
    const onFocus = () => { check(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [subjectId, check]);

  return state;
}
