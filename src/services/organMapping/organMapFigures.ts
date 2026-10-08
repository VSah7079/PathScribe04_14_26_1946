// src/services/organMapping/organMapFigures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461 (Pete, Oct 5: "Insert into Report" is the pathologist's choice
// per case; agreed): the map image placed in the report.
// • The image is a snapshot: the map drawn in print colours (light, whatever
//   the screen theme), as SVG, plus a PNG when the browser can draw one (the
//   report PDF embeds the PNG).
// • It records the map's fingerprint. When the synoptic answers change after
//   it was inserted, the panel says "Report image is out of date — insert
//   again"; nothing changes the report image by itself.
// • After sign-out it is locked: the report version keeps it with its SHA-256
//   (mockReportVersionService), and a change goes through an amendment.
// • Inserting or removing needs report:organ-map:insert, and is audited.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CaseWriteDeps } from '../cases/caseWrite';
import { updateCaseWithRetry } from '../cases/caseWrite';
import { sha256Hex } from '../registrySubmission/sha256';
import { isAutoReportMap, type OrganMapType } from './organMapTypes';

export interface OrganMapFigure {
  id: string;
  instanceId: string;
  mapType: OrganMapType;
  svg: string;
  pngDataUrl?: string;
  fingerprint: string;
  insertedAt: string;
  insertedBy: string;
  insertedByName: string;
}

export interface OrganMapFigureVersion {
  instanceId: string;
  mapType: OrganMapType;
  fingerprint: string;
  svgSha256: string;
  pngSha256?: string;
  svg: string;
  pngDataUrl?: string;
}

export type OrganMapFigureState = 'none' | 'current' | 'stale' | 'locked';

/** Signed out (finalized, waiting for release, closed) or sent for countersign:
 *  the report image can no longer change in place. */
export const isReportLockedForFigures = (status: string | undefined) =>
  status === 'finalized' || status === 'closed' || status === 'pending-release' || status === 'pending-countersign';

/** Batch 463: what the panel says about the report: an automatic map is in it, as it is now
 *  ('auto'), once it has something to show ('autoEmpty' until then: a Mohs map with no stage is drawn nowhere). */
export type OrganMapReportState = OrganMapFigureState | 'auto' | 'autoEmpty';
export function organMapReportState(mapType: OrganMapType | undefined, figure: OrganMapFigure | undefined, currentFingerprint: string | undefined, caseStatus: string | undefined, hasData = true): OrganMapReportState {
  if (mapType && isAutoReportMap(mapType)) return hasData ? 'auto' : 'autoEmpty';
  return organMapFigureState(figure, currentFingerprint, caseStatus);
}

export function organMapFigureState(figure: OrganMapFigure | undefined, currentFingerprint: string | undefined, caseStatus: string | undefined): OrganMapFigureState {
  if (!figure) return 'none';
  if (isReportLockedForFigures(caseStatus)) return 'locked';
  return currentFingerprint !== undefined && currentFingerprint !== figure.fingerprint ? 'stale' : 'current';
}

export const figureForInstance = (caseData: Pick<Case, 'organMapFigures'> | null | undefined, instanceId: string) =>
  (caseData?.organMapFigures ?? []).find(f => f.instanceId === instanceId);

/** The figures a report version keeps, with their hashes (all, or one instance's). */
export function organMapFiguresForVersion(caseData: Pick<Case, 'organMapFigures'> | null | undefined, instanceId?: string): OrganMapFigureVersion[] {
  return (caseData?.organMapFigures ?? [])
    .filter(f => !instanceId || f.instanceId === instanceId)
    .map(f => ({
      instanceId: f.instanceId, mapType: f.mapType, fingerprint: f.fingerprint, svg: f.svg,
      svgSha256: sha256Hex(f.svg),
      ...(f.pngDataUrl ? { pngDataUrl: f.pngDataUrl, pngSha256: sha256Hex(f.pngDataUrl) } : {}),
    }));
}

export interface OrganMapFigureDeps extends CaseWriteDeps {
  enforce: (capability: string, context: { caseId?: string | null; facilityId?: string | null }) => Promise<{ allowed: boolean }>;
  logAudit: (entry: { type: 'user'; event: string; detail: string; user: string; caseId: string | null; confidence: null }) => unknown;
  now: () => Date;
  newId: () => string;
}

export type OrganMapFigureResult = { ok: true; caseData: Case } | { ok: false; reason: 'notPermitted' | 'locked' | 'notSaved' };

async function changeFigures(
  caseData: Case, instanceId: string, figure: OrganMapFigure | null, user: { id: string; name: string }, deps: OrganMapFigureDeps,
): Promise<OrganMapFigureResult> {
  if (!(await deps.enforce('report:organ-map:insert', { caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null })).allowed) return { ok: false, reason: 'notPermitted' };
  let locked = false;
  let base: Case | null = null;
  const r = await updateCaseWithRetry(caseData.id, current => {
    if (isReportLockedForFigures(current.status)) { locked = true; return null; }
    base = current;
    const others = (current.organMapFigures ?? []).filter(f => f.instanceId !== instanceId);
    return { organMapFigures: figure ? [...others, figure] : others };
  }, deps);
  if (locked) return { ok: false, reason: 'locked' };
  if (r.ok === false || !base) return { ok: false, reason: 'notSaved' };
  const ref = (caseData as { accession?: { fullAccession?: string } }).accession?.fullAccession ?? caseData.id;
  await deps.logAudit({
    type: 'user',
    event: figure ? 'Organ map inserted into report' : 'Organ map removed from report',
    detail: figure ? `${figure.mapType} map for synoptic ${instanceId} (fingerprint ${figure.fingerprint.slice(0, 12)})` : `Map for synoptic ${instanceId} removed`,
    user: user.name, caseId: ref, confidence: null,
  });
  return { ok: true, caseData: { ...(base as Case), ...r.updates, version: r.version } as Case };
}

export function insertOrganMapFigure(
  input: { caseData: Case; instanceId: string; mapType: OrganMapType; svg: string; pngDataUrl?: string; fingerprint: string; user: { id: string; name: string } },
  deps: OrganMapFigureDeps,
): Promise<OrganMapFigureResult> {
  // Batch 463: a map that is part of the report is drawn into it automatically, never inserted.
  if (isAutoReportMap(input.mapType)) return Promise.resolve({ ok: false, reason: 'notSaved' });
  const figure: OrganMapFigure = {
    id: `omf-${deps.newId()}`, instanceId: input.instanceId, mapType: input.mapType, svg: input.svg,
    ...(input.pngDataUrl ? { pngDataUrl: input.pngDataUrl } : {}),
    fingerprint: input.fingerprint, insertedAt: deps.now().toISOString(), insertedBy: input.user.id, insertedByName: input.user.name,
  };
  return changeFigures(input.caseData, input.instanceId, figure, input.user, deps);
}

export function removeOrganMapFigure(input: { caseData: Case; instanceId: string; user: { id: string; name: string } }, deps: OrganMapFigureDeps): Promise<OrganMapFigureResult> {
  return changeFigures(input.caseData, input.instanceId, null, input.user, deps);
}

/** The message key for what an insert or remove did (organMap.panel.toast.*). */
export function organMapFigureOutcomeKey(result: OrganMapFigureResult, action: 'insert' | 'remove'): string {
  if (result.ok) return `organMap.panel.toast.${action === 'insert' ? 'inserted' : 'removed'}`;
  return `organMap.panel.toast.${(result as { reason: string }).reason}`;
}

export interface OrganMapReportFigure {
  instanceId: string;
  mapType: OrganMapType;
  /** The PNG without its data-URL prefix (the PDF renderer embeds it). */
  pngBase64?: string;
  svg: string;
  /** The drawing's size, so the renderer keeps its proportions. */
  width: number;
  height: number;
  /** Batch 463: a map that is part of the report (Mohs): with no usable image the
   *  renderer prints a notice in its place, never a silent gap … */
  notice?: boolean;
  /** … followed by these lines, what the map shows as text (the stage lines). */
  fallbackLines?: string[];
}

/** The figures for the report PDF payload (`reportFigures`), in the order of
 *  the case's synoptics. */
export function organMapReportFigures(caseData: Pick<Case, 'organMapFigures' | 'synopticReports'> | null | undefined): OrganMapReportFigure[] {
  const order = (caseData?.synopticReports ?? []).map(r => r.instanceId);
  const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  return [...(caseData?.organMapFigures ?? [])]
    .sort((a, b) => rank(a.instanceId) - rank(b.instanceId))
    .map(f => {
      const size = (attr: string) => Number(new RegExp(`<svg[^>]*\\s${attr}="([\\d.]+)"`).exec(f.svg)?.[1]) || 0;
      const png = f.pngDataUrl?.startsWith('data:image/png;base64,') ? f.pngDataUrl.slice('data:image/png;base64,'.length) : undefined;
      return { instanceId: f.instanceId, mapType: f.mapType, svg: f.svg, ...(png ? { pngBase64: png } : {}), width: size('width'), height: size('height') };
    });
}
