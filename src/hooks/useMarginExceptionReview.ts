// src/hooks/useMarginExceptionReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (deferred from Batch 490's own extraction layer; see
// services/marginExtraction/README.md's "No review-queue screen" entry).
// Orchestrates marginExtractionService + caseService for
// MarginExceptionReviewPage.tsx; the page itself only renders (CLAUDE.md
// rule 2). No decision logic of its own beyond loading/resolving/dismissing
// and reloading — the extraction/exception rules live in
// services/marginExtraction/.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { marginExtractionService, caseService } from '@/services';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await marginExtractionService.listExceptions({ status: 'Pending' });
    if (!isServiceOk(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    const withCases = await Promise.all(res.data.map(async exception => {
      const c = await caseService.getCase(exception.caseId);
      return {
        exception,
        caseAccession: c ? flagViewAccession(c, exception.caseId) : exception.caseId,
        // Batch 514: the name fields; the page formats them in the screen's language.
        patientName: c ? resolvePatientNameValue(c.patient) : null,
      };
    }));
    setRows(withCases);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = useCallback(async (id: string, valueMm: number, byUserId: string, byUserName: string) => {
    setBusyId(id);
    try {
      const res = await marginExtractionService.resolveException(id, valueMm, byUserId, byUserName);
      if (res.ok) await load();
      return res;
    } finally { setBusyId(null); }
  }, [load]);

  const dismiss = useCallback(async (id: string, reason: string, byUserId: string, byUserName: string) => {
    setBusyId(id);
    try {
      const res = await marginExtractionService.dismissException(id, reason, byUserId, byUserName);
      if (res.ok) await load();
      return res;
    } finally { setBusyId(null); }
  }, [load]);

  return { rows, loading, error, reload: load, resolve, dismiss, busyId };
}
