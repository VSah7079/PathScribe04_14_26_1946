// src/services/biometric/httpBiometricService.ts
// Batch 616 (PS-512): the API server's version of IBiometricService (contract:
// ACCESS_SESSION_API.md §3). It replaces the Firestore plan in
// firestoreBiometricService.ts. The browser only relays the device's WebAuthn
// answers: the server makes the challenge, checks the attestation or assertion,
// and keeps the public key. No private key, template or attestation is ever
// stored in the browser.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type {
  AssertionResponse, AttestationResponse, BiometricCredential, BiometricPolicy, EnrolmentChallenge,
  IBiometricService, VerificationChallenge,
} from './IBiometricService';

type Args<K extends keyof IBiometricService> = Parameters<IBiometricService[K]>;
const BASE = '/api/biometric/biometric';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpBiometricService = (client: ApiHttpClient): IBiometricService => {
  const routes = buildHttpService<IBiometricService>(client, {
    getPolicy: result('GET', () => route('getPolicy')),
    savePolicy: result('POST', () => route('savePolicy'), { body: (p: BiometricPolicy) => p }),
    getCredential: result('GET', (userId: Args<'getCredential'>[0]) => `${route('getCredential')}${queryString({ userId })}`),
    getEnrolmentChallenge: result('POST', () => route('getEnrolmentChallenge'), { body: (userId: string, userName: string) => ({ userId, userName }) }),
    completeEnrolment: result('POST', () => route('completeEnrolment'), { body: (userId: string, attestation: AttestationResponse, deviceName: string) => ({ userId, attestation, deviceName }) }),
    revokeCredential: result('POST', () => route('revokeCredential'), { body: (userId: Args<'revokeCredential'>[0]) => ({ userId }) }),
    getVerificationChallenge: result('POST', () => route('getVerificationChallenge'), { body: (userId: Args<'getVerificationChallenge'>[0]) => ({ userId }) }),
    completeVerification: result('POST', () => route('completeVerification'), { body: (userId: string, assertion: AssertionResponse) => ({ userId, assertion }) }),
    isBiometricCurrentForUser: result('GET', (userId: Args<'isBiometricCurrentForUser'>[0]) => `${route('isBiometricCurrentForUser')}${queryString({ userId })}`, { pick: (d: { current: boolean }) => d.current }),
    shouldShowWizard: result('GET', (userId: Args<'shouldShowWizard'>[0]) => `${route('shouldShowWizard')}${queryString({ userId })}`, { pick: (d: { show: boolean }) => d.show }),
    dismissWizard: result('POST', () => route('dismissWizard'), { body: (userId: Args<'dismissWizard'>[0]) => ({ userId }) }),
  });
  // No enrolled device is a successful "none".
  return { ...routes, getCredential: (userId: string) => notFoundAsNull<BiometricCredential>(routes.getCredential(userId)) };
};

export type { EnrolmentChallenge, VerificationChallenge };
