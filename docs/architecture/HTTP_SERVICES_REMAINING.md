# Services with no server version yet (PS-514)

Batch 616 (part E). The list of services whose `index.ts` export is still the mock, so a server build still keeps their data in the tab only (`browserData/README.md`). Regenerate with `python3 /tmp/claude-0/remaining616.py`-style scan of `src/services/index.ts` (any `export { mockX as x }` line). Each one gets its server version the same way: a table in `http<Name>Service.ts`, an `<name>ServiceInstance.ts`, a fake-fetch test, a contract section.

**3 services in 3 folders remain.**

| Folder | Services |
|---|---|
| `actionRegistry` | `actionRegistryService` |
| `clinical` | `aiInstructionService` |
| `interfaceDictionary` | `interfaceDictionaryService` |

## Not a candidate for a plain server version

- **`actionRegistry`** (voice and hotkey matching): the interface is synchronous and in memory (`getActions`, `findActionByTrigger`, `executeAction`); only the saved settings (`updateAction`) would go to a server, through the configuration service.
- **`interfaceDictionary`, `aiInstruction`, `clinicalMismatchCheck`**: composed services whose rules run in the browser over injected storage and audit; the storage goes to the server through the audit and configuration services, not a route of their own.
- **`liveUpdates`**: SignalR already (`signalRLiveUpdateService.ts`).
- **Firebase-backed variants** (`firestore*Service.ts`): to go with PS-487 once the matching server versions exist.
