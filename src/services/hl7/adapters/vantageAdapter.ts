// src/services/hl7/adapters/vantageAdapter.ts
// ─────────────────────────────────────────────────────────────
// Deliberately NOT implemented. Earlier in this project, some
// Vantage-specific HL7 segment details were provided secondhand and
// flagged as unverifiable — one detail specifically (a CPT billing
// code used as a stain-protocol identifier in OBR-4) read as
// inconsistent with how CPT codes actually function, which was reason
// enough not to build toward it as if confirmed.
//
// This stub exists so the adapter seam is real and ready — the moment
// there's a genuine Vantage integration guide (via eLabDoc or a Roche
// field application specialist), the actual transformation logic goes
// here, informed by real, verified field-level detail instead of
// guesswork. Until then, this throws rather than silently producing a
// message that looks like it works but might not.
// ─────────────────────────────────────────────────────────────

import type { IHL7VendorAdapter } from './IHL7VendorAdapter';

export const vantageAdapter: IHL7VendorAdapter = {
  name: 'Roche navify Pathology Lab Advantage (Vantage) — NOT YET IMPLEMENTED',
  adapt(_standardMessage, context) {
    throw new Error(
      `vantageAdapter is a stub — no verified Vantage integration spec exists yet ` +
      `(case ${context.caseId}, specimen ${context.specimenLabel}, block ${context.blockLabel}). ` +
      `Use identityAdapter until a real Vantage integration guide is available.`
    );
  },
};
