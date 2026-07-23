$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Decode-Text([string]$Value) {
    return [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($Value)
    )
}

function Backup-File([string]$Path) {
    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $Backup = "$Path.backup-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    Write-Host "Backup: $Backup"
}

function Replace-Text(
    [string]$Path,
    [string]$OldBase64,
    [string]$NewBase64,
    [string]$Label
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }

    $OldText = Decode-Text $OldBase64
    $NewText = Decode-Text $NewBase64
    $Content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

    if ($Content.Contains($NewText)) {
        Write-Host "Already applied: $Label"
        return
    }

    if (-not $Content.Contains($OldText)) {
        throw "Target text not found: $Label"
    }

    Backup-File $Path
    $Updated = $Content.Replace($OldText, $NewText)
    [System.IO.File]::WriteAllText($Path, $Updated, $Utf8NoBom)
    Write-Host "Applied: $Label"
}

function Remove-Text(
    [string]$Path,
    [string]$OldBase64,
    [string]$Label
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }

    $OldText = Decode-Text $OldBase64
    $Content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

    if (-not $Content.Contains($OldText)) {
        Write-Host "Already removed: $Label"
        return
    }

    Backup-File $Path
    $Updated = $Content.Replace($OldText + [Environment]::NewLine, "")
    $Updated = $Updated.Replace($OldText, "")
    [System.IO.File]::WriteAllText($Path, $Updated, $Utf8NoBom)
    Write-Host "Removed: $Label"
}

$ConfigDirectory = Join-Path $ProjectRoot "src\app\config"
$BrandingPath = Join-Path $ConfigDirectory "branding.ts"

New-Item -ItemType Directory -Path $ConfigDirectory -Force | Out-Null

$BrandingText = Decode-Text "ZXhwb3J0IGNvbnN0IFBMQVRGT1JNX0xPR09fVVJMID0KICAnaHR0cHM6Ly9pYXUtZGVlZHMtZnJvbnRlbmQtcHJvZHVjdGlvbi51cC5yYWlsd2F5LmFwcC9hc3NldHMvMTAzMTQ0LURvU2xyaHBBLnBuZyc7Cg=="
[System.IO.File]::WriteAllText($BrandingPath, $BrandingText, $Utf8NoBom)
Write-Host "Created: branding.ts"

$LayoutPath = Join-Path $ProjectRoot "src\app\components\Layout.tsx"
$HomePath = Join-Path $ProjectRoot "src\app\pages\HomePage.tsx"
$LoginPath = Join-Path $ProjectRoot "src\app\pages\LoginPage.tsx"
$IndexPath = Join-Path $ProjectRoot "index.html"

Replace-Text $LayoutPath "aW1wb3J0IHsgVGhlbWVJbml0aWFsaXplciB9IGZyb20gJy4vVGhlbWVJbml0aWFsaXplcic7" "aW1wb3J0IHsgVGhlbWVJbml0aWFsaXplciB9IGZyb20gJy4vVGhlbWVJbml0aWFsaXplcic7CmltcG9ydCB7IFBMQVRGT1JNX0xPR09fVVJMIH0gZnJvbSAnLi4vY29uZmlnL2JyYW5kaW5nJzs=" "Layout branding import"
Replace-Text $LayoutPath "ICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImgtMTIgdy0xMiByb3VuZGVkLTJ4bCBib3JkZXIgYmctcHJpbWFyeS8xMCBncmlkIHBsYWNlLWl0ZW1zLWNlbnRlciBzaGFkb3ctWzBfMF8yNXB4X2hzbCh2YXIoLS1wcmltYXJ5KS8wLjI1KV0iPgogICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPSJoLTcgdy03IHRleHQtcHJpbWFyeSIgLz4KICAgICAgICAgICAgPC9kaXY+" "ICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfQogICAgICAgICAgICAgIGFyaWEtbGFiZWw9IlBsYXRmb3JtIGhvbWUiCiAgICAgICAgICAgICAgY2xhc3NOYW1lPSJoLTEyIHctMTIgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtMnhsIGJvcmRlciBiZy1iYWNrZ3JvdW5kLzYwIHAtMS41IGdyaWQgcGxhY2UtaXRlbXMtY2VudGVyIHNoYWRvdy1bMF8wXzI1cHhfaHNsKHZhcigtLXByaW1hcnkpLzAuMjUpXSB0cmFuc2l0aW9uLXRyYW5zZm9ybSBob3ZlcjpzY2FsZS0xMDUiCiAgICAgICAgICAgID4KICAgICAgICAgICAgICA8aW1nCiAgICAgICAgICAgICAgICBzcmM9e1BMQVRGT1JNX0xPR09fVVJMfQogICAgICAgICAgICAgICAgYWx0PSJQbGF0Zm9ybSBsb2dvIgogICAgICAgICAgICAgICAgY2xhc3NOYW1lPSJoLWZ1bGwgdy1mdWxsIG9iamVjdC1jb250YWluIgogICAgICAgICAgICAgIC8+CiAgICAgICAgICAgIDwvYnV0dG9uPg==" "Header platform logo"

Replace-Text $HomePath "aW1wb3J0IHsgdXNlRGF0YSB9IGZyb20gJy4uLy4uL2NvbnRleHQvRGF0YUNvbnRleHQnOw==" "aW1wb3J0IHsgdXNlRGF0YSB9IGZyb20gJy4uLy4uL2NvbnRleHQvRGF0YUNvbnRleHQnOwppbXBvcnQgeyBQTEFURk9STV9MT0dPX1VSTCB9IGZyb20gJy4uL2NvbmZpZy9icmFuZGluZyc7" "Home branding import"
Replace-Text $HomePath "ICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmdXR1cmUtc2hpZWxkIj4KICAgICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9ImgtMjQgdy0yNCIgLz4KICAgICAgICAgICAgICAgIDwvZGl2Pg==" "ICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmdXR1cmUtc2hpZWxkIj4KICAgICAgICAgICAgICAgICAgPGltZwogICAgICAgICAgICAgICAgICAgIHNyYz17UExBVEZPUk1fTE9HT19VUkx9CiAgICAgICAgICAgICAgICAgICAgYWx0PSJQbGF0Zm9ybSBsb2dvIgogICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0iaC0zNiB3LTM2IG9iamVjdC1jb250YWluIGRyb3Atc2hhZG93LVswXzBfMzBweF9oc2wodmFyKC0tcHJpbWFyeSkvMC4zNSldIgogICAgICAgICAgICAgICAgICAvPgogICAgICAgICAgICAgICAgPC9kaXY+" "Home hero platform logo"

Replace-Text $LoginPath "aW1wb3J0IHsgdXNlQXV0aCB9IGZyb20gJy4uLy4uL2NvbnRleHQvQXV0aENvbnRleHQnOw==" "aW1wb3J0IHsgdXNlQXV0aCB9IGZyb20gJy4uLy4uL2NvbnRleHQvQXV0aENvbnRleHQnOwppbXBvcnQgeyBQTEFURk9STV9MT0dPX1VSTCB9IGZyb20gJy4uL2NvbmZpZy9icmFuZGluZyc7" "Login branding import"
Remove-Text $LoginPath "aW1wb3J0IGxvZ29JbWFnZSBmcm9tICcuLi8uLi9pbXBvcnRzLzEwMzE0NC5wbmcnOw==" "Old local logo import"
Replace-Text $LoginPath "c3JjPXtsb2dvSW1hZ2V9" "c3JjPXtQTEFURk9STV9MT0dPX1VSTH0=" "Login platform logo"

Replace-Text $IndexPath "ICAgICAgPHRpdGxlPtmF2YbYtdipINij2YXZhNin2YMg2KfZhNis2KfZhdi52Kkg2YjYp9mE2LXZg9mI2YM8L3RpdGxlPg==" "ICAgICAgPHRpdGxlPtmF2YbYtdipINij2YXZhNin2YMg2KfZhNis2KfZhdi52Kkg2YjYp9mE2LXZg9mI2YM8L3RpdGxlPgogICAgICA8bGluayByZWw9Imljb24iIHR5cGU9ImltYWdlL3BuZyIgaHJlZj0iaHR0cHM6Ly9pYXUtZGVlZHMtZnJvbnRlbmQtcHJvZHVjdGlvbi51cC5yYWlsd2F5LmFwcC9hc3NldHMvMTAzMTQ0LURvU2xyaHBBLnBuZyIgLz4KICAgICAgPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJodHRwczovL2lhdS1kZWVkcy1mcm9udGVuZC1wcm9kdWN0aW9uLnVwLnJhaWx3YXkuYXBwL2Fzc2V0cy8xMDMxNDQtRG9TbHJocEEucG5nIiAvPg==" "Browser favicon"

Write-Host ""
Write-Host "DONE: platform logo adopted."
Write-Host "Next: npm.cmd run build"
