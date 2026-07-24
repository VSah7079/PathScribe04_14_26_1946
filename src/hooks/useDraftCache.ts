// src/hooks/useDraftCache.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 of the Inactivity Timeout & Draft Recovery spec (see PRIORITY_FIXES.md).
//
// Usage sketch (see SynopticReportPage.tsx for the real, wired usage):
//
//   const { hasExistingDraft, existingDraftPayload, existingDraftSavedAt,
//           confirmRestore, discardDraft } =
//     useDraftCache(user?.id ?? null, caseId, currentFormState);
//
//   // Once hasExistingDraft is true, existingDraftPayload is already
//   // available — compute a diff against currentFormState and show it
//   // (DraftRecoveryModal) BEFORE the user decides anything, rather than
//   // fetching only after they click Restore. If they restore, apply
//   // existingDraftPayload to your own state yourself, then call
//   // confirmRestore() to clear the cache entry. If they discard, call
//   // discardDraft() instead.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { mockDraftCacheService } from '@/services/drafts/mockDraftCacheService';

const DEBOUNCE_MS = 1000; // matches the spec's Drafts:DebounceIntervalMs default

interface UseDraftCacheResult<T> {
  /** True if a draft existed BEFORE this hook started auto-saving (i.e. a
   *  real prior-session draft, not one just created by this mount). Checked
   *  once on mount/entityId-change; does not update afterward. */
  hasExistingDraft: boolean;
  /** The cached payload itself, available as soon as hasExistingDraft is
   *  true — lets the caller compute/show a diff before asking the user
   *  to decide anything. */
  existingDraftPayload: T | null;
  existingDraftSavedAt: string | null;
  /** Call after you've applied existingDraftPayload to your own state —
   *  clears the cache entry so the same draft doesn't prompt again. */
  confirmRestore: () => void;
  /** Clears the cached draft without applying it. */
  discardDraft: () => void;
}

export function useDraftCache<T>(
  userId: string | null,
  entityId: string | null,
  currentState: T,
  enabled: boolean = true,
): UseDraftCacheResult<T> {
  const [hasExistingDraft, setHasExistingDraft]         = useState(false);
  const [existingDraftPayload, setExistingDraftPayload] = useState<T | null>(null);
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
      if (cancelled || !res.ok || !res.data) return;
      setHasExistingDraft(true);
      setExistingDraftPayload(res.data.payload);
      setExistingDraftSavedAt(res.data.savedAt);
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

  const confirmRestore = useCallback(() => {
    if (!userId || !entityId) return;
    mockDraftCacheService.clearDraft(userId, entityId);
    setHasExistingDraft(false);
    setExistingDraftPayload(null);
  }, [userId, entityId]);

  const discardDraft = useCallback(() => {
    if (!userId || !entityId) return;
    mockDraftCacheService.clearDraft(userId, entityId);
    setHasExistingDraft(false);
    setExistingDraftPayload(null);
  }, [userId, entityId]);

  return { hasExistingDraft, existingDraftPayload, existingDraftSavedAt, confirmRestore, discardDraft };
}
