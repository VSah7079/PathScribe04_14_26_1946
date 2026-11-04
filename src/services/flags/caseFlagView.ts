// src/services/flags/caseFlagView.ts
// Batch 452 (PS-57): a case as the Flag Manager sees it (CaseWithFlags),
// built from the one stored flag shape (Case.caseFlags /
// Specimen.specimenFlags, FlagInstance[]). Replaces the untyped
// `(freshCase as any).caseFlags` reads in pages/Synoptic/useSynopticFlags.ts
// and the `any` mapper in api/caseFlagsApi.ts. Pure.
import type { Case } from '@/types/case/Case';
import type { CaseWithFlags, FlagInstance } from '@/types/flagsRuntime';

type CaseForFlagView = Pick<Case, 'id' | 'caseFlags' | 'specimens'> & { accession?: Case['accession'] | string };

const isActive = (f: FlagInstance) => !!f.flagDefinitionId && !f.deletedAt;

/** The accession text shown in the Flag Manager header. */
export function flagViewAccession(c: CaseForFlagView, fallback: string): string {
  const a = c.accession;
  if (typeof a === 'string') return a || fallback;
  return a?.fullAccession || a?.accessionNumber || fallback;
}

/** The case with its flags. `activeOnly` leaves out removed flags (and any
 *  record with no definition id), which is what the Flag Manager opens with;
 *  without it every record is kept, as the apply/remove results are. */
export function toCaseWithFlags(c: CaseForFlagView, opts: { activeOnly?: boolean; accessionFallback?: string } = {}): CaseWithFlags {
  const keep = (flags: FlagInstance[] | undefined) => {
    const list = Array.isArray(flags) ? flags : [];
    return opts.activeOnly ? list.filter(isActive) : list;
  };
  return {
    id: c.id,
    accession: flagViewAccession(c, opts.accessionFallback ?? c.id),
    flags: keep(c.caseFlags),
    specimens: (c.specimens ?? []).map(sp => ({ ...sp, flags: keep(sp.specimenFlags) })),
  };
}
