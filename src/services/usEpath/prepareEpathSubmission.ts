// src/services/usEpath/prepareEpathSubmission.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800): everything up to (not including) queuing a US ePath report. The case's facts become the
// base message (hl7/epathBuilder.ts); the performing facility's state picks the profile (epathRouting.ts, never the
// patient's address); the profile checks the message (epathCheck.ts). A report that passes is 'ready'; one that fails is
// 'review' with fixed codes and is parked in the Outbound Queue for a person. The case's sign-out is never held for this.
// Reads settings; sends nothing (the interface engine owns the transport).
// ─────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { Facility } from '../facilities/IFacilityService';
import { resolvePerformingLabFacilityId } from '../facilities/IFacilityService';
import { buildEpathOruR01, type EpathAddress, type EpathFacts, type EpathReportStatus } from '../hl7/epathBuilder';
import { checkEpathMessage } from './epathCheck';
import type { EpathProfileAssignment, EpathStateProfile, EpathTransportKind } from './epathProfile';
import { resolveEpathRouting, type EpathRoutingVia } from './epathRouting';

export interface EpathPrepareDeps {
  profiles(): Promise<EpathStateProfile[]>;
  assignments(): Promise<EpathProfileAssignment[]>;
  facilities(): Promise<Facility[]>;
  /** The performing facility's time zone (HL7 timestamps carry its offset). */
  timezone(): Promise<string>;
  now(): string;
}

export type EpathPrepared =
  | { outcome: 'ready'; profile: EpathStateProfile; basisFacilityId: string; stateCode: string; via: EpathRoutingVia; transport: EpathTransportKind; messageControlId: string; message: string }
  | { outcome: 'review'; reviewCodes: string[]; profile?: EpathStateProfile; basisFacilityId?: string };

const addressOf = (f?: Facility): EpathAddress | undefined => f ? { street: f.address, city: f.city, state: f.state, zip: f.zip } : undefined;

/** The case as the message needs it. Best effort: what the case does not carry stays empty, and the profile's checks find it. */
export function epathFactsFromCase(c: Case, performing: Facility | undefined, now: string): EpathFacts {
  const revision = (c as { lastRevisionType?: string }).lastRevisionType;
  const status: EpathReportStatus = revision && revision !== 'original' ? 'corrected' : 'final';
  const provider = c.order?.requestingProvider?.trim();
  const [lastName, ...rest] = provider ? provider.split(/\s+/).reverse() : [];
  return {
    patient: {
      mrn: c.patient.mrn, firstName: c.patient.firstName ?? '', lastName: c.patient.lastName ?? '', dateOfBirth: c.patient.dateOfBirth,
      sex: c.patient.sex, ...(c.patient.address ? { address: { street: c.patient.address } } : {}),
    },
    accessionNumber: c.accession?.fullAccession ?? c.accession?.accessionNumber ?? '',
    reportStatus: status,
    signedOutAt: c.diagnostic?.issuedDate ?? c.updatedAt ?? now,
    finalDiagnosis: c.diagnostic?.primaryDiagnosis ?? '',
    ...(provider ? { orderingProvider: { lastName, firstName: rest.reverse().join(' ') } } : {}),
    performingFacility: { id: performing?.id ?? '', name: performing?.name ?? '', clia: performing?.cliaOrIsoNumber, address: addressOf(performing) },
    specimens: (c.specimens ?? []).map(s => ({
      id: s.id, type: s.displayName ?? s.label, site: s.description, collectedAt: s.collectedAt,
      icdO: (s.coding?.icdO ?? []).map(x => ({ code: x.code, description: x.description })),
      snomed: (s.coding?.snomed ?? []).map(x => ({ code: x.code, description: x.description })),
    })),
  };
}

export async function prepareEpathSubmission(c: Case, readingFacilityId: string, deps: EpathPrepareDeps): Promise<EpathPrepared> {
  const [profiles, assignments, facilities, timezone] = await Promise.all([deps.profiles(), deps.assignments(), deps.facilities(), deps.timezone()]);
  const reading = facilities.find(f => f.id === readingFacilityId);
  const performingId = (reading && resolvePerformingLabFacilityId(reading)) ?? readingFacilityId;
  const routing = resolveEpathRouting({
    performingFacilityId: performingId, technicalComponentFacilityId: c.order?.technicalComponentFacilityId,
    facilities: facilities.map(f => ({ id: f.id as string, state: f.state })), profiles, assignments,
  });
  if (!routing.ok) return { outcome: 'review', reviewCodes: [routing.reason === 'noFacility' ? 'routing:noFacility' : 'routing:noProfile'], basisFacilityId: routing.basisFacilityId };

  const basis = facilities.find(f => f.id === routing.basisFacilityId);
  const now = deps.now();
  const facts = epathFactsFromCase(c, basis, now);
  const built = buildEpathOruR01(facts, {
    ctx: { sendingApplication: 'PATHSCRIBE', sendingFacility: basis?.assigningAuthority || basis?.name || '', receivingApplication: 'NPCR_EPATH', receivingFacility: routing.stateCode, processingId: 'T' },
    timezone, extensions: routing.profile.extensions, now,
  });
  const reviewCodes = checkEpathMessage(built.message, routing.profile, facts);
  if (reviewCodes.length) return { outcome: 'review', reviewCodes, profile: routing.profile, basisFacilityId: routing.basisFacilityId };
  return {
    outcome: 'ready', profile: routing.profile, basisFacilityId: routing.basisFacilityId, stateCode: routing.stateCode, via: routing.via,
    transport: routing.profile.transport, messageControlId: built.messageControlId, message: built.message,
  };
}

/** The app's own settings, read on first use. */
export const defaultEpathDeps = (): EpathPrepareDeps => ({
  profiles: async () => { const { usEpathService } = await import('./usEpathServiceInstance'); const r = await usEpathService.getProfiles(); return r.ok ? r.data : []; },
  assignments: async () => { const { usEpathService } = await import('./usEpathServiceInstance'); const r = await usEpathService.getAssignments(); return r.ok ? r.data : []; },
  facilities: async () => { const { facilityService } = await import('../facilities/facilityServiceInstance'); const r = await facilityService.getAll(); return r.ok ? (r.data as Facility[]) : []; },
  timezone: async () => { const { systemConfigService } = await import('../systemConfig/systemConfigServiceInstance'); const r = await systemConfigService.get(); return r.ok ? r.data.timezone : 'America/Phoenix'; },
  now: () => new Date().toISOString(),
});
