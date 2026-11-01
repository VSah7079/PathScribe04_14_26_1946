**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# hooks/__tests__/

Tests for hooks in the parent `hooks/` folder that don't have their own dedicated per-hook test file elsewhere.

## Files

- **`useGlobalStationSwitch.test.ts`** — real, focused verification of the safety-critical guardrail logic in `useGlobalStationSwitch.ts` (the global `STATION:` barcode switch).
- **`useDefaultActionOnScan.test.ts`** — tests `useDefaultActionOnScan.ts` (the scan station's default action on a scan), with the route, effective station and station service mocked.

*Corrected in the Batch 496 README audit (Oct 9, 2026): added `useDefaultActionOnScan.test.ts`, which was missing from this list.*

---
*See [hooks/README.md](../README.md) for the parent folder.*

**Batch 713:** `useSelectableScanStations.test.tsx` (facility-restricted vs unrestricted lists, unavailable stored station), `useCurrentScanStation.availability.test.tsx` (unavailable station counts as none, stored value kept), and two refusal/allow cases in `useGlobalStationSwitch.test.ts`.
