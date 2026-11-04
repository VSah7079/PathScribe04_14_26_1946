# services/labelPrintRoutes/

Batch 730 (Lab Workflow & Batch spec §5, §8): **print labels at**. On the Add-On Order page, a pathologist allowed to send print jobs to another station (`print:job:redirect`) can choose a station with a slide printer; when the order is placed, the new slides' labels print there. Each label printed is recorded here, and the Microtome then records the cut without printing it again.

## Files

- `ILabelPrintRouteService.ts`: `recordPrinted` (needs `print:job:redirect`) and `getForStainOrders`.
- `mockLabelPrintRouteService.ts` (demo, mock storage `addOnLabelPrintRoutes`, cleared by Demo Reset), `httpLabelPrintRouteService.ts` (+ test), `labelPrintRouteServiceInstance.ts`. Contract: `docs/architecture/CASE_WORKFLOWS_API.md`.
- `printAddOnLabelsAt.ts` (tested): checks the capability, finds the station's slide printer, prints each new slide's label, records the routes and a `printed` station scan at that station. A label that fails is left for the microtome.
- `printAtDeps.ts`: the app's services behind it.

## Batch 732

- Batch 732: a printed-elsewhere label carries the slide's size, and its scan event the block it came from.
