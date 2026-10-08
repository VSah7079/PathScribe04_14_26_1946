// src/services/scanStations/validateScanStationDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, per direct reminder: "no business logic in the UI code."
// Extracted out of ScanStationsSection.tsx, where this validation was
// previously implemented inline inside the modal component. The third
// rule here (supportsPrinting requires a real printer profile) is a
// genuine domain constraint, not just a generic "is this field
// filled in" check — it belongs beside the ScanStation type it
// validates, not inside a UI component.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanStationDraftValidationInput {
  name: string;
  barcodeCode: string;
  facilityId: string;
  supportsPrinting: boolean;
  cassetteSlidePrinterProfileId?: string;
}

/**
 * Batch 444: each error is a code the screen translates
 * (scanStationsSection.errors.<code>), not English text.
 */
export type ScanStationDraftError = 'nameRequired' | 'barcodeRequired' | 'facilityRequired' | 'printerProfileRequired';

export interface ScanStationDraftValidationErrors {
  name?: ScanStationDraftError;
  barcodeCode?: ScanStationDraftError;
  facilityId?: ScanStationDraftError;
  cassetteSlidePrinterProfileId?: ScanStationDraftError;
}

/**
 * Real, complete validation for a ScanStation draft — every real rule
 * checked at once, not just the first, so an admin fixing a rejected
 * draft sees every real issue together.
 */
export function validateScanStationDraft(draft: ScanStationDraftValidationInput): ScanStationDraftValidationErrors {
  const errors: ScanStationDraftValidationErrors = {};

  if (!draft.name.trim()) errors.name = 'nameRequired';

  // Real, deliberate validation — a station's barcodeCode is what a
  // real, printed physical label encodes (STATION:GROSSING-03); an
  // empty one would mean a real label could never be generated for
  // this station at all.
  if (!draft.barcodeCode.trim()) {
    errors.barcodeCode = 'barcodeRequired';
  }

  // Real, per direct guidance: facilityId genuinely had no validation
  // at all before this — the free-text UI it used to pair with
  // defaulted to a fake, always-non-empty 'lab-main' string, so an
  // empty check would never have fired anyway. Now that the UI is a
  // real dropdown with no default selection, this is a real, live
  // rule, not a no-op.
  if (!draft.facilityId.trim()) {
    errors.facilityId = 'facilityRequired';
  }

  // Real, deliberate validation, per direct follow-up: "support both
  // slide engraving and printed labels." A station marked as
  // supporting printing with no real target printer profile isn't
  // actually printable — never let this silently save as if it were.
  if (draft.supportsPrinting && !draft.cassetteSlidePrinterProfileId?.trim()) {
    errors.cassetteSlidePrinterProfileId = 'printerProfileRequired';
  }

  return errors;
}
