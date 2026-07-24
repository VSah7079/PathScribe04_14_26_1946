// src/services/clients/IClientService.ts
// ─────────────────────────────────────────────────────────────
// Canonical Client type + service interface. Previously this file and
// mockClientService.ts each declared their OWN separate, diverged `Client`
// interface — this one had address/contact fields (city/state/zip/
// contactName/contactTitle/notes) but no pediatric/TAT config; the one in
// mockClientService.ts had pediatric/TAT config but no address/contact
// detail. mockClientService.ts never imported from this file at all, so
// the two silently drifted apart. Two files elsewhere (ValidationStudies
// Section.tsx, RoutingRulesTab.tsx) imported the Client *type* from here
// while importing the *service* from mockClientService.ts — that only
// compiled because both files only ever touched `.status`, which happened
// to exist on both diverged shapes.
//
// Reconciled June 2026: this file is now the single source of truth,
// following the same pattern IPhysicianService.ts already establishes
// (mock implementation imports the type from here, doesn't redeclare it).
// The address/contact fields from the old version of this file are kept
// but made optional, since existing seed data and most consumers never
// populated them — nothing should break by their absence.
// ─────────────────────────────────────────────────────────────

import { ServiceResult, ID } from '../types';
import type { Jurisdiction } from '../../types/systemConfig';

// ─── Client hierarchy + integration settings ───────────────────────────────
// Merged in from the second, previously-disconnected client system
// (contexts/useClientDictionary.ts, reconciled June 2026 — see that
// removal's note in mockClientService.ts history). Kept as their own
// sub-interfaces rather than flattened, matching how they were originally
// modeled and how ClientEditorModal.tsx already edits them as grouped
// sections (HL7 tab, Reporting tab).
export type ClientType = 'internal' | 'external';
//   internal — an affiliated site of the purchasing institution itself
//   external — an independent submitting practice or reference lab partner

export interface ClientHL7Settings {
  sendingFacility: string;    // MSH-4
  receivingFacility: string;  // MSH-6
  hl7Version: string;         // e.g. "2.5.1"
  enabled: boolean;
}

export interface ClientReportingPreferences {
  reportFormat: 'PDF' | 'HL7' | 'Both';
  deliveryMethod: 'Email' | 'Fax' | 'Portal' | 'HL7';
  autoRelease: boolean;
  copyToReferring: boolean;
}

export interface Client {
  id: ID;
  name: string;
  code: string;
  address: string;
  /** Optional — not populated by existing seed data or most consumers.
   *  Kept from the pre-reconciliation IClientService.ts shape. */
  city?: string;
  state?: string;
  zip?: string;
  phone: string;
  fax: string;
  email: string;

  // ── Contact person name — medical-grade schema (June 2026), same model
  // as Patient/Physician. All optional since a client's contact person is
  // itself optional data (unlike Patient/Physician, no existing seed data
  // populated the old single contactName string either, so nothing to
  // migrate). See utils/personName.ts.
  contactNamePrefix?: string;
  contactGivenNames?: string;
  contactFamilyNames?: string;
  contactPreferredName?: string;
  contactNameSuffix?: string;
  /** @deprecated Use contactGivenNames/contactFamilyNames. Derived
   *  display string, kept for ClientTable.tsx and any other consumer
   *  reading a single contact name string. */
  contactName?: string;
  contactTitle?: string;
  notes?: string;

  /** internal (affiliated site of the purchasing institution) vs external
   *  (independent outreach client). Defaults to 'external' for existing
   *  seed clients — each reads as its own separate named institution
   *  rather than an affiliate of one parent; revisit per real client. */
  clientType: ClientType;
  /** Affiliates only — points to the parent institution's Client.id. */
  parentId?: string;
  /**
   * Which internal client's lab actually performs work ordered by this
   * client. Real, admin-configured data — set once, deliberately — never
   * inferred from who happens to be logged in or accessioning at the
   * time; a Trust's real routing relationships don't change session to
   * session. Resolution: this field if set, else the client's own id if
   * clientType is 'internal', else undefined (an external client has no
   * lab of its own by definition and must have this set explicitly —
   * worth enforcing at client-creation time rather than leaving unset).
   *
   * This is administrative/default attribution only — which Trust
   * entity is nominally responsible for a client's work. It's
   * deliberately separate from real-time physical specimen tracking
   * (where a given block actually sits right now — grossing station,
   * processor, embedding bench, stainer), which is a real, larger,
   * separate concept, flagged as future work, not built here. That
   * system would need its own Location entity nested under a client,
   * plus a `currentLocationId` living on HistologyBlock rather than the
   * case (blocks already work through the lab semi-independently), plus
   * an append-only location-transition audit trail — matching the same
   * pattern already proven by the Deficiency audit log and comment
   * threads. This field is the sensible fallback until that exists, not
   * a replacement for it.
   */
  performingLabClientId?: string;
  hl7: ClientHL7Settings;
  reporting: ClientReportingPreferences;

  /**
   * Per-client jurisdiction — drives patient ID validation (NHS Number vs
   * CHI Number vs US MRN, etc.), date/time locale, and terminology
   * (SNOMED/ICD-10 variant). Added June 2026 when jurisdiction moved from
   * a single system-wide SystemConfig.jurisdiction setting to per-client,
   * since a single trial deployment serves both UK and US clients
   * simultaneously — SystemConfig.jurisdiction remains as the fallback
   * default for contexts with no client resolved yet (e.g. system-level
   * screens not tied to any one case).
   */
  jurisdiction: Jurisdiction;

  /**
   * Which of the two CAP/NSH-recognized specimen/block labeling patterns
   * this client's accessioning uses. Deliberately a single enum, not two
   * independent alpha/numeric toggles for specimen and block separately —
   * the CAP/NSH "Uniform Labeling of Blocks and Slides in Surgical
   * Pathology" guideline names exactly two patterns, and both alternate
   * symbol type between the two levels specifically so a block ID is
   * never mistakable for a specimen ID at a glance:
   *   'alpha-specimen'   — Specimen A, B, C... / Block A1, A2, A3...
   *   'numeric-specimen' — Specimen 1, 2, 3... / Block 1A, 1B, 1C...
   * A flat "alpha or numeric, chosen independently per level" design
   * would allow configuring both levels the same symbol type (e.g.
   * "Specimen 1, Block 1"), which is exactly the ambiguity this
   * guideline exists to prevent — this enum makes that combination
   * structurally impossible rather than something to validate against.
   * No single international standard mandates one pattern over the
   * other (confirmed against both CAP and RCPath — RCPath's own tissue
   * pathway guidance says only "a unique identifying number/letter,"
   * institution's choice) — hence this is a per-Client setting, not a
   * jurisdiction-based default.
   * Defaults to 'alpha-specimen' — the existing behavior, unchanged
   * unless a client is explicitly set otherwise.
   */
  specimenLabelStyle?: 'alpha-specimen' | 'numeric-specimen';

  /**
   * Per-internal-client override for AI Orchestrator narrative auto-draft
   * (the "Orchestrator Config" panel in Configuration → AI Behavior — see
   * components/Config/AI/orchestratorModeConfig.ts). null/undefined =
   * inherit the org-level default. Only meaningful on an internal client
   * (clientType === 'internal', i.e. an actual performing lab) — an
   * external client has no lab of its own, so its own value here is
   * never consulted; resolution always follows resolvePerformingLabClientId()
   * to the internal client that actually performs the work, same as every
   * other performing-lab-scoped setting.
   *
   * Deliberately distinct from the Orchestration *case-routing* concept
   * (O26-/S26- accession prefixes, CaseRouter.ts, Role.canViewOrchestration)
   * — that controls which system owns the report record; this controls
   * only whether the AI auto-drafts narrative sections in the editor for
   * cases performed at this lab. A lab can be in either routing mode and
   * still want this on or off.
   */
  internalAiOrchestratorEnabled?: boolean | null;
  /**
   * Per-performing-lab idle-session-timeout override, in minutes. Resolved
   * the same way as internalAiOrchestratorEnabled — via
   * resolvePerformingLabClientId() against whichever client is actually
   * performing the work on the currently-open case, not the ordering
   * client if those differ. When set, wins over the org-wide default
   * (services/session/sessionTimeoutConfig.ts) for anyone viewing a case
   * performed at this lab. undefined/null = inherit the org default.
   */
  idleTimeoutMinutesOverride?: number | null;

  status: 'Active' | 'Inactive' | 'Unverified';
  /** True if this client was auto-created by order-intake resolution
   *  (crosswalk had no match for the client code on an incoming order)
   *  rather than configured by an admin. Same governance shape as
   *  Physician.autoCreated and SpecimenCategory.autoCreated. */
  autoCreated?: boolean;
  autoCreatedAt?: string;
  /** Free-text note left by whatever created a pending client — e.g. the
   *  raw client code/name string from the source order that didn't match
   *  anything, kept so the admin reviewing it has context. */
  autoCreatedNote?: string;

  /** Age threshold (in years) below which a patient is considered pediatric.
   *  Null = not configured — admin must verify with this client before enabling. */
  pediatricAgeThreshold: number | null;
  /** User IDs explicitly approved to report pediatric cases from this client.
   *  Both this AND canViewPediatric on the user record must be true (Option C). */
  authorizedPediatricPathologistIds: string[];
  // ── TAT configuration ─────────────────────────────────────────────────────
  /** Hours from receivedDate before a first-touch escalation fires.
   *  Null = use system default (SystemConfig.defaults.tatFirstTouchHours). */
  tatFirstTouchHours: number | null;
  /** Total case TAT target in hours (receivedDate → finalizedAt).
   *  Null = use system default (SystemConfig.defaults.tatTotalHours). */
  tatTotalHours: number | null;
  /** Roles to notify when a TAT threshold is breached. Empty = no notifications. */
  escalationTargets: ('pathGroup' | 'admin' | 'referrer')[];
  /** Urgency level applied to escalation alerts for this client. */
  escalationPriority: 'high' | 'critical';

  createdAt?: string;
  updatedAt?: string;
}

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Resolves which client's lab performs work ordered by the given client.
 * Pure and data-only — reads exactly two stored facts (performingLabClientId,
 * clientType), nothing derived from session/login context. See
 * Client.performingLabClientId's own doc comment for the full reasoning.
 *
 * Returns undefined for an external client with no override set — that's
 * a real configuration gap (external clients have no lab of their own by
 * definition), worth surfacing rather than silently guessing.
 */
export function resolvePerformingLabClientId(client: Client): string | undefined {
  if (client.performingLabClientId) return client.performingLabClientId;
  if (client.clientType === 'internal') return client.id;
  return undefined;
}

export interface IClientService {
  getAll(): Promise<ServiceResult<Client[]>>;
  getById(id: ID): Promise<ServiceResult<Client>>;
  add(client: Omit<Client, 'id'>): Promise<ServiceResult<Client>>;
  update(id: ID, changes: Partial<Omit<Client, 'id'>>): Promise<ServiceResult<Client>>;
  deactivate(id: ID): Promise<ServiceResult<Client>>;
  reactivate(id: ID): Promise<ServiceResult<Client>>;
  /** Flips an Unverified client to Active — the admin-approval step. */
  verify(id: ID): Promise<ServiceResult<Client>>;
  /**
   * Called by order-intake / crosswalk resolution. No exact crosswalk
   * match on the order's client code → creates an Unverified, autoCreated
   * client so processing can continue immediately, defaulting to no
   * pediatric/TAT configuration (safest default — forces explicit admin
   * setup rather than silently inheriting another client's settings)
   * until an admin reconciles it. Mirrors IPhysicianService.findOrCreateByNpi
   * and ISpecimenCategoryService.findOrCreateByName exactly.
   */
  findOrCreateByCode(code: string, name: string, note?: string): Promise<ServiceResult<Client>>;
}
