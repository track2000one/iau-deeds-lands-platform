import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../context/ThemeContext';
import { CustomThemeProvider } from '../context/CustomThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { PermissionsProvider } from '../context/PermissionsContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import '../i18n/config';
import '../styles/fonts.css';
import '../styles/print.css';

export default function App() {
  return (
    <ThemeProvider>
      <CustomThemeProvider>
        <AuthProvider>
          <PermissionsProvider>
            <RouterProvider router={router} />
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={5000}
            />
          </PermissionsProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </ThemeProvider>
  );
}
