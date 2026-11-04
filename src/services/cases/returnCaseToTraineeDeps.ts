// src/services/cases/returnCaseToTraineeDeps.ts
// Batch 608: the real wiring for returnCaseToTrainee (kept out of the pages).
import type { ReturnCaseToTraineeDeps } from './returnCaseToTrainee';
import { countersignService } from './countersignServiceInstance';
import { caseRouter } from './CaseRouter';
import { caseWriteDepsFrom } from '../cytology/cytologyCaseWriteDeps';

export const returnCaseToTraineeDeps: ReturnCaseToTraineeDeps = {
  countersign: {
    reject: input => countersignService.reject(input),
    getForSpecimen: (caseId, specimenId) => countersignService.getForSpecimen(caseId, specimenId),
    getForCase: caseId => countersignService.getForCase(caseId),
  },
  write: caseWriteDepsFrom(caseId => caseRouter.getCase(caseId), (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as never, expectedVersion)),
};
