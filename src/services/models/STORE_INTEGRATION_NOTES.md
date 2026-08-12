# ForMedrixAI Store — integration notes for when Dev builds the real thing

Everything under this heading is **mock**, standing in for a real
ForMedrixAI-hosted service that doesn't exist yet. This document is
the map from "what the mock fakes" to "what a real implementation
needs to actually do" — read it before touching
`mockModelStoreService.ts` or `ModelStoreModal.tsx` for real
integration work.

## The three things that are mocked right now

### 1. The catalog itself (`STORE_CATALOG` constant)

**File:** `src/services/models/mockModelStoreService.ts`, top of file.

Right now this is a hardcoded array of two example `StoreListing`
objects. A real implementation replaces this with an authenticated
API call to ForMedrixAI — something like
`GET /store/models?vendor=&subspecialty=` — returning whatever
ForMedrixAI has published following their own internal
regression-testing pass.

**What has to stay the same:** the `StoreListing` shape itself is a
reasonable contract to keep — `storeId`, `vendor`, `apiModelId`,
`requestFormat`, `benchmarkAccuracy`, `releaseNotes`, etc. are all
things a real catalog response would need to provide regardless of
transport. The `getAvailable()` method's filtering logic (excluding
anything already present locally, matched by `vendor` +
`apiModelId` — the real identity of a model, not its display
name/version) should also survive the swap unchanged; it's a local
concern, not a store concern.

**What has to change:** everything about *how* the listings are
fetched — real network call, real error handling for the store being
unreachable (not just "unauthorized"), possibly pagination if the
catalog grows, possibly server-side filtering by subspecialty/vendor
instead of returning everything and filtering client-side.

### 2. Authorization (`checkStoreAuthorization()` / `MOCK_ORG_HAS_STORE_LICENSE`)

**File:** same file, look for `MOCK AUTHORIZATION` in the comments.

Right now this is a single hardcoded boolean. A real implementation
needs an authenticated call verifying the **organization** —
specifically `organisationId`, the same tenant boundary
`firestore.rules` already uses for cases — has an active ForMedrixAI
store license/subscription. This is a genuinely different check from
the existing `isAdmin` gate on the Validation Studies tab: `isAdmin`
answers "is this *user's role* high enough," this answers "does this
*organization* have a paid entitlement." Both checks are needed;
neither substitutes for the other.

**Real design question, not yet decided:** should different
subscription tiers see different subsets of the catalog (e.g. only
Anthropic models on a base tier, cross-vendor options on a premium
one)? The mock currently treats authorization as all-or-nothing —
either the whole catalog is visible or none of it is. If tiered access
is a real product requirement, `getAvailable()` needs the tier/org
context threaded through, not just a boolean.

### 3. "Download" (`download()` method)

**File:** same file.

Right now, downloading a store listing does exactly one thing: calls
the local `modelService.create()` to make a new `AIModel` record.
There's no real "transfer" happening — nothing is actually being
downloaded from anywhere, since there's nowhere real to download from
yet.

**What a real implementation likely needs to add:**
- A real API call to ForMedrixAI confirming the download/adoption
  server-side (so ForMedrixAI's own systems know this org has taken
  this model — likely relevant for their own support/billing/deprecation-notice
  targeting, per the "Anthropic model deprecation → email to account
  holders" pattern already discussed for how ForMedrixAI itself
  gets notified of upstream vendor changes)
- Real credential/config delivery if the model requires anything
  beyond what's already in `AIModel` (e.g. if ForMedrixAI ever brokers
  API keys on a customer's behalf rather than the customer bringing
  their own vendor account)
- Whatever error handling a real network operation needs that a local
  `create()` call never has to worry about (timeout, partial failure,
  retry)

**What should stay the same:** the *local* half of `download()` — the
"always Beta, always `isDefault: false`, always `casesProcessed: 0`
regardless of what the store claims" logic — is a genuine product
decision, not a mock shortcut. Keep it even after the real store call
is wired in.

## The open architectural question this whole feature surfaced

Raised in conversation while building this, not yet resolved: **is the
local "adopted models" catalog itself supposed to be tenant-scoped?**

Checked directly: `firestore.rules` already defines `organisationId`
as the real tenant boundary for collections like cases, but currently
says nothing about models at all — this isn't an oversight the mock
introduced, it's a genuinely open design question at the schema level.

The two live design options, worth deciding explicitly rather than
defaulting into one by accident:
1. **Fully tenant-scoped** — each organization has its own private
   adopted-models list, `organisationId`-filtered like everything
   else. Downloading in one tenant never affects another.
2. **Global catalog, per-tenant subset** — the underlying model
   records are shared/global (since "Claude Opus 5 exists and has
   these vendor details" is true regardless of which hospital is
   asking), but each org has its own list of *which* global models
   it's adopted, closer to a join table than a filtered collection.

Option 2 avoids duplicating identical vendor/API metadata across every
tenant that happens to adopt the same model, but is more schema work
up front. Neither is implemented in the mock right now — the mock's
single global `localStorage` key is neither of these, it's simply
unscoped, and shouldn't be read as an implicit vote for option 2.

## Quick-reference: files involved

- `src/services/models/IModelService.ts` — the `create()` method
  signature; stable, shouldn't need to change for the real store
- `src/services/models/mockModelService.ts` — local catalog CRUD;
  the eventual Firestore equivalent already has a place to go per the
  existing `interface/mock/firestore` pattern this folder follows
- `src/services/models/mockModelStoreService.ts` — everything
  described above lives here; this is the file that gets rewritten,
  not extended, once a real store exists
- `src/components/ValidationStudies/ModelStoreModal.tsx` — UI layer;
  should need minimal changes since it already treats the service as
  an opaque async boundary (loading/error/locked states are already
  handled generically, not coupled to the mock's specific shape)
