# services/privacy

**Batch 396.** `casePrivacy.guard.test.ts` holds Pete's case privacy model (`docs/architecture/CASE_PRIVACY_MODEL.md`) at source level:
- message links come only from cases the reader can open;
- both case-view routes decide through `openCaseForView`;
- no screen puts the reason a case is unavailable in the address (`accessDenied=`);
- the missing and no-access screens share one message;
- signing out clears the inbox.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
