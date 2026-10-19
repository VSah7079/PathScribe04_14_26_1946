# services/errorReporting/

Batch 502 (PS-472): what happens to a crash in the browser.

- **`scrubClientError.ts`** (pure) — what a report may contain. It removes or replaces:
  - quoted text and e-mail addresses;
  - long ids and runs of 3+ digits;
  - name-like words, keeping common error vocabulary.

  Stack frames keep their locations only. In the route, any segment with a digit becomes `:id`, and the query string is dropped. Deliberately blunt: losing detail is better than logging a patient's name.
- **`clientErrorReporter.ts`** — `createClientErrorReporter(deps)`:
  - scrubs the error and gives it a reference (`ERR-XXXX-XXXX`);
  - sends it to each sink, where a failing sink never breaks anything;
  - flood control: the same error at most once a minute, and at most 25 reports per page load.

  Also in this file: `errorLogEntryFor` (the Error Log record) and `installGlobalErrorHandlers` (`error` and `unhandledrejection`, for errors no boundary sees).
- **`clientErrorReporterInstance.ts`** — the app's reporter: the console and PathScribe's own Error Log (Audit Log → Error Log, codes `CLIENT_RENDER_ERROR`, `CLIENT_UNCAUGHT_ERROR`, `CLIENT_UNHANDLED_REJECTION`).
- **`crashTest.ts`** — `?ps-crash-test=<boundary>` for QA, only on a development build or a validation instance.

**Waiting on PS-469.** An external monitoring service needs Pete's decision first: the provider, the patient-data agreement (BAA / GDPR DPA), and whether a hospital can turn it off or route it to its own collector. Once decided, it is one more sink in `clientErrorReporterInstance.ts`, behind a configuration switch.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 527 (PS-486): a lean first load

`clientErrorReporterInstance.ts` loads the services when it logs an error, instead of at start-up. Before, this module alone pulled the whole services barrel into the sign-in page.

## Batch 589 — One crash, one log entry (PS-472)

Window errors wait `WINDOW_ERROR_DELAY_MS` (500 ms) for a boundary to report the same crash first, and the match uses the message without an "Uncaught Error:" prefix (`shadowKeyOf`). A development build no longer logs a route or panel crash twice.

## Batch 590 — External monitoring (PS-469)

- `monitoringConfig.ts`: monitoring is on only with a valid DSN **and** an environment name from `config.json`; otherwise off (no default label).
- `sentrySink.ts`: Sentry as one more sink. It re-checks each report's scrubbed shape and drops anything else; Sentry's own collectors are off; `beforeSend` removes request, user, extra, contexts and breadcrumbs.
- `errorMonitoring.ts`: `monitoringSink` in the reporter's list does nothing until `startErrorMonitoring()` (called from `startApp.tsx`) loads the SDK as a separate chunk; reports arriving meanwhile are held (25 at most).
- **Scrubber fix:** `scrubStack` no longer treats a message line containing an `@` (an e-mail address) as a stack frame; a frame must end in `file:line:col`.
- See `docs/architecture/ERROR_MONITORING.md`.
