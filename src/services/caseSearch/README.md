# services/caseSearch/

**Case search, done by the server (Batch 350).** Pete: "the search is largely broken … results should be paged so that the heavy lifting is done on the server side."

The Search page sends criteria, a sort and a page number. The service:
1. applies the user's access rules;
2. matches the criteria;
3. sorts, with a stable tiebreak;
4. counts;
5. returns that one page.

Export runs the same search and returns up to 5,000 rows. The .NET API server implements the same contract: [docs/architecture/CASE_SEARCH_API.md](../../../docs/architecture/CASE_SEARCH_API.md).

## Files

- **`caseSearchTypes.ts`**: the contract.
  - `CaseSearchCriteria`, `CaseSearchRequest` and `CaseSearchPage`.
  - Sort keys, page sizes (25/50/100, at most 100) and the export limit.
  - The options the page offers: 16 statuses (all but `claiming`), priorities, and sexes `M/F/U` as recorded.
  - `CaseSearchDraft`: what the user filled in, and what a saved search stores.
- **`caseSearchMatching.ts`** (+ `.test.ts`): the matching rules, ordering and page bounds. Pure. It fixes the filters that never worked before:
  - **Diagnosis** read fields that aren't on a case.
  - **Requisition / order numbers** were compared to accession numbers.
  - **Pathologist** matched only the assigned pathologist; it now also matches the signer, the accepting pathologist and participants.
  - **ICD** matched ICD-10 only.
  - **Synoptic protocols** used a hard-coded list of the wrong template ids.
  - **Flags** missed the older inline flag records most demo cases carry.
  - **Dates and ages:** a case with no date or DOB passed those filters.
- **`createCaseSearchService.ts`** (+ `.test.ts`): the service, built from its dependencies:
  - `loadAccessibleCases`, `loadPhysicianNames`, `loadFlags` and `auditExport`;
  - `search()`: access-filtered cases → match → sort → count → page;
  - `exportRows()`: every match up to the limit, as data (codes and ISO dates), audited.
- **`mockCaseSearchService.ts`**: wired to this build's data.
  - Accessible cases come from `caseRouter.getAll()`, which applies the organisation and pool rules and audits the search.
  - Orchestration cases are included by the session user's permission, not the caller.
  - Exports are audited as "Case Search Export", with a count and no patient data.
- **`ICaseSearchService.ts`**: the interface. `@/services` exports the service as `caseSearchService`.

## Notes

- **Access rules come first.** Before, the case list cut a page and then removed cases the user couldn't see, so pages came back short and counts were wrong. Here the access rules apply before anything is matched or counted.
- **Page numbers, not cursors.** Search shows "page 3 of 13" and a total. The internal case list keeps its cursor paging for other callers (`services/cases/`). See the API document for the SQL Server reasoning.
- **In this build**, step 1 loads every accessible mock case into memory. That is the mock database; the API server does all of it in one query.

## Batch 613 (part A) — case search reporting

- **`synopticValueCriteria.ts`** (+ test): search on synoptic answers. A criterion is `{ templateId, fieldId, operator, value }` with nine operators; a case matches when one of its reports from that protocol has a matching answer; all criteria must match; at most 10. The catalogue of questions is built from the protocol registry (grids and the Mohs map are not searchable). `isNot` needs an answer.
- **`caseSearchReport.ts`** (+ test): the report engine, pure. Groups by pathologist (signer, else assigned), month (on the search's date basis), diagnosis (spacing and case ignored), facility, case type, status, priority or subspecialty; share; median days accession to sign-out; at most 500 groups (the rest folded into one); a group's cases; list rows with at most 24 columns, standard or `synoptic:<templateId>:<fieldId>`.
- `ICaseSearchService` gains `report`, `exportReport` (needs `search:case-report:export`, audited as `case-search-report` with counts only) and `listSynopticProtocols`. `loadReferenceData(needs)` loads the protocols' questions only when a search or report uses them. Contract: `docs/architecture/CASE_SEARCH_API.md`.

## Batch 351: section 3 of the gap analysis

Pete chose "all 15" of the new searchable case data.

**New criteria** (`caseSearchTypes.ts`; rules in `caseSearchMatching.ts`, also in the API document §5):
- **Case type:** surgical, gyn cytology, non-gyn cytology or autopsy. Uses the Worklist's own `resolveCaseDisciplineBranch` / `resolveCaseHasSpecimenCategory`.
- **Date basis:** the date range can apply to the accession, sign-out or release date (`dateBasis`; `accessionDateFrom/To` became `dateFrom/dateTo`). A new sort, sign-out date newest first.
- **Pathologist role:** any, assigned, signed out, resident, countersigner or delegated to.
- **Revisions:** amended, corrected or addended (the case, a report, or a released amendment record).
- **Holds:** active case, retention and autopsy ancillary holds.
- **Result flag:** Abnormal, Critical, Malignant.
- **Pending work:** open stains, IHC, molecular, add-on orders.
- **Past TAT target:** open past the target, or signed out after it.
- **Subspecialty:** recorded, else from protocols, else from specimen routing.
- **Organisation:** performing lab, ordering location.
- **Intake:** standard, downtime, outside, reference lab.
- **Billing:** payer and billing type text; CPT codes.
- **Autopsy:** jurisdiction, authority, and which reports are signed.
- **Also:** diagnosis text now includes the synoptic grade and biomarkers; order numbers include lab and block numbers.

**Service changes**
- **`createCaseSearchService.ts`:** one `loadReferenceData()` dependency replaces the two loaders. It supplies what matching joins: physician names, flags, the specimen and stain dictionaries, performing labs, released amendments, countersigns, open delegations, and the subspecialty and TAT resolvers.
- **Export** gained a sign-out date column.

**Found, disclosed**
- **Demo data:** most demo cases carry none of the new data. Holds, the abnormal marker, locations, intake, payer and autopsy details match nothing in the demo. Sign-out dates exist on one case. Performing lab resolves for only some cases. Batch 352 added the 11 missing ordering clients (Manchester, Midwest, Henry Ford, Desert Valley outreach). The Desert Valley cases at `c1`–`c4` still resolve to no lab: those facilities exist but have no lab link (the Batch 351 note wrongly said their ids were missing).
- **TAT and delegations:** done in Batch 353. Reference data now reads `mockTatTargetService` (resolver: `tatConfig/tatTargetResolution.ts`) and `mockDelegationService`.

## Batch 354: organisation filters include what is under them

- **Change:** the submitting-facility and performing-lab filters now include every facility under a chosen one (`Facility.parentId`, any depth). Choosing an NHS Trust finds its sites' cases.
- **How:**
  - `caseSearchMatching.ts → expandOrganisationCriteria` runs once per search, before matching (`createCaseSearchService.ts`).
  - The reference data gained `parentFacilityIdById`.
  - The hierarchy walk is `services/facilities/facilityHierarchy.ts`.
- **Screen:** a hint under both filters says a Trust includes its sites (`searchPage.includesSitesHint`, five languages).
- **API spec:** §5 of `docs/architecture/CASE_SEARCH_API.md` (a recursive CTE on the server).

## Batch 372 (support access)

`createCaseSearchService` takes an optional `auditSearch({ fieldsUsed, total })`, called on every run. `usedCriteria(criteria)` gives the names of the criteria that were filled in, never their values. The mock wires it to `supportAccess/recordSearch`, so a search by ForMedrixAI support is recorded in the support audit of each organisation it can currently reach.

## Batch 436 (PS-101)

`searchHitFlags.ts`: the flag chips on a header-search result. It reads the case's `caseFlags`, both references to flag definitions and inline flags. It keeps administrative and computational flags, skips deleted ones, and shows at most four, in the flag's own colour (slate when it has none). The search bar used to read a `flags` field that cases don't have, so no result ever showed a flag. Test: `searchHitFlags.test.ts`.

## Batch 437 (PS-357)

- `exportRows` checks `search:case-results:export` first (`deps.authorizeExport`). A refusal returns `EXPORT_NOT_PERMITTED` and no rows; before, anyone who could search could export.
- The export's audit entry is now the shared document-export entry (`printing/documentOutputAudit.ts`).

## Batch 473 — Case-type key migration

`CaseSearchAutopsyAuthority` and `CASE_SEARCH_AUTOPSY_AUTHORITIES` renamed in step with `AutopsyCaseAuthority`: `'medicolegal_forensic'` → `'statutory_judicial'`. No behavior change. See `services/autopsy/README.md`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

The mock also exports `loadCasesForSessionUser` and `createMockCaseSearchServiceOver(load)` so scheduled reports can build a report as another recipient (Batch 613 follow-up).

## Batch 617 (part A): server versions (PS-514)

`caseSearchService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CASE_SEARCH_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
