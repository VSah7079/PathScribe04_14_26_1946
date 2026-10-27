// src/hooks/useMarginExceptionReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (deferred from Batch 490's own extraction layer; see
// services/marginExtraction/README.md's "No review-queue screen" entry).
// Orchestrates marginExtractionService + caseService for
// MarginExceptionReviewPage.tsx; the page itself only renders (CLAUDE.md
// rule 2). No decision logic of its own beyond loading/resolving/dismissing
// and reloading — the extraction/exception rules live in
// services/marginExtraction/. Batch 669: Resolve / Dismiss go through
// services/marginExtraction/reviewMarginException.ts (audit entry + rule re-run).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { marginExtractionService, caseService } from '@/services';
import {
  resolveMarginExceptionWithFollowUp, dismissMarginExceptionWithFollowUp, partitionMarginExceptions, marginOutcomeNotices,
  type MarginOutcomeNotice,
} from '@/services/marginExtraction/reviewMarginException';
import { defaultReviewMarginExceptionDeps } from '@/services/marginExtraction/defaultReviewMarginExceptionDeps';
import { isServiceOk } from '@/services/types';
import type { MarginExtractionException } from '@/services/marginExtraction/IMarginExtractionService';
import { flagViewAccession } from '@/services/flags/caseFlagView';
import { resolvePatientNameValue, type PersonNameValue } from '@/utils/personName';

/** A pending exception plus the display-only fields the row needs —
 *  resolved once per load rather than re-fetched per row. */
export interface MarginExceptionRow {
  exception: MarginExtractionException;
  caseAccession: string;
  /** The patient's name fields, or null; the page formats them (Batch 514). */
  patientName: PersonNameValue | null;
}

export function useMarginExceptionReview() {
  const [rows, setRows] = useState<MarginExceptionRow[]>([]);
  /** Batch 669: resolved and dismissed items, newest first (read-only history). */
  const [decidedRows, setDecidedRows] = useState<MarginExceptionRow[]>([]);
  const [notices, setNotices] = useState<MarginOutcomeNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await marginExtractionService.listExceptions();
    if (!isServiceOk(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    const { pending, decided } = partitionMarginExceptions(res.data);
    const withCase = (exception: MarginExtractionException) => caseService.getCase(exception.caseId).then(c => ({
      exception,
      caseAccession: c ? flagViewAccession(c, exception.caseId) : exception.caseId,
      // Batch 514: the name fields; the page formats them in the screen's language.
      patientName: c ? resolvePatientNameValue(c.patient) : null,
    }));
    const withCases = await Promise.all(pending.map(withCase));
    setDecidedRows(await Promise.all(decided.map(withCase)));
    setRows(withCases);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const accessionOf = useCallback((id: string) => rows.find(r => r.exception.id === id)?.caseAccession, [rows]);

  const resolve = useCallback(async (id: string, valueMm: number, byUserId: string, byUserName: string) => {
    setBusyId(id);
    try {
      const res = await resolveMarginExceptionWithFollowUp(id, valueMm, { id: byUserId, name: byUserName }, accessionOf(id), defaultReviewMarginExceptionDeps);
      if (res.ok) { setNotices(marginOutcomeNotices(res.data)); await load(); }
      return res;
    } finally { setBusyId(null); }
  }, [load, accessionOf]);

  const dismiss = useCallback(async (id: string, reason: string, byUserId: string, byUserName: string) => {
    setBusyId(id);
    try {
      const res = await dismissMarginExceptionWithFollowUp(id, reason, { id: byUserId, name: byUserName }, accessionOf(id), defaultReviewMarginExceptionDeps);
      if (res.ok) { setNotices(marginOutcomeNotices(res.data)); await load(); }
      return res;
    } finally { setBusyId(null); }
  }, [load, accessionOf]);

  return { rows, decidedRows, notices, loading, error, reload: load, resolve, dismiss, busyId };
}
