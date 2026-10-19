# Error monitoring (PS-469, Batch 590)

**Status: built, off by default.** Nothing is sent anywhere until a deployment sets two settings in its `config.json` and signs the agreements below.

## What it does
When a page crashes, the app's own reporter (`services/errorReporting/`) scrubs the report, de-duplicates it and gives it a reference (`ERR-XXXX-XXXX`). It goes to the console and the in-app Error Log as before. If monitoring is configured it also goes to **Sentry, or a self-hosted collector that speaks Sentry's protocol**. Sentry never sees an error directly: it only receives reports the app has already scrubbed.

## Turning it on, off, or pointing it at the hospital's own collector
Two settings in the site's `config.json` (see `deploy/runtime-config/`):

| Setting | Meaning |
|---|---|
| `VITE_ERROR_MONITORING_DSN` | The collector's address with its public key, e.g. `https://<key>@<host>/<project>`. A public key, safe in `config.json`; nothing secret goes there. |
| `VITE_ERROR_MONITORING_ENV` | The deployment's name, e.g. `hospital-a-prod`. There is **no default** such as "production". |

- **Off:** leave either setting out. The Sentry code is then never downloaded.
- **Own collector:** put the hospital's collector address in the first setting.
- **A wrong value** is shown at start-up like any other `config.json` mistake (it must be https, with a key and a project, no password).
- The security policy needs the collector's origin in `connect-src`: run `scripts/generate-security-headers.mjs … --runtime-config config.json` as usual; the DSN's origin is added (the key is dropped).

## What a report may contain
The allowed payload: error name, a scrubbed message (no quoted text, e-mail addresses or runs of 3+ digits; name-like words removed), at most 10 stack frames (file, line, column; no query strings), the route with every segment containing a digit shown as `:id`, the report reference, and where it was caught. The sink checks this shape again and **drops anything else**.

Sentry itself is set up with: no default integrations (no global handlers, no breadcrumbs, no request data), no tracing, no Session Replay, no personal data, and `beforeSend` removes request, user, extra, contexts and breadcrumbs.

## Before turning it on for a customer
- **US:** a signed HIPAA BAA with the provider (confirm the plan tier with Sentry).
- **EU/UK:** a GDPR data-processing agreement and EU data residency.
- Self-hosting in the hospital's own environment avoids both.

## Not done yet
- **Source maps.** Upload them to Sentry when building, but do not publish them with the site. The build does not make source maps today; this needs the Sentry project and an upload token, kept in the build pipeline and never in `config.json`.
- **Back end.** The .NET API server would use Sentry's .NET SDK (`Sentry.AspNetCore`) with the same rules. Not part of this front-end change.

## For the dev team
The front end uses `@sentry/browser` (11.1.0), the core that `@sentry/react` wraps, because the app's error boundaries already do what `@sentry/react`'s boundary would. Reports reach it only through `services/errorReporting/sentrySink.ts`; a guard test fails if anything else calls the SDK.
