# .github

Batch 615 (PS-471).

| File | What it does |
|---|---|
| `workflows/ci.yml` | The checks that run on each batch, run on every push to `main` and every pull request: type check, lint, the test suite and the production build (Node from `.nvmrc`), and the Python report-renderer tests (`functions/test_main.py`, `functions/test_report_delivery.py`). Only takes effect once the repository is on GitHub (PS-468). |

The firestore rules test is left out of `npm test` already (`vitest run --exclude firestore.rules.test.ts`), because it needs the Firebase emulator that SQL Server replaces.

Branch protection (a required pull request and passing `CI` before merge to `main`) is a repository setting, not a file; it is set when the repository is connected.
