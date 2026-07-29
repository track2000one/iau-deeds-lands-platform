import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { DeedProvider } from '../context/DeedContext';
import { DataProvider } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';

export const Root = () => {
  const { isAuthenticated } = useAuth();

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
