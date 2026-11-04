# scripts/import-xray.ps1
# ---------------------------------------------------------------------------
# Batch 519: imports a PathScribe Xray execution file (Xray JSON, one per
# batch, kept in docs/quality/evidence/) into Xray Cloud as a new Test
# Execution, through Xray's REST API. Xray Cloud has no screen that imports a
# results file; this is the supported route.
#
# Usage, from the repo folder:
#   .\scripts\import-xray.ps1 "$HOME\Downloads\PathScribe-Batch519-xray.json"
#
# The Xray API key (Jira settings > Marketplace apps > Xray > API Keys) is read
# from the user environment variables XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.
# If they aren't set, the script asks you to copy each value to the clipboard
# and press Enter (typed prompts don't accept Ctrl+V in every console), then
# saves them for next time. The key is never written to the repo.
# ---------------------------------------------------------------------------
param([Parameter(Mandatory)][string]$File)
$ErrorActionPreference = 'Stop'
$base = 'https://xray.cloud.getxray.app/api/v2'
if (-not (Test-Path $File)) { throw "File not found: $File" }

function Get-Saved([string]$name) {
  $v = [Environment]::GetEnvironmentVariable($name, 'Process')
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($name, 'User') }
  return $v
}
function Read-FromClipboard([string]$what) {
  Read-Host "Copy the Xray $what to the clipboard, then press Enter" | Out-Null
  $v = ((Get-Clipboard) -join '').Trim()
  if (-not $v) { throw "The clipboard is empty; copy the $what first." }
  return $v
}

$id = Get-Saved 'XRAY_CLIENT_ID'
$secret = Get-Saved 'XRAY_CLIENT_SECRET'
if (-not $id -or -not $secret) {
  Write-Host 'No Xray API key saved yet (Jira settings > Marketplace apps > Xray > API Keys).'
  $id = Read-FromClipboard 'Client ID'
  $secret = Read-FromClipboard 'Client Secret'
  [Environment]::SetEnvironmentVariable('XRAY_CLIENT_ID', $id, 'User')
  [Environment]::SetEnvironmentVariable('XRAY_CLIENT_SECRET', $secret, 'User')
  Set-Clipboard -Value ' '
  Write-Host 'Saved for next time (and the clipboard cleared).'
}

$auth = @{ client_id = $id; client_secret = $secret } | ConvertTo-Json
$token = Invoke-RestMethod -Method Post -Uri "$base/authenticate" -ContentType 'application/json' -Body $auth
$result = Invoke-RestMethod -Method Post -Uri "$base/import/execution" `
  -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json; charset=utf-8' -InFile $File
Write-Host "Imported as Test Execution $($result.key)  https://formedrixai.atlassian.net/browse/$($result.key)"
