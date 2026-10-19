// src/services/deliverySchedules/IDeliveryScheduleService.ts
// Batch 619 (PS-800): the stored delivery schedules (enterprise level, performing-facility overrides).
import type { ID, ServiceResult } from '../types';
import type { DeliveryScheduleEntry, DeliveryScheduleInput, DeliveryFeed } from './deliverySchedule';

export interface IDeliveryScheduleService {
  /** Every schedule: the enterprise's and each facility's overrides. */
  getAll(): Promise<ServiceResult<DeliveryScheduleEntry[]>>;
  /** One facility's own overrides (not the enterprise schedules it falls back to). */
  getForFacility(facilityId: ID): Promise<ServiceResult<DeliveryScheduleEntry[]>>;
  /** Create or replace the schedule for a feed at the enterprise (facilityId null) or for one facility. Feed 'registry' needs a registryKey; every registry has its own. */
  set(input: DeliveryScheduleInput): Promise<ServiceResult<DeliveryScheduleEntry>>;
  /** Remove a facility's override so it follows the enterprise again. The enterprise schedule is changed with set, never removed. */
  remove(feed: DeliveryFeed, facilityId: ID, registryKey?: string | null): Promise<ServiceResult<void>>;
}
