// src/services/cases/openCaseForView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete's privacy model, rules 2 to 4): the one decision behind
// every screen that opens a case by its id (/report/:caseId, /synoptic/:caseId).
//
// A case the reader can't open looks exactly like a case that doesn't exist.
// Whether it's missing, in another organisation, restricted to a pool, an
// Orchestration case or a pediatric case, the screen gets the same answer,
// { caseData: null }, and shows the same neutral message
// (components/CaseUnavailable). The real reason goes to the log for support
// and is never shown. CaseRouter.getCase has already written its own audit
// entry for a refusal; this adds the pediatric and Orchestration reasons,
// which are decided here.
//
// A typed or pasted accession number proves nothing (rule 3): this gives the
// same answer however the reader arrived.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { SessionUser } from '../auth/caseAccessControl';
import type { CaseAccessGateResult } from '../auth/resolveCaseAccessGate';

export type CaseUnavailableReason = 'not-found-or-refused' | 'orchestration' | 'pediatric' | 'error';

export interface OpenCaseForViewDeps {
  getCase: (caseId: string) => Promise<Case | undefined>;
  gate: (session: SessionUser | null, caseData: Case) => Promise<CaseAccessGateResult>;
  session: () => SessionUser | null;
  /** Support log. Never shown to the reader. */
  logUnavailable: (caseId: string, reason: CaseUnavailableReason, detail: string | null) => void;
}

export interface OpenCaseForViewResult {
  caseData: Case | null;
}

export async function openCaseForView(caseId: string, deps: OpenCaseForViewDeps): Promise<OpenCaseForViewResult> {
  const id = (caseId ?? '').trim();
  if (!id) return { caseData: null };
  try {
    const c = await deps.getCase(id);
    if (!c) {
      deps.logUnavailable(id, 'not-found-or-refused', null);
      return { caseData: null };
    }
    const gate = await deps.gate(deps.session(), c);
    if (!gate.granted) {
      deps.logUnavailable(id, gate.reason ?? 'error', gate.detail);
      return { caseData: null };
    }
    return { caseData: c };
  } catch (e) {
    deps.logUnavailable(id, 'error', e instanceof Error ? e.message : null);
    return { caseData: null };
  }
}
