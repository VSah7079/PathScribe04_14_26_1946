// src/services/scopeReference/scopeReference.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the enterprise-versus-facility scope reference (Pete's request).
// For each setting area listed here: where its value is set. The list is data,
// so the screen (Configuration → System → Scope reference), the documents and
// the tests read the same table.
//
//   enterprise                     set once for the whole organisation
//   facility                       set separately for each performing-lab facility
//   enterpriseWithFacilityOverride an organisation-wide default, which one facility may override
//   tiered                         rules at several levels; the most specific one that matches wins
//
// Only areas whose scope was read from the code are listed. `source` names the
// file that shows it; scopeReference.test.ts checks that the file exists. An area
// that is not listed has not been confirmed: it is not assumed to be either.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export type SettingScope = 'enterprise' | 'facility' | 'enterpriseWithFacilityOverride' | 'tiered';

export const SETTING_SCOPES: readonly SettingScope[] = ['enterprise', 'enterpriseWithFacilityOverride', 'tiered', 'facility'];

export interface ScopeReferenceEntry {
  /** Keys the text: scopeReference.entries.<id>.name and .note. */
  id: string;
  scope: SettingScope;
  /** The Configuration → System section (systemSections.ts id) where it is set, when it has one. */
  sectionId?: string;
  /** The repository file that shows the scope. */
  source: string;
}

export const SCOPE_REFERENCE: readonly ScopeReferenceEntry[] = [
  { id: 'mfaPolicy',        scope: 'enterprise',                     sectionId: 'session_security',   source: 'src/services/auth/mfa/mfaPolicy.ts' },
  { id: 'sessionTimeout',   scope: 'enterpriseWithFacilityOverride', sectionId: 'session_security',   source: 'src/services/session/ISessionTimeoutService.ts' },
  { id: 'printSettings',    scope: 'enterpriseWithFacilityOverride', sectionId: 'print_settings',     source: 'src/services/printSettings/IFacilityPrintSettingsService.ts' },
  { id: 'printRouting',     scope: 'tiered',                         sectionId: 'print_routing_rules', source: 'src/types/printRouting/PrintRoutingRule.ts' },
  { id: 'tatTargets',       scope: 'tiered',                                                           source: 'src/services/tatConfig/tatTargetResolution.ts' },
  { id: 'siteAgents',       scope: 'facility',                       sectionId: 'site_agents',        source: 'src/services/siteAgent/README.md' },
  { id: 'scanStations',     scope: 'facility',                       sectionId: 'scan_stations',      source: 'src/services/scanStations/IScanStationService.ts' },
  { id: 'equipment',        scope: 'facility',                       sectionId: 'equipment',          source: 'src/services/equipment/equipmentRules.ts' },
  { id: 'workstations',     scope: 'facility',                       sectionId: 'workstations',       source: 'src/services/workstationRegistry/workstationRegistryRules.ts' },
];

/** The entries of one scope, in table order (pure). */
export function entriesByScope(scope: SettingScope): ScopeReferenceEntry[] {
  return SCOPE_REFERENCE.filter(e => e.scope === scope);
}
