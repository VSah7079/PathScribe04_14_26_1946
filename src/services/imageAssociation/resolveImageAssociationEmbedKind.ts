// src/services/imageAssociation/resolveImageAssociationEmbedKind.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per spec §3.1 (raster image embedding) vs §3.2 (PDF page
// merging) — genuinely different embedding techniques, so this
// association needs to know which one applies. Real signal: the file
// extension on the real, resolved image_url — the one fact actually
// available about a real, external asset without fetching it first.
// ─────────────────────────────────────────────────────────────────────────────

export type ImageAssociationEmbedKind = 'raster_image' | 'pdf_page';

// Batch 742: a file attached through the storage adapter is read through a fresh read link with no extension, so its
// recorded type decides when it is given.
export function resolveImageAssociationEmbedKind(imageUrl: string, mimeType?: string): ImageAssociationEmbedKind {
  if (mimeType) return mimeType === 'application/pdf' ? 'pdf_page' : 'raster_image';
  const path = imageUrl.split('?')[0].split('#')[0].toLowerCase();
  return path.endsWith('.pdf') ? 'pdf_page' : 'raster_image';
}
