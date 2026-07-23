$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$SourceLogo = Join-Path $PackageRoot "public\platform-logo.png"
$SourceBranding = Join-Path $PackageRoot "src\app\config\branding.ts"
$SourceIndex = Join-Path $PackageRoot "index.html"

$TargetPublic = Join-Path $ProjectRoot "public"
$TargetConfig = Join-Path $ProjectRoot "src\app\config"
$TargetLogo = Join-Path $TargetPublic "platform-logo.png"
$TargetBranding = Join-Path $TargetConfig "branding.ts"
$TargetIndex = Join-Path $ProjectRoot "index.html"

New-Item -ItemType Directory -Path $TargetPublic -Force | Out-Null
New-Item -ItemType Directory -Path $TargetConfig -Force | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (Test-Path -LiteralPath $TargetLogo) {
    Copy-Item -LiteralPath $TargetLogo -Destination "$TargetLogo.backup-$Stamp" -Force
}

if (Test-Path -LiteralPath $TargetBranding) {
    Copy-Item -LiteralPath $TargetBranding -Destination "$TargetBranding.backup-$Stamp" -Force
}

if (Test-Path -LiteralPath $TargetIndex) {
    Copy-Item -LiteralPath $TargetIndex -Destination "$TargetIndex.backup-$Stamp" -Force
}

Copy-Item -LiteralPath $SourceLogo -Destination $TargetLogo -Force
Copy-Item -LiteralPath $SourceBranding -Destination $TargetBranding -Force
Copy-Item -LiteralPath $SourceIndex -Destination $TargetIndex -Force

Write-Host ""
Write-Host "DONE: local platform logo installed."
Write-Host "Logo URL: /platform-logo.png"
Write-Host "Next: npm.cmd run build"
