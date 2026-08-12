// src/types/case/Material.ts
// ─────────────────────────────────────────────────────────────────────────────
// Only the genuinely new pieces of the material tree — everything else
// already existed in Specimen.ts (HistologyBlock, StainOrder) and is
// extended there directly rather than duplicated here. See this file's
// own history: the first version of this file rebuilt Block and Slide
// from scratch, parallel to HistologyBlock/StainOrder, before that
// duplication was caught and removed.
//
// DigitalAsset — a photo or scan attached to a specimen, block, or stain
// order. A second, parallel relationship to material children, not a
// variant of them: a block can have a block-face photo AND slides
// underneath it, and those are two different kinds of "belongs to this
// block." Deliberately left with nothing populating it anywhere in this
// pass — no upload or scan pipeline exists in the app yet (checked
// directly). The type is real; the data isn't, on purpose.
//
// Decant — HistologyBlock's real, working lifecycle doesn't fit cytology
// material, which was never embedded in wax. A specimen's material sits
// under either blocks (surgical) or decants (cytology), never both.
// ─────────────────────────────────────────────────────────────────────────────

export type DigitalAssetKind = 'gross_photo' | 'block_face_photo' | 'wsi_scan';

export interface DigitalAsset {
  id: string;
  kind: DigitalAssetKind;
  /** Left optional/absent deliberately — see file header. */
  url?: string;
  capturedAt: string;
  capturedBy?: string;
}

export type DecantType = 'residual_fluid' | 'cell_block';

export interface Decant {
  id: string;
  /** e.g. "D1" — decant's own label sequence, parallel to a block's. */
  label: string;
  decantType: DecantType;
  /** Reuses StainOrder from Specimen.ts directly — a decant's slides
   *  need the exact same real lifecycle a block's slides already have,
   *  not a second, competing status enum. */
  stains: import('./Specimen').StainOrder[];
  createdAt: string;
  createdBy?: string;
  digitalAssets?: DigitalAsset[];
}
