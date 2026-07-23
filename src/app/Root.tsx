import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { DeedProvider } from '../context/DeedContext';
import { DataProvider } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';

export const Root = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';

    const viewport = document.querySelector('meta[name="viewport"]');

    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }

    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow-x: hidden;
        width: 100%;
        position: relative;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
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
        <Toaster position="top-center" richColors />
      </DataProvider>
    </DeedProvider>
  );
};
