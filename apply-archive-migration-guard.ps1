$ErrorActionPreference = "Stop"

$Path = "C:\iau-deeds-lands-platform\src\app\pages\ArchivePage.tsx"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $Path)) {
    throw "ArchivePage.tsx was not found."
}

$OldText = [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String("ICAgICAgICBhd2FpdCBtaWdyYXRlTGVnYWN5RG9jdW1lbnRzKHJlbW90ZSk7")
)
$NewText = [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String("ICAgICAgICBpZiAoaXNBZG1pbikgewogICAgICAgICAgYXdhaXQgbWlncmF0ZUxlZ2FjeURvY3VtZW50cyhyZW1vdGUpOwogICAgICAgIH0=")
)

$Content = [System.IO.File]::ReadAllText(
    $Path,
    [System.Text.Encoding]::UTF8
)
$Content = $Content.Replace("`r`n", "`n")

if ($Content.Contains($NewText)) {
    Write-Host "Archive migration guard already applied."
    exit 0
}

if (-not $Content.Contains($OldText)) {
    throw "Archive migration target was not found."
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath $Path -Destination "$Path.backup-$Stamp" -Force

$Updated = $Content.Replace($OldText, $NewText)
[System.IO.File]::WriteAllText($Path, $Updated, $Utf8NoBom)

Write-Host "Archive migration guard applied."
