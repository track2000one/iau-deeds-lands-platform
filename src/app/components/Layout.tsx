import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ThemeInitializer } from './ThemeInitializer';
import {
  Home,
  FileText,
  PlusCircle,
  Search,
  BarChart3,
  Settings,
  Languages,
  Menu,
  X,
  LogOut,
  User,
  MapPin,
  Building,
  Shield,
  Archive,
  Palette,
  Bell,
  Mail,
  Globe2,
  CalendarDays,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { logout, username } = useAuth();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  const isRTL = i18n.language === 'ar';

  React.useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [sidebarOpen]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';

    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleLogout = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  const menuItems = [
    { id: 'home', path: '/', icon: Home, label: t('nav.home') },
    { id: 'add-deed', path: '/deeds/new', icon: PlusCircle, label: t('nav.addDeed') },
    { id: 'all-deeds', path: '/deeds', icon: FileText, label: t('nav.allDeeds') },
    { id: 'allocated-lands', path: '/lands/allocated', icon: MapPin, label: t('nav.allocatedLands') },
    { id: 'delivered-lands', path: '/lands/delivered', icon: MapPin, label: t('nav.deliveredLands') },
    { id: 'leased-lands-out', path: '/lands/leased-out', icon: MapPin, label: t('nav.leasedLandsOut') },
    { id: 'leased-lands-in', path: '/lands/leased-in', icon: MapPin, label: t('nav.leasedLandsIn') },
    { id: 'leased-buildings-out', path: '/buildings/leased-out', icon: Building, label: t('nav.leasedBuildingsOut') },
    { id: 'leased-buildings-in', path: '/buildings/leased-in', icon: Building, label: t('nav.leasedBuildingsIn') },
    { id: 'search', path: '/search', icon: Search, label: t('nav.search') },
    { id: 'reports', path: '/reports', icon: BarChart3, label: t('nav.reports') },
    { id: 'admin', path: '/admin', icon: Shield, label: t('nav.admin') },
    { id: 'archive', path: '/archive', icon: Archive, label: 'الأرشفة' },
    { id: 'appearance', path: '/appearance', icon: Palette, label: 'المظهر' },
  ];

  const getCurrentPage = () => {
    const path = location.pathname;

    if (path === '/') return 'home';
    if (path.startsWith('/deeds/new')) return 'add-deed';
    if (path.startsWith('/deeds')) return 'all-deeds';
    if (path.startsWith('/lands/allocated')) return 'allocated-lands';
    if (path.startsWith('/lands/delivered')) return 'delivered-lands';
    if (path.startsWith('/lands/leased-out')) return 'leased-lands-out';
    if (path.startsWith('/lands/leased-in')) return 'leased-lands-in';
    if (path.startsWith('/buildings/leased-out')) return 'leased-buildings-out';
    if (path.startsWith('/buildings/leased-in')) return 'leased-buildings-in';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/archive')) return 'archive';
    if (path.startsWith('/appearance')) return 'appearance';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/settings')) return 'settings';

    return 'home';
  };

  const currentPage = getCurrentPage();
  const now = new Date();

  return (
    <div className="future-app-shell h-screen flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <ThemeInitializer />

      <header className="future-topbar text-foreground z-30 relative shrink-0">
        <div className="flex items-center justify-between px-3 md:px-5 py-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 h-9 w-9 future-glow-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl future-glow-button">
                <User className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                <Mail className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                <Globe2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-10 rounded-2xl px-3"
            >
              <Languages className="h-4 w-4 ml-2" />
              {i18n.language === 'ar' ? 'EN' : 'ع'}
            </Button>

            <div className="hidden xl:flex items-center gap-2 rounded-2xl border bg-background/50 px-4 py-2">
              <span className="font-mono text-sm">
                {now.toLocaleDateString('ar-SA-u-nu-latn')}
              </span>
              <span className="font-mono text-sm">
                {now.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex flex-col text-right min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">{t('app.title')}</h1>
              <p className="text-xs opacity-75 truncate">{t('app.subtitle')}</p>
            </div>

            <div className="h-12 w-12 rounded-2xl border bg-primary/10 grid place-items-center shadow-[0_0_25px_hsl(var(--primary)/0.25)]">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          data-sidebar
          className={`
            future-sidebar
            fixed lg:static
            top-0 lg:top-auto
            h-screen lg:h-auto
            z-50 lg:z-0
            w-[78vw] max-w-[300px] lg:w-64
            bg-sidebar text-sidebar-foreground
            transition-transform duration-300 ease-in-out
            flex flex-col
            ${isRTL ? 'left-0 lg:border-l' : 'right-0 lg:border-r'}
            ${
              sidebarOpen
                ? 'translate-x-0'
                : isRTL
                  ? '-translate-x-full'
                  : 'translate-x-full'
            }
            lg:translate-x-0
          `}
        >
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{username}</p>
                <p className="text-xs opacity-70">مستخدم المنصة</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLogoutDialogOpen(true)}
                className="h-9 w-9 rounded-2xl"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden h-9 w-9 rounded-2xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4 overflow-y-auto">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`
                      future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-sm h-12 px-4
                      ${isActive ? 'is-active font-bold' : ''}
                    `}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </nav>

            <Separator className="my-4 bg-sidebar-border" />

            <div className={`px-3 py-2 text-xs opacity-70 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium">v2060.1.0</p>
              <p className="mt-1">© 2060 IAU</p>
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto bg-background/70 w-full">
          <div className="container mx-auto p-3 md:p-5 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('nav.confirmLogout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('nav.confirmLogoutMessage')}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
