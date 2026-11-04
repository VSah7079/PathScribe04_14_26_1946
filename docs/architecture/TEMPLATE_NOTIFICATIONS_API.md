# Template lifecycle e-mails: server contract

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

**Status:** the browser side is built and tested (Batch 583, Jira PS-63). The server side is a specification for phase 2e; nothing of it is built yet.
**Decisions** (Pete and the dev team, Oct 15, 2026): see "Open Items for Research" §1 and PS-63.

## What changed in the browser

Before Batch 583 the browser asked the server for staff e-mail lists (`GET /api/users/user/get-all?roles=admin,clinical_lead`, `GET /api/templates/{id}/owner`), wrote each e-mail itself in English, and sent it with `POST /api/notifications/email`. Any signed-in browser could therefore read every Admin's address, and PathScribe has no "Clinical Lead" role, so the lookup could never have worked.

Now the browser sends **the event alone**:

`POST /api/notifications/template-events`, JSON body:

| Field | Meaning |
|---|---|
| `action` | One of the eight below |
| `templateId`, `templateName?` | The template |
| `source?` | `CAP`, `RCPath`, `ICCR` or `Custom` |
| `version?`, `previousVersion?` | For sync updates |
| `note?` | The reviewer's reason, on "changes requested" |
| `triggeredByName` | Display name, for the e-mail text only. **The server uses the signed-in caller, not this field.** |
| `occurredAt` | ISO time on the browser's clock; the server stamps its own |
| `appBaseUrl` | For the e-mail's links; a server with its own configured address ignores it |

Response: `2xx` once the event is accepted (queued); any other status is a refusal. The browser never retries and never blocks the user on it.

## What the server does

1. **Authenticates the caller** and checks they may cause the event (a template author submits; an approver approves or publishes; sync events come from the sync job, not a browser).
2. **Chooses the recipients** (Pete, Oct 15), from the template's save history and the staff directory, active staff only, de-duplicated, never the whole directory in one message to everyone:

   | Event | Recipients |
   |---|---|
   | `template.submitted_for_review` | Template Approvers and Lab Directors (built-in role ids `template-approver`, `lab-director`) |
   | `template.needs_changes`, `template.approved`, `template.published` | Everyone who saved the template (its recorded savers) |
   | `sync.new_template_found`, `sync.template_updated`, `sync.auto_failed`, `sync.manual_upload` | Admins (role id `admin`) |

3. **Writes each e-mail in the recipient's language** (their staff profile's language: en, fr, de, nl, ko), one message per language. No opt-out and no digest in the first release: sent at once.
4. **Sends** from `no-reply@<host>` per deployment: the hospital's SMTP relay (private cloud) or SendGrid / Amazon SES (shared SaaS).
5. **Records each e-mail** (recipient, time, relay status code, accepted or refused). Required for audit.

Nothing in an e-mail may contain patient data: these events name templates and staff only.

## The English wording to start from

Subjects (prefix `[pathscribe]`); `{name}` is `templateName`, or `templateId` when absent:

| Event | Subject | Body |
|---|---|---|
| `sync.new_template_found` | New {source} checklist available — {name} | The nightly auto-sync detected a new {source} checklist: {name}. It has been placed in the Review Queue and is ready for clinical and informatics verification. |
| `sync.template_updated` | Checklist updated — {name} v{version} | An updated version of {name} (v{version}, previously v{previousVersion}) was detected by the nightly sync and placed in the Review Queue. |
| `sync.auto_failed` | Nightly protocol sync failed | The nightly protocol sync job failed and no templates were updated. Please check the sync log and consider uploading any pending protocols manually. |
| `sync.manual_upload` | Protocol manually uploaded — {name} | {by} manually uploaded {name}. It has been placed in the Review Queue pending verification before it can be published. |
| `template.submitted_for_review` | Protocol submitted for review — {name} | {by} submitted {name} for clinical and informatics review. Please open the Review Queue to assess and action it. |
| `template.needs_changes` | Changes requested — {name} | {by} returned {name} requesting changes before it can be approved. Reason: {note, or "No reason provided."} |
| `template.approved` | Protocol approved — {name} | {by} approved {name}. It is now ready to be published to the reporting workflow. |
| `template.published` | Protocol published — {name} is now live | {by} published {name}. It is now live and available to all pathologists in the synoptic reporting workflow. |

Links: the Review Queue is `{appBaseUrl}/configuration?tab=protocols&section=review`; "changes requested" links to `{appBaseUrl}/template-editor/{templateId}`; a failed sync links to `{appBaseUrl}/configuration?tab=protocols`. Escape every inserted value (names and the reviewer's note are free text).

These strings are the starting point for the server's five translations. Korean wording needs native-speaker review before clinical use.

## Open

- **When** `POST /api/notifications/email` and this endpoint are built: the dev team is to name the phase 2e sprint (Oct 15 item 1.8).
- **Template savers:** the browser records who saved a template (Batch 328); the server needs the same record per template.

## Demo behaviour without the server (Batch 604)

Until the server implements these endpoints, the browser keeps each e-mail (and each template lifecycle event, with recipients shown as "chosen by the server") in a Simulated mail outbox when the request cannot connect or the answer is 404, 405, 501, 502, 503 or 504. Any other refusal is treated as a real refusal. See `src/services/communications/simulatedMailOutbox.ts`.
