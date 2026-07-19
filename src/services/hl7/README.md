# services/hl7/

Standard-conformant HL7 v2.5.1 ORM^O01 message builder, with a vendor-adapter seam for receiving-system-specific quirks.

**Pattern:** DELIBERATE PRE-INTEGRATION SCAFFOLDING — nothing in the app currently calls this. Not dead code. Real, carefully-researched engineering (see types.ts's header for sourcing against IHE PaLM Technical Framework Vol. 2x).

## Files

- **`index.ts`** — Single entry point — orchestrates ormBuilder + an adapter (defaults to identityAdapter).
- **`ormBuilder.ts`** — Assembles a complete ORM^O01 message from Case/Specimen/HistologyBlock/StainOrder — one message per Block, one OBR per stain ordered.
- **`segmentBuilders.ts`** — One function per HL7 segment (MSH/PID/PV1/ORC/OBR/SPM/NTE) — every field position confirmed against real IHE PaLM/HL7 sources, with honest inline flags anywhere a mapping is an interpretation rather than confirmed standard (see SPM's own doc comment on collection-timestamp placement).
- **`types.ts`** — HL7 message context + version constants. Documents a genuinely unsettled industry problem (stain communication over HL7 — SPM-6 'is not how pathologists think about stains,' per current IHE discussion).
- **`adapters/IHL7VendorAdapter.ts`** — The vendor-customization seam — lets the standard core be built/tested without waiting on any specific vendor's spec.
- **`adapters/identityAdapter.ts`** — Default no-op adapter — passes the standard message through unchanged.
- **`adapters/vantageAdapter.ts`** — DELIBERATELY NOT IMPLEMENTED — a specific Vantage integration detail (a CPT code used as a stain-protocol identifier) was flagged as inconsistent/unverifiable rather than built toward guesswork. Throws with a clear message until a real, verified Vantage integration guide exists.

## Notes

- mockHL7Service.ts was DELETED July 2026 — an earlier, simpler stub superseded by this more rigorous standards-based system (same folder, real replacement, not just cleanup).
- Wire in via ormBuilder.ts's buildOrmO01ForBlock() + a real HTTP/MLLP transport when order transmission is ready to go live.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*