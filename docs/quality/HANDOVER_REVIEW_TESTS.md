# Handover: the Playwright review tests (updated Oct 16, 2026, Batch 587)

For Pete, the dev team and whoever picks this up next. Plain language; no programming needed to follow it.

## Where things stand

- **49 of the In Review tickets have a Playwright review test** in `e2e/review/` (Batches 581 to 587). How to run them: [`PLAYWRIGHT_REVIEW_GUIDE.md`](PLAYWRIGHT_REVIEW_GUIDE.md).
- **The In Review test plan** (CSV, v7) says per ticket what is automated, what needs a person, and which spec file to run.
- **Every "Mixed" ticket now has a spec** (Batch 586 added PS-63, 277, 283, 342), covering only the steps a computer can check.
- **Still to do from "Can automate":** PS-261, PS-273, PS-493 (Batch 588), then the rest of that group.
- **One "Needs a person" ticket:** PS-276 (PDF/A rendering).

## What only a person can check

| Ticket | What | Why |
|---|---|---|
| PS-60 | Real Microsoft/Okta sign-in, the signing popup, the case Sign Out dialog with the demo password | Needs an SSO build with a provider, the API server (phase 2e), and `PS_DEMO_PASSWORD` |
| PS-269 | Scan Stations and Validation Studies report in another language; Korean wording | Native-speaker review (PS-480, PS-348) |
| PS-292 | Autopsy PAD release shows in Outbound Dispatches; whether the Autopsy PAD/FAD template is still open | Not automated yet; scope decision |
| PS-474 | Response headers on the real Vercel demo, nginx, IIS, Azure | The Vite dev server sends none |
| PS-475 | The built app's network use; a hospital network | Needs the built app and a real network |
| PS-63 | Template author workflow steps 2 to 5 and 7 to 8; admin guide clarity | Not automated yet (needs a second user and the publishing flow) |
| PS-277, PS-283 | Printed / PDF layout, watermark, barcode, revision flag | Needs `render_report` and a person |
| PS-283 | Restricted printing by role; Print Queue permissions | Not automated yet |
| PS-342 | Plain text boxes; national dictionaries | Not automated / licences (PS-343) |
| PS-687 | Screen reader (JAWS A and D; Edge A1 to A3; C1 to C7) | Run by the QC team, then an outside firm |
| All | Firefox | Never run (PS-722) |

## Real app bugs the tests found (not fixed; for Pete's decision)

Listed in full in `src/i18n/README.md`, Batch 584. Each affected test is marked as a known bug, so the run stays green, and it starts failing the day the bug is fixed (that is the cue to delete the marker line in the spec).

1. Audit entry ids collide (PS-344, PS-477). 2. QZ Tray is never connected (PS-55). 3. "Patient undefined undefined" on the container label (PS-478). 4. Confirm Field shortcut does nothing (PS-66). 5. OR PIN set on the Staff screen is refused (PS-262). 6. Typed narrative not checked for critical findings (PS-323). 7. Label Designer width and canvas off by 1 px (PS-245). 8. Error-boundary nav bar missing (PS-472). 9. Demo data gaps (PS-147). 10. Smaller items.

## Decisions already made (Oct 15, Pete and the dev team)

Server-held sign-in tokens, no JWT in the browser (PS-345); SCIM user sync now, group mapping after the first release; Azure SignalR Service for shared SaaS, a Redis backplane for private cloud; template e-mails are sent by the server from the event alone (`docs/architecture/TEMPLATE_NOTIFICATIONS_API.md`). Open items for the dev team: 1.8, 2.8, 4.4 and follow-ups F1 and F2 in the Open Items document.

## Dev note, Oct 16

- Test the new URL first: https://pathscribe-ai.vercel.app/ (the old `pathscribe-ai-ui` deployment is to be ignored).
- `VITE_REPORT_PDF_ENDPOINT` is not set in Vercel, so report PDFs in the demo print from the screen.
- `render_report` is not deployed (HTTP 404). `firebase.json` lost its `functions` block in commit 6a67258e and has been restored; the new URL is in the CORS list; `functions/test_main.py` passes (52 tests).
- Once the cytology report template lands, the dev team deploys `render_report` and sets the endpoint. That unblocks the PDF steps of PS-277 and PS-283 and PS-276.

## Housekeeping

- Delivery is by delta zip until the GitHub move at the end of October (PS-468). Nothing has been committed or pushed.
- Helper still to fix: `signIn` in `e2e/review/helpers.ts` redirects oddly for specs that start from `/login` (the specs use their own sign-in).
- Not run for Batches 583 to 585: the independent review agent (usage).
