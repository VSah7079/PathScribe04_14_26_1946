// src/services/participationTypes/IParticipationTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service interface for participation types.
// Dev: mockParticipationTypeService (localStorage-backed)
// Live: FirestoreParticipationTypeService (customer Firestore collection)
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

export interface ParticipationTypeRecord {
  id:              string;
  label:           string;
  description:     string;
  color:           string;
  icon?:           string;
  allowsMultiple:  boolean;
  requiresNote:    boolean;
  active:          boolean;
  isSystem:        boolean;
  sortOrder:       number;
  /** Whether this participation type can be assigned a report template
   *  for structured reporting (e.g. a synoptic template). */
  canBeAssignedTemplate?: boolean;
  /** Whether someone holding this participation type can view the
   *  entire case (all specimens and prior reports), not just what
   *  they're specifically working on. */
  canViewWholeCase?:      boolean;
  /** Short badge text (2-6 chars) shown on case team chips. */
  abbreviation?:        string;
  /** Whether this participation type's work requires a supervising
   *  countersign before the case can finalize. */
  requiresCountersign?: boolean;
  /** Whether someone holding this participation type can finalize
   *  (sign out) the case themselves. */
  canFinalize?:          boolean;
}

export type NewParticipationType = Omit<ParticipationTypeRecord, 'id' | 'isSystem' | 'sortOrder'>;

export interface IParticipationTypeService {
  getAll():                                          Promise<ServiceResult<ParticipationTypeRecord[]>>;
  getActive():                                       Promise<ServiceResult<ParticipationTypeRecord[]>>;
  getById(id: ID):                                   Promise<ServiceResult<ParticipationTypeRecord>>;
  add(type: NewParticipationType):                   Promise<ServiceResult<ParticipationTypeRecord>>;
  update(id: ID, changes: Partial<ParticipationTypeRecord>): Promise<ServiceResult<ParticipationTypeRecord>>;
  deactivate(id: ID):                                Promise<ServiceResult<ParticipationTypeRecord>>;
  reactivate(id: ID):                                Promise<ServiceResult<ParticipationTypeRecord>>;
  remove(id: ID):                                    Promise<ServiceResult<void>>;
}
