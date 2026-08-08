export type AppearanceMode = 'light' | 'dark';

export type ThemeId =
  | 'official-classic-navy'
  | 'crystal-administrative'
  | 'dawn-light';

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
      'المظهر الرسمي الافتراضي للمنصة؛ كحلي مؤسسي مع خلفية رملية هادئة وتباين واضح مناسب للاستخدام الإداري الحكومي اليومي.',
    badge: 'الافتراضي الرسمي',
    mode: 'light',
    preview: ['#FCFAF1', '#2C4F73', '#6B9CC1', '#FFFFFF', '#C40028'],
    glassLabel: 'سطح رسمي واضح',
    glowLabel: 'إضاءة خافتة',
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
    },
  },
  {
    id: 'crystal-administrative',
    name: 'Administrative Crystal',
    title: 'الكريستال الإداري',
    description:
      'بديل مؤسسي فاتح بوضوح عالٍ وأزرق جامعي هادئ، مناسب للشاشات الإدارية ولوحات البيانات دون مؤثرات مبالغ فيها.',
    badge: 'مؤسسي',
    mode: 'light',
    preview: ['#F3F7FD', '#2F65B9', '#7FB7F0', '#DDEBFA', '#FFFFFF'],
    glassLabel: 'كريستال واضح',
    glowLabel: 'أزرق هادئ',
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
    },
  },
  {
    id: 'dawn-light',
    name: 'Dawn Light',
    title: 'الإداري الفاتح',
    description:
      'واجهة رسمية فاتحة ومريحة للاستخدام الطويل، بألوان محايدة وتباين واضح للنماذج والجداول والتقارير.',
    badge: 'فاتح رسمي',
    mode: 'light',
    preview: ['#FAFBFE', '#486A9B', '#8DA8C8', '#E7EDF5', '#FFFFFF'],
    glassLabel: 'سطح فاتح',
    glowLabel: 'إضاءة محايدة',
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
    },
  },
];

const commonLight = {
  destructive: '348 84% 45%',
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
