// src/services/accessioning/printAccessionLabels.ts
// Batch 720 (Pete, Episode 3 review: "can we print automatically on save, that removes the extra click"):
// labels now print when a case is saved, unless the laboratory turned that off (Configuration > System >
// Print Settings, per facility or for all). The Print Labels button stays for a reprint.
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import { printSettingsService, facilityPrintSettingsService } from '@/services';
import { resolveEffectivePrintSettings } from '../printSettings/IFacilityPrintSettingsService';
import { releaseLabelWindow, reserveLabelWindow } from '@/utils/labels/printLabels';
import { DEFAULT_PRINT_SETTINGS_CONFIG } from '../printSettings/IPrintSettingsService';

/** Whether a case saved for this facility prints its labels at once (on unless switched off). */
export async function printsLabelsOnAccession(facilityId: string | undefined): Promise<boolean> {
  const globalRes = await printSettingsService.get();
  const global = globalRes.ok ? globalRes.data : DEFAULT_PRINT_SETTINGS_CONFIG;
  const overrideRes = facilityId ? await facilityPrintSettingsService.getForFacility(facilityId) : null;
  const effective = resolveEffectivePrintSettings(global, overrideRes && overrideRes.ok ? overrideRes.data : null);
  return effective.printLabelsOnAccession !== false;
}

/**
 * One requisition label, then one container label for each specimen. Two physical label sizes in one browser
 * print job would need two page sizes, so they print as two jobs.
 */
export async function printAccessionLabels(caseData: Case, specimens: Specimen[]): Promise<void> {
  reserveLabelWindow(); // still inside the click when the button calls this: the browser sees a user-opened window
  const { printRequisitionLabel, printAllContainerLabels } = await import('@/utils/labels/printRequisitionAndContainerLabels');
  try {
    await printRequisitionLabel(caseData);
    await printAllContainerLabels(caseData, specimens);
  } finally { releaseLabelWindow(); }
}

// ── Save flow (Pete, Oct 28: open the print window from the click, before the save finishes) ──
// Submit calls armAccessionLabelWindow() straight from the click; a successful save calls handOffAccessionLabels(),
// which prints into that window; any other end calls closeUnusedAccessionLabelWindow(), which closes it.
let autoPrintKnown = true; // last answer from Print Settings; labels print on save unless the lab turned that off
let handedOff = false;

export function armAccessionLabelWindow(): void {
  handedOff = false;
  if (autoPrintKnown) reserveLabelWindow();
}

export async function handOffAccessionLabels(caseData: Case, specimens: Specimen[]): Promise<void> {
  handedOff = true;
  try {
    autoPrintKnown = await printsLabelsOnAccession(caseData.order?.facilityId);
    if (autoPrintKnown) await printAccessionLabels(caseData, specimens); else releaseLabelWindow(true);
  } catch (e) { releaseLabelWindow(true); console.error(e); }
}

export function closeUnusedAccessionLabelWindow(): void {
  if (!handedOff) releaseLabelWindow(true);
}
