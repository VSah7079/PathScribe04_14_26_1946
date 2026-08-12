/**
 * AuditLogger
 *
 * Structured access logging for DSPT (NHS Data Security and Protection
 * Toolkit) and UK GDPR Article 5(f) / Article 25 compliance.
 *
 * Each ICaseService implementation holds its own AuditLogger instance
 * so audit trails are partitioned by data source.  This matters for
 * medico-legal purposes: the system of record for a finalised report
 * must be unambiguous and its access log must be independently auditable.
 *
 * Real fix (found via a direct question about whether these events show
 * up on the System Audit page — they didn't): this previously only did
 * console.debug in dev mode, completely disconnected from
 * services/auditlog/ — the actual store AuditLogPage.tsx reads from.
 * Every case.read/write/conflict event logged anywhere in services/cases/
 * was invisible to any real user, visible only to a developer with
 * DevTools open. Now genuinely writes into the same auditService every
 * other real audit trail in this app uses, fire-and-forget (matching the
 * "never block the primary action on an audit write" principle used
 * elsewhere — a failed audit write must never fail the case read/write it
 * describes) so every existing call site's synchronous audit.log(...)
 * call needs no changes.
 */

import { mockAuditService } from '../auditlog/mockAuditService';

export type AuditEventType =
  | 'case.read'
  | 'case.list'
  | 'case.search'
  | 'case.write'
  | 'case.write.conflict'
  | 'case.create'
  | 'case.delete';

export interface AuditEvent {
  eventType:  AuditEventType;
  serviceId:  string;           // which data source was accessed
  caseId?:    string;           // omitted for list operations
  userId:     string;           // authenticated pathologist ID
  timestamp:  string;           // ISO-8601
  outcome:    'success' | 'failure';
  // Production additions:
  // justificationCode?: string; // RCPath / CAP access justification
  // sessionId?:         string; // tie to authenticated session
  // dataController?:    string; // NHS Trust / lab identifier
}

const EVENT_LABELS: Record<AuditEventType, string> = {
  'case.read':           'Case Read',
  'case.list':           'Case List',
  'case.search':         'Case Search',
  'case.write':          'Case Write',
  'case.write.conflict': 'Case Write Conflict',
  'case.create':         'Case Created',
  'case.delete':         'Case Deleted',
};

export class AuditLogger {
  constructor(private readonly serviceId: string) {}

  log(event: Omit<AuditEvent, 'serviceId' | 'timestamp'>): void {
    const entry: AuditEvent = {
      ...event,
      serviceId: this.serviceId,
      timestamp: new Date().toISOString(),
    };

    // Dev: structured console output so audit events are visible in DevTools
    if (import.meta.env.DEV) {
      console.debug('[AUDIT]', entry);
    }

    // Real write to the same audit store the System Audit page reads
    // from. Fire-and-forget: an audit write failing must never fail the
    // case read/write it's describing.
    mockAuditService.logEvent({
      type: 'system',
      event: EVENT_LABELS[event.eventType],
      detail: `${this.serviceId} — ${EVENT_LABELS[event.eventType]} — ${event.outcome}`,
      user: event.userId,
      caseId: event.caseId ?? null,
      confidence: null,
    }).catch(() => {});
  }
}
