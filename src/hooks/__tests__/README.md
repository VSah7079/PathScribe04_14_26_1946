# hooks/__tests__/

Tests for hooks in the parent `hooks/` folder that don't have their own dedicated per-hook test file elsewhere.

## Files

- **`useGlobalStationSwitch.test.ts`** — real, focused verification of the safety-critical guardrail logic in `useGlobalStationSwitch.ts` (the global `STATION:` barcode switch).
- **`useDefaultActionOnScan.test.ts`** — tests `useDefaultActionOnScan.ts` (the scan station's default action on a scan), with the route, effective station and station service mocked.

*Corrected in the Batch 496 README audit (Oct 9, 2026): added `useDefaultActionOnScan.test.ts`, which was missing from this list.*

---
*See [hooks/README.md](../README.md) for the parent folder.*
