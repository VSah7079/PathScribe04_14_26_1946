// src/services/batchRegistryFeed/batchRecordSource.ts
// Batch 620 part S (PS-800): where a batch file's records come from. A record is built from the SAME registry report payload the
// message feeds use (buildCytologyRegistryReportPayload), so a case reads identically whether it goes as a message or in a file.
// The record is built when the file is made, from the case, and never kept: the queue entry holds no copy of it.
import type { CytologyRegistryReportPayload } from '../cytology/buildCytologyRegistryReportPayload';
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';
import { emptyRecord, type BatchRecord } from './batchRegistryFeed';

const join = (xs: readonly string[] | undefined) => (xs ?? []).filter(Boolean).join(' | ');

/** The registry report payload as one flat record. Pure. */
export function payloadToBatchRecord(p: CytologyRegistryReportPayload, kind: string, signedOutAt: string): BatchRecord {
  return {
    ...emptyRecord(),
    patientIdentifier: p.patient.mrn ?? '', patientName: p.patient.name ?? '', dateOfBirth: p.patient.dateOfBirth ?? '',
    accessionNumber: p.accessionNumber ?? '', screeningDate: p.screeningDate ?? '', specimenAdequacy: join(p.specimenAdequacy),
    generalCategorization: p.generalCategorization ?? '', primaryInterpretation: p.primaryInterpretation ?? '',
    additionalInterpretations: join(p.additionalInterpretations), hpvResult: p.hpvResult ?? '', recommendations: join(p.recommendations),
    facilityId: p.facilityId ?? '', facilityName: p.facilityName ?? '', submissionKind: kind, signedOutAt,
  };
}

/** A queue entry with its record, ready for a file. */
export interface BatchItem { ref: string; facilityId: string | null; signedOutAt: string; record: BatchRecord }

/** Builds the items for a program's waiting entries. An entry whose case or sign-out record is gone is left out (the run reports it). */
export interface IBatchRecordSource {
  itemsFor(entries: readonly CytologyRegistryOutboundQueueEntry[]): Promise<{ items: BatchItem[]; unreadable: string[] }>;
}

/** The demo's source: the sign-out record and the case, by the entry's ids. */
export function createMockBatchRecordSource(): IBatchRecordSource {
  return {
    async itemsFor(entries) {
      const [{ cytologySignOutRecordService }, { caseService }, { buildCytologyRegistryReportPayload }] = await Promise.all([
        import('../cytology/cytologySignOutRecordServiceInstance'),
        import('../cases/caseServiceInstance'),
        import('../cytology/buildCytologyRegistryReportPayload'),
      ]);
      const items: BatchItem[] = [];
      const unreadable: string[] = [];
      for (const e of entries) {
        const records = await cytologySignOutRecordService.getByCaseId(e.caseId);
        const rec = records.ok ? records.data.find(r => r.id === e.signOutRecordId) : undefined;
        const c = await caseService.getCase(e.caseId) as { order?: { facilityId?: string; facilityName?: string } } | null | undefined;
        if (!rec || !c) { unreadable.push(e.id); continue; }
        const facilityId = c.order?.facilityId ?? '';
        const payload = buildCytologyRegistryReportPayload(rec, e.registryId as never, facilityId, c.order?.facilityName);
        items.push({ ref: e.id, facilityId: facilityId || null, signedOutAt: rec.signedAt, record: payloadToBatchRecord(payload, e.submission?.messageType ?? 'NEW', rec.signedAt) });
      }
      return { items, unreadable };
    },
  };
}
