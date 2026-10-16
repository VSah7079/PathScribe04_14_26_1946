// src/services/cytology/loadCytologyWorkspace.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (PS-359). Everything the Cytology Workspace shows for one case,
// loaded and resolved here instead of in CytologyScreeningPage.tsx's effects:
//
//   • the case's cytology specimens (those whose dictionary entry is Cytology
//     or FNA), each signed out or not (Batch 411), and the one being worked
//     on: the one asked for, else the first not yet signed out, else the
//     first; whether it's GYN, and its default synoptic template;
//   • the nomenclature in force (enterprise default, overridden by the
//     performing facility) and that system's categories (for CISOE-A also the
//     Bethesda dictionary it maps onto);
//   • the specimen's reviews and sign-out records, and the latest completed AI
//     screening result;
//   • the performing lab's jurisdiction, the reviewer's credentials (for the
//     advanced-CT sign-out exception), the instrumentation modality (WSI or
//     traditional guided, per facility), the pathology lexicon, and the
//     patient's prior cytology and biopsy history.
//
// A lookup that fails falls back as the page did: jurisdiction 'US' (grants no
// exception), modality 'wsi', empty lists.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { Jurisdiction } from '@/types/systemConfig';
import type { ProviderCredential } from '@/types/staff/ProviderCredential';
import type { PathologyLexiconEntry } from '@/types/cytology/PathologyLexicon';
import type { CytologyCategoryEntry, CytologyNomenclatureSystem } from './ICytologyCategoryService';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { resolveEffectiveCytologyNomenclatureSettings } from './resolveEffectiveCytologyNomenclatureSettings';
import { resolveEffectiveCytologyInstrumentationModality } from './resolveEffectiveCytologyInstrumentationModality';
import { resolveSpecimenEntryMatchesCategory } from '../specimenDictionary/resolveSpecimenEntryMatchesCategory';
import { resolvePatientCytoHistoHistory, type PatientCytoHistoHistory } from './resolvePatientCytoHistoHistory';
import { latestCompletedAiResult } from './cytologyWorkspaceView';
import { hasPendingAuthorRevision } from './cytologyReviewNotes';
import { resolveCytologyComplianceFeatures, type CytologyComplianceFeature } from './cytologyComplianceFeatures';


/** One cytology specimen on the case, for the specimen tabs (Batch 411). */
export interface CytologySpecimenTab {
  id: string;
  label: string;
  description?: string;
  /** Batch 412: pendingRevision = an open "Requires revision" note (a cytotechnologist can't sign it out yet). */
  status: 'draft' | 'pendingRevision' | 'signedOut';
}

export interface CytologyWorkspace {
  caseData: Case | null;
  /** Batch 411: every cytology specimen on the case, in case order. */
  cytologySpecimens: CytologySpecimenTab[];
  specimenId: string | null;
  isGynCytology: boolean;
  defaultSynopticTemplateId?: string;
  nomenclatureSystem: CytologyNomenclatureSystem;
  categories: CytologyCategoryEntry[];
  /** CISOE-A only: the Bethesda dictionary its scores map onto. */
  bethesdaForMapping: CytologyCategoryEntry[];
  reviews: CytologyReviewRecord[];
  signOutRecords: CytologySignOutRecord[];
  aiScreeningResult: AiScreeningResult | null;
  labJurisdiction: Jurisdiction;
  signingProviderCredentials: ProviderCredential[] | undefined;
  instrumentationModality: 'wsi' | 'traditional_guided';
  pathologyLexicon: PathologyLexiconEntry[];
  patientHistory: PatientCytoHistoHistory | null;
  /** Batch 415: the CLIA workload cap and CAP 5-year lookback, on or off for this lab. */
  complianceFeatures: Record<CytologyComplianceFeature, boolean>;
}

export async function loadCytologyWorkspace(caseId: string, userId: string | undefined, deps: CytologyWorkspaceDeps, preferredSpecimenId?: string | null): Promise<CytologyWorkspace> {
  const [c, dictRes, catRes, lexiconRes] = await Promise.all([
    deps.getCase(caseId, userId ?? 'current'),
    deps.getSpecimenDictionary(),
    deps.getAllCategories(),
    deps.getPathologyLexicon(),
  ]);
  const caseData = c ?? null;
  const facilityId: string | undefined = (caseData as any)?.order?.facilityId;

  const [nomenclature, instrumentation, jurisdiction, credentials, compliance] = await Promise.all([
    deps.getNomenclatureSettings(facilityId),
    deps.getInstrumentationSettings(facilityId),
    facilityId ? deps.getFacilityJurisdiction(facilityId) : Promise.resolve(undefined),
    userId ? deps.getProviderCredentials(userId) : Promise.resolve(undefined),
    deps.getComplianceSettings(facilityId),
  ]);
  const { nomenclatureSystem } = resolveEffectiveCytologyNomenclatureSettings(
    nomenclature.enterprise ?? { nomenclatureSystem: 'bethesda' }, nomenclature.facility ?? null);
  // The service scopes the dictionary itself (SFCC is Bethesda in French, for example).
  const effectiveCatRes = await deps.getCategoriesFor(nomenclatureSystem);
  const categories = effectiveCatRes.ok ? effectiveCatRes.data.filter(cat => cat.active) : [];
  const bethesdaForMapping = nomenclatureSystem === 'palga_cisoea' && catRes.ok
    ? catRes.data.filter(cat => cat.active && cat.nomenclatureSystem === 'bethesda') : [];

  const dictById = new Map((dictRes.ok ? dictRes.data : []).map((e: any) => [e.id, e]));
  const cytoSpecimens = ((caseData?.specimens ?? []) as any[]).filter(sp => {
    const entry = sp.specimenDictionaryEntryId ? dictById.get(sp.specimenDictionaryEntryId) : undefined;
    return entry && (entry.type === 'Cytology' || entry.type === 'FNA');
  });
  const caseSignOuts = caseData ? await deps.getCaseSignOutRecords(caseData.id) : null;
  const signedIds = new Set(caseSignOuts?.ok ? caseSignOuts.data.map(r => r.specimenId) : []);
  const cytologySpecimens: CytologySpecimenTab[] = cytoSpecimens.map(sp => ({
    id: sp.id, label: sp.label ?? sp.id, description: sp.description,
    status: signedIds.has(sp.id) ? 'signedOut' : hasPendingAuthorRevision(sp) ? 'pendingRevision' : 'draft',
  }));
  const cytoSpecimen = cytoSpecimens.find(sp => sp.id === preferredSpecimenId)
    ?? cytoSpecimens.find(sp => !signedIds.has(sp.id)) ?? cytoSpecimens[0];
  const specimenId: string | null = cytoSpecimen?.id ?? null;
  const dictEntry = cytoSpecimen?.specimenDictionaryEntryId ? dictById.get(cytoSpecimen.specimenDictionaryEntryId) : undefined;

  const [reviewsRes, signOutRes, aiRes, patientCasesRes] = await Promise.all([
    specimenId ? deps.getReviewsForSpecimen(specimenId) : Promise.resolve(null),
    specimenId ? deps.getSignOutRecords(specimenId) : Promise.resolve(null),
    deps.getAiResults(caseId),
    caseData?.patient?.id && categories.length ? deps.getAllCases({ patientId: caseData.patient.id }) : Promise.resolve(null),
  ]);

  return {
    caseData,
    cytologySpecimens,
    specimenId,
    isGynCytology: resolveSpecimenEntryMatchesCategory(dictEntry, ['GYN_CYTOLOGY']),
    defaultSynopticTemplateId: dictEntry?.defaultSynopticTemplateId,
    nomenclatureSystem,
    categories,
    bethesdaForMapping,
    reviews: reviewsRes?.ok ? reviewsRes.data : [],
    signOutRecords: signOutRes?.ok ? signOutRes.data : [],
    aiScreeningResult: latestCompletedAiResult(aiRes.ok ? aiRes.data : []),
    labJurisdiction: (jurisdiction as Jurisdiction | undefined) ?? 'US',
    signingProviderCredentials: credentials,
    instrumentationModality: resolveEffectiveCytologyInstrumentationModality(
      instrumentation.enterprise ?? { modality: 'wsi' }, instrumentation.facility ?? null).modality,
    pathologyLexicon: lexiconRes.ok ? lexiconRes.data : [],
    patientHistory: patientCasesRes?.ok && caseData ? resolvePatientCytoHistoHistory(patientCasesRes.data, caseData.id, categories) : null,
    complianceFeatures: resolveCytologyComplianceFeatures((jurisdiction as Jurisdiction | undefined) ?? 'US', compliance.enterprise, compliance.facility),
  };
}
