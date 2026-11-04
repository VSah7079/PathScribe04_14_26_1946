// src/services/organMapping/organMapDelivery.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751 (Pete, Oct 31, 2026, Lab Workflow spec section 12.3): on an Assist case the laboratory system writes the
// report, so PathScribe never places the organ map in it (section 12.2). A site may have the map delivered to its
// laboratory system instead, as a per-site setting that is off by default:
//   • Off: nothing is sent.
//   • Text only: the map's content as plain lines, sent with the synoptic data (for example "Right base, lateral:
//     Grade Group 2"; a Mohs map sends its stage lines, the same lines its report notice prints).
//   • Text and image file: the lines, and the map drawn as a PNG or PDF at finalising, from the final answers (so it
//     is never out of date), delivered through the interface engine to the site's destination (a folder, an SFTP
//     address or a channel, never written in code). The result message names the file.
// The setting belongs to the lab performing the case (its laboratory system, like "one combined PDF per case"), is
// changed with config:organ-map-delivery:manage, and is audited. File names carry the accession, the map type and
// the time, never a patient name. The figure is marked as generated from the synoptic answers, not a patient image.
// A delivery that fails never holds up finalising and shows the pathologist nothing; the administrator sees it in the
// outbound queue, with retry. The drawing is passed in (it needs a browser canvas), so all of this is testable.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { sha256Hex } from '../registrySubmission/sha256';
import { partGridRowsOf } from '../templates/partGrid';
import { mohsReportWords, mohsStagesDisplay } from '../templates/mohsStages';
import { loadOrganMapContext } from './organMapLive';
import { resolveOrganMap } from './resolveProstateMap';
import { renderOrganMapSvg } from './organMapDrawing';
import { organMapLabelsFor, organMapSectorSummary, type Translate } from './organMapLabels';
import type { MapCategory, OrganMapPayload, OrganMapScheme, OrganMapType } from './organMapTypes';
import { organMapFileName, type OrganMapDeliverySettings, type OrganMapFileFormat } from './organMapDeliveryRules';

export * from './organMapDeliveryRules';

/** Areas that show nothing to report (left out of the text lines). */
const QUIET: ReadonlySet<MapCategory> = new Set(['benign', 'notSampled', 'marginClear']);

/** The map's content as plain lines: one line per area with a finding (a Mohs map: its stage lines). */
export function organMapTextLines(payload: OrganMapPayload, scheme: OrganMapScheme, t: Translate, mohsLines?: string[]): string[] {
  if (payload.mapType === 'mohsStages') return mohsLines ?? [];
  const lines = payload.sectors
    .filter(s => !QUIET.has(s.category) || s.overlays.length > 0)
    .map(s => organMapSectorSummary(t, payload.mapType, s, scheme, payload.side));
  return lines.length ? lines : [t('organMap.delivery.nothingShown')];
}

export interface DrawnOrganMapFile {
  fileName: string;
  contentType: 'image/png' | 'application/pdf';
  base64: string;
  sha256: string;
}

export interface OrganMapForDelivery {
  mapType: OrganMapType;
  /** The map's fingerprint (kept in the sent record). */
  fingerprint: string;
  lines: string[];
  /** Present when a file was asked for and could be drawn. */
  file?: DrawnOrganMapFile;
  /** A file was asked for and couldn't be drawn (no canvas here, or the drawing failed). */
  fileProblem?: string;
}

export interface OrganMapDeliveryDeps {
  /** The translation in the report's language (the lines and the words on the drawing). */
  t: Translate;
  /** Draws the SVG as a file of the format (browser canvas); undefined when it can't. */
  drawFile: (svg: string, format: OrganMapFileFormat) => Promise<{ base64: string } | undefined>;
}

type CaseLike = Pick<Case, 'specimens' | 'order'> & { accession?: { fullAccession?: string }; id: string };
type InstanceLike = { instanceId: string; templateId: string; answers?: Record<string, unknown> };

/** What to send for one finalized workup, or null when its template has no map or the map has nothing to show. */
export async function organMapForDelivery(
  caseData: CaseLike, instance: InstanceLike, settings: OrganMapDeliverySettings, at: string, deps: OrganMapDeliveryDeps,
): Promise<OrganMapForDelivery | null> {
  if (settings.mode === 'off') return null;
  const context = await loadOrganMapContext({ templateId: instance.templateId, facilityId: caseData.order?.facilityId ?? null }).catch(() => null);
  if (!context?.binding) return null;
  const answers = (instance.answers ?? {}) as Record<string, string | string[]>;
  const payload = resolveOrganMap({
    binding: context.binding, answers, scheme: context.scheme.scheme, thresholds: context.scheme.thresholds,
    templateId: instance.templateId, instanceId: instance.instanceId, rows: partGridRowsOf(caseData.specimens),
  });
  if (!payload.hasData) return null;
  const mohsLines = context.binding.mapType === 'mohsStages'
    ? mohsStagesDisplay(context.binding.stagesFieldId, answers, mohsReportWords(deps.t)).split('\n').filter(Boolean)
    : undefined;
  const out: OrganMapForDelivery = { mapType: payload.mapType, fingerprint: payload.fingerprint, lines: organMapTextLines(payload, context.scheme.scheme, deps.t, mohsLines) };
  if (settings.mode !== 'textAndFile') return out;
  const svg = renderOrganMapSvg(payload, context.scheme.scheme, organMapLabelsFor(deps.t, payload, context.scheme.scheme));
  const drawn = await deps.drawFile(svg, settings.fileFormat).catch(() => undefined);
  if (!drawn) return { ...out, fileProblem: 'The organ map could not be drawn as a file here; retry from the outbound queue.' };
  const accession = caseData.accession?.fullAccession ?? caseData.id;
  return {
    ...out,
    file: {
      fileName: organMapFileName(accession, payload.mapType, at, settings.fileFormat),
      contentType: settings.fileFormat === 'pdf' ? 'application/pdf' : 'image/png',
      base64: drawn.base64, sha256: sha256Hex(drawn.base64),
    },
  };
}

