# tools/demo-slide-viewer

Batch 750 (Pete's seed row S10). A standalone **demonstration slide page**, outside PathScribe. PathScribe has no slide
viewer; in a laboratory, selecting a slide's reference preview opens the laboratory's own digital pathology
application. In the demonstration this page stands in for that application. It is labelled "Demonstration only. Not
for diagnosis." and shows openly licensed research images, each with its source and licence.

- `index.html`, `style.css`, `viewer.js`: the page. It reads `?slide=<slide identifier>`, finds the slide in
  `manifest.json` and draws its Deep Zoom tiles with OpenSeadragon 4.1.0 (cdnjs, pinned). Only slides listed in the
  manifest are shown, and everything is written as text.
- `manifest.example.json`: the five demonstration slides (S26-5404 A1-L1, B1-L1, C1-L1, C1-L2 and S26-5402 A1-L1), with
  source and licence fields to complete. Copy it to `manifest.json` when the images are ready.

Not bundled with PathScribe and not served by it: it is uploaded on its own (for example to Cloudflare R2) with the
tiles and previews. Setting it up, converting the images with libvips and pointing PathScribe at it:
`docs/product/SLIDE_IMAGE_DEMO.md`. English only: it is a demonstration asset, not PathScribe's interface.
