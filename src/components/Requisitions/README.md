# src/components/Requisitions/

Batch 762: scanned requisitions on screen (`docs/product/REQUISITION_INGESTION.md`).

- `RequisitionPreview.tsx`: a requisition's page images (data-phi) with Open PDF; used by the inbox and the case window.
- `CaseRequisitionLink.tsx`: the report header's **📄 Requisition** button (only with `case:requisition:view` and a linked requisition) and its window.
- `RequisitionInboxLink.tsx`: the **📥 Requisition Inbox** button on the Accession screen (sub-screen `requisitionInbox`).
- `Requisitions.css`: the inbox page, the preview and the configuration section.

- `AccessionFromRequisition.tsx`: on Accession opened with `?fromRequisition=`, the banner naming the scan (View), and the confirmation once the new case is linked.
- `CaseRequisitionLink.tsx` also shows **⚠ Requisition missing** for a flagged case.
