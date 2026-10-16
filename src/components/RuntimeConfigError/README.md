# components/RuntimeConfigError/

Batch 547 (PS-539 phase 2d). `RuntimeConfigErrorScreen` is shown instead of the app when the deployment's `config.json` can't be read or breaks a rule (`src/main.tsx`, `src/startRuntimeConfigError.tsx`).
- It lists each problem by setting name, in the user's language (`runtimeConfigError.*`), and never shows a value.
- Styles: `.ps-runtime-config-error*` in `pathscribe.css`.

See `docs/architecture/RUNTIME_CONFIG.md`.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: a problem in the API server's `/api/config` is marked as such; new problems `ADDRESS_NOT_FROM_SERVER` and `NOT_FROM_SERVER`.
