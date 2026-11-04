// src/services/printing/directDevicePrinting.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 734 (Pete, Oct 30, 2026; Lab Workflow spec Decision 6: devices connect
// through the interface engine). Direct browser-to-printer calls — QZ Tray, the
// PathScribe Agent, Zebra Browser Print, BarTender REST — are blocked in a
// server deployment unless an administrator turns them on for the printer's
// facility (Facility.allowDirectDevicePrinting, config:direct-device-printing:manage),
// and each one that goes ahead is audited. The interface engine route and the
// browser print dialog (the fallback and the demo path) are always allowed. The
// demo, which keeps its data in the browser, allows direct printing as before.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrinterBridgeType, PrinterProfile } from '../printerProfiles/IPrinterProfileService';

export const DIRECT_DEVICE_BRIDGES: readonly PrinterBridgeType[] = ['qz_tray', 'pathscribe_agent', 'zebra_browser_print', 'bartender_rest'];

/** Whether a bridge sends the label from the browser straight to a device (not through the interface engine). */
export function isDirectDeviceBridge(bridgeType: PrinterBridgeType): boolean {
  return DIRECT_DEVICE_BRIDGES.includes(bridgeType);
}

export type DirectPrintDecision = 'notDirect' | 'allowedDemo' | 'allowedByFacility' | 'blocked';

/** Pure: the decision for one print. */
export function directPrintDecision(bridgeType: PrinterBridgeType, demo: boolean, facilityAllows: boolean | undefined): DirectPrintDecision {
  if (!isDirectDeviceBridge(bridgeType)) return 'notDirect';
  if (demo) return 'allowedDemo';
  return facilityAllows ? 'allowedByFacility' : 'blocked';
}

export interface DirectPrintDeps {
  /** True in the demo (data kept in the browser); false in a server deployment. */
  demo: () => boolean;
  /** Whether the facility has direct printing turned on (a printer with no facility counts as off). */
  facilityAllows: (facilityId: string | undefined) => Promise<boolean>;
  audit: (event: 'Direct Device Print' | 'Direct Device Print Blocked', detail: string) => void;
}

/** Checks one print and audits it in a server deployment (allowed or blocked). */
export async function checkDirectDevicePrint(printer: Pick<PrinterProfile, 'bridgeType' | 'facilityId' | 'printerId'>, document: string | undefined, deps: DirectPrintDeps): Promise<DirectPrintDecision> {
  if (!isDirectDeviceBridge(printer.bridgeType)) return 'notDirect';
  const demo = deps.demo();
  const decision = directPrintDecision(printer.bridgeType, demo, demo ? undefined : await deps.facilityAllows(printer.facilityId).catch(() => false));
  if (decision === 'allowedByFacility') deps.audit('Direct Device Print', `${document ?? 'label'} sent from the browser to ${printer.printerId} through ${printer.bridgeType} (facility ${printer.facilityId ?? 'none'} allows direct printing).`);
  if (decision === 'blocked') deps.audit('Direct Device Print Blocked', `${document ?? 'label'} for ${printer.printerId} through ${printer.bridgeType} was not sent: direct printing is off for facility ${printer.facilityId ?? 'none'}.`);
  return decision;
}
