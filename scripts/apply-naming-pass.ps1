<#
.SYNOPSIS
  Applies the components/ naming & structure pass to your real project,
  copying from an extracted copy of components-naming-structure-pass.zip.

.USAGE
  1. Unzip components-naming-structure-pass.zip somewhere, e.g. Downloads.
  2. Open PowerShell (does not need to be Administrator for this).
  3. cd to wherever this script lives, then run:

       .\apply-naming-pass.ps1 -WhatIf
         (preview only - shows every action, changes nothing)

       .\apply-naming-pass.ps1
         (actually applies everything)

  Adjust -ProjectRoot / -ZipExtractRoot below if your paths differ from
  the defaults.
#>

param(
    [string]$ProjectRoot    = "$env:USERPROFILE\Documents\pathscribe-ai",
    [string]$ZipExtractRoot = "$env:USERPROFILE\Downloads\components-naming-structure-pass",
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$hadError = $false

function Step($msg)  { Write-Host "-> $msg" -ForegroundColor Yellow }
function Info($msg)  { Write-Host "   $msg" -ForegroundColor DarkGray }
function Ok($msg)    { Write-Host "   OK: $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "   WARNING: $msg" -ForegroundColor Red; $script:hadError = $true }

Write-Host "=== PathScribe components/ naming pass ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
Write-Host "Zip source:   $ZipExtractRoot"
if ($WhatIf) { Write-Host "Mode: PREVIEW ONLY (-WhatIf) - nothing will be changed" -ForegroundColor Magenta }
Write-Host ""

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot`nPass -ProjectRoot 'C:\path\to\pathscribe-ai' if it's somewhere else."
}
if (-not (Test-Path $ZipExtractRoot)) {
    throw "Zip extract folder not found: $ZipExtractRoot`nUnzip components-naming-structure-pass.zip first, then pass -ZipExtractRoot pointing at the unzipped folder (the one containing a 'src' subfolder)."
}

$srcProject = Join-Path $ProjectRoot "src"
$srcZip     = Join-Path $ZipExtractRoot "src"
if (-not (Test-Path $srcZip)) {
    throw "Expected a 'src' folder inside $ZipExtractRoot but didn't find one. Check -ZipExtractRoot points at the right unzipped folder."
}

# -- Step 1: delete old folders entirely -------------------------------------
Write-Host "--- Step 1: Deleting old folders ---" -ForegroundColor Cyan
$foldersToDelete = @(
    "components\system",
    "components\UI",
    "components\PatientReportPage",
    "components\AccessionPage",
    "components\CasePanel",
    "components\synoptic",
    "components\Dashboards"
)
foreach ($f in $foldersToDelete) {
    $full = Join-Path $srcProject $f
    if (Test-Path $full) {
        Step "Delete $f"
        if ($WhatIf) { Info "(would delete)" }
        else {
            try { Remove-Item -Recurse -Force $full; Ok "deleted" }
            catch { Warn "Could not delete $f - $($_.Exception.Message). Close any editors/terminals open on this folder and retry." }
        }
    } else {
        Info "$f already gone, skipping"
    }
}
Write-Host ""

# -- Step 2: copy whole new folders from the zip -----------------------------
Write-Host "--- Step 2: Adding new folders ---" -ForegroundColor Cyan
$foldersToCopy = @(
    "components\ClientDictionary",
    "components\SpecimenPicker",
    "components\PatientHistory",
    "components\Synoptic"
)
foreach ($f in $foldersToCopy) {
    $src = Join-Path $srcZip $f
    $dst = Join-Path $srcProject $f
    if (-not (Test-Path $src)) { Warn "Missing in zip: $f - skipping"; continue }
    Step "Copy $f"
    if ($WhatIf) { Info "(would copy from zip)" }
    else {
        try { Copy-Item -Recurse -Force $src $dst; Ok "copied" }
        catch { Warn "Could not copy $f - $($_.Exception.Message)" }
    }
}
Write-Host ""

# -- Step 3: add individual new files into folders that already exist -------
Write-Host "--- Step 3: Adding new files into existing folders (Common/, Contribution/) ---" -ForegroundColor Cyan
$filesToCopyIn = @(
    "components\Common\ConfirmModal.tsx",
    "components\Common\InlineCommentThread.tsx",
    "components\Contribution\FlagRow.tsx",
    "components\Contribution\CaseMixTile.tsx"
)
foreach ($f in $filesToCopyIn) {
    $src = Join-Path $srcZip $f
    $dst = Join-Path $srcProject $f
    if (-not (Test-Path $src)) { Warn "Missing in zip: $f - skipping"; continue }
    Step "Add $f"
    if ($WhatIf) { Info "(would copy from zip)" }
    else {
        try {
            New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
            Copy-Item -Force $src $dst; Ok "added"
        }
        catch { Warn "Could not add $f - $($_.Exception.Message)" }
    }
}
Write-Host ""

# -- Step 4: overwrite existing files whose import paths / content changed --
Write-Host "--- Step 4: Updating existing files (import paths, READMEs) ---" -ForegroundColor Cyan
$filesToOverwrite = @(
    "components\README.md",
    "components\Common\README.md",
    "components\Contribution\README.md",
    "pages\system\ClientDictionaryPage.tsx",
    "pages\AccessionPage\AccessionPage.tsx",
    "pages\SynopticReportPage\SynopticReportPage.tsx",
    "pages\ContributionDashboardPage.tsx",
    "components\Config\Templates\TemplateRenderer.tsx"
)
foreach ($f in $filesToOverwrite) {
    $src = Join-Path $srcZip $f
    $dst = Join-Path $srcProject $f
    if (-not (Test-Path $src)) { Warn "Missing in zip: $f - skipping"; continue }
    Step "Update $f"
    if ($WhatIf) { Info "(would overwrite)" }
    else {
        try { Copy-Item -Force $src $dst; Ok "updated" }
        catch { Warn "Could not update $f - $($_.Exception.Message)" }
    }
}
Write-Host ""

# -- Step 5: verification ----------------------------------------------------
Write-Host "--- Step 5: Verification ---" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "Skipped (preview mode)." -ForegroundColor DarkGray
} else {
    $stillThere = $foldersToDelete | Where-Object { Test-Path (Join-Path $srcProject $_) }
    if ($stillThere) {
        Warn "These old folders are still present: $($stillThere -join ', ')"
    } else {
        Ok "All 7 old folders confirmed gone."
    }

    $expectedNew = $foldersToCopy + $filesToCopyIn
    $missingNew = $expectedNew | Where-Object { -not (Test-Path (Join-Path $srcProject $_)) }
    if ($missingNew) {
        Warn "These expected new paths are missing: $($missingNew -join ', ')"
    } else {
        Ok "All new folders/files confirmed present."
    }
}
Write-Host ""

if ($WhatIf) {
    Write-Host "Preview complete. Re-run without -WhatIf to actually apply." -ForegroundColor Magenta
} elseif ($hadError) {
    Write-Host "Finished with warnings above - check them before committing." -ForegroundColor Red
} else {
    Write-Host "Done. Next steps:" -ForegroundColor Green
    Write-Host "  1. cd `"$ProjectRoot`""
    Write-Host "  2. npx tsc --noEmit -p ."
    Write-Host "  3. Review the diff (git status / git diff), then commit."
}
