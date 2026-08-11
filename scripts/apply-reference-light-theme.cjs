const fs = require('fs');

const path = 'src/app/theme/appearanceThemes.ts';
let src = fs.readFileSync(path, 'utf8');

const themeBlock = `  {
    id: 'warm-university',
    name: 'Reference Light University',
    title: 'الجامعي الفاتح',
    description:
      'ثيم تجريبي لوحدة الأصول مستوحى من النموذج المرفق: أبيض نقي، بطاقات واضحة، نص كحلي رمادي، ولمسات ذهبية مع أزرق بترولي هادئ.',
    badge: 'تجريبي جديد',
    mode: 'light',
    preview: ['#F8F9FA', '#FFFFFF', '#DECDA9', '#286D88', '#25384B'],
    glassLabel: 'بطاقات بيضاء واضحة',
    glowLabel: 'ذهبي وبترولي',
    visual: {
      background:
        'radial-gradient(circle at 82% 2%, rgba(222,205,169,.13), transparent 25%), radial-gradient(circle at 18% 8%, rgba(40,109,136,.045), transparent 25%), linear-gradient(180deg,#fbfbfa 0%,#f5f7f7 100%)',
      glass: 'rgba(255,255,255,.94)',
      glassStrong: 'rgba(255,255,255,.99)',
      border: 'rgba(37,56,75,.11)',
      glow: 'rgba(206,172,114,.12)',
      glowSecondary: 'rgba(40,109,136,.07)',
      shadow: '0 12px 30px rgba(37,56,75,.075)',
      topbar: 'rgba(255,255,255,.985)',
      sidebar: 'rgba(250,251,252,.99)',
      assetDashboard: {
        base: '#F8F9FA',
        overlay:
          'radial-gradient(circle at 86% 0%,rgba(222,205,169,.18),transparent 22%),radial-gradient(circle at 12% 12%,rgba(40,109,136,.055),transparent 26%),linear-gradient(180deg,#fafbfb 0%,#f5f7f7 100%)',
        panel: 'rgba(255,255,255,.92)',
        panelStrong: 'rgba(255,255,255,.985)',
        border: 'rgba(37,56,75,.12)',
        glow: 'rgba(206,172,114,.16)',
        glowSecondary: 'rgba(40,109,136,.08)',
        shadow: '0 10px 26px rgba(37,56,75,.075)',
        button: '#A8843F',
        buttonHover: '#916F31',
      },
    },
  },`;

const themeRegex = /  \{\n    id: 'warm-university',[\s\S]*?\n  \},\n\];/;
if (!themeRegex.test(src)) throw new Error('warm-university theme block not found');
src = src.replace(themeRegex, `${themeBlock}\n];`);

const varsBlock = `  'warm-university': {
    background: '210 10% 98%',
    foreground: '210 29% 22%',
    card: '0 0% 100%',
    cardForeground: '210 29% 22%',
    popover: '0 0% 100%',
    popoverForeground: '210 29% 22%',
    primary: '197 54% 35%',
    primaryForeground: '0 0% 100%',
    secondary: '41 42% 76%',
    secondaryForeground: '210 29% 22%',
    muted: '210 12% 95%',
    mutedForeground: '210 10% 43%',
    accent: '39 46% 60%',
    accentForeground: '210 29% 20%',
    border: '210 14% 87%',
    input: '210 14% 87%',
    ring: '197 54% 35%',
    sidebar: '210 20% 99%',
    sidebarForeground: '210 29% 24%',
    sidebarPrimary: '197 54% 35%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '42 28% 94%',
    sidebarAccentForeground: '210 29% 22%',
    sidebarBorder: '210 14% 89%',
    sidebarRing: '197 54% 35%',
    ...commonLight,
  },`;

const varsRegex = /  'warm-university': \{[\s\S]*?\n    \.\.\.commonLight,\n  \},\n\};/;
if (!varsRegex.test(src)) throw new Error('warm-university variables block not found');
src = src.replace(varsRegex, `${varsBlock}\n};`);

src = src.replace(
  "  root.style.setProperty('--asset-dashboard-text', warmAsset ? '#17324D' : '#FFFFFF');\n  root.style.setProperty('--asset-dashboard-muted', warmAsset ? '#66717D' : '#CBD5E1');\n  root.style.setProperty('--asset-dashboard-inner-border', warmAsset ? 'rgba(128,105,66,.18)' : 'rgba(255,255,255,.12)');\n  root.style.setProperty('--asset-dashboard-soft', warmAsset ? 'rgba(23,50,77,.055)' : 'rgba(255,255,255,.10)');",
  "  root.style.setProperty('--asset-dashboard-text', warmAsset ? '#25384B' : '#FFFFFF');\n  root.style.setProperty('--asset-dashboard-muted', warmAsset ? '#7B8792' : '#CBD5E1');\n  root.style.setProperty('--asset-dashboard-inner-border', warmAsset ? 'rgba(37,56,75,.11)' : 'rgba(255,255,255,.12)');\n  root.style.setProperty('--asset-dashboard-soft', warmAsset ? 'rgba(222,205,169,.22)' : 'rgba(255,255,255,.10)');"
);

fs.writeFileSync(path, src);
console.log('Reference light theme applied.');
