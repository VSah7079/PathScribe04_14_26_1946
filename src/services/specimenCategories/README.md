# services/specimenCategories/

Coarse-grained specimen classification controlling workflow at Accession (e.g. 'Surgical Tissue') — the level ABOVE the fine-grained Specimen Dictionary entry.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Deliberately separate from services/specimenDictionary/ — see that folder's README for the fine-grained counterpart. A SpecimenEntry references a specimenCategoryId, letting an incoming order resolve to a known workflow before the specific dictionary entry is resolved.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*