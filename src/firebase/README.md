# src/firebase/

`config.ts` (Firebase app + Firestore initialization) and `index.ts`
(re-exports `db`, plus a `functions` stub).

## A real finding — currently dormant, not urgent, but worth knowing about

`config.ts` has literal placeholder credentials (`"YOUR_API_KEY"`,
`"your-app-id"`, etc.) and calls `initializeApp()` at module load
time — meaning any file that imports from this folder would trigger
Firebase initialization with fake credentials immediately.

Traced every one of the 5 files that import from this folder
(`firestoreUserService.ts`, `firestoreVoiceMacroService.ts`,
`firestoreDelegationTypeService.ts`, `firestoreBiometricService.ts`,
`caseRegistryService.ts` — the "real," Firestore-backed halves of
several interface/mock/real service triplets) and confirmed all 5 are
themselves genuinely unreachable from the live app right now — every
apparent "consumer" found via grep turned out to be a comment
referencing the filename, not a real import.

So this placeholder config never actually executes today. But it will
break immediately — real Firebase SDK calls against garbage
credentials — the moment anyone wires a real Firestore-backed service
in without replacing these placeholders first. Not something to fix
without real credentials; flagging so whoever eventually does that
migration knows to update this file as part of it. Full detail in
`PRIORITY_FIXES.md` item #37.
