// Batch 441: the Case Team save, checked.
import { describe, it, expect, vi } from 'vitest';
import { addAssigneeToTeam, caseTeamUpdates, saveCaseTeam, withAssigneeOnTeam } from './saveCaseTeam';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';
import { syncPrimaryAssignee } from './caseAssignmentSync';
import type { Case, CaseParticipant } from '@/types/case/Case';

const roles = [{ id: 'pathologist', name: 'Pathologist' }, { id: 'cytotechnologist', name: 'Cytotechnologist' }];
const staff = [
  { id: 'P1', roles: ['Pathologist'], firstName: 'Pat', lastName: 'One' },
  { id: 'P2', roles: ['Pathologist'], firstName: 'Pat', lastName: 'Two' },
  { id: 'CT1', roles: ['Cytotechnologist'], firstName: 'Cy', lastName: 'Tech' },
];
const p = (staffId: string, t: string[]): CaseParticipant => ({ staffId, staffName: staffId, source: 'manual', participationTypeIds: t, addedBy: 'x', addedAt: '2026-10-02T00:00:00Z', status: 'active' });
const caseOf = (assignedTo: string, participants?: CaseParticipant[]) => ({ id: 'C1', createdAt: '2026-10-01T00:00:00Z', order: { assignedTo }, participants } as unknown as Case);

// PS-71 (Batch 458): a versioned fake store (getCase + updateCase with expectedVersion).
function deps(allowed = true, stored?: Case) {
  const writes: Array<{ caseId: string; updates: Partial<Case>; expectedVersion: number }> = [];
  const box = { saved: stored };
  return {
    writes,
    box,
    deps: {
      enforce: vi.fn(async () => ({ allowed })),
      listStaff: async () => staff,
      listRoles: async () => roles,
      listParticipationTypes: async () => [],
      getCase: async () => box.saved,
      updateCase: async (caseId: string, updates: Partial<Case>, expectedVersion: number) => {
        writes.push({ caseId, updates, expectedVersion });
        const v = box.saved?.version ?? 0;
        if (v !== expectedVersion) throw new ConcurrencyConflictError(caseId, expectedVersion, v);
        box.saved = { ...box.saved!, ...updates, version: v + 1 };
      },
    },
  };
}

describe('saveCaseTeam', () => {
  it('needs case:team:manage for the case, and writes nothing without it', async () => {
    const { deps: d, writes } = deps(false, caseOf('P1', [p('P1', ['primary'])]));
    expect(await saveCaseTeam({ caseData: caseOf('P1', [p('P1', ['primary'])]), participants: [p('P1', ['primary'])], updatedBy: 'P1' }, d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(d.enforce).toHaveBeenCalledWith('case:team:manage', { caseId: 'C1' });
    expect(writes).toEqual([]);
  });

  it('refuses a cytotech in a pathologist slot (Pete: "Cytotechs can not be selected for Pathologist roles")', async () => {
    const { deps: d, writes } = deps(true, caseOf('P1', [p('P1', ['primary'])]));
    const res = await saveCaseTeam({ caseData: caseOf('P1', [p('P1', ['primary'])]), participants: [p('P1', ['primary']), p('CT1', ['consultant'])], updatedBy: 'P1' }, d);
    expect(res).toEqual({ ok: false, reason: 'cytotechPathologistType', staffName: 'CT1', typeId: 'consultant' });
    expect(writes).toEqual([]);
  });

  it('a cytotech as cytotechnologist is fine; a new primary moves order.assignedTo', async () => {
    const { deps: d, writes } = deps(true, caseOf('P1', [p('P1', ['primary'])]));
    const res = await saveCaseTeam({ caseData: caseOf('P1', [p('P1', ['primary'])]), participants: [p('P2', ['primary']), p('CT1', ['cytotechnologist'])], updatedBy: 'P1' }, d);
    expect(res).toMatchObject({ ok: true, version: 1 });
    expect(writes[0].updates.order?.assignedTo).toBe('P2');
    expect(writes[0].expectedVersion).toBe(0);
  });

  it('PS-71: a save conflicting with an unrelated change is rebuilt from the newer case; the other change survives', async () => {
    const opened = caseOf('P1', [p('P1', ['primary'])]);
    const { deps: d, writes, box } = deps(true, opened);
    // Someone else saves another part of the case between our read and our write.
    let first = true;
    const updateCase = d.updateCase;
    d.updateCase = async (id, u, v) => {
      if (first) { first = false; box.saved = { ...box.saved!, diagnostic: { finalDiagnosis: 'theirs' }, version: 1 } as unknown as Case; }
      return updateCase(id, u, v);
    };
    const res = await saveCaseTeam({ caseData: opened, participants: [p('P1', ['primary']), p('P2', ['consultant'])], updatedBy: 'P1' }, d);
    expect(res).toMatchObject({ ok: true, version: 2 });
    expect(writes.map(w => w.expectedVersion)).toEqual([0, 1]);
    expect((box.saved as any).diagnostic).toEqual({ finalDiagnosis: 'theirs' });
    expect(box.saved!.participants?.map(x => x.staffId)).toEqual(['P1', 'P2']);
  });

  it('PS-71: never saves over a team someone else changed since the modal opened', async () => {
    const opened = caseOf('P1', [p('P1', ['primary'])]);
    const { deps: d, writes } = deps(true, { ...caseOf('P1', [p('P1', ['primary']), p('P3', ['consultant'])]), version: 4 } as Case);
    const res = await saveCaseTeam({ caseData: opened, participants: [p('P1', ['primary']), p('P2', ['consultant'])], updatedBy: 'P1' }, d);
    expect(res).toEqual({ ok: false, reason: 'teamChanged' });
    expect(writes).toEqual([]);
  });

  it('without a change of primary, only the participants are written', () => {
    const team = [p('P1', ['primary']), p('CT1', ['cytotechnologist'])];
    expect(caseTeamUpdates(caseOf('P1', team), team, 'P1')).toEqual({ participants: team });
  });
});

describe('addAssigneeToTeam (PS-71: the modal-open write, versioned)', () => {
  it('adds the assignee from the newest case, with its version; nothing when already there', async () => {
    const { deps: d, writes, box } = deps(true, { ...caseOf('P1'), version: 2 } as Case);
    const r = await addAssigneeToTeam('C1', staff, roles, d);
    expect(r.ok).toBe(true);
    expect(writes[0].expectedVersion).toBe(2);
    expect(box.saved!.participants?.[0].staffId).toBe('P1');
    expect((await addAssigneeToTeam('C1', staff, roles, d)).ok).toBe(false);
    expect(writes).toHaveLength(1);
  });
});

describe('withAssigneeOnTeam (the team as the modal opens it)', () => {
  it('adds a pathologist assignee as primary, and a cytotech assignee as cytotechnologist (before Batch 441: primary)', () => {
    expect(withAssigneeOnTeam(caseOf('P1'), staff, roles)?.[0].participationTypeIds).toEqual(['primary']);
    expect(withAssigneeOnTeam(caseOf('CT1'), staff, roles)?.[0].participationTypeIds).toEqual(['cytotechnologist']);
  });
  it('adds nothing when the assignee is already on the team, or unknown', () => {
    expect(withAssigneeOnTeam(caseOf('P1', [p('P1', ['primary'])]), staff, roles)).toBeNull();
    expect(withAssigneeOnTeam(caseOf('X9'), staff, roles)).toBeNull();
  });
});

describe('syncPrimaryAssignee with a cytotech primary (possible before Batch 441)', () => {
  it('demotes the cytotech to cytotechnologist, not the co-signer fallback', () => {
    const c = caseOf('CT1', [p('CT1', ['primary'])]);
    expect(syncPrimaryAssignee(c, 'P1', 'P1', 'P1', id => id === 'CT1').participants?.[0].participationTypeIds).toEqual(['cytotechnologist']);
    expect(syncPrimaryAssignee(c, 'P1', 'P1', 'P1').participants?.[0].participationTypeIds).toEqual(['attending']);
  });
});
