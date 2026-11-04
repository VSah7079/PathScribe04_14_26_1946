// src/services/cytology/cytologyHistologyCorrelationLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-156): the live side of the correlation window.
//   getEffectiveHistologyCorrelationRule  the rule for a facility: enterprise
//     settings, the rule for the facility's jurisdiction, the facility's own
//     override.
//   refreshCytologyHistologyCorrelationCandidates  runs the sweep over every
//     case and saves the specimens that gained a candidate. The Cytology
//     Workspace runs it when its worklist loads. In production the API server
//     should run the same sweep when a case is accessioned or received for a
//     patient with an open correlation window (docs/architecture note in
//     services/cytology/README.md).
// ─────────────────────────────────────────────────────────────────────────────

import { browserRunsServerJob } from '../serverJobs/browserStandIns';
import { resolveEffectiveCorrelationRule, type EffectiveCorrelationRule } from './cytologyHistologyCorrelationWindow';
import { sweepCytologyHistologyCorrelationCandidates, type CorrelationSweepChange } from './sweepCytologyHistologyCorrelationCandidates';
import { backfillCytologyHistologyCorrelationWindows, latestSignOutBySpecimen } from './backfillCytologyHistologyCorrelationWindows';
import { saveCaseChangeFrom, type VersionedCaseUpdate } from './cytologyCaseWriteDeps';


export async function getEffectiveHistologyCorrelationRule(facilityId: string | undefined): Promise<EffectiveCorrelationRule> {
  const { cytologyHistologyCorrelationSettingsService } = await import('./cytologyHistologyCorrelationSettingsServiceInstance');
  const { facilityCytologyHistologyCorrelationOverrideService } = await import('./facilityCytologyHistologyCorrelationOverrideServiceInstance');
  const { facilityService } = await import('../facilities/facilityServiceInstance');
  const settings = await cytologyHistologyCorrelationSettingsService.get();
  const facility = facilityId ? await facilityService.getById(facilityId) : null;
  const override = facilityId ? await facilityCytologyHistologyCorrelationOverrideService.getForFacility(facilityId) : null;
  return resolveEffectiveCorrelationRule(
    settings.ok ? settings.data : null,
    facility && facility.ok ? (facility.data as any)?.jurisdiction ?? null : null,
    override && override.ok ? override.data : null,
  );
}

export interface CorrelationSweepDeps {
  getAllCases: () => Promise<{ ok: boolean; data?: any[] } | any[]>;
  getSpecimenDictionary: () => Promise<{ ok: boolean; data?: { id: string; type?: string }[] }>;
  /** PS-71 (Batch 458): each save carries the version of the case it was built from; on a conflict the case is read again. */
  getCase: (caseId: string) => Promise<any | null | undefined>;
  updateCase: VersionedCaseUpdate;
  now: () => Date;
  /** Batch 453: for windows missing on sign-outs from before Batch 452.
   *  Optional; without them no window is backfilled. */
  getSignOutsForCase?: (caseId: string) => Promise<{ specimenId: string; signedAt: string; reviewRecordId: string }[]>;
  getCategoryRanks?: () => Promise<Map<string, number | undefined>>;
  getRule?: (facilityId: string | undefined) => Promise<EffectiveCorrelationRule>;
}

export interface CorrelationRefreshChange extends CorrelationSweepChange {
  /** Specimens that gained a backfilled window (Batch 453). */
  windowsBackfilled?: string[];
}

/** Backfill missing windows, find new candidates, save what changed.
 *  Returns what changed; never throws. */
export async function refreshCytologyHistologyCorrelationCandidates(deps: CorrelationSweepDeps): Promise<CorrelationRefreshChange[]> {
  try {
    const [casesRes, dictRes] = await Promise.all([deps.getAllCases(), deps.getSpecimenDictionary()]);
    let cases = Array.isArray(casesRes) ? casesRes : casesRes.ok ? casesRes.data ?? [] : [];
    const dict = dictRes.ok ? dictRes.data ?? [] : [];
    // PS-71 (Batch 458): the cases as read (before any backfill), for the save's version and base.
    const asRead = new Map<string, any>(cases.map(c => [c?.id, c]));

    // Batch 453: windows for sign-outs from before Batch 452.
    const backfilled = new Map<string, string[]>();
    if (deps.getSignOutsForCase && deps.getCategoryRanks && deps.getRule) {
      const needing = cases.filter(c => (c?.specimens ?? []).some((sp: any) => sp?.cytologyScreening?.finalDiagnosis && !sp.cytologyScreening.histologyCorrelationWindow));
      if (needing.length) {
        const [ranks, signOuts] = await Promise.all([
          deps.getCategoryRanks(),
          Promise.all(needing.map(c => deps.getSignOutsForCase!(c.id).catch(() => []))),
        ]);
        const facilityIds = Array.from(new Set(needing.map(c => c?.order?.facilityId)));
        const rules = new Map(await Promise.all(facilityIds.map(async id => [id, await deps.getRule!(id)] as const)));
        const result = backfillCytologyHistologyCorrelationWindows({
          cases,
          latestSignOutBySpecimenId: latestSignOutBySpecimen(signOuts.flat()),
          rankByCategoryId: ranks,
          ruleFor: id => rules.get(id) ?? resolveEffectiveCorrelationRule(null, null, null),
        });
        cases = result.cases;
        for (const ch of result.changes) backfilled.set(ch.caseId, ch.specimenIds);
      }
    }

    const swept = sweepCytologyHistologyCorrelationCandidates(cases, new Map(dict.map(e => [e.id, e])), deps.now().toISOString());
    const byCase = new Map<string, CorrelationRefreshChange>(swept.map(ch => [ch.caseId, { ...ch }]));
    for (const [caseId, specimenIds] of backfilled) {
      const existing = byCase.get(caseId);
      if (existing) existing.windowsBackfilled = specimenIds;
      else byCase.set(caseId, { caseId, specimens: cases.find(c => c.id === caseId).specimens, added: [], windowsBackfilled: specimenIds });
    }
    // PS-71 (Batch 458): each case is saved with the version it was read at.
    // The change is a merge (the backfilled windows and the new candidates,
    // per specimen), so if the case was saved since, it is re-applied to the
    // newer case and nothing anyone else saved on it is lost. A case that
    // can't be saved is left out of what's returned; the sweep carries on.
    const saved: CorrelationRefreshChange[] = [];
    for (const ch of byCase.values()) {
      const loaded = asRead.get(ch.caseId);
      try {
        const result = await saveCaseChangeFrom(loaded, current => mergeCorrelationChange(current, ch), deps);
        if (result) saved.push(ch);
      } catch (e) {
        console.error(`[cytology] correlation sweep: case ${ch.caseId} not saved:`, e);
      }
    }
    return saved;
  } catch (e) {
    console.error('[cytology] correlation sweep failed:', e);
    return [];
  }
}

/** The windows backfilled and candidates found for one case, applied to the
 *  case as it is now. Null when it already has them all. */
function mergeCorrelationChange(current: any, ch: CorrelationRefreshChange): Record<string, unknown> | null {
  const computedById = new Map<string, any>((ch.specimens ?? []).map((sp: any) => [sp.id, sp]));
  const backfilled = new Set(ch.windowsBackfilled ?? []);
  let changed = false;
  const specimens = ((current?.specimens ?? []) as any[]).map(sp => {
    const computed = computedById.get(sp.id)?.cytologyScreening;
    let screening = sp?.cytologyScreening;
    if (backfilled.has(sp.id) && computed?.histologyCorrelationWindow && !screening?.histologyCorrelationWindow) {
      screening = { ...screening, histologyCorrelationWindow: computed.histologyCorrelationWindow };
    }
    const toAdd = ch.added.filter(a => a.specimenId === sp.id);
    if (toAdd.length) {
      const existing: any[] = screening?.histologyCorrelationCandidates ?? [];
      const known = new Set(existing.map(x => x.candidateCaseId));
      const fresh = toAdd.filter(a => !known.has(a.candidateCaseId)).map(a =>
        (computed?.histologyCorrelationCandidates ?? []).find((x: any) => x.candidateCaseId === a.candidateCaseId) ?? { candidateCaseId: a.candidateCaseId });
      if (fresh.length) screening = { ...screening, histologyCorrelationCandidates: [...existing, ...fresh] };
    }
    if (screening === sp?.cytologyScreening) return sp;
    changed = true;
    return { ...sp, cytologyScreening: screening };
  });
  return changed ? { specimens } : null;
}

/** The sweep against the app's own services. */
export async function refreshCytologyHistologyCorrelationCandidatesLive(): Promise<CorrelationRefreshChange[]> {
  // Batch 555: once the API server runs cytology.histologyCorrelationSweep (VITE_SERVER_JOBS), it sweeps.
  if (!browserRunsServerJob('cytology.histologyCorrelationSweep')) return [];
  const { caseRouter } = await import('../cases/CaseRouter');
  const { specimenDictionaryService } = await import('../specimenDictionary/specimenDictionaryServiceInstance');
  const { cytologySignOutRecordService } = await import('./cytologySignOutRecordServiceInstance');
  const { cytologyCategoryService } = await import('./cytologyCategoryServiceInstance');
  return refreshCytologyHistologyCorrelationCandidates({
    getSignOutsForCase: async id => { const r = await cytologySignOutRecordService.getByCaseId(id); return r.ok ? r.data : []; },
    getCategoryRanks: async () => { const r = await cytologyCategoryService.getAll(); return new Map((r.ok ? r.data : []).map((c: any) => [c.id, c.diagnosticRank])); },
    getRule: getEffectiveHistologyCorrelationRule,
    getAllCases: () => caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true }) as any,
    getSpecimenDictionary: () => specimenDictionaryService.getAll() as any,
    // The sweep reads every case regardless of the session (as getAllCases
    // does), so the re-read after a conflict does too.
    getCase: async id => {
      const all = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
      return all.ok ? all.data.find(c => c.id === id) : undefined;
    },
    updateCase: (id, patch, expectedVersion) => caseRouter.updateCase(id, patch as any, expectedVersion),
    now: () => new Date(),
  });
}
