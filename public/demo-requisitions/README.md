# public/demo-requisitions/

Batch 762: the demonstration drop folder for requisition ingestion. Fictional scans made by a script: every page is a
JPEG image in a PDF, as a document scanner makes them, with Code 128 accession labels. Nothing here is a real patient.

- `REQ-BATCH-0001.pdf`: S26-0001 (two pages: the requisition and a continuation page with no barcode), a separator
  sheet, then S26-4403.
- `REQ-BATCH-0002.pdf`: S26-9999 (no such case: goes to the Unmatched queue), a separator sheet, then a page whose
  label is smudged and cannot be read (Unmatched, no barcode).
- `REQ-SCAN-0003.tif`: a TIFF, refused (PDF only).
- `manifest.json`: the folder's listing (a browser cannot list a folder; the server job reads the real share).
