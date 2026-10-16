// src/services/secureMessaging/mockSecureMessagingConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): browser-stored secure messaging setups, one per
// performing-lab tenant. Saving needs config:secure-messaging:manage.
//
// Demo seeds (written when nothing is stored, so a Full Reset restores them):
//   Desert Valley Medical Center  Paubox (BAA on file, default) and Virtru
//                                 (no BAA): the "one gateway covered, one not"
//                                 case from Pete's Oct 2 acceptance criteria
//   Manchester University NHS FT  NHSmail (data processing agreement)
//   Midwest Pathology Associates  Zix (BAA)
//   Sydney Cytology & Pathology   HealthLink (agreement) and Medical-Objects
//   Auckland Cytology Services    HealthLink (agreement)
//   Seoul General Screening Ctr   Korea's health information exchange
// Henry Ford and the EU/Canadian demo labs have none, so they show the
// "no secure gateway" message.
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { resolveTenantFacility } from '../auth/resolveTenantFacility';
import type { ISecureMessagingConfigService } from './ISecureMessagingConfigService';
import { secureMessagingConfigProblem, type SecureMessagingConfig } from './secureGatewayRules';

export const SECURE_MESSAGING_STORAGE_KEY = 'pathscribe_secure_messaging';

export const DEMO_SECURE_MESSAGING: readonly SecureMessagingConfig[] = [
  { facilityId: 'c-ent-dvmc', defaultGatewayId: 'PAUBOX', gateways: [
    { gatewayId: 'PAUBOX', enabled: true, senderAddress: 'pathology@dvmc.example.org', agreement: { kind: 'BAA', reference: 'BAA-PB-2025-0142', signedOn: '2025-03-01' } },
    { gatewayId: 'VIRTRU', enabled: true, senderAddress: 'pathology-admin@dvmc.example.org' },
  ] },
  { facilityId: 'c-ent-mft', defaultGatewayId: 'NHSMAIL', gateways: [
    { gatewayId: 'NHSMAIL', enabled: true, senderAddress: 'mft.histopathology@nhs.net', agreement: { kind: 'DPA', reference: 'NHSmail DPA (MFT) 2024', signedOn: '2024-04-01' } },
  ] },
  { facilityId: 'c-ent-mpa', defaultGatewayId: 'ZIX', gateways: [
    { gatewayId: 'ZIX', enabled: true, senderAddress: 'reports@mpa.example.org', agreement: { kind: 'BAA', reference: 'ZIX-BAA-77310', signedOn: '2024-09-15' } },
  ] },
  { facilityId: 'c-au-sydney-cyto', defaultGatewayId: 'HEALTHLINK', gateways: [
    { gatewayId: 'HEALTHLINK', enabled: true, senderAddress: 'scpathol', agreement: { kind: 'DPA', reference: 'HealthLink subscriber agreement SCP-2025', signedOn: '2025-01-20' } },
    { gatewayId: 'MEDICAL_OBJECTS', enabled: true, senderAddress: 'SCP-MO-4471', agreement: { kind: 'DPA', reference: 'Medical-Objects agreement 2025', signedOn: '2025-02-03' } },
  ] },
  { facilityId: 'c-nz-auckland-cyto', defaultGatewayId: 'HEALTHLINK', gateways: [
    { gatewayId: 'HEALTHLINK', enabled: true, senderAddress: 'akcytolo', agreement: { kind: 'DPA', reference: 'HealthLink NZ agreement ACS-2025', signedOn: '2025-05-12' } },
  ] },
  { facilityId: 'c-kr-seoul-general', defaultGatewayId: 'KR_HIE', gateways: [
    { gatewayId: 'KR_HIE', enabled: true, senderAddress: 'SGSC-HIE-0219', agreement: { kind: 'DPA', reference: '진료정보교류 참여기관 협약 2025', signedOn: '2025-06-30' } },
  ] },
];

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function load(): SecureMessagingConfig[] {
  const stored = storageGet<SecureMessagingConfig[] | null>(SECURE_MESSAGING_STORAGE_KEY, null);
  if (stored) return stored;
  const seeded = clone([...DEMO_SECURE_MESSAGING]);
  storageSet(SECURE_MESSAGING_STORAGE_KEY, seeded);
  return seeded;
}

/** For the tenant lookup; a module function so tests can run without the facility service's delay. */
async function enterpriseFacilities() {
  const { facilityService } = await import('../index');
  const all = await facilityService.getAll();
  return all.ok ? all.data : [];
}

const secureMessagingConfigServiceUnchecked: ISecureMessagingConfigService = {
  async getForFacility(facilityId) {
    const found = load().find(c => c.facilityId === facilityId);
    return ok(found ? clone(found) : null);
  },

  async forOrganisation(organisationId) {
    const tenant = resolveTenantFacility(organisationId, await enterpriseFacilities());
    if (!tenant) return ok(null);
    return secureMessagingConfigServiceUnchecked.getForFacility(tenant.id);
  },

  async save(config, actor) {
    const problem = secureMessagingConfigProblem(config);
    if (problem) return err(problem);
    const saved: SecureMessagingConfig = { ...clone(config), updatedAt: new Date().toISOString(), updatedBy: actor?.userId };
    storageSet(SECURE_MESSAGING_STORAGE_KEY, [...load().filter(c => c.facilityId !== config.facilityId), saved]);
    return ok(clone(saved));
  },
};

export const mockSecureMessagingConfigService: ISecureMessagingConfigService = guardConfigWrites(secureMessagingConfigServiceUnchecked, [
  ['config:secure-messaging:manage', ['save']],
]);
