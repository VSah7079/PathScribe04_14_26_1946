// src/services/intraop/httpIntraoperativeService.ts
// Batch 616: the API server's version of IIntraoperativeService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/INTRAOP_OPS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notOffered } from '../apiServer/httpServiceExtras';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IIntraoperativeService } from './IIntraoperativeService';

type P<K extends keyof IIntraoperativeService, N extends number> = Parameters<IIntraoperativeService[K]>[N];

type RoutedIntraoperativeService = Omit<IIntraoperativeService, 'seedOrBoardDemoData' | 'advanceDemoSpecimen' | 'removeOrBoardDemoData'>;
type Args<K extends keyof RoutedIntraoperativeService> = Parameters<RoutedIntraoperativeService[K]>;
const BASE = '/api/intraop/intraoperative';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpIntraoperativeService(client: ApiHttpClient): IIntraoperativeService {
  const routes = buildHttpService<Omit<IIntraoperativeService, 'seedOrBoardDemoData' | 'advanceDemoSpecimen' | 'removeOrBoardDemoData'>>(client, {
    lookupAdtRecord: result('POST', () => route('lookupAdtRecord'), { body: (mrn: P<'lookupAdtRecord', 0>) => ({ mrn }) }),
    getAll: result('GET', () => route('getAll')),
    getPending: result('GET', () => route('getPending')),
    createSession: result('POST', () => route('createSession'), { body: (input: P<'createSession', 0>) => input }),
    addSpecimen: result('POST', () => route('addSpecimen'), { body: (sessionId: P<'addSpecimen', 0>, specimenLabel: P<'addSpecimen', 1>) => ({ sessionId, specimenLabel }) }),
    findMatchesForNewCase: result('POST', () => route('findMatchesForNewCase'), { body: (caseInfo: P<'findMatchesForNewCase', 0>) => caseInfo }),
    getMatchCandidates: result('GET', (entryId: Args<'getMatchCandidates'>[0]) => `${route('getMatchCandidates')}${queryString({ entryId })}`),
    addMilestone: result('POST', () => route('addMilestone'), { body: (sessionId: P<'addMilestone', 0>, specimenId: P<'addMilestone', 1>, milestone: P<'addMilestone', 2>, skipReason: P<'addMilestone', 3>, skipReasonNote: P<'addMilestone', 4>, quickGrossText: P<'addMilestone', 5>) => ({ sessionId, specimenId, milestone, skipReason, skipReasonNote, quickGrossText }) }),
    addDigitalAsset: result('POST', () => route('addDigitalAsset'), { body: (sessionId: P<'addDigitalAsset', 0>, specimenId: P<'addDigitalAsset', 1>, asset: P<'addDigitalAsset', 2>) => ({ sessionId, specimenId, asset }) }),
    setFrozenSectionDiagnosis: result('POST', () => route('setFrozenSectionDiagnosis'), { body: (sessionId: P<'setFrozenSectionDiagnosis', 0>, specimenId: P<'setFrozenSectionDiagnosis', 1>, diagnosis: P<'setFrozenSectionDiagnosis', 2>, category: P<'setFrozenSectionDiagnosis', 3>) => ({ sessionId, specimenId, diagnosis, category }) }),
    setSpecimenUrgency: result('POST', () => route('setSpecimenUrgency'), { body: (sessionId: P<'setSpecimenUrgency', 0>, specimenId: P<'setSpecimenUrgency', 1>, urgency: P<'setSpecimenUrgency', 2>) => ({ sessionId, specimenId, urgency }) }),
    dismissFromBoard: result('POST', () => route('dismissFromBoard'), { body: (sessionId: P<'dismissFromBoard', 0>, specimenId: P<'dismissFromBoard', 1>, dismissedByUserId: P<'dismissFromBoard', 2>, dismissedByUserName: P<'dismissFromBoard', 3>, surgeonReadbackConfirmed: P<'dismissFromBoard', 4>) => ({ sessionId, specimenId, dismissedByUserId, dismissedByUserName, surgeonReadbackConfirmed }) }),
    addPreparationOutput: result('POST', () => route('addPreparationOutput'), { body: (sessionId: P<'addPreparationOutput', 0>, specimenId: P<'addPreparationOutput', 1>, type: P<'addPreparationOutput', 2>, identifier: P<'addPreparationOutput', 3>) => ({ sessionId, specimenId, type, identifier }) }),
    merge: result('POST', () => route('merge'), { body: (entryId: P<'merge', 0>, caseId: P<'merge', 1>, resolution: P<'merge', 2>) => ({ entryId, caseId, resolution }) }),
    recordVerbalReport: result('POST', () => route('recordVerbalReport'), { body: (sessionId: P<'recordVerbalReport', 0>, input: P<'recordVerbalReport', 1>) => ({ sessionId, input }) }),
  });
  return {
    ...routes,
    lookupAdtRecord: (...a: Parameters<IIntraoperativeService['lookupAdtRecord']>) => notFoundAsNull(routes.lookupAdtRecord(...a)),
    // Demo-only: a server deployment has no demo data to seed.
    seedOrBoardDemoData: notOffered,
    // Demo-only: a server deployment has no demo data to advance.
    advanceDemoSpecimen: notOffered,
    // Demo-only: a server deployment has no demo data to remove.
    removeOrBoardDemoData: notOffered,
  };
}
