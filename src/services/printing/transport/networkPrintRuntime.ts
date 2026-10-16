// src/services/printing/transport/networkPrintRuntime.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 546 (finding F3, PS-539). The Raw 9100, LPR and IPP transports
// (sendRawPrintJob.ts, sendLprPrintJob.ts, sendIppPrintJob.ts) use Node's
// `net` and `http` modules and Node's `Buffer`. None of them exists in a
// browser, where the bundle replaces `net` with an empty object. A report
// sent to a network printer from the browser therefore threw "Buffer is not
// defined" before any transport ran:
//   - On release, the job was left QUEUED with no retry scheduled.
//   - On a retry, it failed with that message until its retries ran out.
// Network printing belongs to the site agent (docs/architecture/SITE_AGENT_API.md),
// or to a server process. This says whether this process can open a socket
// to a printer.
// ─────────────────────────────────────────────────────────────────────────────

/** True only in a Node process (the API server's worker, a test), never in a browser. */
export function canSendNetworkPrintHere(): boolean {
  const g = globalThis as { window?: unknown; Buffer?: unknown; process?: { versions?: { node?: string } } };
  return g.window === undefined && typeof g.Buffer === 'function' && !!g.process?.versions?.node;
}

/** What the job shows when it can't be sent from here. Plain English, no patient data. */
export const NETWORK_PRINT_NEEDS_SITE_AGENT =
  'Network printing needs the PathScribe site agent (or the API server); it cannot be sent from a browser.';

/** Batch 553: a site agent's printer is sent to by the API server through the site's agent, never from here. */
export const AGENT_PRINT_NEEDS_SERVER =
  "A site agent's printer is reached through the PathScribe API server and the site agent; it cannot be sent from here.";
