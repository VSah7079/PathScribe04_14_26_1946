<#
.SYNOPSIS
  Fixes the 4 root causes behind the tsc errors from the naming-pass run:
  1. Removes the accidentally-nested ClientDictionary\ClientDictionary\
  2. Adds the missing internalAiOrchestratorEnabled field to IClientService.ts
  3. Adds the missing services/specimenDictionary/specimenTypes.ts
  4. Fixes orchestratorEngine.ts's import to point at tiptapBridge/ instead
     of the old integration/ path

.USAGE
  1. Unzip catchup-fixes.zip somewhere, e.g. Downloads.
  2. From pathscribe-ai\scripts\:

       powershell -ExecutionPolicy Bypass -File .\apply-catchup-fixes.ps1 -WhatIf
       powershell -ExecutionPolicy Bypass -File .\apply-catchup-fixes.ps1
#>

param(
    [string]$ProjectRoot    = "$env:USERPROFILE\Documents\pathscribe-ai",
    [string]$ZipExtractRoot = "$env:USERPROFILE\Downloads\catchup-fixes",
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$hadError = $false

function Step($msg) { Write-Host "-> $msg" -ForegroundColor Yellow }
function Info($msg) { Write-Host "   $msg" -ForegroundColor DarkGray }
function Ok($msg)   { Write-Host "   OK: $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   WARNING: $msg" -ForegroundColor Red; $script:hadError = $true }

Write-Host "=== Catch-up fixes: IClientService, specimenTypes, tiptapBridge import, ClientDictionary nesting ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
Write-Host "Zip source:   $ZipExtractRoot"
if ($WhatIf) { Write-Host "Mode: PREVIEW ONLY (-WhatIf)" -ForegroundColor Magenta }
Write-Host ""

if (-not (Test-Path $ProjectRoot)) { throw "Project root not found: $ProjectRoot" }
if (-not (Test-Path $ZipExtractRoot)) { throw "Zip extract folder not found: $ZipExtractRoot. Unzip catchup-fixes.zip first." }

$srcProject = Join-Path $ProjectRoot "src"
$srcZip     = Join-Path $ZipExtractRoot "src"
if (-not (Test-Path $srcZip)) { throw "Expected a 'src' folder inside $ZipExtractRoot." }

# -- Fix 1: remove the nested ClientDictionary\ClientDictionary\ ------------
Write-Host "--- Fix 1: ClientDictionary double-nesting ---" -ForegroundColor Cyan
$nested = Join-Path $srcProject "components\ClientDictionary\ClientDictionary"
if (Test-Path $nested) {
    Step "Remove nested folder: components\ClientDictionary\ClientDictionary"
    if ($WhatIf) { Info "(would delete)" }
    else {
        try { Remove-Item -Recurse -Force $nested; Ok "removed" }
        catch { Warn "Could not remove nested folder - $($_.Exception.Message)" }
    }
} else {
    Info "Not present, nothing to remove."
}
Write-Host ""

# -- Fix 2 & 3: overwrite/add the 2 missing/incomplete files ----------------
Write-Host "--- Fix 2 & 3: IClientService.ts field, specimenTypes.ts file ---" -ForegroundColor Cyan
$filesToCopy = @(
    "services\clients\IClientService.ts",
    "services\specimenDictionary\specimenTypes.ts",
    "orchestrator\orchestratorEngine.ts"
)
foreach ($f in $filesToCopy) {
    $src = Join-Path $srcZip $f
    $dst = Join-Path $srcProject $f
    if (-not (Test-Path $src)) { Warn "Missing in zip: $f - skipping"; continue }
    Step "Update $f"
    if ($WhatIf) { Info "(would copy from zip, creating folders if needed)" }
    else {
        try {
            New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
            Copy-Item -Force $src $dst
            Ok "updated"
        }
        catch { Warn "Could not update $f - $($_.Exception.Message)" }
    }
}
Write-Host ""

if ($WhatIf) {
    Write-Host "Preview complete. Re-run without -WhatIf to actually apply." -ForegroundColor Magenta
} elseif ($hadError) {
    Write-Host "Finished with warnings above - check them before committing." -ForegroundColor Red
} else {
    Write-Host "Done. Next: cd `"$ProjectRoot`" && npx tsc --noEmit -p ." -ForegroundColor Green
}
