# services/quality/

Discordance tracking — the Frozen-to-Permanent Reconciliation Gate's data layer.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

## Notes

- Recent, actively-developed feature (part of the intraop/reconciliation work).
- **New real consumer:** `components/Contribution/QualityTab.tsx`'s discordant-case list, via `getAll()` and `qualityCalculations.ts`'s `reconciliationRecordsToDiscordantCases` — replaced what was previously entirely hardcoded mock data there.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*