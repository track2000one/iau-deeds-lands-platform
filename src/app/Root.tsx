import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router';
import { DeedProvider } from '../context/DeedContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';

export const Root = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Set initial direction for Arabic
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';

    // Set viewport meta for better mobile experience
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }

    // Add mobile-friendly styles
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DeedProvider>
      <Layout>
        <Outlet />
      </Layout>
      <Toaster position="top-center" richColors />
    </DeedProvider>
  );
};
