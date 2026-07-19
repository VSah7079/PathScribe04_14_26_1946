# services/ai/

The core AI provider abstraction layer. ALL AI generation in PathScribe flows through IAIProvider — nothing else in the app references a concrete provider directly.

**Pattern:** Not the interface/mock/firestore triplet pattern — this is provider abstraction (Claude/GPT/Bedrock swappable without code changes).

## Files

- **`IAIProvider.ts`** — The provider contract. Enables provider swapping, a mock provider for demos, audit logging at a single choke point, future per-client/subspecialty routing.
- **`AIProviderRegistry.ts`** — Resolves which concrete provider is active.
- **`AIAuditLog.ts`** — Logs every AI generation call.
- **`providers/ClaudeProvider.ts`** — Real Anthropic Claude implementation.
- **`providers/MockProvider.ts`** — Demo/offline provider, zero API cost.

## Notes

- Used directly by orchestrator/orchestratorEngine.ts — the real narrative-generation engine.
- Distinct from services/aiIntegration/ (see that folder) — this is the low-level provider swap layer; aiIntegration/ is higher-level synoptic-suggestion logic.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*