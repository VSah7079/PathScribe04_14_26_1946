// src/services/imageAssociation/reportSectionImages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, Oct 30, 2026: images print inside their report section, "right under the Gross Description or
// specific diagnostic blocks", not appended at the end): the `sectionImages` the report page sends to the renderer.
//
// For each placement with a section, in the order placed:
//   • an image: fetched (a fresh read link for a file in the hospital's storage), its bytes and pixel size sent as
//     base64, so the renderer draws it under the section (functions/main.py, section_image_flows);
//   • one that can't be fetched: `unavailable`, so the renderer prints the Image Unavailable notice there instead of
//     leaving a gap;
//   • a PDF document: `document`, so the section names it; its pages follow the report (caseReportImages.ts).
// The bytes go into the PDF, which is the stored record (as for the letterhead logo). Nothing is kept here.
// With the API server, the server makes this fetch (its allowed hosts, no private addresses), which is server work.
// ─────────────────────────────────────────────────────────────────────────────

import { listCaseReportImages, type CaseReportImage, type ReportImageRef } from './caseReportImages';
import { placementFetchUrl } from './placementLinks';
import { readImageSize } from './readImageSize';

export interface SectionImagePayload {
  id: string;
  sectionId: string;
  sectionLabel: string;
  caption: string;
  kind: 'image' | 'document' | 'unavailable';
  imageBase64?: string;
  format?: 'png' | 'jpeg';
  widthPx?: number;
  heightPx?: number;
}

export interface SectionImageDeps {
  fetchUrl?: (image: CaseReportImage) => Promise<string | null>;
  fetchBytes?: (url: string) => Promise<Uint8Array | null>;
}

const defaultFetchBytes = async (url: string): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
};

/** Base64 of the bytes, in chunks so a large photo doesn't overflow the call stack. Pure. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** The images and documents placed in report sections, ready for the renderer. Never throws. */
export async function reportSectionImagesFor(ref: ReportImageRef, deps: SectionImageDeps = {}): Promise<SectionImagePayload[]> {
  const placed = listCaseReportImages(ref).filter(i => !!i.sectionId);
  const fetchUrl = deps.fetchUrl ?? placementFetchUrl;
  const fetchBytes = deps.fetchBytes ?? defaultFetchBytes;
  return Promise.all(placed.map(async (i): Promise<SectionImagePayload> => {
    const base = { id: i.id, sectionId: i.sectionId!, sectionLabel: i.sectionLabel ?? '', caption: i.caption };
    if (i.mimeType === 'application/pdf') return { ...base, kind: 'document' };
    try {
      const url = await fetchUrl(i);
      const bytes = url ? await fetchBytes(url) : null;
      const size = bytes ? readImageSize(bytes) : null;
      if (!bytes || !size) return { ...base, kind: 'unavailable' };
      return { ...base, kind: 'image', imageBase64: bytesToBase64(bytes), format: size.format, widthPx: size.width, heightPx: size.height };
    } catch {
      return { ...base, kind: 'unavailable' };
    }
  }));
}
