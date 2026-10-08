// src/hooks/useGuardedNavigate.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-128 (Batch 437): navigation from the app's header (nav bar buttons, the
// scan-station bench link, the header case search) goes through the app-wide
// unsaved-changes guard (contexts/DirtyStateContext), the same way the logo
// and breadcrumbs already did. With nothing unsaved it navigates at once;
// otherwise the page holding the changes (Configuration, Accession, the
// report) asks first. `before` runs only if the navigation goes ahead.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useDirtyState } from '@/contexts/DirtyStateContext';

export function useGuardedNavigate(): (path: string, before?: () => void) => void {
  const navigate = useNavigate();
  const { requestNavigate } = useDirtyState();
  return useCallback((path: string, before?: () => void) => {
    requestNavigate(path, (p) => { before?.(); navigate(p); });
  }, [navigate, requestNavigate]);
}
