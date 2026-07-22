# components/Config/Models/

AI model performance/version comparison tab.

**Pattern:** Single clean component over `services/models/`.

## Files

- **`index.tsx`** — `ModelsTab`. Clean, small, correctly wired to
  `modelService` (`services/models/IModelService`). Status styling for
  Active/Retired/Beta. No issues.

## Notes

- No issues.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
