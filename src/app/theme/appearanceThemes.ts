export type AppearanceMode = 'light' | 'dark';

export type ThemeId =
  | 'asset-arctic-blue'
  | 'asset-sand-blue'
  | 'asset-ivory-blue'
  | 'asset-mint-rose'
  | 'asset-blush-coral'
  | 'asset-steel-blue';

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

export const DEFAULT_THEME_ID: ThemeId = 'asset-arctic-blue';

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

const fixedPlatformVisual = {
  background:
    'radial-gradient(circle at 84% 2%, rgba(53,88,114,.055), transparent 30%), linear-gradient(180deg,#fdfdfb 0%,#f7f8f4 100%)',
  glass: 'rgba(255,255,255,.88)',
  glassStrong: 'rgba(255,255,255,.97)',
  border: 'rgba(100,116,139,.20)',
  glow: 'rgba(53,88,114,.09)',
  glowSecondary: 'rgba(122,170,206,.08)',
  shadow: '0 14px 38px rgba(67,89,115,.09)',
  topbar: 'rgba(255,255,255,.96)',
  sidebar: 'rgba(250,251,249,.98)',
};

const createTheme = (
  theme: Omit<ThemeOption, 'mode' | 'visual'> & {
    dashboard: ThemeOption['visual']['assetDashboard'];
  }
): ThemeOption => ({
  id: theme.id,
  name: theme.name,
  title: theme.title,
  description: theme.description,
  badge: theme.badge,
  mode: 'light',
  preview: theme.preview,
  glassLabel: theme.glassLabel,
  glowLabel: theme.glowLabel,
  visual: {
    ...fixedPlatformVisual,
    assetDashboard: theme.dashboard,
  },
});

export const themes: ThemeOption[] = [
  createTheme({
    id: 'asset-arctic-blue',
    name: 'Arctic Blue',
    title: 'الأزرق الجليدي',
    description:
      'مستوحى من درجات الأزرق البترولي والسماوي مع خلفية عاجية فاتحة. تجربة هادئة وواضحة لوحدة الأصول.',
    badge: 'تجربة 1',
    preview: ['#355872', '#7AAACE', '#9CD5FF', '#F7F8F0'],
    glassLabel: 'زجاج أزرق',
    glowLabel: 'سماوي جليدي',
    dashboard: {
      base: '#355872',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(156,213,255,.28),transparent 26%),radial-gradient(circle at 18% 14%,rgba(247,248,240,.16),transparent 30%),linear-gradient(135deg,#355872 0%,#547d9a 48%,#7AAACE 100%)',
      panel: 'rgba(247,248,240,.10)',
      panelStrong: 'rgba(156,213,255,.12)',
      border: 'rgba(156,213,255,.28)',
      glow: 'rgba(156,213,255,.25)',
      glowSecondary: 'rgba(122,170,206,.18)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.27),0 20px 50px rgba(29,52,69,.28)',
      button: '#355872',
      buttonHover: '#466f8d',
    },
  }),
  createTheme({
    id: 'asset-sand-blue',
    name: 'Sand Blue',
    title: 'الأزرق الرملي',
    description:
      'أزرق رمادي هادئ مع بيج رملي دافئ؛ يعطي وحدة الأصول طابعًا إداريًا ناعمًا ومريحًا.',
    badge: 'تجربة 2',
    preview: ['#81A6C6', '#AACDDC', '#F3E3D0', '#D2C4B4'],
    glassLabel: 'زجاج رملي',
    glowLabel: 'أزرق ناعم',
    dashboard: {
      base: '#526f86',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(170,205,220,.27),transparent 26%),radial-gradient(circle at 18% 14%,rgba(243,227,208,.18),transparent 30%),radial-gradient(circle at 68% 70%,rgba(210,196,180,.12),transparent 28%),linear-gradient(135deg,#526f86 0%,#6f91ad 48%,#81A6C6 100%)',
      panel: 'rgba(243,227,208,.10)',
      panelStrong: 'rgba(170,205,220,.12)',
      border: 'rgba(170,205,220,.27)',
      glow: 'rgba(170,205,220,.23)',
      glowSecondary: 'rgba(243,227,208,.16)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.25),0 20px 50px rgba(45,60,72,.26)',
      button: '#607f99',
      buttonHover: '#7397b4',
    },
  }),
  createTheme({
    id: 'asset-ivory-blue',
    name: 'Ivory Blue',
    title: 'العاجي الجامعي',
    description:
      'عاجي دافئ مع أزرق جامعي متوسط؛ مناسب إذا أردنا طابعًا رسميًا هادئًا بعيدًا عن الألوان القوية.',
    badge: 'تجربة 3',
    preview: ['#F5EFE6', '#E8DFCA', '#6D94C5', '#CBDCEB'],
    glassLabel: 'زجاج عاجي',
    glowLabel: 'أزرق جامعي',
    dashboard: {
      base: '#466586',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(203,220,235,.26),transparent 26%),radial-gradient(circle at 18% 14%,rgba(245,239,230,.18),transparent 30%),radial-gradient(circle at 66% 68%,rgba(232,223,202,.12),transparent 28%),linear-gradient(135deg,#466586 0%,#5b7fac 48%,#6D94C5 100%)',
      panel: 'rgba(245,239,230,.105)',
      panelStrong: 'rgba(203,220,235,.12)',
      border: 'rgba(203,220,235,.28)',
      glow: 'rgba(109,148,197,.24)',
      glowSecondary: 'rgba(245,239,230,.16)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.27),0 20px 50px rgba(36,53,72,.28)',
      button: '#567aa8',
      buttonHover: '#6D94C5',
    },
  }),
  createTheme({
    id: 'asset-mint-rose',
    name: 'Mint Rose',
    title: 'النعناع الهادئ',
    description:
      'نعناعي فاتح مع عاجي ولمسة وردية هادئة جدًا؛ مظهر مختلف لكنه لا يزال مناسبًا للتجربة الإدارية.',
    badge: 'تجربة 4',
    preview: ['#C0E1D2', '#E5EEE4', '#F6F4E8', '#DC9B9B'],
    glassLabel: 'زجاج نعناعي',
    glowLabel: 'لمسة وردية',
    dashboard: {
      base: '#466b61',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(192,225,210,.27),transparent 26%),radial-gradient(circle at 18% 14%,rgba(246,244,232,.18),transparent 30%),radial-gradient(circle at 70% 72%,rgba(220,155,155,.14),transparent 30%),linear-gradient(135deg,#466b61 0%,#6c9688 50%,#9bbdaf 100%)',
      panel: 'rgba(246,244,232,.10)',
      panelStrong: 'rgba(192,225,210,.12)',
      border: 'rgba(229,238,228,.28)',
      glow: 'rgba(192,225,210,.24)',
      glowSecondary: 'rgba(220,155,155,.15)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.26),0 20px 50px rgba(35,59,52,.27)',
      button: '#4f786c',
      buttonHover: '#679487',
    },
  }),
  createTheme({
    id: 'asset-blush-coral',
    name: 'Blush Coral',
    title: 'الخوخي المرجاني',
    description:
      'خلفيات دافئة فاتحة مع خوخي ومرجاني وتركواز رمادي؛ خيار أكثر نعومة للمقارنة البصرية.',
    badge: 'تجربة 5',
    preview: ['#FFF7F1', '#FFE4C9', '#E78895', '#BED1CF'],
    glassLabel: 'زجاج خوخي',
    glowLabel: 'مرجاني ناعم',
    dashboard: {
      base: '#526e6c',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(255,228,201,.25),transparent 26%),radial-gradient(circle at 18% 14%,rgba(255,247,241,.18),transparent 30%),radial-gradient(circle at 70% 72%,rgba(231,136,149,.16),transparent 30%),linear-gradient(135deg,#526e6c 0%,#769795 50%,#9eb8b5 100%)',
      panel: 'rgba(255,247,241,.105)',
      panelStrong: 'rgba(190,209,207,.13)',
      border: 'rgba(255,228,201,.28)',
      glow: 'rgba(231,136,149,.20)',
      glowSecondary: 'rgba(190,209,207,.18)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.27),0 20px 50px rgba(45,62,60,.27)',
      button: '#6c8d8a',
      buttonHover: '#829f9d',
    },
  }),
  createTheme({
    id: 'asset-steel-blue',
    name: 'Steel Blue',
    title: 'الفولاذي المؤسسي',
    description:
      'كحلي فولاذي واضح مع أزرق متوسط ورمادي فاتح؛ الأكثر رسمية وقوة بين الخيارات الجديدة.',
    badge: 'تجربة 6',
    preview: ['#334257', '#476072', '#548CA8', '#EEEEEE'],
    glassLabel: 'زجاج فولاذي',
    glowLabel: 'أزرق مؤسسي',
    dashboard: {
      base: '#334257',
      overlay:
        'radial-gradient(circle at 82% 2%,rgba(84,140,168,.25),transparent 26%),radial-gradient(circle at 18% 14%,rgba(238,238,238,.15),transparent 30%),linear-gradient(135deg,#334257 0%,#476072 48%,#548CA8 100%)',
      panel: 'rgba(238,238,238,.085)',
      panelStrong: 'rgba(84,140,168,.12)',
      border: 'rgba(238,238,238,.22)',
      glow: 'rgba(84,140,168,.24)',
      glowSecondary: 'rgba(238,238,238,.12)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,.25),0 20px 50px rgba(22,31,43,.31)',
      button: '#334257',
      buttonHover: '#476072',
    },
  }),
];

const fixedLightVariables: Record<string, string> = {
  background: '60 18% 98%',
  foreground: '211 43% 20%',
  card: '0 0% 100%',
  cardForeground: '211 43% 20%',
  popover: '0 0% 100%',
  popoverForeground: '211 43% 20%',
  primary: '207 37% 33%',
  primaryForeground: '0 0% 100%',
  secondary: '206 34% 55%',
  secondaryForeground: '0 0% 100%',
  muted: '210 22% 95%',
  mutedForeground: '213 17% 42%',
  accent: '202 52% 72%',
  accentForeground: '211 43% 20%',
  border: '211 20% 82%',
  input: '211 20% 82%',
  ring: '207 37% 33%',
  destructive: '348 84% 45%',
  destructiveForeground: '0 0% 100%',
  sidebar: '60 18% 99%',
  sidebarForeground: '211 43% 22%',
  sidebarPrimary: '207 37% 33%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: '205 35% 94%',
  sidebarAccentForeground: '207 37% 33%',
  sidebarBorder: '211 20% 85%',
  sidebarRing: '207 37% 33%',
};

export const themeVariables: Record<ThemeId, Record<string, string>> = {
  'asset-arctic-blue': { ...fixedLightVariables },
  'asset-sand-blue': { ...fixedLightVariables },
  'asset-ivory-blue': { ...fixedLightVariables },
  'asset-mint-rose': { ...fixedLightVariables },
  'asset-blush-coral': { ...fixedLightVariables },
  'asset-steel-blue': { ...fixedLightVariables },
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
  root.dataset.appearanceMode = 'light';
  root.classList.remove('dark');

  root.style.setProperty('--appearance-body-bg', theme.visual.background);
  root.style.setProperty('--appearance-glass', theme.visual.glass);
  root.style.setProperty('--appearance-glass-strong', theme.visual.glassStrong);
  root.style.setProperty('--appearance-glass-border', theme.visual.border);
  root.style.setProperty('--appearance-glow', theme.visual.glow);
  root.style.setProperty('--appearance-glow-secondary', theme.visual.glowSecondary);
  root.style.setProperty('--appearance-card-shadow', theme.visual.shadow);
  root.style.setProperty('--appearance-topbar', theme.visual.topbar);
  root.style.setProperty('--appearance-sidebar', theme.visual.sidebar);

  const dashboard = theme.visual.assetDashboard;
  root.style.setProperty('--asset-dashboard-base', dashboard.base);
  root.style.setProperty('--asset-dashboard-overlay', dashboard.overlay);
  root.style.setProperty('--asset-dashboard-panel', dashboard.panel);
  root.style.setProperty('--asset-dashboard-panel-strong', dashboard.panelStrong);
  root.style.setProperty('--asset-dashboard-border', dashboard.border);
  root.style.setProperty('--asset-dashboard-glow', dashboard.glow);
  root.style.setProperty('--asset-dashboard-glow-secondary', dashboard.glowSecondary);
  root.style.setProperty('--asset-dashboard-shadow', dashboard.shadow);
  root.style.setProperty('--asset-dashboard-button', dashboard.button);
  root.style.setProperty('--asset-dashboard-button-hover', dashboard.buttonHover);
};
