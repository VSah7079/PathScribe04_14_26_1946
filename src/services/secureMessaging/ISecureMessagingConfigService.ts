// src/services/secureMessaging/ISecureMessagingConfigService.ts
// Batch 517 (PS-143): each performing-lab tenant's secure messaging gateways.
import type { ServiceResult } from '../types';
import type { SecureMessagingConfig } from './secureGatewayRules';

export interface ISecureMessagingConfigService {
  /** The facility's setup, or null when it has none. */
  getForFacility(facilityId: string): Promise<ServiceResult<SecureMessagingConfig | null>>;
  /** The setup of the tenant a person's organisation belongs to (their lab), or null. */
  forOrganisation(organisationId: string | null | undefined): Promise<ServiceResult<SecureMessagingConfig | null>>;
  /** Saves a facility's setup. Needs config:secure-messaging:manage; refuses a setup with a problem (secureMessagingConfigProblem). */
  save(config: SecureMessagingConfig, actor?: { userId: string }): Promise<ServiceResult<SecureMessagingConfig>>;
}
