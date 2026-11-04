# components/Exports

Batch 550 (PS-539 phase 2d, decision D7; `docs/architecture/ASYNC_EXPORT_API.md` §5 and §7).

**`ExportNotices.tsx`** shows what happened to the exports asked for in this window, when the API server builds them. Each notice is one of three kinds:
- **Preparing:** shown from 1 s, so a click never looks ignored.
- **Ready:** with a Download button.
- **Couldn't be made:** with the reason, in the user's language, shown as an alert.

Every notice also has My exports (except a failed one) and Dismiss.

**Where it appears:** it is mounted once in `SignedInApp.tsx`, in the bottom-left feedback column (`.ps-print-feedback`) above the network print jobs.
- It is inline, so there is nothing to dismiss before you carry on (CLAUDE.md rule 8).
- A quick export (ready within 3 s) downloads by itself and leaves nothing here.
- In the demo, exports are built in the browser and nothing shows.

**Patient data:** the export's title is tagged `data-phi="accession"`, because a change-history title names the case.

**Code layout:**
- The component only renders and dispatches.
- The notices and their wording are in `services/exports/exportTracker.ts` (`exportService` in `@/services`).
- The "My exports" page is `pages/MyExportsPage.tsx`.

**Test:** `ExportNotices.test.tsx`.
