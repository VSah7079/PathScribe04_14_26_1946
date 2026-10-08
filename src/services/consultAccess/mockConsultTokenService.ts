// src/services/consultAccess/mockConsultTokenService.ts
// See IConsultTokenService.ts's own header for the full, load-bearing
// caveat: this is NOT real token security. Read that before wiring this
// into anything beyond a trusted demo/pilot environment.

import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type {
  ConsultToken, NewConsultToken, ConsultOpinion, NewConsultOpinion, IConsultTokenService,
} from './IConsultTokenService';
import { resolveConsultTokenStatus } from './IConsultTokenService';
import { computeDefaultConsultTokenExpiry } from './computeDefaultConsultTokenExpiry';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { assessmentProblem, outsideConsultQaRecord, reportReleased } from './outsideConsultRules';
import { demoConsultTokens } from './consultDemoSeed';

const TOKENS_KEY = 'consult_tokens';
const OPINIONS_KEY = 'consult_opinions';

const persistTokens  = (data: ConsultToken[]) => storageSet(TOKENS_KEY, data);
// Batch 456: nothing stored yet (first run, or after a Full Reset) → the demo
// link (consultDemoSeed.ts), stored at once so its generated token stays put.
const loadTokens = (): ConsultToken[] => {
  const stored = storageGet<ConsultToken[] | null>(TOKENS_KEY, null);
  if (stored) return stored;
  const seeded = demoConsultTokens(generateOpaqueToken);
  persistTokens(seeded);
  return seeded;
};
const loadOpinions   = (): ConsultOpinion[] => storageGet<ConsultOpinion[]>(OPINIONS_KEY, []);
const persistOpinions = (data: ConsultOpinion[]) => storageSet(OPINIONS_KEY, data);

/** Real, deliberately non-cryptographic opaque bearer string — see this
 *  file's own header caveat and IConsultTokenService.ts's. Long enough
 *  (two base36 segments) to not collide across a demo session, nothing
 *  more claimed than that. */
function generateOpaqueToken(): string {
  return 'ct_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// The single choke point this domain's audit events funnel through —
// same "single enforcement point" discipline caseAccessControl.ts's own
// header documents for access decisions. `detail` is always PHI-safe: no
// patient name/DOB/MRN/clinical values, matching AuditLog.detail's own
// doc comment — only the case's accessionNumber (already the convention
// every other real audit call site in this app uses for caseId) and the
// external consultant's own identifier, never anything about the patient.
function logConsultAuditEvent(event: string, detail: string, userLabel: string, accessionNumber: string | null) {
  mockAuditService.logEvent({
    type: 'user',
    event,
    detail,
    user: userLabel,
    caseId: accessionNumber,
    confidence: null,
  }).catch(() => {});
}

export const mockConsultTokenService: IConsultTokenService = {
  async issue(draft: NewConsultToken): Promise<ServiceResult<ConsultToken>> {
    if (!draft.scope.caseId) return { ok: false, error: 'A case is required to issue a consult link.' };
    if (!draft.consultantIdentifier.trim()) return { ok: false, error: 'A consultant identifier is required — there is no real external-identity directory to look this up in.' };

    const now = new Date();
    const newToken: ConsultToken = {
      id: 'consult-tok-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      token: generateOpaqueToken(),
      scope: draft.scope,
      issuedByUserId: draft.issuedByUserId,
      issuedByName: draft.issuedByName,
      issuedAt: now.toISOString(),
      expiresAt: draft.expiresAt ?? computeDefaultConsultTokenExpiry(now).toISOString(),
      isActive: true,
      consultantIdentifier: draft.consultantIdentifier.trim(),
      consultantOrganization: draft.consultantOrganization?.trim() || undefined,
      note: draft.note?.trim() || undefined,
      accessCount: 0,
    };

    const data = loadTokens();
    data.push(newToken);
    persistTokens(data);

    logConsultAuditEvent(
      'consult.link.created',
      `Consult link created for ${draft.scope.slideIds?.length ? `${draft.scope.slideIds.length} slide(s)` : 'full case'}, consultant="${newToken.consultantIdentifier}"${newToken.consultantOrganization ? ` (${newToken.consultantOrganization})` : ''}, expires ${newToken.expiresAt}.`,
      draft.issuedByName,
      draft.scope.caseAccessionNumber
    );

    return { ok: true, data: newToken };
  },

  async getByCaseId(caseId: string): Promise<ServiceResult<ConsultToken[]>> {
    return { ok: true, data: loadTokens().filter(t => t.scope.caseId === caseId) };
  },

  async resolve(token: string): Promise<ServiceResult<ConsultToken>> {
    const found = loadTokens().find(t => t.token === token);
    // Deliberately uniform caller-facing message whether the token is
    // unknown, expired, or revoked — same OWASP-aligned "don't confirm
    // which" posture caseAccessControl.ts's own header documents — but
    // the audit entry underneath still records the real reason.
    const DENIED_MESSAGE = 'This consult link is invalid or no longer active.';

    if (!found) {
      logConsultAuditEvent('consult.link.access_denied', 'Access attempt with an unrecognized consult token.', 'External consultant', null);
      return { ok: false, error: DENIED_MESSAGE };
    }

    const status = resolveConsultTokenStatus(found);
    if (status === 'Revoked') {
      logConsultAuditEvent('consult.link.access_denied', 'Access attempt on a revoked consult link.', found.consultantIdentifier, found.scope.caseAccessionNumber);
      return { ok: false, error: DENIED_MESSAGE };
    }
    if (status === 'Expired') {
      logConsultAuditEvent('consult.link.access_attempt_expired', `Access attempt on an expired consult link (expired ${found.expiresAt}).`, found.consultantIdentifier, found.scope.caseAccessionNumber);
      return { ok: false, error: DENIED_MESSAGE };
    }

    return { ok: true, data: found };
  },

  async revoke(id: ID, revokedByUserId: string): Promise<ServiceResult<ConsultToken>> {
    const data = loadTokens();
    const idx = data.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: `Consult token ${id} not found` };

    const updated: ConsultToken = { ...data[idx], isActive: false, revokedAt: new Date().toISOString(), revokedByUserId };
    data[idx] = updated;
    persistTokens(data);

    logConsultAuditEvent('consult.link.revoked', `Consult link manually revoked (consultant="${updated.consultantIdentifier}").`, revokedByUserId, updated.scope.caseAccessionNumber);
    return { ok: true, data: updated };
  },

  async recordAccess(id: ID): Promise<ServiceResult<ConsultToken>> {
    const data = loadTokens();
    const idx = data.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: `Consult token ${id} not found` };

    const updated: ConsultToken = { ...data[idx], accessCount: data[idx].accessCount + 1, lastAccessedAt: new Date().toISOString() };
    data[idx] = updated;
    persistTokens(data);

    logConsultAuditEvent('consult.link.accessed', `Consult link viewed by consultant="${updated.consultantIdentifier}" (view #${updated.accessCount}).`, updated.consultantIdentifier, updated.scope.caseAccessionNumber);
    return { ok: true, data: updated };
  },

  async submitOpinion(draft: NewConsultOpinion): Promise<ServiceResult<ConsultOpinion>> {
    if (!draft.opinionText.trim()) return { ok: false, error: 'An opinion is required before submitting.' };

    const newOpinion: ConsultOpinion = {
      ...draft,
      id: 'consult-op-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      submittedAt: new Date().toISOString(),
    };
    const data = loadOpinions();
    data.push(newOpinion);
    persistOpinions(data);

    const tokenRecord = loadTokens().find(t => t.id === draft.tokenId);
    logConsultAuditEvent(
      'consult.opinion.submitted',
      `External consult opinion submitted (status=${draft.signedStatus}${draft.diagnosticCategory ? `, category="${draft.diagnosticCategory}"` : ''}).`,
      draft.consultantIdentifier,
      tokenRecord?.scope.caseAccessionNumber ?? null
    );
    return { ok: true, data: newOpinion };
  },

  async getOpinionsByCaseId(caseId: string): Promise<ServiceResult<ConsultOpinion[]>> {
    return { ok: true, data: loadOpinions().filter(o => o.caseId === caseId) };
  },

  // Batch 439 (PS-148): see IConsultTokenService.assessOpinion.
  async assessOpinion(id, input) {
    const opinion = loadOpinions().find(o => o.id === id);
    if (!opinion) return { ok: false, error: 'NOT_FOUND' };
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce('case:outside-consult:assess', { caseId: opinion.caseId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
    const problem = assessmentProblem(opinion, input.assessment, input.note);
    if (problem) return { ok: false, error: problem };

    const { caseRouter } = await import('../cases/CaseRouter');
    const caseData = await caseRouter.getCase(opinion.caseId).catch(() => undefined);
    const released = reportReleased(caseData?.status);
    const profile = readSessionProfile();
    const actor = { userId: profile?.id ?? 'unknown', userName: profile?.name || profile?.id || 'unknown' };
    const signer = caseData?.finalizedBy ?? caseData?.diagnostic?.finalizedBy;
    const { mockQaActivityRecordService } = await import('../quality/mockQaActivityRecordService');
    const qa = await mockQaActivityRecordService.create(outsideConsultQaRecord({
      caseId: opinion.caseId,
      caseType: caseData?.specimens?.[0]?.description || opinion.caseId,
      subspecialtyId: caseData?.subspecialtyId,
      caseDiagnosis: caseData?.diagnostic?.primaryDiagnosis,
      consultant: opinion.consultantIdentifier,
      opinionText: opinion.opinionText,
      assessment: input.assessment,
      note: input.note,
      released,
      actor,
      ...(signer ? { signedOutBy: { userId: signer, userName: signer } } : {}),
    })).catch(() => null);

    const updated: ConsultOpinion = {
      ...opinion,
      assessment: input.assessment,
      ...(input.note?.trim() ? { assessmentNote: input.note.trim() } : {}),
      assessedBy: actor,
      assessedAt: new Date().toISOString(),
      assessedAfterRelease: released,
      ...(qa?.ok ? { qaRecordId: qa.data.id } : {}),
    };
    persistOpinions(loadOpinions().map(o => (o.id === id ? updated : o)));
    const tokenRecord = loadTokens().find(t => t.id === opinion.tokenId);
    logConsultAuditEvent(
      'consult.opinion.assessed',
      `External consult opinion from consultant="${opinion.consultantIdentifier}" assessed: ${input.assessment}${released ? ' (report already released)' : ''}.${input.note?.trim() ? ` ${input.note.trim()}` : ''}`,
      actor.userId,
      tokenRecord?.scope.caseAccessionNumber ?? null,
    );
    return { ok: true, data: updated };
  },
};
