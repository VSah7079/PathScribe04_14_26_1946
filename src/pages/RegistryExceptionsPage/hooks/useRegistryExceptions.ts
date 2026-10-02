// src/pages/RegistryExceptionsPage/hooks/useRegistryExceptions.ts
// Batch 421: loads the Registry Exceptions worklist and runs a resend. Decisions are in services/registrySubmission/.
// Batch 423: and "Capture as CAPA" (captureRegistryExceptionAsCapa), with which rows already have an open one.
// Batch 425: scoped to the user's own cases; "Mark reviewed" for a revision after acceptance; the transmission audit download.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { exportRegistryTransmissionAudit, loadRegistryExceptionsForUser } from '@/services/registrySubmission/registryExceptionsService';
import { reviewRegistryRevision } from '@/services/registrySubmission/recordRegistryRevision';
import { registryCapaDeps, registryExceptionsLoadDeps, registryRevisionReviewDeps, registryTransmissionExportDeps, resendRegistrySubmissionDeps } from '@/services/registrySubmission/registryExceptionsDeps';
import { captureRegistryExceptionAsCapa, registryRowsWithOpenCapa } from '@/services/registrySubmission/captureRegistryExceptionAsCapa';
import { resendAllRegistrySubmissions, resendRegistrySubmission, type ResendOutcome } from '@/services/registrySubmission/resendRegistrySubmission';
import { registryExceptionCounts, type RegistryExceptionKind, type RegistryExceptionRow, type RegistryQueueName } from '@/services/registrySubmission/registryExceptions';

export type RegistryExceptionFilter = 'all' | RegistryExceptionKind;

export function useRegistryExceptions(user: { id: string; name: string } | null | undefined) {
  const [rows, setRows] = useState<RegistryExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RegistryExceptionFilter>('all');
  const [busyEntry, setBusyEntry] = useState<string | null>(null);
  const [withCapa, setWithCapa] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadRegistryExceptionsForUser(registryExceptionsLoadDeps);
      setRows(loaded);
      setWithCapa(await registryRowsWithOpenCapa(loaded, registryCapaDeps));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const counts = useMemo(() => registryExceptionCounts(rows), [rows]);
  const shown = useMemo(() => (filter === 'all' ? rows : rows.filter(r => r.kind === filter)), [rows, filter]);

  const resend = useCallback(async (row: RegistryExceptionRow): Promise<ResendOutcome> => {
    setBusyEntry(row.entryId);
    try {
      const r = await resendRegistrySubmission({ queue: row.queue, entryId: row.entryId }, { id: user?.id ?? '', name: user?.name ?? '' }, resendRegistrySubmissionDeps);
      await reload();
      return r;
    } finally { setBusyEntry(null); }
  }, [user, reload]);

  const captureCapa = useCallback(async (row: RegistryExceptionRow) => {
    setBusyEntry(row.entryId);
    try {
      const r = await captureRegistryExceptionAsCapa(row, { id: user?.id ?? '', name: user?.name ?? '' }, registryCapaDeps);
      await reload();
      return r;
    } finally { setBusyEntry(null); }
  }, [user, reload]);

  /** Batch 424: resend every row shown (the attestation-required catch-up). */
  const resendAll = useCallback(async () => {
    setBusyEntry('*');
    try {
      const r = await resendAllRegistrySubmissions(shown.filter(x => x.canResend), { id: user?.id ?? '', name: user?.name ?? '' }, resendRegistrySubmissionDeps);
      await reload();
      return r;
    } finally { setBusyEntry(null); }
  }, [shown, user, reload]);

  /** Batch 425: a revision after acceptance marked reviewed (registry:revision:review). */
  const markReviewed = useCallback(async (row: RegistryExceptionRow) => {
    setBusyEntry(row.entryId);
    try {
      const r = await reviewRegistryRevision({ queue: row.queue, entryId: row.entryId }, { id: user?.id ?? '', name: user?.name ?? '' }, registryRevisionReviewDeps);
      await reload();
      return r;
    } finally { setBusyEntry(null); }
  }, [user, reload]);

  /** Batch 425: the transmission audit (qa:registry-transmission-audit:export). */
  const exportAudit = useCallback((queue?: RegistryQueueName) =>
    exportRegistryTransmissionAudit({ queue, today: new Date().toISOString().slice(0, 10) }, registryTransmissionExportDeps), []);

  const hasCapa = useCallback((row: RegistryExceptionRow) => withCapa.has(`${row.queue}:${row.entryId}`), [withCapa]);

  return { rows: shown, total: rows.length, counts, loading, filter, setFilter, reload, resend, resendAll, captureCapa, markReviewed, exportAudit, hasCapa, busyEntry };
}
