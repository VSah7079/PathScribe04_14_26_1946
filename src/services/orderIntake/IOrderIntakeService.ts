// src/services/orderIntake/IOrderIntakeService.ts
// ─────────────────────────────────────────────────────────────
// Order intake — the "pending orders queue" an accessioner pulls from on
// the Accession page, and the resolution chain that turns a raw external
// order into real Client/SpecimenCategory references.
//
// Design (from the multi-turn discussion this implements):
//   1. An order arrives from wherever (HL7 listener, partner API, manual
//      entry) as a raw IncomingOrder — never written directly into Case.
//   2. Client resolution reuses Client.code as the crosswalk key directly
//      — no separate client crosswalk table needed. clientService.
//      findOrCreateByCode() already does exact-match-or-auto-create.
//   3. Specimen resolution needs its own crosswalk (SpecimenCodeCrosswalkEntry)
//      because the same external code means different things for
//      different clients — "TISSUE-01" at one hospital's LIS is not
//      necessarily the same thing as "TISSUE-01" at another's. No
//      crosswalk match → SpecimenCategory.findOrCreateByName(), same
//      auto-create-pending + notify-admin posture as everywhere else in
//      this app (IPhysicianService.findOrCreateByNpi, etc.) — order
//      processing is never blocked by an unrecognized code.
//   4. Resolution never mutates the raw order's externalClientCode/
//      externalSpecimenCode fields — those stay as received, for audit,
//      even after clientId/specimenCategoryId are filled in alongside them.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { Icd10Code } from '../diagnosisCodes/IDiagnosisCodesService';

// ─── Crosswalk ──────────────────────────────────────────────────────────────

/**
 * Maps one client's local specimen code to a SpecimenCategory. Scoped per
 * client (not global) because the same code string means different things
 * at different sending systems.
 */
export interface SpecimenCodeCrosswalkEntry {
  id: ID;
  clientId: string;
  externalCode: string;
  specimenCategoryId: string;
  createdAt: string;
  /** 'system' for an entry auto-learned from a confirmed AI suggestion
   *  (per the "unblock now, admin approves after" design) — vs an admin's
   *  user id for one entered directly in config. */
  createdBy: string;
}

// ─── Incoming order ─────────────────────────────────────────────────────────

export interface IncomingOrderSpecimen {
  description: string;
  /** The client's local code for this specimen type, if the source
   *  message carried one (not all sources will — manual/API orders may
   *  arrive as description-only). */
  externalSpecimenCode?: string;
  /** Filled in once resolved via crosswalk or findOrCreateByName —
   *  undefined until resolveIncomingOrder() has run. */
  specimenCategoryId?: string;
  /** True if specimenCategoryId came from findOrCreateByName's fallback
   *  (i.e. a brand-new pending category) rather than an existing crosswalk
   *  match — lets the Accession page flag it for extra attention. */
  categoryWasAutoCreated?: boolean;
  specimenType?: string;
  bodySite?: string;
  laterality?: string;
  collectedAt?: string;
}

export interface IncomingOrder {
  id: ID;
  externalOrderNumber: string;
  source: 'hl7' | 'api' | 'manual';
  receivedAt: string;
  status: 'pending' | 'linked' | 'cancelled';
  /** Set once an accessioner has turned this into a real Case via the
   *  Accession page's "Import from Order" flow. */
  linkedCaseId?: string;

  /** Raw client code exactly as received — always kept, even after
   *  clientId is resolved, for audit/debugging. */
  externalClientCode: string;
  /** Filled in by resolveIncomingOrder() — the real Client.id, existing
   *  or freshly auto-created via findOrCreateByCode. */
  clientId?: string;
  /** True if clientId came from findOrCreateByCode's fallback (a
   *  brand-new pending client) rather than an existing match. */
  clientWasAutoCreated?: boolean;

  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    sex?: 'M' | 'F' | 'U';
    mrn?: string;
  };
  encounterNumber?: string;
  requestingProvider: string;
  priority?: 'Routine' | 'STAT';
  clinicalIndication?: string;
  /** Diagnosis codes as received on the referral, if any — real orders
   *  frequently carry these already. Auto-populates the Accession
   *  form's ICD-10 field the same way clinicalIndication already does,
   *  rather than always starting that field empty. */
  icd10Codes?: Icd10Code[];
  specimens: IncomingOrderSpecimen[];

  /** Original payload, kept for audit/debugging parse failures — not the
   *  source of truth once resolved, just a paper trail. Undefined for
   *  manually-entered orders (there's no wire payload to keep). */
  rawMessage?: string;
}

// ─── Resolution result ────────────────────────────────────────────────────

export interface OrderResolutionResult {
  order: IncomingOrder;
  /** Non-fatal notes about what got auto-created along the way — same
   *  never-hard-fail pattern as evaluateGrossingTemplateAssignment's
   *  warnings array. Empty when everything matched an existing
   *  client/category cleanly. */
  warnings: string[];
}

// ─── Service interface ────────────────────────────────────────────────────

export interface IOrderIntakeService {
  listPendingOrders(params?: { clientId?: string }): Promise<ServiceResult<IncomingOrder[]>>;
  getOrder(orderId: ID): Promise<ServiceResult<IncomingOrder>>;
  markOrderLinked(orderId: ID, caseId: string): Promise<ServiceResult<IncomingOrder>>;
  /** Lets a mock — or eventually a real HL7 listener / API webhook — inject
   *  a new order into the pending queue. */
  receiveOrder(order: Omit<IncomingOrder, 'id' | 'status' | 'receivedAt'>): Promise<ServiceResult<IncomingOrder>>;

  /**
   * Runs client + per-specimen category resolution on a pending order:
   * Client.code exact match (or findOrCreateByCode fallback), then
   * per-specimen crosswalk match (or SpecimenCategory.findOrCreateByName
   * fallback). Idempotent — safe to call again on an already-resolved
   * order (re-resolves from current crosswalk state, e.g. after an admin
   * verifies a pending category).
   */
  resolveOrder(orderId: ID): Promise<ServiceResult<OrderResolutionResult>>;

  // ── Crosswalk management ──────────────────────────────────────────────
  listCrosswalkEntries(clientId?: string): Promise<ServiceResult<SpecimenCodeCrosswalkEntry[]>>;
  addCrosswalkEntry(entry: Omit<SpecimenCodeCrosswalkEntry, 'id' | 'createdAt'>): Promise<ServiceResult<SpecimenCodeCrosswalkEntry>>;
}
