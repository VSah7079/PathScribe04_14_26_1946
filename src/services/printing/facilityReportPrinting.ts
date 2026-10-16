// src/services/printing/facilityReportPrinting.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-337): the rules for a facility's report-printing settings,
// which until now had no screen at all (seed or code only):
//
//   • Facility.printDeliveryConfig — the PERFORMING lab's side: whether it
//     prints released reports, how (QZ Tray to a named printer, hand-off to
//     the interface engine, or straight to a network printer), the paper size,
//     and the network printer used when no print routing rule matches.
//   • Facility.printPresentationPreference — the ORDERING client's side: which
//     paper tray and whether duplex. Each field left unset falls back to the
//     report type's default (resolvePrintPresentationOptions.ts).
//
// The Facility editor's Printing tab edits a flat form; these helpers turn a
// facility into that form and back, and say what is wrong with it. The
// facility service saves through setPrintSettings, checked against
// config:print-settings:manage, and refuses the same problems. Pure.
//
// Batch 553 (SITE_AGENT_API.md §3): the default printer is one of this
// facility's own site agent printers, or a printer address. An agent printer
// must be on this facility's site: the default prints this lab's reports.
// ─────────────────────────────────────────────────────────────────────────────
import type { DuplexMode, PaperSize, PaperSourceTray, PrintDeliveryMode } from '@/types/printing/PrintJob';
import { isAgentPrintDestination, type NetworkPrintDestination, type PrintDestination, type PrintProtocol } from '@/types/printRouting/PrintDestination';
import { agentPrintDestination, type PrintDestinationKind } from '../printRouting/printDestinationRules';

export const PRINT_DELIVERY_MODES: readonly PrintDeliveryMode[] = ['NATIVE_QZ_TRAY', 'INTERFACE_ENGINE_HANDOFF', 'DIRECT_NETWORK_PRINT'];
export const PAPER_SIZES: readonly PaperSize[] = ['LETTER', 'A4', 'LEGAL'];
export const PAPER_SOURCES: readonly PaperSourceTray[] = ['TRAY_1_LETTERHEAD', 'TRAY_2_PLAIN'];
export const DUPLEX_MODES: readonly DuplexMode[] = ['DUPLEX', 'SIMPLEX'];
export const PRINT_PROTOCOLS: readonly PrintProtocol[] = ['RAW_9100', 'LPR_LPD', 'IPP'];

export interface FacilityPrintDeliveryConfig {
  enabled: boolean;
  mode: PrintDeliveryMode;
  printerName?: string;
  paperSize?: PaperSize;
  directNetworkPrintDestination?: PrintDestination;
}
export type FacilityPrintPresentationPreference = Partial<{ paperSource: PaperSourceTray; duplexMode: DuplexMode }>;

/** What setPrintSettings stores. `undefined` clears a block. */
export interface FacilityReportPrintSettings {
  printDeliveryConfig?: FacilityPrintDeliveryConfig;
  printPresentationPreference?: FacilityPrintPresentationPreference;
}

/** The Printing tab's form. '' means "not set" (the default applies). */
export interface FacilityPrintForm {
  printingConfigured: boolean;
  enabled: boolean;
  mode: PrintDeliveryMode;
  printerName: string;
  paperSize: PaperSize | '';
  /** Batch 553: a site agent printer of this facility's, or a printer address. */
  destinationKind: PrintDestinationKind;
  destinationAgentPrinterId: string;
  destinationAgentPrinterName: string;
  destinationProtocol: PrintProtocol;
  destinationAddress: string;
  destinationPort: string;
  destinationQueue: string;
  destinationPath: string;
  destinationName: string;
  paperSource: PaperSourceTray | '';
  duplexMode: DuplexMode | '';
}

export type FacilityPrintProblem =
  | 'printerNameRequired'
  | 'destinationAddressRequired'
  | 'destinationAddressInvalid'
  | 'portOutOfRange'
  | 'agentPrinterOtherSite';

const FACILITY_PRINT_PROBLEMS: readonly FacilityPrintProblem[] = ['printerNameRequired', 'destinationAddressRequired', 'destinationAddressInvalid', 'portOutOfRange', 'agentPrinterOtherSite'];
/** Whether a service error is one of these problems (the screen then names it). */
export const isFacilityPrintProblem = (error: string): error is FacilityPrintProblem =>
  (FACILITY_PRINT_PROBLEMS as readonly string[]).includes(error);

/** Host names and IPv4/IPv6 addresses: letters, digits, dots, hyphens, colons. */
const ADDRESS = /^[A-Za-z0-9.:-]+$/;

export function facilityPrintForm(facility: FacilityReportPrintSettings): FacilityPrintForm {
  const c = facility.printDeliveryConfig;
  const dest = c?.directNetworkPrintDestination;
  const agent = isAgentPrintDestination(dest) ? dest : undefined;
  const d = agent ? undefined : (dest as NetworkPrintDestination | undefined);
  const p = facility.printPresentationPreference;
  return {
    printingConfigured: !!c,
    enabled: c?.enabled ?? false,
    mode: c?.mode ?? 'NATIVE_QZ_TRAY',
    printerName: c?.printerName ?? '',
    paperSize: c?.paperSize ?? '',
    // A facility with no default yet starts on a site agent printer, the way that works from the cloud.
    destinationKind: d ? 'network' : 'agent',
    destinationAgentPrinterId: agent?.agentPrinter.destinationId ?? '',
    destinationAgentPrinterName: agent?.displayName ?? '',
    destinationProtocol: d?.protocol ?? 'RAW_9100',
    destinationAddress: d?.ipAddress ?? '',
    destinationPort: d?.port === undefined ? '' : String(d.port),
    destinationQueue: d?.queueName ?? '',
    destinationPath: d?.resourcePath ?? '',
    destinationName: d?.displayName ?? '',
    paperSource: p?.paperSource ?? '',
    duplexMode: p?.duplexMode ?? '',
  };
}

const text = (s: string): string | undefined => (s.trim() ? s.trim() : undefined);

/** The settings a form saves. Fields that don't apply to the chosen mode or protocol are dropped. */
export function facilityPrintSettingsFromForm(form: FacilityPrintForm, facilityId = ''): FacilityReportPrintSettings {
  let printDeliveryConfig: FacilityPrintDeliveryConfig | undefined;
  if (form.printingConfigured) {
    printDeliveryConfig = { enabled: form.enabled, mode: form.mode };
    if (form.paperSize) printDeliveryConfig.paperSize = form.paperSize;
    if (form.mode === 'NATIVE_QZ_TRAY' && text(form.printerName)) printDeliveryConfig.printerName = text(form.printerName);
    if (form.mode === 'DIRECT_NETWORK_PRINT' && form.destinationKind === 'agent') {
      // No printer picked: no default (a routing rule must match), as with an empty address.
      if (form.destinationAgentPrinterId.trim()) {
        printDeliveryConfig.directNetworkPrintDestination = agentPrintDestination(facilityId, {
          destinationId: form.destinationAgentPrinterId.trim(), displayName: form.destinationAgentPrinterName,
        });
      }
    } else if (form.mode === 'DIRECT_NETWORK_PRINT') {
      const hasDestination = [form.destinationAddress, form.destinationPort, form.destinationQueue, form.destinationPath, form.destinationName].some(v => v.trim());
      if (hasDestination) {
        const destination: NetworkPrintDestination = { protocol: form.destinationProtocol, ipAddress: form.destinationAddress.trim() };
        if (form.destinationPort.trim()) destination.port = Number(form.destinationPort.trim());
        if (form.destinationProtocol === 'LPR_LPD' && text(form.destinationQueue)) destination.queueName = text(form.destinationQueue);
        if (form.destinationProtocol === 'IPP' && text(form.destinationPath)) destination.resourcePath = text(form.destinationPath);
        if (text(form.destinationName)) destination.displayName = text(form.destinationName);
        printDeliveryConfig.directNetworkPrintDestination = destination;
      }
    }
  }
  const printPresentationPreference: FacilityPrintPresentationPreference = {};
  if (form.paperSource) printPresentationPreference.paperSource = form.paperSource;
  if (form.duplexMode) printPresentationPreference.duplexMode = form.duplexMode;
  return {
    printDeliveryConfig,
    printPresentationPreference: Object.keys(printPresentationPreference).length ? printPresentationPreference : undefined,
  };
}

/** The first problem with the settings, or null when they can be saved. */
export function facilityPrintProblem(settings: FacilityReportPrintSettings, facilityId?: string): FacilityPrintProblem | null {
  const c = settings.printDeliveryConfig;
  if (!c) return null;
  // A disabled configuration may be incomplete: nothing prints from it.
  if (c.enabled && c.mode === 'NATIVE_QZ_TRAY' && !c.printerName?.trim()) return 'printerNameRequired';
  const dest: PrintDestination | undefined = c.directNetworkPrintDestination;
  if (isAgentPrintDestination(dest)) {
    // The facility's own site only. Without the facility's id (a caller that doesn't know it) only the shape is checked.
    if (!dest.agentPrinter.siteId?.trim() || !dest.agentPrinter.destinationId?.trim()) return 'agentPrinterOtherSite';
    if (facilityId !== undefined && dest.agentPrinter.siteId !== facilityId) return 'agentPrinterOtherSite';
    return null;
  }
  const d = dest as NetworkPrintDestination | undefined;
  if (d) {
    if (!d.ipAddress.trim()) return 'destinationAddressRequired';
    if (!ADDRESS.test(d.ipAddress.trim())) return 'destinationAddressInvalid';
    if (d.port !== undefined && !(Number.isInteger(d.port) && d.port >= 1 && d.port <= 65535)) return 'portOutOfRange';
  }
  return null;
}
