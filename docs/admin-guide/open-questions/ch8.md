# Chapter 8 open questions

- ADMIN_GUIDE_JURISDICTIONS.md says 13 jurisdictions; the code has 14 (adds ES, Spain). Chapter follows the code.
- There is no Spain cancer registry, screening registry or payment mapping (SPAIN_RESEARCH says per-community specs are unverified). Is a Spain row wanted?
- Payment mappings have no rows for Scotland, Northern Ireland or Ireland.
- KNOWN_GAPS says 13 cancer registries; the code has 14 (Batch 620 added `epath_npcr_us`).
- No cancer registry is marked verified; only 3 of 12 screening registries are (CSMS, PALGA, NCSR).
- Fee schedules do not exist. `ZERO_FEE_MAPPING_ERROR` comment says "fee schedule line" but the code tests zero RVU. Reword the comment?
- PS-322 (billing unit: cores versus specimen) is not started and needs the billing expert. Not stated as fact in the chapter.
- `billing:charge:approve` is not seeded to any built-in role. Intended?
- Lab Director lacks `config:cancer-registry:manage` and `config:screening-registry:manage` by default; REGISTRY_* docs may imply Admin and Lab Director.
- Cancer Registry Reporting and Cytology Registry Reporting have no entry in `CONFIG_SECTION_CAPABILITIES`; they rely on button-level greying.
- Deactivating a master payment type is not checked against mappings, and mappings have no duplicate check.
- ICD-O-3 capture stores SNOMED morphology ids, not codes like 8500/3 (Batch 496 note).
- The COSD screen says "COSD (England)"; docs say UK.
- The Financial tab of System Logs has no capture id in the manifest; most ch8 captures are placeholders.
- Auto-coding from report text (Thread 2) is gated on attorney and compliance input.
- No MIPS or MACRA code exists anywhere; chapter marks it Not built.
