// src/services/smartCapture/smartCapturePayload.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the structured payload for Smart Capture lines,
// and the audit entries the review flow writes. Pure.
//
// The payload holds the approved lines, the rule-set version, who approved and
// when, and the labels Prototype and Simulated. It holds no patient name,
// date of birth or MRN. The audit detail carries counts, rule ids, CPT codes and
// the rule-set version only: no specimen text and no subject.
// ─────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';
import { exportableLines, type SmartCaptureRecord } from './smartCaptureStates';

export interface SmartCapturePayload {
  schema: 'smart-capture-charges';
  schemaVersion: 1;
  /** Always true: this capability has not been through compliance review. */
  prototype: true;
  complianceReviewed: false;
  /** True when the message goes to the simulated engine (the demo). */
  simulated: boolean;
  caseId: string;
  ruleVersion: string;
  generatedAt: string;
  approvedBy: string;
  approvedAt: string;
  lines: { specimen: string; cpt: string; units: number; ruleId: string; ruleVersion: string }[];
  /** The case's financial class summary, when one could be built (see buildFinancialClassPayload). */
  financialClass?: object;
}

/** Builds the payload for an approved record (pure). Only accepted, approved lines are included. */
export function buildSmartCapturePayload(record: SmartCaptureRecord, input: { simulated: boolean; financialClass?: object }): SmartCapturePayload {
  return {
    schema: 'smart-capture-charges', schemaVersion: 1, prototype: true, complianceReviewed: false, simulated: input.simulated,
    caseId: record.caseId, ruleVersion: record.ruleVersion, generatedAt: record.generatedAt,
    approvedBy: record.approvedBy ?? '', approvedAt: record.approvedAt ?? '',
    lines: exportableLines(record).map(l => ({ specimen: l.specimenLabel, cpt: l.cpt, units: l.units, ruleId: l.ruleId, ruleVersion: l.ruleVersion })),
    ...(input.financialClass ? { financialClass: input.financialClass } : {}),
  };
}

const codes = (r: SmartCaptureRecord) => [...new Set(r.lines.map(l => l.cpt))].join(', ');

export function suggestedAudit(r: SmartCaptureRecord, user: string): NewAuditLog {
  return {
    type: 'ai', event: 'Smart Capture Suggested',
    detail: `SIMULATED, prototype (not compliance-reviewed): rule set ${r.ruleVersion} suggested ${r.lines.length} line(s) (${codes(r)}). No patient data was read.`,
    user, caseId: r.caseId, confidence: null,
  };
}

export function reviewedAudit(r: SmartCaptureRecord, line: { cpt: string; ruleId: string }, decision: 'accepted' | 'rejected', user: string): NewAuditLog {
  return {
    type: 'user', event: decision === 'accepted' ? 'Smart Capture Line Accepted' : 'Smart Capture Line Rejected',
    detail: `${line.cpt} (rule ${line.ruleId}, rule set ${r.ruleVersion}) ${decision} by the reviewer. Nothing was sent.`,
    user, caseId: r.caseId, confidence: null,
  };
}

export function approvedAudit(r: SmartCaptureRecord, user: string): NewAuditLog {
  const accepted = r.lines.filter(l => l.decision === 'accepted');
  return {
    type: 'user', event: 'Smart Capture Approved',
    detail: `Pathologist confirmed ${accepted.length} accepted line(s) (${[...new Set(accepted.map(l => l.cpt))].join(', ')}) of ${r.lines.length}; rule set ${r.ruleVersion}. Prototype, not compliance-reviewed. Nothing was sent.`,
    user, caseId: r.caseId, confidence: null,
  };
}

export function exportedAudit(r: SmartCaptureRecord, user: string, input: { simulated: boolean; ok: boolean }): NewAuditLog {
  const n = exportableLines(r).length;
  return {
    type: 'user', event: input.simulated ? 'Simulated Smart Capture Exported' : 'Smart Capture Exported',
    detail: `${input.simulated ? 'SIMULATED: ' : ''}${n} approved line(s) ${input.ok ? 'handed to the charge path' : 'not delivered'}; rule set ${r.ruleVersion}. Prototype, not compliance-reviewed.`,
    user, caseId: r.caseId, confidence: null,
  };
}

export function resetAudit(caseId: string, user: string, why: 'stale' | 'restart'): NewAuditLog {
  return {
    type: 'user', event: 'Smart Capture Restarted',
    detail: why === 'stale' ? 'Suggestions were made again because the case or the rule set changed after the review.' : 'Suggestions were made again at the reviewer\'s request.',
    user, caseId, confidence: null,
  };
}

export function settingsAudit(kind: 'prototype' | 'tick' | 'untick' | 'activation', user: string, value: string): NewAuditLog {
  const event = kind === 'prototype' ? 'Smart Capture Prototype Switched'
    : kind === 'activation' ? 'Smart Capture Production Gate Changed'
    : 'Smart Capture Checklist Changed';
  const detail = kind === 'prototype' ? `Prototype drawer ${value}.`
    : kind === 'activation' ? `Production activation ${value}. Export to a real interface engine is ${value === 'on' ? 'allowed' : 'refused'}.`
    : `Checklist item "${value}" ${kind === 'tick' ? 'ticked' : 'unticked'}${kind === 'untick' ? '; production activation closed' : ''}.`;
  return { type: 'user', event, detail, user, caseId: null, confidence: null };
}
