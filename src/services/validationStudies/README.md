# services/validationStudies/

Validation Study governance — parallel-run comparison of AI-assisted reporting against existing workflow.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real governance state machine: draft -> pending_approval -> approved -> active -> closed -> reported. Activation is blocked until committeeApproval is recorded with a valid irbReference — a real gate, not just a status field.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*