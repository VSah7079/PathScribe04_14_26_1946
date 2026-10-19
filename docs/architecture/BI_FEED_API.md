# Reporting feed for Power BI and other BI tools: server contract (Batch 613, PS-787)

**Decision (Pete, Oct 18, 2026):** Power BI and other reporting tools read PathScribe data through a reporting API on the ASP.NET Core server (option 2). They do not connect to the database. The backend work item is **PS-787**.

The browser side is complete: Configuration → System → **Reporting feed (Power BI)** (`components/Config/System/BiFeedSection.tsx`, `services/biFeed/`). It holds the settings and the tokens in browser storage and answers a **Simulated** pull the way the server will. This document is what the API server must do. Where it differs from `src/services/biFeed/biFeedRules.ts` or `biFeedCatalog.ts`, those files win and this document is corrected.

## 1. What the feed is

A read-only, token-authenticated HTTP API. A reporting tool (Power BI's Web connector, Excel, Tableau, a script) presents a feed token and asks for one dataset. The server answers with the rows that token may see, as JSON or CSV. Nothing is written back.

## 2. Settings (the ceiling)

Stored once per organisation. The administrator chooses:
- **enabled**: while off, every token is refused (`feed_off`).
- **datasets**: which of the six datasets the feed offers at all.
- **facilities**: which performing-lab facilities the feed may reach. No token can reach a facility that is not ticked.
- **identified approval** (optional): `approverName`, `reason`, `approvedAt`, `recordedBy`. See §5.

Capabilities: `config:bi-feed:manage` (settings), `config:bi-feed-tokens:manage` (issue, replace, revoke, test), `config:bi-feed-identified:approve` (record or withdraw the approval). All three are high risk and audited.

## 3. Datasets

Field ids are the column names an analyst sees; they are not translated. The full list, with types and what the de-identified feed does with each field, is `BI_DATASETS` in `src/services/biFeed/biFeedCatalog.ts`.

| Dataset | Can identify a patient | Contents |
|---|---|---|
| `cases` | yes | Accession and sign-out times, status, priority, pathologist, subspecialty, diagnosis and result codes, turnaround hours |
| `specimens` | yes | Type, collection and receipt times, block, slide and stain counts |
| `billing` | yes | Charge capture and billing events: CPT code, quantity, amount, financial class |
| `qa` | yes | Discordance, deficiency and amendment events with severity, outcome and timing |
| `workload` | no | Cases, specimens, blocks and slides handled per person and day |
| `audit` | no | Daily counts of allowed and denied actions by event type |

Row keys (`case_key`, `specimen_key` and so on) are stable opaque identifiers that let an analyst join datasets. They are not accession numbers or record numbers.

## 4. Tokens

- **Shape:** `psbi_` + 48 lower-case hex characters (24 random bytes). Reject anything else before hashing.
- **Storage:** only the SHA-256 hex of the token, its last four characters, and the issue and expiry times (365 days). The token is returned once, at creation or replacement, and can never be read again.
- **Scope:** a name (unique among active tokens), one or more datasets, optionally a subset of the feed's facilities (none ticked means every facility the feed offers), and a mode (§5).
- **Replace:** issue a new token and keep the old hash valid for 24 hours (`previousValidUntil`), so the tool can be updated without an outage.
- **Revoke:** needs a reason (code and optional note). Immediate and final; clears the previous hash; the record is kept.
- **Warning:** the screen shows "expires soon" 30 days before expiry.

## 5. De-identified by default

Every token is **de-identified** unless an approval is on record and the token was created as **identified**.

De-identified means, for the four datasets that can identify a patient:
- fields marked `removed` are left out (names, accession and record numbers, birth dates, free text);
- fields marked `generalised` are reduced: timestamps to the month; age 90 and over is returned as `90+`;
- all other fields are returned as they are.

`workload` and `audit` are never changed.

An identified token gets every field, but only while the approval is on record. If the approval is withdrawn, the server treats identified tokens as refused on the four identifiable datasets (`identified_not_approved`) until a new approval is recorded. Creating an identified token requires the approval and at least one identifiable dataset.

## 6. Requests

`GET /api/bi/v1/{dataset}?format=json|csv&since={iso}&page={n}&pageSize={n}` with `Authorization: Bearer psbi_…`.

- `pageSize` default 1000, maximum 10000. Results are paged; the response carries `nextPage` when more remain.
- `since` filters on the dataset's last-changed time so a scheduled refresh can fetch only what changed.
- Rate limit: 60 requests a minute per token; beyond that `429` with `Retry-After`.
- Rows are filtered to the facilities the token reaches (the smaller of the token's list and the feed's list).

| Answer | Status | Meaning |
|---|---|---|
| ok | 200 | Rows returned |
| malformed, unknown | 401 | Not shaped like a token, or no match |
| revoked, expired | 401 | The token is no longer valid |
| feed_off | 503 | The feed is switched off |
| dataset_not_allowed | 403 | The token (or the feed) does not include this dataset |
| identified_not_approved | 403 | Identified token, no approval on record |
| rate_limited | 429 | More than 60 pulls in the last minute |

The browser's Simulated pull uses the same names (`BiPullResult`) and decision order (`decideBiPull`).

## 7. Audit

One entry per change and per pull; never row content, never a token or hash:
`BI Feed Settings Changed`, `BI Feed Identified Approved`, `BI Feed Identified Withdrawn`, `BI Feed Token Created`, `BI Feed Token Rotated`, `BI Feed Token Revoked`, `BI Feed Pull` (token name, dataset, row count, field count, identified or not), `BI Feed Pull Refused` (token name when it matched, dataset, reason).

## 8. What the server team builds

1. The settings and token tables, the hashing, replace and revoke rules (§4).
2. The six dataset queries as read-only views over the reporting copy of the data, never the live tables, so a large pull cannot slow clinical work.
3. The de-identification step (§5), tested against `BI_DATASETS`.
4. Facility filtering from the token and the feed ceiling (§2, §4).
5. Paging, `since`, JSON and CSV output, the rate limit (§6).
6. The audit entries (§7).
7. Replace the browser service with HTTP calls. `useBiFeed` and the screen do not change.

## 9. Pete's check before it is relied on

Create a de-identified token for `cases` at one facility, pull it from Power BI: no names, record numbers or birth dates appear, dates are months, and only that facility's rows come back. Record an approval, create an identified token, and see the full fields. Withdraw the approval and see the identified token refused. Revoke a token and see the next refresh fail.

## Batch 617 (part A): the browser's calls for these services (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

### BiFeedService

Service: `services/biFeed/httpBiFeedService.ts`; chosen in `biFeedServiceInstance.ts`. Base `/api/bi-feed/admin`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getSettings` | `GET /api/bi-feed/admin/get-settings` | none | result |
| `saveSettings` | `PUT /api/bi-feed/admin/save-settings` | `draft` (the body) | result |
| `approveIdentified` | `POST /api/bi-feed/admin/approve-identified` | `raw` (the body) | result |
| `withdrawIdentified` | `POST /api/bi-feed/admin/withdraw-identified` | none | result |
| `listTokens` | `GET /api/bi-feed/admin/list-tokens` | none | result |
| `createToken` | `POST /api/bi-feed/admin/create-token` | `raw` (the body) | result |
| `rotateToken` | `POST /api/bi-feed/admin/rotate-token` | `id` (body fields) | result |
| `revokeToken` | `POST /api/bi-feed/admin/revoke-token` | `id`, `reason` (body fields) | result |
| `pull` | `POST /api/bi-feed/admin/pull` | `presented`, `datasetId` (body fields) | result |

