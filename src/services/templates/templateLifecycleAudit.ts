// src/services/templates/templateLifecycleAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#39): every step in a synoptic template's life writes an entry to
// the Audit Log. Until now they were written to the browser console only, so
// nobody could see who submitted, approved, published, archived or deleted a
// template. Pure: the entries are built here, templateService records them.
//
// The text is literal English (audit records are compliance artifacts, see
// services/auditlog/README.md). It names the template, its version and the
// status change; it never copies a reviewer's note (a note is free text), and
// there is no case or patient in a template event.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';

export type TemplateLifecycleEvent =
  | 'TEMPLATE_DRAFT_SAVED' | 'TEMPLATE_SUBMITTED' | 'TEMPLATE_APPROVED' | 'TEMPLATE_PUBLISHED'
  | 'TEMPLATE_CHANGES_REQUESTED' | 'TEMPLATE_RESUBMITTED' | 'TEMPLATE_RESET_TO_DRAFT'
  | 'TEMPLATE_DRAFT_DELETED' | 'TEMPLATE_ARCHIVED' | 'TEMPLATE_RESTORED' | 'TEMPLATE_SUPERSEDED';

export const TEMPLATE_LIFECYCLE_EVENTS: readonly TemplateLifecycleEvent[] = [
  'TEMPLATE_DRAFT_SAVED', 'TEMPLATE_SUBMITTED', 'TEMPLATE_APPROVED', 'TEMPLATE_PUBLISHED', 'TEMPLATE_CHANGES_REQUESTED',
  'TEMPLATE_RESUBMITTED', 'TEMPLATE_RESET_TO_DRAFT', 'TEMPLATE_DRAFT_DELETED', 'TEMPLATE_ARCHIVED', 'TEMPLATE_RESTORED', 'TEMPLATE_SUPERSEDED',
];

const VERB: Record<TemplateLifecycleEvent, string> = {
  TEMPLATE_DRAFT_SAVED: 'draft saved',
  TEMPLATE_SUBMITTED: 'submitted for review',
  TEMPLATE_APPROVED: 'approval recorded',
  TEMPLATE_PUBLISHED: 'published',
  TEMPLATE_CHANGES_REQUESTED: 'changes requested',
  TEMPLATE_RESUBMITTED: 'resubmitted for review',
  TEMPLATE_RESET_TO_DRAFT: 'reset to draft',
  TEMPLATE_DRAFT_DELETED: 'draft deleted',
  TEMPLATE_ARCHIVED: 'archived',
  TEMPLATE_RESTORED: 'restored to draft',
  TEMPLATE_SUPERSEDED: 'archived (superseded by a newer version)',
};

export interface TemplateLifecycleSubject {
  id: string;
  name?: string;
  version?: string;
  /** The status before and after, when the step changes it. */
  from?: string;
  to?: string;
  /** Approvals recorded so far, for an approval. */
  approvals?: number;
  /** A reviewer's note was entered (its text is not copied). */
  noted?: boolean;
}

/** The audit entry for one lifecycle step (pure). */
export function templateLifecycleAuditEntry(event: TemplateLifecycleEvent, subject: TemplateLifecycleSubject, actorName: string): NewAuditLog {
  const label = `${subject.name?.trim() || 'Untitled'}${subject.version ? ` v${subject.version}` : ''} (${subject.id})`;
  const change = subject.from && subject.to && subject.from !== subject.to ? ` Status ${subject.from} → ${subject.to}.` : subject.to ? ` Status ${subject.to}.` : '';
  const approvals = subject.approvals !== undefined ? ` Approvals: ${subject.approvals}.` : '';
  const note = subject.noted ? ' A reviewer note was recorded.' : '';
  return {
    type: 'user', event,
    detail: `Template ${label}: ${VERB[event]}.${change}${approvals}${note}`,
    user: actorName, caseId: null, confidence: null,
  };
}
