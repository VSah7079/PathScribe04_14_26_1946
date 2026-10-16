// src/services/qualityAssurance/qaScopeRows.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 544 (PS-539, Pete, Oct 13, 2026: "QA exports should allow
// single-facility export instead of forcing 'all facilities'"). Which rows of
// a QA report belong to the scope the user picked, for the reports that had
// no scope picker and always exported, and were checked, as "all facilities".
// Pure.
//
// A row is placed by its own facility when it has one (a follow-up, an FPPE
// assignment), otherwise by its case's ordering facility (a QA activity
// record, a deficiency, a billing deficiency), as caseMatchesScope does for
// the tabs that already had a picker. A row whose facility can't be told
// (no facility and no known case) appears only in the enterprise-wide view:
// it is never put in a facility it may not belong to.
// ─────────────────────────────────────────────────────────────────────────────
import { caseMatchesScope, type QaScope } from './qaScope';

/** The fields of a case the scope needs (cases come from caseRouter.getAll, loosely typed). */
export interface QaScopeCase {
  order?: { facilityId?: string; clientId?: string };
  originHospitalId?: string;
}

/** Where a QA row sits: its own facility, its case, or both. */
export interface QaRowPlace {
  caseId?: string | null;
  facilityId?: string | null;
}

export function inQaScope(place: QaRowPlace, cases: ReadonlyMap<string, QaScopeCase>, scope: QaScope): boolean {
  if (scope.level === 'enterprise') return true;
  const c = place.caseId ? cases.get(place.caseId) : undefined;
  // An organisation is found from the case (its origin hospital): a row with
  // only a facility can't be placed in one, as facilities carry no
  // organisation. Tabs with such rows offer facilities only (FPPE).
  if (scope.level === 'client') {
    const facility = place.facilityId || c?.order?.facilityId || c?.order?.clientId;
    return !!facility && facility === scope.clientId;
  }
  return !!c && caseMatchesScope(c, scope);
}

export function scopeQaRows<T>(rows: readonly T[], placeOf: (row: T) => QaRowPlace, cases: ReadonlyMap<string, QaScopeCase>, scope: QaScope): T[] {
  if (scope.level === 'enterprise') return [...rows];
  return rows.filter(r => inQaScope(placeOf(r), cases, scope));
}

/** The facilities these rows come from, for the picker (only facilities the viewer has data in are offered). */
export function qaRowFacilityIds<T>(rows: readonly T[], placeOf: (row: T) => QaRowPlace, cases: ReadonlyMap<string, QaScopeCase>): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    const p = placeOf(r);
    const c = p.caseId ? cases.get(p.caseId) : undefined;
    const f = p.facilityId || c?.order?.facilityId || c?.order?.clientId;
    if (f) ids.add(f);
  }
  return [...ids].sort();
}

/**
 * The facilities the picker offers: every active facility for a cross-tenant
 * viewer or a caller that names none, otherwise those the rows come from. The
 * facility in force is always offered, so the picker never shows a different
 * scope from the one the list is filtered by (the QA page shares one scope
 * between tabs with different rows).
 */
export function qaScopeFacilityOptions<F extends { id: string }>(
  facilities: readonly F[], visibleIds: readonly string[] | undefined, crossTenant: boolean, scope: QaScope,
): F[] {
  if (crossTenant || !visibleIds) return [...facilities];
  const current = scope.level === 'client' ? scope.clientId : undefined;
  return facilities.filter(f => visibleIds.includes(f.id) || f.id === current);
}

/**
 * The scope a QA report opens in. Someone assigned to exactly one facility
 * starts on it: "all facilities" would be refused for their export
 * (facilityScopeProblem), so it would only cost them a click. Everyone else
 * starts enterprise-wide, as before.
 */
export function defaultQaScope(assignedFacilityIds: readonly string[]): QaScope {
  return assignedFacilityIds.length === 1 ? { level: 'client', clientId: assignedFacilityIds[0] } : { level: 'enterprise' };
}

/** What a scope is called in an export file name. */
export function scopeLabel(scope: QaScope): string {
  if (scope.level === 'enterprise') return 'enterprise';
  if (scope.level === 'client') return scope.clientId;
  return scope.organisationId;
}

/** `<base>-<scope>-<yyyy-mm-dd>.csv`, the name every scoped QA export uses. */
export function qaExportFilename(base: string, scope: QaScope, now: Date = new Date()): string {
  return `${base}-${scopeLabel(scope)}-${now.toISOString().slice(0, 10)}.csv`;
}

/** The case id → case map the scope reads, from a case list. */
export function qaScopeCaseMap(cases: readonly ({ id: string } & QaScopeCase)[]): Map<string, QaScopeCase> {
  return new Map(cases.map(c => [c.id, { order: c.order, originHospitalId: c.originHospitalId }]));
}
