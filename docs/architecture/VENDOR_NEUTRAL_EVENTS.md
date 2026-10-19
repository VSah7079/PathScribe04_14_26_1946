# Vendor-neutral events: what PathScribe sends, and what the engine maps (Oct 16, 2026)

**Purpose.** Roche (Vantage) and Leica (Cerebro) specifications are not available yet, and none will be asked for until a mutual NDA is signed and the provisional patent is filed. This note records why the front end does not wait for them, and what is still open.

## The rule
PathScribe publishes **one vendor-neutral message** for each thing that happens. The **interface engine** (BridgeLink/Mirth, `INTERFACE_ENGINE_EDGE.md`) turns it into what Vantage, Cerebro or any other system expects. Nothing vendor-specific goes into PathScribe's event types. This is already built that way:
- Message set: `PathScribe_Interface_Specification_v1_2.docx` (inbound patient and encounter events, outbound orders and results, §8 cassette dispatch) and `src/types/events/`.
- Vendor seam: `src/services/hl7/adapters/`. `identityAdapter` works. `vantageAdapter` and `cerebroAdapter` are **deliberate stubs that throw**, because no field-verified guide exists. They stay stubs until a real integration guide arrives.
- Patient data: `patientDataScope` ('reference' or 'full'), Interface Specification §2.6.

## What each vendor needs from the events we already have

| Need | PathScribe event (neutral) | Direction |
|---|---|---|
| Label/order for specimen, block or slide | `ModeAOrderPayload` (SPECIMEN_LABEL, BLOCK_ORDER, SLIDE_ORDER) | Out |
| Cassette colour, type and fallback | Cassette dispatch request/outcome (spec §8, `CassetteDispatchOutcomeEventPayload`) | Out / In |
| A scan happened at a station | `MaterialScanEventPayload` | Out |
| Where material is now (workflow stage) | `MaterialLocationEventPayload` | In |
| Lost or damaged block | `BlockExceptionEventPayload` | In |
| Patient admit/merge/transfer | Spec §3 and §4 | In |

## Possible gaps (to confirm with the vendors, not to guess)
`ModeAOrderPayload` carries: IDs (case, accession, specimen, block, slide), department, stain code, urgency, and the site/organisation. It does **not** carry: patient name or date of birth, specimen description, collection date and time, or ordering provider. That is deliberate for now, because the receiving system normally has demographics from its own feed (§2.6). If a vendor's label or order needs them, add them **to the neutral event with the existing `patientDataScope` rule**, never as a vendor-specific field. The questions that settle this are in the question list: questions 6 and 9 (both vendors), R1 and L3.

## What stays blocked until the specifications arrive
- Field-level mapping and testing against a real Vantage or Cerebro: engine work (PS-50, PS-53, PS-88, PS-360), not front end.
- The two adapters (`vantageAdapter`, `cerebroAdapter`), if the engine does not do the mapping alone.

## Not blocked
Everything on the PathScribe side: the neutral events, queues, retries, the Audit Log screens, and the scan and label flows.

## Before anything is sent to a vendor
Provisional patent filed (or the attorney's written OK), mutual NDA signed (reviewed by the attorney), and only the question list is shared. Pete's attorney decides, not this note.
