// src/services/secureMessaging/secureGatewayRules.test.ts
import { describe, it, expect } from 'vitest';
import { agreementInForce, preferredGateway, secureMessagingConfigProblem, secureSendProblem, sendableGateways, localToday, type SecureMessagingConfig } from './secureGatewayRules';
import { gatewaysForJurisdiction, SECURE_GATEWAYS } from './secureGateways';

const LAB: SecureMessagingConfig = { facilityId: 'lab', defaultGatewayId: 'VIRTRU', gateways: [
  { gatewayId: 'PAUBOX', enabled: true, agreement: { kind: 'BAA', reference: 'BAA-1', signedOn: '2025-01-01', expiresOn: '2026-12-31' } },
  { gatewayId: 'VIRTRU', enabled: true },
  { gatewayId: 'ZIX', enabled: false, agreement: { kind: 'BAA', reference: 'Z', signedOn: '2025-01-01' } },
] };

describe('secure messaging gateways (Batch 517, PS-143)', () => {
  it('covers the UK, US, Australia/New Zealand and Korea, with the local ones listed first', () => {
    expect(SECURE_GATEWAYS.map(g => g.id)).toEqual(expect.arrayContaining(['NHSMAIL', 'PAUBOX', 'HEALTHLINK', 'KR_HIE']));
    expect(gatewaysForJurisdiction('AU').slice(0, 3).map(g => g.id)).toEqual(['HEALTHLINK', 'MEDICAL_OBJECTS', 'REFERRALNET']);
    expect(gatewaysForJurisdiction('KR')[0].kind).toBe('clinicalMessaging');
    expect(gatewaysForJurisdiction(undefined)).toHaveLength(SECURE_GATEWAYS.length);
  });

  it('an agreement is in force from signing until it expires', () => {
    const g = LAB.gateways[0];
    expect(agreementInForce(g, '2024-12-31')).toBe(false);
    expect(agreementInForce(g, '2025-01-01')).toBe(true);
    expect(agreementInForce(g, '2027-01-01')).toBe(false);
    expect(agreementInForce(LAB.gateways[1], '2026-01-01')).toBe(false);
  });

  it('checks each gateway on its own: one covered, one not (Pete, Oct 2)', () => {
    expect(secureSendProblem(LAB, 'PAUBOX', true, '2026-10-10')).toBeNull();
    expect(secureSendProblem(LAB, 'VIRTRU', true, '2026-10-10')).toBe('noAgreementForPatientData');
    expect(secureSendProblem(LAB, 'VIRTRU', false, '2026-10-10')).toBeNull();
    expect(secureSendProblem(LAB, 'ZIX', false, '2026-10-10')).toBe('gatewayNotAvailable');
    expect(secureSendProblem(null, 'PAUBOX', false, '2026-10-10')).toBe('noGatewayConfigured');
  });

  it('offers enabled gateways, default first, and preselects a covered one for patient data', () => {
    expect(sendableGateways(LAB).map(g => g.gatewayId)).toEqual(['VIRTRU', 'PAUBOX']);
    expect(preferredGateway(LAB, false, '2026-10-10')?.gatewayId).toBe('VIRTRU');
    expect(preferredGateway(LAB, true, '2026-10-10')?.gatewayId).toBe('PAUBOX');
  });

  it('names what is wrong with a setup', () => {
    expect(secureMessagingConfigProblem(LAB)).toBeNull();
    expect(secureMessagingConfigProblem({ ...LAB, defaultGatewayId: 'ZIX' })).toBe('defaultNotEnabled');
    expect(secureMessagingConfigProblem({ gateways: [LAB.gateways[1], LAB.gateways[1]] })).toBe('duplicateGateway');
    expect(secureMessagingConfigProblem({ gateways: [{ gatewayId: 'X' as never, enabled: true }] })).toBe('unknownGateway');
    const withAgreement = (a: object) => ({ gateways: [{ gatewayId: 'PAUBOX' as const, enabled: true, agreement: { kind: 'BAA' as const, reference: 'R', signedOn: '2025-01-01', ...a } }] });
    expect(secureMessagingConfigProblem(withAgreement({ reference: ' ' }))).toBe('agreementReferenceRequired');
    expect(secureMessagingConfigProblem(withAgreement({ signedOn: '' }))).toBe('agreementDateRequired');
    expect(secureMessagingConfigProblem(withAgreement({ expiresOn: '2024-01-01' }))).toBe('agreementEndsBeforeStart');
  });

  it('localToday is the local calendar date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
