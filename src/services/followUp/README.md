# services/followUp

Follow-up tracking (Batch 454, Pete, Oct 4 2026). The lab is told when an expected follow-up specimen hasn't arrived. It records what happened, and it can email the ordering clinician when it chooses to. Nothing goes to a clinician automatically.

## What is tracked

- **Cytology → histology.** An abnormal cytology sign-out already stores a correlation window (PS-156). The follow-up is received when a histology case is matched to it.
- **Biopsy → resection.** The pathologist ticks "A follow-up specimen (resection or excision) is expected" in the sign-out modal. The window is the facility's biopsy-to-resection rule, counted from the case's earliest surgical specimen. The follow-up is received when another case for the same patient brings a surgical specimen inside the window whose recorded site matches (and side, when both are recorded). A specimen with no site to compare is only a "possible match" for the lab to confirm. That is stricter than correlation candidates, because a wrong match would silently close a follow-up.

Status, in order: **pending**, then **due soon** (within the facility's warning days; default 30), then **overdue**. **Received** ends it automatically. **Closed** ends it with a disposition: done at another lab, patient declined, not clinically indicated, patient deceased, lost to follow-up, or other (with a note).

## Files

| File | What it does |
|---|---|
| `followUpTypes.ts` | Items, expectations, records, dispositions, `followUpKey`. |
| `followUpTracking.ts` | Pure functions: `resolveFollowUpItems`, `clockStatus`, `surgicalFollowUpReceivedBy`, filters, counts, sort, the export rows, and the tile id sets (`followUpCaseIdsForUser`, `cytologyFollowUpCaseIds`). |
| `followUpActions.ts` | The protected actions: `markFollowUpExpected` (`case:follow-up:expect`), `recordFollowUpDisposition` and `reopenFollowUp` (`qa:follow-up:record`). |
| `followUpClinicianEmail.ts` | The draft (lab template or built-in wording, filled in) and `emailOrderingClinician` (`qa:follow-up-clinician:email`). It refuses when the facility has the email off, when the follow-up isn't due soon or overdue, for a bad address, or when a placeholder is left in. The send is recorded and audited only when the mail service accepts it. The template has no patient-name or diagnosis placeholder. |
| `followUpAlerts.ts` | The internal alerts. Each follow-up gets at most one "due soon" and one "overdue" message, sent to the sign-out pathologist and the active Lab Directors and QA Reviewers. `followUpLive.ts` runs one sweep at a time and claims each alert before sending it. |
| `followUpSettings.ts` | Warning days, whether the clinician email is offered, and the wording, per enterprise and facility (`config:follow-up-tracking:manage`). Also the settings screen's drafts. |
| `followUpStore.ts` | Storage for expectations and records (no checks; the actions check first). |
| `followUpLive.ts` | The wiring to the real services, exported through `@/services`. |

Server contract: [`docs/architecture/FOLLOW_UP_API.md`](../../../docs/architecture/FOLLOW_UP_API.md).

## Where it shows

- **Quality Assurance → Operations → Follow-up not received:** the report, outcomes, the clinician email, and the CSV download (`qa:follow-up:export`).
- **Pathologist worklist:** a "Follow-up due" tile for the viewer's own signed-out cases. It appears only when the count isn't 0.
- **Cytology worklist:** a "Follow-up Due" QA tile.
- **Configuration → System → Follow-up tracking.**

## Tests

- `followUpTracking.test.ts`: status, receipt and alert rules.
- `followUpActions.test.ts`: capabilities, dispositions, settings and the email.
- `followUpLive.test.ts`: mark, then overdue, then one alert, then closed, against the mock services.
- Screens: `components/QualityAssurance/FollowUpTab.test.tsx`, `components/Config/System/FollowUpTrackingSection.test.tsx` and `pages/SynopticReportPage/modals/CaseSignOutModal.followUp.test.tsx`.

## Open

- The alert sweep runs in the browser when a worklist or the Follow-up tab loads. The server should run it daily (see the API doc).
- With no API server answering, the mail service never accepts a clinician email, so in the demo it can be drafted but not sent.
- (No longer open: since Batch 459 a follow-up can also be marked "expected" after sign-out, from the report page; see below.)

*Corrected in the Batch 496 README audit (Oct 9, 2026): marking a follow-up expected after sign-out was built in Batch 459.*

## Batch 455 — Demo baseline: people, pools, cases and the reset

New `followUpDemoSeed.ts`:
- Three surgical expectations: S26-4630 (received), S26-4632 (overdue) and S26-4633 (due soon).
- Metro General Hospital (c1) has "Email ordering clinician" turned on.

## Batch 459 — Mark follow-up expected after sign-out

Before, a surgical case could be marked "follow-up specimen expected" only in the sign-out modal. A pathologist who signed out without ticking it can now mark it afterwards from the report page.
- **`followUpMarkOffer`** (`followUpActions.ts`, pure): what the report page offers. It returns `marked` (with the existing mark) when the case is already marked, `offer` for a finalized or closed case with a surgical specimen, and `none` otherwise.
- **`markFollowUpExpected`** takes `afterSignOut`. The mark is stored with `markedAfterSignOut: true`, and the audit detail ends "; marked after sign-out". The permission check is unchanged (`case:follow-up:expect`), as are the due-date rules.
- **`followUpLive.ts`:** `loadFollowUpMarkOffer(caseId)` and `markFollowUpExpectedAfterSignOutLive(caseId, user)`. The window is anchored on the case's sign-out time (`finalizedAt`).
- **User Guide:** on a signed-out surgical case, the action bar shows "Mark follow-up expected". Click it, and it changes to "Follow-up expected · due <date>". The case then appears on the Follow-up not received report like any other mark. Without the permission, the button is greyed out and its tooltip says why.
- **Admin Guide:** the permission is `case:follow-up:expect` (Role Dictionary). The due date comes from the facility's biopsy-to-resection window (Follow-up tracking settings).
- `followUpLive.test.ts` targets a surgical case only (it had picked up a cytology case when the seed order changed). That fix went out in the Batch 458 zip.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `sendFollowUpAlertsLive` does nothing once the server runs `followUp.dailyAlerts`.
