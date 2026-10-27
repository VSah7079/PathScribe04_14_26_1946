// src/services/usEpath/IUsEpathService.ts
// Batch 620 (part E, PS-800): the stored US ePath state profiles and which profile each facility uses.
import type { ID, ServiceResult } from '../types';
import type { EpathAssignmentInput, EpathProfileAssignment, EpathProfileInput, EpathStateProfile } from './epathProfile';

export interface IUsEpathService {
  /** Every profile, the shipped example included. */
  getProfiles(): Promise<ServiceResult<EpathStateProfile[]>>;
  /** Create a profile, or replace the one named by `id`. Refused with a fixed code when it is not valid. The example profile cannot be replaced. */
  saveProfile(input: EpathProfileInput): Promise<ServiceResult<EpathStateProfile>>;
  /** Remove a profile (the example cannot be removed). Refused while an assignment still names it. */
  removeProfile(id: ID): Promise<ServiceResult<void>>;
  /** The enterprise default (facilityId null) and each facility's own choice. */
  getAssignments(): Promise<ServiceResult<EpathProfileAssignment[]>>;
  /** Choose a profile for the enterprise (facilityId null) or one performing facility, replacing its earlier choice. */
  setAssignment(input: EpathAssignmentInput): Promise<ServiceResult<EpathProfileAssignment>>;
  /** Remove a facility's own choice so it follows its state's profile and then the enterprise default. The enterprise default is changed with setAssignment. */
  removeAssignment(facilityId: ID): Promise<ServiceResult<void>>;
}
