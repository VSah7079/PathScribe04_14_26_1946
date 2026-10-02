# Structured synoptic result v1.0.0: what PathScribe sends the interface engine

**Status:** browser side built and tested (Batch 426, Oct 1 2026). Two parties build on it:
- the interface engine (BridgeLink, PS-331) maps it into the LIS;
- the API server (PS-345) sends it.

**Source:** Pete and his developer, Oct 1 2026: "Assist Synoptic Dispatch … using this exact v1.0.0 payload"; "One PDF per Workup".
**Code:**
- `src/services/reports/synopticResultPayload.ts`: the builder (pure, tested);
- `dispatchAssistSynopticResult.ts`: Assist;
- `buildOruR01Payload.ts` `synopticResult`: Orchestration;
- `workupPdf.ts` and `functions/main.py` `workup`: the PDF.

## 1. When it's sent

| Mode | Message | When | The workup's PDF |
|---|---|---|---|
| Assist | `LIS_SYNC`, kind `final` | Finalize (signed). With a release buffer, when the buffer runs out | Required: without it the message is held and retried from the outbound dead-letter screen (the Batch 392 rule) |
| Assist | `LIS_SYNC`, kind `corrected` / `corrected_with_addition` | A correction is re-signed | Required |
| Assist | `LIS_SYNC`, kind `new_instance` | An addendum workup is finalized | Required |
| Orchestration | `ORU_R01` (`synopticResult` alongside the narrative and the full report PDF) | Sign-out / release, correction, addendum | Best effort (`workupPdf`, or `workupPdfError`); the full report PDF is the one held for |

In Assist the LIS owns the formal report. PathScribe sends the synoptic for the LIS to put into it.

The Assist message also carries `embeddedHeader` and `fullPayloadText` (label: value lines, and for a correction what changed), for an LIS that only takes text.

## 2. Identity and replacement

- `header.pathscribe_report_id` = `PSR-{caseId}-{instanceId}`: one per synoptic workup, the same for every version.
- `header.workup_version`: 1 for the first release, plus one per later message for that workup. `header.workup_status`: `FINAL`, `CORRECTED` or `ADDENDUM`.
- `header.pdf_document_id` = `{pathscribe_report_id}-V{version}`: the id of that version's PDF.
- **The LIS replaces the earlier version of the same `pathscribe_report_id` and leaves every other workup alone.**
- **One combined PDF per case (Batch 427).** This is for a lab whose LIS takes one PDF per accession. It is a setting on the testing (performing-lab) facility: Facility Dictionary → LIS Integration → "Send one combined PDF per case". With it on:
  - each workup's message carries no PDF of its own, and its `header.pdf_document_id` names the case PDF, `PSR-{caseId}-CASE-V{n}`;
  - one more `LIS_SYNC` message of kind `case_pdf` carries `casePdf` (every finalized workup in one document, pages running on) plus the list of workups and versions it contains;
  - each release sends a new version: every workup at Finalize, or the whole case again after a correction or addendum to one workup. The structured data still says exactly which workup changed;
  - with no combined PDF, the `case_pdf` message is held, while the structured results still go.
  - **Orchestration** results then carry only the full report PDF (no per-workup PDF), and `pdf_document_id` is null.

## 3. Fields

```json
{
  "$schema_version": "1.0.0",
  "mode": "assist",
  "header": {
    "pathscribe_report_id": "PSR-S26-4493-i1", "pdf_document_id": "PSR-S26-4493-i1-V1",
    "accession_number": "S26-4493", "placer_order_number": "ORD-2026-10091", "filler_order_number": "LIS-2026-44912",
    "specimen_ids": ["A", "B"], "workup_status": "FINAL", "workup_version": 1,
    "template": { "id": "CAP_COLON_RESECTION", "name": "Colon Resection", "version": "4.2.0.0" },
    "signature": { "signer_id": "1", "npi": "1234567890", "signed_timestamp": "2026-10-01T11:21:00Z" }
  },
  "patient_context": { "mrn": "MRN-902182", "encounter_id": "ENC-77102" },
  "specimens": [{
    "specimen_id": "A", "description": "Sigmoid colon resection",
    "snomed": [{ "code": "71854001", "display": "Colon", "system": "SNOMED CT", "version": null }],
    "icd10":  [{ "code": "C18.7", "display": "…", "system": "ICD-10-CM", "version": null }],
    "icd_o_3": [{ "code": "8140/3", "display": "…", "system": "ICD-O-3", "version": null }],
    "suggested_cpt_codes": [{ "code": "88309" }]
  }],
  "staging": { "ajcc_edition": "AJCC 8th", "pT": { "value": "pT3", "snomed": "…" }, "pN": null, "pM": null, "figo": null },
  "synoptic_observations": [
    { "field_id": "size", "label": "Tumor Greatest Dimension", "value": "3.5", "unit": "cm", "block_id": null,
      "snomed": { "concept_code": "…", "value_code": null, "system": "SNOMED CT", "version": null },
      "overridden": false, "ai_suggested": true }
  ]
}
```

Rules:

- **Codes are lists.** A specimen can carry several of each.
  - Every code has its `system` and `version`.
  - A version the deployment hasn't set is `null`, never guessed. The server sets them from its loaded terminology release (`DEPLOYMENT_CODE_SYSTEM_VERSIONS`, PS-345).
- **CPT: Assist only, as suggestions, without modifiers** (`-26`/`-TC` stripped).
  - The LIS decides the final codes and the modifiers (Pete's decision).
  - Orchestration sends none here, because its charges go on PathScribe's own billing feed.
- **Staging comes from template fields tagged with a reporting role.** The roles are `pT`, `pN`, `pM` and `figo`, set in the template editor's "Reports as".
  - Each is coded with the chosen answer's SNOMED CT concept.
  - `ajcc_edition` is the template's "Staging edition".
  - A template with no tagged field sends `null`.
- **Observations.** There is one per answered field, in template order.
  - **Choice fields** send the answer labels. `value_code` is the chosen answer's SNOMED CT code. A multi-select sends `value` as an array and `value_codes` instead of `value_code`.
  - **Numeric fields** send `value` and `unit` (the field's unit), with no value code.
  - **`block_id`** is set for a field tagged with the role `block`.
  - **`overridden`** is true when the pathologist's answer differs from the AI's suggestion or they disputed it. **`ai_suggested`** is true when the AI suggested anything for the field.
- **Patient context is MRN and encounter only.** Name and birth date stay out; the accession and MRN bind the record.
- **Order numbers.**
  - **Assist:** placer (ORC-2) and filler (ORC-3) as the engine sent them on the inbound updates (`placerOrderNumber` / `fillerOrderNumber` on the webhook JSON, or ORC-2/3 on HL7), echoed back, so the engine keeps no state table.
  - **Orchestration:** the EMR order number is the placer and the accession the filler.
- `specimen_ids` lists every part the workup covers: its own part plus any parts combined into it. Since Batch 427, a draft workup's parts are set in the case's report sidebar with the "Parts covered" button (⧉): Independent, or Combined across the parts ticked.
  - A part can't be covered twice by the same protocol.
  - The AI's template proposals don't add a second workup of that protocol for a covered part.
  - The AI is told which parts each workup covers (`generateSuggestions` scope). Evaluating them together, for example a combined tumour size or the worst grade, is up to the real AI service; the demo one ignores it.

## 4. The workup's PDF (and the case PDF)

The report renderer draws one workup from the render request's `workup` block. No report layout is needed.

It contains:
- the case header;
- the parts, protocol and version, status, workup version, signer and document id;
- the workup's answers;
- for a correction, "Changed in this version" (field: before → after).

The wording follows the report's language (`surgicalReportPdf.workup*`). A combined case PDF uses `workups: [...]`, each item drawn the same way, one after another in a single document.

## 5. Inbound: order numbers on the Assist intake (PS-331)

The webhook JSON takes two optional fields, `placerOrderNumber` and `fillerOrderNumber`. The HL7 reader takes ORC-2/ORC-3, or OBR-2/OBR-3 if those are missing. The case's order keeps them.

## 6. Re-evaluated fields ("keep or update?")

When new or changed narrative arrives on an Assist case, the AI re-reads it:
- **A field nobody has touched** is refilled.
- **A field the pathologist typed or confirmed** (the developer's `PATHOLOGIST_LOCKED`) is never changed. If the new suggestion differs, it is kept beside the field (`reevaluations`). The synoptic panel then shows "The updated narrative suggests X — Keep mine / Accept new value". Accept makes the new value the answer, confirmed.

Before Batch 426 a new suggestion replaced the confirmed one's record, so a later run could overwrite a confirmed field. That is fixed.

In Orchestration, re-running AI suggestions after dictation is still the pathologist's own action, reviewed field by field in the AI Review window.
