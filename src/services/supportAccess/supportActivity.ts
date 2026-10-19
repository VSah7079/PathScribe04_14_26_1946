// src/services/supportAccess/supportActivity.ts
// ─────────────────────────────────────────────────
// Batch 604 (PS-358): a ForMedrixAI support agent's own exports and
// configuration changes are written to the organisation's support audit stream
// as well as the main audit log. This is the tiny leaf both the configuration
// guard and the export audit call; the support access service installs the
// handler. Nothing here knows about organisations or sessions.
// ─────────────────────────────────────────────────
export type SupportActivity = { kind: 'export' | 'configChange'; detail: string };
type Handler = (a: SupportActivity) => void | Promise<void>;
let handler: Handler | null = null;
export function setSupportActivityHandler(h: Handler | null): void { handler = h; }
/** Never throws and never blocks the caller. */
export function reportSupportActivity(a: SupportActivity): void {
  try { void Promise.resolve(handler?.(a)).catch(() => {}); } catch { /* the caller's work matters more */ }
}
