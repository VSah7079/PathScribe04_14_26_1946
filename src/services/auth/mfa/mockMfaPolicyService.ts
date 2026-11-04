// src/services/auth/mfa/mockMfaPolicyService.ts
// Batch 675 (access-14): the demo's IMfaPolicyService, an in-memory policy for the default organisation.
// The demo build does not use it for saving (mfaService keeps the browser store and audits there); it exists so
// the service has the same shape in both builds.
import type { IMfaPolicyService } from './IMfaPolicyService';
import { MFA_POLICY_DEFAULTS, normaliseMfaPolicy, type MfaPolicy } from './mfaPolicy';

let current: MfaPolicy = { ...MFA_POLICY_DEFAULTS };

export const mockMfaPolicyService: IMfaPolicyService = {
  async get() { return { ok: true, data: current }; },
  async save(next) { current = normaliseMfaPolicy({ ...current, ...next }); return { ok: true, data: current }; },
};
