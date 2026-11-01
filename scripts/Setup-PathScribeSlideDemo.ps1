<#
.SYNOPSIS
  PathScribe demo, seed row S10: prepares the demonstration slide images, uploads them to the
  Cloudflare R2 bucket, and sets the two slide addresses in Vercel.

.DESCRIPTION
  Step 2 (images):
    - downloads two CAMELYON16 slides (CC0, AWS Open Data registry, no account needed);
    - converts them with libvips into small previews (400 px JPEG) and Deep Zoom tiles;
    - makes the deliberately blurred copy (the slide that fails image quality);
    - writes a licence note beside each preview, and the manifest the demonstration page reads;
    - copies the demonstration page (tools/demo-slide-viewer from the PathScribe repo);
    - uploads it all to the R2 bucket.
  Step 3 (Vercel): sets VITE_SLIDE_VIEWER_URL_TEMPLATE and VITE_SLIDE_THUMBNAIL_URL_TEMPLATE for Production.

  Slides made (PathScribe slide -> image):
    S26-5404-B1-L1  sentinel node, no metastasis    CAMELYON16 normal_001.tif
    S26-5404-C1-L1  sentinel node, metastasis       CAMELYON16 tumor_001.tif
    S26-5404-C1-L2  the same, blurred               made from tumor_001.tif
  The two breast slides (S26-5404-A1-L1, S26-5402-A1-L1) are made only if you pass -BreastImage with an
  image whose licence you have read (OpenSlide test data or a TCIA collection). Without it they are left
  out, and PathScribe shows "Open slide" for them instead of a preview.

  Nothing here stores a password or key on disk. The R2 keys are asked for when needed and live only in
  this PowerShell window while it runs.

.NOTES
  Needs, once:
    - AWS CLI v2              winget install Amazon.AWSCLI
    - libvips with OpenSlide  the "vips-dev-w64-all" zip from https://github.com/libvips/build-win64-mxe/releases
                              (unzip it and pass -VipsBin "C:\path\vips-dev-8.x\bin", or put that folder on PATH)
    - Vercel CLI              npm install -g vercel   (then: vercel login)
    - An R2 API token         Cloudflare dashboard -> R2 Object Storage -> Manage API tokens -> Create API token,
                              permission "Object Read & Write", limited to the bucket pathscribe-demo-slides.
                              Keep the Access Key ID and Secret Access Key open; the script asks for them.
  About 5 GB of free disk for the downloads and working files. Run time: mostly the download and upload.

.EXAMPLE
  .\Setup-PathScribeSlideDemo.ps1 -RepoPath "C:\Dev\pathscribe-ai" -VipsBin "C:\Tools\vips-dev-8.16\bin"

.EXAMPLE
  # Only redo the Vercel part
  .\Setup-PathScribeSlideDemo.ps1 -RepoPath "C:\Dev\pathscribe-ai" -SkipImages -SkipUpload

.EXAMPLE
  # The Vercel part, for a demo project owned by another team of your login (see: vercel teams ls)
  .\Setup-PathScribeSlideDemo.ps1 -RepoPath "C:\Dev\pathscribe-ai" -SkipImages -SkipUpload -VercelScope "formedrixai"
#>
[CmdletBinding()]
param(
  # The PathScribe repository on this computer (with Batch 750 applied: it has tools\demo-slide-viewer).
  [Parameter(Mandatory = $true)] [string] $RepoPath,
  # Where the downloads and the finished files go.
  [string] $WorkDir = "$env:USERPROFILE\PathScribeSlideDemo",
  # libvips bin folder (leave empty if vips.exe is on PATH).
  [string] $VipsBin = '',
  # The public address of the bucket (its custom domain).
  [string] $PublicBase = 'https://slides-demo.formedrix.ai',
  [string] $Bucket = 'pathscribe-demo-slides',
  # Your Cloudflare account id (from the bucket's S3 API address).
  [string] $AccountId = 'c70ba294c00be827a60a2eecaa1e303e',
  # Pyramid level converted (CAMELYON level 3 = 1/8 of full resolution: cells visible, a few thousand tiles).
  [int] $Level = 3,
  # Optional: a breast H&E image whose licence you have read, with its source and licence.
  [string] $BreastImage = '',
  [string] $BreastSource = '',
  [string] $BreastLicence = '',
  [string] $BreastLicenceUrl = '',
  [switch] $SkipImages,
  [switch] $SkipUpload,
  [switch] $SkipVercel,
  # Batch 755b: the Vercel team (scope) that owns the demo project, when your login has more than one
  # (run "vercel teams ls" to see them). Empty = the CLI's current team.
  [string] $VercelScope = ''
)

# 'Continue', not 'Stop': in Windows PowerShell 5.1 'Stop' turns any warning a program prints into a failure.
# Every program's result is checked by its exit code instead.
$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

function Write-Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Write-Done($text) { Write-Host "  OK  $text" -ForegroundColor Green }
function Stop-Script($text) { Write-Host "`nSTOPPED: $text" -ForegroundColor Red; exit 1 }
function Assert-Command($name, $hint) { if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { Stop-Script "$name was not found. $hint" } }

$viewerSource = Join-Path $RepoPath 'tools\demo-slide-viewer'
if (-not (Test-Path (Join-Path $viewerSource 'index.html'))) { Stop-Script "No tools\demo-slide-viewer\index.html under $RepoPath. Apply the Batch 750 zip first, or check -RepoPath." }
if ($VipsBin) { $env:PATH = "$VipsBin;$env:PATH" }

$dl       = Join-Path $WorkDir 'downloads'
$tmp      = Join-Path $WorkDir 'working'
$out      = Join-Path $WorkDir 'upload'
$previews = Join-Path $out 'previews'
$viewer   = Join-Path $out 'viewer'
$tiles    = Join-Path $viewer 'tiles'

# -- Step 2a: download and convert -------------------------------------------------------------------------------
if (-not $SkipImages) {
  Write-Step 'Checking the tools'
  Assert-Command 'aws'  'Install the AWS CLI: winget install Amazon.AWSCLI (then open a new PowerShell window).'
  Assert-Command 'vips' 'Unzip the libvips "vips-dev-w64-all" release and pass -VipsBin "<folder>\bin".'
  $ops = (& vips -l 2>$null) -join "`n"
  if ($ops -notmatch 'openslideload') { Stop-Script 'This libvips has no OpenSlide support. Use the "vips-dev-w64-all" zip (not "web").' }
  Write-Done 'AWS CLI and libvips with OpenSlide'

  New-Item -ItemType Directory -Force -Path $dl, $tmp, $previews, $tiles -ErrorAction Stop | Out-Null

  Write-Step 'Downloading CAMELYON16 slides (CC0; about 1 to 3 GB each)'
  # Public, no account: make sure no R2 keys are set while talking to AWS.
  Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
  $camelyon = @('normal_001.tif', 'tumor_001.tif')
  foreach ($f in $camelyon) {
    $dest = Join-Path $dl $f
    if (Test-Path $dest) { Write-Done "$f already downloaded"; continue }
    & aws s3 cp --no-sign-request --region us-west-2 "s3://camelyon-dataset/CAMELYON16/images/$f" $dest
    if ($LASTEXITCODE -ne 0) { Stop-Script "Could not download $f. List the folder with: aws s3 ls --no-sign-request s3://camelyon-dataset/CAMELYON16/images/" }
    Write-Done $f
  }

  function Convert-Slide([string] $slideId, [string] $sourceFile, [switch] $Blur, [switch] $NotPyramid) {
    $flat = Join-Path $tmp "$slideId.v"
    $src  = if ($NotPyramid) { $sourceFile } else { "$($sourceFile)[level=$Level]" }
    # Openslide gives RGBA; flatten onto white for JPEG.
    & vips flatten $src $flat --background 255
    if ($LASTEXITCODE -ne 0) { Stop-Script "libvips could not read $sourceFile (level $Level). Try -Level 4." }
    if ($Blur) {
      $blurred = Join-Path $tmp "$slideId-blur.v"
      & vips gaussblur $flat $blurred 8
      if ($LASTEXITCODE -ne 0) { Stop-Script "libvips could not blur $slideId." }
      Remove-Item $flat; $flat = $blurred
    }
    & vips thumbnail $flat (Join-Path $previews "$slideId.jpg") 400
    if ($LASTEXITCODE -ne 0) { Stop-Script "libvips could not make the preview for $slideId." }
    $tileBase = Join-Path $tiles $slideId
    if (Test-Path "$tileBase`_files") { Remove-Item -Recurse -Force "$tileBase`_files" }
    & vips dzsave $flat $tileBase --tile-size 254 --overlap 1 --suffix '.jpg[Q=85]'
    if ($LASTEXITCODE -ne 0) { Stop-Script "libvips could not make the tiles for $slideId." }
    Remove-Item $flat
    Write-Done "$slideId (preview and tiles)"
  }

  function Write-Licence([string] $slideId, [string[]] $lines) {
    Set-Content -ErrorAction Stop -Encoding UTF8 -Path (Join-Path $previews "$slideId.licence.txt") -Value ($lines -join "`r`n")
  }

  Write-Step "Converting (level $Level)"
  $camelyonPage = 'https://registry.opendata.aws/camelyon/'
  $cc0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
  $citation = 'Litjens G, et al. 1399 H&E-stained sentinel lymph node sections of breast cancer patients: the CAMELYON dataset. GigaScience 2018;7(6):giy065.'
  $slides = [ordered]@{}

  Convert-Slide 'S26-5404-B1-L1' (Join-Path $dl 'normal_001.tif')
  Write-Licence 'S26-5404-B1-L1' @('Demonstration only. Not for diagnosis.', 'Source: CAMELYON16, normal_001.tif (Radboud University Medical Center and University Medical Center Utrecht), AWS Open Data registry, ' + $camelyonPage, 'Licence: CC0 1.0 ' + $cc0, "Citation: $citation", "Converted with libvips at pyramid level $Level.")
  $slides['S26-5404-B1-L1'] = @{ title = 'Sentinel lymph node, H&E (no metastasis)'; source = "CAMELYON16 normal_001.tif, AWS Open Data registry ($camelyonPage)"; licence = 'CC0 1.0'; licenceUrl = $cc0; note = 'Openly licensed research image, shown for demonstration.' }

  Convert-Slide 'S26-5404-C1-L1' (Join-Path $dl 'tumor_001.tif')
  Write-Licence 'S26-5404-C1-L1' @('Demonstration only. Not for diagnosis.', 'Source: CAMELYON16, tumor_001.tif, AWS Open Data registry, ' + $camelyonPage, 'Licence: CC0 1.0 ' + $cc0, "Citation: $citation", "Converted with libvips at pyramid level $Level.")
  $slides['S26-5404-C1-L1'] = @{ title = 'Sentinel lymph node, H&E (metastatic carcinoma)'; source = "CAMELYON16 tumor_001.tif, AWS Open Data registry ($camelyonPage)"; licence = 'CC0 1.0'; licenceUrl = $cc0; note = 'Openly licensed research image, shown for demonstration.' }

  Convert-Slide 'S26-5404-C1-L2' (Join-Path $dl 'tumor_001.tif') -Blur
  Write-Licence 'S26-5404-C1-L2' @('Demonstration only. Not for diagnosis.', 'Source: a blurred copy of CAMELYON16 tumor_001.tif (Gaussian blur, sigma 8, after conversion at pyramid level ' + $Level + '), made for the demonstration.', 'Licence: CC0 1.0 ' + $cc0, "Citation: $citation")
  $slides['S26-5404-C1-L2'] = @{ title = 'Sentinel lymph node, H&E recut (failed image quality)'; source = 'A blurred copy of CAMELYON16 tumor_001.tif, made for the demonstration (Gaussian blur, sigma 8)'; licence = 'CC0 1.0, as its source'; licenceUrl = $cc0; note = 'Deliberately blurred to show a slide that failed the image quality check.' }

  if ($BreastImage) {
    if (-not (Test-Path $BreastImage)) { Stop-Script "-BreastImage not found: $BreastImage" }
    if (-not $BreastSource -or -not $BreastLicence) { Stop-Script 'With -BreastImage, also pass -BreastSource and -BreastLicence (after reading the licence).' }
    $vendor = & vips header -f openslide.vendor $BreastImage 2>$null
    $isPyramid = ($LASTEXITCODE -eq 0) -and [bool]$vendor
    foreach ($id in @('S26-5404-A1-L1', 'S26-5402-A1-L1')) {
      if ($isPyramid) { Convert-Slide $id $BreastImage } else { Convert-Slide $id $BreastImage -NotPyramid }
      Write-Licence $id @('Demonstration only. Not for diagnosis.', "Source: $BreastSource", "Licence: $BreastLicence $BreastLicenceUrl")
    }
    $slides['S26-5404-A1-L1'] = @{ title = 'Breast, mastectomy, H&E'; source = $BreastSource; licence = $BreastLicence; licenceUrl = $BreastLicenceUrl; note = 'Openly licensed research image, shown for demonstration.' }
    $slides['S26-5402-A1-L1'] = @{ title = 'Breast, wide local excision, H&E'; source = $BreastSource; licence = $BreastLicence; licenceUrl = $BreastLicenceUrl; note = 'Openly licensed research image, shown for demonstration.' }
  } else {
    Write-Host '  --  No -BreastImage: S26-5404-A1-L1 and S26-5402-A1-L1 are left out (PathScribe shows "Open slide" for them).' -ForegroundColor Yellow
  }

  Write-Step 'The demonstration page and its manifest'
  foreach ($f in @('index.html', 'style.css', 'viewer.js')) { Copy-Item -Force -ErrorAction Stop (Join-Path $viewerSource $f) $viewer }
  $manifest = [ordered]@{
    about  = "Demonstration images for PathScribe (seed row S10), made by Setup-PathScribeSlideDemo.ps1 on $(Get-Date -Format 'yyyy-MM-dd'). Demonstration only. Not for diagnosis."
    slides = [ordered]@{}
  }
  foreach ($id in $slides.Keys) {
    $s = $slides[$id]
    $manifest.slides[$id] = [ordered]@{ title = $s.title; dzi = "tiles/$id.dzi"; source = $s.source; licence = $s.licence; licenceUrl = $s.licenceUrl; note = $s.note }
  }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content -ErrorAction Stop -Encoding UTF8 (Join-Path $viewer 'manifest.json')
  Write-Done "manifest.json with $($slides.Count) slides"
  $count = (Get-ChildItem -Recurse -File $out).Count
  Write-Done "$count files ready in $out"
}

# -- Step 2b: upload to R2 ---------------------------------------------------------------------------------------
if (-not $SkipUpload) {
  Write-Step "Uploading to the R2 bucket $Bucket"
  Assert-Command 'aws' 'Install the AWS CLI: winget install Amazon.AWSCLI (then open a new PowerShell window).'
  if (-not (Test-Path (Join-Path $viewer 'manifest.json'))) { Stop-Script "Nothing to upload in $out. Run without -SkipImages first." }
  Write-Host '  Paste the R2 API token keys (Cloudflare -> R2 Object Storage -> Manage API tokens). They are not saved.'
  $keyId  = Read-Host '  Access Key ID'
  $secure = Read-Host '  Secret Access Key' -AsSecureString
  $secret = [System.Net.NetworkCredential]::new('', $secure).Password
  try {
    $env:AWS_ACCESS_KEY_ID = $keyId
    $env:AWS_SECRET_ACCESS_KEY = $secret
    # R2 does not accept the newer default checksums of AWS CLI 2.23 and later.
    $env:AWS_REQUEST_CHECKSUM_CALCULATION = 'when_required'
    $env:AWS_RESPONSE_CHECKSUM_VALIDATION = 'when_required'
    $endpoint = "https://$AccountId.r2.cloudflarestorage.com"
    & aws s3 sync $out "s3://$Bucket/" --endpoint-url $endpoint --region auto --only-show-errors
    if ($LASTEXITCODE -ne 0) { Stop-Script 'The upload failed. Check the keys have Object Read & Write on this bucket.' }
    # Set the content types the browser needs (Windows can guess them wrongly from the registry).
    $types = [ordered]@{ '*.html' = 'text/html; charset=utf-8'; '*.css' = 'text/css; charset=utf-8'; '*.js' = 'text/javascript; charset=utf-8'; '*.json' = 'application/json; charset=utf-8'; '*.dzi' = 'application/xml'; '*.txt' = 'text/plain; charset=utf-8' }
    foreach ($pattern in $types.Keys) {
      & aws s3 cp $out "s3://$Bucket/" --recursive --exclude '*' --include $pattern --content-type $types[$pattern] --endpoint-url $endpoint --region auto --only-show-errors
      if ($LASTEXITCODE -ne 0) { Stop-Script "Could not set the content type of $pattern files." }
    }
    Write-Done 'Uploaded'
  } finally {
    Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
    $secret = $null
  }

  Write-Step 'Checking the public address'
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$PublicBase/viewer/manifest.json" -TimeoutSec 30
    Write-Done "$PublicBase/viewer/manifest.json answers ($($r.StatusCode))"
    Write-Host "  Open this to look:  $PublicBase/viewer/index.html?slide=S26-5404-C1-L1"
  } catch {
    Write-Host "  !!  $PublicBase did not answer yet. Check the bucket's Custom Domain shows Active, then open:" -ForegroundColor Yellow
    Write-Host "      $PublicBase/viewer/index.html?slide=S26-5404-C1-L1"
  }
}

# -- Step 3: Vercel ----------------------------------------------------------------------------------------------
if (-not $SkipVercel) {
  Write-Step 'Setting the slide addresses in Vercel (Production)'
  Assert-Command 'vercel' 'Install the Vercel CLI: npm install -g vercel, then run: vercel login'
  Push-Location $RepoPath
  try {
    $scopeArgs = @(); if ($VercelScope) { $scopeArgs = @('--scope', $VercelScope) }
    if (-not (Test-Path '.vercel\project.json')) {
      Write-Host '  This folder is not linked to the Vercel project yet. Choose the EXISTING PathScribe demo project.'
      Write-Host '  If it says "No existing projects found ... Creating new project", press Ctrl+C: the demo is under another team.' -ForegroundColor Yellow
      Write-Host '  Then run "vercel teams ls" and run this again with -VercelScope <team>, or set the two values on the Vercel website.' -ForegroundColor Yellow
      & vercel link @scopeArgs
      if ($LASTEXITCODE -ne 0) { Stop-Script 'vercel link did not finish.' }
    }
    $vars = [ordered]@{
      'VITE_SLIDE_VIEWER_URL_TEMPLATE'    = "$PublicBase/viewer/index.html?slide={{slideId}}"
      'VITE_SLIDE_THUMBNAIL_URL_TEMPLATE' = "$PublicBase/previews/{{slideId}}.jpg"
    }
    foreach ($name in $vars.Keys) {
      & vercel env rm $name production --yes @scopeArgs 2>$null | Out-Null   # replace an earlier value, if any
      $vars[$name] | & vercel env add $name production @scopeArgs
      if ($LASTEXITCODE -ne 0) { Stop-Script "Could not set $name." }
      Write-Done "$name = $($vars[$name])"
    }
  } finally { Pop-Location }
  Write-Host "`n  Last step, in the Vercel dashboard: Deployments -> the latest Production deployment -> ... -> Redeploy." -ForegroundColor Yellow
  Write-Host '  The new addresses take effect in that build. (The previews show once the security policy allows the address; ask Claude for that change.)'
}

Write-Host "`nFinished." -ForegroundColor Green
