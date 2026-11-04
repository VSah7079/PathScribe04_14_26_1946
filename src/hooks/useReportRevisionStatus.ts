// src/hooks/useReportRevisionStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 495 (PS-283 §4.2.2): loads a case's amendment records and returns its
// revision status for the printed report's header. The decision itself is
// services/reports/resolveReportRevisionStatus.ts (pure); this only fetches.
// Re-fetches when the case id or its record version changes (a released
// amendment saves the case, so the version moves).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { amendmentService } from '@/services';
import { resolveReportRevisionStatus, type ReportRevisionStatus } from '@/services/reports/resolveReportRevisionStatus';

export function useReportRevisionStatus(
  caseRecord: { id?: string | null; version?: number | null; finalizedAt?: string | null } | null | undefined,
): ReportRevisionStatus | null {
  const [status, setStatus] = useState<ReportRevisionStatus | null>(null);
  const caseId = caseRecord?.id ?? null;
  const version = caseRecord?.version ?? null;
  const finalizedAt = caseRecord?.finalizedAt ?? null;

  useEffect(() => {
    if (!caseId) { setStatus(null); return; }
    let cancelled = false;
    amendmentService.getByCaseId(caseId).then(res => {
      if (cancelled) return;
      setStatus(res.ok ? resolveReportRevisionStatus({ finalizedAt }, res.data) : null);
    }).catch(() => { if (!cancelled) setStatus(null); });
    return () => { cancelled = true; };
  }, [caseId, version, finalizedAt]);

  return status;
}
