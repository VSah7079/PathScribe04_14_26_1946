// src/services/screeningRegistry/IScreeningRegistryConfigService.ts
// Batch 414: a lab's configuration of one screening registry, from the
// programme's own specification: its code for each dictionary category it
// needs coded, and whether a result may be sent before every one is mapped.
import type { ServiceResult } from '../types';
import type { RegistryCodedField, ScreeningRegistryId } from './screeningRegistryDefinitions';

export interface RegistryCodeMapping {
  field: RegistryCodedField;
  /** PathScribe's cytology dictionary category (any nomenclature). */
  categoryId: string;
  /** The programme's code, and its display text if the programme has one. */
  code: string;
  display?: string;
  /** Batch 424: the registry template version (vYYYY.Q.X) this mapping was made against, so a
   *  release that changes these codes flags it for review (registryGoLive/registryOverlay.ts).
   *  Absent on mappings saved before Batch 424: counts as the first version. */
  baselineVersion?: string;
}

export interface ScreeningRegistryConfig {
  registryId: ScreeningRegistryId;
  /** Hold a result until every coded field it uses has a mapping. */
  requireMappedCodes: boolean;
  /** Hold a result whose patient has no usable national identifier for this
   *  registry (NHS number, CHI, BSN…): missing, failed its check digit, or (on a
   *  record from before Batch 417) an MRN that doesn't look like one. Off by default,
   *  so a lab turns it on once its accessioners record the national identifier. */
  requirePatientIdentifier?: boolean;
  /** Batch 419 (SRS v2.1 FR-008.8): whether results go to the programme's test or live
   *  system. Batch 424: no longer read. The instance decides (services/deployment/): a
   *  validation instance sends only to test systems, a production instance only to live
   *  registers once go-live is approved. Kept so stored configurations still load. */
  environment?: 'test' | 'production';
  /** Batch 424: the template version the identifier hold was last confirmed against (see baselineVersion above). */
  identifierHoldBaselineVersion?: string;
  codeMappings: RegistryCodeMapping[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface IScreeningRegistryConfigService {
  /** The saved configuration, or the definition's default (codes required for mapping-table registries). */
  get(registryId: ScreeningRegistryId): Promise<ServiceResult<ScreeningRegistryConfig>>;
  save(config: ScreeningRegistryConfig): Promise<ServiceResult<ScreeningRegistryConfig>>;
}
