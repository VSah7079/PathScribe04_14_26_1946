// src/hooks/useQaCaseScope.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 544 (PS-539, Pete, Oct 13, 2026): single-facility QA exports. Holds
// the scope a QA report is filtered and exported by (enterprise-wide, one
// facility, one organisation) and loads the cases the scope places rows by,
// as CountersignTurnaroundTab does. The decisions are in
// services/qualityAssurance/qaScopeRows.ts.
//
//   - Someone assigned to one facility opens on that facility (defaultQaScope),
//     until they pick another scope.
//   - A viewer allowed cross-tenant QA data reads every case for this, and
//     that read is audited here (qa.cross_tenant_access_executed); anyone
//     else gets the cases case access control gives them.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auditService, authorizationService } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { getSessionUser, canViewCrossTenantQaData } from '@/services/auth/caseAccessControl';
import type { QaScope } from '@/services/qualityAssurance/qaScope';
import { qaScopeContext } from '@/services/qualityAssurance/qaExport';
import {
  defaultQaScope, qaExportFilename, qaRowFacilityIds, qaScopeCaseMap, scopeQaRows,
  type QaRowPlace, type QaScopeCase,
} from '@/services/qualityAssurance/qaScopeRows';

export function useQaCaseScope() {
  const [scope, setScopeState] = useState<QaScope>({ level: 'enterprise' });
  const [cases, setCases] = useState<ReadonlyMap<string, QaScopeCase>>(new Map());
  const chosen = useRef(false);

  const setScope = useCallback((next: QaScope) => { chosen.current = true; setScopeState(next); }, []);

  useEffect(() => {
    let cancelled = false;
    const session = getSessionUser();
    const crossTenant = canViewCrossTenantQaData(session);
    if (crossTenant) {
      auditService.logEvent({
        type: 'system', event: 'qa.cross_tenant_access_executed',
        detail: `Cross-tenant QA access: case list for the QA facility scope, user ${session?.id ?? 'unknown'}`,
        user: session?.id ?? 'unknown', caseId: null, confidence: null,
      }).catch(() => {});
    }
    void caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: crossTenant }).then(res => {
      if (!cancelled && res.ok) setCases(qaScopeCaseMap(res.data));
    });
    void authorizationService.snapshot().then(snap => {
      if (!cancelled && !chosen.current) setScopeState(defaultQaScope(snap.subject?.facilityIds ?? []));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return useMemo(() => ({
    scope,
    setScope,
    /** The capability context of an export in this scope (one facility, or all). */
    context: qaScopeContext(scope),
    filter: <T,>(rows: readonly T[], placeOf: (row: T) => QaRowPlace) => scopeQaRows(rows, placeOf, cases, scope),
    facilityIds: <T,>(rows: readonly T[], placeOf: (row: T) => QaRowPlace) => qaRowFacilityIds(rows, placeOf, cases),
    filename: (base: string) => qaExportFilename(base, scope),
  }), [scope, setScope, cases]);
}
