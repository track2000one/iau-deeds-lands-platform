import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { DeedProvider } from '../context/DeedContext';
import { DataProvider } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { applyAppearanceTheme, getThemeById } from './theme/appearanceThemes';

const lightGlassShells: Record<
  string,
  {
    primary: string;
    secondary: string;
    accent: string;
    ring: string;
    sidebarAccent: string;
    body: string;
    sidebar: string;
    glow: string;
  }
> = {
  'glass-midnight': {
    primary: '209 61% 38%',
    secondary: '207 42% 55%',
    accent: '196 69% 57%',
    ring: '209 61% 38%',
    sidebarAccent: '211 55% 94%',
    body:
      'radial-gradient(circle at 84% 2%, rgba(96,165,250,.10), transparent 28%), linear-gradient(180deg,#fbfdff 0%,#f2f7fc 100%)',
    sidebar: 'rgba(247,250,254,.97)',
    glow: 'rgba(96,165,250,.11)',
  },
  'glass-sapphire': {
    primary: '199 78% 40%',
    secondary: '193 62% 48%',
    accent: '187 68% 55%',
    ring: '199 78% 40%',
    sidebarAccent: '194 68% 94%',
    body:
      'radial-gradient(circle at 84% 2%, rgba(14,165,233,.10), transparent 28%), linear-gradient(180deg,#fbfeff 0%,#eef9fd 100%)',
    sidebar: 'rgba(246,252,254,.97)',
    glow: 'rgba(14,165,233,.11)',
  },
  'glass-emerald': {
    primary: '158 55% 34%',
    secondary: '164 43% 47%',
    accent: '171 54% 48%',
    ring: '158 55% 34%',
    sidebarAccent: '151 50% 94%',
    body:
      'radial-gradient(circle at 84% 2%, rgba(16,185,129,.09), transparent 28%), linear-gradient(180deg,#fcfffd 0%,#f0faf5 100%)',
    sidebar: 'rgba(247,253,250,.97)',
    glow: 'rgba(16,185,129,.10)',
  },
  'glass-violet': {
    primary: '252 56% 52%',
    secondary: '243 46% 60%',
    accent: '265 55% 65%',
    ring: '252 56% 52%',
    sidebarAccent: '252 58% 95%',
    body:
      'radial-gradient(circle at 84% 2%, rgba(124,58,237,.08), transparent 28%), linear-gradient(180deg,#fefeff 0%,#f7f4fd 100%)',
    sidebar: 'rgba(251,249,255,.97)',
    glow: 'rgba(124,58,237,.09)',
  },
  'glass-amber': {
    primary: '38 70% 42%',
    secondary: '42 63% 53%',
    accent: '45 72% 57%',
    ring: '38 70% 42%',
    sidebarAccent: '46 72% 94%',
    body:
      'radial-gradient(circle at 84% 2%, rgba(245,158,11,.09), transparent 28%), linear-gradient(180deg,#fffefa 0%,#fbf7ed 100%)',
    sidebar: 'rgba(255,252,246,.97)',
    glow: 'rgba(245,158,11,.10)',
  },
};

const applyLightShellForGlassTheme = (themeId?: string | null) => {
  if (!themeId) return;

  const shell = lightGlassShells[themeId];
  if (!shell) return;

  const root = document.documentElement;

  root.classList.remove('dark');
  root.dataset.appearanceMode = 'light';

  root.style.setProperty('--background', '220 35% 98%');
  root.style.setProperty('--foreground', '214 43% 20%');
  root.style.setProperty('--card', '0 0% 100%');
  root.style.setProperty('--card-foreground', '214 43% 20%');
  root.style.setProperty('--popover', '0 0% 100%');
  root.style.setProperty('--popover-foreground', '214 43% 20%');
  root.style.setProperty('--primary', shell.primary);
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--secondary', shell.secondary);
  root.style.setProperty('--secondary-foreground', '0 0% 100%');
  root.style.setProperty('--muted', '215 30% 95%');
  root.style.setProperty('--muted-foreground', '215 17% 42%');
  root.style.setProperty('--accent', shell.accent);
  root.style.setProperty('--accent-foreground', '214 43% 18%');
  root.style.setProperty('--border', '214 26% 82%');
  root.style.setProperty('--input', '214 26% 82%');
  root.style.setProperty('--ring', shell.ring);
  root.style.setProperty('--sidebar', '220 45% 99%');
  root.style.setProperty('--sidebar-foreground', '214 43% 22%');
  root.style.setProperty('--sidebar-primary', shell.primary);
  root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
  root.style.setProperty('--sidebar-accent', shell.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', shell.primary);
  root.style.setProperty('--sidebar-border', '214 26% 85%');
  root.style.setProperty('--sidebar-ring', shell.ring);

  root.style.setProperty('--appearance-body-bg', shell.body);
  root.style.setProperty('--appearance-glass', 'rgba(255,255,255,.88)');
  root.style.setProperty('--appearance-glass-strong', 'rgba(255,255,255,.97)');
  root.style.setProperty('--appearance-glass-border', 'rgba(100,116,139,.20)');
  root.style.setProperty('--appearance-glow', shell.glow);
  root.style.setProperty('--appearance-glow-secondary', shell.glow);
  root.style.setProperty('--appearance-card-shadow', '0 14px 38px rgba(67,89,115,.09)');
  root.style.setProperty('--appearance-topbar', 'rgba(255,255,255,.96)');
  root.style.setProperty('--appearance-sidebar', shell.sidebar);
};

export const Root = () => {
  const { isAuthenticated, username } = useAuth();

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';

    const viewport = document.querySelector('meta[name="viewport"]');

    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content'
      );
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const root = document.documentElement;
    const safeUser = username?.trim() || 'guest';
    const storedTheme = localStorage.getItem(`iau-appearance-theme:${safeUser}`);
    const theme = getThemeById(storedTheme);

    applyAppearanceTheme(theme.id);
    applyLightShellForGlassTheme(theme.id);

    const observer = new MutationObserver(() => {
      applyLightShellForGlassTheme(root.dataset.appearanceTheme);
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-appearance-theme'],
    });

    return () => observer.disconnect();
  }, [isAuthenticated, username]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DeedProvider>
      <DataProvider>
        <Layout>
          <Outlet />
        </Layout>
      </DataProvider>
    </DeedProvider>
  );
};
