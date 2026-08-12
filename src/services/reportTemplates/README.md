# services/reportTemplates/

Report Template assembly — ordered AssemblySlots referencing reportParts/ building blocks. Also home to TemplateRoutingService, the Pass 0-3 resolution chain.

**Pattern:** Standard interface/mock/firestore pattern for the CRUD side; TemplateRoutingService.ts is separate routing logic.

## Files

- **`TemplateRoutingService.ts`** — Client override -> Physician preference -> Synoptic protocol -> Subspecialty -> Gold Standard resolution chain for which report template a case gets.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*