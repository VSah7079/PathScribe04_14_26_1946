# services/deployment

Batch 424. `deploymentInstance.ts` says which kind of PathScribe instance this deployment is (Pete, Oct 1 2026: "Testing occurs on the test system before updating prod").

| Role | When | Registry traffic |
|---|---|---|
| `production` | `VITE_APP_ENV=production` | real results to live registers, once go-live is approved |
| `validation` | anything else, or unset | only the synthetic test suite, only to registries' test systems |

An instance nobody declared as production is a validation instance, so it fails closed: it can never reach a live register. The role belongs to the deployment, set alongside its endpoints and credentials, and nothing in the app changes it. The sign-in page's environment badge reads the same setting.

`release` is the PathScribe version running, from `__APP_VERSION__`. A validation record names the release it validated, and production accepts only one for its own release.

Readers: `services/registryGoLive/` (the send gate) and `services/interfaceDispatch/registryPayloadBoundary.ts` (the last check before dispatch).
