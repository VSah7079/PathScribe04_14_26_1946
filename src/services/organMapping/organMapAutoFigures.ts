// src/services/organMapping/organMapAutoFigures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463 (Pete: "Always, for Mohs"): maps that are part of the report
// (ORGAN_MAP_AUTO_REPORT — the Mohs stage maps) are drawn into it
// automatically, from the synoptic answers at that moment, in the report's
// language: on preview and print (the PDF payload), and at sign-out (the
// report version keeps them with their SHA-256, like an inserted figure).
// Nothing is stored on the case for them and there is no Insert button, so
// they can't be out of date.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { sha256Hex } from '../registrySubmission/sha256';
import { svgToPngDataUrl } from '../documentRendering/svgToPng';
import { reportTranslateFor } from '../reports/reportTranslate';
import { partGridRowsOf } from '../templates/partGrid';
import { loadOrganMapContext } from './organMapLive';
import { resolveOrganMap } from './resolveProstateMap';
import { renderOrganMapSvg } from './organMapDrawing';
import { organMapLabelsFor, type Translate } from './organMapLabels';
import { organMapReportFigures, type OrganMapFigure, type OrganMapFigureVersion, type OrganMapReportFigure } from './organMapFigures';
import { isAutoReportMap } from './organMapTypes';
import { mohsReportWords, mohsStagesDisplay } from '../templates/mohsStages';

type CaseLike = Pick<Case, 'synopticReports' | 'specimens' | 'order' | 'organMapFigures'>;

export interface AutoOrganMapFigure {
  instanceId: string; mapType: OrganMapFigure['mapType']; svg: string; pngDataUrl?: string; fingerprint: string;
  /** What the map shows as text, for the PDF's notice if it can't be drawn (Mohs: a line per stage). */
  fallbackLines: string[];
}

/** The automatic maps of a case, drawn now (only synoptics whose map is part of the report and has data). */
export async function autoOrganMapFigures(caseData: CaseLike | null | undefined, t: Translate): Promise<AutoOrganMapFigure[]> {
  const out: AutoOrganMapFigure[] = [];
  for (const instance of caseData?.synopticReports ?? []) {
    const context = await loadOrganMapContext({ templateId: instance.templateId, facilityId: caseData?.order?.facilityId ?? null }).catch(() => null);
    if (!context?.binding || !isAutoReportMap(context.binding.mapType)) continue;
    const payload = resolveOrganMap({
      binding: context.binding, answers: (instance.answers ?? {}) as Record<string, string | string[]>, scheme: context.scheme.scheme,
      thresholds: context.scheme.thresholds, templateId: instance.templateId, instanceId: instance.instanceId, rows: partGridRowsOf(caseData?.specimens),
    });
    if (!payload.hasData) continue;
    const svg = renderOrganMapSvg(payload, context.scheme.scheme, organMapLabelsFor(t, payload, context.scheme.scheme));
    // Unlike Insert (which refuses without a PNG), an automatic map is kept without one: the
    // version still keeps and hashes its SVG, and the PDF prints a notice with fallbackLines in
    // its place (functions/main.py figure_notice). Open: the server draws it (ORGAN_MAPPING_API.md §5).
    const pngDataUrl = await svgToPngDataUrl(svg, 3);
    const fallbackLines = context.binding.mapType === 'mohsStages'
      ? mohsStagesDisplay(context.binding.stagesFieldId, instance.answers ?? {}, mohsReportWords(t)).split('\n').filter(Boolean)
      : [];
    out.push({ instanceId: instance.instanceId, mapType: payload.mapType, svg, ...(pngDataUrl ? { pngDataUrl } : {}), fingerprint: payload.fingerprint, fallbackLines });
  }
  return out;
}

/** The translation in a facility's report language (kept here for the report page's import). */
export { reportTranslateFor };

/** The PDF payload's figures: the pathologist's inserted ones, and the automatic ones drawn now. */
export async function reportFiguresWithAuto(caseData: CaseLike & Pick<Case, 'synopticReports'> | null | undefined, t: Translate): Promise<OrganMapReportFigure[]> {
  const auto = await autoOrganMapFigures(caseData, t);
  const autoIds = new Set(auto.map(a => a.instanceId));
  const asFigures: OrganMapFigure[] = auto.map(a => ({
    id: `auto-${a.instanceId}`, instanceId: a.instanceId, mapType: a.mapType, svg: a.svg, fingerprint: a.fingerprint,
    ...(a.pngDataUrl ? { pngDataUrl: a.pngDataUrl } : {}), insertedAt: '', insertedBy: '', insertedByName: '',
  }));
  const byInstance = new Map(auto.map(a => [a.instanceId, a]));
  return organMapReportFigures({
    synopticReports: caseData?.synopticReports,
    organMapFigures: [...(caseData?.organMapFigures ?? []).filter(f => !autoIds.has(f.instanceId)), ...asFigures],
  }).map(f => {
    // A map that is part of the report never goes missing silently (functions/main.py figure_notice).
    const a = byInstance.get(f.instanceId);
    return a ? { ...f, notice: true, fallbackLines: a.fallbackLines } : f;
  });
}

/** What a report version keeps of an automatic map (with its hashes). */
export const autoFigureVersion = (a: AutoOrganMapFigure): OrganMapFigureVersion => ({
  instanceId: a.instanceId, mapType: a.mapType, fingerprint: a.fingerprint, svg: a.svg, svgSha256: sha256Hex(a.svg),
  ...(a.pngDataUrl ? { pngDataUrl: a.pngDataUrl, pngSha256: sha256Hex(a.pngDataUrl) } : {}),
});
