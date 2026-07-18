import { ServiceResult, ID } from '../types';

export interface Physician {
  id: ID;

  // ── Name — medical-grade schema (June 2026), same model as Patient.
  // See utils/personName.ts. Required here (unlike Patient's optional
  // givenNames/familyNames) since there are only 7 seed records to
  // migrate, not 50+.
  namePrefix?: string;
  givenNames: string;
  familyNames: string;
  preferredName?: string;
  nameSuffix?: string;

  /** @deprecated Use givenNames. Always mirrors it — kept for any
   *  consumer not yet migrated to the new fields. */
  firstName: string;
  /** @deprecated Use familyNames. Always mirrors it. */
  lastName: string;

  npi: string;
  specialty: string;
  phone: string;
  fax: string;
  email: string;
  preferredContact: 'Email' | 'Fax' | 'Phone';
  clientIds: string[];
  status: 'Active' | 'Inactive' | 'Unverified';
  /** Snapshot fields auto-populated from transaction data */
  autoCreated?: boolean;
  autoCreatedAt?: string;
}

export interface IPhysicianService {
  getAll(): Promise<ServiceResult<Physician[]>>;
  getById(id: ID): Promise<ServiceResult<Physician>>;
  getByNpi(npi: string): Promise<ServiceResult<Physician | null>>;
  /** Server-side (mock: in-memory) filtered search — avoids pulling the
   *  entire physician table into every consumer that just needs a
   *  handful of matches, e.g. a type-ahead picker. Matches name,
   *  specialty, or NPI, case-insensitive. `limit` defaults to 8. */
  search(query: string, limit?: number): Promise<ServiceResult<Physician[]>>;
  /** Order/case intake never carries an NPI in practice (confirmed:
   *  IncomingOrder.requestingProvider and Case.order.requestingProvider
   *  are both bare strings, no NPI field at all) — findOrCreateByNpi is
   *  the wrong shape for that data. This is the real intake-resolution
   *  method: exact-match by parsed name, case-insensitive: if found,
   *  merges clientId into its clientIds if not already present; if not
   *  found, auto-creates an 'Unverified' record, same posture as
   *  Client.findOrCreateByCode / SpecimenCategory.findOrCreateByName —
   *  never blocks case creation on an unrecognized provider. */
  findOrCreateByName(name: string, clientId?: string): Promise<ServiceResult<Physician>>;
  add(physician: Omit<Physician, 'id'>): Promise<ServiceResult<Physician>>;
  update(id: ID, changes: Partial<Omit<Physician, 'id'>>): Promise<ServiceResult<Physician>>;
  verify(id: ID): Promise<ServiceResult<Physician>>;
  deactivate(id: ID): Promise<ServiceResult<Physician>>;
  /** Called by transaction ingestion — creates unverified record if NPI not found */
  findOrCreateByNpi(npi: string, name: { first: string; last: string }): Promise<ServiceResult<Physician>>;
}
