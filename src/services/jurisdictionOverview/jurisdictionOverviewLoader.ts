// src/services/jurisdictionOverview/jurisdictionOverviewLoader.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#163): reads the services that hold each jurisdiction setting and
// builds the overview (jurisdictionOverview.ts). Read-only: it calls only
// list/get methods, so no capability is needed beyond seeing the screen.
// ─────────────────────────────────────────────────────────────────────────────
import type { Jurisdiction } from '@/types/systemConfig';
import { facilityService } from '../facilities/facilityServiceInstance';
import { participationTypeService } from '../participationTypes/participationTypeServiceInstance';
import { COUNTRY_RULE_JURISDICTIONS } from '../participationTypes/countryProfileEditor';
import { codeSystemPolicyService } from '../coding/codeSystemPolicyServiceInstance';
import { aiVendorPolicyService } from '../aiIntegration/aiVendorPolicyServiceInstance';
import { governingBodyService } from '../governingBodies/governingBodyServiceInstance';
import { CANCER_REGISTRY_DEFINITIONS } from '../cancerRegistry/cancerRegistryDefinitions';
import { getCurrentJurisdiction } from '../retentionPolicy/RetentionPolicy';
import {
  buildJurisdictionOverview, jurisdictionsToList,
  type JurisdictionOverviewInput, type JurisdictionOverviewRow, type OverviewFacility,
} from './jurisdictionOverview';

export interface JurisdictionOverviewDeps {
  facilities(): Promise<OverviewFacility[]>;
  participationTypes(): Promise<JurisdictionOverviewInput['participationTypes']>;
  savedCodePolicyJurisdictions(): Promise<Jurisdiction[]>;
  codePolicyFor(jurisdiction: Jurisdiction): Promise<JurisdictionOverviewInput['codePolicies'][Jurisdiction]>;
  aiRules(): Promise<JurisdictionOverviewInput['aiRules']>;
  governingBodies(): Promise<JurisdictionOverviewInput['governingBodies']>;
  labJurisdiction(): Jurisdiction;
  today(): string;
}

const browserDeps: JurisdictionOverviewDeps = {
  async facilities() {
    const r = await facilityService.getAll();
    return r.ok ? r.data.map(f => ({ id: f.id, name: f.name, jurisdiction: f.jurisdiction, status: f.status })) : [];
  },
  async participationTypes() {
    const r = await participationTypeService.getAll();
    return r.ok ? r.data : [];
  },
  async savedCodePolicyJurisdictions() {
    const r = await codeSystemPolicyService.list();
    return r.ok ? r.data.map(x => x.jurisdiction) : [];
  },
  codePolicyFor: j => codeSystemPolicyService.policyFor(j),
  async aiRules() {
    const r = await aiVendorPolicyService.list();
    return r.ok ? r.data : [];
  },
  governingBodies: () => governingBodyService.getAll(),
  labJurisdiction: getCurrentJurisdiction,
  today: () => new Date().toISOString().slice(0, 10),
};

export async function loadJurisdictionOverview(deps: JurisdictionOverviewDeps = browserDeps): Promise<JurisdictionOverviewRow[]> {
  const [facilities, participationTypes, saved, aiRules, governingBodies] = await Promise.all([
    deps.facilities(), deps.participationTypes(), deps.savedCodePolicyJurisdictions(), deps.aiRules(), deps.governingBodies(),
  ]);
  const labJurisdiction = deps.labJurisdiction();
  const jurisdictions = jurisdictionsToList(COUNTRY_RULE_JURISDICTIONS, facilities, labJurisdiction);
  const codePolicies: JurisdictionOverviewInput['codePolicies'] = Object.fromEntries(
    await Promise.all(jurisdictions.map(async j => [j, await deps.codePolicyFor(j)] as const)),
  );
  return buildJurisdictionOverview({
    jurisdictions, labJurisdiction, facilities, participationTypes,
    codePolicies, customCodePolicies: saved, aiRules, governingBodies,
    registries: CANCER_REGISTRY_DEFINITIONS, today: deps.today(),
  });
}
