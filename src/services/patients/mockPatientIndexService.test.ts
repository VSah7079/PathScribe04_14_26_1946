// src/services/patients/mockPatientIndexService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

// Real, working in-memory localStorage stub — this test environment is
// plain Node, no browser storage natively available.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { mockPatientIndexService } = await import('./mockPatientIndexService');

const ORG_A = 'ORG-DVMC';
const ORG_B = 'ORG-MFT';

function candidate(overrides: Partial<{ organisationId: string; mrn: string; firstName: string; lastName: string; dateOfBirth: string; sourceAccession: string }> = {}) {
  return {
    organisationId: ORG_A,
    mrn: '100002',
    firstName: 'Robert',
    lastName: 'Jackson',
    dateOfBirth: '1958-03-14',
    sourceAccession: 'S26-1001-BX-001',
    ...overrides,
  };
}

describe('mockPatientIndexService — real matching behavior', () => {
  beforeEach(() => { store.clear(); });

  it('a genuinely new patient (no match on anything) gets created with a real, persistent id', async () => {
    const result = await mockPatientIndexService.resolveOrCreatePatient(candidate());
    expect(result.outcome).toBe('created');
    if (result.outcome === 'created') {
      expect(result.patientId).toMatch(/^MPI-/);
    }
  });

  it('the same person accessioned twice (matching MRN, DOB, and name) reuses the same persistent id — the actual point of an MPI', async () => {
    const first = await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const second = await mockPatientIndexService.resolveOrCreatePatient(candidate());
    expect(first.outcome).toBe('created');
    expect(second.outcome).toBe('matched');
    if (first.outcome === 'created' && second.outcome === 'matched') {
      expect(second.patientId).toBe(first.patientId);
    }
  });

  it('MRN matches but DOB does not — real ambiguous outcome, never silently merged or silently duplicated', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const result = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01' }));
    expect(result.outcome).toBe('ambiguous');
    if (result.outcome === 'ambiguous') {
      expect(result.candidatePatientIds).toHaveLength(1);
      expect(result.reason).toContain('date of birth');
      // Still gets a real, usable id — accessioning can't halt on this
      expect(result.patientId).toMatch(/^MPI-/);
    }
  });

  it('MRN matches but name does not — same real ambiguous handling', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const result = await mockPatientIndexService.resolveOrCreatePatient(candidate({ firstName: 'Different', lastName: 'Person' }));
    expect(result.outcome).toBe('ambiguous');
    if (result.outcome === 'ambiguous') expect(result.reason).toContain('name');
  });

  it('name and DOB match but under a different MRN — flagged, not silently treated as a new person', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const result = await mockPatientIndexService.resolveOrCreatePatient(candidate({ mrn: '999999' }));
    expect(result.outcome).toBe('ambiguous');
    if (result.outcome === 'ambiguous') expect(result.reason).toContain('different MRN');
  });

  it('a provisional ambiguous-match record is real, persisted, and shows up in the review queue', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01' }));
    expect(ambiguous.outcome).toBe('ambiguous');
    const pending = await mockPatientIndexService.listPendingReview(ORG_A);
    expect(pending).toHaveLength(1);
    if (ambiguous.outcome === 'ambiguous') {
      expect(pending[0].id).toBe(ambiguous.patientId);
      expect(pending[0].needsReview).toBe(true);
    }
  });

  it('the exact same MRN+DOB+name combination in a DIFFERENT organisation is a genuinely separate person — MPI, not EMPI', async () => {
    const first = await mockPatientIndexService.resolveOrCreatePatient(candidate({ organisationId: ORG_A }));
    const second = await mockPatientIndexService.resolveOrCreatePatient(candidate({ organisationId: ORG_B }));
    expect(first.outcome).toBe('created');
    expect(second.outcome).toBe('created'); // NOT 'matched' — different org, no cross-tenant matching
    if (first.outcome === 'created' && second.outcome === 'created') {
      expect(second.patientId).not.toBe(first.patientId);
    }
    // And the org-B record must never show up when reviewing org A's queue
    const pendingA = await mockPatientIndexService.listPendingReview(ORG_A);
    expect(pendingA).toHaveLength(0);
  });

  it('name matching is case/whitespace tolerant but not a false positive across genuinely different names', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate({ firstName: 'robert', lastName: '  Jackson  ' }));
    const result = await mockPatientIndexService.resolveOrCreatePatient(candidate({ firstName: 'ROBERT', lastName: 'Jackson' }));
    expect(result.outcome).toBe('matched');
  });

  it('getById returns null for an id that was never created, not a throw', async () => {
    const found = await mockPatientIndexService.getById('MPI-nonexistent');
    expect(found).toBeNull();
  });
});

describe('mockPatientIndexService — real audit trail', () => {
  beforeEach(() => { store.clear(); });

  it('an ambiguous match is audited at the moment it is detected, PHI-safe', async () => {
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01', sourceAccession: 'S26-1002-BX-001' }));
    expect(ambiguous.outcome).toBe('ambiguous');

    const logsRes = await mockAuditService.getAuditLogs({ search: 'mpi.match.ambiguous' } as any);
    expect(logsRes.ok).toBe(true);
    if (!logsRes.ok) return;
    const entries = logsRes.data.filter(l => l.event === 'mpi.match.ambiguous');
    // The audit log's own store isn't reset between tests in this file
    // (it's not backed by the same localStorage stub these tests clear),
    // so earlier tests' ambiguous matches legitimately accumulate here
    // too — at least one real entry for THIS test's match is what
    // matters, not an exact count.
    expect(entries.length).toBeGreaterThanOrEqual(1);
    // PHI-safe: the actual patient name/MRN/DOB must never appear in ANY
    // audit detail, even though they're the exact values used across
    // every test in this file — checking every entry, not just the
    // newest one, is the actually meaningful assertion here.
    entries.forEach(entry => {
      expect(entry.detail).not.toContain('Robert');
      expect(entry.detail).not.toContain('Jackson');
      expect(entry.detail).not.toContain('100002');
    });
    // Real regression test for a genuine bug found via a direct
    // question: caseId must be the real accession number, not null —
    // AuditLogPage.tsx's role filter only shows a pathologist-role user
    // events with a real caseId (or an exact user name/email match), so
    // a null caseId here would make the event invisible to the exact
    // person who accessioned the case that triggered it.
    const own = entries.find(e => e.caseId === 'S26-1002-BX-001');
    expect(own).toBeDefined();
  });

  it('confirmAsNewPatient is audited, PHI-safe, with a real caseId', async () => {
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01', sourceAccession: 'S26-1003-BX-001' }));
    if (ambiguous.outcome !== 'ambiguous') return;

    await mockPatientIndexService.confirmAsNewPatient(ambiguous.patientId);
    const logsRes = await mockAuditService.getAuditLogs({ search: 'mpi.match.confirmed_new' } as any);
    expect(logsRes.ok).toBe(true);
    if (!logsRes.ok) return;
    const entries = logsRes.data.filter(l => l.event === 'mpi.match.confirmed_new');
    const own = entries.find(e => e.detail.includes(ambiguous.patientId));
    expect(own).toBeDefined();
    expect(own?.caseId).toBe('S26-1003-BX-001');
    entries.forEach(entry => expect(entry.detail).not.toContain('Robert'));
  });

  it('mergeIntoExistingPatient is audited with the real repointed-case count, PHI-safe, with a real caseId', async () => {
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    const first = await mockPatientIndexService.resolveOrCreatePatient(candidate());
    if (first.outcome !== 'created') return;
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01', sourceAccession: 'S26-1004-BX-001' }));
    if (ambiguous.outcome !== 'ambiguous') return;

    await mockPatientIndexService.mergeIntoExistingPatient(ambiguous.patientId, first.patientId);
    const logsRes = await mockAuditService.getAuditLogs({ search: 'mpi.match.merged' } as any);
    expect(logsRes.ok).toBe(true);
    if (!logsRes.ok) return;
    const entries = logsRes.data.filter(l => l.event === 'mpi.match.merged');
    const own = entries.find(e => e.detail.includes(ambiguous.patientId) && e.detail.includes(first.patientId));
    expect(own).toBeDefined();
    expect(own?.caseId).toBe('S26-1004-BX-001');
    entries.forEach(entry => {
      expect(entry.detail).not.toContain('Robert');
      expect(entry.detail).not.toContain('100002');
    });
  });
});

describe('mockPatientIndexService — real resolution actions (confirm / merge)', () => {
  beforeEach(() => { store.clear(); });

  it('confirmAsNewPatient clears the review flag on a real provisional record', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01' }));
    expect(ambiguous.outcome).toBe('ambiguous');
    if (ambiguous.outcome !== 'ambiguous') return;

    await mockPatientIndexService.confirmAsNewPatient(ambiguous.patientId);
    const record = await mockPatientIndexService.getById(ambiguous.patientId);
    expect(record?.needsReview).toBe(false);

    const pending = await mockPatientIndexService.listPendingReview(ORG_A);
    expect(pending).toHaveLength(0);
  });

  it('mergeIntoExistingPatient actually repoints real cases from the provisional id to the confirmed one', async () => {
    const { mockCaseService } = await import('../cases/mockCaseService');

    const first = await mockPatientIndexService.resolveOrCreatePatient(candidate());
    expect(first.outcome).toBe('created');
    if (first.outcome !== 'created') return;
    const confirmedId = first.patientId;

    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01' }));
    expect(ambiguous.outcome).toBe('ambiguous');
    if (ambiguous.outcome !== 'ambiguous') return;
    const provisionalId = ambiguous.patientId;

    // A real case, actually created under the provisional identity —
    // the exact scenario a merge needs to fix, not a mocked stand-in.
    const caseId = 'S26-MPI-TEST-001';
    await mockCaseService.createCase({
      id: caseId,
      status: 'draft',
      patient: { id: provisionalId, mrn: '100002', firstName: 'Robert', lastName: 'Jackson' },
    } as any);

    const result = await mockPatientIndexService.mergeIntoExistingPatient(provisionalId, confirmedId);
    expect(result.casesRepointed).toBe(1);

    const casesRes = await mockCaseService.getAll();
    const repointed = casesRes.ok ? (casesRes.data as any[]).find(c => c.id === caseId) : null;
    expect(repointed?.patient?.id).toBe(confirmedId);

    // The provisional record itself is kept, not deleted — a real
    // audit trail of "this id used to exist and where it went."
    const provisionalRecord = await mockPatientIndexService.getById(provisionalId);
    expect(provisionalRecord?.mergedInto).toBe(confirmedId);
    expect(provisionalRecord?.needsReview).toBe(false);

    const pending = await mockPatientIndexService.listPendingReview(ORG_A);
    expect(pending).toHaveLength(0);
  });

  it('merging into a target that does not exist throws rather than silently corrupting state', async () => {
    await mockPatientIndexService.resolveOrCreatePatient(candidate());
    const ambiguous = await mockPatientIndexService.resolveOrCreatePatient(candidate({ dateOfBirth: '1990-01-01' }));
    if (ambiguous.outcome !== 'ambiguous') return;
    await expect(
      mockPatientIndexService.mergeIntoExistingPatient(ambiguous.patientId, 'MPI-does-not-exist')
    ).rejects.toThrow();
  });
});
