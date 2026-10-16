# Cytology QC assignments and rule sampling — server contract

*Batch 501 (Oct 9, 2026). For the PathScribe API server (ASP.NET Core, SQL Server). The browser's mock services show the behaviour; the server owns it in production.*

## 1. One open assignment per specimen

At cytology sign-out, three mechanisms can select a specimen, in this order of precedence (Pete, Oct 9):

| Mechanism | Creates an assignment? | Tier | SLA |
|---|---|---|---|
| ROSE discrepancy (fixed) | yes | `high_escalation` | 4 hours |
| QC Rules engine (Configuration → Cytology QC Rules) | yes, when a rule matches and its sampling selects | the rule's | the rule's |
| Peer-review selection (QC Settings rates, high-risk) | **no** — a flag on the specimen | — | — |

A trigger that finds an **open** assignment (`QC_PENDING` or `QC_IN_REVIEW`) for the same case and specimen **upgrades** it instead of creating another:
- tier: the higher; SLA deadline: the earlier;
- reviewer pool (`eligibleReviewerRoles`): the pool of whichever trigger now sets the tier; at equal tiers the existing pool stays unless it had none;
- trigger source: ROSE over a rule;
- the trigger is added to `selectionReasons` (`rose_discrepancy`, `rule:<ruleId>`, `peer_review_flag:<random_selection|targeted_high_risk>`) and a `history` entry is appended (`created` / `upgraded` / `reason_added`, with an English detail line) and audited.

The check-and-create must be **one transaction** with a unique constraint on (caseId, specimenId) for open assignments, so two sign-out steps (or two servers) can't both create one.

## 2. Rule sampling counters

`interval` ("every Nth case") and `fixed_volume` ("first N cases") rules keep counters per rule (`casesEvaluatedSinceReset`, `casesSelectedTotal`). The server must read and advance them **in the same transaction** that evaluates the rules (row lock on the rule's counter), so two pathologists signing out at once can't both be "case 10". `percentage` rules need no counter. Counters advance only for cases that match the rule's criteria.

## 3. Consultation exclusion

The Rules engine skips a case in formal intradepartmental consultation: an active case hold with reason `pending_consultation`, or an active participant in a `consultant` or `second_opinion` role. ROSE and peer-review selection still apply.

## 4. Reviewer pool

`eligibleReviewerRoles` is stored and shown in the Peer Review queue. Enforcing it when a reviewer takes the case needs staff records mapped to the rule role codes; until then only self-review is refused.

## 5. Screening time (CLIA hours): server events and an end-of-day sign-off (Batch 572)

**Decided (Pete, Oct 14, 2026; `DEPLOYMENT_READINESS_REVIEW.md` finding F7, option C):** the server never trusts a screening time the browser measures. It records screening events with its own clock, and each person confirms or corrects their hours at the end of the day. The confirmed hours are the screening hours record (the supervisor's workload report counts them; the live limit uses the server's recorded time over a rolling 24 hours): in the US, the CLIA record (42 CFR 493.1274: slides and hours per 24 hours; confirm the exact rule with the lab's regulatory reference); elsewhere, the lab's own workload limit. The screen wording is neutral ("the workload limit"), not "CLIA".

**Why not the browser's figure:** a browser figure can be altered (developer tools, a direct API call), distorted (a background tab is throttled, a computer sleeps, its clock drifts) and can't tell screening from a slide left open. More recorded hours raise the slide limit, so an inflated figure loosens a CLIA limit. And mouse-activity timing undercounts glass-slide screening at the microscope, where the screen sits idle.

**Server events** (one screening session per person and specimen):
- `POST /api/cytology/screening-sessions` → `{ sessionId }` when a specimen is opened for screening; `POST …/{sessionId}/events { type: 'paused' | 'resumed' | 'saved' }` as it goes. The server stamps each event with its own clock; the browser sends no times.
- A session's time is the sum of its open stretches, each cut at the **idle limit** (a lab setting; a session with no event for that long stops counting at the limit). A session never saved stops at the idle limit.
- The recorded hours for a person's day: the sum over that day's sessions (the day in the lab's time zone).

**End-of-day sign-off:**
- `GET /api/cytology/screening-hours?date=YYYY-MM-DD` (the signed-in person's own): `{ date, recordedHours, signOff | null }`.
- `POST /api/cytology/screening-hours/sign-off { date, signedHours, reasonId?, note? }`, capability `cytology:screening-hours:sign-off`, own hours only. A figure that differs from the recorded hours **as shown, to one decimal** is a correction (6.04 h confirmed as "6.0" is not): it needs `reasonId` (`microscopeOffScreen`, `slideLeftOpen`, `other`), and `other` needs a note. A confirmation that isn't a correction stores `signedHours` = the recorded hours exactly.
- Append-only: a change is a new record; the latest for a person and day counts. The server stores `recordedHours` as it stood, `signedHours`, the reason, `signedAt` and `flagged` (the correction differs from the recorded hours by more than the lab's tolerance, 0.5 h by default). Each sign-off is audited.

- **Out of date:** a sign-off made before more screening was recorded that day (its `recordedHours` differs, to one decimal, from today's recorded hours) no longer counts; the recorded hours count until the person signs off again, and the panel and report say so.

**The workload check** (`resolveCytologyWorkloadCapacity`): the limit is the person's assigned cap × hours ÷ 8, and **never more than the cap**: hours beyond 8 don't raise it (Batch 572 correction; before, 10 h gave 125% of the cap). The live gate while screening uses the server's recorded hours for the rolling 24 hours; the supervisor's report uses, for each lab day, the signed-off hours when the sign-off is current, else the recorded hours. The supervisor's workload report (CYT-QA-05) shows the hours that count, the recorded hours, whether the day is signed off (or the sign-off is out of date) and whether it is flagged: a correction more than the tolerance from the recorded figure, **or any correction that turns an exceeded day into one within the limit**.

**Browser (built, Batch 572):** the Cytology worklist's "Today's screening hours" panel (one click confirms; Correct asks for a reason), the report's new columns, and the rules (`src/services/cytology/screeningHoursRules.ts`). The panel shows once something is recorded that day (or a sign-off exists), not at 0.0 h. The screening page's visible-tab timer stays as a display and, in the demo only, stands in for the server's recorded hours; with the API server the server ignores it and keeps its own.

**Batch 574 (Pete, Oct 15, 2026): night shifts, the workload counter, edits.**
- **The lab's day.** A lab setting, "screening day starts at" (`screeningDayStartHour`, 0–23, the lab's local time; default midnight), decides which day screening belongs to for the sign-off and the report. 6 keeps a 10 pm–6 am night shift on one date. A change applies **from the moment it is made**: the server keeps the history (`screeningDayStartHistory: { hour, effectiveFrom }[]`) and places each screening event by the hour in force at that instant, so past days are never re-dated. The change needs `config:cytology-workload-cap:manage` and is audited with the hour before and after. Each sign-off stores the hour in force when it was made (`dayStartHour`). The rolling-24-hour limit doesn't use it.
- **Today and yesterday.** `GET /api/cytology/screening-hours/current` → `{ today: Day, yesterday: Day | null, dayStartHour }`: yesterday only while it still needs signing off (hours recorded, and no sign-off, or one made before more was recorded). `POST …/sign-off` accepts only today, or yesterday while it still needs it; anything else is `409 dateNotAllowed` (an older day, or a yesterday already signed off, is the supervisor's to correct). The server takes the time zone from the facility's configuration and the person from the session, never from the request.
- **The note** is at most 200 characters (`noteTooLong`); it is shown on the supervisor's report, tagged for redaction, and the screen asks for no patient details.
- **The report** carries the correction's reason and note (`signOffReasonId`, `signOffNote`) and groups by the lab's day as defined above; recorded hours are kept to two decimals, the figure the person signed against.
- **The workload counter.** `GET /api/cytology/workload-summary?facilityId=` (the person's own; `facilityId` optional) → `{ reviews, slidesCounted, hours, cap, limitNow, leftNow, leftFullDay, status: ok|approaching|atLimit|over }` over the rolling 24 hours, with the same inputs as the save-time check: the feature (off for the facility's jurisdiction: `204`), the effective cap, the ledger. Without a facility, the cap is the person's own if set, else the strictest of the enterprise's and the facilities'. "Left" figures are rounded **down** to the half slide; `atLimit` means the next review (a manual slide unless the mode is given, `?nextMode=`) wouldn't fit. The browser rule is `src/services/cytology/cytologyWorkloadSummary.ts`.
- **The cap (Batch 576).** Enterprise, facility and personal caps are whole numbers of slides from 1 to 100 (CLIA 42 CFR 493.1274(d)(2)); the server refuses anything else (`422 capOutOfRange`) and, reading an older stored value over 100, uses 100. All three need `config:cytology-workload-cap:manage`.
- **Edits don't count the slide again.** Saving an edit of an existing review adds to the ledger only what its new mode weighs beyond the old (an imager pass becoming a manual rescreen adds 1); the time spent still counts. The save-time check uses the same added weight. Before Batch 574 each edit counted the slide once more.

