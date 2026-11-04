# interfaceDictionary

Batch 612. The Interface Dictionary (Message Mapper): vendor profiles that map a vendor's own HL7 v2 (Z-segment), JSON or FHIR fields onto extension fields beside the case. See `docs/architecture/INTERFACE_DICTIONARY_API.md`.

| File | Role |
|---|---|
| `interfaceDictionaryTypes.ts` | Types and refusal codes |
| `messagePath.ts` | Source path syntax (`ZAB-2`, `OBX[2]-5.1`, `a.b[0].c`, `[key=value]`, FHIR) and message reading. Never throws |
| `scopeGuard.ts` | What a mapping may reach (`ext.name` only) and the handled / needs-a-code-release lists |
| `mappingEngine.ts` | Validate definitions, apply mappings (types, conversions, code translation, defaults, required), content hash |
| `profileLifecycle.ts` | draft, tested, published, superseded, retired; rollback copies the earlier version as a new one |
| `interfaceDictionaryAudit.ts` | PHI-free audit entries |
| `interfaceDictionaryService.ts` | The service (dependencies passed in) |
| `interfaceDictionaryServices.ts` | Browser wiring; writes need the platform-only capabilities (`guardConfigWrites`) |
| `interfaceDictionaryText.ts` | Code to locale key; code translation text |

Storage keys: `interfaceDictionaryProfiles` (settings), `interfaceDictionaryFieldValues` (case data); both cleared by Reset demo. Simulated: samples are pasted, never received; a test keeps counts and a mapping hash, not the sample. Tests: `interfaceDictionary.test.ts`, `interfaceDictionaryLocale.test.ts`.
