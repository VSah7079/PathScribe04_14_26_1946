// src/services/interfaceDispatch/registryPayloadBoundary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424 (Pete, Oct 1 2026: "The site should only send test data never
// production data"). The last check before a registry payload leaves for the
// interface engine. Defense in depth behind the send gate
// (registryGoLive/registrySendGate.ts): the engine adapter should repeat it.
//
//   validation instance   only test-environment payloads, carrying the
//                         synthetic marker, for a synthetic (SYN-) patient
//   production instance   only production-environment payloads, with no
//                         synthetic marker and no synthetic patient
//
// Anything else is refused with a literal English reason (stored on the
// queue entry). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { InstanceRole } from '../deployment/deploymentInstance';

/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY_TRANSACTIONS = new Set(['REGISTRY_REPORT', 'CANCER_REGISTRY_REPORT']);

/** Null to let it through. */
export function checkRegistryPayloadBoundary(transactionType: string, payload: any, role: InstanceRole): string | null {
  if (!REGISTRY_TRANSACTIONS.has(transactionType)) return null;
  const environment = payload?.submission?.environment;
  const marked = !!payload?.synthetic;
  const syntheticPatient = String(payload?.patient?.mrn ?? '').startsWith('SYN-');
  if (role === 'validation') {
    if (environment !== 'test') return 'Refused at the registry boundary: a validation instance sends only to registry test systems.';
    if (!marked || !syntheticPatient) return 'Refused at the registry boundary: a validation instance sends only synthetic test cases, never real patient data.';
    return null;
  }
  if (environment !== 'production') return 'Refused at the registry boundary: a production instance sends only to live registers.';
  if (marked || syntheticPatient) return 'Refused at the registry boundary: synthetic test cases never go to a live register.';
  return null;
}
