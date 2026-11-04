// src/services/cytology/buildHpvRegistryResultPayload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 631. The structured content PathScribe hands the interface engine for an hrHPV result going to a national screening
// register (Australia's NCSR; New Zealand's NCSP register). Same split as every other outbound message: PathScribe says WHAT
// is reported; the engine builds the register's own message, holds the certificates and connects (docs/architecture/
// HPV_RESULT_INBOUND.md §8). The register's own field names and the NZ specification are not known yet, so the registry ids are
// placeholders and nothing here is a wire format.
//
// What the register needs (Pete, Oct 19, 2026): the collection method (clinician CL or self SC), the genotype as 16 / 18 / other
// (not just positive or negative), the patient's national identifier (Medicare number and IRN, or IHI), demographics, and the
// laboratory's NATA accreditation identifier. PathScribe does not hold the NATA identifier yet: it is sent as null and the
// engine team is told (§8), never invented.
// ─────────────────────────────────────────────────────────────────────────────
import type { HpvGenotypeDetail } from '@/types/case/HpvGenotype';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import { hpvGenotypeLabels } from './hpvGenotype';
import { selfCollectedRecallFor, type RecallJurisdiction, type SelfCollectedRecall } from './selfCollectedRecall';
import { recommendationEnvelope, type RecommendationEnvelope } from './recommendationCodes';
import { DEFAULT_RECALL_WINDOWS, type RecallWindows, type WeeksWindow } from './recallWindows';

export type HpvRegistryId = 'ncsr_australia' | 'ncsp_new_zealand';
export type HpvCollectionMethod = 'CL' | 'SC';

export interface HpvRegistryResultPayload {
  messageId: string;
  timestamp: string;
  registryId: HpvRegistryId;
  facilityId: string;
  /** The laboratory's NATA accreditation identifier (Australia). Not held by PathScribe yet: null. */
  laboratoryAccreditationId: string | null;
  patient: { mrn?: string; name: string; dateOfBirth?: string; nationalIdentifiers: NationalPatientIdentifier[] };
  accessionNumber: string;
  specimenLetter: string;
  collectionMethod: HpvCollectionMethod;
  hpvResult: 'Positive' | 'Negative' | 'Invalid';
  /** 16, 18 and "other" named by the sender. Empty when the sender gave only the 18/45 group or no genotype. */
  hpvGenotypes: ('HPV_16' | 'HPV_18' | 'HPV_OTHER')[];
  /** False when the result is Positive but the genotype cannot be told into 16 / 18 / other. */
  genotypeResolved: boolean;
  /** Present for a self-collected Positive or Invalid result. */
  /** Internal codes for the engine's mapping layer to translate; never the register's own codes. */
  recallRecommendation?: { recommendations: RecommendationEnvelope[]; priority: SelfCollectedRecall['priority']; targetWeeks: WeeksWindow | null };
}

export interface HpvRegistryResultInput {
  messageId: string; timestamp: string; jurisdiction: RecallJurisdiction; facilityId: string;
  patient: { mrn?: string; name: string; dateOfBirth?: string; nationalIdentifiers?: NationalPatientIdentifier[] };
  accessionNumber: string; specimenLetter: string; isSelfCollected: boolean;
  hpvResult: 'Positive' | 'Negative' | 'Invalid'; genotype?: HpvGenotypeDetail;
  /** The lab's target windows (recallWindows.ts); defaults when omitted. */
  windows?: RecallWindows;
}

export function buildHpvRegistryResultPayload(i: HpvRegistryResultInput): HpvRegistryResultPayload {
  const hpvGenotypes = i.hpvResult === 'Positive' ? hpvGenotypeLabels(i.genotype) : [];
  const recall = i.isSelfCollected ? selfCollectedRecallFor(i.jurisdiction, i.hpvResult, i.genotype, i.windows ?? DEFAULT_RECALL_WINDOWS) : null;
  return {
    messageId: i.messageId, timestamp: i.timestamp,
    registryId: i.jurisdiction === 'AU' ? 'ncsr_australia' : 'ncsp_new_zealand',
    facilityId: i.facilityId,
    laboratoryAccreditationId: null,
    patient: { mrn: i.patient.mrn, name: i.patient.name, dateOfBirth: i.patient.dateOfBirth, nationalIdentifiers: i.patient.nationalIdentifiers ?? [] },
    accessionNumber: i.accessionNumber, specimenLetter: i.specimenLetter,
    collectionMethod: i.isSelfCollected ? 'SC' : 'CL',
    hpvResult: i.hpvResult,
    hpvGenotypes,
    genotypeResolved: i.hpvResult !== 'Positive' || hpvGenotypes.length > 0,
    ...(recall ? { recallRecommendation: { recommendations: recall.codes.map(recommendationEnvelope), priority: recall.priority, targetWeeks: recall.targetWeeks } } : {}),
  };
}
