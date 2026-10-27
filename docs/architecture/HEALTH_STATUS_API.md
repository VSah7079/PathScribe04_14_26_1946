# System health status — API contract

**Status:** Batch 669h (footer). Requirements for the PathScribe API server (ASP.NET Core, SQL Server). The browser side is built and tested (`src/services/healthStatus/`, `hooks/useSystemStatus.ts`, `components/Common/SystemStatusIndicator.tsx`). Until the server has the route, a server deployment shows "Status unavailable" (a failed check is never shown as operational).

## Why

The Home footer used to print "SYSTEMS OPERATIONAL" and "HIPAA Compliant" as fixed text. Neither was a check. The footer now shows a status the server has actually worked out, and makes no compliance claim.

## The route

`GET /api/health/health-status/check` (the one route style: `/api/<area>/<service>/<method-kebab>`, GET for a read with no arguments). The bearer access token is sent like any other call; the server may also allow it without a session if the load balancer needs it for its own probe, but the browser always sends the token.

Answer, `200`:

```json
{
  "overall": "operational",
  "components": { "database": "operational", "messaging": "operational", "queues": "degraded", "interfaceEngine": "operational" },
  "checkedAt": "2026-10-24T10:00:00Z"
}
```

- States are exactly `operational`, `degraded` or `unavailable`.
- Components are exactly `database`, `messaging`, `queues`, `interfaceEngine`. The browser rejects an answer that lacks one or has an unknown state, and shows "Status unavailable".
- **The server decides `overall`.** The browser never computes it. A suggested rule: `unavailable` if the database is unavailable; otherwise `degraded` if any component is not `operational`; otherwise `operational`.
- **No PHI and no free text.** No names, ids, error messages, versions, host names or counts. Extra fields are ignored by the browser, so do not rely on them being shown.
- `checkedAt` is the server's time of the check. A check may be answered from a cache up to 30 seconds old, so many open tabs cannot load the dependencies.
- If the server cannot tell, it answers `unavailable` for that component, not `operational`. A non-200 answer, a timeout or an unreadable answer is "Status unavailable" in the footer.

## When the browser asks

Once when Home opens, and again when the tab becomes visible after at least five minutes. There is no timer and no polling. The footer shows "Checking", then the result.

## Requirements (HS-n)

- **HS-1.** The route above, with the answer shape above.
- **HS-2.** `overall` is set by the server from the four components.
- **HS-3.** No PHI or free text in the answer, logs of the answer carry states only.
- **HS-4.** Each component check has a short time limit (a few seconds) so a slow dependency becomes `unavailable`, not a hung request.
- **HS-5.** Caching of at most 30 seconds.
- **Browser tests:** `src/services/healthStatus/healthStatus.test.ts` (shape, strict reading, route), `src/hooks/useSystemStatus.test.tsx` (check on load, recheck on visibility after five minutes, failure), `src/components/Common/SystemStatusIndicator.test.tsx`, `src/pages/noFixedComplianceClaims.guard.test.ts`.

## The demo

With no API server the mock answers from whether the browser is online and the footer adds "(demo: simulated)". It does not claim the system was checked.
