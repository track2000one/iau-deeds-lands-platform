from pathlib import Path

layout_path = Path('src/app/components/Layout.tsx')
layout = layout_path.read_text(encoding='utf-8')
old_root = '<div className="future-app-shell min-h-dvh h-dvh w-full min-w-0 flex flex-col overflow-hidden" dir={isRTL ? \'rtl\' : \'ltr\'}>'
new_root = '<div className="neo-platform-shell future-app-shell min-h-dvh h-dvh w-full min-w-0 flex flex-col overflow-hidden" dir={isRTL ? \'rtl\' : \'ltr\'}>'
if layout.count(old_root) != 1:
    raise SystemExit(f'Layout root marker expected once, found {layout.count(old_root)}')
layout = layout.replace(old_root, new_root, 1)
layout_path.write_text(layout, encoding='utf-8')

theme_path = Path('src/app/components/ThemeInitializer.tsx')
theme = theme_path.read_text(encoding='utf-8')
marker = '    @media (max-width: 1279px) {'
if theme.count(marker) != 1:
    raise SystemExit(f'Theme insertion marker expected once, found {theme.count(marker)}')

block = r'''

    /* ===== Full platform Neumorphism / Soft 3D ===== */
    /* Scoped to the authenticated application shell so public/login pages keep their own design. */
    .neo-platform-shell {
      --neo-radius: 22px;
      --neo-radius-sm: 15px;
      --neo-ease: cubic-bezier(.2,.72,.2,1);
      --neo-surface: color-mix(in srgb, hsl(var(--background)) 82%, #e8edf2 18%);
      --neo-surface-soft: color-mix(in srgb, hsl(var(--background)) 90%, #f3f6f8 10%);
      --neo-surface-strong: color-mix(in srgb, hsl(var(--background)) 72%, #dfe6ec 28%);
      --neo-highlight: rgba(255,255,255,.92);
      --neo-highlight-soft: rgba(255,255,255,.56);
      --neo-shadow: color-mix(in srgb, hsl(var(--foreground)) 20%, transparent);
      --neo-shadow-soft: color-mix(in srgb, hsl(var(--foreground)) 11%, transparent);
      --neo-line: color-mix(in srgb, hsl(var(--foreground)) 13%, transparent);
      --neo-primary-soft: color-mix(in srgb, hsl(var(--primary)) 16%, var(--neo-surface));
      --neo-primary-strong: color-mix(in srgb, hsl(var(--primary)) 28%, var(--neo-surface));
      --neo-raised:
        -10px -10px 22px var(--neo-highlight),
        10px 10px 22px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.65),
        inset -1px -1px 0 rgba(15,23,42,.035);
      --neo-raised-sm:
        -5px -5px 11px var(--neo-highlight-soft),
        5px 5px 11px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.55);
      --neo-inset:
        inset 5px 5px 11px var(--neo-shadow-soft),
        inset -5px -5px 11px var(--neo-highlight),
        0 1px 0 rgba(255,255,255,.45);
      position: relative;
      background:
        radial-gradient(circle at 13% 8%, rgba(255,255,255,.85), transparent 24%),
        radial-gradient(circle at 88% 82%, color-mix(in srgb, hsl(var(--primary)) 8%, transparent), transparent 28%),
        linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface-strong));
    }

    html[data-appearance-mode="dark"] .neo-platform-shell {
      --neo-surface: color-mix(in srgb, hsl(var(--background)) 88%, #1d2a36 12%);
      --neo-surface-soft: color-mix(in srgb, hsl(var(--background)) 92%, #263544 8%);
      --neo-surface-strong: color-mix(in srgb, hsl(var(--background)) 82%, #07111b 18%);
      --neo-highlight: rgba(255,255,255,.07);
      --neo-highlight-soft: rgba(255,255,255,.045);
      --neo-shadow: rgba(0,0,0,.58);
      --neo-shadow-soft: rgba(0,0,0,.34);
      --neo-line: rgba(255,255,255,.10);
      --neo-primary-soft: color-mix(in srgb, hsl(var(--primary)) 14%, var(--neo-surface));
      --neo-primary-strong: color-mix(in srgb, hsl(var(--primary)) 24%, var(--neo-surface));
      --neo-raised:
        -9px -9px 20px var(--neo-highlight),
        10px 10px 23px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.05),
        inset -1px -1px 0 rgba(0,0,0,.22);
      --neo-raised-sm:
        -5px -5px 10px var(--neo-highlight-soft),
        5px 5px 11px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.04);
      --neo-inset:
        inset 5px 5px 12px rgba(0,0,0,.30),
        inset -5px -5px 12px rgba(255,255,255,.035),
        0 1px 0 rgba(255,255,255,.03);
    }

    .neo-platform-shell .app-content-row,
    .neo-platform-shell .app-main {
      background: transparent !important;
    }

    .neo-platform-shell .app-main {
      position: relative;
      isolation: isolate;
    }

    .neo-platform-shell .app-main::before {
      content: '';
      position: fixed;
      inset: 64px 0 0;
      z-index: -1;
      pointer-events: none;
      background:
        radial-gradient(circle at 18% 12%, rgba(255,255,255,.46), transparent 24%),
        radial-gradient(circle at 78% 78%, color-mix(in srgb, hsl(var(--primary)) 7%, transparent), transparent 27%);
    }

    .neo-platform-shell .future-topbar {
      border: 0 !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow:
        0 8px 18px var(--neo-shadow-soft),
        inset 0 1px 0 var(--neo-highlight-soft),
        inset 0 -1px 0 var(--neo-line) !important;
    }

    .neo-platform-shell .future-sidebar {
      border-color: var(--neo-line) !important;
      background: linear-gradient(160deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow:
        -5px -3px 14px var(--neo-highlight-soft),
        8px 0 22px var(--neo-shadow-soft),
        inset 1px 0 0 rgba(255,255,255,.18) !important;
    }

    html[dir="ltr"] .neo-platform-shell .future-sidebar {
      box-shadow:
        5px -3px 14px var(--neo-highlight-soft),
        -8px 0 22px var(--neo-shadow-soft),
        inset -1px 0 0 rgba(255,255,255,.18) !important;
    }

    .neo-platform-shell .future-sidebar::before {
      opacity: .18 !important;
      background: radial-gradient(circle at 50% 8%, color-mix(in srgb, hsl(var(--primary)) 12%, transparent), transparent 32%) !important;
    }

    .neo-platform-shell .future-sidebar > div:first-child {
      margin: 12px 12px 4px;
      border: 1px solid var(--neo-line) !important;
      border-radius: 18px;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset);
    }

    .neo-platform-shell .future-nav-item {
      border: 1px solid transparent !important;
      border-radius: 16px !important;
      color: hsl(var(--sidebar-foreground)) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
      transform: translateY(0) !important;
      transition: transform 160ms var(--neo-ease), box-shadow 160ms ease, color 160ms ease, background 160ms ease !important;
    }

    .neo-platform-shell .future-nav-item:hover {
      transform: translateY(-2px) !important;
      border-color: color-mix(in srgb, hsl(var(--primary)) 20%, transparent) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-primary-soft)) !important;
      box-shadow:
        -6px -6px 13px var(--neo-highlight-soft),
        7px 7px 14px var(--neo-shadow-soft) !important;
    }

    .neo-platform-shell .future-nav-item.is-active {
      transform: translateY(0) !important;
      color: hsl(var(--primary)) !important;
      border-color: color-mix(in srgb, hsl(var(--primary)) 28%, transparent) !important;
      background: var(--neo-primary-soft) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main [data-slot="card"],
    .neo-platform-shell main .future-card,
    .neo-platform-shell main .platform-record-card {
      border: 1px solid var(--neo-line) !important;
      border-radius: var(--neo-radius) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      transition: transform 190ms var(--neo-ease), box-shadow 190ms ease, border-color 190ms ease !important;
    }

    .neo-platform-shell main [data-slot="card"]:hover,
    .neo-platform-shell main .future-card:hover,
    .neo-platform-shell main .platform-record-card:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, hsl(var(--primary)) 24%, var(--neo-line)) !important;
      box-shadow:
        -12px -12px 25px var(--neo-highlight),
        12px 12px 26px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.48) !important;
    }

    .neo-platform-shell main [data-slot="card-header"] {
      background: transparent !important;
      box-shadow: inset 0 -1px 0 var(--neo-line) !important;
    }

    .neo-platform-shell main .platform-record-card::before {
      height: 3px !important;
      background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent) !important;
      box-shadow: 0 2px 8px color-mix(in srgb, hsl(var(--primary)) 20%, transparent) !important;
    }

    .neo-platform-shell main .platform-record-metric,
    .neo-platform-shell main .statistics-box,
    .neo-platform-shell main [class*="rounded-xl"][class*="bg-muted"],
    .neo-platform-shell main [class*="rounded-2xl"][class*="bg-muted"] {
      border-color: var(--neo-line) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled) {
      border-radius: 14px !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
      transform: translateY(0) !important;
      transition: transform 145ms var(--neo-ease), box-shadow 145ms ease, filter 145ms ease, background 145ms ease !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled):hover {
      transform: translateY(-2px) !important;
      box-shadow:
        -6px -6px 13px var(--neo-highlight-soft),
        7px 7px 14px var(--neo-shadow-soft) !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled):active,
    .neo-platform-shell [data-slot="button"][data-state="on"] {
      transform: translateY(0) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell [data-slot="button"][class*="bg-primary"],
    .neo-platform-shell [data-slot="button"][class*="bg-destructive"],
    .neo-platform-shell [data-slot="button"][class*="bg-secondary"] {
      box-shadow:
        -4px -4px 9px var(--neo-highlight-soft),
        5px 5px 12px var(--neo-shadow-soft),
        inset 0 1px 0 rgba(255,255,255,.26) !important;
    }

    .neo-platform-shell main [data-slot="input"],
    .neo-platform-shell main [data-slot="textarea"],
    .neo-platform-shell main [data-slot="select-trigger"],
    .neo-platform-shell main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    .neo-platform-shell main textarea,
    .neo-platform-shell main select {
      border: 1px solid color-mix(in srgb, hsl(var(--foreground)) 11%, transparent) !important;
      border-radius: 13px !important;
      color: hsl(var(--foreground)) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
      filter: none !important;
      outline: none;
      transition: box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease !important;
    }

    .neo-platform-shell main [data-slot="input"]:focus,
    .neo-platform-shell main [data-slot="textarea"]:focus,
    .neo-platform-shell main [data-slot="select-trigger"]:focus,
    .neo-platform-shell main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):focus,
    .neo-platform-shell main textarea:focus,
    .neo-platform-shell main select:focus {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, hsl(var(--primary)) 55%, transparent) !important;
      box-shadow:
        inset 4px 4px 9px var(--neo-shadow-soft),
        inset -4px -4px 9px var(--neo-highlight),
        0 0 0 3px color-mix(in srgb, hsl(var(--primary)) 12%, transparent) !important;
    }

    .neo-platform-shell main [data-slot="tabs-list"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 16px !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
      padding: 5px !important;
    }

    .neo-platform-shell main [data-slot="tabs-trigger"] {
      border-radius: 12px !important;
      transition: box-shadow 150ms ease, transform 150ms ease, color 150ms ease !important;
    }

    .neo-platform-shell main [data-slot="tabs-trigger"][data-state="active"] {
      color: hsl(var(--primary)) !important;
      background: var(--neo-surface-soft) !important;
      box-shadow: var(--neo-raised-sm) !important;
    }

    .neo-platform-shell main [data-slot="table-container"],
    .neo-platform-shell main .overflow-x-auto:has(table) {
      border: 1px solid var(--neo-line);
      border-radius: 17px;
      background: var(--neo-surface);
      box-shadow: var(--neo-inset);
    }

    .neo-platform-shell main table {
      border-collapse: separate;
      border-spacing: 0;
      background: transparent !important;
    }

    .neo-platform-shell main thead,
    .neo-platform-shell main th {
      background: color-mix(in srgb, var(--neo-surface) 84%, hsl(var(--primary)) 16%) !important;
    }

    .neo-platform-shell main th,
    .neo-platform-shell main td {
      border-color: var(--neo-line) !important;
    }

    .neo-platform-shell main tbody tr {
      transition: background 140ms ease, box-shadow 140ms ease;
    }

    .neo-platform-shell main tbody tr:hover {
      background: color-mix(in srgb, hsl(var(--primary)) 7%, transparent) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
    }

    .neo-platform-shell [data-slot="dialog-content"],
    .neo-platform-shell [data-slot="alert-dialog-content"],
    .neo-platform-shell [data-slot="select-content"],
    .neo-platform-shell [data-slot="popover-content"],
    .neo-platform-shell [data-slot="dropdown-menu-content"],
    .neo-platform-shell [role="menu"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 20px !important;
      color: hsl(var(--popover-foreground)) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow:
        -10px -10px 24px var(--neo-highlight-soft),
        14px 18px 38px var(--neo-shadow),
        inset 1px 1px 0 rgba(255,255,255,.22) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .neo-platform-shell [data-slot="dialog-overlay"],
    .neo-platform-shell [data-slot="alert-dialog-overlay"] {
      background: rgba(15,23,42,.48) !important;
      backdrop-filter: blur(5px) !important;
      -webkit-backdrop-filter: blur(5px) !important;
    }

    .neo-platform-shell [data-slot="badge"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 999px !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
    }

    .neo-platform-shell main [data-slot="checkbox"],
    .neo-platform-shell main [data-slot="radio-group-item"],
    .neo-platform-shell main [data-slot="switch"] {
      box-shadow: var(--neo-raised-sm) !important;
      border-color: var(--neo-line) !important;
    }

    .neo-platform-shell main [data-state="checked"][data-slot="checkbox"],
    .neo-platform-shell main [data-state="checked"][data-slot="radio-group-item"],
    .neo-platform-shell main [data-state="checked"][data-slot="switch"] {
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main [data-slot="progress"] {
      border: 1px solid var(--neo-line) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main button:not([data-slot="button"]):not(.leaflet-control-zoom-in):not(.leaflet-control-zoom-out) {
      border-radius: 12px;
      transition: transform 145ms var(--neo-ease), box-shadow 145ms ease;
    }

    .neo-platform-shell main button:not([data-slot="button"]):not(.leaflet-control-zoom-in):not(.leaflet-control-zoom-out):hover {
      transform: translateY(-1px);
    }

    .neo-platform-shell main .leaflet-container {
      border: 1px solid var(--neo-line) !important;
      border-radius: 18px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.16),
        7px 7px 16px var(--neo-shadow-soft),
        -5px -5px 13px var(--neo-highlight-soft) !important;
    }

    .neo-platform-shell main .leaflet-control-zoom,
    .neo-platform-shell main .leaflet-control-layers {
      border: 0 !important;
      border-radius: 12px !important;
      box-shadow: var(--neo-raised-sm) !important;
      overflow: hidden;
    }

    .neo-platform-shell main [class*="border-dashed"] {
      background: color-mix(in srgb, var(--neo-surface) 94%, hsl(var(--primary)) 6%) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell .future-topbar [data-slot="button"],
    .neo-platform-shell .future-topbar button:not([data-slot="button"]) {
      border: 1px solid var(--neo-line) !important;
      background: var(--neo-surface) !important;
      color: hsl(var(--foreground)) !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
    }

    .neo-platform-shell .future-topbar [data-slot="button"]:active,
    .neo-platform-shell .future-topbar button:not([data-slot="button"]):active {
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell .future-topbar button[aria-label="Platform home"] {
      border-radius: 50% !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised-sm) !important;
    }

    @media (max-width: 1023px) {
      .neo-platform-shell {
        --neo-radius: 18px;
        --neo-raised:
          -6px -6px 14px var(--neo-highlight-soft),
          7px 7px 15px var(--neo-shadow-soft),
          inset 1px 1px 0 rgba(255,255,255,.35);
        --neo-raised-sm:
          -3px -3px 8px var(--neo-highlight-soft),
          4px 4px 9px var(--neo-shadow-soft);
      }

      .neo-platform-shell .future-sidebar {
        box-shadow: 12px 0 30px rgba(0,0,0,.24), inset 1px 0 0 rgba(255,255,255,.10) !important;
      }

      html[dir="ltr"] .neo-platform-shell .future-sidebar {
        box-shadow: -12px 0 30px rgba(0,0,0,.24), inset -1px 0 0 rgba(255,255,255,.10) !important;
      }
    }

    @media (max-width: 767px) {
      .neo-platform-shell {
        --neo-radius: 16px;
        --neo-radius-sm: 12px;
      }

      .neo-platform-shell main [data-slot="card"]:hover,
      .neo-platform-shell main .future-card:hover,
      .neo-platform-shell main .platform-record-card:hover,
      .neo-platform-shell [data-slot="button"]:not(:disabled):hover,
      .neo-platform-shell .future-nav-item:hover {
        transform: none !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .neo-platform-shell *,
      .neo-platform-shell *::before,
      .neo-platform-shell *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
    }

    @media print {
      .neo-platform-shell,
      .neo-platform-shell main,
      .neo-platform-shell main [data-slot="card"],
      .neo-platform-shell main .future-card,
      .neo-platform-shell main .platform-record-card,
      .neo-platform-shell main input,
      .neo-platform-shell main textarea,
      .neo-platform-shell main select,
      .neo-platform-shell main table,
      .neo-platform-shell main [class*="border-dashed"] {
        background: white !important;
        box-shadow: none !important;
        filter: none !important;
        transform: none !important;
        backdrop-filter: none !important;
      }
    }
'''

theme = theme.replace(marker, block + '\n' + marker, 1)
theme_path.write_text(theme, encoding='utf-8')
