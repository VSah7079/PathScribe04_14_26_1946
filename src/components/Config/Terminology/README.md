# components/Config/Terminology/

Terminology service endpoint configuration and live health monitoring
(SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O, CPT).

**Pattern:** Config/data (`terminologyConfig.ts`) + monitoring UI
(`TerminologyServicesSection.tsx`), same shape as `Config/AI/`.

## Files

- **`terminologyConfig.ts`** — Excellent, detailed header. Documents
  exactly which terminology systems are free/direct via NLM (SNOMED CT,
  ICD-10-CM, ICD-11, LOINC, ICD-O) vs. require a licensed backend proxy
  (CPT — AMA-licensed, non-US ICD-10 variants), and the region → ICD-10
  variant mapping keyed off active governing body (CAP→ICD-10-CM, RCPath/
  ICCR→ICD-10 WHO, RCPA→ICD-10-AM). All overridable via `.env`
  (`VITE_NLM_BASE_URL`, `VITE_CPT_PROXY_URL`, `VITE_ICD10_PROXY_URL`).
  Strong copyright-narrative evidence — same licensing-awareness spirit as
  the CAP/RCPath content-licensing cleanup already done elsewhere.
- **`TerminologyServicesSection.tsx`** — Live health-check UI for the
  endpoints above (auto-runs on mount, "Test All" button). Own header
  correctly documents its consumer (`Config/System/index.tsx`).

## Notes

- No issues. One of the better-documented folders in this pass.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
