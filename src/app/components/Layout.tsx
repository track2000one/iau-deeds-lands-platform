import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  FileText,
  PlusCircle,
  Search,
  BarChart3,
  Map,
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

  // Prevent body scroll when sidebar is open on mobile
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
    {id: 'archive', path: '/archive', icon: Archive, label: 'الأرشفة',},
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
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/settings')) return 'settings';
    return 'home';
  };

  const currentPage = getCurrentPage();

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <header className="bg-primary text-primary-foreground shadow-md z-30 relative shrink-0">
        <div className="flex items-center justify-between px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10 shrink-0 h-8 w-8 md:h-10 md:w-10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Menu className="h-5 w-5 md:h-6 md:w-6" />}
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base md:text-lg lg:text-xl font-bold truncate">{t('app.title')}</h1>
              <p className="text-xs lg:text-sm opacity-90 truncate hidden sm:block">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-2 px-2 md:px-3 py-1 bg-primary-foreground/10 rounded-md">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-medium">{username}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2 md:h-9 md:px-3"
            >
              <Languages className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="text-xs md:text-sm">{i18n.language === 'ar' ? 'EN' : 'ع'}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 md:h-9 md:w-9 hidden sm:flex"
              title={t('settings.title')}
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLogoutDialogOpen(true)}
              className="text-primary-foreground hover:bg-destructive/90 h-8 w-8 md:h-9 md:w-9"
              title={t('nav.logout')}
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static
            top-0 lg:top-auto
            h-screen lg:h-auto
            z-50 lg:z-0
            w-[75vw] max-w-[280px] lg:w-56
            bg-sidebar text-sidebar-foreground
            shadow-2xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            flex flex-col
            ${isRTL ? 'left-0 lg:border-l-2' : 'right-0 lg:border-r-2'}
            lg:border-border/60
            ${sidebarOpen
              ? 'translate-x-0'
              : isRTL
                ? '-translate-x-full'
                : 'translate-x-full'
            }
            lg:translate-x-0
          `}
        >
          {/* Mobile Header in Sidebar */}
          <div className="lg:hidden p-3 border-b border-sidebar-border shrink-0 bg-sidebar-accent/50">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <User className="h-4.5 w-4.5" />
                <span className="text-sm font-medium">{username}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-2 py-3 overflow-y-auto">
            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`
                      w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-2.5 text-sidebar-foreground text-sm h-11 px-3
                      ${isActive ? 'bg-sidebar-accent font-semibold' : 'hover:bg-sidebar-accent/50'}
                    `}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            <Separator className="my-3 bg-sidebar-border" />

            {/* Settings Button in Sidebar for Mobile */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-2.5 text-sidebar-foreground text-sm h-11 px-3 hover:bg-sidebar-accent/50`}
                onClick={() => {
                  navigate('/settings');
                  setSidebarOpen(false);
                }}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
                <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.title')}</span>
              </Button>
            </div>

            <Separator className="my-3 bg-sidebar-border" />

            <div className={`px-3 py-2 text-xs text-sidebar-foreground/60 shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium">v1.0.0</p>
              <p className="mt-0.5">© 2024 IAU</p>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background w-full">
          <div className="container mx-auto p-3 md:p-4 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>


      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('nav.confirmLogout')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('nav.confirmLogoutMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('app.cancel')}
            </AlertDialogCancel>
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
