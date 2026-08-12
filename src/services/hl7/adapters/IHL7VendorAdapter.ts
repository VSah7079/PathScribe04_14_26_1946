// src/services/hl7/adapters/IHL7VendorAdapter.ts
// ─────────────────────────────────────────────────────────────
// The whole point of separating the standard core (ormBuilder.ts,
// segmentBuilders.ts) from vendor adapters: the core can be built and
// tested against the real, verified HL7/IHE PaLM standard without
// waiting on any specific vendor's spec. A vendor's own quirks —
// non-standard field usage, a specific coding system for stain codes,
// whatever Vantage's real integration guide eventually says — get
// applied here, as a transformation on top of an already-valid
// standard message, never baked into the core itself.
// ─────────────────────────────────────────────────────────────

export interface HL7AdapterContext {
  caseId: string;
  specimenLabel: string;
  blockLabel: string;
}

export interface IHL7VendorAdapter {
  /** Vendor or system name — shown in logs/UI so it's always clear
   *  which adapter actually produced a given outbound message. */
  readonly name: string;
  /**
   * Takes an already-valid standard ORM^O01 message and returns
   * whatever that specific vendor/receiving system actually needs.
   * May be a no-op (see IdentityAdapter) or a real transformation.
   */
  adapt(standardMessage: string, context: HL7AdapterContext): string;
}
