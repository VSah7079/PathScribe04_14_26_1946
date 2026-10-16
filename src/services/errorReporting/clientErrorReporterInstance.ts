// src/services/errorReporting/clientErrorReporterInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 502 (PS-472): the app's one reporter — the console and the in-app
// Error Log. The external monitoring sink is added here once PS-469 decides it.
// ─────────────────────────────────────────────────────────────────────────────

import { createClientErrorReporter, errorLogEntryFor, newErrorReference } from './clientErrorReporter';

export const clientErrorReporter = createClientErrorReporter({
  sinks: [
    r => console.error(`[PathScribe crash ${r.reference}] ${r.source}${r.boundary ? ` (${r.boundary})` : ''} on ${r.route}: ${r.name}: ${r.message}`, r.stack),
    // Batch 527 (PS-486): the services are loaded when an error is logged, not
    // at start-up, so the sign-in page doesn't wait for all of them.
    r => { void import('@/services').then(({ auditService }) => auditService.logError(errorLogEntryFor(r))).catch(() => {}); },
  ],
  now: () => Date.now(),
  pathname: () => (typeof window !== 'undefined' ? window.location.pathname : '/'),
  newReference: () => newErrorReference(),
});
