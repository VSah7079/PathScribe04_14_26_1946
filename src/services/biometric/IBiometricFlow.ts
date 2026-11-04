// src/services/biometric/IBiometricFlow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-512): what the screens and the sign-in flow ask of biometric
// signing. They never import a mock: they use `biometricFlow` (from
// @/services). In the demo it is the browser-only, labelled-Simulated flow
// (mockBiometricFlow). With an API server it is serverBiometricFlow: the
// server makes each challenge and checks each answer (IBiometricService, whose
// server version is httpBiometricService); the browser only relays the
// device's WebAuthn response. The private key and any template never leave
// the device.
// ─────────────────────────────────────────────────────────────────────────────
import type { BiometricCredential, BiometricPolicy, BiometricRunOptions } from './mockBiometricService';

export interface BiometricRunResult {
  ok: boolean;
  /** 'DECLINED' (cancelled or refused at the device), 'UNAVAILABLE' (no WebAuthn here), 'NOT_PERMITTED', or the server's fixed code. */
  error?: string;
  prompt?: 'device' | 'simulated';
}

export interface IBiometricFlow {
  getPolicy(): Promise<BiometricPolicy>;
  /** False when refused (nothing saved). */
  savePolicy(policy: BiometricPolicy): Promise<boolean>;
  getCredential(userId: string): Promise<BiometricCredential | null>;
  /** True when this browser can show a device prompt (or the demo fallback). */
  isAvailable(): Promise<boolean>;
  /** The device's own name for the check, for display. */
  deviceName(): string;
  /** Enrol the signed-in person's own device. */
  enroll(userId: string, options?: BiometricRunOptions): Promise<BiometricRunResult>;
  /** Ask the device to confirm the person again. */
  verify(userId: string, options?: BiometricRunOptions): Promise<BiometricRunResult>;
  remove(userId: string): Promise<{ ok: boolean; error?: string }>;
  /** True when the check is current per the policy (no re-verification needed). */
  isCurrent(userId: string): Promise<boolean>;
  shouldShowWizard(userId: string): Promise<boolean>;
  dismissWizard(userId: string): Promise<void>;
}
