# Chapter 6 open questions (Tier 5)

- Outline asks for "CAP Synoptic Reporting Module Setup" with named CAP protocols. The registry holds 36 protocols, none a licensed CAP or RCPath checklist (23 Custom, 13 PathScribe; 19 are `0.1.0-generic` placeholders). Chapter says so plainly. Confirm that is the wording you want.
- Nightly protocol sync is described in the Governing Bodies Auto-sync switch, the Upload window subtitle and `TEMPLATE_NOTIFICATIONS_API.md`, but no sync job exists in `src/`, `functions/` or the server job kinds. Documented as Not built.
- Patient portal delivery: not built. Facility `reporting.deliveryMethod` (Email, Fax, Portal, HL7) is stored and defaults to Portal, but no sending code reads it. Consider removing the Portal default or hiding the field.
- Delivery Schedules is marked Partial: I found no code in the browser build or `functions/report_delivery.py` that holds a send until its schedule time; the outbound queue only shows scheduled time and deadline flags. Confirm the production server enforces it.
- Active protocols "Sections" is an estimate (field count / 7, min 1), not a real section count. Fix in code or keep documented?
- Outline wants "Batch Printing and Nightly Job Scheduler Setup". No such screen exists; Part 4 is an index of Print Queue (Ch7), Label Reprint (Ch4), Server Jobs (Ch9), and says the scheduler is Not built.
- Synoptic editor and reviewer pages (`/template-editor`, `/template-review`) are full pages opened from these screens but not in OWNERSHIP. I documented only the metadata block and reviewer actions. Assign a chapter for the full field reference, or add them to Chapter 6.
- Template Review has no entry in `configSectionAccess.ts`; its guard is `config:template-governance:manage` (Admin only by default, not Lab Director). Intended?
- Approved Fonts list feeds editor toolbars only; Document Style has its own fixed 7-font list. The two do not share data. Intended?
- `functions/` report renderer still prints A4 and ignores the lab page size (noted in `pageSetup.ts`).
- `src/services/printing/README.md` says no admin UI sets a facility's printDeliveryConfig, but the Facility Dictionary Printing tab does. README looks stale.
- Report Template "Include in FHIR export" switch is stored but I found no FHIR export. Linked to Chapter 7 for status; check what Ch7 says.
- Pass numbering: code comments list Pass 0, 0a, 0b, 1, 2, 3; the preliminary gate before them is described as Pass -1 in the routing service. Chapter describes it as a gate.
- Capture ids missing from the manifest, shown as placeholders: `system-template_governance`, `screen-my-exports` (check), and the window captures (`templates-parts-builder` and similar).
