// src/services/organMapping/organMapTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the organ-mapping engine's shared types (Prostate first; Breast,
// Mohs, Colorectal, Head & Neck and Renal follow, one batch each).
//
// The map is a picture of the synoptic answers (Pete, Oct 4–5): every
// decision — which sectors have tumour, their Grade Group, EPE, a positive
// margin, and which of the site's colours and patterns each one gets — is
// made here, in services (later the ASP.NET API; docs/architecture/
// ORGAN_MAPPING_API.md). The drawing only paints this payload.
//
// Batch 462 adds Breast: a clock face with quadrants (invasive carcinoma,
// DCIS, calcifications, with each focus marked at its clock position and
// distance from the nipple) and the six oriented margins (clear, close,
// positive; invasive and DCIS separately).
// ─────────────────────────────────────────────────────────────────────────────

export type OrganMapType = 'prostateSectors' | 'prostateBiopsy' | 'breastClock' | 'mohsStages' | 'colorectalPolyp' | 'rectalResection' | 'oralCavity' | 'neckDissection' | 'renalResection';
export const ORGAN_MAP_TYPES: readonly OrganMapType[] = ['prostateSectors', 'prostateBiopsy', 'breastClock', 'mohsStages', 'colorectalPolyp', 'rectalResection', 'oralCavity', 'neckDissection', 'renalResection'];
/** Batch 463 (Pete: "Always, for Mohs"): maps that are part of the report —
 *  drawn into it automatically (preview, print, sign-out), always current,
 *  no Insert button. The others are the pathologist's optional snapshot. */
export const ORGAN_MAP_AUTO_REPORT: readonly OrganMapType[] = ['mohsStages'];
export const isAutoReportMap = (t: OrganMapType) => ORGAN_MAP_AUTO_REPORT.includes(t);

/** What a sector shows (its fill). 'tumour' = carcinoma with no Grade Group answered yet.
 *  Batch 462 (breast): invasive carcinoma, DCIS, calcifications; and a margin's
 *  status (clear, close, positive). */
export type MapCategory = 'benign' | 'tumour' | 'gg1' | 'gg2' | 'ggHigh' | 'notSampled'
  | 'invasive' | 'dcis' | 'calcifications' | 'marginClear' | 'marginClose' | 'marginPositive'
  /** Batch 463: a Mohs sector with tumour at its margin. */
  | 'residualTumour'
  /** Batch 464: a polyp's adenomatous (precursor) lesion. */
  | 'adenoma';
/** What is drawn over a sector (a second mark, never colour alone). Batch 464: adenoma at a polyp's lateral margin. */
export type MapOverlay = 'epe' | 'positiveMargin' | 'perineural' | 'adenomaAtMargin'
  /** Batch 465: dysplasia at an oral mucosal margin; extranodal extension, minor (≤ 2 mm) and major (> 2 mm). */
  | 'dysplasiaAtMargin' | 'eneMinor' | 'eneMajor';
export type MapStyleKey = MapCategory | MapOverlay;
export type MapPattern = 'solid' | 'hatch' | 'dots' | 'crosshatch' | 'none';

export const MAP_CATEGORIES: readonly MapCategory[] = ['benign', 'tumour', 'gg1', 'gg2', 'ggHigh', 'notSampled', 'invasive', 'dcis', 'calcifications', 'marginClear', 'marginClose', 'marginPositive', 'residualTumour', 'adenoma'];
export const MAP_OVERLAYS: readonly MapOverlay[] = ['epe', 'positiveMargin', 'perineural', 'adenomaAtMargin', 'dysplasiaAtMargin', 'eneMinor', 'eneMajor'];
export const MAP_STYLE_KEYS: readonly MapStyleKey[] = [...MAP_CATEGORIES, ...MAP_OVERLAYS];
export const MAP_PATTERNS: readonly MapPattern[] = ['solid', 'hatch', 'dots', 'crosshatch', 'none'];

export interface MapStyle {
  /** #rrggbb */
  colour: string;
  pattern: MapPattern;
  /** The site's own legend wording; the translated default when absent. */
  label?: string;
}

export type OrganMapScheme = Record<MapStyleKey, MapStyle>;

export interface OrganMapSectorDetails {
  /** Batch 466: a renal tumour zone's aspect ('anterior' | 'posterior' | 'both'). */
  aspect?: string;
  /** The parts (cores) at this site, in label order. */
  parts?: string[];
  gradeGroup?: number;
  gleason?: string;
  percent?: number;
  lengthMm?: number;
  /** Breast: the foci at this clock position (their labels), and a margin's distance. */
  foci?: string[];
  marginMm?: number;
  /** Breast: a focus marker's clock position, size and distance from the nipple. */
  clock?: number | 'central';
  sizeMm?: number;
  distanceCm?: number;
  /** Batch 464: a margin judged involved by the site's rule. */
  involved?: boolean;
  /** Batch 465: a neck level's nodes (positive / examined), its largest deposit (mm) and its worst ENE. */
  nodesPositive?: number;
  nodesExamined?: number;
  largestMm?: number;
  ene?: 'minor' | 'major';
  /** Mohs: the stage, and a positive sector's block and histology. */
  stage?: number;
  block?: string;
  histology?: string;
}

export interface OrganMapSector {
  id: string;
  category: MapCategory;
  pattern: MapPattern;
  overlays: { key: MapOverlay; pattern: MapPattern }[];
  /** The synoptic question this sector comes from (a click jumps there). */
  jumpFieldId?: string;
  details?: OrganMapSectorDetails;
}

/** Breast: a focus drawn at its clock position and distance (not fixed geometry). */
export interface OrganMapMarker {
  id: string;
  category: MapCategory;
  pattern: MapPattern;
  x: number;
  y: number;
  r: number;
  /** Printed in the marker (the focus number). */
  label: string;
  jumpFieldId?: string;
  details?: OrganMapSectorDetails;
}

export interface OrganMapLegendEntry {
  key: MapStyleKey;
  kind: 'category' | 'overlay';
  pattern: MapPattern;
  /** The site's own wording, when it set one. */
  label?: string;
}

export interface OrganMapPayload {
  mapType: OrganMapType;
  templateId: string;
  instanceId: string;
  sectors: OrganMapSector[];
  /** Breast: the foci, drawn over the sectors. */
  markers?: OrganMapMarker[];
  /** Breast: the specimen's side, for the orientation captions ('right' | 'left'; absent when not given). */
  side?: 'right' | 'left';
  /** Mohs: each stage's summary (clear or residual tumour, time, blocks cut). */
  mohsStages?: { number: number; clear: boolean; time?: string; blocks?: number }[];
  /** Batch 464: which drawing of the map type (a polyp's Paris type; where a rectal tumour lies by the peritoneal reflection). */
  variant?: string;
  /** Batch 464: values the captions print (the polyp's Paris type, the TME plane), as their meanings. */
  meta?: Record<string, string>;
  /** Only what the map shows. */
  legend: OrganMapLegendEntry[];
  /** False until a bound question is answered (the panel says so). */
  hasData: boolean;
  /** Changes whenever what the map shows changes ("report image is out of date"). */
  fingerprint: string;
}
