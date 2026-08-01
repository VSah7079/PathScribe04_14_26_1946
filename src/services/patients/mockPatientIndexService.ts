// src/services/patients/mockPatientIndexService.ts
import type {
  IPatientIndexService,
  MasterPatientRecord,
  PatientMatchCandidate,
  PatientMatchResult,
} from './IPatientIndexService';
import { caseRouter } from '../cases/CaseRouter';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import { mockAuditService } from '../auditlog/mockAuditService';
import { getSessionUser } from '../auth/caseAccessControl';

const STORAGE_KEY = 'pathscribe_mpi_records';
const delay = (ms = 60) => new Promise(res => setTimeout(res, ms));

function loadRecords(): MasterPatientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecords(records: MasterPatientRecord[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { /* non-critical */ }
}

function normaliseName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function namesMatch(a: { firstName: string; lastName: string }, b: { firstName: string; lastName: string }): boolean {
  return normaliseName(a.firstName) === normaliseName(b.firstName)
    && normaliseName(a.lastName) === normaliseName(b.lastName);
}

let idCounter = 0;
function generatePatientId(): string {
  idCounter += 1;
  return `MPI-${Date.now().toString(36)}-${idCounter}`;
}

export const mockPatientIndexService: IPatientIndexService = {
  async resolveOrCreatePatient(candidate: PatientMatchCandidate): Promise<PatientMatchResult> {
    await delay();
    const records = loadRecords();

    // Scoped strictly to this organisation — see the interface's own
    // doc comment on why this is MPI, not EMPI. A record belonging to a
    // different organisationId is never a valid match, full stop,
    // regardless of how well anything else lines up.
    const inOrg = records.filter(r => r.organisationId === candidate.organisationId);

    const mrnMatches = inOrg.filter(r => r.mrn === candidate.mrn);

    if (mrnMatches.length === 1) {
      const r = mrnMatches[0];
      const dobMatches = r.dateOfBirth === candidate.dateOfBirth;
      const nameMatch = namesMatch(r, candidate);
      if (dobMatches && nameMatch) {
        // Real two-identifier confirmation (MRN + DOB, plus name lining
        // up too) — confidently the same person, reuse their real,
        // persistent id.
        return { outcome: 'matched', patientId: r.id };
      }
      // MRN matches but the second identifier doesn't — exactly the
      // scenario the Joint Commission's two-identifier requirement
      // exists to catch: a typo'd or reused MRN pointing at the wrong
      // person's history. Never silently merge, never silently treat
      // as a new unrelated person either — create a real, flagged
      // provisional record instead.
      return createProvisional(records, candidate, [r.id],
        `MRN ${candidate.mrn} matches an existing record, but ${!dobMatches ? 'date of birth' : 'name'} does not.`);
    }

    if (mrnMatches.length > 1) {
      // Data-quality reality, not a hypothetical: the same MRN string
      // legitimately ends up on more than one record over time (re-used
      // numbers, merges gone wrong upstream in the LIS, etc.). Never
      // guess which one — flag with every candidate for a real review.
      return createProvisional(records, candidate, mrnMatches.map(r => r.id),
        `${mrnMatches.length} existing records share MRN ${candidate.mrn} — cannot determine which, if any, is this patient.`);
    }

    // No MRN match at all. Before assuming this is a genuinely new
    // person, check for a name+DOB match under a DIFFERENT MRN — a
    // real, common scenario (MRN re-issued, corrected, or the patient
    // registered under a different number at this same organisation).
    // Silently creating a second identity here would be exactly the
    // kind of duplicate a real MPI exists to prevent.
    const nameDobMatches = inOrg.filter(r => r.dateOfBirth === candidate.dateOfBirth && namesMatch(r, candidate));
    if (nameDobMatches.length > 0) {
      return createProvisional(records, candidate, nameDobMatches.map(r => r.id),
        `Name and date of birth match ${nameDobMatches.length} existing record(s) under a different MRN (${nameDobMatches.map(r => r.mrn).join(', ')}).`);
    }

    // Confidently nothing existing matches — a real new person in this
    // organisation's index.
    const now = new Date().toISOString();
    const created: MasterPatientRecord = {
      id: generatePatientId(),
      organisationId: candidate.organisationId,
      mrn: candidate.mrn,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      dateOfBirth: candidate.dateOfBirth,
      createdAt: now,
      updatedAt: now,
      sourceAccession: candidate.sourceAccession,
    };
    saveRecords([...records, created]);
    return { outcome: 'created', patientId: created.id };
  },

  async getById(patientId: string): Promise<MasterPatientRecord | null> {
    await delay();
    return loadRecords().find(r => r.id === patientId) ?? null;
  },

  async listPendingReview(organisationId: string): Promise<MasterPatientRecord[]> {
    await delay();
    return loadRecords().filter(r => r.organisationId === organisationId && r.needsReview === true);
  },

  async confirmAsNewPatient(patientId: string): Promise<void> {
    await delay();
    const records = loadRecords();
    const idx = records.findIndex(r => r.id === patientId);
    if (idx === -1) return;
    const priorCandidateCount = records[idx].reviewCandidateIds?.length ?? 0;
    records[idx] = { ...records[idx], needsReview: false, reviewReason: undefined, reviewCandidateIds: undefined, updatedAt: new Date().toISOString() };
    saveRecords(records);
    const session = getSessionUser();
    mockAuditService.logEvent({
      type: 'system',
      event: 'mpi.match.confirmed_new',
      detail: `Provisional patient record ${patientId} confirmed as a genuinely new patient by a real reviewer, dismissing ${priorCandidateCount} candidate match(es).`,
      user: session?.id ?? 'unknown',
      caseId: records[idx].sourceAccession ?? null,
      confidence: null,
    }).catch(() => {});
  },

  async mergeIntoExistingPatient(provisionalPatientId: string, confirmedPatientId: string): Promise<{ casesRepointed: number }> {
    await delay();
    const records = loadRecords();
    const provIdx = records.findIndex(r => r.id === provisionalPatientId);
    if (provIdx === -1) throw new Error(`Cannot merge — provisional patient ${provisionalPatientId} not found`);
    const target = records.find(r => r.id === confirmedPatientId);
    if (!target) throw new Error(`Cannot merge — target patient ${confirmedPatientId} not found`);

    // The real, load-bearing part of a merge: every case already
    // created under the provisional identity needs to actually point at
    // the confirmed one, or the merge is cosmetic — the patient's own
    // history would still be split across two ids in every case view,
    // exactly the problem this whole service exists to prevent.
    const allCases = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true } as any);
    const toRepoint = allCases.ok ? (allCases.data as any[]).filter(c => c?.patient?.id === provisionalPatientId) : [];

    let casesRepointed = 0;
    for (const c of toRepoint) {
      const patch = { patient: { ...c.patient, id: confirmedPatientId } };
      try {
        await caseRouter.updateCase(c.id, patch as any, c.version);
        casesRepointed++;
      } catch (e) {
        if (e instanceof ConcurrencyConflictError) {
          // Someone else saved this exact case between the fetch above
          // and this write — genuinely rare for a rarely-touched merge
          // operation, but real. Retry once against the fresh version
          // rather than silently skip this case out of the merge.
          try {
            await caseRouter.updateCase(c.id, patch as any, e.actualVersion);
            casesRepointed++;
          } catch {
            // Still failed — leave this one case unrepointed rather than
            // fail the whole merge; surfaced via the return count so the
            // caller can see the merge was partial, not silently assume
            // completeness.
          }
        }
      }
    }

    records[provIdx] = {
      ...records[provIdx],
      needsReview: false,
      mergedInto: confirmedPatientId,
      mergedAt: new Date().toISOString(),
    };
    saveRecords(records);
    const session = getSessionUser();
    mockAuditService.logEvent({
      type: 'system',
      event: 'mpi.match.merged',
      detail: `Provisional patient record ${provisionalPatientId} merged into confirmed record ${confirmedPatientId} by a real reviewer — ${casesRepointed} case(s) repointed.`,
      user: session?.id ?? 'unknown',
      caseId: records[provIdx].sourceAccession ?? null,
      confidence: null,
    }).catch(() => {});
    return { casesRepointed };
  },
};

function createProvisional(
  existing: MasterPatientRecord[],
  candidate: PatientMatchCandidate,
  candidateIds: string[],
  reason: string,
): PatientMatchResult {
  const now = new Date().toISOString();
  const provisional: MasterPatientRecord = {
    id: generatePatientId(),
    organisationId: candidate.organisationId,
    mrn: candidate.mrn,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    dateOfBirth: candidate.dateOfBirth,
    createdAt: now,
    updatedAt: now,
    needsReview: true,
    reviewReason: reason,
    reviewCandidateIds: candidateIds,
    sourceAccession: candidate.sourceAccession,
  };
  saveRecords([...existing, provisional]);
  // Real audit event for the DETECTION itself, distinct from whatever
  // resolution eventually follows — a complete trail needs both "this
  // was flagged" and "this was resolved," the same reasoning already
  // applied to case.write.conflict in services/cases/AuditLogger.ts.
  // PHI-safe per AuditLog.detail's own documented constraint: references
  // the opaque provisional/candidate ids and candidate count only, never
  // the actual name/MRN/DOB that's fine to show an authorized reviewer
  // on screen but not fine to write into a shared audit log.
  //
  // caseId is genuinely populated here, not null — found via a direct
  // question about whether these events actually show up on System
  // Audit: AuditLogPage.tsx's role-based filter only shows a
  // pathologist-role user events with a real caseId, or ones whose user
  // field exactly matches their own stored name/email. A null caseId
  // plus a session id (not a name/email) would have made every one of
  // these events silently invisible to the exact people accessioning
  // the cases that triggered them.
  const session = getSessionUser();
  mockAuditService.logEvent({
    type: 'system',
    event: 'mpi.match.ambiguous',
    detail: `Ambiguous patient match flagged for review — provisional record ${provisional.id}, ${candidateIds.length} candidate record(s) in organisation ${candidate.organisationId}.`,
    user: session?.id ?? 'system',
    caseId: candidate.sourceAccession ?? null,
    confidence: null,
  }).catch(() => {});
  return { outcome: 'ambiguous', patientId: provisional.id, candidatePatientIds: candidateIds, reason };
}
