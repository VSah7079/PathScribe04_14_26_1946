# services/surgicalSignOut/

Batch 649 (sign-out audit). The writes that complete a surgical sign-out, moved out of `pages/SynopticReportPage/hooks/useSignOutWorkflow.ts` so they can be tested directly and the hook shrinks. Everything here takes its dependencies as arguments. The review checks that run *before* these writes are in `services/signoutGates/`.

| File | What it does |
|---|---|
| `completeSurgicalSignOut.ts` | Orchestration **Sign Out Case**. Order: (1) the case status (pending release or finalized), the versioned write that can conflict, so a conflict stops with nothing else written; (2) the attending's countersign, when the case was released for countersign (a failure is reported, not swallowed); (3) corrections and addenda waiting on this sign-out; (4) the immutable report version (PDF and SHA-256); (5) the signature record, linked to that version (`reportVersionLink`: id, number, PDF hash). A failure at steps 2 to 4 puts the status back (`statusRevertPatch`). `commitCountersignRelease` does the same for a resident's release for countersign. |
| `completeAssistFinalize.ts` | Assist **Finalize**: finalize (status saved, signature held), release any waiting amendment or addendum and write the Assist report version, then record the signature linked to that version. When no version was written the signature is still recorded, without a link, so the signer's confirmation is never lost. Used by the four gate-resume paths and both Finalize entry points. |
| `releaseRevisionsAtSignOut.ts` | Corrections waiting on a re-sign-out. Assist: release first, send to the LIS only if the release was accepted (a send that fails afterwards is counted as not transmitted). Orchestration: release, then CORRECTED / ADDENDUM through the release delay. A release the amendment service refuses is not marked finalized or published; the caller is told how many. |
| `releaseSurgicalFinal.ts` | The cancer registry submission follows the release of the surgical FINAL, not the signature. Called at sign-out when no release delay applies and from `reportReleaseService.checkAndReleaseIfExpired` when the delay runs out. Assist cases are excluded (their FINAL is the LIS's). A failure is logged and never undoes the release. |

**Not done yet.** The API server does all of this in one transaction (planned). Until then a version already written stays when a later step fails (versions are append-only), and a correction released before a later failure is not undone. Listed in `docs/product/KNOWN_GAPS.md`.

Tests: `completeSurgicalSignOut.test.ts`, `completeAssistFinalize.test.ts`, `releaseRevisionsAtSignOut.test.ts`, `releaseSurgicalFinal.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
