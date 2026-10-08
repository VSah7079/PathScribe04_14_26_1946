

# services/security

## Batch 444: nothing secret in the browser bundle

`envExposure.guard.test.ts` keeps keys and passwords out of the JavaScript every visitor downloads. On code, outside tests:
- every `import.meta.env` read names its variable (`import.meta.env.VITE_X`). Reading it as a whole object (`(import.meta as any).env?.X`, `import.meta.env[name]`, passing `import.meta.env` to a function) makes Vite copy **every** `VITE_` variable in `.env` into the bundle;
- no `VITE_` variable named like a key, secret, password or token, except `VITE_NCBI_API_KEY` (listed with its reason);
- no request straight to an AI vendor host;
- no key header set in the browser;
- the stored AI settings type has no key field.

The production proxy contract is `docs/architecture/AI_PROXY.md`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-48)

`xlsxRemoved.guard.test.ts`: fails if the vulnerable `xlsx` package returns to any `package.json` section, `package-lock.json`, or an import in `src/` or `scripts/`.
