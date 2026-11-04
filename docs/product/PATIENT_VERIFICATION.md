# Patient verification, outside case tracking and manual entry audit (Batch 759)

**Source:** "PathScribe Technical Specification: Patient Verification, Outside Case Tracking, and Audit Logging", version 1.0, approved for development (Pete Nimmo, Nov 2, 2026). Scope: the laboratory workflow (Grossing, Embedding, Microtome, Cytology and the associated workspaces).

**Status:** Built (Demo), browser side. The server side follows `docs/architecture/STATION_TRACKING_API.md` (the `typed` action) and the audit API.

## Four voices

- **Practitioner:** The bench screens no longer show the patient's name, date of birth or MRN. You check two things on the container, cassette or slide: the accession number and the specimen part and source. An outside case also shows its own case number from the hospital it came from, highlighted beside ours, so you never need the paper requisition. If the scanner won't read a label, type the id: it opens straight away, a line reminds you what to check, and the typed entry is noted quietly.
- **System administrator:** Nothing to set up. Enter the outside case number at Accession (Outside / Contract Case → Outside Patient Data → Originating case). Typed entries appear on the audit log as "Manual Entry" and in each case's scan history as "Typed, not scanned", with the time, the workstation and the user.
- **Marketing:** Positive patient identification without patient names on open bench monitors: two non-PHI identifiers at every bench, dual IDs for every outside case, and a quiet audit of every typed entry, with no PIN prompts and no extra clicks.
- **FormedrixAI/partners:** Built and tested in the browser against the demo services. The typed-or-scanned decision is made from keystroke timing in the browser; a scanner set to send slowly, or with a long delay between characters, will be recorded as typed. The flag is not written into the case record (Pete's decision, Nov 2, 2026), so it is on the audit trail and the station log only. No demo case is seeded as an outside case yet: make one at Accession. The originating case number is entered at Accession only (not editable on the case afterwards), and there is no separate consultation intake type: an outside or consultation case is accessioned as Outside / Contract Case.

## What each requirement became

| Spec | Built |
|---|---|
| §1 No patient names on bench queues and task screens | Embedding, Microtome, Cytology Preparation, Add-On Order Builder and Margin Exception Review show no name or date of birth; Molecular Batch Management no longer shows the MRN. Accession, the report screen and the Worklist keep the patient's identity: they are where identity is established or the diagnosis is made. Batch 760 (Cytology Workspace & Automated Screening Module spec §2.1): Cytology Screening, its Ask a Colleague window and the Cytology Worklist now hide the name, date of birth and MRN too, and show the accession, the vial type and the slide ids (`services/cytology/cytologyBenchIdentity.ts`). |
| §2.1 Dual identifiers for outside cases | Accession → Outside Patient Data → **Originating case**: the originating case number and institution, saved with the case (`order.originatingCase`, `types/case/OriginatingCase.ts`). The **Foreign case ID** shows, highlighted, beside the accession on Embedding, Microtome, Cytology Preparation, Add-On Order Builder, Margin Exception Review, the Grossing screen and the report screen header. When the block, decant or specimen being worked has its own outside number (the Outside Lab Specimen / Accession ID entered at Accession, or a block's foreign ID), it shows as **Foreign ID**. |
| §2.2 Non-blocking manual entry flag | Every station scan field (all benches, Grossing, Add-On Orders, Batch Management) and the header search tell a scan from a typed id. A typed id goes through at once. The flag is written to the audit trail (event "Manual Entry": time, workstation, user name and id, module, what was typed, the case) and, at a station, to the station scan log (action `typed`, shown in the case's scan history as "Typed, not scanned"). |
| §2.3 Two non-PHI identifiers | After a typed entry, the screen shows "Typed, not scanned: check the container shows {accession} and {specimen source}." It needs no click and goes away with the next scan. |
| §3 Automated scan | Unchanged: a scan loads at once and is recorded on the station log as before. |

## How a scan is told from a typed id

`services/scanEntry/entryMethod.ts`: an entry is a scan when every character came as a key press, at least five of them, half the gaps at most 50 ms and none over 200 ms (a keyboard-wedge scanner sends a key every 5 to 20 ms; a person types every 100 ms or more). A paste, a deleted character, the touch keyboard or dictation makes it a typed entry.

## Files

`services/scanEntry/` (entryMethod, lastEntry, manualEntryLog), `services/material/benchIdentity.ts`, `services/cases/originatingCase.ts`, `hooks/useManualEntryRecorder.ts`, `hooks/useTypedEntryCheck.ts`, `components/Workstation/BenchIdentity.tsx` (ForeignIdTag, TypedEntryCheck), `components/Workstation/StationScanField.tsx`, `components/Search/CaseSearchBar.tsx`, `pages/AccessionPage/OutsideCaseCard.tsx`.
