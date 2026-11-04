// src/services/stationScans/wrongCaseScan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.3): at Grossing, a cassette, block or
// slide scanned while one case is open is checked against that case. One that
// belongs to another case is flagged with a clear message and a deliberate
// "Continue anyway" that is audited; "Set it aside" records the flag too. Both
// go on the station scan log as a wrong-item scan. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { NewStationScanEvent } from './IStationScanEventService';

export interface WrongCaseScan {
  /** What was scanned (its full identifier). */
  itemId: string;
  materialType: NewStationScanEvent['materialType'];
  /** The case the item belongs to. */
  itemAccession: string;
  /** The case open at the bench. */
  openAccession: string;
}

const norm = (s: string | undefined) => (s ?? '').trim().toUpperCase();

/** The flag for a scanned item, or null when it belongs to the open case (or did not resolve to case material). */
export function wrongCaseScan(scan: { itemId: string; materialType: NewStationScanEvent['materialType']; itemAccession?: string }, openAccession: string | undefined): WrongCaseScan | null {
  if (!scan.itemAccession || !openAccession) return null;
  if (norm(scan.itemAccession) === norm(openAccession)) return null;
  return { itemId: scan.itemId, materialType: scan.materialType, itemAccession: scan.itemAccession, openAccession };
}

export type WrongCaseChoice = 'continued' | 'setAside';

/** The station scan event for the flag and what the person chose (§7.1). */
export function wrongCaseScanEvent(
  flag: WrongCaseScan, choice: WrongCaseChoice, who: { stationId: string; userId: string; userName: string },
): NewStationScanEvent {
  return {
    stationId: who.stationId, userId: who.userId, userName: who.userName,
    itemId: flag.itemId, materialType: flag.materialType, caseAccession: flag.itemAccession,
    action: 'received', result: 'wrong-item',
    note: `Scanned at grossing while case ${flag.openAccession} was open; ${choice === 'continued' ? 'continued anyway' : 'set aside'}.`,
  };
}

/** The audit entry's text (literal English: a compliance record). */
export function wrongCaseAuditDetail(flag: WrongCaseScan, choice: WrongCaseChoice): string {
  return `${flag.itemId} belongs to case ${flag.itemAccession}, not ${flag.openAccession} (open at grossing). ${choice === 'continued' ? 'Continued anyway.' : 'Set aside.'}`;
}
