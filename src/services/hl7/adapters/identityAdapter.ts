// src/services/hl7/adapters/identityAdapter.ts
// ─────────────────────────────────────────────────────────────
// The default adapter — passes the standard message through
// unchanged. Useful as-is for any receiving system that genuinely
// accepts standard HL7 (many do, for the base segments at least), and
// as the fallback while no vendor-specific adapter exists yet.
// ─────────────────────────────────────────────────────────────

import type { IHL7VendorAdapter } from './IHL7VendorAdapter';

export const identityAdapter: IHL7VendorAdapter = {
  name: 'Standard HL7 (no vendor adaptation)',
  adapt(standardMessage) {
    return standardMessage;
  },
};
