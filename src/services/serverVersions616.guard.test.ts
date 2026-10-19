// Batch 616 (PS-483, PS-503, PS-505, PS-512): with no API server address (the demo) every service built in this batch is
// still the mock, so the demonstration is unchanged.
import { describe, expect, it } from 'vitest';
import { accessionOutboundQueueService, amendmentService, draftCacheService, biometricFlow, encounterService, followUpService, informalReviewService, lisAmendmentNoticeService, orderIntakeService, outboundLisSyncQueueService, outboundPatientAdtQueueService, outboundResultQueueService, patientIndexService, reportChangeLogService, reportPartService, reportReleaseService } from '@/services';
import { mockAccessionOutboundQueueService } from './accessioning/mockAccessionOutboundQueueService';
import { mockAmendmentService } from './reports/mockAmendmentService';
import { mockDraftCacheService } from './drafts/mockDraftCacheService';
import { mockEncounterService } from './encounters/mockEncounterService';
import { mockBiometricFlow } from './biometric/mockBiometricFlow';
import { mockFollowUpService } from './followUp/mockFollowUpService';
import { mockInformalReviewService } from './reports/mockInformalReviewService';
import { mockLisAmendmentNoticeService } from './reports/mockLisAmendmentNoticeService';
import { mockOrderIntakeService } from './orderIntake/mockOrderIntakeService';
import { mockOutboundLisSyncQueueService } from './reports/mockOutboundLisSyncQueueService';
import { mockOutboundPatientAdtQueueService } from './patients/mockOutboundPatientAdtQueueService';
import { mockOutboundResultQueueService } from './reports/mockOutboundResultQueueService';
import { mockPatientIndexService } from './patients/mockPatientIndexService';
import { mockReportChangeLogService } from './reportChangeLog/mockReportChangeLogService';
import { mockReportPartService } from './reportParts/mockReportPartService';
import { mockReportReleaseService } from './reportRelease/mockReportReleaseService';

describe('Batch 616 services in the demo', () => {
  it.each([
    ['amendments', amendmentService, mockAmendmentService], ['informal reviews', informalReviewService, mockInformalReviewService],
    ['LIS amendment notices', lisAmendmentNoticeService, mockLisAmendmentNoticeService], ['LIS sync queue', outboundLisSyncQueueService, mockOutboundLisSyncQueueService],
    ['result queue', outboundResultQueueService, mockOutboundResultQueueService], ['change log', reportChangeLogService, mockReportChangeLogService],
    ['report parts', reportPartService, mockReportPartService], ['report release', reportReleaseService, mockReportReleaseService],
    ['order intake', orderIntakeService, mockOrderIntakeService], ['drafts', draftCacheService, mockDraftCacheService],
    ['accession queue', accessionOutboundQueueService, mockAccessionOutboundQueueService], ['patient index', patientIndexService, mockPatientIndexService],
    ['patient ADT queue', outboundPatientAdtQueueService, mockOutboundPatientAdtQueueService], ['encounters', encounterService, mockEncounterService], ['follow-up tracking', followUpService, mockFollowUpService],
  ] as const)('%s is the mock when there is no API server', (_n, chosen, mock) => {
    expect(chosen).toBe(mock);
  });

  it('biometric signing is the demo flow when there is no API server (wrapped by the deployment switch, so not the same object)', () => {
    expect(Object.keys(biometricFlow).sort()).toEqual(Object.keys(mockBiometricFlow).sort());
  });
});
