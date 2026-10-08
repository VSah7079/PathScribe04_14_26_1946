// src/types/autopsy/AutopsyCaseDetails.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the uploaded "Comprehensive Requirements Specification:
// Autopsy Pathology Module" (direct guidance). This is Phase 1 of an
// 8-phase build — the core data model everything else (jurisdiction
// rules, PAD/FAD generation, HTA retention, worklist integration)
// attaches to.
//
// Real, deliberate architectural fit confirmed before writing this:
// autopsy cases are real Case records (types/case/Case.ts), flowing
// through the SAME real WorklistPage.tsx/SynopticReportPage.tsx
// pipeline every other specimen category already uses — per direct
// guidance's own expectation ("that will likely touch the worklist
// and the synoptic report page"), NOT a fully separate, parallel flow
// the way Cytology got its own dedicated screening page. Autopsy is
// distinguished via a new SpecimenCategory entry (the same real,
// established mechanism this app already uses for "what kind of case
// is this, and what workflow does it need" — never a second, parallel
// case-type discriminator invented here), with this real, autopsy-
// specific detail structure attached to the Case when that category
// applies.
//
// Real, confirmed reuse: Jurisdiction (types/systemConfig.ts) already
// covers all 13 real jurisdictions this spec names (US, CA, GB_EW,
// GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR) — no new
// jurisdiction enum needed anywhere in this module.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';
import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';

/** Real, per spec §2 — the two fundamentally different real legal
 *  workflows. Medicolegal/forensic cases proceed under a judicial
 *  order with no NOK consent requirement or override right;
 *  hospital/consented cases require real, revocable NOK
 *  authorization. These are never blended — a case is one or the
 *  other, determined at case creation, not something that can be
 *  silently reclassified later without a real, deliberate case
 *  transfer (out of scope for this pass — see this module's own
 *  README for the real, remaining open questions this spec doesn't
 *  resolve). */
export type AutopsyCaseAuthority = 'statutory_judicial' | 'hospital_consented';

/** Real, per spec §2.A's own named examples — kept as a plain string
 *  rather than a closed union: the spec's own list ("Medical
 *  Examiners (US/CA), Coroners (UK, NZ, AU), Procurators Fiscal
 *  (Scotland), Examining Magistrates/Police (EU, KR)") is real and
 *  jurisdiction-specific, but a real site's own local terminology may
 *  vary in ways this module has no reason to reject outright. */
export type ForensicInitiatingAuthorityType = string;

export interface ForensicAuthorization {
  /** Real, per spec — the real person/office that issued the legal
   *  mandate this case proceeds under. */
  authorityType: ForensicInitiatingAuthorityType;
  authorityName?: string;
  /** Real, per direct guidance's own confirmed research across all 14
   *  real jurisdictions: "In urgent, weekend, or after-hours
   *  situations, the authority... may issue a verbal directive to
   *  secure the scene, transport the body, or begin preliminary
   *  non-invasive procedures. The verbal instruction must always be
   *  followed by formal written authorization." This is real,
   *  distinct authorization for the temporary-accession/intake stage
   *  — logged the moment the call happens, well before written
   *  paperwork exists — never sufficient on its own for gross
   *  examination (resolveAutopsyGrossExaminationGate.ts checks
   *  orderReference/orderDate below, never these two, for exactly
   *  that reason: "Forensic pathologists will not make incisions...
   *  without signed written authorization in hand or on file"). */
  verbalOrderReceivedAt?: string;
  verbalOrderReceivedFrom?: string;
  /** Real, per spec §2.A — "Judicial order or legal mandate." A real,
   *  traceable reference (case/order number), never a free-text
   *  justification standing in for an actual legal authorization.
   *  Real, per direct guidance's own confirmed research: the real,
   *  mandatory WRITTEN order (e.g. Form 6 in England & Wales, a
   *  Coroner Order/Form 1 in Canada, an Ordonnance aux fins
   *  d'autopsie in France) — required before gross examination, even
   *  when a real verbal order already authorized intake above. */
  orderReference: string;
  orderDate: string;
}

/** Real, per spec §2.B — who consented, on what basis, and whether
 *  that consent has since been narrowed or withdrawn. The actual
 *  jurisdiction-specific PRIORITY rules governing which relative may
 *  consent (US state law vs. UK HTA 2004 vs. NZ Coroners Act 2006)
 *  are real, pure decision logic — see
 *  resolveConsentingRelativePriority.ts, Phase 2 of this build — kept
 *  deliberately OUT of this type: a type should record what actually
 *  happened, not encode the rule that made it valid. */
/** Real, per spec §2.B — the status this consent is actually in today.
 *  Batch 468 replaces the old conflated `revokedOrNarrowedAt` +
 *  free-text `revocationNote` pairing (see the superseded TODO this
 *  used to carry) with this explicit status plus the two structured
 *  constraint fields below, so a NARROWED consent can return
 *  `allowed: true` from the gross-exam gate with its own real
 *  constraints enforced at the specimen/retention level, while only
 *  REVOKED hard-blocks. */
export type HospitalConsentStatus = 'active' | 'narrowed' | 'revoked';

export interface HospitalConsentRecord {
  consentingRelativeName: string;
  /** e.g. 'spouse', 'adult_child', 'parent', 'sibling' — the real
   *  relationship this consent's own priority was validated against. */
  consentingRelativeRelationship: string;
  consentGivenAt: string;
  /** Real, per spec §2.B — the status the consent is in now.
   *  'active': unconstrained (subject only to `excludedOrgans`/
   *  `retentionPermitted`, which both default open). 'narrowed': NOK
   *  has restricted scope — gross exam proceeds, but the organ/
   *  retention checks below are enforced. 'revoked': NOK has withdrawn
   *  consent entirely — resolveAutopsyGrossExaminationGate.ts hard-
   *  blocks any further examination. */
  status: HospitalConsentStatus;
  /** Real, per spec §2.B — "diagnostic tissue only, no organ
   *  retention" is a real, recorded example of consent scope language.
   *  Plain strings, not a closed union — a real consent form's own
   *  scope language varies by site and jurisdiction. Kept as the
   *  human-readable record of what the NOK actually said; the two
   *  fields below are what's machine-enforced. */
  consentScope: string[];
  /** Real, per spec §2.B — organs the NOK's consent explicitly
   *  excludes from examination/retention (e.g. brain, for a family
   *  that declined neuropathology). Empty means no organ-level
   *  exclusion. Checked against a specimen's own `organCodes` at
   *  intake — see resolveAutopsyConsentScopeViolation.ts. */
  excludedOrgans: AutopsyOrganCode[];
  /** Real, per spec §2.B — whether the NOK's consent permits
   *  retaining tissue/organs beyond what the diagnostic gross exam
   *  itself requires. false blocks any `organRetentionTier` beyond
   *  'tier_0_no_retention' — see resolveAutopsyConsentScopeViolation.ts. */
  retentionPermitted: boolean;
  /** When status moved to 'narrowed' or 'revoked'. Undefined while
   *  status is 'active'. */
  statusChangedAt?: string;
  /** Free-text note for the most recent status change — a revocation
   *  reason, originally, but (Batch 471) reused as-is for a
   *  reinstatement's own required note rather than adding a second,
   *  parallel free-text field for "why the status last changed." */
  revocationNote?: string;
}

/** Real, per spec §2.4.3/§3.3 — who may hold or receive the body,
 *  evidence, or personal effects during a forensic case's custody
 *  chain. Kept as a closed union (unlike ForensicInitiatingAuthorityType,
 *  which names who authorized the case): a custody RECIPIENT is a role
 *  this module itself reasons about (gating, display grouping),
 *  whereas an authorizing office is pure display text. */
export type AutopsyCustodianType =
  | 'pathology_department'
  | 'medical_examiner'
  | 'law_enforcement'
  | 'funeral_home'
  | 'family'
  | 'other';

/** Real, per spec §2.4.3 — "Mandatory chain-of-custody logging for all
 *  retained items. Immutable audit trail. Transfer events, responsible
 *  parties, timestamps, receiving entities." Append-only, mirroring
 *  the existing `MaterialLocation`/`locationHistory` pattern
 *  (types/case/Material.ts) rather than inventing a parallel one —
 *  this is the forensic-specific, richer record (named recipient
 *  type/role, who released, who received) that a generic material
 *  location entry doesn't carry. Only meaningful for
 *  caseAuthority === 'statutory_judicial' — see
 *  recordAutopsyCustodyTransfer.ts. */
export interface AutopsyCustodyTransferEvent {
  id: string;
  occurredAt: string;
  /** What changed hands, e.g. "Body", "Decedent's personal effects",
   *  "Clothing", "Retained cardiac specimen". Free text — the real
   *  item vocabulary varies too much per case to close this union. */
  itemDescription: string;
  fromCustodianType: AutopsyCustodianType;
  fromCustodianName: string;
  toCustodianType: AutopsyCustodianType;
  toCustodianName: string;
  releasedByName: string;
  receivedByName?: string;
  notes?: string;
  /** Batch 475 (PS-261 follow-up) — present when this transfer is of a
   *  specific toxicology specimen, linking it to that order
   *  (AutopsyToxicologyOrder.id) so its chain of custody can be shown
   *  alongside the order itself, not only in the case-wide log.
   *  Optional: most custody entries (the body, personal effects) are
   *  never about a toxicology specimen at all. */
  toxicologyOrderId?: string;
}

/** Real, per spec §6 — determines which grossing template and
 *  cross-scope validation rules apply (hard-blocks / warnings for
 *  specimens outside the selected scope). */
export type AutopsyScope = 'full' | 'head_neck_only' | 'trunk_visceral_only';

export type AutopsyReportTier = 'PAD' | 'FAD';

/** Real, per spec §1's own "Architectural Foundation & Data Flow" —
 *  "Upon electronic signature, LIMS freezes the JSON data payload."
 *  `frozenPayload` is deliberately typed as `unknown` here rather
 *  than a named AutopsyReportContent type: that type is Phase 5 of
 *  this build (the PAD/FAD report-generation phase) and doesn't exist
 *  yet — this snapshot's own real job (recording that a freeze
 *  happened, by whom, when) doesn't depend on that type existing
 *  first. Real, deliberate: never re-narrow this to a real type
 *  without updating every existing reader, since a genuinely frozen
 *  historical payload's own shape must never silently change meaning
 *  after the fact. */
export interface AutopsyReportSnapshot {
  tier: AutopsyReportTier;
  frozenPayload: unknown;
  signedBy: { name: string; isPathologist: boolean };
  signedAt: string;
}

/** Real, per spec §3's own Addenda Architecture — "Post-sign-off
 *  findings... attached as timestamped addenda without mutating the
 *  signed original FAD payload." Never edits or replaces
 *  `fadSnapshot.frozenPayload` — always additive. */
export interface AutopsyAddendum {
  id: string;
  content: string;
  reason: string;
  addedBy: { name: string; isPathologist: boolean };
  addedAt: string;
}

/** Real, per spec §5 — only real/applicable for HTA-governed
 *  jurisdictions (UK HTA 2004, Scotland HTA 2006, NZ Coroners Act
 *  2006) — resolveHtaApplicability.ts, Phase 2, is the real, pure
 *  gate for whether this field means anything at all for a given
 *  case's own jurisdiction. Genuinely undefined, never a default
 *  'tier_0', for a non-HTA jurisdiction — a real absence, not a real
 *  answer of "nothing retained." */
export type OrganRetentionTier =
  | 'tier_0_no_retention'
  | 'tier_1_diagnostic_tissue_only'
  | 'tier_2_full_organ_retention'
  | 'tier_3_education_research_genomic';

/** Batch 471 (PS-261 follow-up) — who actually holds retained organs/
 *  tissue and where, while retention is ongoing (before any disposal).
 *  Flagged as a gap by Batch 469's own README: `organRetentionTier`
 *  recorded only a bare tier, with nothing naming a real recipient or
 *  location for what's actually retained. A single current record,
 *  same shape as `OrganRetentionDisposalRecord` below rather than an
 *  append-only log — a real retention custody chain (should the
 *  recipient or location change mid-retention) is a further, separate
 *  extension, not attempted here; each update overwrites the last,
 *  with its own audit-log entry recording the change. See
 *  services/autopsy/recordAutopsyOrganRetentionDetail.ts. */
export interface OrganRetentionRecord {
  recipientName: string;
  location: string;
  reason?: string;
  recordedAt: string;
  recordedByName: string;
}

export interface OrganRetentionDisposalRecord {
  disposalMethod: 'cremation' | 'incineration';
  disposalTimestamp: string;
  /** Real, per spec §5 — "audited log of disposal timestamps,
   *  certificates." A real, traceable certificate reference, not a
   *  bare "yes we disposed of it" boolean. */
  certificateReference: string;
  /** Batch 469 — who recorded the disposal; same audit-attribution
   *  shape every other autopsy event in this module carries. */
  recordedByName: string;
}

/** Batch 469 (PS-261 §2.3) — "Toxicology ordering, specimen tracking,
 *  and result integration." Deliberately simple (free-text lab name
 *  and analytes/result, no reference-lab facility or plate/referral
 *  machinery): postmortem toxicology is ordered rarely compared to
 *  in-house molecular volume, and this module has no existing
 *  toxicology-lab facility seed to route to — see
 *  services/autopsy/orderAutopsyToxicology.ts's own header comment
 *  for why this isn't built on the molecular send-out engine. */
export type AutopsyToxicologyOrderStatus = 'ordered' | 'resulted' | 'cancelled';

export interface AutopsyToxicologyOrder {
  id: string;
  orderedAt: string;
  orderedByName: string;
  specimenDescription: string;
  /** Batch 475 (PS-261 follow-up) — a real, scannable specimen
   *  identifier, distinct from `specimenDescription` (which stays
   *  free text, e.g. "Postmortem blood and vitreous fluid"). Required
   *  at order time so the specimen itself — not just the order
   *  record — can be tracked once it leaves the department; a
   *  statutory_judicial case's custody transfers can link back to it
   *  (AutopsyCustodyTransferEvent.toxicologyOrderId). */
  specimenBarcode: string;
  analytesRequested: string;
  labName: string;
  status: AutopsyToxicologyOrderStatus;
  resultedAt?: string;
  resultSummary?: string;
  /** Batch 471 (PS-261 follow-up) — the real write site these two
   *  fields were waiting on, closing the gap Batch 469's own
   *  independent review disclosed: a real toxicology order can be
   *  withdrawn before a result comes back. Set only by
   *  services/autopsy/cancelAutopsyToxicologyOrder.ts (its own
   *  capability, since cancelling is a distinct action from ordering
   *  or resulting), which only ever moves an 'ordered' order to
   *  'cancelled' — never a 'resulted' one — and clears the
   *  ancillaryHold the same careful way recordAutopsyToxicologyResult.ts
   *  does (only if it's still the hold this order itself started). */
  cancelledAt?: string;
  cancelReason?: string;
}

/** Real, per spec §4's own Ancillary Hold Logic — "SLA timers pause
 *  (In-Ancillary-Hold) when waiting on external laboratory
 *  toxicology or specialized fixed-brain neuropathology slicing,
 *  segregating external delays from internal lab velocity." */
export interface AncillaryHoldState {
  active: boolean;
  reason?: string;
  startedAt?: string;
  /** Real, per spec — a hold can end (external result returns)
   *  without the case itself resolving yet; kept separate from
   *  `active` flipping back to false so a real, historical record of
   *  how long each hold lasted survives past the hold's own end. */
  endedAt?: string;
}

/** Batch 478 (PS-261 follow-up; Pete's own locked-in decision: "a NEW
 *  dedicated capability, audited") — resolveAutopsyGrossExaminationGate.ts's
 *  hard block has a real, audited override now (see signAutopsyReport.ts,
 *  the only write site that enforces the gate). Every attempted sign while
 *  the gate is blocked, and permitted only via `autopsy:gross-exam-gate:override`,
 *  is logged here — append-only, like custodyLog, never replaced or
 *  reordered, so a reviewer can see every time the hard stop was bypassed
 *  and why. Undefined until the first override. */
export interface AutopsyGateOverrideEvent {
  id: string;
  occurredAt: string;
  /** Which tier the override let through. */
  tier: AutopsyReportTier;
  /** The gate's own blockedReasons at the moment of the override —
   *  a real, honest record of what was actually being bypassed.
   *  Batch 479: these are AutopsyGrossExaminationBlockReason codes
   *  (not prose) — kept as string[] here to avoid this shared case
   *  type depending on a service-layer type; signAutopsyReport.ts is
   *  the only writer and keeps them in sync. */
  blockedReasons: string[];
  /** Required: this is a bypass of a legal/consent hard stop, never
   *  silent. */
  reason: string;
  overriddenByName: string;
}

/** Batch 478 (PS-261 follow-up) — real, per-organ findings during the
 *  gross examination. Deliberately a separate, case-level, append-only
 *  log rather than a field on the grossing template itself: the
 *  template's EditorField has no per-field organ association today
 *  (only whole sections are organ-derived, via AUTOPSY_ORGAN_TO_SECTION
 *  — see AutopsyOrganCode.ts), and giving every protocol's shared
 *  template engine an organ concept it doesn't need would be a far
 *  bigger, cross-cutting change than this module's own data model
 *  warrants. Mirrors custodyLog/toxicologyOrders: append-only, each
 *  entry self-attributed with who recorded it and when. */
export type AutopsyOrganTagStatus = 'normal' | 'abnormal' | 'not_examined';

export interface AutopsyOrganTag {
  id: string;
  organCode: AutopsyOrganCode;
  status: AutopsyOrganTagStatus;
  /** Free-text finding, e.g. "Severe atherosclerosis, LAD 90% stenosed."
   *  Optional — a 'normal' or 'not_examined' tag may carry no further
   *  detail. */
  finding?: string;
  recordedAt: string;
  recordedByName: string;
}

export interface AutopsyCaseDetails {
  jurisdiction: Jurisdiction;
  caseAuthority: AutopsyCaseAuthority;
  /** Present when, and only when, caseAuthority is
   *  'statutory_judicial'. */
  forensicAuthorization?: ForensicAuthorization;
  /** Present when, and only when, caseAuthority is
   *  'hospital_consented'. */
  hospitalConsent?: HospitalConsentRecord;
  scope: AutopsyScope;
  padSnapshot?: AutopsyReportSnapshot;
  fadSnapshot?: AutopsyReportSnapshot;
  /** Real, per spec §3 — only ever appended to, only ever real after
   *  a real fadSnapshot already exists. */
  addenda: AutopsyAddendum[];
  organRetentionTier?: OrganRetentionTier;
  /** Batch 472 — an optional free-text reason for the tier selection
   *  itself (distinct from `OrganRetentionRecord.reason`, which is the
   *  reason for the retention *detail* — who holds it and where).
   *  Set by the same single write site as `organRetentionTier`
   *  (`SynopticReportPage.tsx`'s `handleOrganRetentionTierChange`);
   *  not its own append-only record, since the tier itself isn't one
   *  either. Undefined until a reason is first entered. */
  organRetentionTierReason?: string;
  /** Batch 471 (PS-261 follow-up) — see OrganRetentionRecord's own doc
   *  comment. Undefined until the first real retention detail is
   *  recorded; only meaningful once organRetentionTier is beyond
   *  'tier_0_no_retention' for an HTA-applicable jurisdiction, same
   *  gate organRetentionDisposal below already uses. */
  organRetentionDetail?: OrganRetentionRecord;
  organRetentionDisposal?: OrganRetentionDisposalRecord;
  ancillaryHold: AncillaryHoldState;
  /** Real, per spec §2.4.3/§3.3 — only ever appended to, only ever
   *  real for caseAuthority === 'statutory_judicial'. Undefined
   *  until the first real custody transfer is recorded, including
   *  (Batch 469) the body's own final release — see
   *  releaseAutopsyBody.ts. */
  custodyLog?: AutopsyCustodyTransferEvent[];
  /** Batch 469 (PS-261 §2.3) — see AutopsyToxicologyOrder's own doc
   *  comment. Append-only, like custodyLog; undefined until the
   *  first order is placed. Available for either caseAuthority —
   *  postmortem toxicology isn't forensic-only. */
  toxicologyOrders?: AutopsyToxicologyOrder[];
  /** Batch 478 — see AutopsyGateOverrideEvent's own doc comment.
   *  Undefined until the gate is first overridden. */
  gateOverrides?: AutopsyGateOverrideEvent[];
  /** Batch 478 — see AutopsyOrganTag's own doc comment. Undefined
   *  until the first organ is tagged. */
  organTags?: AutopsyOrganTag[];
}
