# services/labels

Batch 518 (PS-123). Reprints labels for many cases at once.

The label builders and printers themselves live in `utils/labels/`. Each printer already audits its own prints (PS-282, `labelPrintAudit.ts`).

| File | What it does |
|---|---|
| `batchLabelReprint.ts` (+ test) | Finds cases by accession date and/or accession number range (an empty filter finds nothing). Lists the requisition, container and cassette labels for the chosen cases, then prints them one at a time with a 250 ms pause, reporting "X of Y". Failed labels can be retried. Every run and every retry checks `label:batch:reprint`. The lab's on-demand guardrail blocks cassettes, as "print all cassettes" on the case page does. Pure apart from its dependencies. |
| `batchLabelReprintDeps.ts` | The app's real dependencies: the label printers, the print settings (guardrail, GS1 GTIN, cassette layout), the printer profiles, the run log and the authorization service. |
| `mockLabelReprintRunService.ts` | The kept runs, newest 200 (`pathscribe_label_reprint_runs`, cleared by Full Reset): who ran it, when, each label and its outcome. |

**Who has the permission.** `label:batch:reprint` is seeded to Histotechnologist and Admin (Pete, Oct 2).

**Screen.** Batch Management → Label reprint (`pages/BatchManagement/LabelReprintPage.tsx`).

**Differences from the proposal** (each is a decision for Pete, recorded on PS-524):
- The screen sits under Batch Management, not Audit Log → Interfaces, because Histotechnologists don't open the Audit Log.
- Labels go through the label printers rather than the report Print Queue (`PrintJob`), which carries report PDFs. The run log and retry stand in for the queue's audit and retry.

**Still open**
- Printing on real hardware still needs a manual check.
- Without a hardware bridge, requisition and container labels open the browser print dialog once per label.

## Batch 617 (part B): server version (PS-514)

The batch label reprint run service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/DELIVERY_PRINTING_API.md`. The interface (`ILabelReprintRunService`) is new; it was an untyped object.
