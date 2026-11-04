// src/services/biometric/mockBiometricFlow.ts
// Batch 616 (PS-512): the demo's biometric flow: the browser-only functions in mockBiometricService behind IBiometricFlow. Labelled Simulated, as before.
import * as demo from './mockBiometricService';
import type { IBiometricFlow } from './IBiometricFlow';

export const mockBiometricFlow: IBiometricFlow = {
  async getPolicy() { return demo.getBiometricPolicy(); },
  savePolicy: policy => demo.saveBiometricPolicy(policy),
  async getCredential(userId) { return demo.getCredentialForUser(userId); },
  isAvailable: () => demo.isBiometricAvailable(),
  deviceName: () => demo.getDeviceName(),
  enroll: (userId, options) => demo.enrollBiometric(userId, options),
  verify: (userId, options) => demo.verifyBiometric(userId, options),
  remove: userId => demo.removeBiometricCredential(userId),
  async isCurrent(userId) { return demo.isBiometricCurrentForUser(userId); },
  async shouldShowWizard(userId) { return demo.shouldShowBiometricWizard(userId); },
  async dismissWizard(userId) { demo.dismissBiometricWizard(userId); },
};
