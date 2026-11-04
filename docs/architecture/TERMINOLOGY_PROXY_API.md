# Terminology look-ups through the API server (PS-488, Batch 617)

Pete decided on Oct 18, 2026 that the public NLM look-ups (ICD-10-CM, ICD-11, LOINC) go through the PathScribe API server instead of being called from the browser. This is the contract for the server team. The browser side is built (`src/services/terminologySearch/nlmLookupRoute.ts`, `codeSearchService.ts`).

## When the browser uses it

- **An API address is configured** (`VITE_API_BASE_URL`, `apiServerUrl()`): every ICD-10-CM, ICD-11 and LOINC look-up is sent to the same-origin route below, with `Authorization: Bearer <access token>` when the person signed in with SSO. The browser never names an NLM host, and the security headers for a server deployment do not allow one (`"terminologyViaServer": true` in the deployment's origins file; `deploy/security-headers/README.md`).
- **No API address (the demonstration):** the browser calls the NLM clinical tables directly, as before. The demo's policy keeps the NLM host in `connect-src`.
- SNOMED CT and ICD-O still go through `GET /api/terminology/umls/…` (`AI_PROXY.md`); licensed CPT and non-US ICD-10 are separate proxies (`VITE_CPT_PROXY_URL`, `VITE_ICD10_PROXY_URL`).

## Routes

Names follow `HTTP_SERVICES_PATTERN.md` section 7 (kebab-case method name under `/api/<area>/<service>/`). All are `GET`; the query string is the one the browser already built for NLM, passed through unchanged.

| Route | Calls (NLM clinical tables) | Query parameters the browser sends |
|---|---|---|
| `GET /api/terminology/nlm/search-icd10` | `/icd10cm/v3/search` | `terms`, `maxList`, `sf=code,name`, `df=code,name` |
| `GET /api/terminology/nlm/search-icd11` | `/icd11_codes/v3/search` | `terms`, `maxList`, `sf=code,title`, `df=code,title` |
| `GET /api/terminology/nlm/search-loinc` | `/loinc_items/v3/search` | `terms`, `maxList`, `type=question`, `sf=LOINC_NUM,LONG_COMMON_NAME,SHORTNAME`, `df=LOINC_NUM,LONG_COMMON_NAME` |

## What the server does

- **Credentials:** holds any NLM or UMLS key in environment variables (never in the browser, the repository or a response). The clinical tables need no key today; the server adds one if NLM requires it.
- **Allow-list:** forwards only the three routes and the query parameters above; anything else is `400 INVALID`. `terms` is capped (200 characters) and `maxList` at 50.
- **Cache:** repeated look-ups (same route and query) are answered from a server cache (suggested: 24 hours; reference data changes rarely), so the same term does not go to NLM twice.
- **Audit and logs:** a look-up carries a search term, not a patient. The server must not log request bodies from other routes with it, and the search text is not written to the audit log.
- **Timeout:** the browser gives up after 5 seconds (interactive search). The server should answer or fail within about 4 seconds.

## Reply

Success is `200` with the **unchanged NLM body** (a JSON array), because the browser already parses it:

```
[ totalCount, ["C50.911", …], null, [["C50.911", "Malignant neoplasm of …"], …] ]
```

`data[1]` = codes, `data[3]` = `[code, display]` pairs in the order of `df`. (This route returns the raw NLM array, not the `{ ok, data }` envelope of the other services, so the server team can pass NLM's reply straight through.)

## Failures

The browser treats any non-2xx as "search unavailable" and shows that message; it never shows "no matches" for a failure. Suggested fixed codes (body `{ "code": "…" }`):

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID` | Route, parameter or term not allowed |
| 401 | `SIGNED_OUT` | No valid token |
| 403 | `NOT_PERMITTED` | The person may not use terminology search |
| 429 | `TOO_MANY_REQUESTS` | PathScribe's own limit or NLM's rate limit |
| 502 | `UPSTREAM_KEY_INVALID` | NLM refused the server's key |
| 502 / 504 | `UNAVAILABLE` | NLM did not answer in time |

## Tests

`src/services/terminologySearch/nlmLookupRoute.test.ts` (fake fetch): the route per kind, the token, no NLM host in a server deployment, and a 429 or key failure surfacing as "unavailable". `productionBuild.guard.test.ts` and `securityHeaders.guard.test.ts` keep the NLM host out of a server deployment's policy.

## Not tried

Nothing here has been run against a real API server or NLM since the server side is not built. The routes are proposals for the server team.
