// src/services/smartCapture/smartCaptureSettings.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture settings and the production gate.
// Pure rules; the service keeps the settings.
//
// Two separate switches:
//   • prototypeEnabled: whether the labelled Prototype drawer is offered in the
//     billing review. On in the demo; an administrator can switch it off.
//   • productionActivated: whether an export may go to a real interface engine.
//     Off until every checklist item has been ticked by an administrator, and
//     ticking is audited. Nothing here makes the capability compliant: the
//     checklist records that the reviews were done elsewhere.
// ─────────────────────────────────────────────────
export const SMART_CAPTURE_CHECKLIST_IDS = [
  'validation', 'security', 'privacy', 'legal', 'claims', 'receiver',
] as const;
export type SmartCaptureChecklistId = (typeof SMART_CAPTURE_CHECKLIST_IDS)[number];

export interface SmartCaptureTick { by: string; at: string }

export interface SmartCaptureSettings {
  prototypeEnabled: boolean;
  productionActivated: boolean;
  checklist: Partial<Record<SmartCaptureChecklistId, SmartCaptureTick>>;
}

export const DEFAULT_SMART_CAPTURE_SETTINGS: SmartCaptureSettings = { prototypeEnabled: true, productionActivated: false, checklist: {} };

/** Whether every checklist item has been ticked (pure). */
export function checklistComplete(settings: Pick<SmartCaptureSettings, 'checklist'>): boolean {
  return SMART_CAPTURE_CHECKLIST_IDS.every(id => !!settings.checklist[id]);
}

export type SmartCaptureSettingsRefusal = 'CHECKLIST_INCOMPLETE' | 'UNKNOWN_ITEM';

/** Whether production activation may be switched on (pure). */
export function activationRefusal(settings: Pick<SmartCaptureSettings, 'checklist'>): SmartCaptureSettingsRefusal | null {
  return checklistComplete(settings) ? null : 'CHECKLIST_INCOMPLETE';
}

/** Ticks or unticks one item. Unticking any item closes the gate again (pure). */
export function withTick(settings: SmartCaptureSettings, id: string, ticked: boolean, by: string, at: string): SmartCaptureSettings | SmartCaptureSettingsRefusal {
  if (!(SMART_CAPTURE_CHECKLIST_IDS as readonly string[]).includes(id)) return 'UNKNOWN_ITEM';
  const checklist = { ...settings.checklist };
  if (ticked) checklist[id as SmartCaptureChecklistId] = { by, at };
  else delete checklist[id as SmartCaptureChecklistId];
  return { ...settings, checklist, productionActivated: ticked ? settings.productionActivated : false };
}
