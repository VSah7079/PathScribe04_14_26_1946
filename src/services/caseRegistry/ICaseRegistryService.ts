// src/services/caseRegistry/ICaseRegistryService.ts
import { ServiceResult } from '../types';
import { CaseMaskConfig } from '@/types/config/CaseMaskConfig';

export interface CaseNumberCategoryOverride {
  /** From SpecimenCategory.accessionPrefix — takes precedence over both
   *  the organisation's base prefix and any site-prefix-map resolution,
   *  since case-type (Surgical vs Non-GYN Cytology vs Consultation) is
   *  the more clinically fundamental distinction than which physical
   *  site accessioned the case. */
  prefix: string;
  /** From SpecimenCategory.numberSeries — when present, this category
   *  draws from its own independent counter rather than sharing the
   *  organisation's default series. Omit to share the org's default
   *  series (e.g. Frozen Section, deliberately left unconfigured). */
  numberSeries?: string;
}

export interface ICaseRegistryService {
  /** Returns the config for an organisation, or null if none has been
   *  provisioned yet (the caller — allocateNextCaseNumber — treats null
   *  as "use the fallback mask", not an error). */
  getConfig(organisationId: string): Promise<ServiceResult<CaseMaskConfig | null>>;

  /** Creates or fully replaces an organisation's mask config. Does NOT
   *  reset currentSequence unless the caller explicitly includes it —
   *  changing the mask pattern shouldn't silently restart numbering. */
  saveConfig(config: CaseMaskConfig): Promise<ServiceResult<CaseMaskConfig>>;

  /** Allocates and formats the next case number for an organisation.
   *  siteId is optional and only matters if the org's mask pattern uses
   *  {SITE} — see CaseMaskConfig.sitePrefixMap. categoryOverride is
   *  optional and, when present, resolves the specimen category's own
   *  prefix/series instead of the organisation's default (see
   *  CaseNumberCategoryOverride) — this is how Surgical/Non-GYN
   *  Cytology/Consultation cases at the same organisation draw from
   *  separate, non-colliding sequences. Falls back to the default
   *  O{YEAR:2}-{SEQ:4} scheme (logging, not throwing) when no config
   *  exists for the organisation yet, so an unconfigured org never
   *  blocks case creation. */
  allocateNextCaseNumber(organisationId: string, siteId?: string, categoryOverride?: CaseNumberCategoryOverride): Promise<ServiceResult<string>>;

  /** Renders what allocateNextCaseNumber would currently produce WITHOUT
   *  consuming a sequence number — for the admin config screen's live
   *  preview. */
  previewNextCaseNumber(organisationId: string, siteId?: string, categoryOverride?: CaseNumberCategoryOverride): Promise<ServiceResult<string>>;
}
