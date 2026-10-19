**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/registryGoLive

Batches 423–424 (Registry Engine SRS v2.1, step 7; PS-359). This folder covers how a registry connection (screening or cancer) moves from Pending through testing to its **live register**, across the two PathScribe instances. The server contract is `docs/architecture/REGISTRY_GO_LIVE_API.md`.

| File | What it does |
|---|---|
| `registryTemplateVersions.ts` | Each registry definition as a versioned template, `vYYYY.Q.X`, starting at `v2026.4.1`. Each version carries a change class, an effective date and (Batch 424) a change list by element. `registryLiveStatus` says whether a live approval on an older version still lets results through. A breaking change always holds from its effective date. A minor change holds 30 days after its effective date, but only when it touches something the site customised. Pure. |
| `registryOverlay.ts` | Batch 424. The site's local changes on top of the baseline, each stamped with the version it was made against: code mappings, the identifier hold, and the engine adapter's local rules. `localChangesNeedingReview` lists those a newer version touched. `stampCodeMappings` keeps an unchanged mapping's stamp on save. Pure. |
| `registrySendGate.ts` | Batch 424. The one send / hold / skip decision every submission path asks first. Pure. |
| `syntheticTestSuite.ts` | Batch 424. The synthetic test cases (screening 3, cancer 2), built through the real builders. Each has a `SYN-` patient whose national identifier passes its check digit, and carries the synthetic marker. Pure. |
| `registryValidationRecord.ts` | Batch 424. The validation record carried from the validation instance to production: build, digest, and check (registry, template, release, instance, accepted count, digest). Pure. |
| `registryGoLiveRules.ts` | Pure rules: the pre-checks, counting accepted synthetic submissions, the connection state, who may approve and in which capacities, when approvals make it live, the permanent statement, and the approval settings. The settings reuse Template Review's normalisation and counting, with self-approval **on** and one approval by default. |
| `registryGoLive.ts` | The service functions, each checking its capability and auditing. Validation instance: agreement, test suite, export. Production instance: import, request, approve with step-up (then the catch-up of held results), withdraw, stop live reporting. Either instance: adapter rules, confirming local changes, settings. Read: `loadRegistryGoLive` and `registrySendGate`. |
| `IRegistryGoLiveService.ts`, `mockRegistryGoLiveService.ts` | Go-live records, agreements, adapter rules, validation records and settings. Records only move forward and are never deleted. |
| `registryGoLiveDeps.ts` | The real wiring. The step-up runs through `signatureGate.accept` (action `registry-go-live`). The synthetic suite is sent through the real queues and `dispatchInterfaceMessage`. The catch-up resends through `resendRegistrySubmission`. `registrySendGateCheck` is what the screening, cancer and resend paths call. |

## Batch 423: the gate (Pete, Oct 1 2026)

- **One person can take a registry live.** There's no two-person rule, so a small lab isn't deadlocked. The approver states the capacities they act in and re-enters their credentials right before the change is saved.
- **The permanent statement names every capacity they acted in**, e.g. "acting in dual capacity as Site Administrator and delegated Lab Director designee".
- **Consistent with the lab's other approvals.** It has the same two settings as Template Review and the same credential check as report sign-out.

## Batch 424: two instances, test data only, the overlay

The instance role comes from `services/deployment/deploymentInstance.ts`. Unset means validation, which fails closed.

- **Validation instance:**
  - It never sends a real case.
  - Each registry stays **Pending** until its data-sharing agreement is recorded.
  - Then the synthetic suite goes to the registry's test system (**Testing**).
  - Once the registry accepts it, the validation record is exported (**Validated**).
- **Production instance:**
  - Real results go only to live registers, and only with a current approval. Until then they're held as "Held: attestation required" and resent in a catch-up on approval.
  - Synthetic cases never go to a live register.
  - Go-live needs the validation record from the validation instance, for this release and template.
- **Boundary check:** `services/interfaceDispatch/registryPayloadBoundary.ts` repeats the rules on the payload.
- **The overlay:**
  - Code mappings, the identifier hold and adapter rules are stamped with their baseline version.
  - A release never overwrites them.
  - When a newer template touches what they rely on, they're flagged for review, and go-live waits until someone confirms them.
- **The engine adapter is modelled here** until the engine team's hooks land (Pete's developer: "model it in PathScribe for now").
- **PIN dropped.** Pete, Oct 1 2026: skip the PIN option. The step-up is the password or the identity provider's re-sign-in.

## Not built

- Server endpoints.
- The engine's own copy of the boundary check.
- A screen for ForMedrixAI to publish template versions; they ship in a release.
- Server signing of validation records; the browser uses a SHA-256 digest.

## Batch 616 (part C): server versions (PS-498 to PS-504)

Each service here (the registry go-live service) now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/REGISTRY_API.md`. The mocks are unchanged.
