// src/services/registryGoLive/syntheticTestSuite.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424 (Pete, Oct 1 2026: "The site should only send test data never
// production data"). The only traffic a registry's test system ever gets:
// fictitious patients and results, built through the same payload builders
// real cases use, so the test exercises the lab's own code mappings, the
// national identifier, and the adapter.
//
//   screening  three cases: negative (NILM), high-grade squamous lesion,
//              unsatisfactory
//   cancer     two cases: invasive ductal carcinoma (8500/3),
//              adenocarcinoma (8140/3)
//
// Every synthetic patient's id starts SYN-, its national identifier passes
// its check digit (NHS England numbers in the 999 range, which NHS England
// keeps for testing; elsewhere an invented number from the format's example
// that passes the check), and every payload carries the synthetic marker. The
// boundary check (services/interfaceDispatch/registryPayloadBoundary.ts)
// refuses a marked payload on a production instance and an unmarked one on a
// validation instance. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';
import { verifyNationalIdentifier } from '../patientIdentifiers/checkDigits';
import type { ScreeningRegistryDefinition } from '../screeningRegistry/screeningRegistryDefinitions';
import type { ScreeningRegistryConfig } from '../screeningRegistry/IScreeningRegistryConfigService';
import { buildScreeningRegistryPayload, decideRegistrySubmission, registryHoldMessage } from '../screeningRegistry/screeningRegistryEngine';
import { buildCancerRegistryReportPayload } from '../cancerRegistry/buildCancerRegistryReportPayload';
import type { CancerRegistryDefinition } from '../cancerRegistry/cancerRegistryDefinitions';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const SYNTHETIC_ID_PREFIX = 'SYN-';
export const SYNTHETIC_SUITE_ID = 'pathscribe-registry-suite-1';

/** The marker every synthetic payload carries. */
export interface SyntheticMarker { suite: string; caseRef: string }

export const isSyntheticCaseId = (id: string | undefined) => !!id && id.startsWith(SYNTHETIC_ID_PREFIX);

/** A number in the format that passes its check digit. NHS England: the 999 test range. */
export function syntheticIdentifier(formatId: string, seed: number): string | undefined {
  const format = IDENTIFIER_FORMAT_LIBRARY.find(f => f.id === formatId);
  const example = (format as any)?.example as string | undefined;
  if (!example) return undefined;
  const chars = example.split('');
  const digitAt = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter(i => i >= 0);
  if (formatId === 'mrn_nhs') digitAt.slice(0, 3).forEach(i => { chars[i] = '9'; });
  const vary = digitAt.slice(-5);
  for (let n = 0; n < 100_000; n++) {
    const value = String((seed * 7919 + n) % 100_000).padStart(5, '0');
    vary.forEach((pos, k) => { chars[pos] = value[k]; });
    const candidate = chars.join('');
    if (verifyNationalIdentifier(formatId, candidate).status === 'verified') return candidate;
  }
  return undefined;
}

export interface SyntheticSubmission {
  caseRef: string;
  /** What the case tests (literal English; an audit and evidence record). */
  scenario: string;
  /** Ready: the body to queue and send. Held: why the lab's configuration would hold it (a real finding). */
  status: 'ready' | 'held';
  body?: object;
  holdMessage?: string;
}

const patientFor = (registryId: string, k: number, formatId: string | undefined) => {
  const value = formatId ? syntheticIdentifier(formatId, k) : undefined;
  return {
    id: `${SYNTHETIC_ID_PREFIX}P-${registryId}-${k}`,
    firstName: 'Synthetic', lastName: `Testpatient ${k}`, dateOfBirth: '1980-01-01',
    mrn: `${SYNTHETIC_ID_PREFIX}MRN-${k}`,
    ...(formatId && value ? { nationalIdentifiers: [{ system: formatId, value, verificationStatus: 'verified' as const }] } : {}),
  };
};

const pick = (categories: { id: string; section: string; usage?: string; label: string }[], section: string, re: RegExp, fallback: string) =>
  categories.find(c => c.section === section && re.test(c.label) && c.usage !== 'secondary')?.id
  ?? categories.find(c => c.section === section && c.usage !== 'secondary')?.id ?? fallback;

/** Screening: three cases through the lab's own configuration and the real builder. */
export function syntheticScreeningSubmissions(
  definition: ScreeningRegistryDefinition,
  config: ScreeningRegistryConfig,
  categories: { id: string; section: string; usage?: string; label: string }[],
  context: { facilityId: string; facilityName?: string; now: Date },
): SyntheticSubmission[] {
  const satisfactory = pick(categories, 'adequacy', /^(?!.*unsatisf).*satisfactory/i, 'satisfactory');
  const unsatisfactory = pick(categories, 'adequacy', /unsatisfactory/i, 'unsatisfactory');
  const nilm = pick(categories, 'interpretation_result', /negative for intraepithelial/i, 'nilm');
  const hsil = pick(categories, 'interpretation_result', /high[- ]grade squamous/i, 'hsil');
  const label = (id: string) => categories.find(c => c.id === id)?.label ?? id;
  const cases = [
    { scenario: 'Negative (NILM), satisfactory', adequacy: satisfactory, primary: nilm, unsat: false },
    { scenario: 'High-grade squamous intraepithelial lesion, satisfactory', adequacy: satisfactory, primary: hsil, unsat: false },
    { scenario: 'Unsatisfactory for evaluation', adequacy: unsatisfactory, primary: nilm, unsat: true },
  ];
  return cases.map((c, i) => {
    const k = i + 1;
    const caseRef = `${SYNTHETIC_ID_PREFIX}${definition.id}-${k}`;
    const patient = patientFor(definition.id, k, definition.patientIdentifierFormatId);
    const review = { adequacySelections: [{ categoryId: c.adequacy }], primaryInterpretationId: c.primary, additionalInterpretations: [], recommendations: [] } as any;
    const decision = decideRegistrySubmission(definition, config, { isGynCytology: true, patient, review });
    if (decision.holdReasons.length) return { caseRef, scenario: c.scenario, status: 'held' as const, holdMessage: registryHoldMessage(decision, definition) };
    const record = {
      id: `${caseRef}-SO`, caseId: caseRef, specimenId: 'SYN-SP1', reviewRecordId: `${caseRef}-RV`, signedAt: context.now.toISOString(),
      reportContent: {
        patientMrn: patient.mrn, patientName: `${patient.firstName} ${patient.lastName}`, patientDateOfBirth: patient.dateOfBirth,
        accessionNumber: `${caseRef}-ACC`, specimenCollectedAt: context.now.toISOString(),
        specimenAdequacy: [label(c.adequacy)], primaryInterpretation: label(c.primary), additionalInterpretations: [], recommendations: [],
        requiresPathologistReview: c.primary === hsil,
      },
    } as any;
    const body = buildScreeningRegistryPayload(definition, decision, record, {
      facilityId: context.facilityId, facilityName: context.facilityName, primaryInterpretationId: c.primary, isUnsatisfactory: c.unsat, patient,
    });
    return { caseRef, scenario: c.scenario, status: 'ready' as const, body: { ...body, synthetic: { suite: SYNTHETIC_SUITE_ID, caseRef } } };
  });
}

/** Cancer: two reportable cases through the real builder. */
export function syntheticCancerSubmissions(
  definition: CancerRegistryDefinition,
  context: { facilityId: string; facilityName?: string; now: Date },
): SyntheticSubmission[] {
  const cases = [
    { scenario: 'Invasive ductal carcinoma of breast (ICD-O-3 8500/3)', code: '8500/3', description: 'Infiltrating duct carcinoma, NOS', diagnosis: 'Invasive ductal carcinoma, left breast' },
    { scenario: 'Adenocarcinoma of colon (ICD-O-3 8140/3)', code: '8140/3', description: 'Adenocarcinoma, NOS', diagnosis: 'Adenocarcinoma, sigmoid colon' },
  ];
  return cases.map((c, i) => {
    const k = i + 1;
    const caseRef = `${SYNTHETIC_ID_PREFIX}${definition.id}-${k}`;
    const caseData = {
      id: caseRef, patient: patientFor(definition.id, k, definition.patientIdentifierFormatId),
      accession: { fullAccession: `${caseRef}-ACC`, accessionNumber: `${caseRef}-ACC` },
      specimens: [{ id: 'SYN-SP1', coding: { icdO: [{ code: c.code, description: c.description }] } }],
      diagnostic: { primaryDiagnosis: c.diagnosis, issuedDate: context.now.toISOString() },
      order: { facilityId: context.facilityId },
    } as any;
    const body = buildCancerRegistryReportPayload(caseData, definition.id, context.facilityId, context.facilityName);
    return { caseRef, scenario: c.scenario, status: 'ready' as const, body: { ...body, synthetic: { suite: SYNTHETIC_SUITE_ID, caseRef } } };
  });
}
