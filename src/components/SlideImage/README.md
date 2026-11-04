# components/SlideImage

Batch 750 (Pete, Oct 31, 2026, seed row S10). PathScribe has no slide viewer.

- **`SlideImagePreview.tsx`** (+ `.css`): a slide's reference preview: the picture the laboratory's scanner or image system made, shown unchanged and labelled "Reference preview. Not for diagnosis."; selecting it opens the slide in the laboratory's own digital pathology application, in the remembered slide image window. Without an image it shows the slide's state (No image yet, Queued, Scanning, Scan failed, Failed image quality). Used in the block and stain window (`pages/SynopticReportPage/modals/BlockStainEditorModal.tsx`) and on the cytology screening bar. Render only: `hooks/useSlideImage.ts` and `services/digitalPathology/slideImages.ts` decide. The whole preview is tagged `data-phi="slide-image"`.
