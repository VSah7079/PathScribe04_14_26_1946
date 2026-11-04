// src/hooks/useSpecimenDivision.ts
// Batch 741 (Pete, fluid decisions 2 and 3): Divide specimen and an aliquot's status, saved through the versioned
// case update (rules in services/material/specimenDivision.ts). `onSaved` gets the case as saved.
import { useCallback, useState } from 'react';
import { authorizationService, auditService, updateCaseWithRetry, caseWriteDeps } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { divideSpecimen, changeAliquotStatus, type DivisionRow, type DivisionDeps } from '@/services/material/specimenDivision';
import type { AliquotStatus } from '@/types/case/Material';
import type { Case } from '@/types/case/Case';

export type DivisionMessage = { kind: 'ok'; key: string; values?: Record<string, string | number> } | { kind: 'error'; key: string };

export function useSpecimenDivision(caseData: Case | null, actorName: string, onSaved: (c: Case) => void) {
  const [message, setMessage] = useState<DivisionMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const deps = useCallback((): DivisionDeps => ({
    enforce: (key, ctx) => authorizationService.enforce(key, ctx),
    updateSpecimens: async (caseId, change) => {
      const r = await updateCaseWithRetry(caseId, current => {
        const next = change((current.specimens ?? []) as never);
        return next ? { specimens: next as never } : null;
      }, caseWriteDeps);
      return r.ok === true;
    },
    audit: e => { auditService.logEvent({ type: 'system', event: e.event, detail: e.detail, user: e.user, caseId: e.caseId, confidence: null }).catch(() => {}); },
    now: () => new Date(),
  }), []);

  const reload = useCallback(async (caseId: string) => {
    const latest = await caseRouter.getCase(caseId).catch(() => null);
    if (latest) onSaved(latest as Case);
  }, [onSaved]);

  const divide = useCallback(async (specimenId: string, startingVolumeMl: number, rows: DivisionRow[]) => {
    if (!caseData) return false;
    setBusy(true); setMessage(null);
    const r = await divideSpecimen({ caseId: caseData.id, accession: caseData.accession?.fullAccession ?? caseData.id, specimenId, startingVolumeMl, rows, actor: { name: actorName } }, deps());
    setMessage(r.ok ? { kind: 'ok', key: 'divided', values: { labels: r.aliquotLabels.join(', '), remaining: r.remainingMl } } : { kind: 'error', key: r.problem });
    await reload(caseData.id);
    setBusy(false);
    return r.ok;
  }, [caseData, actorName, deps, reload]);

  const setStatus = useCallback(async (aliquotId: string, next: AliquotStatus, receivingAccession?: string) => {
    if (!caseData) return;
    setBusy(true); setMessage(null);
    const r = await changeAliquotStatus({ caseId: caseData.id, accession: caseData.accession?.fullAccession ?? caseData.id, aliquotId, next, receivingAccession, actor: { name: actorName } }, deps());
    setMessage(r.ok ? { kind: 'ok', key: 'statusSaved' } : { kind: 'error', key: r.problem });
    await reload(caseData.id);
    setBusy(false);
  }, [caseData, actorName, deps, reload]);

  return { divide, setStatus, message, busy, clearMessage: () => setMessage(null) };
}
