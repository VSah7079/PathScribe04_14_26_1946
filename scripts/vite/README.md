# scripts/vite

Build plugins used by `vite.config.ts` (type-checked by `tsconfig.node.json`).

- `preloadAppStart.ts` (Batch 549, PS-539 phase 2d):
  - `main.tsx` reads the deployment's `config.json` before it loads the app (`startApp.tsx`).
  - This plugin adds `<link rel="modulepreload">` tags to `index.html` for `startApp.tsx`'s chunk and its static imports, so the browser downloads that code while config.json is read. The code still runs only after config.json has been checked.
  - The chunk walk is in `../static-chunk-closure.mjs`, so `src/services/runtimeConfig/preloadAppStart.test.ts` can test it without building the Node project.
  - Applies to builds only.
- See `docs/architecture/RUNTIME_CONFIG.md` §5.
