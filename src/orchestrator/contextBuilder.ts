// src/orchestrator/contextBuilder.ts
// ─────────────────────────────────────────────────────────────
// Context Builder — Layer 2 of the Orchestrator stack.
//
// Responsibility:
//   Takes raw inputs (caseData, synopticAnswers, templateConfig)
//   and produces a validated, normalized, AI-safe StructuredContext
//   object that the Orchestrator Engine consumes.
//
// Rules:
//   • Never passes raw Case fields directly to AI prompts
//   • Normalizes missing/null fields to explicit sentinel values
//   • Resolves synoptic answer IDs → human-readable labels
//   • Strips PII that is not clinically relevant to narrative generation
//   • Output shape is stable — Orchestrator Engine depends on it
// ─────────────────────────────────────────────────────────────

import type { Case, DiagnosticMetadata } from '../types/case/Case';
import type { User } from '../contexts/AuthContext';
import type { EditorTemplate, EditorField, EditorSection } from '../components/Config/Protocols/SynopticEditor';
import { resolveReportTemplateAsync } from '../services/reportTemplates/TemplateRoutingService';
import { getNarrativeConfigForTemplate } from '../components/Config/NarrativeTemplates/narrativeTemplateRegistry';

// ─────────────────────────────────────────────────────────────
// Output shape — StructuredContext
// This is the single validated JSON object the Orchestrator
// Engine and AI prompts consume. Shape is intentionally flat
// and explicit to prevent prompt injection / missing field bugs.
// ─────────────────────────────────────────────────────────────

export interface PatientContext {
  mrn: string;
  dateOfBirth: string;
  sex: string;
  fullName: string;
}

/**
 * The pathologist signing/finalising this report. Populated from the
 * authenticated User (see AuthContext.tsx) at the point buildContext() is
 * called — NOT from caseData, since the signer is a property of the
 * session, not the case itself.
 *
 * Template expression nodes reference this as {{pathologist.fullName}},
 * {{pathologist.credentials}}, etc. signatureUrl/hasSignatureImage let a
 * signature-block template node render the uploaded image when present and
 * gracefully fall back to typed name + credentials when it isn't.
 */
export interface PathologistContext {
  id: string;
  fullName: string;
  credentials: string;
  signatureUrl: string | null;
  hasSignatureImage: boolean;
  /** ISO timestamp — when this context (and therefore the signature) was built */
  signedAt: string;
}

export interface SpecimenContext {
  id: string;
  label: string;
  type: string;
  site: string;
  collectionDate: string;
  quantity: string;
}

export interface AccessionContext {
  accessionNumber: string;
  fullAccession: string;
  prefix: string;
  year: number | null;
}

export interface OrderContext {
  priority: string;
  requestingProvider: string;
  clinicalIndication: string;
  receivedDate: string;
}

export interface DiagnosticContext {
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  grossDescription: string;
  microscopicDescription: string;
  ancillaryStudies: string;
  synoptic: {
    tumorType: string;
    grade: string;
    size: string;
    margins: string;
    lymphovascularInvasion: string;
    biomarkers: {
      er: string;
      pr: string;
      her2: string;
      ki67: string;
    };
  };
}

export interface CodingContext {
  icd10: string[];
  snomed: string[];
  loinc: string[];
  cpt: string[];
}

/** A single resolved synoptic answer — ID resolved to label */
export interface ResolvedAnswer {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  value: string | string[];
  displayValue: string; // human-readable, IDs resolved to labels
}

export interface SynopticContext {
  templateId: string;
  templateName: string;
  answers: ResolvedAnswer[];
}

export interface NarrativeSectionContext {
  id: string;
  title: string;
  order: number;
  enabled: boolean;
  aiInstruction: string;
}

export interface TemplateContext {
  templateId: string;
  templateName: string;
  orchestratorEnabled: boolean;
  sections: NarrativeSectionContext[];
}

export interface StructuredContext {
  /** ISO timestamp of when this context was built */
  builtAt: string;

  /** Case identifier — safe to include in prompts */
  caseId: string;

  /** Reporting mode */
  reportingMode: string;

  patient: PatientContext;
  pathologist: PathologistContext;
  accession: AccessionContext;
  order: OrderContext;
  specimens: SpecimenContext[];
  diagnostic: DiagnosticContext;
  coding: CodingContext;
  synoptic: SynopticContext;
  narrativeTemplate: TemplateContext;

  /** Validation warnings — non-fatal issues found during build */
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// Sentinel value for missing optional fields
// ─────────────────────────────────────────────────────────────

const MISSING = '(not recorded)';

const safe = (v: string | null | undefined): string =>
  v && v.trim() ? v.trim() : MISSING;

const safeArr = (v: string[] | null | undefined): string[] =>
  Array.isArray(v) && v.length > 0 ? v : [];

// ─────────────────────────────────────────────────────────────
// Synoptic answer resolver
// Resolves option IDs → human-readable labels using the
// EditorTemplate field definitions.
// ─────────────────────────────────────────────────────────────

function resolveAnswers(
  rawAnswers: Record<string, string | string[]>,
  synopticTemplate: EditorTemplate | null
): ResolvedAnswer[] {
  if (!synopticTemplate || !rawAnswers) return [];

  const allFields: EditorField[] = synopticTemplate.sections.flatMap(
    (sec: EditorSection) => sec.fields
  );

  return Object.entries(rawAnswers)
    .map(([fieldId, value]): ResolvedAnswer | null => {
      const field = allFields.find(f => f.id === fieldId);
      if (!field) return null;

      let displayValue: string;

      if (field.options && field.options.length > 0) {
        // Choice field — resolve IDs to labels
        const ids = Array.isArray(value) ? value : [value];
        const labels = ids.map(id => {
          const opt = field.options.find(o => o.id === id);
          return opt?.label ?? id;
        });
        displayValue = labels.join(', ');
      } else {
        // Free text / numeric
        displayValue = Array.isArray(value) ? value.join(', ') : value;
      }

      return {
        fieldId,
        fieldLabel: field.label,
        fieldType: field.type,
        value,
        displayValue,
      };
    })
    .filter((r): r is ResolvedAnswer => r !== null);
}

// ─────────────────────────────────────────────────────────────
// buildContext — main export
// ─────────────────────────────────────────────────────────────

export async function buildContext(
  caseData: Case,
  synopticTemplate: EditorTemplate | null,
  // The pathologist signing/finalising this report — used to populate the
  // pathologist context for signature-block template nodes. Optional and
  // defaults to null so existing call sites that haven't been updated yet
  // keep working; a missing signer just means MISSING sentinels are used
  // and a warning is recorded, same pattern as every other optional field
  // in this file.
  signingUser: User | null = null
): StructuredContext {
  const warnings: string[] = [];
  const rawAnswers = caseData.synopticAnswers ?? {};

  // ── Patient ──────────────────────────────────────────────
  const patient = caseData.patient;
  if (!patient) warnings.push('Patient data is missing');

  const patientContext: PatientContext = {
    mrn:         safe(patient?.mrn),
    dateOfBirth: safe(patient?.dateOfBirth),
    sex:         safe(patient?.sex),
    fullName:    patient
      ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') || MISSING
      : MISSING,
  };

  // ── Pathologist (signer) ──────────────────────────────────
  // Comes from the authenticated session, not caseData — the signer is
  // who is finalising the report right now, not anything stored on the case.
  if (!signingUser) warnings.push('No signing pathologist provided — signature block will be incomplete');

  const pathologistFullName = signingUser
    ? [signingUser.firstName, signingUser.middleName, signingUser.lastName].filter(Boolean).join(' ')
      || signingUser.name // fall back to the combined display name if parts aren't available
    : MISSING;

  const pathologistContext: PathologistContext = {
    id:                signingUser?.id ?? MISSING,
    fullName:          pathologistFullName || MISSING,
    credentials:       safe(signingUser?.credentials),
    signatureUrl:      signingUser?.signatureUrl ?? null,
    hasSignatureImage: !!signingUser?.signatureUrl,
    signedAt:          new Date().toISOString(),
  };

  // ── Accession ─────────────────────────────────────────────
  const acc = caseData.accession;
  if (!acc?.accessionNumber) warnings.push('Accession number is missing');

  const accessionContext: AccessionContext = {
    accessionNumber: safe(acc?.accessionNumber),
    fullAccession:   safe(acc?.fullAccession ?? acc?.accessionNumber),
    prefix:          safe(acc?.accessionPrefix),
    year:            acc?.accessionYear ?? null,
  };

  // ── Order ─────────────────────────────────────────────────
  const order = caseData.order;
  const orderContext: OrderContext = {
    priority:           safe(order?.priority),
    requestingProvider: safe(order?.requestingProvider),
    clinicalIndication: safe(order?.clinicalIndication),
    receivedDate:       safe(order?.receivedDate),
  };

  // ── Specimens ─────────────────────────────────────────────
  const specimens: SpecimenContext[] = (caseData.specimens ?? []).map(spec => ({
    id:             safe(spec.id),
    label:          safe((spec as any).label ?? (spec as any).description),
    type:           safe((spec as any).type ?? (spec as any).specimenType),
    site:           safe((spec as any).site ?? (spec as any).anatomicSite),
    collectionDate: safe((spec as any).collectionDate),
    quantity:       safe((spec as any).quantity),
  }));

  if (specimens.length === 0) warnings.push('No specimens found on case');

  // ── Diagnostic ────────────────────────────────────────────
  const dx: DiagnosticMetadata = caseData.diagnostic ?? {};
  const syn = dx.synoptic ?? {};

  const diagnosticContext: DiagnosticContext = {
    primaryDiagnosis:      safe(dx.primaryDiagnosis),
    secondaryDiagnoses:    safeArr(dx.secondaryDiagnoses),
    grossDescription:      safe(dx.grossDescription),
    microscopicDescription: safe(dx.microscopicDescription),
    ancillaryStudies:      safe(dx.ancillaryStudies),
    synoptic: {
      tumorType:               safe(syn.tumorType),
      grade:                   safe(syn.grade),
      size:                    safe(syn.size),
      margins:                 safe(syn.margins),
      lymphovascularInvasion:  safe(syn.lymphovascularInvasion),
      biomarkers: {
        er:   safe(syn.biomarkers?.er),
        pr:   safe(syn.biomarkers?.pr),
        her2: safe(syn.biomarkers?.her2),
        ki67: safe(syn.biomarkers?.ki67),
      },
    },
  };

  // ── Coding ────────────────────────────────────────────────
  const coding = caseData.coding ?? {};
  const codingContext: CodingContext = {
    icd10:  safeArr(coding.icd10),
    snomed: safeArr(coding.snomed),
    loinc:  safeArr(coding.loinc),
    cpt:    safeArr(coding.cpt),
  };

  // ── Synoptic answers ──────────────────────────────────────
  const resolvedAnswers = resolveAnswers(rawAnswers, synopticTemplate);

  if (Object.keys(rawAnswers).length > 0 && resolvedAnswers.length === 0) {
    warnings.push('Synoptic answers present but could not be resolved — template may be missing');
  }

  const synopticContext: SynopticContext = {
    templateId:   safe(caseData.synopticTemplateId),
    templateName: safe(synopticTemplate?.name),
    answers:      resolvedAnswers,
  };

  // ── Narrative template ────────────────────────────────────
  // Resolve the correct report template based on:
  //   1. CAP synoptic template IDs on this case
  //   2. Subspecialty fallback
  //   3. Gold standard universal fallback
  const synopticTemplateIds = (caseData.synopticReports ?? [])
    .map((r: any) => r.templateId)
    .filter(Boolean) as string[];

  const routing = await resolveReportTemplateAsync({
    subspecialtyId:    (caseData as any).subspecialtyId,
    synopticTemplateIds,
    performingClientId: (caseData.order as any)?.clientId,
    orderingPhysicianId: (caseData.order as any)?.requestingProvider,
  });

  const narrativeConfig = getNarrativeConfigForTemplate(routing.templateId);

  if (routing.ambiguous) {
    warnings.push(
      `Multiple report templates qualify for this case: ${routing.candidates.join(', ')}. ` +
      `Using "${routing.templateId}" — pathologist may override via Sequencer.`
    );
  }

  const templateContext: TemplateContext = {
    templateId:          narrativeConfig.templateId,
    templateName:        narrativeConfig.name,
    orchestratorEnabled: narrativeConfig.orchestratorEnabled,
    sections: narrativeConfig.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(s => ({
        id:            s.id,
        title:         s.title,
        order:         s.order,
        enabled:       s.enabled,
        aiInstruction: s.aiInstruction,
      })),
  };

  return {
    builtAt:          new Date().toISOString(),
    caseId:           caseData.id,
    reportingMode:    caseData.reportingMode ?? 'pathscribe',
    patient:          patientContext,
    pathologist:      pathologistContext,
    accession:        accessionContext,
    order:            orderContext,
    specimens,
    diagnostic:       diagnosticContext,
    coding:           codingContext,
    synoptic:         synopticContext,
    narrativeTemplate: templateContext,
    warnings,
  };
}
