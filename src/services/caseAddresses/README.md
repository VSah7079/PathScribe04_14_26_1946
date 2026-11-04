

# services/caseAddresses

## Batch 446: no patient identifier in a page address

Case pages used to be addressed by accession number (`/case/S26-4410/synoptic`). An accession number identifies a patient, and an address ends up in browser history, bookmarks, server and proxy logs and screenshots. Case pages are now addressed by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`): random, stored beside the case, meaningless on its own (`services/supportReferences/`).

- `caseAddresses.ts` builds every case address: `CASE_ADDRESS_VIEWS` covers `synoptic`, `grossing`, `report`, `cytology`, `addOnOrders` and `emr`.
  - `addressOf(caseId, view, query?)` creates the reference the first time a case is opened.
  - `caseIdOf(param)` turns a reference back into its case. Anything else is an old accession address, to be replaced.
  - `knownCaseId` answers at once for references this session already handled.
  - `isCaseAddressReference` accepts only the exact `SR-XXXX-XXXX` form, so no accession is mistaken for one.
- `caseAddressesInstance.ts` is the app's instance, on this build's references. In production, the API server issues and resolves them.
- Used by `hooks/useOpenCase.ts` (links), `hooks/useRouteCaseId.ts` (case pages) and `loaders/synopticLoader.ts`.
- **Links go straight to the reference.** Replacing the accession after arriving would be too late, because browsers record each address a page moves to. An old address that's typed or bookmarked opens once and is replaced at once.
- `caseAddresses.guard.test.ts` fails if any other file builds a case address by hand, or puts an MRN, patient id, accession or date of birth in an address.

## Batch 527 (PS-486): a lean first load

`addressOf(…, 'emr')` returns no address in a server build (`__DEMO_TOOLS__` false), because the demo EMR window isn't built in. The EMR button then opens the in-page panel.
