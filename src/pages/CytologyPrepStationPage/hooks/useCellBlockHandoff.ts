// src/pages/CytologyPrepStationPage/hooks/useCellBlockHandoff.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 740 (Pete, fluid decision 1): at the Cytology Preparation bench, make a cell block from the fluid on the
// bench, and hand a cell block off to histology by scanning its source and its cassette. The rules are in
// services/cytology/cellBlockHandoff.ts; this hook saves through the versioned decant change and reloads the work
// item.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { authorizationService, auditService } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { applyDecantChangeLive } from '@/services/material/caseMaterialService';
import { materialEventBus } from '@/services/material/materialEvents';
import { nextDecantLabel } from '@/services/material/materialTree';
import { handOffCellBlock, newCellBlockFrom, type HandoffProblem } from '@/services/cytology/cellBlockHandoff';
import { resolveDecantCassetteColor } from '@/utils/resolveDecantCassetteColor';
import { printDecantContainerLabel } from '@/utils/labels/printRequisitionAndContainerLabels';
import type { Case } from '@/types/case/Case';
import type { Decant } from '@/types/case/Material';
import type { Specimen } from '@/types/case/Specimen';

export type HandoffMessage = { kind: 'ok'; key: 'handedOff' | 'cellBlockMade'; label: string } | { kind: 'error'; key: HandoffProblem | 'notPermitted' | 'notSaved' };

export function useCellBlockHandoff(args: {
  caseData: Case | null; specimen: Specimen | null; decant: Decant | null;
  actor: { id: string; name: string }; stationId?: string;
  adoptSavedCase: (c: Case) => void;
}) {
  const { caseData, specimen, decant, actor, stationId, adoptSavedCase } = args;
  const [message, setMessage] = useState<HandoffMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (caseId: string) => {
    const latest = await caseRouter.getCase(caseId).catch(() => null);
    if (latest) adoptSavedCase(latest as Case);
    return latest as Case | null;
  }, [adoptSavedCase]);

  /** A cell block from the fluid on the bench (one click; the H&E waits for the hand-off). */
  const makeCellBlock = useCallback(async () => {
    if (!caseData || !specimen || !decant || decant.decantType === 'cell_block') return;
    setBusy(true); setMessage(null);
    const latest = (await caseRouter.getCase(caseData.id).catch(() => null)) as Case | null;
    const sp = (latest?.specimens ?? []).find(s => s.id === specimen.id) ?? specimen;
    const label = nextDecantLabel((sp as Specimen).decants);
    const cassetteColorId = await resolveDecantCassetteColor('cell_block', { priority: caseData.order?.priority as never }).catch(() => undefined);
    const cellBlock = newCellBlockFrom(decant, { id: sp.id, label: sp.label, decants: (sp as Specimen).decants }, caseData.accession?.fullAccession ?? caseData.id,
      { stamp: String(Date.now()), createdBy: actor.name, now: new Date().toISOString(), cassetteColorId, label });
    const r = await applyDecantChangeLive(caseData.id, { kind: 'add', specimenId: sp.id, decant: cellBlock }, latest?.version ?? caseData.version ?? 0);
    if (r.ok) {
      materialEventBus.publish({ type: 'MATERIAL_DECANTED', caseId: caseData.id, change: r.change, decant: r.event });
      setMessage({ kind: 'ok', key: 'cellBlockMade', label: `${sp.label}${label}` });
    } else setMessage({ kind: 'error', key: 'notSaved' });
    await reload(caseData.id);
    setBusy(false);
  }, [caseData, specimen, decant, actor.name, reload]);

  /** The hand-off: both scans must match (source, then the cell block's cassette). */
  const handOff = useCallback(async (cellBlockId: string, scans: { source: string; cassette: string }) => {
    if (!caseData || !specimen) return;
    setBusy(true); setMessage(null);
    const latest = (await caseRouter.getCase(caseData.id).catch(() => null)) as Case | null;
    const sp = ((latest ?? caseData).specimens ?? []).find(s => s.id === specimen.id) as Specimen | undefined;
    const decants = sp?.decants ?? [];
    const cellBlock = decants.find(d => d.id === cellBlockId);
    if (!cellBlock) { setBusy(false); setMessage({ kind: 'error', key: 'notCellBlock' }); return; }
    let version = latest?.version ?? caseData.version ?? 0;
    const result = await handOffCellBlock({
      caseId: caseData.id, accession: caseData.accession?.fullAccession ?? caseData.id, cellBlock, specimenDecants: decants, scans, actor, stationId,
    }, {
      enforce: (key, ctx) => authorizationService.enforce(key, ctx),
      saveHandoff: async (caseId, decantId, handoff) => {
        const r = await applyDecantChangeLive(caseId, { kind: 'update', decantId, patch: { handoff } }, version);
        if (r.ok === false) return { ok: false, error: r.error };
        version = r.version;
        materialEventBus.publish({ type: 'MATERIAL_DECANTED', caseId, change: r.change, decant: r.event });
        return { ok: true };
      },
      audit: e => { auditService.logEvent({ type: 'system', event: e.event, detail: e.detail, user: e.user, caseId: e.caseId, confidence: null }).catch(() => {}); },
      now: () => new Date(),
    });
    setMessage(result.ok ? { kind: 'ok', key: 'handedOff', label: `${sp?.label ?? ''}${cellBlock.label}` } : { kind: 'error', key: result.problem });
    await reload(caseData.id);
    setBusy(false);
  }, [caseData, specimen, actor, stationId, reload]);

  /** The cell block's cassette label (its barcode is what the hand-off scans). */
  const printLabel = useCallback(async (cellBlock: Decant) => {
    if (!caseData || !specimen) return;
    await printDecantContainerLabel(caseData, specimen.label, specimen.description ?? '', cellBlock).catch(() => false);
  }, [caseData, specimen]);

  return { makeCellBlock, handOff, printLabel, message, busy, clearMessage: () => setMessage(null) };
}
