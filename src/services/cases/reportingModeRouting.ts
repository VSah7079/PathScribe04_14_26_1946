// src/services/cases/reportingModeRouting.ts
// ─────────────────────────────────────────────────────────────────────────────
// The real, single source of truth for the O26- routing prefix — found via
// a direct question about why case-mode routing depends on a string
// pattern at all, rather than the real reportingMode field already on
// Case. The honest answer: CaseRouter has to decide which backend to even
// ask BEFORE it has the case object (and therefore before it has
// reportingMode) — the id itself is the only thing available at that
// point. Confirmed this is a real, exclusive relationship, not a loose
// convention: AccessionPage.tsx unconditionally sets
// reportingMode: 'orchestrator' (no other value ever set there), and
// FHIRCaseService.ts's own comment confirms the converse — "LIS-owned
// reports are always Assist mode." An Orchestration accession event and
// an O26- id are the same fact, not two independently-maintained ones.
//
// Before this file existed, that one fact was hardcoded separately in six
// different places (this exact literal was independently duplicated in
// CaseRouter.ts, mockCaseService.ts, AccessionPage.tsx, and three spots
// in SynopticReportPage.tsx) — real drift risk: fix or extend the scheme
// in one location and miss another, and routing silently breaks for a
// subset of cases. Every one of those now imports from here instead.
//
// Still the same known, temporary mock-stage scheme documented in
// CaseRouter.ts's own header — production replaces this whole file's
// logic with a real Case Registry microservice lookup
// ({ caseId → serviceType }, no patient data, per UK GDPR Art. 25 data
// minimisation). This file is what makes that eventual swap a one-file
// change instead of a six-file hunt.
// ─────────────────────────────────────────────────────────────────────────────

export const ORCH_ID_PREFIX = 'O26-';

export function isOrchCaseId(caseId: string | null | undefined): boolean {
  return !!caseId && caseId.startsWith(ORCH_ID_PREFIX);
}

/** The real generation-side counterpart to isOrchCaseId() — formats a
 *  sequence number into a real Orchestration case id, deriving the
 *  prefix from the same constant every check above uses, rather than a
 *  second, independently-typed literal at the point of creation. */
export function formatOrchCaseId(sequence: number): string {
  return `${ORCH_ID_PREFIX}${String(sequence).padStart(4, '0')}`;
}
