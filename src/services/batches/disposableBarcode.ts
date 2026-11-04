// src/services/batches/disposableBarcode.ts
// Batch 726: moved out of mockBatchService.ts unchanged (CLAUDE.md rule 10, the file-size rule), so the
// carrier work could be added there without the file passing 1,000 lines.
import { storageGet } from '../mockStorage';
import { CONTAINER_TYPE_CODE } from '../hardwareContainers/IHardwareContainerRegistryService';
import type { ContainerType } from '../hardwareContainers/IHardwareContainerRegistryService';
import { DEFAULT_PRINT_SETTINGS_CONFIG } from '../printSettings/IPrintSettingsService';
import type { PrintSettingsConfig } from '../printSettings/IPrintSettingsService';

/**
 * Real, printable Master Batch Barcode — the spec's own FR-1.2 worked
 * example: "CONT-STAIN-YYYYMMDD-XXXX" for a disposable (Mode A) label.
 *
 * Real fix, per direct follow-up: "I assumed we are using a Guid to
 * safely identify the container." Confirmed directly, honestly: the
 * earlier version here used Math.random() over only a 4-digit range
 * (1000-9999) scoped per (containerType, day) — with no check against
 * already-issued barcodes at all. For a busy lab printing many labels
 * of the same container type in one day, that's a real, meaningful
 * collision risk (birthday-paradox math: ~13% chance of a collision
 * at just 50 same-day, same-type labels), not a safely-unique
 * identifier — exactly the kind of silent gap this whole chain-of-
 * custody system exists to prevent.
 *
 * A real, full GUID (36 chars) is impractical on a small, physical
 * container label and painful to hand-key if a scanner fails, and
 * doesn't match the spec's own worked example format at all — so this
 * keeps the short, human-readable, printable shape, but now
 * GUARANTEES uniqueness rather than merely hoping the random space is
 * big enough: crypto.getRandomValues (a real CSPRNG, not Math.random's
 * weaker PRNG) over a 6-digit space (900,000 values — a real,
 * substantial improvement over 9,000), AND an explicit, real
 * check-and-retry against every already-issued barcode (existingBarcodes)
 * before accepting one. Throws (a real, loud failure) rather than
 * silently returning a colliding code in the astronomically unlikely
 * case all real retries are exhausted — a caller must never silently
 * issue a duplicate physical label.
 */
/** Real, direct storage read — this service function isn't a React
 *  component, so it can't call the printSettingsService's own
 *  get()/React-context path; same real, shared mockStorage.ts key
 *  ('printSettings') mockPrintSettingsService.ts itself reads from,
 *  read directly here rather than duplicated or guessed at. */
function getCurrentPrintSettings(): PrintSettingsConfig {
  return storageGet<PrintSettingsConfig>('printSettings', DEFAULT_PRINT_SETTINGS_CONFIG);
}

export function generateDisposableBarcode(containerType: ContainerType | undefined, existingBarcodes: Set<string>): string {
  const settings = getCurrentPrintSettings();
  const code = settings.containerTypeCodes[containerType ?? 'Ad-Hoc Batch'] ?? CONTAINER_TYPE_CODE[containerType ?? 'Ad-Hoc Batch'];
  const prefix = settings.disposableBarcodePrefix || 'CONT';
  const now = new Date();
  // eslint-disable-next-line no-restricted-properties -- the date in a new container barcode is the bench's own date (an identifier, not a stored event's date)
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const MAX_ATTEMPTS = 50;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const suffix = 100000 + (randomArray[0] % 900000); // real, 6-digit space — 100000-999999
    const candidate = `${prefix}-${code}-${yyyymmdd}-${suffix}`;
    if (!existingBarcodes.has(candidate.toUpperCase())) return candidate;
  }
  // Real, loud failure — see this function's own header for why a
  // silent duplicate is never acceptable here.
  throw new Error(`Could not generate a unique container barcode after ${MAX_ATTEMPTS} attempts — this should be astronomically unlikely; check the random source.`);
}
