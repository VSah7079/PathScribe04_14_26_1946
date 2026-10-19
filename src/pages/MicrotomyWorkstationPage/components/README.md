# MicrotomyWorkstationPage/components

Panels of the microtomy workstation (`CytologyPanel`, `SlideGridPanel`, and others).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).


## Batch 610 (#16): Block exhausted

- `BlockExhaustedControl.tsx`: the **Block exhausted** button in the block context panel. It asks for a note (Field Requirements, page "addOnOrder", group "addOnException"), flags the block through `flagAddOnException` (the same action as the Add-On Order station; the save goes through `persistOp`, so it is re-applied to the newest case after a version conflict) and e-mails the ordering pathologist. With no mail server the e-mail lands in the Simulated outbox; it holds the accession, block and reason, never the patient.
- A block with an open "Block exhausted" flag is **not cut**: `dispatchAndRecordPrint` and `markStainPrinting` refuse (`cuttingBlockedByExhaustion` in `utils/blockExceptionStates.ts`) and a banner says why. The pathologist answers on the Add-On Order tracking page: **Approve destructive cutting** lets cutting go on (the block stays Exhausted); **Cancel** or **Modify** puts the block's status back (`AddOnOrderException.blockStatusBefore`). A block that is Exhausted from grossing ("entirely submitted"), with no flag, is not held up.
- Server-side still: the mail transport (the Simulated outbox until then).
