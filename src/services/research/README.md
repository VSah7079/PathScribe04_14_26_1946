# services/research/

External peer-reviewed literature feed — powers the PubMed research ticker on
the Home dashboard.

**Pattern:** Two interface/mock pairs — one for the feed, one for its
configuration. No firestore stubs, and that deviation is deliberate — see
Notes.

## Files

- **`IResearchFeedService.ts`** — the contract. One method,
  `getLatestArticle(signal?)`, plus the `ResearchArticle` type. The interface
  documents a hard guarantee the implementations must honour: **it never
  rejects.** An unavailable feed resolves to `null`. This is not laziness
  about error handling — it is the whole point. A decorative headline must
  never be able to take down the dashboard a pathologist logs into.
- **`pubmedResearchFeedService.ts`** — the real, currently-active
  implementation. Calls NCBI eUtils directly from the browser in the two
  stages eUtils requires (`esearch.fcgi` for the most recent PMID, then
  `esummary.fcgi` for its metadata). Also owns sanitisation, caching and
  rate-limit backoff — see Notes for why each exists.
- **`mockResearchFeedService.ts`** — offline stand-in returning one fixed
  article after a short simulated delay. For tests and for working on a
  machine with no route to NIH. Swap it in at the call site in
  `hooks/useLatestResearch.ts`.
- **`IResearchFeedConfigService.ts`** — the contract for admin-editable
  configuration (`enabled`, `apiBaseUrl`, `articleUrlTemplate`, `query`) plus
  the `ResearchFeedHealth` shape.
- **`mockResearchFeedConfigService.ts`** — `localStorage`-backed config, and
  the reason this folder is worth reading before changing anything. Owns two
  rules: per-field fallback to built-in defaults, and an allow-list on both
  URLs. Also owns `recordHealth()`, which stamps every outcome so a
  permanently dead feed is distinguishable from a transient one.

## Consumers

- `hooks/useLatestResearch.ts` — the only consumer. Owns the abort-on-unmount
  lifecycle and exposes `{ article, isLoading }`.
- `components/Common/PubMedTicker.tsx` — renders it. Holds no fetching,
  parsing, caching or error handling of its own. Uses the shared
  `hooks/useCompanionWindow.ts` to open articles, rather than a second
  parallel window mechanism — with `closeOnUnmount: false`, since reference
  material has no patient context and should not be shut when the user
  navigates away (the EMR Sidecar's default of `true` is right for a chart,
  wrong for a paper).
- `components/Config/System/ResearchFeedSection.tsx` — the admin screen. Shows
  feed health first, then the four editable settings.

## Notes

- **Why there is no `firestoreResearchFeedService.ts`.** The master
  `services/README.md` documents the firestore stub as a forward-looking
  placeholder for "the eventual real backend." Here the real backend already
  exists and is external — NCBI. There is no future Firestore version of
  PubMed to stub out, so an empty stub would be misleading rather than
  forward-looking. The interface/mock split still applies and is still
  useful; the third file would be theatre. **If a server-side cache is ever
  built (see the VDI note below), it belongs here as a fourth implementation
  behind the same interface, not as a rewrite of the component.**

- **Scope limit, and the most important thing on this page.** The query is
  `sort=pub_date` with `retmax=1` — literally "whatever PubMed indexed most
  recently matching these terms." Two guards are in place and one is not:
  the query excludes retracted publications, preprints, editorials, comments
  and letters, and the UI badge reads **"From PubMed"** rather than "Latest
  Research", naming the source instead of implying PathScribe endorses the
  selection. What is deliberately *not* in place is a journal allow-list —
  narrowing to a handful of titles with `retmax=1` tends to surface months-old
  articles, which reads worse than a broad recent one. An admin can add one
  via the query field if a particular lab wants it. **This is still an
  uncurated feed.** It can surface a low-impact journal or an
  ahead-of-print with an odd date. Treat it as decoration, never as clinical
  guidance, and do not relabel the badge back to anything that implies
  review.

- **Nothing about the feed's URLs is hardcoded, and that is the point.**
  Endpoint, article URL template and query all come from
  `mockResearchFeedConfigService`. This folder was built directly on
  `services/externalResources/`'s lesson: the CAP protocol link was once
  hardcoded, 404'd, and nobody could fix it without a code change. An NCBI
  restructure is now an admin edit. The config is deliberately **not** stored
  as an `ExternalResource` — those are curated links pathologists click, and
  `resolveForViewer()` surfaces them in the Resources panel, where an eUtils
  API endpoint would appear as a broken-looking entry. Same pattern, wrong
  shape, so it lives with the feed it configures.

- **A bad config can never disable the feed.** Every field falls back to its
  built-in default *independently* — blank query, malformed URL, corrupt JSON
  each degrade to today's behaviour rather than to nothing. Moving a hardcoded
  value into config must not move the failure along with it. If you add a
  field, add its fallback in `sanitise()` at the same time.

- **Both URLs are allow-listed, and that is a security control, not tidiness.**
  `articleUrlTemplate` decides where a clinician's browser goes on click, so
  without a constraint an admin — or anyone who compromises an admin account —
  could point the dashboard at a phishing host. `ALLOWED_HOSTS` is
  `nih.gov` / `nlm.nih.gov` / `doi.org`, https only; a rejected value silently
  reverts to the default. The template must also still contain `{PMID}`:
  without it every article links to the same page, which is worse than a dead
  link because it looks like it works. **Extend `ALLOWED_HOSTS` deliberately.
  Every entry is somewhere a pathologist can be sent by an admin edit alone.**

- **Health tracking exists because everything else here fails silently.** The
  silent-collapse design is right for the dashboard and wrong for whoever
  maintains it: a permanently dead feed looks exactly like a transient blip,
  and nobody would notice for months. `recordHealth()` stamps every outcome
  (`success` / `empty` / `rate-limited` / `error`), and the admin screen shows
  last success, last attempt, and a warning after three days without a
  success. This is the only way anyone finds out the endpoint moved.

- **Titles arrive as HTML, not text.** PubMed returns real inline markup
  (`<i>Helicobacter pylori</i>`) and HTML entities. `toPlainText()` runs them
  through `DOMParser` to `textContent`, which decodes entities and strips tags
  without executing anything — unlike assigning to `innerHTML` on a live node.
  This is why the component never needs `dangerouslySetInnerHTML`. Do not
  "simplify" this to a regex and do not pass raw titles to the DOM.

- **The 24-hour cache is for VDI, not for speed.** `pathscribe_pubmed_ticker_cache`
  in `localStorage`, schema `{ timestamp, data }`. In a Citrix/Horizon/AVD
  estate every concurrent session shares one public egress IP, and NCBI's
  unkeyed limit is 3 requests/second for that whole IP. The cache takes a
  returning user from two calls per login to zero.

- **The 429 backoff matters more than the cache.** A 429 parks the feed for
  30 minutes via `pathscribe_pubmed_ticker_backoff`. Without it, every session
  behind a throttled gateway retries on every dashboard mount and holds the
  shared IP at the limit indefinitely — the throttle becomes self-sustaining.
  The success cache helps the users who already succeeded; the backoff helps
  the ones who are failing, which is the case that actually causes the outage.

- **Known limitation: the cache does not survive non-persistent VDI.** Pooled
  Citrix and AVD desktops discard the user profile at logoff by design, taking
  `localStorage` with it. In those estates the 24-hour TTL delivers **zero**
  benefit and every login costs two calls. Rough arithmetic: 200 pathologists
  starting an 08:00 shift, all cache-cold, is 400 calls — fine spread over ten
  minutes (0.67/s), over the unkeyed limit if compressed into sixty seconds
  (6.7/s). The durable fix is a server-side daily fetch (a Cloud Function
  alongside the existing PDF generator) serving all clients from one call per
  day globally. Not built. Flagged here rather than discovered in production.

- **`VITE_NCBI_API_KEY` is a deliberate exception to this codebase's own
  rule.** Anything `VITE_`-prefixed is inlined into the client bundle and is
  publicly readable — which is exactly why the AI, Gemini and UMLS keys had
  that prefix *removed* (see the June 2026 security work). An NCBI key is
  low-consequence: it raises a rate limit, carries no billing and grants no
  data access. The exception is judged acceptable, but it **is** an exception,
  and it should not be cited as precedent for exposing any other key. A
  server-side proxy would avoid it entirely.

- **The article URL is the one setting that fails *visibly* when wrong.** If
  the eUtils endpoint or the response shape changes, the ticker silently
  collapses and the dashboard is unaffected. If the article URL pattern
  changes, `esummary` still succeeds, the headline still renders, and the link
  is simply dead — a broken feature rather than an absent one. It is also the
  one the health panel cannot detect, because nothing on our side ever
  requests that URL. Historically low risk (`pubmed.ncbi.nlm.nih.gov/{pmid}/`
  has held since 2019, and the older form still redirects), but worth knowing
  which way this breaks.

- **Timeouts are per-request, not per-operation.** 3000ms each across two
  sequential calls, so the real worst case before the ticker gives up is six
  seconds. The `AbortController` from the hook covers unmount; the internal
  timer covers a hospital proxy that accepts the connection and then never
  answers. The abort signal alone would not catch that case, and the ticker
  would sit in its loading skeleton forever.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
