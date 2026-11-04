// src/types/printRouting/PrintDestination.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-278 ("Print Destination Routing Engine") §2.1.3 —
// "communicate via standard IP-based print protocols (RAW/Port 9100,
// LPR/LPD, IPP) or print-server abstraction — no client-side printer
// driver installation."
//
// Real, deliberate scope decision, confirmed against this app's own
// existing infrastructure before writing this (services/printing/
// README.md, types/printing/PrintJob.ts): "print-server abstraction"
// is NOT a fourth protocol to build here — it's already exactly what
// PrintDeliveryMode's own real 'INTERFACE_ENGINE_HANDOFF' mode
// provides today (hands the job to external middleware — an LRS,
// CUPS, or an enterprise print server — which owns real spooling from
// there; PrintJob.ts's own header comment already names all three).
// A PrintDestination here is specifically the OTHER real option this
// ticket names: talking directly to a network printer's own IP
// interface, with no driver and no middleware in between. So
// PrintProtocol only has the three genuinely distinct wire protocols;
// a PrintRoutingRule resolving to one of these is a deliberately
// different delivery path from a Facility's own INTERFACE_ENGINE_HANDOFF
// config, not a fourth member of this enum standing in for it.
//
// Real, deliberate: this is a fresh, self-contained descriptor, not a
// reuse of services/printerProfiles/PrinterProfile — confirmed
// directly before building this (that registry's own `bridgeType` is
// PS-51's label-printing BRIDGE mechanism — QZ Tray, a vendor browser
// agent, BarTender REST — a fundamentally different, browser/agent-
// mediated concern from a server-side socket/HTTP client talking
// straight to a printer's own IP:port for document/report printing).
// Same real "two genuinely different domains, don't force a shared
// type" reasoning this app already applies to Cytology vs. Surgical
// Pathology report rendering.
// ─────────────────────────────────────────────────────────────────────────────

/** Real, per §2.1.3's own three named protocols:
 *  - 'RAW_9100': raw bytes over a plain TCP socket, conventionally to
 *    port 9100 ("AppSocket"/"JetDirect") — the simplest real IP print
 *    protocol; no acknowledgement framing at all beyond the OS-level
 *    TCP connection itself.
 *  - 'LPR_LPD': RFC 1179 — a real, older Unix line-printer protocol;
 *    still widely supported by network printers and print servers.
 *  - 'IPP': the Internet Printing Protocol (RFC 8010/2910) — an
 *    HTTP-carried, binary-encoded request; the modern, most
 *    interoperable of the three (what most current network printers
 *    and CUPS itself actually speak). */
export type PrintProtocol = 'RAW_9100' | 'LPR_LPD' | 'IPP';

export const DEFAULT_PRINT_PROTOCOL_PORT: Record<PrintProtocol, number> = {
  RAW_9100: 9100,
  LPR_LPD: 515,
  IPP: 631,
};

/** Real, resolved network target a PrintRoutingRule (or a Facility's
 *  own direct-network default) points to. `port` defaults per
 *  protocol (see DEFAULT_PRINT_PROTOCOL_PORT above) when unset — a
 *  real site pointing at a printer's own factory-default port never
 *  needs to type it in explicitly.
 *
 *  Batch 553: this is now one of two kinds of destination (see
 *  PrintDestination below). It is sent from a server process inside
 *  the hospital's network; from the cloud it can't be reached. */
export interface NetworkPrintDestination {
  protocol: PrintProtocol;
  ipAddress: string;
  port?: number;
  /** LPR_LPD only — the remote queue/printer name RFC 1179's own
   *  "Receive a printer job" command (0x02) requires. Defaults to
   *  'lp' (the real, conventional Unix default queue name) when
   *  unset, never fabricated per-site. */
  queueName?: string;
  /** IPP only — the target printer's own IPP resource path, e.g.
   *  '/printers/lab-3' or '/ipp/print'. Defaults to '/ipp/print' (a
   *  common real default many network printers and CUPS itself
   *  register at) when unset. */
  resourcePath?: string;
  /** Real, human-facing label for admin UIs/audit trails — never
   *  parsed or matched against, purely descriptive (same role as
   *  PrinterProfile.printerId elsewhere in this app). */
  displayName?: string;
}

/** Batch 553 (SITE_AGENT_API.md §3): a printer on a site agent's list, named
 *  by the site (the performing-lab facility's id) and the printer's id there.
 *  The agent holds its address and protocol; the API hands the job to the
 *  site's agent. */
export interface AgentPrinterRef {
  siteId: string;
  destinationId: string;
}

export interface AgentPrintDestination {
  agentPrinter: AgentPrinterRef;
  /** The printer's name when it was chosen, for lists and the audit trail. */
  displayName?: string;
}

/** Where a report print job goes: a site agent's printer (the way that works
 *  from the cloud), or a printer address sent to directly. */
export type PrintDestination = NetworkPrintDestination | AgentPrintDestination;

export function isAgentPrintDestination(d: PrintDestination | undefined): d is AgentPrintDestination {
  return !!d && typeof (d as AgentPrintDestination).agentPrinter === 'object' && (d as AgentPrintDestination).agentPrinter !== null;
}

export function isNetworkPrintDestination(d: PrintDestination | undefined): d is NetworkPrintDestination {
  return !!d && !isAgentPrintDestination(d);
}
