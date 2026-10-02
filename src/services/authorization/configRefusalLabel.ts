// src/services/authorization/configRefusalLabel.ts
// Batch 428: the locale key of a refused capability's name, for the refusal banner. Pure.
import { capabilityDefinition } from './capabilityCatalog';

export function capabilityLabelKey(capability: string): string | null {
  const def = capabilityDefinition(capability);
  return def ? `capabilities.items.${def.labelId}.label` : null;
}
