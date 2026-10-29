# Feedback destination and validation routing (Oct 28, 2026)

Two Feedback settings (Configuration > System > Feedback, capability `config:feedback:manage`) and one new QA category. Code: `services/feedback/`, `services/enhancementRequestService.ts`.

## 1. Enhancement request destination URL

The light-bulb Enhancement Request can be delivered to a page on the ForMedrixAI website instead of by email. No address is in the source.

| Where it comes from | Rule |
|---|---|
| The administrator's entry in Configuration > System > Feedback (`enhancementUrl`) | Wins. https only, no user name or password, no `#` part, a host with a dot. A path and a query are allowed (a form id), so one setting is enough. Saving is audited (`FEEDBACK_SETTINGS_CHANGED`). |
| The deployment's `config.json`: `VITE_ENHANCEMENT_REQUEST_URL` | The default when the setting is empty. Checked like every other address (`runtimeConfig/`: https, or plain http to this computer in a development build; the Feedback setting itself never accepts http). A deployment pre-seeds it here, with no change to the build. |
| Neither | Enhancement requests are emailed to `VITE_ENHANCEMENT_EMAIL`, as before. |

An administrator typing the address is the approval (there is no host allow-list as the research feed has, because the website is whatever the deployment chooses). The limit that really holds is the browser's Content-Security-Policy.

### Content-Security-Policy

The browser may only send to origins in `connect-src`. `VITE_ENHANCEMENT_REQUEST_URL` is in `RUNTIME_CONFIG_ORIGIN_KEYS.connect` (`deploy/security-headers/securityHeaders.mjs`), so `node scripts/generate-security-headers.mjs <origins.json> <outDir> --runtime-config config.json` adds its origin. If an administrator types a different site into the Feedback setting, the origin must be added to the deployment's origins file and the headers regenerated; until then the browser blocks the call and the sender sees the plain "could not be delivered, nothing was sent" message.

### What is sent

`POST <address>` with JSON through the shared client (`apiServer/apiHttpClient.ts`), **with no Authorization header**: the user's PathScribe token never goes to another site. Fields: `source`, `kind`, `sentAt`, `title`, `description`, `category`, `priority`, `screenshotDataUrl` (only when the person included the screenshot, patient data masked), `system` (only when "Include system details" is on: user name and role, version, browser, OS, page type, case support reference; never the user id or the case number). The title and description have been through the identifier check first. The website must allow the call (CORS, including the `Content-Type: application/json` preflight) and answer `204` or a JSON object; it may return `ticketUrl` (https only; otherwise ignored). Any other reply, a refusal, a time-out (15 s) or no connection is `DELIVERY_FAILED` with fixed text; the website's own message is never shown.

### Demo build

`__DEMO_TOOLS__` builds never send. The request is kept in the Simulated mail outbox with the host, and the confirmation reads "Simulated: this demo build does not send to <host>, so nothing was sent."

QA / testing feedback (including validation feedback) is always emailed; the destination is for enhancement requests only.

## 2. AI / Template validation (QA category)

- The QA modal has the category `AI / Template validation`. Choosing it shows two optional lists: the **active** validation studies (`validationStudyService.getActive()`) and the **published** templates (`reportTemplateService.getAll()`; a study that names templates narrows the list to them).
- The links (study id and name, template id, name and version) go with the submission, into the email (HTML and text), and into the message metadata. Nothing about what a study is changed.
- Recipients: the **Validation recipients** list (`validationRecipients`); empty means the QA recipients, and the confirmation says "No validation recipients are set, so this went to the QA recipients."; both empty is today's "No recipients configured." The administrator cc is kept.
- Audit: `FEEDBACK_ROUTED_TO_VALIDATION`, literal English, written after the mail service accepts the message: the title, study id, template id and version, the recipient count, and whether the QA list took it. No feedback text, no addresses.
- Capabilities: sending feedback has none (unchanged); the settings use `config:feedback:manage` (unchanged). No new protected action.

## 3. Server contract

`IFeedbackSettingsService.get` and `.save` now carry `validationRecipients` (string array) and `enhancementUrl` (string, empty for none) in the settings body (`CONFIG_DICTIONARIES_API.md`); a server that predates them must store both. The server version should refuse an `enhancementUrl` that fails `enhancementUrlProblem` (https only).

## 4. Not built

- A list of feedback inside PathScribe, and a read-only list of linked feedback on the validation study page: nothing keeps the feedback itself (email and the audit entry are the record).
- Delivery to a live website has been tested against a stand-in only.
- Retry or queueing when the destination is down: the sender is told and resends.
