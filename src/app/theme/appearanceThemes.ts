export type AppearanceMode = 'light' | 'dark';

export type ThemeId =
  | 'official-classic-navy'
  | 'crystal-administrative'
  | 'dawn-light'
  | 'glass-midnight'
  | 'glass-sapphire'
  | 'glass-emerald'
  | 'glass-violet'
  | 'glass-amber';

export type ThemeOption = {
  id: ThemeId;
  name: string;
  title: string;
  description: string;
  badge: string;
  mode: AppearanceMode;
  preview: string[];
  glassLabel: string;
  glowLabel: string;
  visual: {
    background: string;
    glass: string;
    glassStrong: string;
    border: string;
    glow: string;
    glowSecondary: string;
    shadow: string;
    topbar: string;
    sidebar: string;
    assetDashboard: {
      base: string;
      overlay: string;
      panel: string;
      panelStrong: string;
      border: string;
      glow: string;
      glowSecondary: string;
      shadow: string;
      button: string;
      buttonHover: string;
    };
  };
};

export const DEFAULT_THEME_ID: ThemeId = 'official-classic-navy';

const variableNameMap: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  sidebar: '--sidebar',
  sidebarForeground: '--sidebar-foreground',
  sidebarPrimary: '--sidebar-primary',
  sidebarPrimaryForeground: '--sidebar-primary-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarRing: '--sidebar-ring',
};

export const themes: ThemeOption[] = [
  {
    id: 'official-classic-navy',
    name: 'Official Classic Navy',
    title: 'الكلاسيك الرسمي',
    description:
      'المظهر الرسمي الافتراضي للمنصة؛ كحلي مؤسسي مع خلفية رملية هادئة، وتتحول لوحة الأصول إلى زجاج كحلي داكن.',
    badge: 'الافتراضي الرسمي',
    mode: 'light',
    preview: ['#FCFAF1', '#2C4F73', '#6B9CC1', '#10243B', '#FFFFFF'],
    glassLabel: 'سطح رسمي واضح',
    glowLabel: 'كحلي زجاجي',
    visual: {
      background:
        'radial-gradient(circle at 12% 10%, rgba(44,79,115,.055), transparent 27%), linear-gradient(180deg,#fcfaf1 0%,#f7f2e4 100%)',
      glass: 'rgba(255,253,246,.90)',
      glassStrong: 'rgba(255,254,249,.97)',
      border: 'rgba(65,82,96,.30)',
      glow: 'rgba(44,79,115,.10)',
      glowSecondary: 'rgba(107,156,193,.09)',
      shadow: '0 14px 36px rgba(55,65,75,.10)',
      topbar: 'rgba(255,254,249,.97)',
      sidebar: 'rgba(252,249,239,.98)',
      assetDashboard: {
        base: '#10243b',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(148,163,184,.32),transparent 25%),radial-gradient(circle at 18% 14%,rgba(226,232,240,.18),transparent 28%),radial-gradient(circle at 64% 64%,rgba(56,189,248,.08),transparent 28%),linear-gradient(135deg,#23364a 0%,#122941 44%,#0a1f36 100%)',
        panel: 'rgba(255,255,255,.075)',
        panelStrong: 'rgba(255,255,255,.105)',
        border: 'rgba(255,255,255,.20)',
        glow: 'rgba(96,165,250,.18)',
        glowSecondary: 'rgba(34,211,238,.10)',
        shadow: 'inset 0 1px 0 rgba(255,255,255,.28),0 20px 50px rgba(2,8,23,.28)',
        button: '#123d73',
        buttonHover: '#164b87',
      },
    },
  },
  {
    id: 'crystal-administrative',
    name: 'Administrative Crystal',
    title: 'الكريستال الإداري',
    description:
      'بديل مؤسسي فاتح بوضوح عالٍ وأزرق جامعي هادئ، مع لوحة أصول زجاجية بدرجات الثلج والأزرق.',
    badge: 'مؤسسي',
    mode: 'light',
    preview: ['#F3F7FD', '#2F65B9', '#7FB7F0', '#123B5F', '#FFFFFF'],
    glassLabel: 'كريستال واضح',
    glowLabel: 'أزرق ثلجي',
    visual: {
      background:
        'radial-gradient(circle at 12% 10%, rgba(47,101,185,.08), transparent 28%), linear-gradient(180deg,#f9fbff 0%,#eef5fc 100%)',
      glass: 'rgba(255,255,255,.84)',
      glassStrong: 'rgba(255,255,255,.96)',
      border: 'rgba(74,126,190,.26)',
      glow: 'rgba(47,101,185,.13)',
      glowSecondary: 'rgba(127,183,240,.12)',
      shadow: '0 16px 42px rgba(39,75,120,.11)',
      topbar: 'rgba(255,255,255,.94)',
      sidebar: 'rgba(248,251,255,.95)',
      assetDashboard: {
        base: '#0d2b43',
        overlay:
          'radial-gradient(circle at 80% 0%,rgba(186,230,253,.28),transparent 25%),radial-gradient(circle at 18% 12%,rgba(224,242,254,.18),transparent 28%),radial-gradient(circle at 60% 68%,rgba(14,165,233,.12),transparent 30%),linear-gradient(135deg,#234c67 0%,#123b5f 46%,#08263d 100%)',
        panel: 'rgba(224,242,254,.085)',
        panelStrong: 'rgba(224,242,254,.12)',
        border: 'rgba(186,230,253,.24)',
        glow: 'rgba(56,189,248,.22)',
        glowSecondary: 'rgba(125,211,252,.14)',
        shadow: 'inset 0 1px 0 rgba(240,249,255,.30),0 20px 50px rgba(3,20,35,.30)',
        button: '#075985',
        buttonHover: '#0369a1',
      },
    },
  },
  {
    id: 'dawn-light',
    name: 'Dawn Light',
    title: 'الإداري الفاتح',
    description:
      'واجهة رسمية فاتحة ومريحة للاستخدام الطويل، مع لوحة أصول زجاجية رمادية مائلة للأزرق.',
    badge: 'فاتح رسمي',
    mode: 'light',
    preview: ['#FAFBFE', '#486A9B', '#8DA8C8', '#26384A', '#FFFFFF'],
    glassLabel: 'سطح فاتح',
    glowLabel: 'فولاذي هادئ',
    visual: {
      background:
        'radial-gradient(circle at 16% 8%, rgba(72,106,155,.07), transparent 29%), linear-gradient(180deg,#ffffff 0%,#f6f8fb 100%)',
      glass: 'rgba(255,255,255,.88)',
      glassStrong: 'rgba(255,255,255,.98)',
      border: 'rgba(105,125,150,.23)',
      glow: 'rgba(72,106,155,.10)',
      glowSecondary: 'rgba(141,168,200,.10)',
      shadow: '0 14px 38px rgba(67,89,115,.09)',
      topbar: 'rgba(255,255,255,.96)',
      sidebar: 'rgba(252,253,255,.97)',
      assetDashboard: {
        base: '#1b2937',
        overlay:
          'radial-gradient(circle at 80% 2%,rgba(203,213,225,.25),transparent 26%),radial-gradient(circle at 16% 12%,rgba(226,232,240,.14),transparent 28%),radial-gradient(circle at 66% 68%,rgba(148,163,184,.10),transparent 28%),linear-gradient(135deg,#405367 0%,#26384a 46%,#142536 100%)',
        panel: 'rgba(241,245,249,.075)',
        panelStrong: 'rgba(241,245,249,.11)',
        border: 'rgba(226,232,240,.20)',
        glow: 'rgba(148,163,184,.18)',
        glowSecondary: 'rgba(96,165,250,.08)',
        shadow: 'inset 0 1px 0 rgba(255,255,255,.25),0 20px 50px rgba(2,8,23,.26)',
        button: '#334e68',
        buttonHover: '#3e5f7f',
      },
    },
  },
  {
    id: 'glass-midnight',
    name: 'Midnight Glass',
    title: 'الزجاج الليلي',
    description:
      'ثيم داكن فاخر بدرجات الكحلي والفضي، مناسب للوحات المتابعة والعمل على الشاشات الكبيرة.',
    badge: 'زجاج داكن',
    mode: 'dark',
    preview: ['#07182B', '#123D73', '#60A5FA', '#22D3EE', '#E2E8F0'],
    glassLabel: 'زجاج داكن',
    glowLabel: 'أزرق ليلي',
    visual: {
      background:
        'radial-gradient(circle at 82% 0%, rgba(96,165,250,.12), transparent 28%), linear-gradient(180deg,#07182b 0%,#0b2037 100%)',
      glass: 'rgba(20,43,68,.70)',
      glassStrong: 'rgba(18,42,67,.90)',
      border: 'rgba(148,190,230,.23)',
      glow: 'rgba(96,165,250,.18)',
      glowSecondary: 'rgba(34,211,238,.12)',
      shadow: '0 18px 48px rgba(1,8,18,.34)',
      topbar: 'rgba(7,24,43,.92)',
      sidebar: 'rgba(8,28,49,.96)',
      assetDashboard: {
        base: '#07182b',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(96,165,250,.24),transparent 25%),radial-gradient(circle at 18% 14%,rgba(226,232,240,.15),transparent 28%),radial-gradient(circle at 64% 64%,rgba(34,211,238,.10),transparent 30%),linear-gradient(135deg,#1f354c 0%,#0f2944 45%,#07182b 100%)',
        panel: 'rgba(148,190,230,.085)',
        panelStrong: 'rgba(148,190,230,.12)',
        border: 'rgba(186,219,247,.22)',
        glow: 'rgba(96,165,250,.24)',
        glowSecondary: 'rgba(34,211,238,.14)',
        shadow: 'inset 0 1px 0 rgba(255,255,255,.26),0 20px 52px rgba(1,8,18,.36)',
        button: '#123d73',
        buttonHover: '#17508f',
      },
    },
  },
  {
    id: 'glass-sapphire',
    name: 'Sapphire Glass',
    title: 'الزجاج الياقوتي',
    description:
      'ثيم أزرق صافي يميل للسماوي، يعطي الواجهة إحساسًا تقنيًا واضحًا مع إضاءة زجاجية هادئة.',
    badge: 'أزرق',
    mode: 'dark',
    preview: ['#062235', '#075985', '#0EA5E9', '#67E8F9', '#E0F2FE'],
    glassLabel: 'زجاج أزرق',
    glowLabel: 'سماوي',
    visual: {
      background:
        'radial-gradient(circle at 78% 4%, rgba(14,165,233,.16), transparent 28%), linear-gradient(180deg,#061c2b 0%,#082b42 100%)',
      glass: 'rgba(8,61,88,.66)',
      glassStrong: 'rgba(7,57,84,.88)',
      border: 'rgba(103,232,249,.23)',
      glow: 'rgba(14,165,233,.20)',
      glowSecondary: 'rgba(103,232,249,.14)',
      shadow: '0 18px 48px rgba(2,20,31,.35)',
      topbar: 'rgba(5,31,47,.92)',
      sidebar: 'rgba(5,36,54,.96)',
      assetDashboard: {
        base: '#061f31',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(34,211,238,.24),transparent 25%),radial-gradient(circle at 16% 12%,rgba(186,230,253,.18),transparent 28%),radial-gradient(circle at 62% 66%,rgba(14,165,233,.14),transparent 30%),linear-gradient(135deg,#174d68 0%,#0a3b58 46%,#061f31 100%)',
        panel: 'rgba(103,232,249,.075)',
        panelStrong: 'rgba(103,232,249,.11)',
        border: 'rgba(125,211,252,.22)',
        glow: 'rgba(14,165,233,.24)',
        glowSecondary: 'rgba(34,211,238,.16)',
        shadow: 'inset 0 1px 0 rgba(224,242,254,.26),0 20px 52px rgba(2,20,31,.34)',
        button: '#075985',
        buttonHover: '#0369a1',
      },
    },
  },
  {
    id: 'glass-emerald',
    name: 'Emerald Glass',
    title: 'الزجاج الزمردي',
    description:
      'ثيم أخضر زمردي داكن ومريح للعين، مناسب للمتابعة التشغيلية مع المحافظة على الطابع الرسمي.',
    badge: 'أخضر',
    mode: 'dark',
    preview: ['#06251F', '#0F513F', '#10B981', '#6EE7B7', '#ECFDF5'],
    glassLabel: 'زجاج زمردي',
    glowLabel: 'أخضر هادئ',
    visual: {
      background:
        'radial-gradient(circle at 80% 2%, rgba(16,185,129,.14), transparent 28%), linear-gradient(180deg,#061d18 0%,#082b23 100%)',
      glass: 'rgba(13,74,59,.65)',
      glassStrong: 'rgba(10,65,52,.88)',
      border: 'rgba(110,231,183,.22)',
      glow: 'rgba(16,185,129,.19)',
      glowSecondary: 'rgba(45,212,191,.13)',
      shadow: '0 18px 48px rgba(2,22,17,.35)',
      topbar: 'rgba(5,35,28,.92)',
      sidebar: 'rgba(5,39,31,.96)',
      assetDashboard: {
        base: '#061f19',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(52,211,153,.22),transparent 25%),radial-gradient(circle at 17% 13%,rgba(167,243,208,.14),transparent 28%),radial-gradient(circle at 64% 65%,rgba(45,212,191,.12),transparent 30%),linear-gradient(135deg,#1b4b3f 0%,#0b382d 46%,#061f19 100%)',
        panel: 'rgba(110,231,183,.075)',
        panelStrong: 'rgba(110,231,183,.11)',
        border: 'rgba(167,243,208,.21)',
        glow: 'rgba(52,211,153,.23)',
        glowSecondary: 'rgba(45,212,191,.15)',
        shadow: 'inset 0 1px 0 rgba(236,253,245,.24),0 20px 52px rgba(2,22,17,.34)',
        button: '#0f513f',
        buttonHover: '#12664f',
      },
    },
  },
  {
    id: 'glass-violet',
    name: 'Royal Violet Glass',
    title: 'الزجاج البنفسجي الملكي',
    description:
      'ثيم بنفسجي داكن أنيق مع لمسات نيليّة خافتة، مخصص لمن يفضل مظهرًا مميزًا دون مبالغة لونية.',
    badge: 'بنفسجي',
    mode: 'dark',
    preview: ['#17132C', '#4338CA', '#7C3AED', '#A78BFA', '#EDE9FE'],
    glassLabel: 'زجاج ملكي',
    glowLabel: 'بنفسجي هادئ',
    visual: {
      background:
        'radial-gradient(circle at 80% 2%, rgba(124,58,237,.15), transparent 28%), linear-gradient(180deg,#17132c 0%,#211a3d 100%)',
      glass: 'rgba(67,56,202,.16)',
      glassStrong: 'rgba(47,38,111,.76)',
      border: 'rgba(196,181,253,.22)',
      glow: 'rgba(139,92,246,.19)',
      glowSecondary: 'rgba(129,140,248,.14)',
      shadow: '0 18px 48px rgba(15,10,35,.36)',
      topbar: 'rgba(28,22,54,.92)',
      sidebar: 'rgba(30,24,57,.96)',
      assetDashboard: {
        base: '#17132c',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(167,139,250,.23),transparent 25%),radial-gradient(circle at 17% 13%,rgba(224,231,255,.13),transparent 28%),radial-gradient(circle at 64% 65%,rgba(99,102,241,.14),transparent 30%),linear-gradient(135deg,#40375f 0%,#2a214b 46%,#17132c 100%)',
        panel: 'rgba(196,181,253,.072)',
        panelStrong: 'rgba(196,181,253,.105)',
        border: 'rgba(221,214,254,.20)',
        glow: 'rgba(167,139,250,.23)',
        glowSecondary: 'rgba(129,140,248,.15)',
        shadow: 'inset 0 1px 0 rgba(245,243,255,.22),0 20px 52px rgba(15,10,35,.35)',
        button: '#4338ca',
        buttonHover: '#4f46e5',
      },
    },
  },
  {
    id: 'glass-amber',
    name: 'Amber Glass',
    title: 'الزجاج الذهبي',
    description:
      'ثيم داكن دافئ بلمسات ذهبية وعنبرية هادئة، مع الحفاظ على وضوح النصوص والبطاقات الإدارية.',
    badge: 'ذهبي',
    mode: 'dark',
    preview: ['#241B0D', '#78520D', '#D4A017', '#FCD34D', '#FFFBEB'],
    glassLabel: 'زجاج ذهبي',
    glowLabel: 'عنبر خافت',
    visual: {
      background:
        'radial-gradient(circle at 80% 2%, rgba(245,158,11,.14), transparent 28%), linear-gradient(180deg,#21180b 0%,#30230f 100%)',
      glass: 'rgba(120,82,13,.16)',
      glassStrong: 'rgba(84,57,14,.74)',
      border: 'rgba(252,211,77,.22)',
      glow: 'rgba(245,158,11,.18)',
      glowSecondary: 'rgba(250,204,21,.13)',
      shadow: '0 18px 48px rgba(28,18,4,.36)',
      topbar: 'rgba(38,27,10,.92)',
      sidebar: 'rgba(41,30,11,.96)',
      assetDashboard: {
        base: '#241b0d',
        overlay:
          'radial-gradient(circle at 82% 2%,rgba(252,211,77,.20),transparent 25%),radial-gradient(circle at 17% 13%,rgba(254,243,199,.12),transparent 28%),radial-gradient(circle at 64% 65%,rgba(245,158,11,.12),transparent 30%),linear-gradient(135deg,#57431c 0%,#382910 46%,#241b0d 100%)',
        panel: 'rgba(252,211,77,.07)',
        panelStrong: 'rgba(252,211,77,.10)',
        border: 'rgba(253,230,138,.20)',
        glow: 'rgba(245,158,11,.22)',
        glowSecondary: 'rgba(250,204,21,.14)',
        shadow: 'inset 0 1px 0 rgba(255,251,235,.20),0 20px 52px rgba(28,18,4,.35)',
        button: '#78520d',
        buttonHover: '#916313',
      },
    },
  },
];

const commonLight = {
  destructive: '348 84% 45%',
  destructiveForeground: '0 0% 100%',
};

const commonDark = {
  destructive: '348 78% 58%',
  destructiveForeground: '0 0% 100%',
};

export const themeVariables: Record<ThemeId, Record<string, string>> = {
  'official-classic-navy': {
    background: '48 65% 97%',
    foreground: '211 56% 18%',
    card: '48 55% 99%',
    cardForeground: '211 56% 18%',
    popover: '48 55% 99%',
    popoverForeground: '211 56% 18%',
    primary: '208 52% 28%',
    primaryForeground: '0 0% 100%',
    secondary: '207 36% 48%',
    secondaryForeground: '0 0% 100%',
    muted: '42 34% 94%',
    mutedForeground: '213 20% 40%',
    accent: '207 46% 58%',
    accentForeground: '0 0% 100%',
    border: '38 25% 74%',
    input: '38 25% 74%',
    ring: '208 52% 28%',
    sidebar: '48 55% 98%',
    sidebarForeground: '211 56% 20%',
    sidebarPrimary: '208 52% 28%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '43 42% 92%',
    sidebarAccentForeground: '208 52% 28%',
    sidebarBorder: '38 25% 78%',
    sidebarRing: '208 52% 28%',
    ...commonLight,
  },
  'crystal-administrative': {
    background: '211 68% 98%',
    foreground: '213 41% 22%',
    card: '0 0% 100%',
    cardForeground: '213 41% 22%',
    popover: '0 0% 100%',
    popoverForeground: '213 41% 22%',
    primary: '211 59% 39%',
    primaryForeground: '0 0% 100%',
    secondary: '210 52% 58%',
    secondaryForeground: '0 0% 100%',
    muted: '211 55% 94%',
    mutedForeground: '213 19% 41%',
    accent: '203 54% 66%',
    accentForeground: '213 41% 20%',
    border: '211 36% 78%',
    input: '211 36% 78%',
    ring: '211 59% 39%',
    sidebar: '211 75% 99%',
    sidebarForeground: '213 41% 24%',
    sidebarPrimary: '211 59% 39%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '211 55% 94%',
    sidebarAccentForeground: '211 59% 36%',
    sidebarBorder: '211 36% 82%',
    sidebarRing: '211 59% 39%',
    ...commonLight,
  },
  'dawn-light': {
    background: '220 32% 98%',
    foreground: '215 40% 22%',
    card: '0 0% 100%',
    cardForeground: '215 40% 22%',
    popover: '0 0% 100%',
    popoverForeground: '215 40% 22%',
    primary: '214 36% 39%',
    primaryForeground: '0 0% 100%',
    secondary: '213 28% 57%',
    secondaryForeground: '0 0% 100%',
    muted: '215 28% 94%',
    mutedForeground: '215 16% 42%',
    accent: '212 28% 70%',
    accentForeground: '215 40% 20%',
    border: '214 24% 80%',
    input: '214 24% 80%',
    ring: '214 36% 39%',
    sidebar: '220 35% 99%',
    sidebarForeground: '215 40% 24%',
    sidebarPrimary: '214 36% 39%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '215 30% 94%',
    sidebarAccentForeground: '214 36% 35%',
    sidebarBorder: '214 24% 83%',
    sidebarRing: '214 36% 39%',
    ...commonLight,
  },
  'glass-midnight': {
    background: '210 62% 10%',
    foreground: '210 40% 96%',
    card: '211 49% 15%',
    cardForeground: '210 40% 96%',
    popover: '211 49% 15%',
    popoverForeground: '210 40% 96%',
    primary: '207 83% 67%',
    primaryForeground: '211 70% 10%',
    secondary: '188 70% 53%',
    secondaryForeground: '211 70% 10%',
    muted: '211 32% 21%',
    mutedForeground: '210 22% 72%',
    accent: '196 84% 64%',
    accentForeground: '211 70% 10%',
    border: '210 28% 31%',
    input: '210 28% 31%',
    ring: '207 83% 67%',
    sidebar: '211 61% 11%',
    sidebarForeground: '210 40% 94%',
    sidebarPrimary: '207 83% 67%',
    sidebarPrimaryForeground: '211 70% 10%',
    sidebarAccent: '211 38% 20%',
    sidebarAccentForeground: '207 83% 78%',
    sidebarBorder: '210 28% 28%',
    sidebarRing: '207 83% 67%',
    ...commonDark,
  },
  'glass-sapphire': {
    background: '200 76% 10%',
    foreground: '198 42% 96%',
    card: '200 65% 15%',
    cardForeground: '198 42% 96%',
    popover: '200 65% 15%',
    popoverForeground: '198 42% 96%',
    primary: '199 89% 58%',
    primaryForeground: '201 80% 10%',
    secondary: '187 82% 55%',
    secondaryForeground: '201 80% 10%',
    muted: '200 38% 21%',
    mutedForeground: '198 24% 73%',
    accent: '189 85% 67%',
    accentForeground: '201 80% 10%',
    border: '198 35% 31%',
    input: '198 35% 31%',
    ring: '199 89% 58%',
    sidebar: '201 72% 11%',
    sidebarForeground: '198 42% 95%',
    sidebarPrimary: '199 89% 58%',
    sidebarPrimaryForeground: '201 80% 10%',
    sidebarAccent: '200 44% 20%',
    sidebarAccentForeground: '189 85% 78%',
    sidebarBorder: '198 35% 29%',
    sidebarRing: '199 89% 58%',
    ...commonDark,
  },
  'glass-emerald': {
    background: '164 66% 9%',
    foreground: '151 32% 96%',
    card: '163 54% 14%',
    cardForeground: '151 32% 96%',
    popover: '163 54% 14%',
    popoverForeground: '151 32% 96%',
    primary: '160 84% 45%',
    primaryForeground: '164 70% 8%',
    secondary: '173 70% 42%',
    secondaryForeground: '164 70% 8%',
    muted: '163 34% 20%',
    mutedForeground: '158 20% 72%',
    accent: '158 67% 61%',
    accentForeground: '164 70% 8%',
    border: '160 28% 30%',
    input: '160 28% 30%',
    ring: '160 84% 45%',
    sidebar: '164 62% 10%',
    sidebarForeground: '151 32% 95%',
    sidebarPrimary: '160 84% 45%',
    sidebarPrimaryForeground: '164 70% 8%',
    sidebarAccent: '163 37% 19%',
    sidebarAccentForeground: '158 67% 77%',
    sidebarBorder: '160 28% 28%',
    sidebarRing: '160 84% 45%',
    ...commonDark,
  },
  'glass-violet': {
    background: '250 41% 12%',
    foreground: '245 36% 96%',
    card: '249 39% 18%',
    cardForeground: '245 36% 96%',
    popover: '249 39% 18%',
    popoverForeground: '245 36% 96%',
    primary: '258 90% 70%',
    primaryForeground: '250 55% 11%',
    secondary: '239 82% 70%',
    secondaryForeground: '250 55% 11%',
    muted: '249 28% 24%',
    mutedForeground: '245 20% 75%',
    accent: '252 87% 78%',
    accentForeground: '250 55% 11%',
    border: '248 27% 34%',
    input: '248 27% 34%',
    ring: '258 90% 70%',
    sidebar: '250 44% 14%',
    sidebarForeground: '245 36% 95%',
    sidebarPrimary: '258 90% 70%',
    sidebarPrimaryForeground: '250 55% 11%',
    sidebarAccent: '249 32% 23%',
    sidebarAccentForeground: '252 87% 84%',
    sidebarBorder: '248 27% 31%',
    sidebarRing: '258 90% 70%',
    ...commonDark,
  },
  'glass-amber': {
    background: '39 54% 10%',
    foreground: '47 52% 96%',
    card: '39 48% 15%',
    cardForeground: '47 52% 96%',
    popover: '39 48% 15%',
    popoverForeground: '47 52% 96%',
    primary: '42 89% 55%',
    primaryForeground: '39 70% 10%',
    secondary: '35 80% 50%',
    secondaryForeground: '39 70% 10%',
    muted: '39 30% 21%',
    mutedForeground: '43 18% 73%',
    accent: '47 95% 65%',
    accentForeground: '39 70% 10%',
    border: '40 27% 31%',
    input: '40 27% 31%',
    ring: '42 89% 55%',
    sidebar: '39 55% 11%',
    sidebarForeground: '47 52% 95%',
    sidebarPrimary: '42 89% 55%',
    sidebarPrimaryForeground: '39 70% 10%',
    sidebarAccent: '39 33% 20%',
    sidebarAccentForeground: '47 95% 78%',
    sidebarBorder: '40 27% 29%',
    sidebarRing: '42 89% 55%',
    ...commonDark,
  },
};

export const getThemeById = (themeId?: string | null): ThemeOption =>
  themes.find((theme) => theme.id === themeId) ||
  themes.find((theme) => theme.id === DEFAULT_THEME_ID) ||
  themes[0];

export const applyAppearanceTheme = (themeId: ThemeId) => {
  const root = document.documentElement;
  const theme = getThemeById(themeId);
  const variables = themeVariables[theme.id];

  Object.entries(variables).forEach(([key, value]) => {
    const cssVariable = variableNameMap[key];
    if (cssVariable) root.style.setProperty(cssVariable, value);
  });

  root.dataset.appearanceTheme = theme.id;
  root.dataset.appearanceMode = theme.mode;
  root.classList.toggle('dark', theme.mode === 'dark');

  root.style.setProperty('--appearance-body-bg', theme.visual.background);
  root.style.setProperty('--appearance-glass', theme.visual.glass);
  root.style.setProperty('--appearance-glass-strong', theme.visual.glassStrong);
  root.style.setProperty('--appearance-glass-border', theme.visual.border);
  root.style.setProperty('--appearance-glow', theme.visual.glow);
  root.style.setProperty('--appearance-glow-secondary', theme.visual.glowSecondary);
  root.style.setProperty('--appearance-card-shadow', theme.visual.shadow);
  root.style.setProperty('--appearance-topbar', theme.visual.topbar);
  root.style.setProperty('--appearance-sidebar', theme.visual.sidebar);

  root.style.setProperty('--asset-dashboard-base', theme.visual.assetDashboard.base);
  root.style.setProperty('--asset-dashboard-overlay', theme.visual.assetDashboard.overlay);
  root.style.setProperty('--asset-dashboard-panel', theme.visual.assetDashboard.panel);
  root.style.setProperty('--asset-dashboard-panel-strong', theme.visual.assetDashboard.panelStrong);
  root.style.setProperty('--asset-dashboard-border', theme.visual.assetDashboard.border);
  root.style.setProperty('--asset-dashboard-glow', theme.visual.assetDashboard.glow);
  root.style.setProperty('--asset-dashboard-glow-secondary', theme.visual.assetDashboard.glowSecondary);
  root.style.setProperty('--asset-dashboard-shadow', theme.visual.assetDashboard.shadow);
  root.style.setProperty('--asset-dashboard-button', theme.visual.assetDashboard.button);
  root.style.setProperty('--asset-dashboard-button-hover', theme.visual.assetDashboard.buttonHover);
};
