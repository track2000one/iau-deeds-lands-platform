export type AppearanceMode = 'light' | 'dark';

export type ThemeId =
  | 'future-glass-light'
  | 'luxury-frost-glass'
  | 'pearl-digital'
  | 'crystal-administrative'
  | 'dawn-light'
  | 'emerald-calm'
  | 'official-classic-navy'
  | 'future-neon-dark'
  | 'silver-noir';

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
  };
};

export const DEFAULT_THEME_ID: ThemeId = 'future-glass-light';

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
    id: 'future-glass-light',
    name: 'Future Glass Light',
    title: 'زجاج المستقبل الفاتح',
    description: 'واجهة فاتحة عصرية بزجاج أبيض ناعم، وإضاءات سماوية وبنفسجية متوازنة للاستخدام اليومي.',
    badge: 'افتراضي',
    mode: 'light',
    preview: ['#FFFFFF', '#3F7CFF', '#B87DFF', '#7DE7FF', '#F7FAFF'],
    glassLabel: 'زجاج متوسط',
    glowLabel: 'إضاءة سماوية',
    visual: {
      background: 'radial-gradient(circle at 18% 8%, rgba(90,145,255,.16), transparent 30%), radial-gradient(circle at 84% 15%, rgba(174,110,255,.14), transparent 31%), linear-gradient(180deg,#ffffff 0%,#f6f9ff 100%)',
      glass: 'rgba(255,255,255,.72)',
      glassStrong: 'rgba(255,255,255,.88)',
      border: 'rgba(109,139,240,.24)',
      glow: 'rgba(63,124,255,.24)',
      glowSecondary: 'rgba(184,125,255,.18)',
      shadow: '0 20px 55px rgba(67,83,145,.14)',
      topbar: 'rgba(255,255,255,.82)',
      sidebar: 'rgba(255,255,255,.86)',
    },
  },
  {
    id: 'luxury-frost-glass',
    name: 'Luxury Frost Glass',
    title: 'الزجاج الضبابي الفاخر',
    description: 'بطاقات زجاجية سميكة بضبابية واضحة، وحواف مضيئة بهدوء تمنح المنصة طابعًا فاخرًا واحترافيًا.',
    badge: 'زجاج سميك',
    mode: 'light',
    preview: ['#F5F8FF', '#4A78D1', '#8FD3FF', '#E8EEFF', '#FFFFFF'],
    glassLabel: 'زجاج سميك',
    glowLabel: 'توهج أبيض بارد',
    visual: {
      background: 'radial-gradient(circle at 16% 12%, rgba(86,133,221,.18), transparent 31%), radial-gradient(circle at 82% 18%, rgba(143,211,255,.20), transparent 30%), linear-gradient(145deg,#f9fbff 0%,#eef4ff 48%,#f8fbff 100%)',
      glass: 'rgba(255,255,255,.62)',
      glassStrong: 'rgba(255,255,255,.82)',
      border: 'rgba(142,174,226,.42)',
      glow: 'rgba(92,146,232,.25)',
      glowSecondary: 'rgba(143,211,255,.24)',
      shadow: '0 24px 70px rgba(72,101,160,.18), inset 0 1px 0 rgba(255,255,255,.86)',
      topbar: 'rgba(250,253,255,.80)',
      sidebar: 'rgba(247,251,255,.76)',
    },
  },
  {
    id: 'pearl-digital',
    name: 'Pearl Digital',
    title: 'اللؤلؤ الرقمي',
    description: 'سطوح لؤلؤية فاتحة مع توهج بنفسجي وسماوي رقيق، مناسبة للبطاقات التفاعلية ولوحات المؤشرات.',
    badge: 'لؤلؤي',
    mode: 'light',
    preview: ['#F8F7FC', '#6D8EF7', '#B48CF2', '#73D8FF', '#FFFFFF'],
    glassLabel: 'زجاج لؤلؤي',
    glowLabel: 'بنفسجي هادئ',
    visual: {
      background: 'radial-gradient(circle at 18% 8%, rgba(109,142,247,.17), transparent 30%), radial-gradient(circle at 82% 14%, rgba(180,140,242,.18), transparent 32%), linear-gradient(180deg,#fcfbff 0%,#f3f2fb 100%)',
      glass: 'rgba(255,255,255,.68)',
      glassStrong: 'rgba(255,255,255,.86)',
      border: 'rgba(158,146,226,.30)',
      glow: 'rgba(109,142,247,.22)',
      glowSecondary: 'rgba(180,140,242,.22)',
      shadow: '0 22px 62px rgba(105,92,160,.16)',
      topbar: 'rgba(253,252,255,.84)',
      sidebar: 'rgba(250,248,255,.82)',
    },
  },
  {
    id: 'crystal-administrative',
    name: 'Administrative Crystal',
    title: 'الكريستال الإداري',
    description: 'طابع مؤسسي رسمي بوضوح عالٍ، مع زجاج أزرق خفيف وحواف نظيفة ملائمة لبيئة الجامعة.',
    badge: 'رسمي عصري',
    mode: 'light',
    preview: ['#F3F7FD', '#2F65B9', '#7FB7F0', '#DDEBFA', '#FFFFFF'],
    glassLabel: 'كريستال واضح',
    glowLabel: 'أزرق مؤسسي',
    visual: {
      background: 'radial-gradient(circle at 12% 10%, rgba(47,101,185,.11), transparent 28%), radial-gradient(circle at 86% 18%, rgba(127,183,240,.13), transparent 30%), linear-gradient(180deg,#f9fbff 0%,#eef5fc 100%)',
      glass: 'rgba(255,255,255,.80)',
      glassStrong: 'rgba(255,255,255,.94)',
      border: 'rgba(74,126,190,.28)',
      glow: 'rgba(47,101,185,.19)',
      glowSecondary: 'rgba(127,183,240,.18)',
      shadow: '0 18px 52px rgba(39,75,120,.13)',
      topbar: 'rgba(255,255,255,.90)',
      sidebar: 'rgba(248,251,255,.92)',
    },
  },
  {
    id: 'dawn-light',
    name: 'Dawn Light',
    title: 'ضوء الصباح',
    description: 'واجهة شديدة الراحة للاستخدام الطويل، ببياض دافئ قليلًا وإضاءة زرقاء هادئة جدًا.',
    badge: 'مريح للعين',
    mode: 'light',
    preview: ['#FAFBFE', '#5B84E8', '#8DB3F9', '#DCE9FF', '#FFFFFF'],
    glassLabel: 'زجاج خفيف',
    glowLabel: 'إضاءة صباحية',
    visual: {
      background: 'radial-gradient(circle at 16% 8%, rgba(91,132,232,.11), transparent 29%), radial-gradient(circle at 84% 12%, rgba(141,179,249,.12), transparent 31%), linear-gradient(180deg,#ffffff 0%,#f7f9fd 100%)',
      glass: 'rgba(255,255,255,.84)',
      glassStrong: 'rgba(255,255,255,.96)',
      border: 'rgba(124,155,220,.24)',
      glow: 'rgba(91,132,232,.16)',
      glowSecondary: 'rgba(141,179,249,.16)',
      shadow: '0 16px 46px rgba(67,89,135,.11)',
      topbar: 'rgba(255,255,255,.92)',
      sidebar: 'rgba(252,253,255,.94)',
    },
  },
  {
    id: 'emerald-calm',
    name: 'Emerald Calm',
    title: 'الزمرد الهادئ',
    description: 'هوية خضراء راقية تبعث الثقة والهدوء، مناسبة للنماذج وعمليات الحفظ والمتابعة.',
    badge: 'هادئ',
    mode: 'light',
    preview: ['#F4FBF9', '#1F9D84', '#66D3B7', '#CFF7EC', '#FFFFFF'],
    glassLabel: 'زجاج زمردي',
    glowLabel: 'توهج أخضر ناعم',
    visual: {
      background: 'radial-gradient(circle at 15% 10%, rgba(31,157,132,.13), transparent 29%), radial-gradient(circle at 84% 16%, rgba(102,211,183,.15), transparent 31%), linear-gradient(180deg,#fbfffd 0%,#f0faf7 100%)',
      glass: 'rgba(252,255,254,.76)',
      glassStrong: 'rgba(255,255,255,.92)',
      border: 'rgba(62,160,137,.27)',
      glow: 'rgba(31,157,132,.19)',
      glowSecondary: 'rgba(102,211,183,.18)',
      shadow: '0 20px 56px rgba(35,106,91,.13)',
      topbar: 'rgba(252,255,254,.88)',
      sidebar: 'rgba(248,254,252,.90)',
    },
  },
  {
    id: 'official-classic-navy',
    name: 'Official Classic Navy',
    title: 'الكلاسيك الرسمي',
    description: 'مظهر إداري تقليدي واضح بألوان كحلية ورملية، مناسب للمراسلات والعمل الرسمي اليومي.',
    badge: 'رسمي',
    mode: 'light',
    preview: ['#FCFAF1', '#2C4F73', '#6B9CC1', '#FFFFFF', '#C40028'],
    glassLabel: 'سطح رسمي',
    glowLabel: 'بدون توهج زائد',
    visual: {
      background: 'radial-gradient(circle at 12% 10%, rgba(44,79,115,.07), transparent 27%), linear-gradient(180deg,#fcfaf1 0%,#f7f2e4 100%)',
      glass: 'rgba(255,253,246,.88)',
      glassStrong: 'rgba(255,254,249,.96)',
      border: 'rgba(95,106,110,.28)',
      glow: 'rgba(44,79,115,.14)',
      glowSecondary: 'rgba(107,156,193,.12)',
      shadow: '0 16px 42px rgba(55,65,75,.12)',
      topbar: 'rgba(255,254,249,.94)',
      sidebar: 'rgba(252,249,239,.96)',
    },
  },
  {
    id: 'future-neon-dark',
    name: 'Future Neon Dark',
    title: 'نيون المستقبل الداكن',
    description: 'وضع داكن تقني بإضاءات سماوية وبنفسجية، مناسب للشاشات الليلية ولوحات التحكم المتقدمة.',
    badge: 'ليلي 2060',
    mode: 'dark',
    preview: ['#060A1F', '#00E5FF', '#7C4DFF', '#00F0B5', '#E6F1FF'],
    glassLabel: 'زجاج داكن',
    glowLabel: 'نيون متوازن',
    visual: {
      background: 'radial-gradient(circle at 18% 10%, rgba(124,77,255,.26), transparent 34%), radial-gradient(circle at 80% 15%, rgba(0,229,255,.18), transparent 30%), radial-gradient(circle at 50% 90%, rgba(0,248,181,.10), transparent 34%), #060a1f',
      glass: 'rgba(14,23,58,.68)',
      glassStrong: 'rgba(10,17,45,.88)',
      border: 'rgba(0,229,255,.24)',
      glow: 'rgba(0,229,255,.24)',
      glowSecondary: 'rgba(124,77,255,.20)',
      shadow: '0 0 42px rgba(0,229,255,.10), 0 24px 70px rgba(0,0,0,.36)',
      topbar: 'rgba(5,10,31,.88)',
      sidebar: 'rgba(6,11,34,.94)',
    },
  },
  {
    id: 'silver-noir',
    name: 'Silver Noir',
    title: 'الفضي الداكن الاحترافي',
    description: 'وضع ليلي فاخر بدرجات فحمية وفضية، مع توهج أزرق بارد وبطاقات زجاجية ثقيلة.',
    badge: 'ليلي فاخر',
    mode: 'dark',
    preview: ['#111723', '#5DA9FF', '#A3B8D9', '#D6E4FF', '#F5F8FF'],
    glassLabel: 'زجاج فضي سميك',
    glowLabel: 'أزرق بارد',
    visual: {
      background: 'radial-gradient(circle at 16% 8%, rgba(93,169,255,.18), transparent 31%), radial-gradient(circle at 84% 14%, rgba(163,184,217,.12), transparent 30%), linear-gradient(180deg,#111723 0%,#0b1019 100%)',
      glass: 'rgba(31,42,58,.66)',
      glassStrong: 'rgba(22,31,44,.90)',
      border: 'rgba(163,184,217,.24)',
      glow: 'rgba(93,169,255,.22)',
      glowSecondary: 'rgba(214,228,255,.12)',
      shadow: '0 0 40px rgba(93,169,255,.09), 0 26px 72px rgba(0,0,0,.42)',
      topbar: 'rgba(16,23,35,.90)',
      sidebar: 'rgba(14,20,31,.95)',
    },
  },
];

const commonLight = {
  destructive: '348 84% 54%',
  destructiveForeground: '0 0% 100%',
};

export const themeVariables: Record<ThemeId, Record<string, string>> = {
  'future-glass-light': {
    background: '220 100% 99%', foreground: '231 50% 24%', card: '0 0% 100%',
    cardForeground: '231 50% 24%', popover: '0 0% 100%', popoverForeground: '231 50% 24%',
    primary: '222 100% 63%', primaryForeground: '0 0% 100%', secondary: '262 100% 70%',
    secondaryForeground: '0 0% 100%', muted: '226 90% 96%', mutedForeground: '231 20% 48%',
    accent: '189 95% 65%', accentForeground: '231 50% 20%', border: '229 80% 90%',
    input: '229 80% 90%', ring: '222 100% 63%', sidebar: '0 0% 100%',
    sidebarForeground: '231 50% 26%', sidebarPrimary: '222 100% 63%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '229 100% 97%',
    sidebarAccentForeground: '222 100% 48%', sidebarBorder: '229 80% 90%',
    sidebarRing: '222 100% 63%', ...commonLight,
  },
  'luxury-frost-glass': {
    background: '216 100% 98%', foreground: '219 43% 22%', card: '216 100% 99%',
    cardForeground: '219 43% 22%', popover: '0 0% 100%', popoverForeground: '219 43% 22%',
    primary: '216 60% 55%', primaryForeground: '0 0% 100%', secondary: '199 100% 78%',
    secondaryForeground: '219 43% 20%', muted: '216 65% 94%', mutedForeground: '219 20% 47%',
    accent: '210 82% 68%', accentForeground: '219 43% 18%', border: '215 52% 84%',
    input: '215 52% 84%', ring: '216 60% 55%', sidebar: '216 100% 99%',
    sidebarForeground: '219 43% 24%', sidebarPrimary: '216 60% 55%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '211 82% 95%',
    sidebarAccentForeground: '216 60% 43%', sidebarBorder: '215 52% 84%',
    sidebarRing: '216 60% 55%', ...commonLight,
  },
  'pearl-digital': {
    background: '250 42% 98%', foreground: '236 31% 25%', card: '0 0% 100%',
    cardForeground: '236 31% 25%', popover: '0 0% 100%', popoverForeground: '236 31% 25%',
    primary: '228 87% 65%', primaryForeground: '0 0% 100%', secondary: '271 75% 72%',
    secondaryForeground: '0 0% 100%', muted: '247 52% 95%', mutedForeground: '240 17% 48%',
    accent: '194 85% 70%', accentForeground: '236 31% 21%', border: '247 38% 86%',
    input: '247 38% 86%', ring: '228 87% 65%', sidebar: '250 60% 99%',
    sidebarForeground: '236 31% 26%', sidebarPrimary: '228 87% 65%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '247 60% 96%',
    sidebarAccentForeground: '228 70% 50%', sidebarBorder: '247 38% 86%',
    sidebarRing: '228 87% 65%', ...commonLight,
  },
  'crystal-administrative': {
    background: '211 68% 98%', foreground: '213 41% 22%', card: '0 0% 100%',
    cardForeground: '213 41% 22%', popover: '0 0% 100%', popoverForeground: '213 41% 22%',
    primary: '211 59% 45%', primaryForeground: '0 0% 100%', secondary: '210 70% 72%',
    secondaryForeground: '213 41% 20%', muted: '211 55% 94%', mutedForeground: '213 19% 45%',
    accent: '203 78% 74%', accentForeground: '213 41% 20%', border: '211 40% 83%',
    input: '211 40% 83%', ring: '211 59% 45%', sidebar: '211 75% 99%',
    sidebarForeground: '213 41% 24%', sidebarPrimary: '211 59% 45%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '211 70% 95%',
    sidebarAccentForeground: '211 59% 40%', sidebarBorder: '211 40% 83%',
    sidebarRing: '211 59% 45%', ...commonLight,
  },
  'dawn-light': {
    background: '220 45% 99%', foreground: '218 40% 24%', card: '0 0% 100%',
    cardForeground: '218 40% 24%', popover: '0 0% 100%', popoverForeground: '218 40% 24%',
    primary: '222 76% 63%', primaryForeground: '0 0% 100%', secondary: '215 88% 76%',
    secondaryForeground: '218 40% 22%', muted: '218 58% 96%', mutedForeground: '218 18% 48%',
    accent: '209 80% 78%', accentForeground: '218 40% 20%', border: '218 38% 87%',
    input: '218 38% 87%', ring: '222 76% 63%', sidebar: '220 55% 99%',
    sidebarForeground: '218 40% 25%', sidebarPrimary: '222 76% 63%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '218 65% 96%',
    sidebarAccentForeground: '222 67% 53%', sidebarBorder: '218 38% 87%',
    sidebarRing: '222 76% 63%', ...commonLight,
  },
  'emerald-calm': {
    background: '158 48% 98%', foreground: '165 38% 19%', card: '0 0% 100%',
    cardForeground: '165 38% 19%', popover: '0 0% 100%', popoverForeground: '165 38% 19%',
    primary: '165 67% 37%', primaryForeground: '0 0% 100%', secondary: '160 54% 61%',
    secondaryForeground: '165 38% 17%', muted: '158 46% 94%', mutedForeground: '165 18% 43%',
    accent: '164 67% 80%', accentForeground: '165 38% 17%', border: '160 31% 82%',
    input: '160 31% 82%', ring: '165 67% 37%', sidebar: '158 60% 99%',
    sidebarForeground: '165 38% 22%', sidebarPrimary: '165 67% 37%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '159 55% 94%',
    sidebarAccentForeground: '165 60% 32%', sidebarBorder: '160 31% 82%',
    sidebarRing: '165 67% 37%', ...commonLight,
  },
  'official-classic-navy': {
    background: '48 65% 97%', foreground: '211 56% 18%', card: '0 0% 100%',
    cardForeground: '211 56% 18%', popover: '0 0% 100%', popoverForeground: '211 56% 18%',
    primary: '208 52% 28%', primaryForeground: '0 0% 100%', secondary: '207 36% 48%',
    secondaryForeground: '0 0% 100%', muted: '42 34% 94%', mutedForeground: '213 20% 45%',
    accent: '207 46% 58%', accentForeground: '0 0% 100%', border: '38 34% 82%',
    input: '38 34% 82%', ring: '207 46% 58%', sidebar: '48 55% 98%',
    sidebarForeground: '211 56% 20%', sidebarPrimary: '208 52% 28%',
    sidebarPrimaryForeground: '0 0% 100%', sidebarAccent: '43 42% 92%',
    sidebarAccentForeground: '208 52% 28%', sidebarBorder: '38 34% 82%',
    sidebarRing: '207 46% 58%', ...commonLight,
  },
  'future-neon-dark': {
    background: '231 56% 6%', foreground: '214 100% 96%', card: '230 48% 9%',
    cardForeground: '214 100% 96%', popover: '230 48% 9%', popoverForeground: '214 100% 96%',
    primary: '191 100% 50%', primaryForeground: '230 55% 7%', secondary: '258 92% 63%',
    secondaryForeground: '214 100% 96%', muted: '229 35% 15%', mutedForeground: '219 34% 74%',
    accent: '267 94% 63%', accentForeground: '214 100% 96%', border: '218 80% 28%',
    input: '229 34% 16%', ring: '191 100% 50%', destructive: '348 84% 54%',
    destructiveForeground: '0 0% 100%', sidebar: '230 58% 7%',
    sidebarForeground: '214 100% 96%', sidebarPrimary: '191 100% 50%',
    sidebarPrimaryForeground: '230 55% 7%', sidebarAccent: '230 42% 14%',
    sidebarAccentForeground: '214 100% 96%', sidebarBorder: '218 80% 26%',
    sidebarRing: '191 100% 50%',
  },
  'silver-noir': {
    background: '217 34% 10%', foreground: '214 45% 96%', card: '216 31% 15%',
    cardForeground: '214 45% 96%', popover: '216 31% 13%', popoverForeground: '214 45% 96%',
    primary: '210 100% 68%', primaryForeground: '217 34% 10%', secondary: '215 31% 75%',
    secondaryForeground: '217 34% 10%', muted: '216 25% 20%', mutedForeground: '214 24% 72%',
    accent: '210 58% 62%', accentForeground: '217 34% 9%', border: '214 28% 31%',
    input: '216 25% 20%', ring: '210 100% 68%', destructive: '350 78% 58%',
    destructiveForeground: '0 0% 100%', sidebar: '218 35% 9%',
    sidebarForeground: '214 45% 96%', sidebarPrimary: '210 100% 68%',
    sidebarPrimaryForeground: '217 34% 10%', sidebarAccent: '216 28% 18%',
    sidebarAccentForeground: '214 45% 96%', sidebarBorder: '214 28% 28%',
    sidebarRing: '210 100% 68%',
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
};
