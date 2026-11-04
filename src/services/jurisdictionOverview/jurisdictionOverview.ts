// src/services/jurisdictionOverview/jurisdictionOverview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#163): one read-only picture of how each jurisdiction is set up.
// There is no single place where a jurisdiction is configured: its facilities,
// the roles offered and their signing rules, the code systems, the AI policy,
// the retention body and the cancer registries each live on their own screen.
// This gathers them, per jurisdiction, with the screen each one is edited on.
//
// Pure: the data and today's date are passed in. Nothing here changes any
// setting. `loadJurisdictionOverview` (jurisdictionOverviewLoader.ts) reads the
// services and calls this.
// ─────────────────────────────────────────────────────────────────────────────
import type { Jurisdiction } from '@/types/systemConfig';
import type { ParticipationTypeRecord } from '../participationTypes/IParticipationTypeService';
import { resolveParticipationTypeAuthority } from '../participationTypes/IParticipationTypeService';
import type { CodeSystemPolicy, CodeSystemRole } from '../coding/codeSystemPolicy';
import { roleOn } from '../coding/codeSystemPolicy';
import type { AiVendorRule } from '../aiIntegration/aiVendorPolicy';
import type { GoverningBody } from '../governingBodies/IGoverningBodyService';
import type { CancerRegistryDefinition } from '../cancerRegistry/cancerRegistryDefinitions';

export interface OverviewFacility { id: string; name: string; jurisdiction: Jurisdiction; status?: string }

export interface JurisdictionOverviewInput {
  /** Jurisdictions to list, in display order. */
  jurisdictions: readonly Jurisdiction[];
  labJurisdiction: Jurisdiction;
  facilities: readonly OverviewFacility[];
  participationTypes: readonly ParticipationTypeRecord[];
  codePolicies: Readonly<Partial<Record<Jurisdiction, CodeSystemPolicy>>>;
  /** Jurisdictions whose code-system policy has been saved (the rest use the default). */
  customCodePolicies: readonly Jurisdiction[];
  aiRules: readonly AiVendorRule[];
  governingBodies: readonly GoverningBody[];
  registries: readonly CancerRegistryDefinition[];
  /** ISO date (YYYY-MM-DD). */
  today: string;
}

export interface JurisdictionCodeSystem { system: string; role: Exclude<CodeSystemRole, 'off'>; from?: string }

export type JurisdictionAiPolicy =
  | { kind: 'unrestricted' }
  | { kind: 'restricted'; services: string[] | null; regionLimited: boolean; facilityRules: number };

export interface JurisdictionOverviewRow {
  jurisdiction: Jurisdiction;
  isLabDefault: boolean;
  facilities: { id: string; name: string; active: boolean }[];
  /** Active role types offered here (global ones count). */
  rolesOffered: { id: string; label: string }[];
  /** Offered roles that can sign out a case, and ones that need a countersign. */
  canSignOut: string[];
  needsCountersign: string[];
  codeSystems: JurisdictionCodeSystem[];
  /** True when a saved policy exists for this jurisdiction (otherwise the default applies). */
  codePolicyIsCustom: boolean;
  aiPolicy: JurisdictionAiPolicy;
  /** Enabled governing bodies that publish retention guidance for this jurisdiction (their short labels). */
  retentionBodies: string[];
  /** Cancer registries defined for this jurisdiction (definition label ids). */
  registryLabelIds: string[];
}

const offeredIn = (type: ParticipationTypeRecord, jurisdiction: Jurisdiction): boolean =>
  type.active && (!type.scopedJurisdictions || type.scopedJurisdictions.length === 0 || type.scopedJurisdictions.includes(jurisdiction));

export function buildJurisdictionOverview(input: JurisdictionOverviewInput): JurisdictionOverviewRow[] {
  return input.jurisdictions.map(jurisdiction => {
    const types = [...input.participationTypes].sort((a, b) => a.sortOrder - b.sortOrder).filter(t => offeredIn(t, jurisdiction));
    const canSignOut: string[] = [];
    const needsCountersign: string[] = [];
    for (const t of types) {
      const a = resolveParticipationTypeAuthority(t, undefined, jurisdiction);
      if (a.canFinalize) canSignOut.push(t.label);
      if (a.requiresCountersign) needsCountersign.push(t.label);
    }

    const policy = input.codePolicies[jurisdiction];
    const codeSystems: JurisdictionCodeSystem[] = [];
    if (policy) {
      const seen = new Set<string>();
      for (const r of policy.rules) {
        if (seen.has(r.system)) continue;
        seen.add(r.system);
        const role = roleOn(policy, r.system, input.today);
        if (role !== 'off') codeSystems.push({ system: r.system, role, ...(r.from ? { from: r.from } : {}) });
      }
    }

    const rules = input.aiRules.filter(r => r.scope.jurisdiction === jurisdiction);
    const own = rules.find(r => !r.scope.facilityId);
    const aiPolicy: JurisdictionAiPolicy = own
      ? { kind: 'restricted', services: own.allowedServices, regionLimited: Object.values(own.allowedRegions).some(v => (v?.length ?? 0) > 0), facilityRules: rules.length - 1 }
      : rules.length > 0
        ? { kind: 'restricted', services: null, regionLimited: false, facilityRules: rules.length }
        : { kind: 'unrestricted' };

    return {
      jurisdiction,
      isLabDefault: jurisdiction === input.labJurisdiction,
      facilities: input.facilities.filter(f => f.jurisdiction === jurisdiction)
        .map(f => ({ id: f.id, name: f.name, active: f.status !== 'Inactive' })),
      rolesOffered: types.map(t => ({ id: t.id, label: t.label })),
      canSignOut, needsCountersign,
      codeSystems,
      codePolicyIsCustom: input.customCodePolicies.includes(jurisdiction),
      aiPolicy,
      retentionBodies: input.governingBodies
        .filter(b => b.enabled && (b.retentionPolicyVersions?.length ?? 0) > 0 && b.jurisdictions?.includes(jurisdiction))
        .map(b => b.label),
      registryLabelIds: input.registries.filter(d => d.jurisdictions.includes(jurisdiction)).map(d => d.labelId),
    };
  });
}

/** Where each setting is edited: the Configuration address to link to. */
export const JURISDICTION_SETTING_LINKS = {
  facilities: '/configuration?tab=system&section=clients',
  roles: '/configuration?tab=system&section=participation_types',
  signing: '/configuration?tab=system&section=country_signing_rules',
  codeSystems: '/configuration?tab=system&section=code_systems',
  aiPolicy: '/configuration?tab=ai',
  retention: '/configuration?tab=system&section=governing_bodies',
  registries: '/configuration?tab=system&section=cancer_registry_settings',
} as const;

/** Jurisdictions to list: the ones with country rules, plus any a facility or the lab uses. */
export function jurisdictionsToList(
  countryRuleJurisdictions: readonly Jurisdiction[],
  facilities: readonly OverviewFacility[],
  labJurisdiction: Jurisdiction,
): Jurisdiction[] {
  const out = [...countryRuleJurisdictions];
  for (const j of [labJurisdiction, ...facilities.map(f => f.jurisdiction)]) if (j && !out.includes(j)) out.push(j);
  return out;
}
