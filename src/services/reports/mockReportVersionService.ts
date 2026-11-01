// src/services/reports/mockReportVersionService.ts
// CORRECTED — back to the real, original two-method implementation.
// My earlier draft added getLatestForCase/createCaseVersion/
// getInstanceVersionHistory and a case-wide `instances[]` concept that
// doesn't match how this service is actually used elsewhere in the
// app. No new methods needed — instanceId is just a field now, and the
// banner can filter getByCaseId()'s results client-side.
import { skipResearchCaseDispatch } from '../interfaceDispatch/resolveDispatchOrganisation';
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { PatientEncounterSnapshot } from '@/types/reports/PatientEncounterSnapshot';
import type { IReportVersionService } from './IReportVersionService';
import { caseRouter } from '../cases/CaseRouter';
import { organMapFiguresForVersion } from '../organMapping/organMapFigures';
import { autoFigureVersion, autoOrganMapFigures, reportTranslateFor } from '../organMapping/organMapAutoFigures';
import { pdfSha256 } from '../reportDocuments/reportDocuments';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockEncounterService } from '../encounters/mockEncounterService';
import { getEffectiveScanStationId } from '@/utils/effectiveScanStation';
import { mockOutboundResultQueueService } from './mockOutboundResultQueueService';
import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';

const STORAGE_KEY = 'report_version_records';

const load    = (): ReportVersionRecord[] => storageGet<ReportVersionRecord[]>(STORAGE_KEY, []);
const persist = (data: ReportVersionRecord[]) => storageSet(STORAGE_KEY, data);

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

/** Real fix, Phase 5: captures the real, immutable patient/encounter
 *  snapshot at the exact moment a version is created. Deliberately,
 *  fully defensive - a real sign-out is a high-stakes, time-sensitive
 *  clinical action that must never be blocked or failed by a
 *  secondary, ancillary lookup. Any failure here (case not found, no
 *  real patientId on the case, patient/encounter lookup error) simply
 *  results in a genuinely absent snapshot, never a thrown error. */
async function captureSnapshot(caseId: string): Promise<PatientEncounterSnapshot | undefined> {
  try {
    const caseData = await caseRouter.getCase(caseId);
    const patientId = (caseData as any)?.patient?.id;
    if (!patientId) return undefined;

    const patient = await mockPatientIndexService.getById(patientId);
    if (!patient) return undefined;

    const snapshot: PatientEncounterSnapshot = {
      patientId: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      capturedAt: new Date().toISOString(),
    };

    const encounterId = (caseData as any)?.encounterId;
    if (encounterId) {
      const encounterResult = await mockEncounterService.getById(encounterId);
      if (encounterResult.ok && encounterResult.data) {
        const e = encounterResult.data;
        snapshot.encounterId = e.id;
        snapshot.encounterNumber = e.encounterNumber;
        snapshot.encounterClass = e.encounterClass;
        snapshot.encounterStatus = e.status;
        snapshot.facility = e.facility;
        snapshot.ward = e.ward;
        snapshot.room = e.room;
        snapshot.bed = e.bed;
        snapshot.attendingProvider = e.attendingProvider;
      }
    }

    return snapshot;
  } catch {
    return undefined;
  }
}

export const mockReportVersionService: IReportVersionService = {
  async getByCaseId(caseId) {
    return ok(load().filter(r => r.caseId === caseId).sort((a, b) => a.versionNumber - b.versionNumber));
  },

  async create(record, context) {
    // Batch 558: with the API server, its versions count too (numbering, CORRECTED vs ADDENDUM).
    const own = load().filter(r => r.caseId === record.caseId);
    const ownIds = new Set(own.map(r => r.id));
    const existing = [...own, ...(context?.priorVersions ?? []).filter(r => r.caseId === record.caseId && !ownIds.has(r.id))];
    const patientEncounterSnapshot = await captureSnapshot(record.caseId);
    const newRecord: ReportVersionRecord = {
      ...record,
      id: `ver-${Date.now().toString(36)}`,
      versionNumber: existing.reduce((n, r) => Math.max(n, r.versionNumber), existing.length) + 1,
      createdAt: new Date().toISOString(),
      patientEncounterSnapshot,
      // Real feature, per direct follow-up: "Stamp every saved
      // draft... with... station_id captured at the exact moment of
      // saving." Same real capture-at-creation moment as
      // patientEncounterSnapshot immediately above.
      createdFromStation: getEffectiveScanStationId(),
    };
    // Batch 461: the report's organ-map images as signed, with their hashes,
    // and the PDF's hash. Never blocks the sign-out.
    try {
      const signed = await caseRouter.getCase(record.caseId);
      // Batch 463: maps that are part of the report (Mohs) are drawn now, as signed.
      const auto = (await autoOrganMapFigures(signed, await reportTranslateFor(signed?.order?.facilityId)))
        .filter(a => !record.instanceId || a.instanceId === record.instanceId).map(autoFigureVersion);
      const autoIds = new Set(auto.map(a => a.instanceId));
      const figures = [...organMapFiguresForVersion(signed, record.instanceId).filter(f => !autoIds.has(f.instanceId)), ...auto];
      if (figures.length) newRecord.organMapFigures = figures;
    } catch { /* the version is still created */ }
    // Batch 558: the hash of the PDF's bytes, as the API server and report documents record it
    // (it was the hash of the base64 text before; reportVersionPdf.ts still accepts those).
    if (record.pdfBase64) {
      try { newRecord.pdfSha256 = pdfSha256(record.pdfBase64); } catch { /* not base64: no hash, the version is still created */ }
    }
    persist([...load(), newRecord]);

    // Real, per direct guidance (Pathology HL7 Outbound Feature Spec,
    // ORU^R01) and direct confirmation of the exact real inference:
    // every real finalization/amendment path in this app funnels
    // through this one, single, narrow function — hooking here
    // catches all of them, present and future, rather than scattering
    // enqueue calls across useSignOutWorkflow.ts's own many entry
    // points. Real, deliberate scope, confirmed directly:
    //  - mode !== 'orchestration' (i.e. 'assist'): never enqueued —
    //    an external LIS owns that report, not PathScribe.
    //  - instanceId absent (the case-level, whole-case PDF snapshot
    //    from finalizeSignOut): never enqueued — a composite summary
    //    document isn't a discrete OBR/OBX observation the way one
    //    specific synoptic instance's own result is. Confirmed
    //    directly: skip it entirely rather than force it into this
    //    per-instance queue.
    //  - trigger 'initial_signout': FINAL.
    //  - trigger 'amendment', a prior version already exists for THIS
    //    SAME instanceId: CORRECTED (real HL7 intent — updating an
    //    already-signed result/specimen instance).
    //  - trigger 'amendment', no prior version for THIS instanceId,
    //    but the case has other, real prior versions: ADDENDUM (a new
    //    result block being appended to an already-signed case).
    // Fire-and-forget, same posture as every other real enqueue in
    // this app — this must never block or fail the real sign-out
    // action it's attached to.
    if (newRecord.mode === 'orchestration' && newRecord.instanceId) {
      const resultState: OruResultState = newRecord.trigger === 'initial_signout'
        ? 'FINAL'
        : existing.some(e => e.instanceId === newRecord.instanceId)
          ? 'CORRECTED'
          : 'ADDENDUM';
      (async () => {
        try {
          const caseData = await caseRouter.getCase(newRecord.caseId);
          // Batch 728 (Decision 4): a research case sends no result to the EHR.
          if (caseData && await skipResearchCaseDispatch(caseData, 'Surgical', resultState === 'FINAL' ? 'final' : 'amended')) return;
          const patientId = (caseData as any)?.patient?.id;
          const patient = patientId ? await mockPatientIndexService.getById(patientId) : null;
          if (!patient) return; // Honest, non-blocking skip — no real organisationId to enqueue against.
          await mockOutboundResultQueueService.enqueue({
            caseId: newRecord.caseId,
            instanceId: newRecord.instanceId!,
            resultState,
            organisationId: patient.organisationId,
          });
        } catch (e) {
          console.error('[mockReportVersionService] Real, non-blocking failure enqueueing ORU^R01 result:', e);
        }
      })();
    }

    return ok(newRecord);
  },
};
