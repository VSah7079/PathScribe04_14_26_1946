**Batch 743:** `CaseAttachmentsModal.tsx`: on an Assist case, no tick boxes, captions, section picker, Insert into Report or In the report list (unless an older placement exists), and a note saying the LIS writes the report.

# src/components/CaseAttachments/

**Batch 742** (Pete, Case Image & File Attachments, Release 1):

- `CaseAttachmentsModal.tsx` (+ `.css`): the Attachments window, opened from the case's Attachments badge on the report page and in the Cytology Workspace. Four groups (gross photos, intraoperative and consultation captures, slide regions, external files and links), tick boxes with a caption, **Attach External File…** (the computer's own file picker; PDF, JPG, PNG), **Add link**, **Insert into Report** into the chosen section, **Take out of report**, **Remove from case**. A signed report is locked without an amendment or addendum. State in `hooks/useCaseAttachments.ts`; decisions in `services/caseAttachments/` and `services/imageAssociation/caseReportImages.ts`.
- `PlacedImages.tsx`: the images and documents placed in a section, as the in-app report preview shows them.

Replaces `components/ReportImages/` (Batch 609).
