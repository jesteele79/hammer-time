$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -TimeoutSec 2 -UseBasicParsing
  if ($response.StatusCode -eq 200) { return }
} catch { }
Set-Location -LiteralPath $taskRoot
$npmPath = (Get-Command npm.cmd).Source
Start-Process -FilePath $npmPath -ArgumentList 'run', 'dev' -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'startup.log') -RedirectStandardError (Join-Path $taskRoot 'startup-error.log')
