# Get-PathScribeRepoInfo.ps1
# Read-only. Changes nothing in your repository.
# Run from the repository folder:  .\Get-PathScribeRepoInfo.ps1
# Then paste or attach the text it prints (also saved to RepoInfo.txt in the same folder).

$ErrorActionPreference = 'Continue'
$out = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$s) { $out.Add($s) | Out-Null; Write-Host $s }
function Section([string]$t) { Add-Line ''; Add-Line "=== $t ===" }

# Hide any credentials embedded in remote URLs (https://user:token@host/...)
function Hide-Creds([string]$s) { return ($s -replace '://[^/@\s]+@', '://***@') }

Section 'Git version and folder'
Add-Line (git --version)
Add-Line (Get-Location).Path

Section 'Remotes'
git remote -v | ForEach-Object { Add-Line (Hide-Creds $_) }

Section 'Current branch and working tree'
Add-Line ("Current branch: " + (git rev-parse --abbrev-ref HEAD))
$dirty = git status --porcelain
Add-Line ("Uncommitted changed files: " + @($dirty).Count)

Section 'Default branch on the remote'
git remote show origin 2>&1 | Select-String 'HEAD branch' | ForEach-Object { Add-Line $_.Line.Trim() }

Section 'Branches (local and remote)'
git branch -a -vv | ForEach-Object { Add-Line (Hide-Creds $_) }

Section 'Last 5 commits on each of master, main and Development (if present)'
foreach ($b in 'master','main','Development','development') {
  foreach ($ref in $b, "origin/$b") {
    git rev-parse --verify --quiet $ref *> $null
    if ($LASTEXITCODE -eq 0) {
      Add-Line ''
      Add-Line "--- $ref ---"
      git log $ref -5 --date=short --pretty=format:'%h %ad %an  %s' | ForEach-Object { Add-Line $_ }
    }
  }
}

Section 'How far Development is from master (behind / ahead)'
foreach ($pair in @(@('origin/master','origin/Development'), @('origin/main','origin/Development'))) {
  git rev-parse --verify --quiet $pair[0] *> $null; $a = $LASTEXITCODE
  git rev-parse --verify --quiet $pair[1] *> $null; $b = $LASTEXITCODE
  if ($a -eq 0 -and $b -eq 0) {
    $counts = (git rev-list --left-right --count "$($pair[0])...$($pair[1])")
    Add-Line "$($pair[0]) ... $($pair[1])  (only-in-first, only-in-second): $counts"
  }
}

Section 'Latest delivered batch in the working tree'
$q = 'docs/product/FRONTEND_COMPLETION_QUEUE.md'
if (Test-Path $q) {
  Select-String -Path $q -Pattern '^## Batch \d+.*' | ForEach-Object { $_.Line } | Select-Object -Last 12 | ForEach-Object { Add-Line $_ }
  Add-Line ''
  Add-Line 'Lines that say DELIVERED (last 6):'
  Select-String -Path $q -Pattern 'DELIVERED' | ForEach-Object { $_.Line.Trim() } | Select-Object -Last 6 | ForEach-Object { Add-Line $_ }
} else { Add-Line "Not found: $q" }

Section 'Xray evidence files present'
$ev = 'docs/quality/evidence'
if (Test-Path $ev) {
  Get-ChildItem $ev -Filter 'PathScribe-Batch*-xray.json' | Sort-Object Name | ForEach-Object { Add-Line $_.Name }
} else { Add-Line "Not found: $ev" }

Section 'Test count marker (first line of the last vitest summary, if saved)'
Add-Line 'Run "npx vitest run" yourself and paste the last 6 lines if you want me to compare counts.'

$out | Set-Content -Path 'RepoInfo.txt' -Encoding UTF8
Write-Host ''
Write-Host 'Saved to RepoInfo.txt'
