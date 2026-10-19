# src/components/ReportImages/

## Batch 609 (part A)

- `AttachReportImagesModal.tsx`: the Attach images window for a case's report, opened from the surgical report page and the Cytology Workspace. A person pastes an https link to the image in the hospital's own system, picks a type (remembered) and an optional caption; Enter adds it. PathScribe stores no images (Pete, Oct 13), only the link. Decisions are in `services/imageAssociation/caseReportImages.ts`; state in `hooks/useCaseReportImages.ts`.
