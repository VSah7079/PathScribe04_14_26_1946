// src/services/cosd/ICosdDestinationService.ts
// Batch 620 (part C, PS-800): the stored UK cancer registry destinations (enterprise default, performing-facility overrides).
import type { ID, ServiceResult } from '../types';
import type { CosdDestination, CosdDestinationInput } from './cosdDestination';

export interface ICosdDestinationService {
  /** Every stored destination: the enterprise's and each facility's own. None stored means the built-in default applies. */
  getAll(): Promise<ServiceResult<CosdDestination[]>>;
  /** One facility's own destination (not the enterprise one it falls back to); null when it has none. */
  getForFacility(facilityId: ID): Promise<ServiceResult<CosdDestination | null>>;
  /** Save the destination for the enterprise (facilityId null) or one facility, replacing the one already there. Refused with a fixed code when not valid. */
  set(input: CosdDestinationInput): Promise<ServiceResult<CosdDestination>>;
  /** Remove a facility's own destination so it follows the enterprise one again. The enterprise one is changed, not removed. */
  remove(facilityId: ID): Promise<ServiceResult<void>>;
}
