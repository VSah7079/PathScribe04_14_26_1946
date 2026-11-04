# Slide images: reference preview, opening the lab's application, window placement

Batch 750 (Pete, Oct 31, 2026, seed row S10). Contract and design notes for the API server and integrators.

## Decision

PathScribe contains **no digital pathology viewer** and does no image processing. For a slide it shows a small
reference preview, exactly as the laboratory's scanner or image system made it, labelled "Reference preview. Not for
diagnosis.", and selecting it opens the slide in the laboratory's own digital pathology application in a separate,
remembered window. The FDA question is open: no clinical-use wording in guides, videos or sales material.

## Addresses

`EnterpriseConfig.slideImages` (`services/digitalPathology/slideImages.ts`):

```ts
interface SlideImageSettings {
  viewerUrlTemplate: string;      // opens the slide in the lab's application
  thumbnailUrlTemplate: string;   // the scanner's or image system's preview
  facilityOverrides: Record<string /* Facility.id */, Partial<{ viewerUrlTemplate: string; thumbnailUrlTemplate: string }>>;
}
```

- Templates: `https://` only, a host with a dot, no user name or password, placeholders `{{slideId}}` (required) and
  `{{accession}}` (optional) only. Values are URL-encoded. There is no placeholder for a patient name.
- Which applies: the case's facility (`Case.order.facilityId`), else the laboratory's, else (viewer only) the first
  active WSI Viewers list entry with a usable address (its `{{wsiUniqueId}}` read as `{{slideId}}`), else the
  deployment's `VITE_SLIDE_VIEWER_URL_TEMPLATE` / `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` (runtime settings, kind `text`).
- Saving the settings needs `config:vendor-integrations:manage` (`systemConfigChangeChecks.ts`).

## Image state

From the slide's own scanner fields (`StainOrder.distributionStatus`, and `lastScanOutcome`, now set by
`wsiScanQueue.stainUnloaded`): Scanned → image available; Loaded on Scanner → Scanning; In Scanning Queue → Queued,
Scan failed or Failed image quality (by the last unload); otherwise No image yet. A failed-quality image is still shown
and can be opened. Cytology screening on whole-slide images has no per-slide status and counts as imaged.

## Previews delivered by the interface (Planned feed; contract ready)

`ISlidePreviewService.getForSlide(slideDisplayId)` → `SlidePreview | null`:

| Method | Verb and path | Body | Returns |
|---|---|---|---|
| getForSlide | `POST /api/digital-pathology/slide-previews/get-for-slide` | `{ "slideDisplayId": "S26-5404-B1-L1" }` | `{ id, slideDisplayId, imageUrl, sourceSystemId, receivedAt }` or `null` |

The identifier carries the accession, so it goes in the body. `imageUrl` is `https:` or an inline
`data:image/jpeg|png;base64,`; it is shown unchanged. A delivered preview is used before the thumbnail template.
Nothing sends previews yet (the interface engine mapping is Planned).

## Opening a slide

`slideImageOpen.ts`: `prepareSlideImageOpen` enforces `case:slide-image:open` with `{ caseId, facilityId }` before any
address is built (refusal: `notPermitted`; no address: `noAddress`, shown as "No viewer address is set. Ask your
administrator."). After the window opens, `recordSlideImageOpened` writes the audit event **Slide Image Opened**
(user, case, slide identifier and the application's host; no patient name). Sign-in belongs to the other application;
PathScribe passes no token.

## The window

The remembered companion window `PathScribeSlideImage` (`hooks/useCompanionWindow.ts`, as the Help windows of Batch
668): its size and position are kept per workstation (`ps-companion-window-geometry-PathScribeSlideImage`). On reopening,
in Chrome and Edge with the window-management permission already granted, a saved position on a screen that is no
longer connected moves to the primary screen (`services/windowPlacement/windowPlacement.ts`); elsewhere the saved
coordinates are used. **Set position…** in the workstation menu opens `/window-position?window=PathScribeSlideImage`
(no sign-in, no patient data), where **Save position** records the window's place and asks the browser for window
placement. A blocked pop-up gives a plain message with the steps.

## Security policy

The thumbnail is an `<img>` from the preview host, so the host must be in the Content-Security-Policy `img-src`
(deploy/security-headers). Not yet generated from the setting: add it by hand per deployment.

## Not built

- Previews sent by the interface engine.
- Generating `img-src` from the preview address.
- Testing on real multi-monitor hardware (only headless Chromium, one virtual screen).
