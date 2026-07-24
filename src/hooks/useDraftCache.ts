// src/hooks/useDraftCache.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 of the Inactivity Timeout & Draft Recovery spec (see PRIORITY_FIXES.md).
//
// Usage sketch (NOT yet wired into SynopticReportPage.tsx — see this feature's
// PRIORITY_FIXES.md entry for why that integration is deliberately still
// pending its own discussion, given that page's size/complexity):
//
//   const { hasExistingDraft, existingDraftSavedAt, restoreDraft, discardDraft } =
//     useDraftCache(user?.id ?? null, caseId, currentFormState);
//
//   // On mount, if hasExistingDraft is true, show a recovery prompt before
//   // the user starts editing — call restoreDraft() (async) to get the
//   // cached payload back, or discardDraft() to clear it and start fresh.
//   // Once the prompt is resolved, ongoing edits to currentFormState are
//   // auto-saved (debounced) automatically — no further calls needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { mockDraftCacheService } from '@/services/drafts/mockDraftCacheService';

const DEBOUNCE_MS = 1000; // matches the spec's Drafts:DebounceIntervalMs default

interface UseDraftCacheResult<T> {
  /** True if a draft existed BEFORE this hook started auto-saving (i.e. a
   *  real prior-session draft, not one just created by this mount). Checked
   *  once on mount/entityId-change; does not update afterward. */
  hasExistingDraft: boolean;
  existingDraftSavedAt: string | null;
  /** Async — returns the cached payload and clears the "existing draft"
   *  flag. Caller is responsible for actually applying it to their own
   *  state. */
  restoreDraft: () => Promise<T | null>;
  /** Clears the cached draft without restoring it. */
  discardDraft: () => void;
}

export function useDraftCache<T>(
  userId: string | null,
  entityId: string | null,
  currentState: T,
  enabled: boolean = true,
): UseDraftCacheResult<T> {
  const [hasExistingDraft, setHasExistingDraft]     = useState(false);
  const [existingDraftSavedAt, setExistingDraftSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkedKeyRef = useRef<string | null>(null);

  // ── Check for a pre-existing draft once per userId+entityId ────────────────
  useEffect(() => {
    if (!enabled || !userId || !entityId) return;
    const key = `${userId}:${entityId}`;
    if (checkedKeyRef.current === key) return; // already checked this entity
    checkedKeyRef.current = key;

    let cancelled = false;
    mockDraftCacheService.getDraft<T>(userId, entityId).then(res => {
      if (cancelled || !res.ok) return;
      setHasExistingDraft(!!res.data);
      setExistingDraftSavedAt(res.data?.savedAt ?? null);
    });
    return () => { cancelled = true; };
  }, [enabled, userId, entityId]);

  // ── Debounced auto-save on every currentState change ────────────────────────
  useEffect(() => {
    if (!enabled || !userId || !entityId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mockDraftCacheService.saveDraft(userId, entityId, currentState);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [enabled, userId, entityId, currentState]);

  const restoreDraft = useCallback(async (): Promise<T | null> => {
    if (!userId || !entityId) return null;
    const res = await mockDraftCacheService.getDraft<T>(userId, entityId);
    setHasExistingDraft(false);
    return res.ok ? (res.data?.payload ?? null) : null;
  }, [userId, entityId]);

  const discardDraft = useCallback(() => {
    if (!userId || !entityId) return;
    mockDraftCacheService.clearDraft(userId, entityId);
    setHasExistingDraft(false);
  }, [userId, entityId]);

  return { hasExistingDraft, existingDraftSavedAt, restoreDraft, discardDraft };
}
