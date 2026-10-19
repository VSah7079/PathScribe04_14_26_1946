# Diagnosis coding across systems and revisions (Batch 594)

**Status:** the data model and rules are built (`src/services/coding/`, Batch 594) and an administrator can set the policy per jurisdiction (Configuration → System → Code Systems, Batch 595; `config:code-systems:manage`, audited). The browser applies the policy on every coding screen (Add Code window, case coding display, sign-out, outbound messages, case search, specimen edit, order message; Batches 607 and 614, Built (Demo)). The server side is a server task.

## Why
Labs will need ICD-10 and ICD-11 side by side during the transition, in several jurisdictions, with ICD-O-3 and SNOMED CT alongside. Today a case holds one list per system (`CaseCoding.icd10`, `.icd11`, ...), the code type is called `Icd10Code`, billing checks `MISSING_ICD10`, and a code does not record where it came from. Each new revision would mean new fields and edits across the app.

## The model
- **`CodedEntry`:** system, release, code, display, source, optional AI detail, optional mapped-from. Any system id is accepted, so a later revision is data.
- **Source** (new, for audit): `typed`, `map` (official map suggestion, confirmed), `ai` (model and confidence recorded, confirmed), `rule` (rule-based fallback when the AI is not allowed, confirmed), `legacy` (saved before sources were recorded).
- **Release:** stored with each signed code, so a later release never changes a signed report.
- **Cluster codes:** an ICD-11 cluster is one text value, never split.

## The rules
- **Policy per jurisdiction:** for each system, a role (`off`, `optional`, `required`) and a start date. ICD-11 can be off now, optional from a date, required from a later date. ICD-10 stays required until a rule says otherwise. The defaults ask for nothing; real requirements are set by an administrator (Planned).
- **Sign-out:** a required system with no code is reported (`missingRequiredSystems`); an optional one never blocks; a code in a system that is off is reported (`entriesOutsidePolicy`).
- **Outbound messages:** each destination names the system it expects (Planned).

## What the person coding sees (Planned)
- The system pills in the Add Code window stay (a decision from an earlier batch: suggestions are shown for the selected pill). Only the systems active for the facility's jurisdiction show, opening on the right one.
- During the transition, after a pick in one revision, one click adds the matching code in the other.
- ICD-O-3 is its own line ("site and cell type"), suggested from the synoptic answers.

## Where codes come from
Three sources, always confirmed by a person: the pathologist's own search, an official map between systems, and the AI (already in the Add Code window, gated by the jurisdiction's AI vendor policy). Where an official map exists it is shown first; the AI fills the gaps; a disagreement between the two is shown to the pathologist, not settled silently. The AI never writes a billing or registry code by itself.

## Limits
- ICD-10 to ICD-11 mapping is not one-to-one; some codes have none or several.
- Nothing here is a regulatory claim.
- The terminology server, map tables and SNOMED CT / WHO licences are server-side and legal work (India team, legal). See `docs/product/KNOWN_GAPS.md`.
- Existing cases keep their ICD-10 codes; adding ICD-11 to them is optional and later.
