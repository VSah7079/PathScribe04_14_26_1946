# services/itemEndStates

Batch 731 (Lab Workflow & Batch spec §10.5). Every physical item (block, slide, matrix block, decant) has an end state, recorded with a reason, the user and the time: exhausted (no tissue remaining), returned to storage, archived, sent out, consumed for testing, discarded. Records are append only: the newest is the item's current end state, the earlier ones its history.

- `IItemEndStateService.ts`: the types (`ITEM_END_STATES`, sources `manual` / `disposal` / `referral` / `exhaustion_flag`) and the interface.
- `itemEndStateRules.ts`: `endStateProblems` (a reason is required), `currentEndStates` / `currentEndStateOf` (newest wins), `endStatesFor` (a slide is never "exhausted"), `END_STATE_REASON_KEYS` (quick-pick reasons per end state, locale keys `itemEndState.reasons.<state>.<key>`).
- `mockItemEndStateService.ts` (demo, mock storage `itemEndStates`, cleared by Demo Reset): `record` needs `material:end-state:record`; `recordFromAction` is for the system's own records made inside an action that already checked its permission.
- `recordEndStateFromAction.ts`: fire-and-forget call used by disposal by scan (discarded), a completed referral batch (sent out) and a pathologist confirming a block exhausted (exhausted; through `addOnOrderActions.respondToAddOnException`).
- `httpItemEndStateService.ts` (+ test), `itemEndStateServiceInstance.ts`. Contract: `docs/architecture/CASE_WORKFLOWS_API.md`, "IItemEndStateService".
- Screen: `components/Workstation/ItemEndStatePanel.tsx` with `hooks/useItemEndState.ts` (the Microtome for the block, Slide Distribution for the slide). BI: `item_end_states` dataset (`biFeed/biFeedCatalog.ts`).
- Tests: `itemEndStates.test.ts`.
