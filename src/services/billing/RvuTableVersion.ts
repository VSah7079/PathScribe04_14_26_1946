// src/services/billing/RvuTableVersion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, from a direct question: "these things need to be versioned,
// correct?" - yes, and this closes a real gap the original
// codeMapTable.ts (a single, static, unversioned constant) genuinely
// had. CMS updates work RVU values annually, sometimes quarterly (this
// project's own earlier research found CPT 88305's work RVU dropped
// from 0.75 to 0.73 for 2026) - without effective-dated versioning,
// updating the table to a newer year's values would silently rewrite
// the RVU totals of every historical, already-finalized case, not just
// new ones going forward.
//
// A RvuTableVersion is an immutable, effective-dated snapshot of the
// whole code map at a point in time - same "never edit history, only
// add a new record" principle this app already uses for
// ReportVersionRecord/DelegationRecord/ReconciliationRecord. To "fix a
// typo" or apply a new CMS update, an admin creates a NEW version; old
// versions are never edited in place, matching
// ISpecimenDictionaryService.ts's own established principle that
// nothing governed is ever hard-deleted or silently rewritten once it
// may have been relied on by a real case.
// ─────────────────────────────────────────────────────────────────────────────

export interface CptWorkRvuEntry {
  code: string;
  description: string;
  workRvu: number;
}

export interface RvuTableVersion {
  id: string;
  /** Human label, e.g. "CMS 2026 (April update)" - free text, admin-set. */
  label: string;
  /** The real date these values take effect - what
   *  getVersionEffectiveAt() resolves against, NOT the same as
   *  uploadedAt (an admin might upload a version ahead of its real
   *  effective date, or backdate one being entered late). */
  effectiveDate: string;
  /** Real audit trail - who/when this version was actually created. */
  uploadedAt: string;
  uploadedBy: string;
  /** Set only when this version came from a real file upload, not
   *  manual entry - honest provenance, not fabricated for manually-
   *  entered versions. */
  sourceFileName?: string;
  /** Exactly one version is active at a time - the one new,
   *  going-forward calculations use. Older versions stay retrievable
   *  (never deleted) specifically so historical case RVU totals can
   *  still resolve against the real rates that were in effect when
   *  they were actually finalized. */
  isActive: boolean;
  entries: CptWorkRvuEntry[];
}

/** Real fix, the actual reason this needed to be versioned: resolves
 *  which version was genuinely in effect on a given date, not whichever
 *  is marked active today. Pure, synchronous mirror of
 *  mockRvuCodeMapService.ts's getVersionEffectiveAt, taking the already-
 *  fetched versions array directly rather than being async itself -
 *  keeps calculation functions built on top of this pure and testable,
 *  and lets a page fetch all versions once rather than once per case. */
export function resolveVersionEffectiveAt(versions: RvuTableVersion[], isoDate: string): RvuTableVersion | null {
  const target = new Date(isoDate).getTime();
  if (isNaN(target)) return null;
  const candidates = versions
    .filter(v => new Date(v.effectiveDate).getTime() <= target)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return candidates[0] ?? null;
}
