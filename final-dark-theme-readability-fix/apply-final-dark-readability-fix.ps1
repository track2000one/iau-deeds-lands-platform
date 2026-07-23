$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$FilePath = Join-Path $ProjectRoot "src\app\components\ThemeInitializer.tsx"

if (-not (Test-Path $FilePath)) {
    throw "لم يتم العثور على الملف: $FilePath"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$FilePath.backup-$timestamp"
Copy-Item $FilePath $backupPath -Force

$content = Get-Content $FilePath -Raw -Encoding UTF8

function Replace-Required {
    param([string]$Name, [string]$OldText, [string]$NewText)

    if (-not $script:content.Contains($OldText)) {
        throw "تعذر تطبيق التعديل: $Name"
    }

    $script:content = $script:content.Replace($OldText, $NewText)
    Write-Host "تم: $Name" -ForegroundColor Cyan
}

Replace-Required `
    "منع ألوان الخط القديمة من تجاوز السمة الداكنة" `
    "const applyFontControls = (settings: FontControlSettings) => {" `
    "const applyFontControls = (`r`n  settings: FontControlSettings,`r`n  allowColorOverrides = true`r`n) => {"

$oldColorBlock = @'
  const optionalColors = [
    ['--foreground', settings.foreground],
    ['--muted-foreground', settings.mutedForeground],
    ['--card-foreground', settings.cardForeground],
    ['--sidebar-foreground', settings.sidebarForeground],
    ['--primary', settings.primary],
  ] as const;

  optionalColors.forEach(([variable, color]) => {
    if (!color) return;
    const hsl = hexToHsl(color);
    if (hsl) root.style.setProperty(variable, hsl);
  });

  if (settings.sidebarForeground) {
    const sidebar = hexToHsl(settings.sidebarForeground);
    if (sidebar) {
      root.style.setProperty('--sidebar-accent-foreground', sidebar);
    }
  }

  if (settings.primary) {
    const primary = hexToHsl(settings.primary);
    if (primary) {
      root.style.setProperty('--ring', primary);
      root.style.setProperty('--sidebar-primary', primary);
    }
  }
'@

$newColorBlock = @'
  if (allowColorOverrides) {
    const optionalColors = [
      ['--foreground', settings.foreground],
      ['--muted-foreground', settings.mutedForeground],
      ['--card-foreground', settings.cardForeground],
      ['--sidebar-foreground', settings.sidebarForeground],
      ['--primary', settings.primary],
    ] as const;

    optionalColors.forEach(([variable, color]) => {
      if (!color) return;
      const hsl = hexToHsl(color);
      if (hsl) root.style.setProperty(variable, hsl);
    });

    if (settings.sidebarForeground) {
      const sidebar = hexToHsl(settings.sidebarForeground);
      if (sidebar) {
        root.style.setProperty('--sidebar-accent-foreground', sidebar);
      }
    }

    if (settings.primary) {
      const primary = hexToHsl(settings.primary);
      if (primary) {
        root.style.setProperty('--ring', primary);
        root.style.setProperty('--sidebar-primary', primary);
      }
    }
  }
'@

Replace-Required `
    "تقييد تخصيص ألوان الخط بالمظاهر الفاتحة" `
    $oldColorBlock `
    $newColorBlock

Replace-Required `
    "تطبيق الخط دون ألوان مخصصة في الوضع الداكن" `
    "applyFontControls(JSON.parse(storedFont));" `
    "applyFontControls(`r`n          JSON.parse(storedFont),`r`n          normalizedTheme.mode !== 'dark'`r`n        );"

$contrastCss = @'

    /* Final readability layer */
    html[data-appearance-mode="dark"] main {
      color: hsl(var(--foreground)) !important;
      background:
        radial-gradient(circle at 12% 8%, var(--appearance-glow), transparent 30%),
        radial-gradient(circle at 88% 15%, var(--appearance-glow-secondary), transparent 30%),
        hsl(var(--background) / .86) !important;
    }

    html[data-appearance-mode="dark"] main [class~="bg-white"],
    html[data-appearance-mode="dark"] main [class~="bg-white/70"],
    html[data-appearance-mode="dark"] main [class~="bg-white/75"],
    html[data-appearance-mode="dark"] main [class~="bg-white/80"],
    html[data-appearance-mode="dark"] main [class~="bg-white/85"],
    html[data-appearance-mode="dark"] main [class~="bg-white/90"],
    html[data-appearance-mode="dark"] main [class~="bg-white/95"],
    html[data-appearance-mode="dark"] main [class~="from-white"],
    html[data-appearance-mode="dark"] main [class~="via-white"],
    html[data-appearance-mode="dark"] main [class~="to-white"] {
      color: hsl(var(--card-foreground)) !important;
      background-color: var(--appearance-glass-strong) !important;
      background-image:
        radial-gradient(circle at 14% 8%, var(--appearance-glow), transparent 28%),
        radial-gradient(circle at 88% 16%, var(--appearance-glow-secondary), transparent 28%),
        linear-gradient(135deg, var(--appearance-glass-strong), var(--appearance-glass)) !important;
      border-color: var(--appearance-glass-border) !important;
      box-shadow:
        var(--appearance-card-shadow),
        inset 0 1px 0 rgba(255,255,255,.08) !important;
    }

    html[data-appearance-mode="dark"] main table,
    html[data-appearance-mode="dark"] main thead,
    html[data-appearance-mode="dark"] main tbody,
    html[data-appearance-mode="dark"] main tr,
    html[data-appearance-mode="dark"] main th,
    html[data-appearance-mode="dark"] main td {
      background-color: transparent !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main th {
      color: hsl(var(--foreground)) !important;
      font-weight: 750 !important;
    }

    html[data-appearance-mode="dark"] main td {
      color: hsl(var(--card-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main input,
    html[data-appearance-mode="dark"] main textarea,
    html[data-appearance-mode="dark"] main select,
    html[data-appearance-mode="dark"] main [role="combobox"] {
      color: hsl(var(--foreground)) !important;
      background-color: hsl(var(--input) / .92) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main input::placeholder,
    html[data-appearance-mode="dark"] main textarea::placeholder {
      color: hsl(var(--muted-foreground)) !important;
      opacity: .95 !important;
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
    html[data-appearance-mode="dark"] main .text-gray-500,
    html[data-appearance-mode="dark"] main .text-muted-foreground {
      color: hsl(var(--muted-foreground)) !important;
    }

    html[data-appearance-theme="future-neon-dark"] {
      --foreground: 210 100% 98%;
      --card-foreground: 210 100% 98%;
      --muted-foreground: 215 42% 82%;
      --sidebar-foreground: 210 100% 97%;
      --sidebar-accent-foreground: 210 100% 98%;
    }

    html[data-appearance-theme="silver-noir"] {
      --foreground: 214 55% 98%;
      --card-foreground: 214 55% 98%;
      --muted-foreground: 215 32% 80%;
      --sidebar-foreground: 214 55% 97%;
      --sidebar-accent-foreground: 214 55% 98%;
    }
'@

$marker = "    @media (max-width: 1279px) {"

if (-not $content.Contains("Final readability layer")) {
    if (-not $content.Contains($marker)) {
        throw "تعذر العثور على موضع إضافة تنسيقات التباين."
    }

    $content = $content.Replace($marker, "$contrastCss`r`n`r`n$marker")
    Write-Host "تم: إضافة طبقة التباين النهائية" -ForegroundColor Cyan
} else {
    Write-Host "طبقة التباين النهائية موجودة مسبقًا." -ForegroundColor Yellow
}

Set-Content -Path $FilePath -Value $content -Encoding UTF8

Write-Host ""
Write-Host "تم إصلاح وضوح الخطوط والأسطح في المظاهر الداكنة." -ForegroundColor Green
Write-Host "النسخة الاحتياطية: $backupPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "نفذ الآن: npm.cmd run build" -ForegroundColor Cyan
