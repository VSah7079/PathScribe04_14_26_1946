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
//   • Routing resolution failures degrade to gold-standard + a warning —
//     report generation must never hard-fail because routing had a hiccup
// ─────────────────────────────────────────────────────────────

import type { Case, DiagnosticMetadata } from '../types/case/Case';
import type { EditorTemplate, EditorField, EditorSection } from '../components/Config/Protocols/SynopticEditor';
import { resolveReportTemplateAsync, deriveSubspecialtyFromProtocols, type TemplateRoutingResult } from '../services/reportTemplates/TemplateRoutingService';
import type { ReportTemplate } from '../types/reportPart';
import type { SectionNode, TemplateNode } from '../types/template';
import { mockReportTemplateService } from '../services/reportTemplates/mockReportTemplateService';
import { mockReportPartService } from '../services/reportParts/mockReportPartService';

// narrativeTemplateRegistry.ts is retired as of this change (see
// NEXT_SESSION_BRIEF §1a). It is no longer imported anywhere in this file —
// do not reintroduce it, even as a fallback. The gold-standard template is
// now resolved through the same real Parts/Assembly path as every other
// template, not through the old static registry.

// ─────────────────────────────────────────────────────────────
// Minimal shape for the signed-in pathologist, used for sign-off
// context. Loosely typed pending the real User type from AuthContext —
// only the fields actually needed here are declared.
// ─────────────────────────────────────────────────────────────

export interface SigningUser {
  id?: string;
  name?: string;
  credentials?: string;
}

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
  /** ReportPart this section's SectionNode came from — traceability for debugging routing/assembly issues */
  sourcePartId?: string;
}

/**
 * One resolved, enabled body-role assembly slot, with its Part's full node
 * tree attached. This is the raw material a template-aware renderer needs
 * to reproduce labelConfig / showWhen / column layouts / repeat-groups —
 * none of which a flat NarrativeSectionContext list can carry, since most
 * body Parts (demographics, specimens, synoptic summary, sign-off) are not
 * AI-narrative sections at all. See NEXT_SESSION_BRIEF follow-up note on
 * ReportPreviewRenderer.tsx for why both shapes are exposed here.
 */
export interface BodyPartAssembly {
  slotId: string;
  partId: string;
  partName: string;
  order: number;
  nodes: TemplateNode[];
}

export interface TemplateContext {
  templateId: string;
  templateName: string;
  orchestratorEnabled: boolean;
  /** AI-generation sections only — feeds OrchestratorEngine. Derived from
   *  SectionNodes with ai.enabled === true, found anywhere in the resolved
   *  body Parts' node trees. */
  sections: NarrativeSectionContext[];
  /** Every enabled body-role Part in assembly order, full node tree intact.
   *  Feeds the report renderer once it's updated to walk real node trees
   *  instead of a flat AI-section list (see brief follow-up). */
  bodyAssembly: BodyPartAssembly[];
}

export interface SignOffContext {
  pathologistId: string;
  pathologistName: string;
  credentials: string;
}

export interface StructuredContext {
  /** ISO timestamp of when this context was built */
  builtAt: string;

  /** Case identifier — safe to include in prompts */
  caseId: string;

  /** Reporting mode */
  reportingMode: string;

  patient: PatientContext;
  accession: AccessionContext;
  order: OrderContext;
  specimens: SpecimenContext[];
  diagnostic: DiagnosticContext;
  coding: CodingContext;
  synoptic: SynopticContext;
  narrativeTemplate: TemplateContext;
  signOff: SignOffContext;

  /** How narrativeTemplate.templateId was resolved — see TemplateRoutingService */
  routingResolvedBy: TemplateRoutingResult['resolvedBy'];
  /** True when routing matched multiple candidate templates (multi-organ case) */
  routingAmbiguous: boolean;
  /** All qualifying template IDs in priority order, when ambiguous */
  routingCandidateTemplateIds: string[];

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
// Real Parts/Assembly resolution — replaces narrativeTemplateRegistry
//
// Fetches the resolved ReportTemplate, walks its enabled body-role
// assembly slots in assembly order, fetches each referenced ReportPart,
// and derives:
//   • sections     — every SectionNode with ai.enabled === true, in
//                     document order, for the Orchestrator Engine to
//                     generate prose for.
//   • bodyAssembly — the full node tree for every enabled body Part,
//                     for a template-aware renderer to walk directly.
//
// No fallback to the old registry, ever. A fetch failure here degrades
// to resolving 'tmpl-gold-standard' through this exact same function —
// consistent with the existing routing-failure degradation pattern
// below, and confirming gold-standard is real Parts/Assembly too, not
// a hardcoded special case.
// ─────────────────────────────────────────────────────────────

function isSectionNode(n: TemplateNode): n is SectionNode {
  return n.type === 'section';
}

function hasChildren(n: TemplateNode): n is TemplateNode & { children: TemplateNode[] } {
  return Array.isArray((n as { children?: unknown }).children);
}

/** Recursively collects every SectionNode with ai.enabled === true, in document order. */
function collectAiSections(nodes: TemplateNode[]): SectionNode[] {
  const found: SectionNode[] = [];
  for (const n of nodes) {
    if (isSectionNode(n)) {
      if (n.ai?.enabled) found.push(n);
      found.push(...collectAiSections(n.children));
    } else if (hasChildren(n)) {
      found.push(...collectAiSections(n.children));
    }
  }
  return found;
}

interface ResolvedTemplateSections {
  template: ReportTemplate | null;
  sections: NarrativeSectionContext[];
  bodyAssembly: BodyPartAssembly[];
}

async function resolveTemplateSections(templateId: string): Promise<ResolvedTemplateSections> {
  const templateRes = await mockReportTemplateService.getById(templateId);
  if (!templateRes.ok) {
    throw new Error(`Report template '${templateId}' not found: ${templateRes.error}`);
  }
  const template = templateRes.data;

  const bodySlots = (template.assembly ?? [])
    .filter(s => s.enabled && s.role === 'body')
    .slice()
    .sort((a, b) => a.order - b.order);

  if (bodySlots.length === 0) {
    return { template, sections: [], bodyAssembly: [] };
  }

  const partsRes = await mockReportPartService.getByIds(bodySlots.map(s => s.partId));
  if (!partsRes.ok) {
    throw new Error(`Failed to load report parts for template '${templateId}': ${partsRes.error}`);
  }
  const partsById = new Map(partsRes.data.map(p => [p.id, p] as const));

  const bodyAssembly: BodyPartAssembly[] = [];
  const sections: NarrativeSectionContext[] = [];
  let sectionOrder = 0;

  for (const slot of bodySlots) {
    const part = partsById.get(slot.partId);
    if (!part) continue; // referenced part missing/archived — skip the slot, don't hard-fail the report

    bodyAssembly.push({
      slotId:   slot.slotId,
      partId:   part.id,
      partName: part.name,
      order:    slot.order,
      nodes:    part.nodes ?? [],
    });

    for (const sec of collectAiSections(part.nodes ?? [])) {
      sections.push({
        id:            sec.id,
        title:         sec.printHeading ?? sec.label,
        order:         sectionOrder++,
        enabled:       true,
        aiInstruction: sec.ai?.systemInstruction ?? '',
        sourcePartId:  part.id,
      });
    }
  }

  return { template, sections, bodyAssembly };
}

// ─────────────────────────────────────────────────────────────
// buildContext — main export
// ─────────────────────────────────────────────────────────────

export async function buildContext(
  caseData: Case,
  synopticTemplate: EditorTemplate | null,
  signingUser?: SigningUser | null,
  /**
   * Pathologist's manual template override (Change ▾ in the UI). When set
   * and different from the auto-resolved template, this ID is used instead
   * — resolved through the exact same real Parts/Assembly path, not a
   * second copy of the logic at the call site. Previously SynopticReportPage
   * re-derived narrativeTemplate itself via the now-retired registry for
   * this case; that divergent path is gone — this is the only place
   * template→sections resolution happens.
   */
  templateIdOverride?: string,
): Promise<StructuredContext> {
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

  // ── Narrative template — resolved via TemplateRoutingService ──
  // Pass 0 (Client Override) uses order.clientId — a real, stable ID.
  // Pass 0b (Physician Preference) now prefers order.orderingPhysicianId —
  // a real, stable ID matching the Physician Preferences admin screen — and
  // falls back to order.requestingProvider (a display name) only when that
  // field hasn't been populated upstream yet for this case.
  // Pass 2 (Subspecialty Fallback) now prefers Case.subspecialtyId when set,
  // and falls back to deriving a subspecialty from the case's synoptic
  // protocol ID(s) when it isn't — see PROTOCOL_TO_SUBSPECIALTY in
  // TemplateRoutingService.ts. Cases with neither subspecialtyId nor a
  // recognized protocol still fall through cleanly to Pass 3 (Gold Standard).
  const synopticTemplateIds = Array.from(new Set([
    ...((caseData.synopticReports ?? []).map(r => r.templateId).filter(Boolean)),
    ...(caseData.synopticTemplateId ? [caseData.synopticTemplateId] : []),
  ]));

  const subspecialtyId = caseData.subspecialtyId
    ?? deriveSubspecialtyFromProtocols(synopticTemplateIds);

  let routingResult: TemplateRoutingResult;
  try {
    routingResult = await resolveReportTemplateAsync({
      synopticTemplateIds,
      performingClientId:  caseData.order?.clientId,
      orderingPhysicianId: caseData.order?.orderingPhysicianId ?? caseData.order?.requestingProvider,
      subspecialtyId,
    });
  } catch (e) {
    // Routing must never hard-fail report generation — degrade to
    // gold-standard and surface the problem as a warning instead.
    warnings.push(`Template routing failed (${(e as Error)?.message ?? 'unknown error'}) — using gold-standard template`);
    routingResult = {
      templateId: 'tmpl-gold-standard',
      ambiguous:  false,
      candidates: ['tmpl-gold-standard'],
      resolvedBy: 'gold-standard',
    };
  }

  if (routingResult.ambiguous) {
    warnings.push(
      `Template routing matched multiple candidate templates (${routingResult.candidates.join(', ')}) — ` +
      `using ${routingResult.templateId}. Multi-organ case may need the pathologist to confirm via Change ▾.`
    );
  }

  const effectiveTemplateId = templateIdOverride ?? routingResult.templateId;
  if (templateIdOverride && templateIdOverride !== routingResult.templateId) {
    warnings.push(
      `Pathologist override: using template '${templateIdOverride}' instead of auto-resolved '${routingResult.templateId}'`
    );
  }

  let resolved: ResolvedTemplateSections;
  try {
    resolved = await resolveTemplateSections(effectiveTemplateId);
  } catch (e) {
    warnings.push(
      `Template/Part resolution failed for '${effectiveTemplateId}' ` +
      `(${(e as Error)?.message ?? 'unknown error'}) — falling back to gold-standard template`
    );
    try {
      resolved = await resolveTemplateSections('tmpl-gold-standard');
    } catch (e2) {
      // Both the routed template AND gold-standard failed to resolve via
      // Parts/Assembly (e.g. mock service unavailable). There is no
      // further fallback — surface an empty narrative rather than silently
      // reintroducing the retired registry.
      warnings.push(
        `Gold-standard template also failed to resolve (${(e2 as Error)?.message ?? 'unknown error'}) — narrative will be empty`
      );
      resolved = { template: null, sections: [], bodyAssembly: [] };
    }
  }

  const templateContext: TemplateContext = {
    templateId:           resolved.template?.id   ?? effectiveTemplateId,
    templateName:         resolved.template?.name ?? effectiveTemplateId,
    orchestratorEnabled:  resolved.template?.orchestrationEnabled ?? false,
    sections:             resolved.sections,
    bodyAssembly:         resolved.bodyAssembly,
  };

  // ── Sign-off ───────────────────────────────────────────────
  const signOffContext: SignOffContext = {
    pathologistId:   safe(signingUser?.id),
    pathologistName: safe(signingUser?.name),
    credentials:     safe(signingUser?.credentials),
  };

  return {
    builtAt:          new Date().toISOString(),
    caseId:           caseData.id,
    reportingMode:    caseData.reportingMode ?? 'pathscribe',
    patient:          patientContext,
    accession:        accessionContext,
    order:            orderContext,
    specimens,
    diagnostic:       diagnosticContext,
    coding:           codingContext,
    synoptic:         synopticContext,
    narrativeTemplate: templateContext,
    signOff:          signOffContext,
    routingResolvedBy:           routingResult.resolvedBy,
    routingAmbiguous:             routingResult.ambiguous,
    routingCandidateTemplateIds: routingResult.candidates,
    warnings,
  };
}
