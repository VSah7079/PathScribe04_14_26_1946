// src/utils/barcodeFormatMapping.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real mapping between this app's own BarcodeType union
// (types/systemConfig.ts — already used by the admin-configurable
// IdentifierFormat system for MRN/accession/requisition/slide detection)
// and @zxing/library's real BarcodeFormat enum, confirmed directly
// against the installed package's own type declarations
// (node_modules/@zxing/library/esm/core/BarcodeFormat.d.ts) rather than
// assumed from memory.
//
// Kept as its own small, pure module specifically so the mapping itself
// is directly testable without needing a real camera or a mocked
// BrowserMultiFormatReader — the same "extract the tricky, pure logic
// into its own testable function" pattern used throughout this app
// tonight (applyCasePagination, mergeDualSourcePages, the fuzzy-match
// sort fixes in mockIntraoperativeService.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { BarcodeFormat } from '@zxing/library';
import type { BarcodeType } from '@/types/systemConfig';

/**
 * Every BarcodeType this app already anticipates (see IdentifierFormat's
 * own barcodeTypes field), mapped to its real ZXing enum value. All five
 * are genuinely supported by ZXing's BrowserMultiFormatReader — this
 * isn't a partial/best-effort mapping.
 */
export const BARCODE_TYPE_TO_ZXING_FORMAT: Record<BarcodeType, BarcodeFormat> = {
  '1d_code128':    BarcodeFormat.CODE_128,
  '1d_code39':     BarcodeFormat.CODE_39,
  '2d_datamatrix': BarcodeFormat.DATA_MATRIX,
  '2d_qr':         BarcodeFormat.QR_CODE,
  '2d_pdf417':     BarcodeFormat.PDF_417,
};

/** Every real ZXing format this app's scanner should attempt to decode —
 *  restricted to exactly the five this codebase already models, not
 *  ZXing's full, broader format list (which also includes EAN-13/UPC-A/
 *  Aztec/MaxiCode/etc.) A scanner that also tried to decode a product
 *  barcode incidentally visible in the camera's frame would be a real,
 *  if minor, correctness risk in a clinical tool — narrowing to the
 *  formats this app actually expects avoids that. */
export function getSupportedZxingFormats(): BarcodeFormat[] {
  return Object.values(BARCODE_TYPE_TO_ZXING_FORMAT);
}

const ZXING_FORMAT_TO_BARCODE_TYPE: Partial<Record<BarcodeFormat, BarcodeType>> =
  Object.fromEntries(
    Object.entries(BARCODE_TYPE_TO_ZXING_FORMAT).map(([k, v]) => [v, k as BarcodeType])
  );

/** Real reverse lookup — given a ZXing decode result's own format, which
 *  of this app's BarcodeType values does it correspond to. Returns
 *  undefined for a real ZXing format this app doesn't model (shouldn't
 *  happen given getSupportedZxingFormats() restricts what's scanned for
 *  in the first place, but a defensive, honest possibility worth typing
 *  rather than asserting away). */
export function zxingFormatToBarcodeType(format: BarcodeFormat): BarcodeType | undefined {
  return ZXING_FORMAT_TO_BARCODE_TYPE[format];
}
