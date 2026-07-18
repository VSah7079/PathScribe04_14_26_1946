// src/types/case/Case.ts
// ─────────────────────────────────────────────────────────────
// Authoritative Case domain model for PathScribe.
// FHIR-aligned (ServiceRequest, DiagnosticReport, Specimen, Task)
// ─────────────────────────────────────────────────────────────

import { Patient } from "./Patient";
import { Specimen } from "./Specimen";
import { CaseFlag } from "./CaseFlag";
import { SpecimenFlag } from "./SpecimenFlag";
import { CaseComment } from "./CaseComment";
import type { Icd10Code } from "@/services/diagnosisCodes/IDiagnosisCodesService";
import { CaseStatus } from "./CaseStatus";
import type { FieldLineageEntry } from '@/types/reports/FieldLineage';

export interface CaseCoding {
  icd10?: string[];
  icd11?: string[];
  icdO?: string[];
  snomed?: string[];
  loinc?: string[];
  cpt?: string[];
}

export interface AssignmentEvent {
  timestamp: string;
  assignedTo?: string;
  assignedBy?: string;
  reason?: string;
}

export interface OrderMetadata {
  /**
   * Fixed June 2026 — this used to be its own independent literal union
   * ("Routine" | "STAT" | "ASAP" | "Critical") that didn't match
   * CasePriority (services/cases/ICaseService.ts, 'Routine' | 'Rush' |
   * 'STAT') at all — two different, inconsistent priority vocabularies,
   * with "ASAP"/"Critical" values that never corresponded to anything
   * real anywhere in the app (no seed data, no PriorityLevel entry, no
   * UI ever offered them). Kept as a literal union here rather than
   * importing CasePriority directly, since ICaseService.ts imports Case
   * from this same file — a type-only circular import would likely
   * resolve fine, but duplicating three literal values is a smaller risk
   * than introducing a cross-module cycle this late. Keep in sync with
   * CasePriority if either changes.
   */
  priority: "Routine" | "Rush" | "STAT";
  requestingProvider?: string;
  /**
   * Stable physician ID, distinct from requestingProvider (which is a
   * display name). Feeds TemplateRoutingService's Pass 0b (Physician
   * Preference) and should match the ID space used by the Physician
   * Preferences admin screen (mockPhysicianService). Prefer this field over
   * requestingProvider wherever it's available — see contextBuilder.ts.
   */
  orderingPhysicianId?: string;
  /** ID reference to the Client Dictionary — the institution that sent the specimen */
  clientId?: string;
  /** Cached display name — avoids async lookup on every render */
  clientName?: string;
  /**
   * LIS/requisition cross-reference fields — added June 2026. These
   * existed in seed data for a while but were never part of this type,
   * which is exactly how the duplicate `order:` key bug happened: a
   * second, differently-shaped `order: {...}` literal (the one actually
   * typed against this interface) silently won over a first one
   * carrying these fields, discarding them at runtime with no error,
   * since object literals with duplicate keys aren't rejected by
   * TypeScript the way you'd hope. Not consumed by any UI/logic yet —
   * typed now so they're real, validated fields instead of silently
   * discarded seed data.
   */
  requisitionNumber?: string;
  externalOrderId?: string;
  labNumber?: string;
  blockId?: string;
  referralNumber?: string | null;
  reasonCodes?: string[];
  /**
   * Order-level diagnosis codes — real ICD-10-CM, referencing the
   * dedicated Icd10Code dictionary (services/diagnosisCodes/IDiagnosisCodesService.ts).
   * An array since real orders often carry a primary diagnosis plus
   * secondary ones, not just one code. Left distinct from the
   * pre-existing, generic reasonCodes field above (which is unused
   * anywhere in the app today) rather than repurposing it, so this
   * field's meaning is unambiguous.
   */
  icd10Codes?: Icd10Code[];
  clinicalIndication?: string;
  /**
   * Whole-case comment thread — distinct from clinicalIndication (the
   * clinical reason, feeds AI template routing) and from the per-report/
   * per-grossing-instance comment fields elsewhere in this file
   * (SynopticReportInstance.comment, GrossingReportInstance.comment).
   *
   * Changed from a single string (accessionComment) to a real append-
   * only thread — the single-field version was silently overwritten by
   * whoever saved last, with no record of who wrote what or when. Each
   * entry is its own record; nothing here is ever edited or deleted
   * once posted, same "time-bounded, not editable after the fact"
   * reasoning as everything else audited in this app.
   */
  caseComments?: CaseComment[];
  receivedDate?: string;
  assignedTo?: string;
  /** Participation type of the assigned pathologist — e.g. 'primary', 'consultant' */
  assignedParticipationTypeId?: string;
}

export interface DiagnosticMetadata {
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
  diagnosisCodes?: string[];
  issuedDate?: string;
  finalizedBy?: string;
  synoptic?: {
    tumorType?: string;
    grade?: string;
    size?: string;
    margins?: string;
    lymphovascularInvasion?: string;
    biomarkers?: { er?: string; pr?: string; her2?: string; ki67?: string };
  };
  grossDescription?: string;
  microscopicDescription?: string;
  ancillaryStudies?: string;
}

export interface AccessionMetadata {
  accessionNumber: string;
  accessionPrefix?: string;
  accessionYear?: number;
  fullAccession?: string;
  caseNumber?: number;
  externalAccession?: string;
}

// ─────────────────────────────────────────────────────────────
// Synoptic Report Instance
// Represents one template attached to one specimen.
// A case can have many of these (multiple specimens × multiple templates).
// ─────────────────────────────────────────────────────────────
export type AiFieldVerification = 'unverified' | 'verified' | 'disputed';

export interface AiFieldSuggestion {
  value: string | string[];
  confidence: number;        // 0–100
  source: string;            // e.g. 'Gross: "2.3 × 1.8 × 1.5 cm"'
  verification: AiFieldVerification;
}

export interface SynopticReportInstance {
  /** Unique ID for this report instance */
  instanceId: string;
  /** Which specimen this report belongs to */
  specimenId: string;
  /** The template used (e.g. 'breast_invasive') */
  templateId: string;
  /** Human-readable template name (cached for sidebar display) */
  templateName: string;
  /** User's answers for this report */
  answers: Record<string, string | string[]>;
  /** AI-suggested values per field — keyed by fieldId */
  aiSuggestions?: Record<string, AiFieldSuggestion>;
  /** Draft | finalized */
  status: 'draft' | 'finalized' | 'pending-countersign' | 'deferred';
  /** If deferred, what is pending (e.g. 'IHC', 'Molecular panel', 'FISH') */
  deferredPending?: string;
  /** Per-report comment (html) */
  comment?: string;

  // ── Synoptic-level assignment (parent-child sign-off) ──────────────────
  /** Pathologist assigned to finalise this specific synoptic (may differ from case owner) */
  assignedTo?: string;
  /** Display name of assigned pathologist — cached for UI */
  assignedToName?: string;
  /** User ID of who assigned it */
  assignedBy?: string;
  /** When this synoptic was assigned */
  assignedAt?: string;
  /** Whether case owner must countersign after assignee finalises */
  requiresCountersign?: boolean;
  /** Who countersigned */
  countersignedBy?: string;
  /** When countersigned */
  countersignedAt?: string;
/** Note from the assigning pathologist */
  assignmentNote?: string;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;

  // ── Amendment reseed state ──────────────────────────────────────────
  /** Was in seed data already but never formally typed. Set when an
   *  amendment reseed opens this instance for editing — distinguishes
   *  a reseeded amendment-in-progress draft from a genuinely new draft. */
  pendingAmendmentId?: string;
  /** Was in seed data already but never formally typed. True once this
   *  instance has been finalized at least once before. */
  previouslyFinalizedForAmendment?: boolean;
  /** NEW (DR-2) — field-level provenance for delta fields chosen during
   *  amendment reseeding. Only present for fields that differed across
   *  the version history being compared; unchanged fields' provenance
   *  is implicit in the ReportVersionRecord chain. See FieldLineage.ts. */
  fieldLineage?: Record<string, FieldLineageEntry>;
}

// ─────────────────────────────────────────────────────────────
// Grossing Report Instance
// Represents one Grossing Template instance attached to one specimen,
// filled out by the PA at the grossing bench — the data-shape equivalent
// of SynopticReportInstance, but for Stage 0/1 of the Orchestration
// workflow (case accession → Grossing Template assignment → PA completes
// Gross → AI evaluates and assigns diagnostic Synoptic Template(s)).
// See PathScribe_Orchestration_Workflow_Summary.md for the full lifecycle
// this supports.
//
// Deliberately kept structurally close to SynopticReportInstance so it
// flows through the same schema-driven renderer (RightSynopticPanel.tsx —
// confirmed generic over template kind, not hardcoded to diagnostic
// checklists) without requiring any new UI. Countersign/assignment fields
// from SynopticReportInstance are intentionally omitted here — grossing is
// PA-performed, single-sign-off work; add them back if a review/cosign
// workflow for grossing turns out to be needed later.
// ─────────────────────────────────────────────────────────────
export interface GrossingReportInstance {
  /** Unique ID for this report instance */
  instanceId: string;
  /** Which specimen this Grossing report belongs to */
  specimenId: string;
  /** The Grossing template used (e.g. 'grossing_gold_standard_generic') */
  templateId: string;
  /** Human-readable template name (cached for sidebar display) */
  templateName: string;
  /** PA's answers for this Grossing checklist */
  answers: Record<string, string | string[]>;
  /**
   * AI-suggested values per field — keyed by fieldId. Mirrors
   * SynopticReportInstance.aiSuggestions. Populated once a Stage 0/1
   * evaluation service exists; harmless/empty until then.
   */
  aiSuggestions?: Record<string, AiFieldSuggestion>;
  /**
   * 'draft' while the PA is working; 'finalized' once Gross is marked
   * complete. Finalizing is the save action that triggers Stage 1
   * evaluation (AI assigns/re-evaluates the diagnostic Synoptic
   * Template(s) for this specimen) — see contextBuilder.ts /
   * evaluateSynopticAssignment in mockCaseService.ts.
   *
   * Can revert from 'finalized' back to 'draft' automatically — editing a
   * finalized instance's answers is itself what reopens it (no separate
   * "unlock" action; see SynopticReportPage.tsx's grossing-snapshot
   * useEffect). previouslyFinalized below survives that revert, so the UI
   * can tell "first time" apart from "correcting something already done"
   * even after status has reverted to 'draft'.
   */
  status: 'draft' | 'finalized';
  /**
   * True once this instance has been finalized at least once, even if it
   * later reverted to 'draft' via an edit. Never cleared. Drives whether
   * the action button reads "Gross Complete" (first time) or "Update
   * Gross" (correcting something already done) and whether a reason
   * prompt fires on re-finalize.
   */
  previouslyFinalized?: boolean;
  /** Optional free-text comment from the PA (html) */
  comment?: string;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Protocol Change — an AI-proposed change to a specimen's diagnostic
// Synoptic Template assignment. Relocated here from ProtocolChangeModal.tsx
// (a UI component file) so the AI service layer (IAIIntegrationService)
// can return this type without importing from a page-level modal — a
// service interface importing its return type from a modal component was
// backwards layering. ProtocolChangeModal.tsx and SynopticReportPage.tsx
// both import this from here now instead of defining/re-exporting it.
// ─────────────────────────────────────────────────────────────
export type ProtocolChangeAction = 'replace' | 'add' | 'remove';

export interface ProtocolChange {
  id:                   string;
  specimenId:           string;
  specimenLabel:        string;
  specimenDesc:         string;

  /**
   * What this proposal does to the specimen's synoptic assignment.
   * - 'replace': swap an existing synoptic for a different template
   * - 'add':     assign a synoptic where none existed for this specimen
   * - 'remove':  drop a previously-assigned synoptic that's no longer needed
   * Defaults to 'replace' if absent, for backward compatibility with any
   * caller written before this field existed.
   */
  action?:              ProtocolChangeAction;

  /**
   * The specific existing synoptic instance this change targets (for
   * 'replace' and 'remove'). Prefer this over matching by specimenId alone —
   * a specimen can carry more than one synoptic instance, and specimenId by
   * itself can't disambiguate which one a proposal means.
   */
  currentInstanceId?:   string;
  /** Absent for 'add', since there is no existing template to show. */
  currentTemplateId?:    string;
  currentTemplateName?:  string;
  /** Absent for 'remove', since there is no replacement template. */
  proposedTemplateId?:   string;
  proposedTemplateName?: string;

  /** Human-readable reason from AI analysis of the microscopic description */
  reason:               string;
  confidence:           number;  // 0–100

  /**
   * Persisted verification status, mirroring AiFieldSuggestion.verification
   * exactly ('unverified' | 'verified' | 'disputed' in that type) — same
   * confirm/override interaction language used for individual field
   * suggestions in RightSynopticPanel.tsx, applied here at the whole-
   * synoptic-assignment level instead of per-field. Renamed values to fit
   * this context's actual actions (accept the proposed template swap /
   * dismiss it) rather than reusing 'verified'/'disputed' verbatim, which
   * read oddly for "accept this proposed replacement template."
   *
   * 'pending'   — proposed, not yet reviewed (equivalent to 'unverified')
   * 'accepted'  — pathologist applied this change via ProtocolChangeModal
   * 'dismissed' — pathologist explicitly chose not to apply it
   *
   * Previously ProtocolChange existed only transiently as
   * evaluateSynopticAssignment's input/output — nothing persisted what
   * happened to a proposal after the modal closed. Needed now so a
   * Stage 2 background check (fires on Save Draft with non-empty
   * Microscopic content, separate from the blocking pre-finalize check)
   * can leave a quiet, PERSISTENT badge for the pathologist to review on
   * their own schedule, rather than only ever surfacing as an ephemeral
   * toast or a forced interruption.
   */
  reviewStatus?: 'pending' | 'accepted' | 'dismissed';
}
export interface Case {
  id: string;

  /**
   * Subspecialty identifier for this case (e.g. 'breast', 'gi', 'thoracic',
   * 'uro', 'derm'). Optional — feeds TemplateRoutingService's Pass 2
   * (Subspecialty Fallback). When not set, contextBuilder.ts derives a
   * best-effort value from the case's synoptic protocol ID instead; see
   * PROTOCOL_TO_SUBSPECIALTY in TemplateRoutingService.ts.
   */
  subspecialtyId?: string;

  // ── Multi-report synoptic system ──────────────────────────
  // Each entry is one template instance attached to one specimen.
  synopticReports?: SynopticReportInstance[];

  // ── Grossing report system (Orchestration Stage 0/1) ──────
  // Each entry is one Grossing Template instance attached to one specimen,
  // filled out by the PA before the diagnostic Synoptic Template(s) for
  // that specimen are assigned. Mirrors synopticReports[] structurally —
  // see GrossingReportInstance above.
  grossingReports?: GrossingReportInstance[];

  // ── Synoptic fit re-evaluation (Orchestration Stage 2) ─────
  // Persisted result of the most recent evaluateSynopticAssignment() run
  // triggered by the Stage 2 BACKGROUND check (Save Draft with non-empty
  // Microscopic content — see SynopticReportPage.tsx's handleSaveDraft).
  // Distinct from the Stage 2 BLOCKING check at pre-finalize time
  // (handlePreFinalConfirm), which surfaces its own ProtocolChangeModal
  // immediately and doesn't need to persist anything past that moment —
  // this field exists specifically so a quiet background-check result
  // survives until the pathologist chooses to look at it (this session's
  // stated design: persistent over ephemeral), shown as a badge in
  // Sidebar.tsx next to the affected specimen/synoptic row. Cleared (or
  // its entries marked 'accepted'/'dismissed') once the pathologist
  // reviews them via ProtocolChangeModal, opened on demand by clicking
  // the badge — see ProtocolChange.reviewStatus.
  pendingProtocolChanges?: ProtocolChange[];

  // ── Legacy single-report fields (kept for backwards compat) ──
  // Used by cases seeded before synopticReports[] was introduced.
  // New code should prefer synopticReports[].
  synopticTemplateId?: string;
  synopticAnswers?: Record<string, string | string[]>;

  accession: AccessionMetadata;
  originHospitalId: string;
  originEnterpriseId: string;
  isReferenceLabCase?: boolean;

  patient: Patient;
  specimens: Specimen[];
  order: OrderMetadata;
  assignmentHistory?: AssignmentEvent[];
  diagnostic?: DiagnosticMetadata;
  coding?: CaseCoding;
  caseFlags?: CaseFlag[];
  specimenFlags?: SpecimenFlag[];
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  sharedWith?: string[];
  acceptedBy?: string;
  returnedBy?: string;
  closedBy?: string;
  /**
   * 'orchestrator' added — mockOrchestratorCaseService.ts's own header
   * comment confirms this was a deliberate fix ("was 'pathscribe', now
   * 'orchestrator'"), but this type was never updated to match, and every
   * case object in that file is cast `as any`, which silently hid the
   * mismatch from the compiler. Before this fix, 'pathscribe' === Orchestration
   * was the only reading the type supported, but zero real Orchestration
   * cases actually carry that value — they all carry 'orchestrator'. Any
   * code checking `reportingMode === 'pathscribe'` to detect Orchestration
   * mode (e.g. contextBuilder.ts's default) was matching nothing real.
   * 'pathscribe' is left in the union for backward compat with anything
   * already relying on it as a default/fallback value.
   */
  reportingMode?: "pathscribe" | "orchestrator" | "native" | "copilot";
}
