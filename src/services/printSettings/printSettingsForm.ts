// src/services/printSettings/printSettingsForm.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-233 (Batch 451, moved out of components/Config/System/PrintSettingsSection.tsx):
// the decisions behind the Print Settings screen.
//
//   - Which label-size presets each size selector offers. Container labels
//     never use a full-page requisition preset; the requisition selector
//     offers every preset, full-page included (a lab that wants one can
//     still choose it, though the default is the 4×6 thermal pouch label).
//   - Where a change is saved: the selected facility's override when a
//     facility is chosen (only once that facility has an override; while it
//     inherits, the screen is read-only), otherwise the global settings.
//     What applies is always the global settings with the override merged
//     on top (resolveEffectivePrintSettings).
// ─────────────────────────────────────────────────────────────────────────────

import { LABEL_SIZE_PRESETS, type LabelSizePreset } from '@/types/labels/LabelSizePreset';
import type { IPrintSettingsService, PrintSettingsConfig } from './IPrintSettingsService';
import type { FacilityPrintSettings, IFacilityPrintSettingsService } from './IFacilityPrintSettingsService';

const FULL_PAGE_PRESET_IDS: readonly string[] = ['requisition_full_page_letter', 'requisition_full_page_a4'];

/** The presets the Container Label Size selector offers (no full-page requisition sizes). */
export function containerLabelSizePresets(presets: readonly LabelSizePreset[] = LABEL_SIZE_PRESETS): LabelSizePreset[] {
  return presets.filter(p => !FULL_PAGE_PRESET_IDS.includes(p.id));
}

/** The presets the Requisition Label Size selector offers: every preset, full-page included. */
export function requisitionLabelSizePresets(presets: readonly LabelSizePreset[] = LABEL_SIZE_PRESETS): LabelSizePreset[] {
  return [...presets];
}

/** True while a selected facility inherits the global settings (no override yet): nothing can be changed. */
export function isPrintSettingsReadOnly(selectedFacilityId: string | undefined, override: FacilityPrintSettings | null): boolean {
  return !!selectedFacilityId && !override;
}

export interface PrintSettingsSaveDeps {
  printSettingsService: Pick<IPrintSettingsService, 'update'>;
  facilityPrintSettingsService: Pick<IFacilityPrintSettingsService, 'update'>;
}

export type PrintSettingsSaveResult =
  | { saved: 'global'; config: PrintSettingsConfig }
  | { saved: 'facility'; override: FacilityPrintSettings }
  | { saved: false };

/** Saves `changes` to the selected facility's override, or to the global settings when no facility is selected. */
export async function savePrintSettingsChanges(
  changes: Partial<PrintSettingsConfig>,
  selectedFacilityId: string | undefined,
  deps: PrintSettingsSaveDeps,
): Promise<PrintSettingsSaveResult> {
  if (selectedFacilityId) {
    const res = await deps.facilityPrintSettingsService.update(selectedFacilityId, changes);
    return res.ok ? { saved: 'facility', override: res.data } : { saved: false };
  }
  const res = await deps.printSettingsService.update(changes);
  return res.ok ? { saved: 'global', config: res.data } : { saved: false };
}
