// src/pages/SynopticReportPage/hooks/useOrganMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the anatomical map companion beside the synoptic (Pete's
// "Opt-In Companion"). Orchestration only:
// • loads the active synoptic's map context (its template, the binding of its
//   questions, the facility's colours) — services/organMapping/organMapLive;
// • works the map out from the synoptic answers on every render
//   (resolveOrganMap). The map has no Save of its own: change an answer,
//   the map changes;
// • "Insert into report": draws the print image (renderOrganMapSvg, light
//   colours), adds a PNG when the browser can, and stores the snapshot on the
//   case (insertOrganMapFigure — checks report:organ-map:insert, audits,
//   refuses once signed out).
// Every decision lives in the services; this hook passes data in and out.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import type { Case } from '@/types/case/Case';
import { figureForInstance, insertOrganMapFigure, lisOwnsReport, organMapFigureOutcomeKey, organMapReportState, removeOrganMapFigure, type OrganMapReportState } from '@/services/organMapping/organMapFigures';
import { loadOrganMapContext, organMapFigureDeps, type OrganMapContext } from '@/services/organMapping/organMapLive';
import { organMapLabelsFor } from '@/services/organMapping/organMapLabels';
import { renderOrganMapSvg } from '@/services/organMapping/organMapDrawing';
import { resolveOrganMap } from '@/services/organMapping/resolveProstateMap';
import type { OrganMapPayload } from '@/services/organMapping/organMapTypes';
import { partGridRowsOf } from '@/services/templates/partGrid';
import { svgToPngDataUrl } from '@/services/documentRendering/svgToPng';
import type { ShowToast } from '@/pages/Synoptic/useSynopticToast';
import { outboundLisSyncQueueService } from '@/services';
import { organMapFileSentAt } from '@/services/organMapping/organMapDeliveryRules';

interface Input {
  caseData: Case | null;
  instanceId: string;
  /** Whether the panel is open; opening it reloads the context (so a just-changed colour or binding shows). The context also loads while closed: it says whether the synoptic has a map at all (the Map button). */
  open: boolean;
  user: { id: string; name: string } | null | undefined;
  t: TFunction;
  /** The translation in the report's language (the performing lab's), for the words on the report image. */
  reportT: () => Promise<TFunction>;
  showToast: ShowToast;
  /** Takes the saved figures (the rest of the page's unsaved work is kept). */
  onFiguresSaved: (saved: Case) => void;
}

export interface OrganMapView {
  context: OrganMapContext | null;
  loading: boolean;
  payload: OrganMapPayload | null;
  figureState: OrganMapReportState;
  busy: boolean;
  /** Batch 751: on an Assist case, when the map file reached the laboratory system (delivery on, file sent). */
  fileSentAt?: string;
  insert: () => Promise<void>;
  remove: () => Promise<void>;
}

export function useOrganMap({ caseData, instanceId, open, user, t, reportT, showToast, onFiguresSaved }: Input): OrganMapView {
  const instance = (caseData?.synopticReports ?? []).find(r => r.instanceId === instanceId);
  const templateId = instance?.templateId ?? '';
  const facilityId = caseData?.order?.facilityId ?? null;
  const [context, setContext] = useState<OrganMapContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Another synoptic: its own context, never the previous one's binding meanwhile.
    setContext(prev => (prev?.template?.id === templateId ? prev : null));
    if (!templateId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    loadOrganMapContext({ templateId, facilityId })
      .then(c => { if (!cancelled) setContext(c); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [templateId, facilityId, open]);

  const payload = useMemo(() => {
    if (!context?.binding || !instance) return null;
    return resolveOrganMap({
      binding: context.binding,
      answers: (instance.answers ?? {}) as Record<string, string | string[]>,
      scheme: context.scheme.scheme, thresholds: context.scheme.thresholds,
      templateId,
      instanceId,
      rows: partGridRowsOf(caseData?.specimens),
    });
  }, [context, instance, templateId, instanceId, caseData?.specimens]);

  // Batch 751: an Assist case's delivered map file, for the panel's quiet line (nothing shows a failure to the pathologist).
  const [fileSentAt, setFileSentAt] = useState<string | undefined>(undefined);
  const assist = lisOwnsReport(caseData);
  const caseId = caseData?.id;
  const caseStatus = caseData?.status;
  useEffect(() => {
    setFileSentAt(undefined);
    if (!assist || !caseId || !instanceId) return;
    let live = true;
    void outboundLisSyncQueueService.getByCaseId(caseId).then(r => { if (live && r.ok) setFileSentAt(organMapFileSentAt(r.data, instanceId)); }).catch(() => undefined);
    return () => { live = false; };
  }, [assist, caseId, caseStatus, instanceId, open]);

  const figureState = organMapReportState(payload?.mapType, figureForInstance(caseData, instanceId), payload?.fingerprint, caseData?.status, payload?.hasData ?? false, lisOwnsReport(caseData));

  const insert = useCallback(async () => {
    if (!caseData || !payload || !context || !user) return;
    setBusy(true);
    try {
      const svg = renderOrganMapSvg(payload, context.scheme.scheme, organMapLabelsFor(await reportT(), payload, context.scheme.scheme));
      const pngDataUrl = await svgToPngDataUrl(svg, 3);
      // The PDF embeds the PNG: without one the report would say "in the report" and show nothing.
      if (!pngDataUrl) { showToast(t('organMap.panel.toast.noImage'), 'warning'); return; }
      const r = await insertOrganMapFigure({
        caseData, instanceId, mapType: payload.mapType, svg, pngDataUrl, fingerprint: payload.fingerprint, user: { id: user.id, name: user.name },
      }, organMapFigureDeps);
      if (r.ok) onFiguresSaved(r.caseData);
      showToast(t(organMapFigureOutcomeKey(r, 'insert')), r.ok ? 'success' : 'warning');
    } finally {
      setBusy(false);
    }
  }, [caseData, payload, context, user, t, reportT, instanceId, onFiguresSaved, showToast]);

  const remove = useCallback(async () => {
    if (!caseData || !user) return;
    setBusy(true);
    try {
      const r = await removeOrganMapFigure({ caseData, instanceId, user: { id: user.id, name: user.name } }, organMapFigureDeps);
      if (r.ok) onFiguresSaved(r.caseData);
      showToast(t(organMapFigureOutcomeKey(r, 'remove')), r.ok ? 'success' : 'warning');
    } finally {
      setBusy(false);
    }
  }, [caseData, user, instanceId, onFiguresSaved, showToast, t]);

  return { context, loading, payload, figureState, busy, fileSentAt, insert, remove };
}
