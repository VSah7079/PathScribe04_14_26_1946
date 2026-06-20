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
