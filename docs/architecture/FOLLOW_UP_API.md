# Follow-up tracking: server contract (Batch 454)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

This is the browser's side of follow-up tracking, written from `src/services/followUp/`. The browser runs it today on localStorage mocks. The PathScribe API server (ASP.NET Core on SQL Server) takes over storage and the alert job.

## What it tracks

| Kind | Expected when | Window | Received when |
|---|---|---|---|
| Cytology → histology | A cytology sign-out with an abnormal interpretation (category rank 1 or more) stores `histologyCorrelationWindow` on the specimen (PS-156). | The cyto-histo correlation rule. | A histology case is matched to it (`histologyCorrelationCandidates`), and the match isn't dismissed as not relevant. |
| Biopsy → resection | The signing pathologist ticks "A follow-up specimen is expected" at surgical sign-out (`case:follow-up:expect`). | The biopsy-to-resection rule, from the case's earliest surgical specimen. | Another case for the same patient has a surgical specimen collected or received inside the window whose recorded site matches the biopsy's (and the side, when both record one). A specimen with no site recorded is returned as `possibleCaseId`: shown to the lab, never closing anything. |

A recorded outcome (a disposition) closes a follow-up. Without one, its status follows the clock:

- **pending:** inside the window, before the warning period.
- **dueSoon:** inside the facility's warning period (`warningDays`, default 30; 0 turns the warning off).
- **overdue:** past the window's end.

## Tables

```sql
CREATE TABLE FollowUpExpectation (
  CaseId        NVARCHAR(64)  NOT NULL PRIMARY KEY,
  SpecimenId    NVARCHAR(64)  NOT NULL,      -- the specimen that anchors the window
  WindowJson    NVARCHAR(MAX) NOT NULL,      -- CorrelationWindow (anchor, anchorUsed, startsAt, endsAt, windowDays, ruleSource)
  MarkedBy      NVARCHAR(64)  NOT NULL,
  MarkedByName  NVARCHAR(200) NOT NULL,
  MarkedAt      DATETIME2     NOT NULL
);

CREATE TABLE FollowUpRecord (
  FollowUpKey            NVARCHAR(200) NOT NULL PRIMARY KEY,  -- '<kind>:<caseId>:<specimenId>'
  Disposition            NVARCHAR(40)  NULL,                  -- receivedElsewhere | patientDeclined | notClinicallyIndicated | patientDeceased | lostToFollowUp | other
  DispositionNote        NVARCHAR(1000) NULL,                 -- required for 'other'; never exported
  DispositionBy          NVARCHAR(64)  NULL,
  DispositionByName      NVARCHAR(200) NULL,
  DispositionAt          DATETIME2     NULL,
  DueSoonAlertSentAt     DATETIME2     NULL,
  OverdueAlertSentAt     DATETIME2     NULL
);

CREATE TABLE FollowUpClinicianContact (
  Id           BIGINT IDENTITY PRIMARY KEY,
  FollowUpKey  NVARCHAR(200) NOT NULL,
  SentAt       DATETIME2     NOT NULL,
  SentBy       NVARCHAR(64)  NOT NULL,
  SentByName   NVARCHAR(200) NOT NULL,
  ToAddress    NVARCHAR(320) NOT NULL
);
```

The settings are a single enterprise row plus per-facility overrides. Their fields are `warningDays`, `clinicianEmailEnabled`, `emailSubject` and `emailBody`, and `followUp/followUpSettings.ts` validates them.

## Endpoints

| Method and path | Capability | Notes |
|---|---|---|
| `GET /api/follow-ups?filter=attention\|overdue\|dueSoon\|open\|resolved\|all` | the Quality Assurance screen | The items with their status today, limited to cases the caller can open. Whether a follow-up was received is decided over all cases, because the resection may be at another facility. |
| `POST /api/follow-up/follow-up/mark-expected` | `case:follow-up:expect` | Called after sign-out. Computes the window with the facility's biopsy-to-resection rule. |
| `PUT /api/follow-ups/{key}/disposition` `{ value, note? }` | `qa:follow-up:record` | `other` needs a note of 1,000 characters or fewer. |
| `DELETE /api/follow-ups/{key}/disposition` | `qa:follow-up:record` | Reopens the follow-up. |
| `POST /api/follow-ups/{key}/clinician-email` `{ to, subject, body }` | `qa:follow-up-clinician:email` | Refused when the facility has it off (`disabled`), when the follow-up isn't due soon or overdue (`notOpen`), for a bad address, or when a `{{placeholder}}` is left in. It sends one email, adds a contact row and audits the send. |
| `GET/PUT /api/settings/follow-up-tracking`, `PUT/DELETE /api/facilities/{id}/follow-up-tracking` | `config:follow-up-tracking:manage` | |
| `GET /api/follow-ups/export` | `qa:follow-up:export` | The same columns as `followUpExportRows`, with no patient name and no note. |

## The alert job

The server runs `followUpAlertsDue` once a day and sends each internal message once:

- **Due soon:** sent when the follow-up enters the warning period.
- **Overdue:** sent when it passes the due date.

The messages go to the pathologist who signed the case out and to every active Lab Director and QA Reviewer. Until the job exists, the browser runs the same sweep when the cytology worklist, the pathologist worklist or the Follow-up tab loads.

Nothing is ever sent to a clinician automatically (Pete, Oct 4 2026: "that is up to the Laboratory").

## Email acceptance

`services/communications/notificationService.ts` `sendEmail` now resolves `true` only when `POST /api/notifications/email` accepts the message. The browser records the contact and the audit entry only then. A refusal is audited as `followup.clinician_email_failed`, and the user is told. The server endpoint should do the same: record the contact only after the mail relay accepts the message, and return an error otherwise.

## Browser commands (Batch 616, PS-483; Pete's decision Oct 18, 2026: command-based)

The browser sends COMMANDS. The server works out the window, the status today, who did it and when. The browser never sends a whole record, a status, a window, a user id or a name. (The demo keeps the same commands and works the status out from the browser store.) Service: `IFollowUpService` (`httpFollowUpService.ts`, `mockFollowUpService.ts`).

| Method | Call | Body | Reply | Refusals (fixed codes) |
|---|---|---|---|---|
| `loadItems()` | `GET /api/follow-ups?filter=all` | none | `{ items: FollowUpItem[], settings: { enterprise, facilities: { <facilityId>: ... } } }`. Each item carries its status today (`pending`, `dueSoon`, `overdue`, `received`, `closed`), `daysRemaining` / `daysOverdue` and its `record`. The list is limited to cases the caller can open. `settings` are the effective follow-up settings (warning days, clinician email on or off, template) so the screen need not ask again. | `NOT_PERMITTED` |
| `getExpectation(caseId)` | `GET /api/follow-up/follow-up/get-expectation` | none | the expectation, or `404` (none) | |
| `markExpected(caseId, { afterSignOut })` | `POST /api/follow-up/follow-up/mark-expected` | `{ "afterSignOut": false }` | the expectation, with the window the server computed from the facility's biopsy-to-resection rule and the case's earliest surgical specimen | `NOT_PERMITTED` (`case:follow-up:expect`), `NO_SURGICAL_SPECIMEN`, `NO_DATE`, `CASE_NOT_FOUND` |
| `recordDisposition(ref, value, note?)` | `PUT /api/follow-ups/{key}/disposition` | `{ "value": "...", "note": "..." }` (note only when given) | the record, now closed; the server stamps who and when from the token | `NOT_PERMITTED` (`qa:follow-up:record`), `UNKNOWN_DISPOSITION`, `NOTE_REQUIRED`, `NOTE_TOO_LONG` |
| `reopen(ref)` | `DELETE /api/follow-ups/{key}/disposition` | none | the record without an outcome (reopening one that is open is not an error) | `NOT_PERMITTED` |
| `emailClinician(ref, { to, subject, body })` | `POST /api/follow-ups/{key}/clinician-email` | `{ to, subject, body }` | the record, with the contact row added only after the mail relay accepted the message | `NOT_PERMITTED` (`qa:follow-up-clinician:email`), `DISABLED`, `NOT_OPEN`, `BAD_ADDRESS`, `PLACEHOLDER_LEFT` |

- The `key` (`<kind>:<caseId>:<specimenId>`) goes in the path, URL-encoded. It holds case and specimen ids and no patient name or MRN.
- A refusal reaches the screen as `{ ok: false, reason }` with the code in camel case (`NOT_PERMITTED` becomes `notPermitted`), the reasons the screens already map.
- Not in the browser commands: the daily alert job (server, `followUpAlertsDue`), the settings (`/api/settings/follow-up-tracking`), the export, and the clinician email draft (composed in the browser from the lab's template).
