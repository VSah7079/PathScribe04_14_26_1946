// src/services/consultAccess/mockConsultTokenService.ts
// See IConsultTokenService.ts's header: what is real here and what waits for
// the API server (docs/architecture/CONSULT_ACCESS_API.md).

import { browserRunsServerJob } from '../serverJobs/browserStandIns';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type {
  ConsultToken, NewConsultToken, ConsultOpinion, ConsultOpinionDraft, IConsultTokenService, IssuedConsultLink,
} from './IConsultTokenService';
import {
  resolveConsultTokenStatus, CONSULT_LINK_NOT_PERMITTED, CONSULT_LINK_INVALID, CONSULT_LINK_NOT_ACTIVE,
  CONSULT_CASE_REQUIRED, CONSULTANT_REQUIRED,
} from './IConsultTokenService';
import { computeDefaultConsultTokenExpiry } from './computeDefaultConsultTokenExpiry';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { assessmentProblem, outsideConsultQaRecord, reportReleased } from './outsideConsultRules';
import { demoConsultTokens } from './consultDemoSeed';
import { generateConsultToken, hashConsultToken } from './consultTokenCrypto';
import { mockCaseService } from '../cases/mockCaseService';
import { buildConsultCaseView, consultOpinionProblem, newestConsultLinksFirst, unrecordedExpiries } from './consultLinkRules';

const TOKENS_KEY = 'consult_tokens';
const OPINIONS_KEY = 'consult_opinions';

/** Records stored before Batch 522 kept the token itself. */
type StoredConsultToken = ConsultToken & { token?: string };

const persistTokens  = (data: ConsultToken[]) => storageSet(TOKENS_KEY, data);

// Batch 456: nothing stored yet (first run, or after a Full Reset) → the demo
// link (consultDemoSeed.ts). Batch 522: a record still holding its token
// (stored before this batch) keeps only the fingerprint from now on.
async function loadTokens(): Promise<ConsultToken[]> {
  const stored = storageGet<StoredConsultToken[] | null>(TOKENS_KEY, null);
  if (!stored) {
    const seeded = demoConsultTokens(await hashConsultToken(generateConsultToken()));
    persistTokens(seeded);
    return seeded;
  }
  if (!stored.some(t => t.token !== undefined)) return stored;
  const migrated = await Promise.all(stored.map(async ({ token, ...rest }) =>
    (token !== undefined && !rest.tokenHash ? { ...rest, tokenHash: await hashConsultToken(token) } : rest) as ConsultToken));
  persistTokens(migrated);
  return migrated;
}
const loadOpinions   = (): ConsultOpinion[] => storageGet<ConsultOpinion[]>(OPINIONS_KEY, []);
const persistOpinions = (data: ConsultOpinion[]) => storageSet(OPINIONS_KEY, data);

const newId = (prefix: string) => `${prefix}-${Date.now()}-${generateConsultToken().slice(3, 9)}`;

// The single choke point this domain's audit events funnel through. `detail`
// is always PHI-safe: no patient name/DOB/MRN/clinical values, only the case's
// accession number and the outside consultant's own identifier.
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

/** Batch 522: records each link's expiry once (`consult.link.expired`). The API
 *  server does this on a schedule (CONSULT_ACCESS_API.md, CA-12); here it runs
 *  whenever links are read. */
function recordExpiries(data: ConsultToken[], now = new Date()): ConsultToken[] {
  // Batch 555: once the API server runs consult.expireLinks (VITE_SERVER_JOBS), it records them; a link's status is still worked out on read.
  if (!browserRunsServerJob('consult.expireLinks')) return data;
  const due = new Set(unrecordedExpiries(data, now).map(t => t.id));
  if (!due.size) return data;
  const at = now.toISOString();
  const updated = data.map(t => (due.has(t.id) ? { ...t, expiryRecordedAt: at } : t));
  persistTokens(updated);
  for (const t of updated.filter(x => due.has(x.id))) {
    logConsultAuditEvent('consult.link.expired', `Consult link expired (consultant="${t.consultantIdentifier}", expired ${t.expiresAt}).`, 'System', t.scope.caseAccessionNumber);
  }
  return updated;
}

/** The link a token belongs to, if it is active; audits a refusal with its real reason. */
async function activeLinkFor(token: string): Promise<ConsultToken | null> {
  const hash = await hashConsultToken(token);
  const data = recordExpiries(await loadTokens());
  const found = data.find(t => t.tokenHash === hash);
  if (!found) {
    logConsultAuditEvent('consult.link.access_denied', 'Access attempt with an unrecognized consult token.', 'External consultant', null);
    return null;
  }
  const status = resolveConsultTokenStatus(found);
  if (status === 'Revoked') {
    logConsultAuditEvent('consult.link.access_denied', 'Access attempt on a revoked consult link.', found.consultantIdentifier, found.scope.caseAccessionNumber);
    return null;
  }
  if (status === 'Expired') {
    logConsultAuditEvent('consult.link.access_attempt_expired', `Access attempt on an expired consult link (expired ${found.expiresAt}).`, found.consultantIdentifier, found.scope.caseAccessionNumber);
    return null;
  }
  return found;
}

const invalid = <T>(): ServiceResult<T> => ({ ok: false, error: CONSULT_LINK_INVALID });

export const mockConsultTokenService: IConsultTokenService = {
  async issue(draft: NewConsultToken): Promise<ServiceResult<IssuedConsultLink>> {
    if (!draft.scope.caseId) return { ok: false, error: CONSULT_CASE_REQUIRED };
    if (!draft.consultantIdentifier.trim()) return { ok: false, error: CONSULTANT_REQUIRED };
    // Batch 515 (PS-290): issuing a link that lets an outside consultant see the case needs its own permission.
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce('case:consult-link:issue', { caseId: draft.scope.caseId })).allowed) return { ok: false, error: CONSULT_LINK_NOT_PERMITTED };

    const now = new Date();
    const token = generateConsultToken();
    const newToken: ConsultToken = {
      id: newId('consult-tok'),
      tokenHash: await hashConsultToken(token),
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

    const data = await loadTokens();
    data.push(newToken);
    persistTokens(data);

    logConsultAuditEvent(
      'consult.link.created',
      `Consult link created for ${draft.scope.slideIds?.length ? `${draft.scope.slideIds.length} slide(s)` : 'full case'}, consultant="${newToken.consultantIdentifier}"${newToken.consultantOrganization ? ` (${newToken.consultantOrganization})` : ''}, expires ${newToken.expiresAt}.`,
      draft.issuedByName,
      draft.scope.caseAccessionNumber
    );

    return { ok: true, data: { ...newToken, token } };
  },

  async getByCaseId(caseId: string): Promise<ServiceResult<ConsultToken[]>> {
    const data = recordExpiries(await loadTokens());
    return { ok: true, data: newestConsultLinksFirst(data.filter(t => t.scope.caseId === caseId)) };
  },

  async listAll(): Promise<ServiceResult<ConsultToken[]>> {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce('audit:consult-links:view')).allowed) return { ok: false, error: CONSULT_LINK_NOT_PERMITTED };
    return { ok: true, data: newestConsultLinksFirst(recordExpiries(await loadTokens())) };
  },

  async resolve(token: string): Promise<ServiceResult<ConsultToken>> {
    const found = await activeLinkFor(token);
    return found ? { ok: true, data: found } : invalid();
  },

  async revoke(id: ID): Promise<ServiceResult<ConsultToken>> {
    const data = await loadTokens();
    const idx = data.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: 'NOT_FOUND' };
    // Batch 515 (PS-290): and so does revoking one.
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce('case:consult-link:revoke', { caseId: data[idx].scope.caseId })).allowed) return { ok: false, error: CONSULT_LINK_NOT_PERMITTED };
    if (resolveConsultTokenStatus(data[idx]) !== 'Active') return { ok: false, error: CONSULT_LINK_NOT_ACTIVE };

    // Batch 522: the person revoking is whoever is signed in, not a value the screen passes.
    const profile = readSessionProfile();
    const actorId = profile?.id ?? 'unknown';
    const actorName = profile?.name || actorId;
    const updated: ConsultToken = { ...data[idx], isActive: false, revokedAt: new Date().toISOString(), revokedByUserId: actorId, revokedByName: actorName };
    data[idx] = updated;
    persistTokens(data);

    logConsultAuditEvent('consult.link.revoked', `Consult link revoked (consultant="${updated.consultantIdentifier}").`, actorName, updated.scope.caseAccessionNumber);
    return { ok: true, data: updated };
  },

  async openConsult(token: string) {
    const link = await activeLinkFor(token);
    if (!link) return invalid();
    // The token is the authorization for this one read, so the case comes from
    // the case store directly, not through the internal session's access check
    // (caseRouter), which has no notion of an outside consultant.
    const caseRecord = await mockCaseService.getCase(link.scope.caseId).catch(() => null);
    if (!caseRecord) return invalid();

    const data = await loadTokens();
    const idx = data.findIndex(t => t.id === link.id);
    const viewed: ConsultToken = { ...link, accessCount: link.accessCount + 1, lastAccessedAt: new Date().toISOString() };
    if (idx !== -1) { data[idx] = viewed; persistTokens(data); }
    logConsultAuditEvent('consult.link.accessed', `Consult link viewed by consultant="${viewed.consultantIdentifier}" (view #${viewed.accessCount}).`, viewed.consultantIdentifier, viewed.scope.caseAccessionNumber);

    return { ok: true, data: buildConsultCaseView(caseRecord, viewed, loadOpinions()) };
  },

  async submitOpinion(token: string, draft: ConsultOpinionDraft): Promise<ServiceResult<ConsultOpinion>> {
    const link = await activeLinkFor(token);
    if (!link) return invalid();
    const problem = consultOpinionProblem(draft, loadOpinions().filter(o => o.tokenId === link.id));
    if (problem) return { ok: false, error: problem };

    const newOpinion: ConsultOpinion = {
      id: newId('consult-op'),
      tokenId: link.id,
      caseId: link.scope.caseId,
      consultantIdentifier: link.consultantIdentifier,
      ...(draft.diagnosticCategory?.trim() ? { diagnosticCategory: draft.diagnosticCategory.trim() } : {}),
      signedStatus: draft.signedStatus,
      opinionText: draft.opinionText.trim(),
      submittedAt: new Date().toISOString(),
    };
    const data = loadOpinions();
    data.push(newOpinion);
    persistOpinions(data);

    logConsultAuditEvent(
      'consult.opinion.submitted',
      `External consult opinion submitted (status=${newOpinion.signedStatus}${newOpinion.diagnosticCategory ? `, category="${newOpinion.diagnosticCategory}"` : ''}).`,
      link.consultantIdentifier,
      link.scope.caseAccessionNumber
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
    const tokenRecord = (await loadTokens()).find(t => t.id === opinion.tokenId);
    logConsultAuditEvent(
      'consult.opinion.assessed',
      `External consult opinion from consultant="${opinion.consultantIdentifier}" assessed: ${input.assessment}${released ? ' (report already released)' : ''}.${input.note?.trim() ? ` ${input.note.trim()}` : ''}`,
      actor.userId,
      tokenRecord?.scope.caseAccessionNumber ?? null,
    );
    return { ok: true, data: updated };
  },
};
