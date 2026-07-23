$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$PackageRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$SourceFix = Join-Path $PackageRoot "src\lib\leafletIconFix.ts"
$TargetFix = Join-Path $ProjectRoot "src\lib\leafletIconFix.ts"
$MainPath = Join-Path $ProjectRoot "src\main.tsx"

if (-not (Test-Path -LiteralPath $SourceFix)) {
    throw "Source leafletIconFix.ts was not found."
}

if (-not (Test-Path -LiteralPath $MainPath)) {
    throw "src\main.tsx was not found."
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Path (Split-Path -Parent $TargetFix) -Force | Out-Null

if (Test-Path -LiteralPath $TargetFix) {
    Copy-Item -LiteralPath $TargetFix -Destination "$TargetFix.backup-$Stamp" -Force
}

Copy-Item -LiteralPath $SourceFix -Destination $TargetFix -Force
Write-Host "Copied: leafletIconFix.ts"

$JsonText = [Text.Encoding]::UTF8.GetString(
    [Convert]::FromBase64String("eyJmaXhJbXBvcnQiOiAiaW1wb3J0ICdsZWFmbGV0L2Rpc3QvbGVhZmxldC5jc3MnO1xuaW1wb3J0ICcuL2xpYi9sZWFmbGV0SWNvbkZpeCc7IiwgImNhbmRpZGF0ZXMiOiBbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7IiwgImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjsiLCAiaW1wb3J0IHsgU3RyaWN0TW9kZSB9IGZyb20gJ3JlYWN0JzsiLCAiaW1wb3J0IHsgU3RyaWN0TW9kZSB9IGZyb20gXCJyZWFjdFwiOyJdfQ==")
)
$Config = $JsonText | ConvertFrom-Json

$Content = [IO.File]::ReadAllText($MainPath, [Text.Encoding]::UTF8)
$FixImport = [string]$Config.fixImport

if ($Content.Contains("import './lib/leafletIconFix';")) {
    Write-Host "Leaflet marker imports already exist."
} else {
    $Inserted = $false

    foreach ($Candidate in $Config.candidates) {
        if ($Content.Contains([string]$Candidate)) {
            Copy-Item -LiteralPath $MainPath -Destination "$MainPath.backup-$Stamp" -Force

            $Replacement = [string]$Candidate + [Environment]::NewLine + $FixImport
            $Content = $Content.Replace([string]$Candidate, $Replacement)
            $Inserted = $true
            break
        }
    }

    if (-not $Inserted) {
        Copy-Item -LiteralPath $MainPath -Destination "$MainPath.backup-$Stamp" -Force
        $Content = $FixImport + [Environment]::NewLine + $Content
    }

    [IO.File]::WriteAllText($MainPath, $Content, $Utf8NoBom)
    Write-Host "Updated: src\main.tsx"
}

Write-Host ""
Write-Host "DONE: Leaflet default marker fixed."
Write-Host "Next: npm.cmd run build"
