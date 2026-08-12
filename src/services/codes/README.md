# services/codes/

Multi-jurisdiction clinical terminology CONFIGURATION — which coding systems (SNOMED/ICD-10 variants/ICD-11) are enabled, per jurisdiction (US/CA/GB/IE).

**Pattern:** Standard interface/mock pattern. NOTE: no firestore stub currently — was present but confirmed genuinely dead/unused and removed July 2026 (unlike its siblings, that one really was orphaned).

## Notes

- Deliberately separate from services/terminologySearch/ (the live REST API search client) — this folder is config/dictionary only, not a search implementation. See terminologySearch/'s own README for why they're split.
- Also deliberately separate from services/diagnosisCodes/ — that's the referring physician's order-time diagnosis code; this is the broader, AI-assisted, multi-standard case-level coding system used near sign-out.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*