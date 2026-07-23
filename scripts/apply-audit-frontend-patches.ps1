$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Items = ConvertFrom-Json @'
[{"file": "src\\app\\routes.tsx", "label": "Audit page import", "old": "aW1wb3J0IHsgQWRtaW5EYXNoYm9hcmRQYWdlIH0gZnJvbSAnLi9wYWdlcy9BZG1pbkRhc2hib2FyZFBhZ2UnOw==", "new": "aW1wb3J0IHsgQWRtaW5EYXNoYm9hcmRQYWdlIH0gZnJvbSAnLi9wYWdlcy9BZG1pbkRhc2hib2FyZFBhZ2UnOwppbXBvcnQgeyBBdWRpdExvZ1BhZ2UgfSBmcm9tICcuL3BhZ2VzL0F1ZGl0TG9nUGFnZSc7"}, {"file": "src\\app\\routes.tsx", "label": "Audit admin route", "old": "ICAgICAgewogICAgICAgIHBhdGg6ICdhZG1pbicsCiAgICAgICAgZWxlbWVudDogYWRtaW5Pbmx5KDxBZG1pbkRhc2hib2FyZFBhZ2UgLz4pLAogICAgICB9LA==", "new": "ICAgICAgewogICAgICAgIHBhdGg6ICdhZG1pbicsCiAgICAgICAgZWxlbWVudDogYWRtaW5Pbmx5KDxBZG1pbkRhc2hib2FyZFBhZ2UgLz4pLAogICAgICB9LAogICAgICB7CiAgICAgICAgcGF0aDogJ2F1ZGl0JywKICAgICAgICBlbGVtZW50OiBhZG1pbk9ubHkoPEF1ZGl0TG9nUGFnZSAvPiksCiAgICAgIH0s"}, {"file": "src\\app\\components\\Layout.tsx", "label": "Permissions import", "old": "aW1wb3J0IHsgdXNlQXV0aCB9IGZyb20gJy4uLy4uL2NvbnRleHQvQXV0aENvbnRleHQnOw==", "new": "aW1wb3J0IHsgdXNlQXV0aCB9IGZyb20gJy4uLy4uL2NvbnRleHQvQXV0aENvbnRleHQnOwppbXBvcnQgeyB1c2VQZXJtaXNzaW9ucyB9IGZyb20gJy4uLy4uL2NvbnRleHQvUGVybWlzc2lvbnNDb250ZXh0Jzs="}, {"file": "src\\app\\components\\Layout.tsx", "label": "History icon", "old": "ICBDYWxlbmRhckRheXMsCn0gZnJvbSAnbHVjaWRlLXJlYWN0Jzs=", "new": "ICBDYWxlbmRhckRheXMsCiAgSGlzdG9yeSwKfSBmcm9tICdsdWNpZGUtcmVhY3QnOw=="}, {"file": "src\\app\\components\\Layout.tsx", "label": "Admin state", "old": "ICBjb25zdCB7IGxvZ291dCwgdXNlcm5hbWUgfSA9IHVzZUF1dGgoKTs=", "new": "ICBjb25zdCB7IGxvZ291dCwgdXNlcm5hbWUgfSA9IHVzZUF1dGgoKTsKICBjb25zdCB7IGlzQWRtaW4gfSA9IHVzZVBlcm1pc3Npb25zKCk7"}, {"file": "src\\app\\components\\Layout.tsx", "label": "Admin menus", "old": "ICAgIHsgaWQ6ICdhZGQtZGVlZCcsIHBhdGg6ICcvZGVlZHMvbmV3JywgaWNvbjogUGx1c0NpcmNsZSwgbGFiZWw6IHQoJ25hdi5hZGREZWVkJykgfSw=", "new": "ICAgIHsgaWQ6ICdhZGQtZGVlZCcsIHBhdGg6ICcvZGVlZHMvbmV3JywgaWNvbjogUGx1c0NpcmNsZSwgbGFiZWw6IHQoJ25hdi5hZGREZWVkJyksIGFkbWluT25seTogdHJ1ZSB9LA=="}, {"file": "src\\app\\components\\Layout.tsx", "label": "Admin dashboard menu", "old": "ICAgIHsgaWQ6ICdhZG1pbicsIHBhdGg6ICcvYWRtaW4nLCBpY29uOiBTaGllbGQsIGxhYmVsOiB0KCduYXYuYWRtaW4nKSB9LA==", "new": "ICAgIHsgaWQ6ICdhZG1pbicsIHBhdGg6ICcvYWRtaW4nLCBpY29uOiBTaGllbGQsIGxhYmVsOiB0KCduYXYuYWRtaW4nKSwgYWRtaW5Pbmx5OiB0cnVlIH0sCiAgICB7IGlkOiAnYXVkaXQnLCBwYXRoOiAnL2F1ZGl0JywgaWNvbjogSGlzdG9yeSwgbGFiZWw6ICfYs9is2YQg2KfZhNi52YXZhNmK2KfYqicsIGFkbWluT25seTogdHJ1ZSB9LA=="}, {"file": "src\\app\\components\\Layout.tsx", "label": "Audit current page", "old": "ICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy9hZG1pbicpKSByZXR1cm4gJ2FkbWluJzs=", "new": "ICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy9hZG1pbicpKSByZXR1cm4gJ2FkbWluJzsKICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy9hdWRpdCcpKSByZXR1cm4gJ2F1ZGl0Jzs="}, {"file": "src\\app\\components\\Layout.tsx", "label": "Filter admin menu", "old": "ICAgICAgICAgICAgICB7bWVudUl0ZW1zLm1hcCgoaXRlbSkgPT4gew==", "new": "ICAgICAgICAgICAgICB7bWVudUl0ZW1zCiAgICAgICAgICAgICAgICAuZmlsdGVyKAogICAgICAgICAgICAgICAgICAoaXRlbSkgPT4KICAgICAgICAgICAgICAgICAgICAhKCdhZG1pbk9ubHknIGluIGl0ZW0pIHx8CiAgICAgICAgICAgICAgICAgICAgIWl0ZW0uYWRtaW5Pbmx5IHx8CiAgICAgICAgICAgICAgICAgICAgaXNBZG1pbgogICAgICAgICAgICAgICAgKQogICAgICAgICAgICAgICAgLm1hcCgoaXRlbSkgPT4gew=="}, {"file": "src\\context\\AuthContext.tsx", "label": "Audit logout request", "old": "ICBjb25zdCBsb2dvdXQgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7CiAgICBhdXRoU3RvcmFnZS5jbGVhcigpOwogICAgc2V0VXNlclByb2ZpbGUobnVsbCk7CiAgICBzZXRVc2VycyhbXSk7CiAgfTs=", "new": "ICBjb25zdCBsb2dvdXQgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7CiAgICB0cnkgewogICAgICBhd2FpdCBhcGlKc29uPHZvaWQ+KCcvYXBpL2F1dGgvbG9nb3V0JywgewogICAgICAgIG1ldGhvZDogJ1BPU1QnLAogICAgICB9KTsKICAgIH0gY2F0Y2ggKGVycm9yKSB7CiAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHJlY29yZCBsb2dvdXQ6JywgZXJyb3IpOwogICAgfSBmaW5hbGx5IHsKICAgICAgYXV0aFN0b3JhZ2UuY2xlYXIoKTsKICAgICAgc2V0VXNlclByb2ZpbGUobnVsbCk7CiAgICAgIHNldFVzZXJzKFtdKTsKICAgIH0KICB9Ow=="}]
'@

function Decode([string]$Value) {
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

foreach ($Item in $Items) {
  $Path = Join-Path $ProjectRoot $Item.file
  if (-not (Test-Path $Path)) { throw "File not found: $Path" }

  $Content = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
  $Old = Decode $Item.old
  $New = Decode $Item.new

  if ($Content.Contains($New)) {
    Write-Host "Already applied: $($Item.label)"
    continue
  }

  if (-not $Content.Contains($Old)) {
    throw "Target not found: $($Item.label)"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $Path "$Path.backup-$Stamp" -Force
  $Content = $Content.Replace($Old, $New)
  [IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
  Write-Host "Applied: $($Item.label)"
}

Write-Host "Frontend audit patches applied."
