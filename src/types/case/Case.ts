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
import type { RevisionType } from '@/types/reports/AmendmentRecord';

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
  /** Physical facility within originHospitalId's organisation — Site.id
   *  from Organisation.sites[] (e.g. 'SITE-MRI'), NOT a bare shortName
   *  like 'MRI'. Optional: not every accessioning flow captures this yet,
   *  and originHospitalId alone remains the org-level identity — this is
   *  additional, finer-grained routing info, not a replacement for it.
   *  Added for Mode A hardware dispatch (services/hardware/
   *  ModeAInterfaceService.ts) — an organisation with multiple physical
   *  sites (MFT has three: MRI, WYT, NMGH) may need to route to a
   *  different local Vantage/Cerebro instance per site, which
   *  originHospitalId alone can't distinguish. */
  siteId?: string;
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
  /** The human-facing accession identifier — what appears on labels,
   *  cassettes, and report headers (orchestratorEngine.ts's narrative
   *  header reads this field directly). Distinct from Case.id, which
   *  stays a stable, always-'O26-'-prefixed internal routing key —
   *  CaseRouter.isOrchCase() and friends key off Case.id specifically
   *  because it has to be resolvable before the Case object is even
   *  fetched, so it can never be allowed to vary with an org's mask
   *  config. fullAccession is what's actually driven by the org-scoped
   *  CaseMaskConfig registry (services/caseRegistry/) — see
   *  AccessionPage.tsx's handleSubmit. */
  fullAccession?: string;
  /** Which mask pattern actually produced fullAccession — kept as its
   *  own field (not re-derived) specifically so that if an organisation
   *  changes their mask pattern later, historical cases still show
   *  which pattern generated their number rather than being silently
   *  reinterpreted under the new one. */
  formatPatternUsed?: string;
  accessionedAt?: string;
  accessionedBy?: string;
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
  /** The revision kind of the most recent release on this instance —
   *  'original' (never revised) | 'amendment' | 'correction' | 'addendum'.
   *  Source of truth for the Final (Amended)/(Corrected)/(Addendum)
   *  display label; set in releasePendingAmendmentOrAddendum
   *  (SynopticReportPage.tsx) from the released AmendmentRecord's own
   *  `type`. See AMENDMENT_STATUS_REDESIGN_BRIEF.md. */
  lastRevisionType?: RevisionType;
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
  /** Physical facility within originHospitalId's organisation — e.g.
   *  'SITE-MRI' (Site.id, from Organisation.sites[]), not a bare
   *  shortName like 'MRI'. Optional: most orgs today have exactly one
   *  site, and originHospitalId alone is sufficient for anything that
   *  doesn't need facility-level routing. Only populated where it's
   *  actually captured — see AccessionPage.tsx. Added specifically for
   *  ModeAInterfaceService's site-level hardware routing (an
   *  organisation like MFT can have multiple physical Vantage/Cerebro
   *  endpoints, one per site, which originHospitalId alone can't
   *  distinguish between). */
  originSiteId?: string;
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
  /** Denormalized mirror of the active/most-recently-touched synoptic
   *  instance's SynopticReportInstance.lastRevisionType — kept in sync
   *  at the same moment (releasePendingAmendmentOrAddendum in
   *  SynopticReportPage.tsx) purely so list views (WorklistPage,
   *  WorklistTable, SearchPage) can render the Final (Amended)/
   *  (Corrected)/(Addendum) badge without joining against amendment
   *  records for every row. The instance-level field is the source of
   *  truth for any per-instance question; this is a display convenience
   *  only. See AMENDMENT_STATUS_REDESIGN_BRIEF.md. */
  lastRevisionType?: RevisionType;
  createdAt: string;
  updatedAt: string;
  /** Real, incrementing optimistic-concurrency version for the whole case
   *  record — per the Case Hydration & Optimistic Concurrency Control
   *  spec's §3.1. Distinct from OrchestratorSection.updatedAt (per-section
   *  version, used for sectional locking within Orchestration narrative
   *  content specifically) — this is the case-level rollup used for
   *  lightweight client staleness checks on load and the general
   *  compare-and-swap in FirestoreCaseService.updateCase. Starts at 1 on
   *  creation; the service increments it atomically inside a transaction
   *  on every successful write, never client-side. */
  version?: number;
  sharedWith?: string[];
  acceptedBy?: string;
  returnedBy?: string;
  closedBy?: string;
  /** See ReportingMode's doc comment below for the full history of this
   *  field's value set (why 'pathscribe' and 'native' were dropped). */
  reportingMode?: ReportingMode;
  /** Structured multi-person team roster — formerly only writable via
   *  `as any` from CaseTeamModal.tsx with no declared type. See
   *  CaseParticipant below. order.assignedTo/assignedParticipationTypeId
   *  remain the indexed "who owns this case" fields that
   *  listCasesForUser() filters on — participants[] is kept in sync with
   *  them via syncPrimaryAssignee() (caseAssignmentSync.ts), not a
   *  replacement for them. */
  participants?: CaseParticipant[];
  /** Local workflow overlay for 'assist'-mode cases, where CaseStatus is
   *  LIS-owned and off-limits to PathScribe. NOTE: not yet wired to
   *  anything — no code in this pass reads or writes it. Added because
   *  it's been specified across several design-doc revisions, but same
   *  standard as the CaseStatus cleanup earlier in this project: an
   *  unused field is worth flagging, not silently shipping. Wire it up
   *  for real once something actually needs it, same as the other
   *  once-speculative fields that got seeded properly rather than left
   *  inert. */
  pathscribeWorkflowState?: 'idle' | 'ai_processing' | 'suggestions_ready' | 'draft_in_progress';
}

/** 'assist' = LIS owns the report, PathScribe is read-only on lifecycle —
 *  operates as a visual overlay / intelligent assistant only, mutating
 *  pathscribeWorkflowState, never CaseStatus. 'orchestrator' = PathScribe
 *  owns the full report lifecycle, native/owned CaseStatus, transitions
 *  only via explicit clinical actions (Sign-out, Submit for Review, Claim
 *  from Pool).
 *
 *  Renamed from 'copilot' (was the value here previously) for trademark
 *  safety — Microsoft holds a live registered trademark on COPILOT
 *  (USPTO Reg #6256123, Computer & Software Services class), and while
 *  the term has been used informally by other companies, this codebase's
 *  own use of "CoPilot" wasn't purely an internal code name — it
 *  surfaced in user-facing strings (a Contribution-dashboard label, a
 *  BottomActionBar tooltip). 'assist' was chosen specifically because
 *  it's a generic/descriptive word — legally the *safer* category, since
 *  generic terms are too weak to function as anyone's exclusive
 *  trademark, unlike a coined/stylized term like "Copilot" that reads as
 *  source-identifying. Not a substitute for real trademark clearance —
 *  a defensive rename made ahead of that, not instead of it.
 *
 *  Narrowed from the old 4-value union ("pathscribe" | "orchestrator" |
 *  "native" | "copilot") before this rename — 'native' had zero real
 *  usage anywhere in the app, and 'pathscribe' was already dead for
 *  detecting Orchestration mode (mockOrchestratorCaseService.ts switched
 *  to 'orchestrator' for that; see contextBuilder.ts's fallback, also
 *  fixed). */
export type ReportingMode = 'assist' | 'orchestrator';

// ── Case Team / Delegation domain types ─────────────────────────────────────
// Formalizes what was previously a locally-declared, `as any`-cast-only type
// inside CaseTeamModal.tsx (the only place it existed) into a real, shared
// domain type — per the Case Assignment Synchronization TDS. Real seeded
// participation type IDs today: 'primary', 'attending', 'consultant',
// 'resident', 'cytotechnologist', 'frozen', 'grossing', 'second_opinion'
// (see mockParticipationTypeService.ts) — participationTypeIds should only
// ever contain values from that set, not invented strings.
export interface CaseParticipant {
  staffId: string;
  staffName: string;
  externalId?: string;
  externalIdType?: 'GMC' | 'NPI';
  source: 'system' | 'manual';
  participationTypeIds: string[];
  addedBy: string;
  addedAt: string;
  status: 'active' | 'removed';
}
