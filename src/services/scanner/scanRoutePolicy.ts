// src/services/scanner/scanRoutePolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// What the app-wide scanner listener (contexts/ScannerProvider.tsx) does with an accession number scanned while
// nothing has focus. By default it opens the case's report. On a station screen that would take the tech off the
// bench mid-task, so (touch spec T1, Oct 30, 2026):
//   • Grossing (the workspace and a case's grossing screen): open that case's grossing screen instead;
//   • Accessioning, Embedding, Microtome, Slide Distribution, Add-On Orders and Batch Management: don't navigate;
//     the screen's own listener (PATHSCRIBE_SCAN) or its scan field handles the scan.
// The PATHSCRIBE_SCAN event is always sent; only the navigation changes. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaseView } from '@/services/caseAddresses/caseAddresses';

/** Routes whose own screen handles a scan; the listener does not navigate there. */
export const SCAN_SELF_HANDLING_ROUTES: readonly string[] = [
  '/accession',
  '/workstations/embedding',
  '/workstations/microtomy',
  '/workstations/cytology-prep', // Batch 740
  '/workstations/slide-distribution',
  '/add-on-orders',
  '/batch-management',
];

const startsWithRoute = (pathname: string, route: string): boolean =>
  pathname === route || pathname.startsWith(`${route}/`) || (route === '/accession' && pathname.startsWith('/accession'));

/** The case view a scanned accession opens from this route, or null to stay on the screen. */
export function scanOpensCaseView(pathname: string): CaseView | null {
  if (SCAN_SELF_HANDLING_ROUTES.some(r => startsWithRoute(pathname, r))) return null;
  if (pathname === '/workstations/grossing' || /^\/case\/[^/]+\/grossing\/?$/.test(pathname)) return 'grossing';
  return 'synoptic';
}
