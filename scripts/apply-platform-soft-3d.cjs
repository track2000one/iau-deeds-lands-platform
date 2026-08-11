const fs = require('fs');

const path = 'src/app/components/ThemeInitializer.tsx';
let source = fs.readFileSync(path, 'utf8');

const marker = '/* ===== Platform-wide Soft 3D system ===== */';
if (source.includes(marker)) {
  console.log('Platform Soft 3D styles already installed.');
  process.exit(0);
}

const anchor = `    /*\n     * Dark-theme compatibility layer\n     * يعالج الصفحات القديمة التي تستخدم خلفيات فاتحة ثابتة مع النص الداكن.\n     */`;

if (!source.includes(anchor)) {
  throw new Error('ThemeInitializer insertion anchor was not found.');
}

const soft3d = String.raw`
    /* ===== Platform-wide Soft 3D system ===== */
    /*
     * لغة بصرية موحدة للمنصة: عمق هادئ ورسمي مع بقاء الخلفيات فاتحة.
     * تطبق مركزيًا على المكونات المشتركة حتى تشمل الصفحات الحالية والمستقبلية.
     */
    html:not([data-appearance-mode="dark"]) .future-topbar {
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,250,252,.94)) !important;
      box-shadow:
        0 4px 0 rgba(23,57,95,.055),
        0 12px 30px rgba(15,42,70,.09),
        inset 0 1px 0 rgba(255,255,255,1),
        inset 0 -1px 0 rgba(23,57,95,.07) !important;
    }

    html:not([data-appearance-mode="dark"]) .future-sidebar {
      background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(244,249,252,.96)) !important;
      box-shadow:
        0 0 0 1px rgba(23,57,95,.04),
        0 18px 40px rgba(15,42,70,.10),
        inset 1px 0 0 rgba(255,255,255,.96),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    .future-nav-item {
      border-radius: 15px !important;
      transform: translateY(0);
      background: linear-gradient(180deg, rgba(255,255,255,.42), rgba(239,245,249,.25)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.82),
        inset 0 -1px 0 rgba(23,57,95,.025) !important;
      transition: transform 170ms ease, filter 170ms ease, box-shadow 170ms ease, border-color 170ms ease, background 170ms ease !important;
    }

    .future-nav-item:hover {
      transform: translateY(-1px);
      border-color: rgba(89,128,160,.28) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(228,240,248,.72)) !important;
      box-shadow:
        0 3px 0 rgba(54,91,124,.09),
        0 7px 14px rgba(15,42,70,.08),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    .future-nav-item.is-active {
      transform: translateY(-2px);
      color: hsl(var(--sidebar-accent-foreground)) !important;
      border-color: rgba(82,151,193,.34) !important;
      background: linear-gradient(180deg, rgba(224,247,255,.97), rgba(200,234,248,.90)) !important;
      box-shadow:
        0 5px 0 rgba(82,143,178,.18),
        0 10px 20px rgba(31,107,151,.15),
        inset 0 1px 0 rgba(255,255,255,1),
        inset 0 -1px 0 rgba(67,134,172,.10) !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card"],
    html:not([data-appearance-mode="dark"]) main .future-card {
      border-color: rgba(84,111,137,.30) !important;
      background: linear-gradient(145deg, rgba(255,255,255,.99) 0%, rgba(251,253,255,.97) 48%, rgba(240,246,250,.96) 100%) !important;
      box-shadow:
        0 7px 0 rgba(23,57,95,.075),
        0 16px 30px rgba(15,42,70,.09),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 5px rgba(23,57,95,.045) !important;
      transition: transform 190ms ease, box-shadow 190ms ease, border-color 190ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card"]:hover,
    html:not([data-appearance-mode="dark"]) main .future-card:hover {
      transform: translateY(-2px);
      border-color: rgba(57,92,125,.42) !important;
      box-shadow:
        0 9px 0 rgba(23,57,95,.085),
        0 21px 36px rgba(15,42,70,.12),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 6px rgba(23,57,95,.055) !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card-header"] {
      background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(238,246,250,.42));
      box-shadow: inset 0 -1px 0 rgba(23,57,95,.055);
    }

    /* الأزرار: نضيف عمقًا عبر drop-shadow حتى لا نلغي الظلال الخاصة لبعض الصفحات مثل وحدة الأصول. */
    [data-slot="button"]:not(:disabled) {
      transform: translateY(0);
      filter:
        drop-shadow(0 3px 0 rgba(23,57,95,.11))
        drop-shadow(0 6px 6px rgba(15,42,70,.09));
      transition: transform 145ms ease, filter 145ms ease, background 145ms ease, border-color 145ms ease !important;
    }

    [data-slot="button"]:not(:disabled):hover {
      transform: translateY(-1px);
      filter:
        drop-shadow(0 4px 0 rgba(23,57,95,.12))
        drop-shadow(0 8px 8px rgba(15,42,70,.11));
    }

    [data-slot="button"]:not(:disabled):active {
      transform: translateY(2px) !important;
      filter:
        drop-shadow(0 1px 0 rgba(23,57,95,.10))
        drop-shadow(0 2px 3px rgba(15,42,70,.07));
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="input"],
    html:not([data-appearance-mode="dark"]) main [data-slot="select-trigger"],
    html:not([data-appearance-mode="dark"]) main [data-slot="textarea"] {
      border-color: rgba(54,87,119,.52) !important;
      background: linear-gradient(180deg, #ffffff 0%, #fbfdff 60%, #f0f5f8 100%) !important;
      box-shadow:
        inset 0 2px 3px rgba(23,57,95,.045),
        inset 0 1px 0 rgba(255,255,255,1),
        0 2px 0 rgba(23,57,95,.07),
        0 5px 10px rgba(15,42,70,.045) !important;
      transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="input"]:focus,
    html:not([data-appearance-mode="dark"]) main [data-slot="select-trigger"]:focus,
    html:not([data-appearance-mode="dark"]) main [data-slot="textarea"]:focus {
      transform: translateY(-1px);
      border-color: rgba(43,102,143,.72) !important;
      box-shadow:
        inset 0 1px 2px rgba(23,57,95,.035),
        0 3px 0 rgba(77,135,173,.10),
        0 8px 16px rgba(25,78,115,.09),
        0 0 0 3px rgba(91,156,197,.10) !important;
    }

    [data-slot="badge"] {
      filter:
        drop-shadow(0 2px 0 rgba(23,57,95,.09))
        drop-shadow(0 4px 4px rgba(15,42,70,.07));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
    }

    html:not([data-appearance-mode="dark"]) [data-slot="select-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="popover-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="dropdown-menu-content"] {
      border-color: rgba(65,93,120,.28) !important;
      background: linear-gradient(145deg, #ffffff, #f4f8fb) !important;
      box-shadow:
        0 8px 0 rgba(23,57,95,.07),
        0 20px 42px rgba(15,42,70,.17),
        inset 0 2px 0 rgba(255,255,255,1) !important;
    }

    html:not([data-appearance-mode="dark"]) [data-slot="dialog-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="alert-dialog-content"] {
      border-color: rgba(65,93,120,.30) !important;
      background: linear-gradient(145deg, #ffffff 0%, #fbfdff 58%, #eef4f8 100%) !important;
      box-shadow:
        0 10px 0 rgba(23,57,95,.08),
        0 28px 70px rgba(15,42,70,.24),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 7px rgba(23,57,95,.05) !important;
    }

    /* البطاقات الهيكلية التي لا تستخدم Card component ولكنها معرفة future-card. */
    html:not([data-appearance-mode="dark"]) main section.future-card,
    html:not([data-appearance-mode="dark"]) main article.future-card {
      overflow: hidden;
    }

`;

source = source.replace(anchor, soft3d + anchor);
fs.writeFileSync(path, source);
console.log('Applied platform-wide Soft 3D styles.');
