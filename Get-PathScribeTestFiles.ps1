# Get-PathScribeTestFiles.ps1
# Read-only. Changes nothing. Lists every test file in the repo with a short fingerprint
# so the list can be compared with the one on the build side.
# Run from the repository folder:
#   powershell -ExecutionPolicy Bypass -File .\Get-PathScribeTestFiles.ps1
# It saves TestFiles.txt in the same folder. Attach that file.

$root = (Get-Location).Path
$files = Get-ChildItem -Path $root -Recurse -File -Include '*.test.ts','*.test.tsx','*.guard.ts','*.guard.tsx','test_*.py','*_test.py' |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\\.git\\' } |
  Sort-Object FullName

$lines = foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  # Normalise line endings so Windows and Linux copies of the same file match.
  $text = [System.IO.File]::ReadAllText($f.FullName) -replace "`r`n", "`n"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace '-', '').Substring(0, 8).ToLower()
  "$hash $rel"
}

$header = "Test files: $(@($files).Count)"
@($header) + $lines | Set-Content -Path 'TestFiles.txt' -Encoding UTF8
Write-Host $header
Write-Host 'Saved to TestFiles.txt'
