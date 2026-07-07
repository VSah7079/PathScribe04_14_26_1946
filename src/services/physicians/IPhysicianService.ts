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
  add(physician: Omit<Physician, 'id'>): Promise<ServiceResult<Physician>>;
  update(id: ID, changes: Partial<Omit<Physician, 'id'>>): Promise<ServiceResult<Physician>>;
  verify(id: ID): Promise<ServiceResult<Physician>>;
  deactivate(id: ID): Promise<ServiceResult<Physician>>;
  /** Called by transaction ingestion — creates unverified record if NPI not found */
  findOrCreateByNpi(npi: string, name: { first: string; last: string }): Promise<ServiceResult<Physician>>;
}
