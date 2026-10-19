// src/services/deliverySchedules/registryChoices.ts
// Batch 619 (PS-800): the registries that can have a delivery schedule, keyed as the registry go-live configuration keys them.
import { registryTemplateKey } from '../registryGoLive/registryTemplateVersions';
import { SCREENING_REGISTRY_DEFINITIONS } from '../screeningRegistry/screeningRegistryDefinitions';
import { CANCER_REGISTRY_DEFINITIONS } from '../cancerRegistry/cancerRegistryDefinitions';

export interface RegistryChoice { key: string; labelKey: string }

export const registryChoices = (): RegistryChoice[] => [
  ...SCREENING_REGISTRY_DEFINITIONS.map(d => ({ key: registryTemplateKey('screening', d.id), labelKey: `screeningRegistry.registries.${d.labelId}` })),
  ...CANCER_REGISTRY_DEFINITIONS.map(d => ({ key: registryTemplateKey('cancer', d.id), labelKey: `cancerRegistrySection.registries.${d.labelId}` })),
];
