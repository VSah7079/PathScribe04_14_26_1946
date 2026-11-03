// src/services/printSettings/microtomePrintMode.ts
// Batch 758 (Pete, Nov 1, 2026: "Splitting the setting into separate Grossing and Microtomy flags makes complete
// domain sense"): the Microtome's print mode, apart from Grossing's. Settings saved before Batch 758 have no Microtome
// mode, so it follows the Grossing default (On-Demand or Batch) as it did before. Pure.
import type { MicrotomePrintBehavior, PrintSettingsConfig } from './IPrintSettingsService';

export function microtomePrintModeOf(config: Pick<PrintSettingsConfig, 'defaultPrintBehavior' | 'microtomePrintBehavior'>): MicrotomePrintBehavior {
  return config.microtomePrintBehavior ?? config.defaultPrintBehavior;
}
