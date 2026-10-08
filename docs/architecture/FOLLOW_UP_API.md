# Follow-up tracking: server contract (Batch 454)

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
| `POST /api/cases/{caseId}/follow-up-expected` | `case:follow-up:expect` | Called after sign-out. Computes the window with the facility's biopsy-to-resection rule. |
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
