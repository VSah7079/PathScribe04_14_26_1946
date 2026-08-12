# Hotfix #2 — Missing src/orchestrator/orchestratorEngine.ts

## What your test run confirmed
The first hotfix worked completely — `useLisIntegration.test.ts` now
passes all 8 tests, and every other suite passes too (634/634 tests).
One error remained: `useReportGeneration.test.ts` couldn't resolve
`@/orchestrator/orchestratorEngine`.

## Why this is a second file, not a mistake in the first fix
`src/orchestrator/` originally had two real files —
`contextBuilder.ts` and `orchestratorEngine.ts` — both dated the same
day in my project state, strongly suggesting they were introduced
together in the same original session and got separated somewhere
between then and your actual project. The first hotfix only sent the
one your error named at the time; this one closes out the folder.

## This time, checked more thoroughly
Rather than verify just the one file your error named, I searched the
entire codebase for every file that imports anything from
`@/orchestrator/*` — 9 files total, including
`SynopticReportPage.tsx`, `useLisIntegration.ts`,
`useReportGeneration.ts`, `LeftReportPanel.tsx`, `MarkersPanel.tsx`,
`CopilotReportViewModal.tsx`, and others. All 9 depend only on these
two files — there's no third file in `src/orchestrator/` waiting to
surface as a third round.

I also checked `orchestratorEngine.ts`'s own dependency chain
directly this time (its imports of `AIProviderRegistry.ts`,
`AIAuditLog.ts`, `streamingWriter.ts`, `IAIProvider.ts`) — all present
and confirmed, the same way I should have framed the first hotfix's
confidence.

## Apply
Both files go in at:
- `C:\Users\nimmo\Documents\pathscribe-ai\src\orchestrator\contextBuilder.ts`
  (same content as hotfix #1 — included again here so this is one
  complete, self-contained drop-in rather than needing both zips)
- `C:\Users\nimmo\Documents\pathscribe-ai\src\orchestrator\orchestratorEngine.ts`

Then a full dev-server restart, same as before, for the same reason
(Vite's import-resolution cache can hold onto the stale "not found"
state).

## If anything still surfaces
Given the 9-file search above, I don't expect another one from this
same gap. If something else does show up, same approach: send me the
exact path named in the error and I'll trace its real dependency chain
directly before packaging anything, rather than assume.
