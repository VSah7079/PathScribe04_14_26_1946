// src/services/caseAttachments/attachmentCatalog.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, Release 1 §2B): what the Attachments window lists, in four groups, and the count on the case's
// badge ("Attachments (n)", or "Add Attachments" at none). Pure.
//
//   gross     the photos already on the case: each specimen's gross photos and each block's block-face photos;
//   intraop   the intraoperative and consultation photos carried onto the case (Case.intraoperativeFindings);
//   slide     regions saved from the slide viewer's "Add to report" (the viewer is not built yet, so always empty);
//   external  the files attached through the storage adapter and the links typed in (caseAttachments.ts).
//
// The photos are read where they are; nothing is copied. A row says whether it is already in the report and where.
// ─────────────────────────────────────────────────────────────────────────────

import type { AttachmentPointer, CaseAttachment } from '@/types/caseAttachments/CaseAttachment';
import type { DigitalAsset } from '@/types/case/Material';
import type { CaseReportImage, PlacementItem, ReportImageOrigin } from '../imageAssociation/caseReportImages';

export const ATTACHMENT_GROUPS = ['gross', 'intraop', 'slide', 'external'] as const;
export type AttachmentGroup = (typeof ATTACHMENT_GROUPS)[number];

export type AttachmentRowKind = 'grossPhoto' | 'blockFacePhoto' | 'intraopPhoto' | 'uploadedFile' | 'link';

export interface AttachmentRow {
  key: string;
  group: AttachmentGroup;
  kind: AttachmentRowKind;
  origin: ReportImageOrigin;
  /** The specimen or block it belongs to (A, A1), or the intraop specimen's label. */
  ownerLabel?: string;
  /** An uploaded file's name (often names the patient: shown inside data-phi). */
  fileName?: string;
  /** A link's host, or the storage it went to. */
  sourceSystemId: string;
  mimeType: string;
  /** The link to show or fetch it from; empty for a file in the hospital's storage (opened through a read link). */
  imageUrl: string;
  pointer?: AttachmentPointer;
  attachmentId?: string;
  at: string;
  by?: string;
  /** The report image type it is placed as. */
  imageType: string;
  /** Where it is in the report, if it is. */
  placement?: { imageId: string; sectionLabel?: string; caption: string };
}

interface CaseLike {
  specimens?: { id: string; label?: string; digitalAssets?: DigitalAsset[]; blocks?: { id: string; label?: string; digitalAssets?: DigitalAsset[] }[] }[];
  intraoperativeFindings?: { intraopSpecimenId: string; specimenLabel: string; photos?: DigitalAsset[] }[];
}

const placementOf = (origin: ReportImageOrigin, placements: readonly CaseReportImage[]) => {
  const p = placements.find(i => i.origin?.kind === origin.kind && (origin.kind === 'attachment'
    ? (i.origin as { attachmentId: string }).attachmentId === origin.attachmentId
    : (i.origin as { assetId: string }).assetId === origin.assetId));
  return p ? { imageId: p.id, ...(p.sectionLabel ? { sectionLabel: p.sectionLabel } : {}), caption: p.caption } : undefined;
};

const assetRow = (a: DigitalAsset, group: AttachmentGroup, kind: AttachmentRowKind, ownerLabel: string | undefined, imageType: string, placements: readonly CaseReportImage[]): AttachmentRow | null => {
  if (!a.url) return null; // a capture whose upload never returned a link
  const origin: ReportImageOrigin = { kind: 'caseAsset', assetId: a.id };
  let host = '';
  try { host = new URL(a.url, 'https://local.invalid').hostname; } catch { /* a relative link */ }
  return {
    key: `asset:${a.id}`, group, kind, origin, ...(ownerLabel ? { ownerLabel } : {}),
    sourceSystemId: host === 'local.invalid' ? '' : host, mimeType: /\.png($|\?)/i.test(a.url) ? 'image/png' : 'image/jpeg',
    imageUrl: a.url, at: a.capturedAt, ...(a.capturedBy ? { by: a.capturedBy } : {}), imageType, placement: placementOf(origin, placements),
  };
};

/** A block's name as the lab says it: the specimen's label and the block's (A2), unless the block label already has it. Pure. */
const blockName = (specimen?: string, block?: string) => (!block ? specimen : !specimen || block.startsWith(specimen) ? block : `${specimen}${block}`);

/** Every row of the window, in group order and, within a group, in the case's own order. Pure. */
export function buildAttachmentRows(caseData: CaseLike | null | undefined, attachments: readonly CaseAttachment[], placements: readonly CaseReportImage[]): AttachmentRow[] {
  const rows: AttachmentRow[] = [];
  for (const sp of caseData?.specimens ?? []) {
    for (const a of sp.digitalAssets ?? []) {
      if (a.kind !== 'gross_photo') continue;
      const row = assetRow(a, 'gross', 'grossPhoto', sp.label, 'Gross Specimen', placements);
      if (row) rows.push(row);
    }
    for (const b of sp.blocks ?? []) {
      for (const a of b.digitalAssets ?? []) {
        if (a.kind !== 'block_face_photo') continue;
        const row = assetRow(a, 'gross', 'blockFacePhoto', blockName(sp.label, b.label), 'Block Face', placements);
        if (row) rows.push(row);
      }
    }
  }
  for (const f of caseData?.intraoperativeFindings ?? []) {
    for (const a of f.photos ?? []) {
      const row = assetRow(a, 'intraop', 'intraopPhoto', f.specimenLabel, 'Gross Specimen', placements);
      if (row) rows.push(row);
    }
  }
  for (const att of attachments) {
    const origin: ReportImageOrigin = { kind: 'attachment', attachmentId: att.id };
    rows.push({
      key: `att:${att.id}`, group: 'external', kind: att.origin === 'upload' ? 'uploadedFile' : 'link', origin,
      ...(att.fileName ? { fileName: att.fileName } : {}), sourceSystemId: att.sourceSystemId, mimeType: att.mimeType,
      imageUrl: att.pointer.kind === 'url' ? att.pointer.url : '', pointer: att.pointer, attachmentId: att.id,
      at: att.createdAt, by: att.createdBy, imageType: 'Other', placement: placementOf(origin, placements),
    });
  }
  return rows;
}

/** The badge's number: everything the window lists. Pure. */
export const attachmentCount = (rows: readonly AttachmentRow[]) => rows.length;

/** The rows of one group. Pure. */
export const rowsInGroup = (rows: readonly AttachmentRow[], group: AttachmentGroup) => rows.filter(r => r.group === group);

/** The placement a ticked row makes, with the caption typed for it. Pure. */
export function placementItemFor(row: AttachmentRow, caption: string): PlacementItem {
  return {
    origin: row.origin, imageUrl: row.imageUrl, imageType: row.imageType, sourceSystemId: row.sourceSystemId,
    mimeType: row.mimeType, ...(caption.trim() ? { caption: caption.trim() } : {}),
  };
}

/** True when the row is a document (its pages follow the report), not an image drawn in the section. Pure. */
export const isDocumentRow = (row: Pick<AttachmentRow, 'mimeType'>) => row.mimeType === 'application/pdf';

// ── Where to place ───────────────────────────────────────────────────────────

/** The place at the end of the report's text (before the confidentiality line), for a report with no matching section. */
export const REPORT_END_SECTION_ID = 'report-end';

export interface PlacementSection { id: string; label: string }

/**
 * The sections the window offers: the report layout's narrative sections, then the end of the report's text. A report
 * whose renderer can't draw inside its sections (the cytology report) offers none: its images follow the report on
 * their own pages, as before. Pure.
 */
export function placementSections(layoutSections: readonly { id: string; label: string; type?: string }[], inlineSupported: boolean, reportEndLabel: string): PlacementSection[] {
  if (!inlineSupported) return [];
  return [...layoutSections.filter(s => s.type !== 'synoptic' && s.label.trim()).map(s => ({ id: s.id, label: s.label })), { id: REPORT_END_SECTION_ID, label: reportEndLabel }];
}

/** The section pre-selected: the one the pathologist is working in, else the last one used, else the first. Pure. */
export function defaultPlacementSection(options: readonly PlacementSection[], activeSectionId: string | null | undefined, remembered: string | null | undefined): string | null {
  if (!options.length) return null;
  if (activeSectionId && options.some(o => o.id === activeSectionId)) return activeSectionId;
  if (remembered && options.some(o => o.id === remembered)) return remembered;
  return options[0].id;
}

// ── The in-app report preview (it shows what the PDF prints) ─────────────────

/** Every section node id in a report layout's parts, however deep. Pure. */
export function layoutSectionIds(parts: readonly { nodes?: readonly unknown[] }[] | undefined): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: readonly unknown[] | undefined) => {
    for (const n of nodes ?? []) {
      const node = n as { type?: string; id?: string; children?: unknown[]; elseChildren?: unknown[]; defaultChildren?: unknown[]; cases?: { children?: unknown[] }[] };
      if (node.type === 'section' && node.id) ids.add(node.id);
      walk(node.children); walk(node.elseChildren); walk(node.defaultChildren);
      for (const c of node.cases ?? []) walk(c.children);
    }
  };
  for (const p of parts ?? []) walk(p.nodes);
  return ids;
}

/** The placements printed under one section. Pure. */
export const placementsInSection = (placements: readonly CaseReportImage[], sectionId: string) => placements.filter(p => p.sectionId === sectionId);

/** The placements printed at the end of the report text: placed there, or under a section the layout doesn't have. Pure. */
export const placementsAtReportEnd = (placements: readonly CaseReportImage[], sectionIds: ReadonlySet<string>) =>
  placements.filter(p => !!p.sectionId && !sectionIds.has(p.sectionId));

/** The report layout's sections, with the heading each prints under (the ids the renderer places images by). Pure. */
export function reportLayoutSections(parts: readonly { nodes?: readonly unknown[] }[] | undefined): { id: string; label: string; type?: string }[] {
  const out: { id: string; label: string }[] = [];
  const walk = (nodes: readonly unknown[] | undefined) => {
    for (const n of nodes ?? []) {
      const node = n as { type?: string; id?: string; label?: string; printHeading?: string; children?: unknown[]; elseChildren?: unknown[]; defaultChildren?: unknown[]; cases?: { children?: unknown[] }[] };
      const label = (node.printHeading ?? node.label ?? '').trim();
      if (node.type === 'section' && node.id && label && !out.some(o => o.id === node.id)) out.push({ id: node.id, label });
      walk(node.children); walk(node.elseChildren); walk(node.defaultChildren);
      for (const c of node.cases ?? []) walk(c.children);
    }
  };
  for (const p of parts ?? []) walk(p.nodes);
  return out;
}
