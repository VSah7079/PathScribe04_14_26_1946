// src/services/cases/defaultOpenCaseForView.ts
// Batch 396: openCaseForView wired to the app's case router, access gate and
// session. Screens and route loaders call this; tests call openCaseForView
// with their own dependencies.

import { caseRouter } from './CaseRouter';
import { getSessionUser } from '../auth/caseAccessControl';
import { resolveCaseAccessGate } from '../auth/resolveCaseAccessGate';
import { openCaseForView, type OpenCaseForViewResult } from './openCaseForView';

export function openCaseForViewDefault(caseId: string): Promise<OpenCaseForViewResult> {
  return openCaseForView(caseId, {
    getCase: id => caseRouter.getCase(id),
    gate: (session, c) => resolveCaseAccessGate(session, c as any),
    session: getSessionUser,
    // Support log only; the screen shows the same neutral message for every reason.
    logUnavailable: (id, reason, detail) => console.warn('[openCaseForView] case unavailable', { caseId: id, reason, detail }),
  });
}
