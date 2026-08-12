# services/routingRules/

Admin-defined template routing rule persistence — overrides that take priority over the default Pass 0-3 resolution chain.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Works alongside services/reportTemplates/TemplateRoutingService.ts — see that file for the full priority order.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*