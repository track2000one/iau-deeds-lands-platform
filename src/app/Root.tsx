import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { DeedProvider } from '../context/DeedContext';
import { DataProvider } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { applyAppearanceTheme, getThemeById } from './theme/appearanceThemes';

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

    const safeUser = username?.trim() || 'guest';
    const storedTheme = localStorage.getItem(`iau-appearance-theme:${safeUser}`);
    const theme = getThemeById(storedTheme);

    applyAppearanceTheme(theme.id);
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
