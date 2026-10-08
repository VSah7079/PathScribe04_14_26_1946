// src/services/deployment/deploymentInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424 (Pete, Oct 1 2026: "would there not be a PathScribe test instance
// and PathScribe prod instance. Testing occurs on the test system before
// updating prod."). Which kind of instance this deployment is, from the same
// VITE_APP_ENV setting the sign-in page's badge reads:
//
//   production   real patients; registry results go only to live registers,
//                and only once go-live is approved
//   validation   (also training, development, or unset) no real registry
//                traffic at all: only the synthetic test suite, only to the
//                registries' test systems
//
// Unset or unrecognised counts as validation: an instance nobody declared as
// production can never send to a live register (fails closed). The setting
// belongs to the deployment (with its endpoints and credentials), not to a
// screen: nothing in the app changes it.
// ─────────────────────────────────────────────────────────────────────────────

export type InstanceRole = 'production' | 'validation';

export function instanceRoleFrom(raw: unknown): InstanceRole {
  return String(raw ?? '').toLowerCase().trim() === 'production' ? 'production' : 'validation';
}

/** What a registry payload's environment is on this kind of instance. */
export const registryEnvironmentFor = (role: InstanceRole): 'test' | 'production' => (role === 'production' ? 'production' : 'test');

/* eslint-disable @typescript-eslint/no-explicit-any */
export const deploymentInstance = {
  role: instanceRoleFrom(import.meta.env.VITE_APP_ENV) as InstanceRole,
  /** The PathScribe release running here; a validation record names the release it validated. */
  release: typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'unknown',
};
