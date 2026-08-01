import { AuditEvent } from "../types/AuditEvent";
import { mockAuditService } from "../services/auditlog/mockAuditService";

// Real bug found and fixed via a direct audit: this file used to be a
// completely separate, parallel audit system — its own localStorage key
// ("ps_audit_log_v1"), never read by anything. Real, active consumers
// (hooks/useSynopticAudit.ts, components/Audit/useAuditLog.ts, and
// InlineCommentThread.tsx via TemplateRenderer.tsx — all genuinely
// reachable, not dead code, confirmed via a direct trace including a
// lazy-loading variant the audit script's own heuristic initially
// missed) were calling logEvent() here believing they were writing to
// the real audit trail. They weren't — AuditLogPage.tsx (the real
// System Audit page) reads exclusively from services/auditlog/'s
// mockAuditService, which has zero awareness this file's storage key
// even exists. Every synoptic-editor action and inline comment routed
// through TemplateRenderer.tsx was silently invisible to any real audit
// review. Fixed here, not by touching the three consumer files — they
// keep calling this same logEvent() signature unchanged, it's this
// function's own implementation that now actually reaches the real,
// shared audit store instead of a disconnected one.
//
// getAuditLog()/clearAuditLog() removed — confirmed via the same audit
// that nothing anywhere reads from or calls them; the whole point of
// this fix is to stop this file from being its own separate store, so
// keeping unused read/clear functions for that store made no sense
// once logEvent() itself no longer treats it as authoritative.

const CATEGORY_TO_TYPE: Record<AuditEvent['category'], 'ai' | 'user' | 'system'> = {
  ai: 'ai',
  user: 'user',
  system: 'system',
};

export function logEvent(event: Omit<AuditEvent, "id" | "timestamp">) {
  // Fire-and-forget — matches every other audit call site in this app
  // (an audit write failing must never block or fail the action it
  // describes) and keeps this function's own signature synchronous, so
  // none of the three real callers need to change how they call it.
  mockAuditService.logEvent({
    type: CATEGORY_TO_TYPE[event.category] ?? 'system',
    event: event.action,
    detail: event.detail,
    user: event.user,
    caseId: null,
    confidence: null,
  }).catch(() => {});
}
