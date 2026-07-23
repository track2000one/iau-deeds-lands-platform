$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$ThemeFile = Join-Path $ProjectRoot "src\app\components\ThemeInitializer.tsx"
$Sentinel = "Dark-theme compatibility layer"
$Marker = "    @media (max-width: 1279px) {"

if (-not (Test-Path $ThemeFile)) {
    throw "لم يتم العثور على الملف: $ThemeFile"
}

$content = Get-Content $ThemeFile -Raw -Encoding UTF8

if ($content.Contains($Sentinel)) {
    Write-Host "الإصلاح موجود مسبقًا، لم يتم تكراره." -ForegroundColor Yellow
    exit 0
}

if (-not $content.Contains($Marker)) {
    throw "تعذر العثور على موضع الإدراج داخل ThemeInitializer.tsx"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$ThemeFile.backup-$timestamp"
Copy-Item $ThemeFile $backup -Force

$contrastCss = @'

    /*
     * Dark-theme compatibility layer
     * يعالج الصفحات القديمة التي تستخدم خلفيات فاتحة ثابتة مع النص الداكن.
     */
    html[data-appearance-mode="dark"] {
      color-scheme: dark;
    }

    html[data-appearance-mode="dark"] body,
    html[data-appearance-mode="dark"] main {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main [class*="bg-white"],
    html[data-appearance-mode="dark"] main [class*="bg-slate-50"],
    html[data-appearance-mode="dark"] main [class*="bg-sky-50"],
    html[data-appearance-mode="dark"] main [class*="bg-blue-50"],
    html[data-appearance-mode="dark"] main [class*="bg-violet-50"],
    html[data-appearance-mode="dark"] main [class*="bg-gray-50"] {
      color: hsl(var(--foreground)) !important;
      background-color: var(--appearance-glass-strong) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main [class*="from-white"],
    html[data-appearance-mode="dark"] main [class*="via-white"],
    html[data-appearance-mode="dark"] main [class*="from-sky-50"],
    html[data-appearance-mode="dark"] main [class*="via-sky-50"],
    html[data-appearance-mode="dark"] main [class*="to-sky-50"],
    html[data-appearance-mode="dark"] main [class*="from-blue-50"],
    html[data-appearance-mode="dark"] main [class*="to-blue-50"],
    html[data-appearance-mode="dark"] main [class*="from-violet-50"],
    html[data-appearance-mode="dark"] main [class*="to-violet-50"] {
      color: hsl(var(--foreground)) !important;
      background-image:
        radial-gradient(circle at 14% 8%, var(--appearance-glow), transparent 28%),
        radial-gradient(circle at 88% 16%, var(--appearance-glow-secondary), transparent 28%),
        linear-gradient(
          135deg,
          var(--appearance-glass-strong),
          var(--appearance-glass)
        ) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main .text-slate-950,
    html[data-appearance-mode="dark"] main .text-slate-900,
    html[data-appearance-mode="dark"] main .text-slate-800,
    html[data-appearance-mode="dark"] main .text-slate-700,
    html[data-appearance-mode="dark"] main .text-gray-950,
    html[data-appearance-mode="dark"] main .text-gray-900,
    html[data-appearance-mode="dark"] main .text-gray-800,
    html[data-appearance-mode="dark"] main .text-gray-700 {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main .text-slate-600,
    html[data-appearance-mode="dark"] main .text-slate-500,
    html[data-appearance-mode="dark"] main .text-gray-600,
    html[data-appearance-mode="dark"] main .text-gray-500 {
      color: hsl(var(--muted-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main [class*="border-sky-"],
    html[data-appearance-mode="dark"] main [class*="border-blue-"],
    html[data-appearance-mode="dark"] main [class*="border-violet-"],
    html[data-appearance-mode="dark"] main [class*="border-slate-"],
    html[data-appearance-mode="dark"] main [class*="border-gray-"] {
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main input,
    html[data-appearance-mode="dark"] main textarea,
    html[data-appearance-mode="dark"] main select,
    html[data-appearance-mode="dark"] main [role="combobox"] {
      color: hsl(var(--foreground)) !important;
      background-color: hsl(var(--input) / .88) !important;
      border-color: var(--appearance-glass-border) !important;
      caret-color: hsl(var(--primary)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    }

    html[data-appearance-mode="dark"] main input::placeholder,
    html[data-appearance-mode="dark"] main textarea::placeholder {
      color: hsl(var(--muted-foreground)) !important;
      opacity: .92;
    }

    html[data-appearance-mode="dark"] main select option {
      color: hsl(var(--foreground));
      background: hsl(var(--popover));
    }

    html[data-appearance-mode="dark"] main table {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main thead,
    html[data-appearance-mode="dark"] main [data-slot="table-header"] {
      color: hsl(var(--foreground)) !important;
      background: hsl(var(--muted) / .62) !important;
    }

    html[data-appearance-mode="dark"] main th {
      color: hsl(var(--foreground)) !important;
      font-weight: 750;
    }

    html[data-appearance-mode="dark"] main td {
      color: hsl(var(--card-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main tr {
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main tbody tr:hover {
      background: hsl(var(--muted) / .58) !important;
    }

    html[data-appearance-mode="dark"] main hr,
    html[data-appearance-mode="dark"] main [data-orientation="horizontal"] {
      border-color: var(--appearance-glass-border) !important;
      background-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main .future-card,
    html[data-appearance-mode="dark"] main .future-glass-thick {
      color: hsl(var(--card-foreground)) !important;
    }

    /* المحافظة على وضوح الأزرار الأساسية. */
    html[data-appearance-mode="dark"] main button[class*="bg-primary"],
    html[data-appearance-mode="dark"] main button[class*="from-sky-600"],
    html[data-appearance-mode="dark"] main button[class*="from-blue-600"],
    html[data-appearance-mode="dark"] main a[class*="bg-primary"] {
      color: hsl(var(--primary-foreground)) !important;
    }

    /* رفع التباين في المظهرين الداكنين. */
    html[data-appearance-theme="future-neon-dark"] {
      --foreground: 210 100% 97%;
      --card-foreground: 210 100% 97%;
      --muted-foreground: 215 38% 78%;
      --popover-foreground: 210 100% 97%;
    }

    html[data-appearance-theme="silver-noir"] {
      --foreground: 214 52% 97%;
      --card-foreground: 214 52% 97%;
      --muted-foreground: 215 28% 76%;
      --popover-foreground: 214 52% 97%;
    }
'@

$content = $content.Replace($Marker, "$contrastCss`r`n$Marker")
Set-Content -Path $ThemeFile -Value $content -Encoding UTF8

Write-Host "تم إصلاح تباين النصوص والخلفيات الداكنة بنجاح." -ForegroundColor Green
Write-Host "النسخة الاحتياطية:" $backup -ForegroundColor Cyan
