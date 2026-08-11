// src/api/caseFlagsApi.ts
// Flag operations — delegates to mockCaseService which now persists to localStorage.
// Replace with real API calls when the backend is ready.

import { CaseWithFlags, FlagInstance } from '../types/flagsRuntime';
import { mockCaseService } from '../services/cases/mockCaseService';

// ── Real, confirmed architectural conflict — found during a folder
// review, documented rather than silently fixed with a guess. Two
// independent flag-tracking systems both read/write the same
// Case.caseFlags/Specimen.specimenFlags fields, using genuinely
// incompatible shapes:
//   - This file (and its consumer, pages/Synoptic/useSynopticFlags.ts,
//     confirmed to read the data back the same way) treats those
//     fields as FlagInstance[] — an audit-style "who applied which
//     flag definition, when" record (flagDefinitionId, appliedAt,
//     appliedBy, source, deletedAt/deletedBy).
//   - The real, declared type on Case/Specimen (types/case/CaseFlag.ts,
//     types/case/Specimen.ts's SpecimenFlag) is CaseFlag[]/
//     SpecimenFlag[] instead — a flag-DEFINITION record (id, label,
//     color, lisCode), no application/audit fields at all. This is
//     the shape the Contribution Dashboard's Quality Flags tile and
//     SearchPage.tsx's computational-flags filter both read, expecting
//     .label/.lisCode.
// Neither system is aware of the other. Whichever one touches a given
// case's flags last effectively corrupts the data for the other's
// perspective — a flag applied through the Synoptic Report page's
// flag manager (this file) would show up with an undefined .label
// wherever the Quality Flags/Search systems expect one, and vice
// versa. Confirmed both code paths are genuinely reachable, not dead.
// This needs a real architectural decision (which model is
// authoritative, or whether these belong on two separate fields) —
// not something to guess at here. The `as any` casts below are
// necessary given the current, unresolved state, not laziness —
// removing them without resolving the underlying conflict just moves
// the same real type error around instead of fixing anything.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyFlagPayload {
  caseId: string;
  flagDefinitionId: string;
  specimenId?: string;
}

export interface DeleteFlagPayload {
  caseId: string;
  flagInstanceId: string;
  specimenId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInstance(flagDefinitionId: string): FlagInstance {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    flagDefinitionId,
    appliedAt: new Date().toISOString(),
    appliedBy: 'current-user',
    source: 'product',
    deletedAt: null,
    deletedBy: null,
  };
}

function toCaseWithFlags(c: any): CaseWithFlags {
  return {
    id: c.id,
    accession: c.accession?.fullAccession ?? c.accession?.accessionNumber ?? c.accession ?? c.id,
    flags: Array.isArray(c.caseFlags) ? c.caseFlags : [],
    specimens: (c.specimens ?? []).map((sp: any) => ({
      ...sp,
      flags: Array.isArray(sp.specimenFlags) ? sp.specimenFlags : [],
    })),
  };
}

// ─── applyFlags ───────────────────────────────────────────────────────────────

export async function applyFlags(payload: ApplyFlagPayload): Promise<CaseWithFlags> {
  const c = await mockCaseService.getCase(payload.caseId);
  if (!c) throw new Error(`Case ${payload.caseId} not found`);

  const inst = makeInstance(payload.flagDefinitionId);

  if (payload.specimenId) {
    const specimens = (c.specimens ?? []).map((sp: any) => {
      if (sp.id !== payload.specimenId) return sp;
      const flags: FlagInstance[] = Array.isArray(sp.specimenFlags) ? sp.specimenFlags : [];
      if (flags.some(f => f.flagDefinitionId === payload.flagDefinitionId && !f.deletedAt)) return sp;
      return { ...sp, specimenFlags: [...flags, inst] };
    });
    await mockCaseService.updateCase(payload.caseId, { specimens } as any);
  } else {
    const flags: FlagInstance[] = Array.isArray((c as any).caseFlags) ? (c as any).caseFlags : [];
    if (!flags.some(f => f.flagDefinitionId === payload.flagDefinitionId && !f.deletedAt)) {
      await mockCaseService.updateCase(payload.caseId, { caseFlags: [...flags, inst] } as any);
    }
  }

  const updated = await mockCaseService.getCase(payload.caseId);
  return toCaseWithFlags(updated);
}

// ─── deleteFlags ──────────────────────────────────────────────────────────────

export async function deleteFlags(payload: DeleteFlagPayload): Promise<CaseWithFlags> {
  const c = await mockCaseService.getCase(payload.caseId);
  if (!c) throw new Error(`Case ${payload.caseId} not found`);

  const now = new Date().toISOString();

  if (payload.specimenId) {
    const specimens = (c.specimens ?? []).map((sp: any) => {
      if (sp.id !== payload.specimenId) return sp;
      const flags: FlagInstance[] = Array.isArray(sp.specimenFlags) ? sp.specimenFlags : [];
      return {
        ...sp,
        specimenFlags: flags.map(f =>
          f.id === payload.flagInstanceId
            ? { ...f, deletedAt: now, deletedBy: 'current-user' }
            : f
        ),
      };
    });
    await mockCaseService.updateCase(payload.caseId, { specimens } as any);
  } else {
    const flags: FlagInstance[] = Array.isArray((c as any).caseFlags) ? (c as any).caseFlags : [];
    await mockCaseService.updateCase(payload.caseId, {
      caseFlags: flags.map(f =>
        f.id === payload.flagInstanceId
          ? { ...f, deletedAt: now, deletedBy: 'current-user' }
          : f
      ),
    } as any);
  }

  const updated = await mockCaseService.getCase(payload.caseId);
  return toCaseWithFlags(updated);
}
