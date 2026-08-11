const fs = require('fs');

const themePath = 'src/app/theme/appearanceThemes.ts';
const dashPath = 'src/app/pages/AssetDashboardPage.tsx';

let theme = fs.readFileSync(themePath, 'utf8');
let dash = fs.readFileSync(dashPath, 'utf8');

if (!theme.includes("'warm-university'")) {
  theme = theme.replace(
    "  | 'glass-amber';",
    "  | 'glass-amber'\n  | 'warm-university';"
  );

  const themeObject = `\n  {\n    id: 'warm-university',\n    name: 'Warm University',\n    title: 'الجامعي الدافئ',\n    description:\n      'ثيم تجريبي لوحدة الأصول مستوحى من الواجهة الفاتحة: خلفية عاجية، بطاقات بيضاء، نص كحلي ولمسات ذهبية هادئة.',\n    badge: 'تجريبي',\n    mode: 'light',\n    preview: ['#F8F6F0', '#FFFFFF', '#E9DFC7', '#C5A35A', '#17324D'],\n    glassLabel: 'بطاقات بيضاء',\n    glowLabel: 'ذهبي هادئ',\n    visual: {\n      background:\n        'radial-gradient(circle at 82% 2%, rgba(197,163,90,.07), transparent 26%), linear-gradient(180deg,#fcfbf7 0%,#f6f2e8 100%)',\n      glass: 'rgba(255,255,255,.91)',\n      glassStrong: 'rgba(255,255,255,.98)',\n      border: 'rgba(111,95,66,.18)',\n      glow: 'rgba(197,163,90,.11)',\n      glowSecondary: 'rgba(23,50,77,.06)',\n      shadow: '0 16px 42px rgba(48,55,62,.09)',\n      topbar: 'rgba(255,255,255,.97)',\n      sidebar: 'rgba(252,251,247,.98)',\n      assetDashboard: {\n        base: '#F7F4EC',\n        overlay:\n          'radial-gradient(circle at 84% 0%,rgba(197,163,90,.13),transparent 25%),radial-gradient(circle at 12% 10%,rgba(23,50,77,.045),transparent 28%),linear-gradient(135deg,#fbfaf6 0%,#f5efe1 54%,#faf8f2 100%)',\n        panel: 'rgba(255,255,255,.76)',\n        panelStrong: 'rgba(255,255,255,.92)',\n        border: 'rgba(128,105,66,.20)',\n        glow: 'rgba(197,163,90,.14)',\n        glowSecondary: 'rgba(23,50,77,.07)',\n        shadow: 'inset 0 1px 0 rgba(255,255,255,.95),0 18px 42px rgba(80,67,45,.10)',\n        button: '#17324D',\n        buttonHover: '#214665',\n      },\n    },\n  },`;

  theme = theme.replace('\n];\n\nconst commonLight', `${themeObject}\n];\n\nconst commonLight`);

  const vars = `\n  'warm-university': {\n    background: '42 38% 97%',\n    foreground: '210 54% 20%',\n    card: '0 0% 100%',\n    cardForeground: '210 54% 20%',\n    popover: '0 0% 100%',\n    popoverForeground: '210 54% 20%',\n    primary: '210 54% 20%',\n    primaryForeground: '0 0% 100%',\n    secondary: '40 43% 56%',\n    secondaryForeground: '210 54% 18%',\n    muted: '42 30% 93%',\n    mutedForeground: '211 16% 42%',\n    accent: '40 43% 56%',\n    accentForeground: '210 54% 18%',\n    border: '39 22% 80%',\n    input: '39 22% 80%',\n    ring: '40 43% 48%',\n    sidebar: '42 42% 98%',\n    sidebarForeground: '210 54% 22%',\n    sidebarPrimary: '210 54% 20%',\n    sidebarPrimaryForeground: '0 0% 100%',\n    sidebarAccent: '42 35% 92%',\n    sidebarAccentForeground: '210 54% 20%',\n    sidebarBorder: '39 22% 83%',\n    sidebarRing: '40 43% 48%',\n    ...commonLight,\n  },`;

  theme = theme.replace('\n};\n\nexport const getThemeById', `${vars}\n};\n\nexport const getThemeById`);

  theme = theme.replace(
    "  root.style.setProperty('--asset-dashboard-button-hover', theme.visual.assetDashboard.buttonHover);",
    `  root.style.setProperty('--asset-dashboard-button-hover', theme.visual.assetDashboard.buttonHover);\n\n  const warmAsset = theme.id === 'warm-university';\n  root.style.setProperty('--asset-dashboard-text', warmAsset ? '#17324D' : '#FFFFFF');\n  root.style.setProperty('--asset-dashboard-muted', warmAsset ? '#66717D' : '#CBD5E1');\n  root.style.setProperty('--asset-dashboard-inner-border', warmAsset ? 'rgba(128,105,66,.18)' : 'rgba(255,255,255,.12)');\n  root.style.setProperty('--asset-dashboard-soft', warmAsset ? 'rgba(23,50,77,.055)' : 'rgba(255,255,255,.10)');`
  );
}

// Make the asset dashboard support both the existing dark glass themes and the new light warm theme.
dash = dash.replace(
  'className="relative overflow-hidden rounded-[36px] border text-white transition-[background,box-shadow] duration-500"',
  'className="relative overflow-hidden rounded-[36px] border transition-[background,box-shadow,color] duration-500" style={{ color: \'var(--asset-dashboard-text,#fff)\', background: \'var(--asset-dashboard-base, #10243b)\', borderColor: \'var(--asset-dashboard-border, rgba(148,163,184,.35))\', boxShadow: \'0 34px 90px color-mix(in srgb, var(--asset-dashboard-base, #10243b) 58%, transparent)\' }}'
);
// Remove the now-duplicated style block created by the replacement above.
dash = dash.replace(/\n        style=\{\{\n          background: 'var\(--asset-dashboard-base, #10243b\)',\n          borderColor: 'var\(--asset-dashboard-border, rgba\(148,163,184,.35\)\)',\n          boxShadow:\n            '0 34px 90px color-mix\(in srgb, var\(--asset-dashboard-base, #10243b\) 58%, transparent\)',\n        \}\}/, '');

dash = dash.replace(/text-white\/90/g, 'text-[color:var(--asset-dashboard-text,#fff)]');
dash = dash.replace(/text-white/g, 'text-[color:var(--asset-dashboard-text,#fff)]');
dash = dash.replace(/text-slate-(?:100|200|300)\/(?:[0-9]+)/g, 'text-[color:var(--asset-dashboard-muted,#cbd5e1)]');
dash = dash.replace(/text-slate-100/g, 'text-[color:var(--asset-dashboard-text,#fff)]');
dash = dash.replace(/border-white\/(?:10|15|20)/g, 'border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))]');
dash = dash.replace(/bg-white\/(?:10|15)/g, 'bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))]');

// Keep primary action buttons legible on both light and dark themes.
dash = dash.replace(/className="h-11 rounded-2xl border border-\[color:var\(--asset-dashboard-inner-border,rgba\(255,255,255,.12\)\)\] px-5 text-\[color:var\(--asset-dashboard-text,#fff\)\]/g,
  'className="h-11 rounded-2xl border border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))] px-5 !text-white');
dash = dash.replace(/hover:text-\[color:var\(--asset-dashboard-text,#fff\)\]/g, 'hover:text-[color:var(--asset-dashboard-text,#fff)]');

fs.writeFileSync(themePath, theme);
fs.writeFileSync(dashPath, dash);
console.log('Warm university asset theme applied.');
