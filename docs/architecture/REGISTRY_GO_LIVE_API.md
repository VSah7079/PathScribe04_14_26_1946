# Registry go-live: validation and production instances, and the test-to-live gate

**Status:** specification for the API server team and the engine team. The rules, flows, holds and screens are built and tested in the browser build (Batches 423–424, Oct 1 2026). The endpoints and the engine-side checks below are not built yet. Until the engine team's hooks land, the engine adapter is modelled inside PathScribe.
**Source:** Registry Engine SRS v2.1, step 7, and Pete's decisions of Oct 1 2026:
- the site takes the go-live decision, not ForMedrixAI;
- one person may approve, using step-up authentication and stating the roles they act in, instead of a two-person rule;
- it should behave consistently with template review and report sign-out;
- there are separate validation and production instances;
- a site only ever sends test data to a test system;
- a lab can raise a CAPA if needed.

**Engine:** the interface engine is ForMedrixAI's and ships with PathScribe. A site's own engine is used only when the site insists, and then ForMedrixAI's adapter code is deployed into it. (Batch 424 correction: earlier documents said "the hospital's interface engine".)
**Stack:** ASP.NET Core API server over Microsoft SQL Server.

## 1. Two instances

The `VITE_APP_ENV` deployment setting (the same one behind the sign-in page badge) decides the instance role. Nothing in the app can change it.

| | Validation instance | Production instance |
|---|---|---|
| `VITE_APP_ENV` | anything else, or unset (fails closed) | `production` |
| Patient data | synthetic only, for registry traffic | real |
| Registry traffic | the synthetic test suite, to the registry's **test** system | real results, to the **live** register, once go-live is approved |
| Real case signed out | not sent and not queued; audited "Registry submission not sent" | sent if live, otherwise held: "Held: attestation required" (`REGISTRY_LIVE_NOT_APPROVED`) |
| Synthetic case | sent, once the data-sharing agreement is recorded | never sent |

The send gate (`services/registryGoLive/registrySendGate.ts`) is asked first by every path: screening sign-out and revisions, cancer dispatch, worklist resends, and the test suite.

The boundary check (`services/interfaceDispatch/registryPayloadBoundary.ts`) repeats the gate's checks on the payload itself, just before dispatch:
- environment against instance;
- the synthetic marker;
- a synthetic (`SYN-`) patient.

The engine adapter should repeat the boundary check.

New releases go to validation first. The lab validates there, then the same release and configuration are promoted to production.

## 2. A registry connection's states

- **Validation instance:**
  - **Pending:** no data-sharing agreement recorded, so nothing is sent.
  - **Testing:** the synthetic suite may run.
  - **Validated:** a validation record has been exported for the latest template.
- **Production instance:**
  - **Pending:** real results are held.
  - **Live:** a current go-live approval.

## 3. Synthetic test suite

The suite lives in `syntheticTestSuite.ts`.

| Domain | Cases |
|---|---|
| Screening | NILM, HSIL, unsatisfactory, built through the lab's own code mappings and the real payload builder |
| Cancer | 8500/3 breast and 8140/3 colon, built through the real builder |

Every synthetic patient:
- has an id starting `SYN-`;
- has a national identifier that passes its check digit (NHS England numbers are in the 999 range, which NHS England keeps for testing; elsewhere it is an invented number from the format's example);
- carries `synthetic: { suite, caseRef }` in its payload.

If the lab's configuration would hold a case (for example, a code isn't mapped), the suite reports it as held. That is itself a test finding. Running the suite needs `registry:test-suite:run`, on a validation instance only.

## 4. The validation record

The record lives in `registryValidationRecord.ts`. It is exported on the validation instance once the registry's test system has accepted at least one synthetic submission on the latest template. It contains:
- the registry, template version, PathScribe release and agreement reference;
- the accepted submissions;
- who exported it and when;
- a SHA-256 digest over its canonical content.

The API server should sign the record instead of relying on the digest.

On production it is imported and checked. It must:
- be for the same registry;
- be for the template being approved;
- come from the **release production is running**;
- come from a validation instance;
- have enough accepted submissions;
- have an intact digest.

A record that fails any check is refused, and the refusal is audited.

## 5. Template versions and the local overlay

### Template versions

Each registry definition is a versioned template (`vYYYY.Q.X`, starting at `v2026.4.1`). Each version has:
- a change class;
- an effective date;
- a change list naming the elements it changes: code sets, identifier, demographics, diagnosis, segments, transport, eligibility.

### The local overlay

A site's local changes are an overlay, and each is stamped with the version it was made against:
- code mappings;
- the identifier hold;
- local rules in the engine adapter (a facility-specific mapping, a custom segment rule, a local transform).

A release never overwrites them. When a newer version changes an element a local change relies on, that change is flagged "needs review". It then blocks go-live until someone confirms it, which re-stamps it to the latest version.

### When re-approval is needed

| Change | Re-approval | Live results held from |
|---|---|---|
| editorial | never | — |
| minor | only if it touches something the site customised (a minor version with no change list counts as touching everything) | effective date + 30 days |
| breaking | always | effective date |

## 6. Go-live on production

### Request

Requesting go-live needs the registry's manage capability. The pre-checks are:
- the template is the latest;
- the specification is verified, or the lab confirms it;
- codes are mapped (screening);
- the identifier hold is on (screening);
- the agreement is recorded;
- the validation record is valid;
- local changes are reviewed;
- the registry's test sign-off reference is recorded.

### Approve

Approving needs `registry:live-register:approve`:
- The approver states their capacities: Site Administrator, Lab Director, or delegated Lab Director designee.
- They then re-enter their credentials: the password, or the identity provider's re-sign-in. This goes through the same confirmation, one-time-use and lockout checks as report sign-out (`signatureGate.accept`, action `registry-go-live`).

### Approval settings

The settings have Template Review's shape. They need `config:registry-go-live:manage` and are audited.

| Setting | Go-live default | Template Review default |
|---|---|---|
| Allow self-approval | **on** | off |
| Approvals required (1–3) | 1 | 1 |

A Lab Director or designee must be among the approvers.

### On going live

- **Permanent statement:** the approval writes a statement naming everyone who approved, their capacities, how they re-confirmed their credentials, and when. For example: "Live Register switch for csms_uk (template v2026.4.1) executed by Pete Nimmo (3) acting in dual capacity as Site Administrator and delegated Lab Director designee, who also prepared the request, authorized via step-up credential verification (password re-entry) on …".
- **Catch-up:** every result held for that registry is resent, each one re-validated and permission-checked. The worklist also has **Resend all** under "Attestation required".
- **Stop live reporting:** this ends the live record, and results are held again. A production instance never falls back to a test system.

## 7. Endpoints

| Method | Path | Capability | Instance |
|---|---|---|---|
| `GET` | `/api/registry/{domain}/{registryId}/connection` | screen access | either |
| `POST` | `/api/registry/{domain}/{registryId}/agreement` | manage | either |
| `POST` | `/api/registry/{domain}/{registryId}/test-suite` | `registry:test-suite:run` | validation |
| `POST` | `/api/registry/{domain}/{registryId}/validation-record/export` | manage | validation |
| `POST` | `/api/registry/{domain}/{registryId}/validation-record/import` | manage | production |
| `POST` | `/api/registry/{domain}/{registryId}/go-live` | manage | production |
| `POST` | `/api/registry/go-live/{id}/approvals` (`capacities`, signature proof) | `registry:live-register:approve` | production |
| `POST` | `/api/registry/go-live/{id}/withdraw` | manage | production |
| `POST` | `/api/registry/{domain}/{registryId}/stop-live` | manage | production |
| `POST`/`DELETE` | `/api/registry/{domain}/{registryId}/adapter-rules` | manage | either |
| `POST` | `/api/registry/{domain}/{registryId}/local-changes/confirm` | manage | either |
| `PUT` | `/api/registry/go-live/settings` | `config:registry-go-live:manage` | production |
| `POST` | `/api/registry/submissions/{queue}/{entryId}/capa` | `screen:registry-exceptions:open` | either |

## 8. SQL Server notes

- `registry_go_live`: one row per request.
- `registry_go_live_approval`: the approvals, as a child table.
- `registry_agreement`, `registry_adapter_rule` and `registry_validation_record`: stored as JSON, with digest and direction.

These tables are append-only apart from status and the closing columns, and rows are never deleted.

## 9. CAPA from a failed submission

The Registry Exceptions worklist has **Capture as CAPA**. It raises an open case-level deficiency of type `def-registry-submission-failure`, which enters the CAPA lifecycle in Quality Assurance → Operations. Only one can be open per submission at a time.
