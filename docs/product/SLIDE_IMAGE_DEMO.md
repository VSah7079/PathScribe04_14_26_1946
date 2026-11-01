# Slide image demonstration: setting it up (seed row S10, Video 7 steps 17 and 18)

Batch 750, Pete, Oct 31, 2026. For the person preparing the demonstration images (Pete's helper). PathScribe has no
slide viewer: in the demo, selecting a slide's reference preview opens a **separate demonstration page** that stands in
for a laboratory's digital pathology application. This page tells you how to make the five images, host them with that
page, and point PathScribe at them. Nothing here is done inside PathScribe's code, and nothing here may be described as
clinical use: the page and every image say "Demonstration only. Not for diagnosis."

## What you are making

| Slide (PathScribe) | Shows | Suggested source |
|---|---|---|
| S26-5404-B1-L1 | Sentinel lymph node, no metastasis | CAMELYON16, a `normal_*.tif` slide |
| S26-5404-C1-L1 | Sentinel lymph node, metastatic carcinoma | CAMELYON16, a `tumor_*.tif` slide |
| S26-5404-C1-L2 | The same node, **blurred** (fails image quality) | Made from the C1-L1 image (step 4) |
| S26-5404-A1-L1 | Breast tissue, H&E | OpenSlide test data or a TCIA collection, **only after its licence is read**; or leave it out |
| S26-5402-A1-L1 | A further H&E (or an immunostain) | Another CAMELYON16 slide; or an openly licensed immunostain once its licence is read |

For each slide you make: a small **preview** (a JPEG about 400 pixels wide, shown in PathScribe), a set of **Deep Zoom
tiles** (shown on the demonstration page), and a **licence note** next to the preview.

## The quick way: one script (Batch 752, Windows)

`scripts/Setup-PathScribeSlideDemo.ps1` does sections 2 to 8 below in one run: it downloads `normal_001.tif` and
`tumor_001.tif`, converts them (pyramid level 3), makes the blurred copy, writes the licence notes and
`viewer/manifest.json`, copies the demonstration page, uploads everything to the R2 bucket with the AWS CLI, checks the
public address, and sets the two Vercel variables for Production. It leaves out the two breast slides unless it is
given an image whose licence has been read (`-BreastImage`, `-BreastSource`, `-BreastLicence`, `-BreastLicenceUrl`).
Its working files go to `%USERPROFILE%\PathScribeSlideDemo`, outside the repository.

Before the first run, install:

| Tool | How | Check |
|---|---|---|
| AWS CLI v2 (talks to R2; no Amazon account needed) | `winget install Amazon.AWSCLI`, or the installer at https://awscli.amazonaws.com/AWSCLIV2.msi when `winget` is missing | `aws --version`. If it is "not recognized" just after installing, open a new window, or run `$env:PATH = "C:\Program Files\Amazon\AWSCLIV2;$env:PATH"` |
| libvips **with OpenSlide** | The zip named `vips-dev-x64-all-<version>.zip` from https://github.com/libvips/build-win64-mxe/releases, unzipped into `C:\Tools`. Not `arm64`, not `x86`, not `web` (no slide reader) | The script checks for `openslideload` itself |
| Vercel CLI | `npm install -g vercel`, then `vercel login`. npm's "vulnerabilities" notice after a global install is about the CLI's own packages, not PathScribe | `vercel whoami` |
| An R2 API token | Cloudflare → R2 Object Storage → Manage API tokens → **Create Account API token**, permission **Object Read & Write**, limited to the bucket. Copy the Access Key ID and the Secret Access Key (shown once) | The script asks for both; neither is stored |

Run, from the repository folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\Setup-PathScribeSlideDemo.ps1 -RepoPath "<repository folder>" -VipsBin "C:\Tools\vips-dev-<version>\bin"
```

Switches: `-SkipImages` (reuse the converted files), `-SkipUpload`, `-SkipVercel`, `-Level 4` (a smaller conversion).
After the upload it prints nothing until it finishes (about 21,700 files; 10 to 30 minutes), then **OK Uploaded**.
It never deploys: redeploy Production from the Vercel dashboard afterwards.

## 1. Read the licences first

- **CAMELYON** (CAMELYON16 and CAMELYON17): the AWS Registry of Open Data lists it as CC0, bucket `camelyon-dataset`
  in `us-west-2`, readable without an AWS account (https://registry.opendata.aws/camelyon/). Record the dataset page,
  the file names you used and the citation the dataset asks for.
- **OpenSlide test data** and **TCIA**: each file or collection has its own terms, and some are not open. Read the
  terms of the exact file or collection; use it only if it allows public display in a product demonstration. If in
  doubt, leave the slide out and tell Pete.
- Never use an image from a patient record, a hospital, or anywhere the terms are unclear.

## 2. Download

```bash
aws s3 ls --no-sign-request s3://camelyon-dataset/CAMELYON16/images/
aws s3 cp --no-sign-request s3://camelyon-dataset/CAMELYON16/images/normal_001.tif .
aws s3 cp --no-sign-request s3://camelyon-dataset/CAMELYON16/images/tumor_001.tif .
```

The file names are examples: list the folder and pick slides that look clean at low power. Each file is large (about a
gigabyte or more).

## 3. Convert with libvips

Install libvips with OpenSlide support (`vips --vips-config` should mention openslide). Work from a lower-resolution
level so the tiles stay a sensible size for a demonstration (level 1 or 2 is plenty):

```bash
# a smaller copy of the slide (level 2 of the pyramid)
vips openslideload tumor_001.tif C1-L1.v --level 2
# the preview PathScribe shows: about 400 pixels wide, JPEG
vips thumbnail C1-L1.v previews/S26-5404-C1-L1.jpg 400
# the Deep Zoom tiles for the demonstration page
vips dzsave C1-L1.v viewer/tiles/S26-5404-C1-L1 --tile-size 254 --overlap 1 --suffix .jpg[Q=85]
```

`dzsave` writes `S26-5404-C1-L1.dzi` and the folder `S26-5404-C1-L1_files/`. Repeat for each slide, naming every
output after the PathScribe slide identifier in the table.

## 4. The blurred copy (S26-5404-C1-L2)

```bash
vips gaussblur C1-L1.v C1-L2.v 8
vips thumbnail C1-L2.v previews/S26-5404-C1-L2.jpg 400
vips dzsave C1-L2.v viewer/tiles/S26-5404-C1-L2 --tile-size 254 --overlap 1 --suffix .jpg[Q=85]
```

Record the blur (Gaussian, sigma 8, on level 2) in its licence note and in the manifest.

## 5. Licence notes and the manifest

- Next to each preview, a text file `previews/<slide>.licence.txt`: the source (dataset, file name, page), the
  licence, the citation, and for the blurred copy what was done to it.
- Copy `tools/demo-slide-viewer/manifest.example.json` to `viewer/manifest.json` and complete each entry's `source`,
  `licence` and `licenceUrl`. Remove any entry whose licence you have not confirmed.

## 6. The demonstration page

Copy `tools/demo-slide-viewer/index.html`, `style.css` and `viewer.js` into `viewer/`. The page loads OpenSeadragon
4.1.0 from cdnjs, reads `?slide=<slide identifier>`, and shows only the slides listed in `manifest.json`. The finished
layout:

```
previews/S26-5404-C1-L1.jpg
previews/S26-5404-C1-L1.licence.txt
...
viewer/index.html
viewer/style.css
viewer/viewer.js
viewer/manifest.json
viewer/tiles/S26-5404-C1-L1.dzi
viewer/tiles/S26-5404-C1-L1_files/...
...
```

## 7. Host it (for example Cloudflare R2)

1. Create an R2 bucket and give it a public address: an `r2.dev` address for a trial, or a custom domain (better for
   recordings).
2. Upload the whole layout above, keeping the paths (rclone's S3 remote for R2 handles the many tile files; the
   dashboard upload is fine for the small files).
3. Open `https://<host>/viewer/index.html?slide=S26-5404-C1-L1` in a browser: the banner, the image and its licence
   should show. The page and its tiles share a host, so no CORS setting is needed. If you put the tiles on another
   host, allow GET from the page's host there.

## 8. Point PathScribe at it

Either in the deployment (Vercel environment variables, or Runtime settings) or in the demo's Configuration:

| Setting | Value |
|---|---|
| Viewer address (`VITE_SLIDE_VIEWER_URL_TEMPLATE`) | `https://<host>/viewer/index.html?slide={{slideId}}` |
| Preview image address (`VITE_SLIDE_THUMBNAIL_URL_TEMPLATE`) | `https://<host>/previews/{{slideId}}.jpg` |

In Configuration: System → Lab Materials & Workflows → Vendor Integrations → WSI Viewers → **Slide images**. A Full
Reset clears settings made there; the deployment's values stay.

**Security policy.** The demo site's Content-Security-Policy allows images only from itself today, so the previews
will not load until `https://<host>` is added to `img-src` (the security headers generator under `deploy/`, then
regenerate `vercel.json`). The demonstration page opens in its own window and is not affected.

## 9. Check before recording

Sign in as Dr. Sarah Johnson, open S26-5404, select **Edit** on a block: four previews (C1-L2 marked Failed image
quality). Select C1-L1's preview: the demonstration page opens on that slide in its own window. Set the window's place
once from the workstation menu (**Slide image window → Set position…**). See `DEMO_GUIDE.md`, Video 7 steps 17 and 18.

## 10. As set up for the demo (Oct 31, 2026)

Done by Pete with the script above. Record any change here.

| Item | Value |
|---|---|
| Storage | Cloudflare R2 bucket `pathscribe-demo-slides` (ForMedrixAI's Cloudflare account, location Western North America, Standard storage) |
| Public address | `https://slides-demo.formedrix.ai` (the bucket's custom domain, minimum TLS 1.2). The `r2.dev` development address is off, and no CORS policy is set (none is needed: the page and its tiles share the host, and PathScribe shows the previews as plain images) |
| Uploaded | `previews/` (preview and licence note per slide) and `viewer/` (the demonstration page, `manifest.json`, `tiles/`) |
| Slides | S26-5404-B1-L1 (CAMELYON16 `normal_001.tif`), S26-5404-C1-L1 (`tumor_001.tif`), S26-5404-C1-L2 (the blurred copy). All CC0 1.0. The two breast slides (S26-5404-A1-L1, S26-5402-A1-L1) are **not** uploaded: PathScribe shows **Open slide** for them instead of a preview |
| Check | `https://slides-demo.formedrix.ai/viewer/index.html?slide=S26-5404-C1-L1` |
| Upload result (Nov 1, 2026) | Upload finished on the second run (the first stopped part-way; `aws s3 sync` uploads only what is missing). The script's check of `viewer/manifest.json` answered 200 |
| Vercel, **Production only** | `VITE_SLIDE_VIEWER_URL_TEMPLATE` = `https://slides-demo.formedrix.ai/viewer/index.html?slide={{slideId}}`; `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` = `https://slides-demo.formedrix.ai/previews/{{slideId}}.jpg` |
| Vercel status (Nov 1, 2026) | **Not set yet.** The demo project is not under Pete's Vercel login (`vercel link` found no projects in his team), so the development team sets the two values, or adds Pete to the project. Since Batch 755b the script takes `-VercelScope <team>` and warns before `vercel link` would create a new project |
| Upload key | An Account API token for the bucket only. It is needed only to upload; delete it after the upload and make a new one to re-run |

**For the development team:**

1. The two variables live in the Vercel project's settings, so every later deploy keeps them; nothing needs re-doing
   when Vercel is updated. Don't remove or rename them: without them there is no preview and no Open slide.
2. They are set for **Production** only. Preview deployments (pull requests after the GitHub cutover) show no slide
   images unless the same two variables are added for **Preview** as well. Vite reads them at build time, so a change
   takes effect only after a redeploy (a `/config.json` value, when a deployment has one, wins over them; the demo has
   none).
3. **Still to do:** the demo site's security policy allows images only from itself, so the previews stay blank until
   `https://slides-demo.formedrix.ai` is added to `img-src` in `deploy/security-headers/` and `vercel.json` is
   regenerated (`scripts/generate-security-headers.mjs`). The demonstration page opens in its own window and works
   without this change.
4. The images are not in the repository. To rebuild or add slides, re-run `scripts/Setup-PathScribeSlideDemo.ps1`
   (`-SkipVercel` if the addresses are unchanged).
5. A customer site points the same two settings at its own digital pathology application; the demo host is for the
   demonstration only.
6. If the demo is hosted somewhere other than Vercel (for example Cloudflare Pages), the same two variables go in that
   host's Production build variables (as plain text, not secrets); they are read at build time either way.
