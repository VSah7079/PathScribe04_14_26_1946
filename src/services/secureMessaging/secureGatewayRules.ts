// src/services/secureMessaging/secureGatewayRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): a lab's secure messaging setup and the rules for sending
// through it. Pete's Oct 2 decision: a message with patient or finding details
// goes only through a gateway that has its own BAA or data processing
// agreement on file; with several gateways, each is checked on its own.
//
// A setup belongs to a performing-lab tenant (the enterprise facility a
// person's organisation resolves to), like the field requirements (PS-359).
// Pure: the service (mockSecureGatewayConfigService) stores it and
// messageService.sendSecureEmail applies secureSendProblem before sending.
// ─────────────────────────────────────────────────────────────────────────────
import { getFacilityIsoDate } from '@/utils/facilityTime';
import { secureGateway, type GatewayAgreementKind, type SecureGatewayId } from './secureGateways';

export interface GatewayAgreement {
  kind: GatewayAgreementKind;
  /** The contract's reference (number or title). */
  reference: string;
  /** 'YYYY-MM-DD'. */
  signedOn: string;
  /** 'YYYY-MM-DD'; none means it runs until withdrawn. */
  expiresOn?: string;
}

export interface GatewaySetup {
  gatewayId: SecureGatewayId;
  enabled: boolean;
  /** The lab's sending address or account on the gateway (shown as From). */
  senderAddress?: string;
  agreement?: GatewayAgreement;
}

export interface SecureMessagingConfig {
  facilityId: string;
  gateways: GatewaySetup[];
  defaultGatewayId?: SecureGatewayId;
  updatedAt?: string;
  updatedBy?: string;
}

export type SecureMessagingConfigProblem =
  | 'unknownGateway'
  | 'duplicateGateway'
  | 'defaultNotEnabled'
  | 'agreementReferenceRequired'
  | 'agreementDateRequired'
  | 'agreementEndsBeforeStart';

export type SecureSendProblem =
  | 'noGatewayConfigured'
  | 'gatewayNotAvailable'
  | 'noAgreementForPatientData';

const CONFIG_PROBLEMS: readonly string[] = ['unknownGateway', 'duplicateGateway', 'defaultNotEnabled', 'agreementReferenceRequired', 'agreementDateRequired', 'agreementEndsBeforeStart'];
const SEND_PROBLEMS: readonly string[] = ['noGatewayConfigured', 'gatewayNotAvailable', 'noAgreementForPatientData'];
export const isSecureMessagingConfigProblem = (e: string): e is SecureMessagingConfigProblem => CONFIG_PROBLEMS.includes(e);
export const isSecureSendProblem = (e: string): e is SecureSendProblem => SEND_PROBLEMS.includes(e);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The first problem with a setup an administrator is saving, or null. */
export function secureMessagingConfigProblem(config: Pick<SecureMessagingConfig, 'gateways' | 'defaultGatewayId'>): SecureMessagingConfigProblem | null {
  const seen = new Set<string>();
  for (const g of config.gateways) {
    if (!secureGateway(g.gatewayId)) return 'unknownGateway';
    if (seen.has(g.gatewayId)) return 'duplicateGateway';
    seen.add(g.gatewayId);
    if (g.agreement) {
      if (!g.agreement.reference.trim()) return 'agreementReferenceRequired';
      if (!DATE.test(g.agreement.signedOn)) return 'agreementDateRequired';
      if (g.agreement.expiresOn && (!DATE.test(g.agreement.expiresOn) || g.agreement.expiresOn < g.agreement.signedOn)) return 'agreementEndsBeforeStart';
    }
  }
  if (config.defaultGatewayId && !config.gateways.some(g => g.gatewayId === config.defaultGatewayId && g.enabled)) return 'defaultNotEnabled';
  return null;
}

/** Whether the gateway's agreement is in force on `today` ('YYYY-MM-DD'). */
export function agreementInForce(setup: GatewaySetup, today: string): boolean {
  const a = setup.agreement;
  return !!a && a.signedOn <= today && (!a.expiresOn || a.expiresOn >= today);
}

/** The gateways a person may pick: enabled ones, the default first. */
export function sendableGateways(config: SecureMessagingConfig | null): GatewaySetup[] {
  const enabled = (config?.gateways ?? []).filter(g => g.enabled);
  return [...enabled].sort((a, b) => Number(b.gatewayId === config?.defaultGatewayId) - Number(a.gatewayId === config?.defaultGatewayId));
}

/** The gateway preselected for a message: the default, or the first that may carry it. */
export function preferredGateway(config: SecureMessagingConfig | null, containsPatientData: boolean, today: string): GatewaySetup | undefined {
  const options = sendableGateways(config);
  return containsPatientData ? options.find(g => agreementInForce(g, today)) ?? options[0] : options[0];
}

/** Why a message can't go through `gatewayId`, or null when it can. */
export function secureSendProblem(config: SecureMessagingConfig | null, gatewayId: string | undefined, containsPatientData: boolean, today: string): SecureSendProblem | null {
  const options = sendableGateways(config);
  if (options.length === 0) return 'noGatewayConfigured';
  const setup = options.find(g => g.gatewayId === gatewayId);
  if (!setup) return 'gatewayNotAvailable';
  if (containsPatientData && !agreementInForce(setup, today)) return 'noAgreementForPatientData';
  return null;
}

/**
 * Today as 'YYYY-MM-DD' in `timezone` (default: this computer's), for checking
 * an agreement's dates. A lab can pass its own facility timezone.
 */
export function localToday(now: Date = new Date(), timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  return getFacilityIsoDate(now, timezone);
}
