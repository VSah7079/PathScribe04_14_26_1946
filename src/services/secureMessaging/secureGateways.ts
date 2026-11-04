// src/services/secureMessaging/secureGateways.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): the secure messaging gateways a lab can send through.
//
// Pete's decisions:
//   • Oct 2: branding follows each lab's own gateway (Option A), NHSmail is one
//     of the gateway values, and patient or finding details go only through a
//     gateway with its own BAA (US) or data processing agreement (UK, EU and
//     elsewhere) on file, checked per gateway.
//   • Oct 10: Australia, New Zealand and South Korea are in scope now, not
//     deferred.
//
// Two kinds of gateway:
//   • 'email' — encrypted email to an address (NHSmail and Egress or Accurx in
//     the UK; Paubox, Virtru and Zix in the US).
//   • 'clinicalMessaging' — a clinical secure-messaging network that delivers
//     to a recipient's directory ID, not an email address. Australia and New
//     Zealand use these (HealthLink, Medical-Objects, ReferralNet, under the
//     Australian Secure Message Delivery standard; Argus is being retired and
//     is left out). Korea's national health information exchange
//     (진료정보교류, CDA documents) works the same way.
//
// The sending is still simulated (messageService.sendSecureEmail); the real
// transports are PS-332. Which of the AU/NZ/KR networks to support first is
// for Pete to confirm (Jira PS-143). Pure data.
// ─────────────────────────────────────────────────────────────────────────────
import type { Jurisdiction } from '@/types/systemConfig';

export type SecureGatewayId =
  | 'NHSMAIL' | 'EGRESS' | 'ACCURX'
  | 'PAUBOX' | 'VIRTRU' | 'ZIX'
  | 'HEALTHLINK' | 'MEDICAL_OBJECTS' | 'REFERRALNET'
  | 'KR_HIE';

export type SecureGatewayKind = 'email' | 'clinicalMessaging';
/** The agreement that allows patient data through a gateway: a HIPAA Business Associate Agreement, or a data processing agreement. */
export type GatewayAgreementKind = 'BAA' | 'DPA';

export interface SecureGatewayDefinition {
  id: SecureGatewayId;
  /** The product name, shown as is (a brand, not translated). */
  name: string;
  kind: SecureGatewayKind;
  /** Where the gateway is used; any lab may still choose it. */
  jurisdictions: readonly Jurisdiction[];
  agreement: GatewayAgreementKind;
}

const UK: readonly Jurisdiction[] = ['GB_EW', 'GB_SCT', 'GB_NIR'];

export const SECURE_GATEWAYS: readonly SecureGatewayDefinition[] = [
  { id: 'NHSMAIL',         name: 'NHSmail',         kind: 'email',             jurisdictions: UK,           agreement: 'DPA' },
  { id: 'EGRESS',          name: 'Egress',          kind: 'email',             jurisdictions: [...UK, 'IE'], agreement: 'DPA' },
  { id: 'ACCURX',          name: 'Accurx',          kind: 'email',             jurisdictions: UK,           agreement: 'DPA' },
  { id: 'PAUBOX',          name: 'Paubox',          kind: 'email',             jurisdictions: ['US'],       agreement: 'BAA' },
  { id: 'VIRTRU',          name: 'Virtru',          kind: 'email',             jurisdictions: ['US', 'CA'], agreement: 'BAA' },
  { id: 'ZIX',             name: 'Zix',             kind: 'email',             jurisdictions: ['US', 'CA'], agreement: 'BAA' },
  { id: 'HEALTHLINK',      name: 'HealthLink',      kind: 'clinicalMessaging', jurisdictions: ['AU', 'NZ'], agreement: 'DPA' },
  { id: 'MEDICAL_OBJECTS', name: 'Medical-Objects', kind: 'clinicalMessaging', jurisdictions: ['AU', 'NZ'], agreement: 'DPA' },
  { id: 'REFERRALNET',     name: 'ReferralNet',     kind: 'clinicalMessaging', jurisdictions: ['AU'],       agreement: 'DPA' },
  { id: 'KR_HIE',          name: '진료정보교류',      kind: 'clinicalMessaging', jurisdictions: ['KR'],       agreement: 'DPA' },
];

export function secureGateway(id: string): SecureGatewayDefinition | undefined {
  return SECURE_GATEWAYS.find(g => g.id === id);
}

/** The gateways for a jurisdiction first, then the rest (the admin's list). */
export function gatewaysForJurisdiction(jurisdiction: Jurisdiction | undefined): SecureGatewayDefinition[] {
  const local = SECURE_GATEWAYS.filter(g => jurisdiction && g.jurisdictions.includes(jurisdiction));
  return [...local, ...SECURE_GATEWAYS.filter(g => !local.includes(g))];
}
