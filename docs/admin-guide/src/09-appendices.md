---
chapter: 9
id: ch9
title: Appendices: Troubleshooting and Audit Log Verification
---

# Appendices: Troubleshooting and Audit Log Verification {#ch9}

This chapter has three parts. The first is a troubleshooting matrix: the problems an administrator meets most often, each with its cause and the screen that fixes it. The second is an index of the error codes PathScribe shows or records. The third documents the System Logs screen and gives a step-by-step guide for verifying what the audit log holds. The glossary of terms is the last chapter of the guide ([Glossary](#ch99)).

**The User Guide (Batch 657).** The online User Guide for the people who do the work is built from Markdown in `docs/user-guide/` by `python3 scripts/user-guide/build.py` and published with the application under `/help`; each screen's Help button and F1 open the article for the screen being shown. Configuration and administrator screens keep their Administrator Guide buttons. No setting is needed. Add or change a page by editing its file and rebuilding; the build checks the required sections, links and routes.

Every message quoted here is the English text from the product. Every code is one that exists in the source; a code that is only a placeholder in a contract, with no use in the product, is not listed.

## Troubleshooting matrix {#ch9-matrix}
Breadcrumb: Home > Administrator Guide > Appendices > Troubleshooting matrix

**Status:** Built

**How to use the matrix.** Find the symptom the user reports, read the likely cause, and follow the fix. Most "it is broken" reports are one of two things: a dictionary that was never set up (an empty list), or a role that does not hold a capability (a greyed-out button or a refused save). When the symptom shows an upper-case code, look it up in the [error code index](#ch9-error-codes).

**Before anything else.** Two checks answer most questions.

1. Open [System Logs](#screen-audit-log) and search for the person's name or the capability key. A refused permission check writes a **Capability refused** entry that names the capability and the person's session role.
2. Look at the **Error Log** tab for an open error with a code, source and time near the report.

### Empty lists and "not set up" messages {#ch9-matrix-empty}

An empty drop-down or a "none configured" message almost always means a dictionary earlier in the setup order was skipped. The [Setup order](setup-sequence.html) page lists the order.

| Symptom (what the user sees) | Likely cause | Fix | Screen |
|---|---|---|---|
| In a case's team window: **No participation types configured**, with the hint "Set up types in System → Participation Types." | No participation type exists. | Add the types the lab uses, then reopen the window. | [Participation Types](#screen-participation_types) |
| A test print or a label window says **No printer profiles configured**. | No printer profile has been added. | Add a printer profile for each label printer model. | [Printer Profiles](#screen-printer_profiles) |
| An embedding or microtomy station says **No printer configured** or **The configured printer profile no longer exists**. A slide-distribution station says **This station isn't set up for slide-label printing.** | The station has no printer profile, or its profile was deleted. | Open the station and choose a printer profile that still exists. | [Scan Stations](#screen-scan_stations), [Printer Profiles](#screen-printer_profiles) |
| A slide-distribution or scan-batch window says **No slide scanners are set up** (the text names Configuration, Equipment, kind "Slide scanner"). | No equipment record of kind Slide scanner. | Add the scanners. | [Equipment](#screen-equipment) |
| A label does not print and the message reads **No GS1 GTIN configured. Set one in Print Settings before printing a GS1 cassette label** (or slide label). | The facility has no GS1 GTIN entered. | Enter the GTIN in Print Settings. | [Print Settings](#screen-print_settings) |
| Facility Ops dashboard says **No display profiles are configured yet**. | No display profile exists. | Add one under Display Profiles. | [Display Profiles](#screen-display_profiles) |
| The OR dashboard says **No terminals configured yet**. | No OR suite terminal exists. | Add the terminals. | [OR Suite Terminals](#screen-or_suite_terminals) |
| In the routing rule window: **No active pools. Enable "Pool / Workgroup" on a Subspecialty first.** | No subspecialty is in Pool / Workgroup mode. | Switch Pool / Workgroup on for at least one subspecialty, then add the rule. | [Subspecialties](#screen-subspecialties), [Routing Rules](#screen-routing_rules) |
| In the new container window: **No facility is currently configured with the Reference Lab role.** | No facility has the Reference Lab role. | Give a facility that role in its facility settings. | [Facility Dictionary](#screen-facility-dictionary) |
| A user trying secure email sees **Your lab has no secure messaging gateway set up.** | The facility has no gateway under its Secure messaging tab. | Add a gateway in the facility's settings. | [Facility Dictionary](#screen-facility-dictionary) |
| The Client service levels **Add** list is empty, with the note that every client already has a level or no clients are set up. | Every facility already has a service level, or no client facilities exist. | Add the facilities first, or edit the existing level. | [Facility Configuration](#screen-clients), [Client service levels](#screen-client_sla) |

### Saves refused, greyed-out buttons and screens you cannot open {#ch9-matrix-permissions}

PathScribe checks capabilities twice. The screen greys out an action the person cannot do. The service behind the action checks again and refuses it. In production the API server repeats the check and has the final word. There is no bypass for any role, Superadmin included.

| Symptom | Likely cause | Fix | Screen |
|---|---|---|---|
| A button is greyed out. Its tooltip reads **Your roles don't include "<capability>".** | None of the person's roles holds that capability. | Add the capability to a role the person holds. Capabilities are grouped by area in the Role Dictionary. | [Roles](#screen-staff-roles), [Members](#screen-staff-members) |
| The tooltip reads **"<capability>" also needs "<other>", which your roles don't include.** | The capability requires another capability (its `requires` list in the catalog). | Grant both. A role save is refused with "a capability is missing one it needs" until the required one is also granted. | [Roles](#screen-staff-roles) |
| The tooltip reads **"<capability>" isn't available here: your facility assignment doesn't cover it.** | The person holds the capability, but the action touches a facility outside their assigned facilities (or spans all facilities). | Change the person's facility assignment. | [Members](#screen-staff-members) |
| A Configuration save fails with **Not saved: this needs the "<permission>" permission. An administrator can grant it in Configuration → Staff → Role Dictionary.** | The person lacks the `config:...:manage` capability for that screen (code `CONFIG_NOT_PERMITTED`). | Grant the named permission to the person's role. | [Roles](#screen-staff-roles) |
| A role save fails: **Not saved: no role could manage roles afterwards.** | The change would leave no assignable role holding `config:roles:manage`. | Give **Manage roles** to another assignable role first, then save. | [Roles](#screen-staff-roles) |
| A role or staff save fails with **changing the clinical mismatch rules and approving the AI instructions are separate duties**. | One person (or one role) may not hold both `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve` (code `SEPARATION_OF_DUTIES`). | Split the two capabilities across two roles held by different people. | [Roles](#screen-staff-roles), [Members](#screen-staff-members) |
| A role save fails with **this role is managed by ForMedrixAI**. | The Superadmin role cannot be changed at a hospital. | None. Use a different role. | [Roles](#screen-staff-roles) |
| A user opens a screen and sees **You don't have access to this screen**; after sign-in the Home page says **None of your roles gives you access to a screen yet.** | The role lacks the `screen:<name>:open` capability, so Home shows no tile and the route refuses the address. | Add the screen capability to the role. | [Roles](#screen-staff-roles) |
| A person cannot approve their own edit: **You edited this text, so you can't approve it.** | Self-approval is refused for AI instructions (code `SELF_APPROVAL`). | Have a different holder of `config:ai-prompt:approve` approve it. | [AI Instructions](#screen-ai_instructions) |
| An export button does nothing, or the export screen shows **You don't have permission to export this report.** | Each export has its own capability (for example `audit:audit-log:export`), and the server checks it again at download. | Grant the export capability named on the button's tooltip. | [Roles](#screen-staff-roles), [My exports](#screen-my-exports) |

### Labels and reports that do not print {#ch9-matrix-print}

| Symptom | Likely cause | Fix | Screen |
|---|---|---|---|
| A label goes to the browser print window and the message reads **The label printer is not connected, so this label went to the browser print window. Check that QZ Tray is running on this computer.** | The QZ Tray service is not running or not reachable on that computer. | Start QZ Tray on the computer and print again. | [Printer Profiles](#screen-printer_profiles), [Print Settings](#screen-print_settings) |
| **Label <id> did not print: <printer> is out of labels / is out of ribbon / the print head is open / could not be reached.** | The printer reported that state (codes `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `PRINTER_UNREACHABLE`). | Fix the printer, then retry the label. A label is never retried by itself, so it cannot print twice. | [Print Queue](#screen-audit-interfaces) |
| **...did not print: <printer> rejected the label layout** or **its barcode failed GS1 validation. This is a PathScribe problem; please report it.** | The label's content was refused (`MALFORMED_ZPL`, `INVALID_GS1`). Retrying cannot help. | Report it to ForMedrixAI support with the time and the label's layout. | [Label Designer](#screen-label_designer) |
| A report print job is **Failed** with "Network printing needs the PathScribe site agent." | A report was sent to a network printer from a browser, which cannot reach it (`NEEDS_SITE_AGENT`). | Route the lab's printing through a site agent printer. | [Site agents](#screen-site_agents), [Print Destination Routing Rules](#screen-print_routing_rules) |
| Printing "works" but nothing comes out in the demonstration. | The demonstration records prints instead of sending them. | Read the simulated print log. | [Simulated print log](#screen-simulated_print) |

### Interface messages that are stuck {#ch9-matrix-interfaces}

| Symptom | Likely cause | Fix | Screen |
|---|---|---|---|
| A message shows in **Outbound Interface DLQ** with Error **Dispatch rejected**, **Dispatch timeout** or **Engine unreachable**. | The interface engine did not return a 2xx (`DISPATCH_REJECTED`, `DISPATCH_TIMEOUT`, `DISPATCH_UNREACHABLE`). The message is kept for retry. | Check the engine in the **Engines** sub-tab. When it is healthy, choose **Retry Dispatch** (needs `interface:outbound:resend`). | [System Logs: interfaces](#screen-audit-interfaces) |
| Retry answers **Held on the Outbound Queue screen: release it there first.** | The message is on hold in the Outbound Queue. | Release it on that screen, then resend. | [System Logs: interfaces](#screen-audit-interfaces) |
| Retry answers **Held: the report PDF isn't available yet.** | The report document is not rendered yet. | Wait. It is sent with the PDF on a later retry. | [System Logs: interfaces](#screen-audit-interfaces) |
| A charge is in the **Outbound DLQ** (financial) with **Missing ICD-10 code** or **Missing provider NPI**. | The charge cannot be built without the code or the NPI (`MISSING_ICD10`, `MISSING_PROVIDER_NPI`). | Enter the value on the row; the row has an input for each. | [System Logs: financial](#screen-audit-financial) |
| A job in **Server jobs** cannot be requeued: **Resend this job from Interfaces.** | Interface and print jobs are resent from their own screens (`WRONG_SCREEN`). | Use the interface or print queue, with `interface:outbound:resend` or `print:job:retry`. | [System Logs: interfaces](#screen-audit-interfaces) |
| A requeue answers **This job is no longer failed; it may already have been requeued.** | Someone already requeued it (`NOT_DEAD_LETTERED`). | Refresh. No action. | [System Logs](#screen-audit-log) |
| Pending interface exceptions (a count badge on the **Interface Log** tab). | Inbound messages that could not be bound to a patient or case wait for a person. | Open the **Interface Exceptions** sub-tab and review each. | [System Logs: interfaces](#screen-audit-interfaces) |

### Sign-in fails {#ch9-matrix-signin}

| Symptom | Likely cause | Fix | Screen |
|---|---|---|---|
| **Incorrect email or password**, then **One more failed attempt will lock sign-in for this email for 15 minutes.** | Password sign-in locks an email after 5 failed attempts in a row, for 15 minutes. The count is per email typed, whether or not the email belongs to an account. | Wait 15 minutes, or set a new password for the person: setting a password clears the lock. The audit log holds **Sign-in failed**, **Sign-in locked** and **Sign-in refused**. | [Members](#screen-staff-members) |
| **If that email belongs to an active account, your administrators have been told...** | The person selected **Ask my administrator to reset my password** on the sign-in screen (password sign-in only). They get this message whether or not the email has an account. | Open the urgent message "Password reset requested", follow its link to the Staff record and set a temporary password. The person must choose their own at next sign-in. Setting it marks the request handled. | [Members](#screen-staff-members) |
| Single sign-on: **You signed in, but there is no active PathScribe account for you.** | No staff record matches (`not_provisioned`). | Add the person as a member. The first single sign-on links by email. | [Members](#screen-staff-members) |
| Single sign-on: **Your PathScribe account is inactive.** | The staff record is inactive. | Reactivate it. | [Members](#screen-staff-members) |
| Single sign-on: **More than one PathScribe account matches this sign-in.** | Two staff records share the email (`ambiguous`). | Remove the duplicate. | [Members](#screen-staff-members) |
| Single sign-on: **This PathScribe account is already linked to a different sign-in account.** | A reassigned mailbox: the record is linked to another identity at the same provider (`already_linked`). | Unlink the old account on the person's record, then sign in again. | [Members](#screen-staff-members) |
| Single sign-on: **Your PathScribe account doesn't include access to this application.** | The person's roles carry neither case access nor configuration access (`no_app_access`). | Give the person a role with access. | [Roles](#screen-staff-roles) |
| Single sign-on: **Your organisation requires a second factor, and the sign-in service did not report one.** | The identity provider did not report a second factor (`mfa_required`). | Complete the second factor at the identity provider. | [Session Security](#screen-session_security) |
| **Sign-in isn't set up for this installation. Contact your system administrator.** | The build has no sign-in configured. | Correct `config.json` (see the start-up codes below). | [Start-up configuration codes](#ch9-codes-config) |
| A full-page **PathScribe can't start: its configuration needs fixing** with a list of codes. | `config.json` has a setting the product refuses. PathScribe will not start with the wrong settings. | Correct `config.json` on the web server and reload. Each code is in the index. | [Start-up configuration codes](#ch9-codes-config) |
| Second-factor codes: **That code was already used. Wait for the next one.** or **Too many attempts. Second-factor codes are locked until <time>.** | The code was replayed, or too many wrong codes were entered. | Wait for the next code, or until the lock time. | [Session Security](#screen-session_security) |
| **This account is already signed in on another tab or window on this browser.** | PathScribe allows one live session per account per browser. | Continue to sign the other session out (its unsaved work is kept and offered for review). | [Session Security](#screen-session_security) |

### An interface message or screen looks stuck {#ch9-matrix-stuck}

| Symptom | Likely cause | Fix | Screen |
|---|---|---|---|
| A screen says **The PathScribe server can't be reached. Try again in a moment.** | The browser could not reach the API server, or it answered with a server error (`UNAVAILABLE`), or did not answer within 30 seconds (`TIMED_OUT`). | Check the network path and the API server's health. The screen retries where it says so (for example the engines panel every minute). | [System Logs](#screen-audit-log) |
| **Your session has ended. Sign in again.** | The server returned 401 (`SIGNED_OUT`). | Sign in again. | [Session Security](#screen-session_security) |
| **This was already done. Refresh and look again.** or a save that reports a conflict. | Someone else changed the same record (`CONFLICT`). | Refresh the screen and apply the change again. | [System Logs](#screen-audit-log) |
| An export stays **Preparing**, or ends **The export took too long and was stopped.** | A build is stopped after 30 minutes (`TIMED_OUT`). | Narrow the filters and export again. | [My exports](#screen-my-exports) |
| **You already have 3 exports being prepared.** | One user may have 3 open exports (`TOO_MANY_OPEN`). | Wait for one to finish, or cancel one. | [My exports](#screen-my-exports) |

## System error code index {#ch9-error-codes}
Breadcrumb: Home > Administrator Guide > Appendices > System error code index

**Status:** Built

**What this index covers.** The upper-case codes in the source that an administrator can see on a screen, read in the Error Log or find in a contract. Each row gives the screen it appears on, what it means and what to do. The contract named in the second column is in `docs/architecture/`; where no contract lists a code, the row names the service file instead.

**How codes reach a screen.** The API client gives every failed call a short fixed code and never uses the server's message text, because that text could name a patient. A server code is used when it is upper-case letters, digits and underscores, from 2 to 40 characters, starting with a letter. Otherwise the code comes from the HTTP status.

| Status | Code |
|---|---|
| 401 | `SIGNED_OUT` |
| 403 | `NOT_PERMITTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 400, 422 | `INVALID` |
| 429 | `TOO_MANY_REQUESTS` |
| anything else | `UNAVAILABLE` |

Lower-case reasons also exist (for example the sign-in reasons `not_provisioned` and `inactive`, and the server's `capability_refused`, `support_access_disabled` and `support_access_not_approved`). They are not upper-case codes, so they are in the matrix above and in the [Support Access](#screen-support_access) screen, not in this index.

### Codes any server-backed screen can show {#ch9-codes-http}

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `SIGNED_OUT` | Any screen that calls the API server. Contract: `HTTP_SERVICES_PATTERN.md` section 4; `src/services/apiServer/apiHttpClient.ts`. | The server answered 401: the sign-in has ended or the token was not accepted. | Sign in again. If it returns straight after signing in, tell ForMedrixAI support. |
| `NOT_PERMITTED` | Any server-backed screen. Contract: `HTTP_SERVICES_PATTERN.md`; `AUTHORIZATION_API.md`. | The server answered 403: the capability is missing, or is outside the person's facilities. | See the matrix rows on greyed-out buttons. Search [System Logs](#screen-audit-log) for **Capability refused**. |
| `NOT_FOUND` | Any server-backed screen. Contract: `HTTP_SERVICES_PATTERN.md`. | The record no longer exists, for example deleted or retired by someone else. | Refresh and open it again. |
| `CONFLICT` | Any screen with a versioned save. Contract: `HTTP_SERVICES_PATTERN.md` (versioned saves). | The server answered 409: the record changed since it was read. For a case, the server also returns the version it holds. | Refresh and apply the change again. |
| `INVALID` | Any server-backed save. Contract: `HTTP_SERVICES_PATTERN.md`. | The server answered 400 or 422: it refused the values. | Check the entries on the form and save again. |
| `TOO_MANY_REQUESTS` | Any server-backed screen. Contract: `HTTP_SERVICES_PATTERN.md`; `STAFF_ADMIN_API.md`. | The server answered 429: a rate limit was reached. | Wait a moment and try again. Repeated cases go to ForMedrixAI support. |
| `TIMED_OUT` | Any server-backed screen; the exports list. Contract: `HTTP_SERVICES_PATTERN.md`; `ASYNC_EXPORT_API.md` section 4. | The call had no answer within 30 seconds (the client's default). For an export build, the build was stopped after 30 minutes. | Retry. For an export, narrow the filters. |
| `UNAVAILABLE` | Any server-backed screen, for example the workstation list, the site agents list, the engines panel and Server jobs. Contract: `HTTP_SERVICES_PATTERN.md`. | The server could not be reached, answered with any other status, or sent a reply that was not a JSON object. | Check the network and the API server. Retry. |
| `NOT_SUPPORTED` | A demonstration-only action on a server deployment. Contract: `HTTP_SERVICES_PATTERN.md`; `src/services/apiServer/httpServiceExtras.ts`. | The method exists only for the demonstration (seeding demo data). The server version makes no call. | Nothing. Expected on a server deployment. |

### Permission and approval refusals {#ch9-codes-permission}

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `CONFIG_NOT_PERMITTED` | Every Configuration save. Contract: `AUTHORIZATION_API.md`; `src/services/authorization/guardConfigWrites.ts`. | The person's roles lack the capability for that screen, so nothing was saved. The Configuration page shows the capability name. | Grant the capability on [Roles](#screen-staff-roles). |
| `EXPORT_NOT_PERMITTED` | Case search export and case report export. Contract: `CASE_SEARCH_API.md`; `AUTHORIZATION_API.md` (exports). | The export capability (`search:case-results:export` or `search:case-report:export`) is missing. No rows are returned. | Grant the capability. |
| `SEPARATION_OF_DUTIES` | Role save and staff save. Contract: `AUTHORIZATION_API.md` (separation of duties). | One role or one person would hold both `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve`. | Hold the two capabilities in separate roles with different people. |
| `SELF_APPROVAL` | AI instructions. Contract: `AUTHORIZATION_API.md`; [AI Instructions](#screen-ai_instructions). | The person edited the pending text, so cannot approve it. | Have another holder of `config:ai-prompt:approve` approve it. |
| `AI_VENDOR_NOT_ALLOWED` | Any AI feature. Contract: `AI_PROXY.md`; `src/services/aiIntegration/aiCallPolicy.ts`. | The AI vendor policy refuses the service or region for the jurisdiction. The call is not made and is audited as `AI_CALL_REFUSED`. The feature carries on without AI and says "AI is not available for this jurisdiction." | Change the rule or the hosting region on the [AI Behavior](#screen-tab-ai) tab, if the lab's policy allows it. |

### Exports {#ch9-codes-exports}

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `INVALID_PARAMETERS` | [My exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md` section 3. | The server could not use the filters. | Change the filters and export again. |
| `TOO_MANY_ROWS` | [My exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md`. | More than 1,000,000 rows matched. | Narrow the filters. |
| `TOO_MANY_OPEN` | [My exports](#screen-my-exports). Contract: `ASYNC_EXPORT_API.md`. | The person already has 3 exports queued or running. | Wait, or cancel one. |
| `BUILD_FAILED` | [My exports](#screen-my-exports). Source: `src/services/exports/asyncExportContract.ts`. | The server could not make the file. A build gets 2 attempts. | Try again. If it fails again, tell ForMedrixAI support. |
| `CANCELLED` | [My exports](#screen-my-exports). Source: `src/i18n/locales/en.json` (`exports.problem`). | The export was cancelled. | Export again if it is still needed. |
| `EXPIRED` | [My exports](#screen-my-exports); the site agent. Contract: `ASYNC_EXPORT_API.md`; `SITE_AGENT_API.md` section 6. | For an export: the file was deleted after its keeping period (7 days by default, 1 to 30 set by the lab). For a site agent job: it was not started in time and was returned. | Export again. For a job, see the print rows below. |

### Start-up configuration {#ch9-codes-config}

These appear on the full-page **PathScribe can't start: its configuration needs fixing** screen. PathScribe will not start until they are corrected. The settings and the rules are in `RUNTIME_CONFIG.md` section 3. The code is `src/services/runtimeConfig/runtimeSettings.ts`.

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `UNREADABLE` | Start-up screen. | `config.json` is not valid JSON. | Correct the file. |
| `NOT_AN_OBJECT` | Start-up screen. | `config.json` must be a list of settings and values (a JSON object). | Correct the file. |
| `UNKNOWN_SETTING` | Start-up screen. | The name is not one of the settings PathScribe knows, or is a build-only name. | Check the spelling against `RUNTIME_CONFIG.md`. |
| `NOT_TEXT` | Start-up screen. | A value must be text, a number, or true or false. | Correct the value. |
| `TOO_LONG` | Start-up screen. | A value is longer than 2,000 characters. | Shorten it. |
| `INVALID_URL` | Start-up screen. | The value must be a web address, or a path on this site starting with `/`, with no user name or password in it. | Correct the address. |
| `NOT_HTTPS` | Start-up screen. | An address must use https. Plain http is allowed only to this computer in a development build. | Use an https address. |
| `NOT_THIS_SITE` | Start-up screen. | A proxy path leads to another site (for example `//host`). | Use a path on this site, or an https address. |
| `API_SERVER_REQUIRED` | Start-up screen. | A server build needs the address of the PathScribe server and none is set. | Set the API address. |
| `SSO_REQUIRED` | Start-up screen. | A server build signs in through the identity provider only, so `VITE_AUTH_MODE` must be `sso`. | Set it and the provider's settings. |
| `API_SERVER_IN_DEMO_BUILD` | Start-up screen. | A demonstration build never talks to a real server. | Install a server build. |
| `NOT_IN_DEMO_BUILD` | Start-up screen. | A demonstration build cannot use a hub, renderer, interface receiver or server-job setting, and is never production. | Install a server build. |
| `ADDRESS_NOT_FROM_SERVER` | Start-up screen, marked "from the PathScribe server's /api/config". | The server may not set an address, because the site's security policy is made from `config.json`. | Put the address in `config.json`. |
| `NOT_FROM_SERVER` | Start-up screen, marked "from the PathScribe server's /api/config". | Only `config.json` or the build may set this setting (sign-in, the instance role, which jobs the server runs). | Move the setting to `config.json`. |

### Printing, labels and the site agent {#ch9-codes-print}

The first six codes have their own message text. The contract for the agent's codes is `SITE_AGENT_API.md` section 6; the list is `AGENT_ERROR_CODES` in `src/services/siteAgent/siteAgentContract.ts`. Report prints are retried on the lab's delivery schedule (1, 5 and 15 minutes by default, up to 10 retries). Labels are never retried by themselves.

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `PRINTER_UNREACHABLE` | Label toast; Print Queue. Contract: `SITE_AGENT_API.md`. | No connection to the printer. Retried for reports. | Check the printer's power and network, then retry. |
| `PAPER_OUT` | Label toast; Print Queue. Contract: `SITE_AGENT_API.md`. | The label printer is out of labels. | Load labels and retry. |
| `RIBBON_OUT` | Label toast; Print Queue. Contract: `SITE_AGENT_API.md`. | The label printer is out of ribbon. | Load a ribbon and retry. |
| `HEAD_OPEN` | Label toast; Print Queue. Contract: `SITE_AGENT_API.md`. | The print head is open. | Close it and retry. |
| `MALFORMED_ZPL` | Label toast. Contract: `SITE_AGENT_API.md`. | The printer rejected the label layout. Not retried. | Report to ForMedrixAI support. |
| `INVALID_GS1` | Label toast. Contract: `SITE_AGENT_API.md`. | The label's barcode failed GS1 validation. Not retried. | Report to ForMedrixAI support. Check the GTIN in [Print Settings](#screen-print_settings). |
| `NEEDS_SITE_AGENT` | [Print Queue](#screen-audit-interfaces). Contract: `SITE_AGENT_API.md`; `src/services/printing/printJobFailureReason.ts`. | A browser cannot send to a network printer. The job fails at once and goes to the exception queue. | Use a site agent printer. See [Site agents](#screen-site_agents). |
| `PRINTER_OFFLINE` | [Print Queue](#screen-audit-interfaces). Source: `src/services/printing/attemptPrintDelivery.ts`. | QZ Tray is not connected on the print computer. Retried. | Start QZ Tray. |
| `PRINT_REJECTED` | [Print Queue](#screen-audit-interfaces). Source: `attemptPrintDelivery.ts`, `redispatchPrintJob.ts`. | A job cannot be printed, for example no printer is configured for QZ Tray delivery, or the report document could not be made. | Fix the printer settings, then retry. |
| `PRINTER_REJECTED` | Print Queue. Contract: `SITE_AGENT_API.md`. | The printer refused the job. Not retried. | Check the printer's own error display. |
| `DOCUMENT_UNAVAILABLE` | Print Queue. Contract: `SITE_AGENT_API.md`. | The agent's download link failed or expired. Retried. | None at first. If it persists, tell ForMedrixAI support. |
| `DOCUMENT_INTEGRITY` | Print Queue. Contract: `SITE_AGENT_API.md`. | The file's SHA-256 did not match, so it was never printed. Not retried. | Tell ForMedrixAI support. |
| `UNKNOWN_DESTINATION` | Print Queue; file drop. Contract: `SITE_AGENT_API.md`. | The agent has no printer or share with that id (its configuration is out of date). | Update the agent's printer list on [Site agents](#screen-site_agents). |
| `SHARE_UNREACHABLE` | File drop delivery. Contract: `SITE_AGENT_API.md`. | The share could not be reached. Retried. | Check the share. |
| `SHARE_ACCESS_DENIED` | File drop delivery. Contract: `SITE_AGENT_API.md`. | The agent may not write to the share. Not retried. | Fix the share's permissions. |
| `SHARE_FULL` | File drop delivery. Contract: `SITE_AGENT_API.md`. | The share is full. Retried. | Free space. |
| `IN_DOUBT` | Print Queue. Contract: `SITE_AGENT_API.md`. | The agent stopped after it began sending and before it knew the result. It is never resent by itself. | Check the printer. Reprint if the page is not there. |
| `AGENT_ERROR` | Print Queue. Contract: `SITE_AGENT_API.md`. | Any other agent failure. Retried. | Check the agent on [Site agents](#screen-site_agents). |

### Outbound messages, charges, registries and server jobs {#ch9-codes-outbound}

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `DISPATCH_REJECTED` | [System Logs: interfaces](#screen-audit-interfaces) (shown as "Dispatch rejected"). Contract: `INTERFACE_TRANSACTIONS.md`. | The engine did not return a 2xx. The message is kept for retry. | Check the engine, then **Retry Dispatch**. |
| `DISPATCH_TIMEOUT` | [System Logs: interfaces](#screen-audit-interfaces) (shown as "Dispatch timeout"). Contract: `OUTBOUND_QUEUE_API.md`; `INTERFACE_TRANSACTIONS.md`. | The engine did not answer in time. | As above. |
| `DISPATCH_UNREACHABLE` | [System Logs: interfaces](#screen-audit-interfaces) (shown as "Engine unreachable"). Contract: `INTERFACE_TRANSACTIONS.md`. | The engine could not be reached. | As above. |
| `MISSING_ICD10` | [System Logs: financial](#screen-audit-financial). Contract: `DIAGNOSIS_CODING.md`; `src/services/billing/validateChargeMetadata.ts`. | A charge has no ICD-10 code. | Enter the code on the row. |
| `MISSING_PROVIDER_NPI` | [System Logs: financial](#screen-audit-financial). Source: `validateChargeMetadata.ts`. | A charge has no provider NPI. | Enter the NPI on the row. |
| `REGISTRY_NOT_READY` | Outbound Queue; Registry Exceptions. Contract: `BATCH_REGISTRY_FEED_API.md`; `REGISTRY_ACKNOWLEDGEMENT_API.md`. | A registry submission is held: a required field or setting is missing. | Complete the missing item named on the entry. |
| `REGISTRY_LIVE_NOT_APPROVED` | Outbound Queue; Registry Exceptions. Contract: `REGISTRY_GO_LIVE_API.md`. | A real case was signed out but the registry connection is not approved live. The entry shows "Held: attestation required". | Complete go-live approval on the registry settings screen. |
| `NOT_DEAD_LETTERED` | Server jobs. Contract: `MESSAGE_BUS_API.md`. | The job is no longer failed (409). | Refresh. |
| `WRONG_SCREEN` | Server jobs. Source: `src/services/serverJobs/serverJobsContract.ts`. | Interface and print jobs are not requeued here. | Resend from the interface or print queue. |
| `CONSULT_LINK_NOT_ACTIVE` | Consult links tab. Contract: `CONSULT_ACCESS_API.md`. | The link is already revoked or expired. | Refresh. |
| `NO_RECIPIENTS` | Report schedules. Contract: `SCHEDULED_REPORTS_API.md`. | No active recipient is left. | Choose at least one recipient. |
| `TOO_MANY_SCHEDULES` | Report schedules. Contract: `SCHEDULED_REPORTS_API.md`. | The person has the most schedules allowed. | Delete or merge a schedule. |
| `RECIPIENT_ACCESS_UNKNOWN` | Report schedules. Contract: `SCHEDULED_REPORTS_API.md`. | What a recipient may see could not be worked out, so nothing was built. | Check the recipient's roles and facilities. |
| `RUN_FAILED` | Report schedules. Source: `src/services/scheduledReports/createScheduledReportService.ts`. | A scheduled run failed. | Look in the Error Log. |

### Configuration screens: refusals worth knowing {#ch9-codes-config-screens}

| Error Code | Where it appears | Meaning | What to do |
|---|---|---|---|
| `REASON_REQUIRED` | [Code Import](#screen-code_import), workstation and feed revocations, and several case actions. Source: the service for each screen. | A reason is required for the change. | Enter a reason. |
| `BAD_DATE` | [Code Systems](#screen-code_systems). Source: `src/services/coding/codeSystemPolicyRules.ts`. | A date is not a real calendar date. | Correct it. |
| `BAD_ROLE` | [Code Systems](#screen-code_systems). Source: `codeSystemPolicyRules.ts`. | A role in a rule is not valid. | Choose a valid role. |
| `BAD_SYSTEM` | [Code Systems](#screen-code_systems). Source: `codeSystemPolicyRules.ts`. | A code system is blank or not valid. | Choose a code system. |
| `DUPLICATE` | [Code Systems](#screen-code_systems). Source: `codeSystemPolicyRules.ts`. | The same code system has two rows with the same start date. | Remove or re-date one row. |
| `NO_RULES` | [Code Systems](#screen-code_systems). Source: `codeSystemPolicyRules.ts`. | There are no rules. | Add a rule, or reset to the default. |
| `TOO_MANY` | [Code Systems](#screen-code_systems). Source: `codeSystemPolicyRules.ts`. | There are too many rules. | Remove some. |
| `SAME_PERSON` | [Code Import](#screen-code_import). Source: `src/services/billing/codeEngine/planImportJob.ts`. | The person who uploaded the import cannot approve or reject it (four-eyes principle). | A different person must decide. |
| `JOB_NOT_APPROVED` | [Code Import](#screen-code_import). Source: `planImportJob.ts`. | Only an approved import can be rolled back. | None. |
| `JOB_NOT_PENDING` | [Code Import](#screen-code_import). Source: `planImportJob.ts`. | The import is no longer pending approval. | Refresh. |
| `MAPPING_INCOMPLETE` | [Code Import](#screen-code_import). Source: `src/services/billing/mockCodeImportService.ts`. | The billing code, CPT code and effective date columns are not all matched. | Match them, or give one effective date for the whole file. |
| `NO_ROWS` | [Code Import](#screen-code_import). Source: `mockCodeImportService.ts`. | The file has no rows that can be imported. | Check the file. |
| `ROWS_REFUSED` | [Code Import](#screen-code_import). Source: `mockCodeImportService.ts`. | Some rows cannot be imported. | Fix them, or choose to skip them. |
| `ROW_MISSING` | [Code Import](#screen-code_import). Source: `mockCodeImportService.ts`. | A code version from the import no longer exists, so it cannot be approved. | Upload the import again. |
| `ROW_NOT_PENDING` | [Code Import](#screen-code_import). Source: `mockCodeImportService.ts`. | A code version from the import is no longer pending. | Upload the import again. |
| `NAME_TAKEN` | [Workstations](#screen-workstations), [Reporting feed](#screen-bi_feed). Source: `src/services/workstationRegistry/workstationRegistryRules.ts`; `src/services/biFeed/biFeedRules.ts`. | Another active workstation at the facility has that name. | Choose another name. |
| `ALREADY_REVOKED` | [Workstations](#screen-workstations), [Reporting feed](#screen-bi_feed). Source: the same two services. | The workstation is already revoked. | None. |
| `REVOKE_REASON_INVALID` | [Workstations](#screen-workstations), [Reporting feed](#screen-bi_feed). Source: the same two services. | A reason must be chosen, with a note for Other. | Choose a reason. |
| `FEED_OFF` | [Reporting feed](#screen-bi_feed). Source: `src/services/biFeed/biFeedRules.ts`. | The feed is switched off. | Switch it on in the feed settings. |
| `DATASET_NOT_IN_FEED` | [Reporting feed](#screen-bi_feed). Source: `biFeedRules.ts`. | A dataset is not offered by the feed. | Add it to the feed settings first. |
| `FACILITY_NOT_IN_FEED` | [Reporting feed](#screen-bi_feed). Source: `biFeedRules.ts`. | A facility is not offered by the feed. | Add it to the feed settings first. |
| `IDENTIFIED_NOT_APPROVED` | [Reporting feed](#screen-bi_feed). Source: `biFeedRules.ts`. | Identified tokens need an approval on record. | Record the approval. |
| `NOT_HL7` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `src/services/lisIngestion/adapters/hl7v2StatusAdapter.ts`. | The message is not an HL7 v2 message (it must start with an MSH segment). | Check the sending system. |
| `UNSUPPORTED_MESSAGE_TYPE` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `hl7v2StatusAdapter.ts`. | Only ORU^R01, ORM^O01 and OML^O21 messages are accepted. | Send a supported type. |
| `MISSING_ACCESSION` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `hl7v2StatusAdapter.ts`, `webhookJsonAdapter.ts`. | The message has no accession number. | Correct the sender. |
| `MISSING_STATUS` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `src/services/lisIngestion/types.ts`. | The message has no LIS status. | Correct the sender. |
| `INVALID_JSON` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `types.ts`. | The message is not valid JSON. | Correct the sender. |
| `CROSSWALK_DUPLICATE_STATUS` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `src/services/assistPolling/mockAssistPollingService.ts`. | An LIS status is mapped twice. | Map each status once. |
| `INTERVAL_OUT_OF_RANGE` | [Assist LIS Ingestion](#screen-assist_lis_polling). Source: `mockAssistPollingService.ts`. | The polling interval is outside the allowed whole minutes. | Enter a value in the range shown. |
| `NHS_NUMBER_CHECK_DIGIT` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | The NHS number fails its check digit. | Correct the number on the case. |
| `NHS_NUMBER_FORMAT` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | The NHS number is not ten digits. | Correct it. |
| `PATIENT_IDENTIFIER_MISSING` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | The NHS number is missing. | Enter it. |
| `ICDO_MISSING` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | There is no ICD-O-3 code. | Add it to the case. |
| `ICDO_FORMAT` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | An ICD-O-3 code is not in the form `8500/3`. | Correct it. |
| `DIAGNOSIS_DATE_MISSING` | [UK Cancer Registry (COSD)](#screen-cosd_destination). Contract: `UK_COSD_API.md`. | The diagnosis date is missing. | Enter it. |
| `XML_NOT_WELL_FORMED` | [UK Cancer Registry (COSD)](#screen-cosd_destination); protocol upload. Contract: `UK_COSD_API.md`; source: `protocolUploadValidation.ts`. | The preview, or the uploaded file, is not well-formed XML. | Correct the data or the file. |
| `UNSUPPORTED_FORMAT` | Synoptic Library protocol upload ([Synoptic Library](#screen-tab-protocols)). Source: `src/services/templates/protocolUploadValidation.ts`. | The file type is not supported. Use JSON, XML or XLSX. | Convert the file. |
| `FILE_TOO_LARGE` | Protocol upload. Source: `protocolUploadValidation.ts`. | The file is larger than 10 MB. | Reduce it. |
| `JSON_INVALID` | Protocol upload. Source: `protocolUploadValidation.ts`. | The file is not valid JSON. | Correct it. |
| `JSON_NEWER_FORMAT` | Protocol upload. Source: `protocolUploadValidation.ts`. | The file was exported by a newer version of PathScribe. | Update PathScribe, or export from the same version. |
| `XML_NOT_SDC` | Protocol upload. Source: `protocolUploadValidation.ts`. | The XML is not a CAP eCC (SDC) form. | Use the right file. |
| `NOT_IMPORTABLE` | Protocol upload. Source: `protocolUploadValidation.ts`. | The format can be checked but not imported yet. Import works for PathScribe protocol files (JSON). | Use a PathScribe JSON file. |
| `XLSX_NOT_MAPPED` | Protocol upload. Source: `protocolUploadValidation.ts`. | The workbook's sheets were not read, so columns were not matched to questions. | Use a supported format. |
| `PRODUCTION_GATED` | [Smart Capture](#screen-smart_capture). Source: `src/services/smartCapture/smartCaptureStates.ts`. | A real interface engine is configured and the production gate is closed, so nothing was sent. | Open the production gate when the lab is ready. |
| `ALREADY_ACCESSIONED` | [Lockbox Drop-Off](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | The receipt is already accessioned (409). | None. |
| `PLACEHOLDER_UNRESOLVED` | [Lockbox Drop-Off](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | Accession was asked for a placeholder with no linked order number (409). | Link the placeholder to its order first. |
| `NOT_A_PLACEHOLDER` | [Lockbox Drop-Off](#screen-lockbox-drop-off). Contract: `LOCKBOX_API.md`. | Only a placeholder can be linked to an order. | None. |

## System Logs reference {#ch9-system-logs}
Breadcrumb: Home > Administrator Guide > Appendices > System Logs reference

**Status:** Built

System Logs is where the record of what people, the system and the AI did is read. This part documents the screen. The next part ([Audit log verification guide](#ch9-audit-verification)) says how to use it to answer an auditor's questions.

### System Logs {#screen-audit-log}
Breadcrumb: Home > System Logs

**Status:** Built. The audit log is held in the browser in the demonstration; with an API server it is held by the server (see Known limits).

**1. Navigation:** Home tile **System Logs** (address `/audit`).
**2. Maintenance item:** System Logs (a reference screen; nothing is set up here).

**3. Business purpose and scope.** One screen for the compliance record of the lab: AI actions, user changes, system events, errors, quality-assurance activity, interface and print activity, financial dispatch failures, critical alerts, outside consult links and the background jobs of the API server. It is read-only apart from three actions: marking an error **Resolve**d, resending a failed interface message or print job, and revoking a consult link. Each tab is a different record kept by a different service. The Audit Log and Error Log tabs are documented here. The **Interface Log** tab is documented in [System Logs: interfaces](#screen-audit-interfaces) and the **Financial** tab in [System Logs: financial](#screen-audit-financial).

**4. Prerequisites and dependencies.** The screen shows only what has happened, so there is nothing to configure first except who may open it. A person who lacks `screen:audit-log:open` sees no Home tile and, if they type the address, the message "You don't have access to this screen".

Setup step: Reference, not part of setup
Requires: [Roles](#screen-staff-roles), [Members](#screen-staff-members)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-audit-log - System Logs, Audit Log tab with type pills, filters and Export CSV]

The page header reads **System Logs** with the subtitle "Complete record of AI actions, user changes, system events, errors, and quality assurance activity". A tab strip follows, then a **Find a support reference** box, then the active tab. A count badge on **Error Log** shows open errors, on **Interface Log** the pending interface exceptions and on **Quality Assurance** the open quality items. A person whose role is Pathologist sees the notice "Showing your case activity only — validation study events are not visible to pathologists".

[SCREENSHOT PLACEHOLDER: screen-audit-log-errors - System Logs, Error Log tab]

**6. Field reference.** The screen has filters, columns and buttons rather than form fields. Row names start with the tab.

#### Tabs

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Tab: Audit Log | Tab | Not applicable | Every audit entry the person may see. Documented below. | Selected on opening |
| Tab: Error Log | Tab | Not applicable | Errors the system recorded, with a code. Documented below. | Not applicable |
| Tab: Interface Log | Tab with sub-tabs Interface Exceptions, Outbound Interface DLQ, Outbound Dispatches, Print Queue, Engines | Not applicable | See [System Logs: interfaces](#screen-audit-interfaces). The address `?tab=interfaces` opens it. | Not applicable |
| Tab: Quality Assurance | Tab with a Group choice | Not applicable | Eight groups of quality records: Deficiencies, Intraoperative Linkage, Discordance & Reconciliation, Countersign Turnaround, Credentialing Review, Post-Finalization Drift, Patient Match Review and Management Reviews. Each group has its own Status choices. | Not applicable |
| Tab: Financial | Tab with sub-tabs Billing Logs and Outbound DLQ | Not applicable | See [System Logs: financial](#screen-audit-financial). | Not applicable |
| Tab: Critical Alerts | Tab | Not applicable | The record of critical-result alerts. | Not applicable |
| Tab: Consult links | Tab | Not applicable | Every outside consult link on every case, with **Active only** and **Revoke**. Shown to people with `audit:consult-links:view`. | Not applicable |

**What an outside consultant sees (Batches 669h and 669i).** The consult page shows the patient's initials and birth year only (for example J*** S****, **/**/1980) unless the person issuing the link ticks **Show the patient's full name and date of birth to the consultant** (off by default; Pathologists and Laboratory Directors may tick it, with `case:consult-link:reveal-identity`). After the consultant signs an opinion the link stays open for at most 3 further views and 48 hours, whichever ends first and never past the link's own expiry; the page tells them how many remain. A Lab Director who may see identities but not issue links can use **Preview identity** in the Audit Log. New audit events: `consult.link.access_attempt_exhausted` and `consult.link.identity_previewed`. Dates of birth on this page are always written DD-MMM-YYYY. **Known limits:** built in the browser only; the API server must keep the count and clock (CA-28 to CA-30), links still open only in the browser that issued them, there is no passcode check, and a page reload counts as a view.
| Tab: Server jobs | Tab | Not applicable | The API server's background jobs: health and dead letters, with requeue. Only shown to people with `jobs:server-job:view`. A link opened without that capability lands on Audit Log. | Hidden without the capability |
| Find a support reference | Text, form `SR-XXXX-XXXX` | Optional | Names the case, audit entry, error entry or interface exception a support reference points to. A lookup is itself audited (`support_reference.resolved`). If the entry is outside the loaded range it says to widen the date range. | Blank |

#### Audit Log tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Audit Log: Type pills | Choice: All, AI, User, System, with counts | Optional | Filters by the entry's type. | All |
| Audit Log: Patient Management Only | Yes/No checkbox with count | Optional | Shows only events whose name begins `mpi.` (merge, move, link, rebind, demographic update). Combines with the other filters. A future `mpi.` event is included automatically. | No |
| Audit Log: User filter | Choice of every user in the loaded entries | Optional | Shown only in a Superadmin session. Everyone else finds a person by typing the name in the search box. | All Users |
| Audit Log: Date range | Choice: Today, Last 7 Days, Last 30 Days, Last 90 Days, Custom Range | Optional | Cut-off in the facility's time zone. Custom Range adds a **from** and **to** date; the end date includes the whole day. | Last 7 Days |
| Audit Log: Search | Text | Optional | Matches the event name, the detail text, the user and the case id (accession number), ignoring case. | Blank |
| Audit Log: Export CSV | Button | Not applicable | Needs `audit:audit-log:export`. See the verification guide. Greyed out without it. | Not applicable |
| Audit Log: Timestamp | Column, `YYYY-MM-DD HH:MM:SS.mmm UTC` | Not applicable | When the entry was written, always shown in UTC. | Not applicable |
| Audit Log: Type | Column | Not applicable | AI, User or System. | Not applicable |
| Audit Log: Event | Column | Not applicable | The event name, followed by a support-reference chip. | Not applicable |
| Audit Log: Detail | Column | Not applicable | English text, free of patient names, dates of birth, MRNs and clinical values. | Not applicable |
| Audit Log: User | Column | Not applicable | The display name of the person or system actor. Automatic actions show a system actor such as `SYSTEM`. | Not applicable |
| Audit Log: Case | Column | Not applicable | The accession number when the entry concerns a case. Click it to open the case. | Not applicable |

The entry also holds a confidence value (for AI entries), a facility id and a scan station id. They are stored and are in the server contract, but the screen shows no column for them and the CSV does not include the facility or station. The facility id is absent on entries recorded before it existed or by code that does not supply it.

#### Error Log tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Error Log: Severity pills | Choice: All, Error, Warning, Info, with counts | Optional | Filters by severity. | All |
| Error Log: Status | Choice: All Status, Open Only, Resolved Only | Optional | Filters by resolution. | All Status |
| Error Log: Search | Text | Optional | Matches message, code and source. | Blank |
| Error Log: Resolve | Button on each open row | Not applicable | Needs `audit:error:resolve`. Records who resolved it and when; the row then shows "Resolved by <name>, <time>". | Not applicable |
| Error Log: Export CSV | Button | Not applicable | Needs `audit:error-log:export`. | Not applicable |
| Error Log: columns | Timestamp, Severity, Code, Message, Source, Case, Status | Not applicable | The Code column holds the codes in the [index](#ch9-error-codes). | Not applicable |

**7. Permissions.**
- Open the screen: `screen:audit-log:open`. Admin, Lab Director and QA Reviewer hold it by default. The Pathologist role does not, by default.
- Export: one capability per log, each high risk, each requiring `screen:audit-log:open`: `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export` and `audit:billing-log:export`. Roles that open the screen are seeded with all five. Every export is itself audited.
- Resolve an error: `audit:error:resolve` (high risk).
- Consult links tab: `audit:consult-links:view`. Server jobs: `jobs:server-job:view`, and requeue with `jobs:server-job:requeue`.
- Scoping on screen: Pathologists see every entry that names a case, plus their own entries with no case. Validation-study events (`validation_study_created`, `validation_study_activated`, `validation_study_closed`, `validation_study_deleted`, `validation_report_generated` and the three `validation_routing_rule_*` events) are hidden from everyone except Admin, Pathologist-Admin and Superadmin.
- Viewing the log is not itself audited. Exports, resolving an error and a support-reference lookup are.

**Known limits.**
- **No tamper-evidence on the main audit log.** The main audit log is append-only by design (no update or delete call exists in the service, and the server contract gives the application's database login no such permission), but its entries are not hash-chained and nothing on screen verifies them. The only hash-chained record is the [Support Access](#screen-support_access) audit. See the verification guide.
- **Retention is a setting, not enforced.** The log's keeping period is set on [Data Retention](#screen-retention). No purge job reads it yet (PS-345), so nothing is deleted by it today.
- **Audit `detail` is English by design.** It is a compliance artifact, not interface text. The column headings, filters and buttons are translated; the detail text and the exported file are not.
- **Demonstration.** Without an API server the audit log is stored in the browser and starts with seeded sample entries. The time and the acting user come from the browser. With an API server the server sets the time and the actor from the sign-in token.
- **No facility or station column** on screen or in the CSV, though both are recorded (see above).

## Audit log verification guide {#ch9-audit-verification}
Breadcrumb: Home > Administrator Guide > Appendices > Audit log verification guide

**Status:** Partial. The recording, searching and export are built. Tamper-evidence for the main audit log and automatic purging by retention are not built.

**Who this is for.** An administrator or a ForMedrixAI services engineer who has to show an auditor or inspector what changed, who changed it and when. It uses only what exists today.

### What is recorded {#ch9-audit-recorded}

Each audit entry holds: an id; a time (stored in UTC); a type (**AI**, **User** or **System**); an event name; a detail sentence in English; the acting user's display name; a case accession number when there is one; an AI confidence where it applies; a facility id where the code supplies it; and the scan station where the action was done. The station id is added automatically to every entry the audit service writes.

What lands in the log:

- **Every check of a high-risk capability**, allowed or refused. The event is **Capability allowed** or **Capability refused**. The detail names the capability key, the roles that granted it or the reason it was refused, the person's session role and the facility. The capability catalog marks which capabilities are high risk. A configuration screen's save is one of these checks.
- **Role and staff changes.** **Role capabilities changed** lists what was granted and removed for a role. **Staff access changed** records a change to a person's roles, facilities, pediatric access, orchestration access or cross-tenant QA access, each from and to. **Staff credentials changed** records credential edits.
- **Sign-in events.** **Signed in**, **Sign-in failed** (attempt n of 5), **Sign-in locked**, **Sign-in refused**, **SSO account linked**, **SSO account unlinked** and **SSO sign-in refused**. The log never records what was typed.
- **Named change events for some settings.** For example `AI_VENDOR_POLICY_CHANGED`, `CLINICAL_MISMATCH_RULE_CHANGED`, `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `FEEDBACK_SETTINGS_CHANGED`, `FEEDBACK_ROUTED_TO_VALIDATION` (QA feedback in the AI / Template validation category was sent: the title, the study and template ids and whether the QA recipients took it because no validation recipients are set; never the feedback text), `RECALL_SETTINGS_CHANGED`, `QA_TREND_POLICY_CHANGED`, `CODE_SYSTEM_POLICY_CHANGED`, `PEER_REVIEW_GATE_CHANGED`, **Template review settings changed**, **Organ map colours changed**, **Signing-authority country profile changed** and the four **Signing-authority facility override** events (added, changed, removed, justification updated). The facility override events carry each changed flag from and to, and the administrator's justification or "Justification: none given".
- **Spoken commands.** **Voice command executed** and **Voice command refused**. The detail names the action id and the screen, for example `Voice command executed: action TABLE_DELETE on screen WORKLIST; confirmed by repeating the phrase`; a refusal gives the reason (not available on this screen, the phrase was not repeated to confirm, or not repeated in time). The person is the acting user. The log never records what was said, and no entry names a case.
- **Prints and exports.** `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED`: who, the accession, the destination, the status and, for an export, the row count.
- **Case events**, such as synoptic generation, field updates, finalization, protocol selection, drift detection and correction, billing corrections and patient management (`mpi.*`).
- **Automatic actions** under a system actor.

Two limits matter when you read the record.

1. A capability entry shows that a person used a capability and whether it was allowed. For most settings it does **not** show the old and new values. Only the events named above, and a few others, carry the change itself.
2. A change made while a Superadmin session is acting in another organisation is also written to that organisation's [Support Access](#screen-support_access) record.

**The detail text is English by design.** Audit records are compliance artifacts, not interface text, so the detail stays literal English in every language of the product and in the export. Search with the English event name or the capability key.

### How to find a change to a setting {#ch9-audit-find-setting}

1. Open [System Logs](#screen-audit-log), tab **Audit Log**.
2. Set **Date range**. The default is **Last 7 Days**; choose **Custom Range** for an older change. Entries outside the range are hidden, not missing.
3. In **Search**, type the capability key for the screen you are checking. Every Configuration screen's change capability is named in its **Permissions** part in this guide (for example `config:retention-policy:manage` for [Data Retention](#screen-retention)). The search matches the detail text, so it finds the **Capability allowed** entries.
4. Read the **User** and **Timestamp** columns for who and when. The detail names the role that granted the capability.
5. If the screen has a named change event (see the list above), search for that event name too. It holds the change itself, not only the permission check.
6. To exclude noise, use the **Type** pills (**User** shows the human actions).
7. To see only refusals, search `Capability refused`.

An entry that says **Capability allowed** shows that the person was permitted to make the change, and that the change was attempted. It does not by itself prove which value was saved. For a setting without its own change event, compare against the screen's current value and, if the lab keeps one, a configuration export (see **Export** below).

### How to check who changed a permission {#ch9-audit-find-permission}

1. On the **Audit Log** tab, search `Role capabilities changed`. Each entry reads `Role "<name>": granted <keys>; removed <keys>.` The **User** column is the person who saved the role.
2. To see who was given or lost a role, search `Staff access changed`. The detail lists each change from and to (roles, facilities, pediatric access, orchestration access, cross-tenant QA access).
3. To see credential edits, search `Staff credentials changed`.
4. To see whether a person actually used a permission, search the capability key and read the **Capability allowed** and **Capability refused** entries.
5. To list who can do something today, use [Roles](#screen-staff-roles) and [Members](#screen-staff-members); the log shows history, those screens show the present state.
6. For a role the hospital cannot change: a change to the Superadmin role is refused at a hospital, so no entry will show one. Superadmin is held by ForMedrixAI support staff and is granted outside the hospital's staff directory.

A role save is also refused, before anything is written, if it would leave no role able to manage roles, would break a separation-of-duties pair, or would grant a capability without its required one. A refused save writes no **Role capabilities changed** entry.

### How record integrity and retention work {#ch9-audit-integrity}

**Append-only.** The audit service has no call to update or delete an entry; it can only write new ones and read them. The server contract (`STAFF_ADMIN_API.md` section 1; `AUTHORIZATION_API.md`) requires the audit table to be append-only: no update or delete call exists and the application's database login has no such permission. A resolved error is the one change allowed to a record, and it is recorded as who and when on the error entry, not as an overwrite of the message.

**Who sets the time and the actor.** With the API server, the server sets the time and the acting user from the bearer token. The browser sends only the event, so a user cannot choose the name that appears. In the demonstration, the browser does.

**Unique ids.** Every entry gets a unique id. The server's table is expected to enforce uniqueness as well.

**Tamper-evidence: the main audit log has none.** The main audit log is **not** hash-chained or signed. Nothing on the System Logs screen proves that an entry has not been altered by someone with direct database access, and there is no "verify" button for it. Integrity rests on the append-only rule above and on database permissions. The only record that is hash-chained is the [Support Access](#screen-support_access) audit (see below). If your auditor requires cryptographic tamper-evidence for the main log, say so to ForMedrixAI: it is not built.

**Retention.** The keeping period for the audit log is a setting on [Data Retention](#screen-retention): the field **Audit Logs**, in days, from 90 to 3650, 365 by default. The screen says a change "takes effect at next purge cycle". **No purge job reads this setting yet (PS-345)**, so today nothing is deleted by it. Treat the number as a recorded policy, not an enforced one. A record of each export (who, what, when, row count and file hash) is kept with the audit log's retention.

**Exports are working copies.** The exported CSV is a copy of what was on screen. The record of the export is the audit entry.

### How to export {#ch9-audit-export}

1. On the tab you need, set the filters first. The export covers the rows the filters leave, not the whole log.
2. Choose **Export CSV**. The button is greyed out, with a tooltip naming the capability, unless the person holds the export capability for that tab (see Permissions above).
3. The service checks the capability before building the file. A refusal builds nothing.
4. With an API server the export is built by the server (see [My exports](#screen-my-exports)): the file is a working copy kept for 7 days by default (1 to 30), a person may have 3 open exports, and more than 1,000,000 rows is refused. In the demonstration the browser builds and downloads the file at once.
5. A file name has the form `pathscribe-audit-log-<date>.csv`. The first lines are a header naming the report, who requested it, the filters used and the row count. Then the columns: **ID, Timestamp, Type, Event, Detail, Actioned By, Accession No., AI Confidence**. Cells that begin with `=`, `+`, `-` or `@` are neutralised so a spreadsheet will not run them as a formula.
6. Every export writes a `DOCUMENT_EXPORTED` entry with the person, the file name, the format and the row count. Search `DOCUMENT_EXPORTED` to see who has exported the log.
7. The CSV does not carry the facility or station ids. If an inspector needs them, say so to ForMedrixAI services: the server holds them.
8. The other tabs export the same way, each with its own capability and its own columns: Error Log (ID, Timestamp, Severity, Code, Message, Source, Accession No., Resolved), Quality Assurance (ID, Group, Date, Case, Specimen, Detail, Status, User), Interface Log and the Financial billing log.

### How the Support Access audit fits {#ch9-audit-support}

ForMedrixAI support reaching your data is recorded in its own stream, separate from the main audit log, and it belongs to your organisation. It is documented on [Support Access](#screen-support_access).

- **What it records.** Policy changes; requests, approvals, rejections, expiries, early ends and revocations; refused opens; case opens and edits; every list, search or report that disclosed your cases (with the case ids); the names, never the values, of search criteria; and exports of this audit. A support agent's own exports and configuration changes are recorded here too (as `supportExport` and `supportConfigChange`), as well as in the main audit log.
- **Entries are never removed.** Each entry holds a sequence number, the time, the actor, the ticket, the action, the case ids and an English, patient-free detail.
- **It is hash-chained.** Each entry carries a SHA-256 over its fields and the previous entry's hash, starting from 64 zeros. A changed, removed or re-ordered entry breaks the chain. The screen says **Record intact (N entries)** or **Record altered at entry N**, and the JSON export carries the chain check.
- **To verify it.** Open Support Access, read the audit panel's chain line, and export JSON for an independent check. You need `config:support-audit:view`.
- **Export formats.** CSV, JSON and PDF, with the columns Timestamp, Support agent name, Originating IP, Originating country, Ticket ID, Action taken, Case IDs, Detail.
- **Limits.** Originating IP and country can only be recorded truthfully by the server from the request, so the demonstration leaves them empty. Tenant-isolated storage in its own append-only table is server work (PS-358).

This is the one record in the product with built-in tamper-evidence. It covers support access only, not the main audit log.

### A short verification routine {#ch9-audit-routine}

For a routine review of a sampled period, work through these steps.

1. Set the **Audit Log** date range to the period. Record the count in the footer ("Showing N of M events").
2. Search `Role capabilities changed`, `Staff access changed` and `Capability refused` and read each entry.
3. Search `Sign-in locked` and `Sign-in refused` for sign-in problems.
4. Search `DOCUMENT_EXPORTED` to see who took data out.
5. Open the **Error Log** tab, filter **Open Only**, and check that nothing important is unresolved.
6. Open [Support Access](#screen-support_access) and confirm the chain line reads intact; read the entries for the period.
7. Export the Audit Log CSV for the period and keep the file with your review notes. The export is itself recorded.
