// src/hooks/useTumorBoardWorkspace.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec). Orchestrates
// tumorBoardService + caseService + userService for TumorBoardWorkspacePage.tsx;
// the page itself only renders (CLAUDE.md rule 2). Filter state is sticky per
// browser via utils/uiPreferences.ts, bundled as one object under one key —
// no precedent in this codebase yet for a multi-field saved view, so this
// hook establishes the pattern other multi-filter workspaces can copy.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { tumorBoardService, caseService, userService, tumorBoardBatchSettingsService } from '@/services';
import { isServiceOk } from '@/services/types';
import type { TumorBoardListing, TumorBoardListingUpdate } from '@/services/tumorBoard/ITumorBoardService';
import type { StaffUser } from '@/services/users/IUserService';
import { DEFAULT_WORKSPACE_FILTERS, toServiceFilter, sortListings, type TumorBoardWorkspaceFilterState } from '@/services/tumorBoard/tumorBoardWorkspaceFilters';
import { isPresenterEligibleRoles } from '@/services/tumorBoard/tumorBoardPresenterEligibility';
import { DEFAULT_TUMOR_BOARD_BATCH_SETTINGS } from '@/services/tumorBoardRules/ITumorBoardRuleService';
import { getUiPreference, setUiPreference } from '@/utils/uiPreferences';
import { resolvePatientNameValue, type PersonNameValue } from '@/utils/personName';

const FILTERS_PREFERENCE_KEY = 'tumorBoardWorkspace.filters';

/** A listing plus the display-only fields the row needs — resolved once per
 *  load rather than re-fetched per row. */
export interface TumorBoardWorkspaceRow {
  listing: TumorBoardListing;
  /** The patient's name fields, or null; the page formats them (Batch 514). */
  patientName: PersonNameValue | null;
}

export function useTumorBoardWorkspace(timezone: string) {
  const [filters, setFiltersState] = useState<TumorBoardWorkspaceFilterState>(() =>
    getUiPreference(FILTERS_PREFERENCE_KEY, DEFAULT_WORKSPACE_FILTERS));
  const [rows, setRows] = useState<TumorBoardWorkspaceRow[]>([]);
  const [presenters, setPresenters] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Batch 494: the batch-lock cut-off — fetched once so the dashboard can
  // show each session's own locked/open state (services/tumorBoard/
  // tumorBoardSessionGrouping.ts). Defaults to the same 48h the service
  // itself defaults to, so the very first render (before the fetch below
  // resolves) already shows a reasonable lock state instead of "never locked."
  const [cutoffHours, setCutoffHours] = useState(DEFAULT_TUMOR_BOARD_BATCH_SETTINGS.cutoffHours);

  const setFilters = useCallback((next: TumorBoardWorkspaceFilterState) => {
    setFiltersState(next);
    setUiPreference(FILTERS_PREFERENCE_KEY, next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await tumorBoardService.list(toServiceFilter(filters, new Date(), timezone));
    // Plain `!res.ok` does not narrow under this project's strictNullChecks:
    // false setting (see services/types.ts's own header comment) — use
    // isServiceOk() instead.
    if (!isServiceOk(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    const sorted = sortListings(res.data, filters.sortBy);
    const withPatients = await Promise.all(sorted.map(async listing => {
      const c = await caseService.getCase(listing.caseId);
      // Batch 514: the name fields; the page formats them in the screen's language.
      return { listing, patientName: c ? resolvePatientNameValue(c.patient) : null };
    }));
    setRows(withPatients);
    setLoading(false);
  }, [filters, timezone]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    userService.getAll().then(res => {
      // Batch 493 (Pete, Oct 8): "Restrict the formal Tumor Board Presenter
      // assignment field... to Attending Pathologists, Fellows, and
      // Residents" — explicit confirmation after Pete noticed residents
      // present at Tumor Board too but the list only ever offered
      // pathologist/fellow since Batch 489. PA (Pathologist Assistant) is
      // deliberately still excluded per that same instruction — a PA
      // grosses specimens but doesn't present a case's findings.
      // Batch 494: the role check itself now lives in
      // tumorBoardPresenterEligibility.ts, shared with
      // mockTumorBoardService.ts's own real, server-side enforcement of
      // the same rule, so the two can't drift apart.
      if (res.ok) setPresenters(res.data.filter(u => u.status === 'Active' && isPresenterEligibleRoles(u.roles)));
    });
  }, []);

  // Batch 494: fetched once on mount — a System Config admin edit mid-
  // session won't retroactively re-lock an already-rendered session until
  // the next load, the same staleness every other config-driven display
  // value in this app accepts.
  useEffect(() => {
    tumorBoardBatchSettingsService.get().then(res => { if (res.ok) setCutoffHours(res.data.cutoffHours); });
  }, []);

  const updateListing = useCallback(async (id: string, changes: TumorBoardListingUpdate, byUserId: string, byUserName: string) => {
    // Batch 493: timezone is also how the service decides, facility-
    // locally, whether a presenter + schedule change is still "a future
    // date" worth the new notification + calendar invite — see
    // mockTumorBoardService.update()/notifyTumorBoardAssignment.ts.
    const res = await tumorBoardService.update(id, changes, byUserId, byUserName, timezone);
    if (res.ok) await load();
    return res;
  }, [load, timezone]);

  // Batch 491: the clinical override, kept separate from updateListing
  // above (case:tumor-board:dismiss, never case:tumor-board:manage).
  const dismissListing = useCallback(async (id: string, reason: string, byUserId: string, byUserName: string) => {
    const res = await tumorBoardService.dismiss(id, reason, byUserId, byUserName);
    if (res.ok) await load();
    return res;
  }, [load]);

  // Batch 494 (Pete, Oct 8, the MDT Self-Service Assignment & Batching
  // redesign): "Pathologists... self-assign or assign a colleague when it
  // is time to prep." A thin convenience over updateListing — the claimer
  // IS the presenter here, unlike the admin-assist dropdown (still
  // updateListing directly) where the acting user assigns someone else.
  // Goes through the exact same case:tumor-board:schedule capability,
  // batch-lock, and presenter-eligibility checks as any other presenter
  // change — see mockTumorBoardService.ts's own update().
  const claimListing = useCallback(async (id: string, byUserId: string, byUserName: string) => {
    return updateListing(id, { presenterUserId: byUserId, presenterUserName: byUserName }, byUserId, byUserName);
  }, [updateListing]);

  return { filters, setFilters, rows, presenters, cutoffHours, loading, error, reload: load, updateListing, claimListing, dismissListing };
}
