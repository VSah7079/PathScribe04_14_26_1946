# components/Migration/

- `LegacyImportModal.tsx` (Batch 611, #132/#166): the **Import legacy file** window on Migration Jobs. Choose a source system (auto-selected when only one has mappings), a CSV or JSON file, see the preview, optionally the source's own record count, whether to create draft cases, and run. Labelled Simulated; the file name is never shown or kept. The work is in `services/migration/`. Test: `LegacyImportModal.test.tsx`.

---
*When this folder's contents change meaningfully, update THIS file.*
